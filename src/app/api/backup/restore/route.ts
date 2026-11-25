import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAuthenticatedStaff, getStaffRole } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, message: 'Chưa cấu hình kết nối Supabase Admin!' },
        { status: 503 }
      );
    }

    const staff = await getAuthenticatedStaff(req.headers.get('cookie') || '');
    if (!staff) {
      return NextResponse.json(
        { success: false, message: 'Bạn cần đăng nhập quyền Quản trị để khôi phục dữ liệu.' },
        { status: 401 }
      );
    }

    const staffRole = await getStaffRole(supabase, staff);
    const roleLower = String(staffRole.role || '').toLowerCase().trim();
    const isRootFallbackAdmin = String(staff.username || '').toLowerCase() === 'admin';
    const canRestore =
      staffRole.isAdmin ||
      isRootFallbackAdmin ||
      ['admin', 'quản trị viên', 'giám đốc', 'quản lý', 'quan ly', 'manager'].includes(roleLower);

    if (!canRestore) {
      return NextResponse.json(
        { success: false, message: 'Chỉ Quản trị viên (Admin) hoặc Quản lý mới được phép khôi phục dữ liệu.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const backupData = body.data || body.backup?.data || body;

    if (!backupData || typeof backupData !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu khôi phục không hợp lệ!' },
        { status: 400 }
      );
    }

    const restoreSummary: Record<string, { inserted: number; error?: string }> = {};

    // Đầy đủ 11 bảng nghiệp vụ cốt lõi + 3 bảng vận hành POS
    const allowedTables = [
      'DSNV',
      'DSBAN',
      'DMHH',
      'NGUYENLIEU',
      'CAUHINH',
      'KHACHHANG',
      'NHACUNGCAP',
      'NHAPXUATKHO',
      'KIEMKEKHO',
      'HOADON',
      'HOADONDETAIL',
      'pos_orders',
      'pos_cart_drafts',
      'app_settings',
    ];

    for (const table of allowedTables) {
      let rows = backupData[table];
      if (Array.isArray(rows) && rows.length > 0) {
        try {
          if (table === 'DSNV') {
            const { data: existingUsers } = await supabase.from('DSNV').select('username, password');
            const passMap = new Map<string, string>();
            if (Array.isArray(existingUsers)) {
              existingUsers.forEach((u: any) => {
                if (u.username && u.password) passMap.set(String(u.username).toLowerCase(), u.password);
              });
            }
            rows = rows.map((r: any) => ({
              ...r,
              password: r.password || passMap.get(String(r.username || '').toLowerCase()) || '123456',
            }));
          }

          const { error } = await supabase.from(table).upsert(rows);
          if (error) {
            console.warn(`Restore table ${table} error:`, error.message);
            restoreSummary[table] = { inserted: 0, error: error.message };
          } else {
            restoreSummary[table] = { inserted: rows.length };
          }
        } catch (err: any) {
          restoreSummary[table] = { inserted: 0, error: err.message };
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Khôi phục dữ liệu vào Supabase Cloud thành công!',
      summary: restoreSummary,
    });
  } catch (error: any) {
    console.error('Restore backup API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi khi khôi phục dữ liệu' },
      { status: 500 }
    );
  }
}
