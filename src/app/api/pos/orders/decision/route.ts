import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
  if (!staff) return NextResponse.json({ success: false, error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });
  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Dịch vụ đơn hàng chưa sẵn sàng.' }, { status: 503 });
  try {
    const { id, decision, reason } = await request.json();
    if (!id || !['accept', 'reject'].includes(decision)) return NextResponse.json({ success: false, error: 'Thao tác không hợp lệ.' }, { status: 400 });
    if (decision === 'reject' && !String(reason || '').trim()) return NextResponse.json({ success: false, error: 'Cần nhập lý do từ chối.' }, { status: 400 });
    const { data: current, error: readError } = await supabase.from('pos_orders').select('*').eq('id', id).single();
    if (readError || !current) return NextResponse.json({ success: false, error: 'Không tìm thấy đơn.' }, { status: 404 });
    if (current.source !== 'QR_TABLE' || current.order_status !== 'awaiting_confirmation') {
      return NextResponse.json({ success: false, error: 'Đơn đã được nhân viên khác xử lý.' }, { status: 409 });
    }
    const now = new Date().toISOString();
    const { data: updated, error } = await supabase.from('pos_orders').update({
      order_status: decision === 'accept' ? 'accepted' : 'rejected',
      accepted_by: decision === 'accept' ? staff.email || staff.id : null,
      rejection_reason: decision === 'reject' ? String(reason).trim().slice(0, 300) : null,
      updated_at: now,
      status_version: Number(current.status_version || 0) + 1,
    }).eq('id', id).eq('order_status', 'awaiting_confirmation').eq('status_version', current.status_version).select('*').maybeSingle();
    if (error || !updated) return NextResponse.json({ success: false, error: 'Đơn vừa được xử lý ở thiết bị khác. Hãy làm mới danh sách.' }, { status: 409 });

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
    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error('QR order decision failed:', error);
    return NextResponse.json({ success: false, error: 'Không thể xử lý đơn QR.' }, { status: 500 });
  }
}
