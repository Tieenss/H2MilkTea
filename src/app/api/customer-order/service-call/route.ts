import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const tableId = String(body.tableId || '').trim();
    const tableName = String(body.tableName || tableId || 'Bàn').trim();
    const requestType = String(body.requestType || 'Gọi phục vụ chung').trim();

    if (!tableId) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin bàn.' }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    if (supabase) {
      // Broadcast realtime đến tất cả các máy POS và thiết bị nhân viên
      try {
        const channel = supabase.channel('staff-service-calls');
        await new Promise<void>((resolve) => channel.subscribe((status) => { if (status === 'SUBSCRIBED') resolve(); }));
        await channel.send({
          type: 'broadcast',
          event: 'service-call',
          payload: {
            tableId,
            tableName,
            requestType,
            timestamp: new Date().toISOString(),
          },
        });
        await supabase.removeChannel(channel);
      } catch (broadcastErr) {
        console.warn('Broadcast service call failed:', broadcastErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã gửi yêu cầu "${requestType}" tới nhân viên quầy POS.`,
    });
  } catch (err: any) {
    console.error('Service call exception:', err);
    return NextResponse.json({ success: false, error: 'Lỗi server khi gửi yêu cầu.' }, { status: 500 });
  }
}
