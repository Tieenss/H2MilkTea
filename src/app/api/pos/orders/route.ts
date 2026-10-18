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

  const { data, error } = await supabase.from('pos_orders')
    .select('id,table_id,table_name,items,total_amount,notes,created_at,order_status,kitchen_status,payment_status')
    .eq('source', 'QR_TABLE').in('order_status', ['awaiting_confirmation', 'accepted']).eq('payment_status', 'unpaid')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ success: false, error: 'Không tải được đơn QR.' }, { status: 500 });
  return NextResponse.json({ success: true, orders: data || [] });
}
