import { NextRequest, NextResponse } from 'next/server';

// Validate table exists
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tableId = searchParams.get('table');

  if (!tableId) {
    return NextResponse.json({ valid: false, error: 'Missing table parameter' }, { status: 400 });
  }

  try {
    // Try loading from Supabase first, fall back to JSON
    let tables: Array<Record<string, string>> = [];
    
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
          return NextResponse.json({
            valid: true,
            tableId: data.IDBAN,
            tableName: data['Tên bàn'],
            status: data['Trạng thái'],
          });
        }
      }
    } catch {
      // Supabase not available, fall back to JSON
    }

    // Fallback: read from local JSON data
    const fs = await import('fs');
    const path = await import('path');
    
    const dataPath = path.join(process.cwd(), 'src', 'data', 'DSBAN.json');
    if (fs.existsSync(dataPath)) {
      const rawData = fs.readFileSync(dataPath, 'utf-8');
      tables = JSON.parse(rawData);
    }

    // Handle special "takeaway" table
    if (tableId === 'takeaway') {
      const takeawayTable = tables.find(t => t['IDBAN'] === 'Khách mua về');
      return NextResponse.json({
        valid: true,
        tableId: 'Khách mua về',
        tableName: 'Khách mua về',
        status: takeawayTable?.['Trạng thái'] || 'Đang hoạt động',
      });
    }

    // Find table by IDBAN
    const table = tables.find(t => t['IDBAN'] === tableId);
    
    if (table) {
      if (table['Trạng thái'] === 'Ngừng hoạt động' || table['Trạng thái'] === 'Bảo trì') {
        return NextResponse.json({
          valid: false,
          error: 'Bàn này hiện không hoạt động',
        });
      }

      return NextResponse.json({
        valid: true,
        tableId: table['IDBAN'],
        tableName: table['Tên bàn'],
        status: table['Trạng thái'],
      });
    }

    return NextResponse.json({ valid: false, error: 'Bàn không tồn tại' });
  } catch (error) {
    console.error('Error validating table:', error);
    return NextResponse.json({ valid: false, error: 'Lỗi server' }, { status: 500 });
  }
}
