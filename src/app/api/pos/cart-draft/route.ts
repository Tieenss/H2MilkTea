import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';

const MAX_CART_ITEMS = 50;

export async function GET(request: NextRequest) {
  const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
  if (!staff) return NextResponse.json({ success: false, error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });

  const tableId = request.nextUrl.searchParams.get('tableId')?.trim();
  if (!tableId) return NextResponse.json({ success: false, error: 'Thiếu mã bàn.' }, { status: 400 });

  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Dịch vụ dữ liệu chưa sẵn sàng.' }, { status: 503 });

  const { data, error } = await supabase.from('pos_cart_drafts').select('*').eq('table_id', tableId).maybeSingle();
  if (error) {
    console.error('Read cart draft failed:', error);
    return NextResponse.json({ success: false, error: 'Không tải được giỏ hàng dùng chung.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, draft: data || null });
}

export async function PUT(request: NextRequest) {
  const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
  if (!staff) return NextResponse.json({ success: false, error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });

  const body = await request.json();
  const tableId = String(body.tableId || '').trim();
  const cart = body.cart;
  const expectedVersion = body.expectedVersion == null ? null : Number(body.expectedVersion);

  if (!tableId || !Array.isArray(cart) || cart.length > MAX_CART_ITEMS) {
    return NextResponse.json({ success: false, error: 'Dữ liệu giỏ hàng không hợp lệ.' }, { status: 400 });
  }
  if (expectedVersion !== null && (!Number.isInteger(expectedVersion) || expectedVersion < 0)) {
    return NextResponse.json({ success: false, error: 'Phiên bản giỏ hàng không hợp lệ.' }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Dịch vụ dữ liệu chưa sẵn sàng.' }, { status: 503 });

  if (expectedVersion !== null) {
    const { data: current, error: readError } = await supabase
      .from('pos_cart_drafts')
      .select('version')
      .eq('table_id', tableId)
      .maybeSingle();
    if (readError) {
      console.error('Read cart draft version failed:', readError);
      return NextResponse.json({ success: false, error: 'Không kiểm tra được phiên bản giỏ hàng.' }, { status: 500 });
    }
    if (current && Number(current.version) !== expectedVersion) {
      return NextResponse.json({ success: false, error: 'Giỏ hàng đã được cập nhật trên thiết bị khác.', conflict: true }, { status: 409 });
    }
  }

  const { data, error } = await supabase
    .from('pos_cart_drafts')
    .upsert({
      table_id: tableId,
      cart,
      version: (expectedVersion ?? 0) + 1,
      updated_by: staff.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'table_id' })
    .select('*')
    .single();

  if (error || !data) {
    console.error('Write cart draft failed:', error);
    return NextResponse.json({ success: false, error: 'Không lưu được giỏ hàng dùng chung.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, draft: data });
}

export async function DELETE(request: NextRequest) {
  const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
  if (!staff) return NextResponse.json({ success: false, error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });

  const tableId = request.nextUrl.searchParams.get('tableId')?.trim();
  if (!tableId) return NextResponse.json({ success: false, error: 'Thiếu mã bàn.' }, { status: 400 });

  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Dịch vụ dữ liệu chưa sẵn sàng.' }, { status: 503 });

  const { error } = await supabase.from('pos_cart_drafts').delete().eq('table_id', tableId);
  if (error) {
    console.error('Delete cart draft failed:', error);
    return NextResponse.json({ success: false, error: 'Không xóa được giỏ hàng dùng chung.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
