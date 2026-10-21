import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';

export async function GET(request: Request) {
  if (!await getAuthenticatedStaff(request.headers.get('cookie') || '')) {
    return NextResponse.json({ success: false, error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Dịch vụ đơn hàng chưa sẵn sàng.' }, { status: 503 });

  // Tự động quét và đánh dấu expired cho các đơn QR quá 15 phút chưa duyệt
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    await supabase
      .from('pos_orders')
      .update({ order_status: 'expired', updated_at: new Date().toISOString() })
      .eq('source', 'QR_TABLE')
      .eq('order_status', 'awaiting_confirmation')
      .lt('created_at', fifteenMinutesAgo);
  } catch (cleanErr) {
    console.warn('Lỗi quét đơn QR hết hạn:', cleanErr);
  }

  const { searchParams } = new URL(request.url);
  const includeAccepted = searchParams.get('include_accepted') === 'true';
  const filterStatuses = includeAccepted ? ['awaiting_confirmation', 'accepted'] : ['awaiting_confirmation'];

  const { data, error } = await supabase.from('pos_orders')
    .select('id,table_id,table_name,items,total_amount,notes,created_at,order_status,kitchen_status,payment_status')
    .eq('source', 'QR_TABLE')
    .in('order_status', filterStatuses)
    .eq('payment_status', 'unpaid')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ success: false, error: 'Không tải được đơn QR.' }, { status: 500 });
  return NextResponse.json({ success: true, orders: data || [] });
}

// Xóa hoặc hoàn tất dọn dẹp các đơn QR cũ
export async function DELETE(request: Request) {
  if (!await getAuthenticatedStaff(request.headers.get('cookie') || '')) {
    return NextResponse.json({ success: false, error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Dịch vụ đơn hàng chưa sẵn sàng.' }, { status: 503 });

  try {
    const { orderIds, markAs = 'completed' } = await request.json().catch(() => ({ orderIds: [] }));
    const now = new Date().toISOString();

    let query = supabase.from('pos_orders').update({
      order_status: markAs,
      payment_status: 'paid',
      updated_at: now
    }).eq('source', 'QR_TABLE');

    if (Array.isArray(orderIds) && orderIds.length > 0) {
      query = query.in('id', orderIds);
    } else {
      // Dọn toàn bộ các đơn accepted đang treo
      query = query.eq('order_status', 'accepted');
    }

    const { error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Đã dọn dẹp thành công.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Lỗi khi dọn dẹp đơn.' }, { status: 500 });
  }
}
