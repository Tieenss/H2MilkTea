import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';

export async function GET(request: Request) {
  if (!await getAuthenticatedStaff(request.headers.get('cookie') || '')) {
    return NextResponse.json({ success: false, error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Dịch vụ đơn hàng chưa sẵn sàng.' }, { status: 503 });
  const { data, error } = await supabase.from('pos_orders')
    .select('id,table_id,table_name,items,total_amount,notes,created_at,order_status,kitchen_status,payment_status')
    .eq('source', 'QR_TABLE').in('order_status', ['awaiting_confirmation', 'accepted']).eq('payment_status', 'unpaid')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ success: false, error: 'Không tải được đơn QR.' }, { status: 500 });
  return NextResponse.json({ success: true, orders: data || [] });
}
