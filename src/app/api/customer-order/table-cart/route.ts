import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const tableId = request.nextUrl.searchParams.get('tableId')?.trim();
  if (!tableId) {
    return NextResponse.json({ success: false, error: 'Thiếu mã bàn.' }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Dịch vụ chưa sẵn sàng.' }, { status: 503 });
  }

  try {
    // 1. Kiểm tra giỏ hàng live đang thao tác trên máy POS
    const { data: draft } = await supabase
      .from('pos_cart_drafts')
      .select('cart,updated_at,version')
      .eq('table_id', tableId)
      .maybeSingle();

    const liveItems = Array.isArray(draft?.cart) ? draft.cart : [];

    // 2. Kiểm tra đơn hàng QR gần nhất của bàn chưa thanh toán
    const { data: activeOrder } = await supabase
      .from('pos_orders')
      .select('id,tracking_token,order_status,kitchen_status,total_amount,items,created_at')
      .eq('table_id', tableId)
      .eq('source', 'QR_TABLE')
      .eq('payment_status', 'unpaid')
      .in('order_status', ['awaiting_confirmation', 'accepted', 'cancellation_pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      tableId,
      liveCart: {
        itemCount: liveItems.reduce((acc, it) => acc + Number(it.quantity || 1), 0),
        items: liveItems,
      },
      activeOrder: activeOrder || null,
    });
  } catch (err: any) {
    console.error('Fetch table cart exception:', err);
    return NextResponse.json({ success: false, error: 'Lỗi tải giỏ hàng bàn.' }, { status: 500 });
  }
}
