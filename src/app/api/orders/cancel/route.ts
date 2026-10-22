import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const trackingToken = String(body.trackingToken || request.nextUrl.searchParams.get('token') || '').trim();
    const reason = String(body.reason || 'Khách đổi ý / muốn chọn lại món').trim();

    if (!trackingToken || trackingToken.length < 32) {
      return NextResponse.json({ success: false, error: 'Mã theo dõi không hợp lệ.' }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Dịch vụ đơn hàng chưa sẵn sàng.' }, { status: 503 });
    }

    const { data: order, error: readError } = await supabase
      .from('pos_orders')
      .select('id,order_status,kitchen_status,tracking_token,status_version,table_name')
      .eq('tracking_token', trackingToken)
      .maybeSingle();

    if (readError || !order) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy đơn hàng để hủy.' }, { status: 404 });
    }

    // Đơn đã hủy hoặc đã hoàn thành
    if (['cancelled', 'cancelled_by_customer', 'rejected', 'expired'].includes(order.order_status)) {
      return NextResponse.json({ success: false, error: 'Đơn hàng này đã kết thúc trước đó.' }, { status: 400 });
    }

    const nextVersion = Number(order.status_version || 0) + 1;
    const now = new Date().toISOString();

    // Trường hợp 1: Đơn chưa được thu ngân duyệt -> Khách được hủy trực tiếp
    if (order.order_status === 'awaiting_confirmation') {
      const { data: updated, error: updateError } = await supabase
        .from('pos_orders')
        .update({
          order_status: 'cancelled_by_customer',
          status_version: nextVersion,
          rejection_reason: reason,
          updated_at: now,
        })
        .eq('id', order.id)
        .eq('status_version', order.status_version)
        .select('*')
        .maybeSingle();

      if (updateError || !updated) {
        return NextResponse.json({
          success: false,
          error: 'Đơn hàng vừa được quầy xử lý trên hệ thống. Không thể hủy.',
        }, { status: 409 });
      }

      // Broadcast realtime tới khách và POS
      try {
        const channel = supabase.channel(`qr-order:${trackingToken}`);
        await new Promise<void>((resolve) => channel.subscribe((status) => { if (status === 'SUBSCRIBED') resolve(); }));
        await channel.send({
          type: 'broadcast',
          event: 'order-status',
          payload: {
            order_status: 'cancelled_by_customer',
            updated_at: updated.updated_at,
          }
        });
        await supabase.removeChannel(channel);
      } catch (broadcastError) {
        console.warn('Broadcast customer cancel failed:', broadcastError);
      }

      return NextResponse.json({
        success: true,
        message: 'Đã hủy đơn hàng thành công.',
        orderStatus: 'cancelled_by_customer',
      });
    }

    // Trường hợp 2: Đơn đã nhận (accepted)
    if (order.order_status === 'accepted' || order.kitchen_status === 'queued' || order.kitchen_status === 'preparing') {
      // Nếu món đã pha chế xong hoặc đã phục vụ thì hoàn toàn không thể hủy
      if (order.kitchen_status === 'ready' || order.kitchen_status === 'served') {
        return NextResponse.json({
          success: false,
          error: 'Đồ uống của bạn đã được pha chế xong, không thể hủy đơn lúc này.',
        }, { status: 400 });
      }

      // Nếu khách chỉ bấm hủy trực tiếp thông thường mà không qua xác nhận yêu cầu hủy
      if (!body.requestCancellation) {
        return NextResponse.json({
          success: false,
          error: 'Đơn hàng đã được quầy tiếp nhận, không thể hủy trực tiếp. Vui lòng gửi yêu cầu hủy đơn.',
          canRequestCancellation: true,
          currentStatus: order.order_status,
        }, { status: 400 });
      }

      // Khách gửi yêu cầu hủy đơn (requestCancellation = true)
      // Lưu ý: Để tương thích tuyệt đối với PostgreSQL CHECK constraint (không có 'cancellation_pending'),
      // ta lưu cờ yêu cầu hủy vào rejection_reason và ghi chú notes.
      const cancelNote = `YÊU CẦU HỦY ĐƠN: ${reason}`;
      const { data: updated, error: updateError } = await supabase
        .from('pos_orders')
        .update({
          rejection_reason: cancelNote,
          status_version: nextVersion,
          updated_at: now,
        })
        .eq('id', order.id)
        .eq('status_version', order.status_version)
        .select('*')
        .maybeSingle();

      if (updateError || !updated) {
        return NextResponse.json({
          success: false,
          error: 'Đơn hàng vừa được cập nhật tại quầy. Vui lòng thử lại.',
        }, { status: 409 });
      }

      // Broadcast realtime yêu cầu hủy tới POS & Bếp
      try {
        const channel = supabase.channel(`qr-order:${trackingToken}`);
        await new Promise<void>((resolve) => channel.subscribe((status) => { if (status === 'SUBSCRIBED') resolve(); }));
        await channel.send({
          type: 'broadcast',
          event: 'order-status',
          payload: {
            order_status: 'accepted',
            cancellation_requested: true,
            rejection_reason: cancelNote,
            updated_at: updated.updated_at,
          }
        });
        await supabase.removeChannel(channel);
      } catch (broadcastError) {
        console.warn('Broadcast cancellation request failed:', broadcastError);
      }

      return NextResponse.json({
        success: true,
        cancellationPending: true,
        message: 'Đã gửi yêu cầu hủy đơn đến quầy thu ngân. Nhân viên sẽ xác nhận ngay!',
        orderStatus: 'accepted',
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Đơn hàng đang ở trạng thái không thể hủy.',
      currentStatus: order.order_status,
    }, { status: 400 });
  } catch (err: any) {
    console.error('Cancel order exception:', err);
    return NextResponse.json({ success: false, error: 'Lỗi server khi hủy đơn hàng.' }, { status: 500 });
  }
}
