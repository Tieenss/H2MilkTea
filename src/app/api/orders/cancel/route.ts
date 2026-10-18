import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const trackingToken = String(body.trackingToken || request.nextUrl.searchParams.get('token') || '').trim();

    if (!trackingToken || trackingToken.length < 32) {
      return NextResponse.json({ success: false, error: 'Mã theo dõi không hợp lệ.' }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Dịch vụ đơn hàng chưa sẵn sàng.' }, { status: 503 });
    }

    const { data: order, error: readError } = await supabase
      .from('pos_orders')
      .select('id,order_status,tracking_token,status_version')
      .eq('tracking_token', trackingToken)
      .maybeSingle();

    if (readError || !order) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy đơn hàng để hủy.' }, { status: 404 });
    }

    if (order.order_status !== 'awaiting_confirmation') {
      return NextResponse.json({
        success: false,
        error: 'Đơn hàng đã được quầy tiếp nhận hoặc xử lý, không thể hủy.',
        currentStatus: order.order_status,
      }, { status: 400 });
    }

    const nextVersion = Number(order.status_version || 0) + 1;
    const { data: updated, error: updateError } = await supabase
      .from('pos_orders')
      .update({
        order_status: 'cancelled_by_customer',
        status_version: nextVersion,
        updated_at: new Date().toISOString(),
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

    // Broadcast cập nhật realtime tới khách và POS
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
  } catch (err: any) {
    console.error('Cancel order exception:', err);
    return NextResponse.json({ success: false, error: 'Lỗi server khi hủy đơn hàng.' }, { status: 500 });
  }
}
