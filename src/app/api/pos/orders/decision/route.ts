import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';

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

    // Khi chấp nhận hủy đơn: Xóa giỏ hàng của bàn trong pos_cart_drafts và cập nhật bàn về Trống
    if (decision === 'cancel' && current.table_id) {
      try {
        await supabase.from('pos_cart_drafts').delete().eq('table_id', current.table_id);
        await supabase.from('DSBAN').update({ 'Trạng thái': 'Trống' }).eq('IDBAN', current.table_id);
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
