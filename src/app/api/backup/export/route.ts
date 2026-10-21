import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    // Các bảng cốt lõi của hệ thống H2 MilkTea
    const tables = [
      'DMHH',
      'DSBAN',
      'DSNV',
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
          exportedData[table] = data || [];
          tableCounts[table] = data?.length || 0;
        }
      } catch (err) {
        console.warn(`Error querying table ${table}:`, err);
        exportedData[table] = [];
        tableCounts[table] = 0;
      }
    }

    const payload = {
      app: 'H2MilkTea',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      summary: tableCounts,
      data: exportedData,
    };

    return NextResponse.json({
      success: true,
      message: 'Xuất dữ liệu hệ thống thành công!',
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
