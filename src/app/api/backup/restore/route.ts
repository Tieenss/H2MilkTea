import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const backupData = body.data || body.backup?.data || body;

    if (!backupData || typeof backupData !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu khôi phục không hợp lệ!' },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient() || createBrowserClient();
    const restoreSummary: Record<string, { inserted: number; error?: string }> = {};

    // Các bảng được hỗ trợ khôi phục
    const allowedTables = [
      'DMHH',
      'DSBAN',
      'DSNV',
      'HOADON',
      'HOADONDETAIL',
      'pos_orders',
      'pos_cart_drafts',
      'app_settings',
    ];

    for (const table of allowedTables) {
      const rows = backupData[table];
      if (Array.isArray(rows) && rows.length > 0) {
        try {
          // Upsert từng bảng vào Supabase
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
      message: 'Khôi phục dữ liệu từ Google Drive thành công!',
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
