import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';

const MAX_CART_ITEMS = 50;

export async function GET(request: NextRequest) {
  const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
  if (!staff) return NextResponse.json({ success: false, error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });

  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Dịch vụ dữ liệu chưa sẵn sàng.' }, { status: 503 });

  const tableId = request.nextUrl.searchParams.get('tableId')?.trim();

  // Nếu không truyền tableId: Trả về danh sách tất cả các bản nháp của toàn bộ các bàn
  if (!tableId) {
    const { data, error } = await supabase.from('pos_cart_drafts').select('*');
    if (error) {
      console.warn('Read all cart drafts failed:', error);
      return NextResponse.json({ success: true, drafts: [] });
    }
    return NextResponse.json({ success: true, drafts: data || [] });
  }

  const { data, error } = await supabase.from('pos_cart_drafts').select('*').eq('table_id', tableId).maybeSingle();
  if (error) {
    console.warn('Read cart draft failed:', error);
    return NextResponse.json({ success: true, draft: null });
  }

  return NextResponse.json({ success: true, draft: data || null });
}

// POST: Dùng để nạp hoặc upsert nhanh giỏ hàng nháp (ví dụ khi thu ngân nhận đơn QR)
export async function POST(request: NextRequest) {
  const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
  if (!staff) return NextResponse.json({ success: false, error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });

  const body = await request.json();
  const tableId = String(body.tableId || '').trim();
  const cart = body.cart;
  const selectedCustomer = body.selectedCustomer !== undefined ? body.selectedCustomer : null;

  if (!tableId || !Array.isArray(cart) || cart.length > MAX_CART_ITEMS) {
    return NextResponse.json({ success: false, error: 'Dữ liệu giỏ hàng không hợp lệ.' }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Dịch vụ dữ liệu chưa sẵn sàng.' }, { status: 503 });

  const now = new Date().toISOString();

  try {
    const { data: existingDraft } = await supabase
      .from('pos_cart_drafts')
      .select('*')
      .eq('table_id', tableId)
      .maybeSingle();

    if (existingDraft) {
      const nextVersion = Number(existingDraft.version || 0) + 1;
      const { data: updated, error: updateError } = await supabase
        .from('pos_cart_drafts')
        .update({
          cart,
          selected_customer: selectedCustomer ?? existingDraft.selected_customer,
          version: nextVersion,
          updated_by: staff.id,
          updated_at: now,
        })
        .eq('table_id', tableId)
        .select('*')
        .maybeSingle();

      if (updateError) {
        console.warn('Update cart draft on POST failed:', updateError);
        return NextResponse.json({ success: false, error: 'Không thể cập nhật giỏ hàng.' }, { status: 409 });
      }

      return NextResponse.json({ success: true, draft: updated });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('pos_cart_drafts')
      .insert({
        table_id: tableId,
        cart,
        selected_customer: selectedCustomer,
        version: 1,
        updated_by: staff.id,
        updated_at: now,
      })
      .select('*')
      .single();

    if (insertError) {
      console.warn('Insert cart draft on POST failed:', insertError);
      return NextResponse.json({ success: false, error: 'Không thể khởi tạo giỏ hàng.' }, { status: 409 });
    }

    return NextResponse.json({ success: true, draft: inserted });
  } catch (err) {
    console.error('POST cart-draft error:', err);
    return NextResponse.json({ success: false, error: 'Lỗi xử lý giỏ hàng bàn.' }, { status: 409 });
  }
}

export async function PUT(request: NextRequest) {
  const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
  if (!staff) return NextResponse.json({ success: false, error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });

  const body = await request.json();
  const tableId = String(body.tableId || '').trim();
  const cart = body.cart;
  const expectedVersion = body.expectedVersion == null ? null : Number(body.expectedVersion);
  const selectedCustomer = body.selectedCustomer !== undefined ? body.selectedCustomer : null;

  if (!tableId || !Array.isArray(cart) || cart.length > MAX_CART_ITEMS) {
    return NextResponse.json({ success: false, error: 'Dữ liệu giỏ hàng không hợp lệ.' }, { status: 400 });
  }
  if (expectedVersion !== null && (!Number.isInteger(expectedVersion) || expectedVersion < 0)) {
    return NextResponse.json({ success: false, error: 'Phiên bản giỏ hàng không hợp lệ.' }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Dịch vụ dữ liệu chưa sẵn sàng.' }, { status: 503 });

  // 1. Nếu client truyền expectedVersion > 0: Phải là UPDATE bản ghi hiện có
  if (expectedVersion !== null && expectedVersion > 0) {
    const nextVersion = expectedVersion + 1;
    const { data: updated, error: updateError } = await supabase
      .from('pos_cart_drafts')
      .update({
        cart,
        selected_customer: selectedCustomer,
        version: nextVersion,
        updated_by: staff.id,
        updated_at: new Date().toISOString(),
      })
      .eq('table_id', tableId)
      .eq('version', expectedVersion)
      .select('*')
      .maybeSingle();

    if (updateError) {
      console.warn('Update cart draft failed:', updateError);
      return NextResponse.json({ success: false, conflict: true, error: 'Lệch phiên bản giỏ hàng dùng chung.' }, { status: 409 });
    }

    if (!updated) {
      // Kiểm tra lý do: Bàn đã bị xóa hay do lệch version
      const { data: current } = await supabase
        .from('pos_cart_drafts')
        .select('*')
        .eq('table_id', tableId)
        .maybeSingle();

      if (!current) {
        return NextResponse.json({
          success: false,
          conflict: true,
          error: 'Bàn đã được thanh toán hoặc xóa giỏ hàng.',
        }, { status: 409 });
      }

      return NextResponse.json({
        success: false,
        conflict: true,
        error: 'Giỏ hàng đã được cập nhật trên thiết bị khác.',
        draft: current,
      }, { status: 409 });
    }

    return NextResponse.json({ success: true, draft: updated });
  }

  // 2. Nếu expectedVersion === 0 hoặc null: Khởi tạo draft mới
  const { data: existingDraft } = await supabase
    .from('pos_cart_drafts')
    .select('*')
    .eq('table_id', tableId)
    .maybeSingle();

  if (existingDraft) {
    return NextResponse.json({
      success: false,
      conflict: true,
      error: 'Bàn đã có giỏ hàng được mở từ thiết bị khác.',
      draft: existingDraft,
    }, { status: 409 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from('pos_cart_drafts')
    .insert({
      table_id: tableId,
      cart,
      selected_customer: selectedCustomer,
      version: 1,
      updated_by: staff.id,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (insertError || !inserted) {
    console.warn('Insert cart draft failed:', insertError);
    return NextResponse.json({ success: false, conflict: true, error: 'Không thể khởi tạo giỏ hàng.' }, { status: 409 });
  }

  return NextResponse.json({ success: true, draft: inserted });
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
    console.warn('Delete cart draft failed:', error);
    return NextResponse.json({ success: false, error: 'Không xóa được giỏ hàng dùng chung.' }, { status: 409 });
  }
  return NextResponse.json({ success: true });
}
