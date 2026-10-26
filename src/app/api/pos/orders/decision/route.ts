import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';

function subtractItems(currentCart: any[], itemsToRemove: any[]): any[] {
  if (!Array.isArray(currentCart) || currentCart.length === 0) return [];
  if (!Array.isArray(itemsToRemove) || itemsToRemove.length === 0) return [...currentCart];

  let remaining = [...currentCart];
  for (const toRemove of itemsToRemove) {
    const removeId = toRemove.productId || toRemove.id;
    const removeName = toRemove.productName || toRemove.name;
    let qtyToRemove = Number(toRemove.quantity || 1);

    remaining = remaining.map((item) => {
      if (qtyToRemove <= 0) return item;
      const isMatch = (removeId && (item.id === removeId || item.productId === removeId)) ||
                      (removeName && (item.name === removeName || item.productName === removeName));
      if (isMatch) {
        const itemQty = Number(item.quantity || 1);
        const take = Math.min(itemQty, qtyToRemove);
        qtyToRemove -= take;
        const newQty = itemQty - take;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean);
  }
  return remaining;
}

export async function POST(request: NextRequest) {
  const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
  if (!staff) return NextResponse.json({ success: false, error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });
  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Dịch vụ đơn hàng chưa sẵn sàng.' }, { status: 503 });
  try {
    const { id, decision, reason } = await request.json();
    const validDecisions = ['accept', 'reject', 'cancel', 'dismiss', 'complete', 'reject_cancellation'];
    if (!id || !validDecisions.includes(decision)) {
      return NextResponse.json({ success: false, error: 'Thao tác không hợp lệ.' }, { status: 400 });
    }
    if ((decision === 'reject' || decision === 'reject_cancellation') && !String(reason || '').trim()) {
      return NextResponse.json({ success: false, error: 'Cần nhập lý do từ chối.' }, { status: 400 });
    }
    const { data: current, error: readError } = await supabase.from('pos_orders').select('*').eq('id', id).single();
    if (readError || !current) return NextResponse.json({ success: false, error: 'Không tìm thấy đơn.' }, { status: 404 });
    if (current.source !== 'QR_TABLE') {
      return NextResponse.json({ success: false, error: 'Không tìm thấy đơn QR.' }, { status: 404 });
    }
    if (decision === 'accept' && current.order_status !== 'awaiting_confirmation') {
      return NextResponse.json({ success: false, error: 'Đơn đã được tiếp nhận trước đó.' }, { status: 409 });
    }

    const now = new Date().toISOString();
    let newOrderStatus = current.order_status;
    let newPaymentStatus = current.payment_status;
    let newRejectionReason = current.rejection_reason;

    if (decision === 'accept') {
      newOrderStatus = 'accepted';
    } else if (decision === 'dismiss' || decision === 'complete') {
      newOrderStatus = 'completed';
      newPaymentStatus = 'paid';
    } else if (decision === 'cancel') {
      newOrderStatus = 'cancelled';
      newRejectionReason = String(reason ? `ĐÃ HỦY: ${reason}` : 'Nhân viên đã đồng ý hủy đơn').trim().slice(0, 300);
    } else if (decision === 'reject') {
      newOrderStatus = 'cancelled';
      newRejectionReason = String(reason || 'Quán từ chối nhận đơn').trim().slice(0, 300);
    } else if (decision === 'reject_cancellation') {
      newOrderStatus = 'accepted';
      newRejectionReason = String(reason ? `TỪ CHỐI HỦY: ${reason}` : 'Bếp đang làm dở, không thể hủy').trim().slice(0, 300);
    }

    const { data: updated, error } = await supabase.from('pos_orders').update({
      order_status: newOrderStatus,
      payment_status: newPaymentStatus,
      accepted_by: decision === 'accept' ? staff.email || staff.id : current.accepted_by,
      rejection_reason: newRejectionReason,
      updated_at: now,
      status_version: Number(current.status_version || 0) + 1,
    }).eq('id', id).eq('status_version', current.status_version).select('*').maybeSingle();

    if (error || !updated) {
      return NextResponse.json({ success: false, error: 'Đơn vừa được xử lý ở thiết bị khác. Hãy làm mới danh sách.' }, { status: 409 });
    }

    // Khi chấp nhận đơn QR: Tự động lưu/gộp các món vào pos_cart_drafts để tất cả máy POS và khách đều thấy giỏ thật
    if (decision === 'accept' && current.table_id && Array.isArray(current.items)) {
      try {
        const { data: existingDraft } = await supabase
          .from('pos_cart_drafts')
          .select('*')
          .eq('table_id', current.table_id)
          .maybeSingle();

        const formattedOrderItems = current.items.map((it: any) => ({
          id: it.productId || it.id,
          name: it.productName || it.name,
          price: Number(it.unitPrice || it.price || 0),
          quantity: Number(it.quantity || 1),
          unit: it.unit || 'Ly',
          image: it.image,
          note: [it.size && `Size ${it.size}`, it.sugar && `Đường ${it.sugar}`, it.ice && `Đá ${it.ice}`, it.note].filter(Boolean).join(' · '),
        }));

        if (existingDraft && Array.isArray(existingDraft.cart)) {
          // Gộp món vào giỏ hàng bàn hiện có
          const mergedCart = [...existingDraft.cart];
          for (const newItem of formattedOrderItems) {
            const foundIdx = mergedCart.findIndex((m: any) => (m.id && m.id === newItem.id) || m.name === newItem.name);
            if (foundIdx >= 0) {
              mergedCart[foundIdx] = {
                ...mergedCart[foundIdx],
                quantity: Number(mergedCart[foundIdx].quantity || 1) + newItem.quantity,
              };
            } else {
              mergedCart.push(newItem);
            }
          }

          await supabase.from('pos_cart_drafts').update({
            cart: mergedCart,
            version: Number(existingDraft.version || 0) + 1,
            updated_at: now,
          }).eq('table_id', current.table_id);
        } else {
          // Khởi tạo giỏ hàng bàn mới trên DB
          await supabase.from('pos_cart_drafts').insert({
            table_id: current.table_id,
            cart: formattedOrderItems,
            version: 1,
            updated_by: staff.id,
            updated_at: now,
          });
        }
      } catch (acceptCartErr) {
        console.warn('Lỗi tự động nạp giỏ hàng bàn khi nhận đơn QR:', acceptCartErr);
      }
    }

    // Khi chấp nhận hủy đơn: Trừ các món bị hủy khỏi pos_cart_drafts (hoặc xóa draft nếu rỗng)
    if (decision === 'cancel' && current.table_id) {
      try {
        const { data: existingDraft } = await supabase
          .from('pos_cart_drafts')
          .select('*')
          .eq('table_id', current.table_id)
          .maybeSingle();

        if (existingDraft && Array.isArray(existingDraft.cart)) {
          const updatedCart = subtractItems(existingDraft.cart, current.items);
          if (updatedCart.length === 0) {
            await supabase.from('pos_cart_drafts').delete().eq('table_id', current.table_id);
          } else {
            await supabase.from('pos_cart_drafts').update({
              cart: updatedCart,
              version: Number(existingDraft.version || 0) + 1,
              updated_at: now,
            }).eq('table_id', current.table_id);
          }
        } else {
          await supabase.from('pos_cart_drafts').delete().eq('table_id', current.table_id);
        }
      } catch (cleanErr) {
        console.warn('Lỗi dọn giỏ hàng bàn khi hủy đơn:', cleanErr);
      }
    }

    if (updated.tracking_token) {
      const channel = supabase.channel(`qr-order:${updated.tracking_token}`);
      await new Promise<void>((resolve) => channel.subscribe((status) => { if (status === 'SUBSCRIBED') resolve(); }));
      await channel.send({ type: 'broadcast', event: 'order-status', payload: {
        order_status: updated.order_status,
        kitchen_status: updated.kitchen_status,
        payment_status: updated.payment_status,
        rejection_reason: updated.rejection_reason,
        updated_at: updated.updated_at,
      } });
      await supabase.removeChannel(channel);
    }
    return NextResponse.json({ success: true, order: updated, clearedTableId: decision === 'cancel' ? current.table_id : null });
  } catch (error) {
    console.error('QR order decision failed:', error);
    return NextResponse.json({ success: false, error: 'Không thể xử lý đơn QR.' }, { status: 500 });
  }
}
