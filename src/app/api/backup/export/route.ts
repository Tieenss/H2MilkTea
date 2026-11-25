import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient() || createBrowserClient();

    // Đầy đủ 11 bảng nghiệp vụ cốt lõi + các bảng vận hành POS của hệ thống H2 MilkTea
    const tables = [
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

    const exportedData: Record<string, any[]> = {};
    const tableCounts: Record<string, number> = {};

    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
          console.warn(`Could not export table ${table}:`, error.message);
          exportedData[table] = [];
          tableCounts[table] = 0;
        } else {
          let rows = data || [];
          // Bảo mật: Không xuất mật khẩu thô của nhân viên ra file backup JSON
          if (table === 'DSNV' && Array.isArray(rows)) {
            rows = rows.map((r: any) => {
              const safe = { ...r };
              delete safe.password;
              return safe;
            });
          }
          exportedData[table] = rows;
          tableCounts[table] = rows.length;
        }
      } catch (err) {
        console.warn(`Error querying table ${table}:`, err);
        exportedData[table] = [];
        tableCounts[table] = 0;
      }
    }

    const payload = {
      app: 'H2MilkTea',
      version: '2.1.0',
      exportedAt: new Date().toISOString(),
      summary: tableCounts,
      data: exportedData,
    };

    return NextResponse.json({
      success: true,
      message: 'Xuất dữ liệu hệ thống từ Supabase Cloud thành công!',
      backup: payload,
    });
  } catch (error: any) {
    console.error('Export backup API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi khi xuất dữ liệu sao lưu' },
      { status: 500 }
    );
  }
}
