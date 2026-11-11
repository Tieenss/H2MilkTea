import { NextRequest, NextResponse } from 'next/server';
import bundledTables from '@/data/DSBAN.json';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { resolveTableFlexible, TableRecord } from '@/lib/tableResolver';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tableQuery = (
    searchParams.get('table') ||
    searchParams.get('tableId') ||
    searchParams.get('id') ||
    searchParams.get('ban') ||
    ''
  ).trim();

  try {
    // 1. Lấy danh sách bàn live từ Supabase Admin (hoặc fallback bundled JSON)
    let tables: TableRecord[] = [];
    const supabase = createAdminSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('DSBAN').select('*');
        if (!error && Array.isArray(data) && data.length > 0) {
          tables = data as TableRecord[];
        }
      } catch (e) {
        console.warn('Query DSBAN from Supabase in validate-table failed:', e);
      }
    }

    if (tables.length === 0) {
      tables = bundledTables as TableRecord[];
    }

    // Nếu client yêu cầu danh sách các bàn đang hoạt động (để chọn bàn khi không quét QR)
    if (searchParams.get('list') === '1' || !tableQuery) {
      const activeTables = tables
        .filter(t => t['Trạng thái'] !== 'Ngừng hoạt động' && t['Trạng thái'] !== 'Bảo trì')
        .map(t => ({
          tableId: t.IDBAN,
          tableName: t['Tên bàn'],
          status: t['Trạng thái'] || 'Đang hoạt động',
        }));

      if (!tableQuery) {
        return NextResponse.json({
          valid: false,
          error: 'Vui lòng chọn hoặc quét mã bàn để tiếp tục',
          availableTables: activeTables,
        });
      }

      return NextResponse.json({
        valid: true,
        availableTables: activeTables,
      });
    }

    // 2. Tra cứu bàn thông minh bằng resolveTableFlexible
    const resolvedTable = resolveTableFlexible(tableQuery, tables);

    if (resolvedTable) {
      const isUnavailable =
        resolvedTable['Trạng thái'] === 'Ngừng hoạt động' ||
        resolvedTable['Trạng thái'] === 'Bảo trì';

      if (isUnavailable) {
        return NextResponse.json({
          valid: false,
          error: 'Bàn này hiện đang tạm ngừng hoạt động hoặc bảo trì',
          tableId: resolvedTable.IDBAN,
          tableName: resolvedTable['Tên bàn'],
        });
      }

      return NextResponse.json({
        valid: true,
        tableId: resolvedTable.IDBAN,
        tableName: resolvedTable['Tên bàn'],
        status: resolvedTable['Trạng thái'] || 'Đang hoạt động',
      });
    }

    // 3. Không tìm thấy bàn khớp: Trả về danh sách bàn gợi ý để khách chọn
    const fallbackActiveTables = tables
      .filter(t => t['Trạng thái'] !== 'Ngừng hoạt động' && t['Trạng thái'] !== 'Bảo trì')
      .map(t => ({
        tableId: t.IDBAN,
        tableName: t['Tên bàn'],
      }));

    return NextResponse.json({
      valid: false,
      error: `Không tìm thấy bàn khớp với mã "${tableQuery}". Vui lòng chọn bàn từ danh sách bên dưới.`,
      availableTables: fallbackActiveTables,
    });
  } catch (error) {
    console.error('Error validating table:', error);
    return NextResponse.json({ valid: false, error: 'Lỗi máy chủ khi xác thực bàn' }, { status: 500 });
  }
}
