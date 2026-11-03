import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedStaff } from '@/lib/supabase/server';
import { getAuditLogsAndStats, updateAuditLogStatus } from '@/lib/ai/auditLogger';
import { AuditStatusEnum } from '@/lib/ai/schema';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limitParam = Number(url.searchParams.get('limit') || 50);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50;

    const { logs, stats } = await getAuditLogsAndStats(limit);
    return NextResponse.json({
      success: true,
      logs,
      stats,
    });
  } catch (error) {
    console.error('Lỗi tải danh sách audit log:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi server khi tải nhật ký kiểm toán AI.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const logId = String(body.logId || '').trim();
    const status = String(body.status || '').trim();

    if (!logId) {
      return NextResponse.json({ success: false, error: 'Thiếu logId.' }, { status: 400 });
    }

    const parseResult = AuditStatusEnum.safeParse(status);
    if (!parseResult.success || (status !== 'confirmed' && status !== 'rejected')) {
      return NextResponse.json({ success: false, error: 'Trạng thái audit không hợp lệ (chỉ chấp nhận confirmed hoặc rejected).' }, { status: 400 });
    }

    const updated = await updateAuditLogStatus(logId, parseResult.data);
    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error('Lỗi cập nhật audit log:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server khi cập nhật audit log.' }, { status: 500 });
  }
}
