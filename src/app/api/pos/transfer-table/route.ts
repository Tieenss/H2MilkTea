import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });
    }

    const body = await request.json();
    const sourceTableId = String(body.sourceTableId || '').trim();
    const targetTableId = String(body.targetTableId || '').trim();

    if (!sourceTableId || !targetTableId) {
      return NextResponse.json({ success: false, error: 'Thiếu mã bàn nguồn hoặc bàn đích.' }, { status: 400 });
    }

    if (sourceTableId === targetTableId) {
      return NextResponse.json({ success: false, error: 'Bàn nguồn và bàn đích không được trùng nhau.' }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Dịch vụ dữ liệu chưa sẵn sàng.' }, { status: 503 });
    }

    // 1. Thử gọi RPC pos_transfer_table_cart
    let rpcSuccess = false;
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('pos_transfer_table_cart', {
        p_source_table_id: sourceTableId,
        p_target_table_id: targetTableId,
        p_staff_id: staff.id,
      });

      if (!rpcError && rpcData && rpcData.success) {
        rpcSuccess = true;
      }
    } catch (rpcErr) {
      console.warn('RPC pos_transfer_table_cart không khả dụng, thực thi server-side fallback:', rpcErr);
    }

    if (!rpcSuccess && typeof supabase.from === 'function') {
      // 2. Server-side Fallback
      // 2.1 Đọc draft bàn nguồn và bàn đích
      const [{ data: sourceDraft }, { data: targetDraft }] = await Promise.all([
        supabase.from('pos_cart_drafts').select('*').eq('table_id', sourceTableId).maybeSingle(),
        supabase.from('pos_cart_drafts').select('*').eq('table_id', targetTableId).maybeSingle(),
      ]);

      if (sourceDraft) {
        if (!targetDraft) {
          // Chuyển toàn bộ draft sang bàn đích
          await supabase
            .from('pos_cart_drafts')
            .update({
              table_id: targetTableId,
              version: Number(sourceDraft.version || 0) + 1,
              updated_by: staff.id,
              updated_at: new Date().toISOString(),
            })
            .eq('table_id', sourceTableId);
        } else {
          // Gộp hai giỏ hàng
          const sourceCart = Array.isArray(sourceDraft.cart) ? sourceDraft.cart : [];
          const targetCart = Array.isArray(targetDraft.cart) ? targetDraft.cart : [];
          const mergedCart = [...targetCart, ...sourceCart];

          await supabase
            .from('pos_cart_drafts')
            .update({
              cart: mergedCart,
              version: Math.max(Number(targetDraft.version || 0), Number(sourceDraft.version || 0)) + 1,
              updated_by: staff.id,
              updated_at: new Date().toISOString(),
            })
            .eq('table_id', targetTableId);

          await supabase.from('pos_cart_drafts').delete().eq('table_id', sourceTableId);
        }
      }

      // 2.2 Cập nhật trạng thái bàn trong DSBAN
      if (sourceTableId !== 'Khách mua về') {
        await supabase.from('DSBAN').update({ 'Trạng thái': 'Trống' }).eq('IDBAN', sourceTableId);
      }
      if (targetTableId !== 'Khách mua về') {
        await supabase.from('DSBAN').update({ 'Trạng thái': 'Đang sử dụng' }).eq('IDBAN', targetTableId);
      }

      // 2.3 Chuyển liên kết pos_orders chưa thanh toán sang bàn mới
      await supabase
        .from('pos_orders')
        .update({ table_id: targetTableId, updated_at: new Date().toISOString() })
        .eq('table_id', sourceTableId)
        .eq('payment_status', 'unpaid');
    }

    // Lấy giỏ hàng gộp cuối cùng của bàn đích để phản hồi cho client
    let finalTargetDraft: any = null;
    let mergedCart: any[] = [];
    if (typeof supabase.from === 'function') {
      try {
        const { data } = await supabase
          .from('pos_cart_drafts')
          .select('*')
          .eq('table_id', targetTableId)
          .maybeSingle();
        finalTargetDraft = data;
        if (Array.isArray(finalTargetDraft?.cart)) {
          mergedCart = finalTargetDraft.cart;
        }
      } catch {
        // Fallback nếu mock DB không hỗ trợ
      }
    }

    return NextResponse.json({
      success: true,
      sourceTableId,
      targetTableId,
      mergedCart,
      draft: finalTargetDraft || null,
    });
  } catch (err: any) {
    console.error('Exception in transfer-table API:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi server khi chuyển bàn.' }, { status: 500 });
  }
}
