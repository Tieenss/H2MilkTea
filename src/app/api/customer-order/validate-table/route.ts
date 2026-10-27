import { NextRequest, NextResponse } from 'next/server';
import bundledTables from '@/data/DSBAN.json';
import { generateTableQrToken } from '@/lib/qr/token';

// Validate table exists and mint signed table session token
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tableId = searchParams.get('table')?.trim();

  if (!tableId) {
    return NextResponse.json({ valid: false, error: 'Missing table parameter' }, { status: 400 });
  }

  try {
    // Use the bundled table data as a reliable fallback in serverless deployments.
    const tables = bundledTables as Array<Record<string, string>>;

    try {
      // Dynamic import to avoid build-time errors
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
          .from('DSBAN')
          .select('*')
          .eq('IDBAN', tableId)
          .single();

        if (data && !error) {
          if (data['Trạng thái'] === 'Ngừng hoạt động' || data['Trạng thái'] === 'Bảo trì') {
            return NextResponse.json({ valid: false, error: 'Bàn này hiện không hoạt động' });
          }
          const qrToken = generateTableQrToken(data.IDBAN);
          return NextResponse.json({
            valid: true,
            tableId: data.IDBAN,
            tableName: data['Tên bàn'],
            status: data['Trạng thái'],
            qrToken,
          });
        }
      }
    } catch {
      // Supabase not available, fall back to JSON
    }

    // Handle special "takeaway" table
    if (tableId.toLocaleLowerCase('vi') === 'takeaway') {
      const takeawayTable = tables.find((t) => t['IDBAN'] === 'Khách mua về');
      const qrToken = generateTableQrToken('Khách mua về');
      return NextResponse.json({
        valid: true,
        tableId: 'Khách mua về',
        tableName: 'Khách mua về',
        status: takeawayTable?.['Trạng thái'] || 'Đang hoạt động',
        qrToken,
      });
    }

    // Find table by IDBAN
    const norm = tableId.trim().toLocaleLowerCase('vi');
    const table = tables.find(
      (t) =>
        String(t['IDBAN'] || '').trim().toLocaleLowerCase('vi') === norm ||
        String(t['Tên bàn'] || '').trim().toLocaleLowerCase('vi') === norm
    );

    if (table) {
      if (table['Trạng thái'] === 'Ngừng hoạt động' || table['Trạng thái'] === 'Bảo trì') {
        return NextResponse.json({
          valid: false,
          error: 'Bàn này hiện không hoạt động',
        });
      }

      const qrToken = generateTableQrToken(table['IDBAN']);
      return NextResponse.json({
        valid: true,
        tableId: table['IDBAN'],
        tableName: table['Tên bàn'],
        status: table['Trạng thái'],
        qrToken,
      });
    }

    return NextResponse.json({ valid: false, error: 'Bàn không tồn tại' });
  } catch (error) {
    console.error('Error validating table:', error);
    return NextResponse.json({ valid: false, error: 'Lỗi server' }, { status: 500 });
  }
}
