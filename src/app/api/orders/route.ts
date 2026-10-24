import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import menuData from '@/data/DMHH.json';
import tableData from '@/data/DSBAN.json';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';
import { checkOrderRateLimit, verifyTableQrToken } from '@/lib/qr/token';

type OrderSource = 'POS_COUNTER' | 'QR_TABLE';
interface IncomingItem {
  productId: string;
  productName?: string;
  unitPrice?: number;
  quantity: number;
  size?: string;
  sugar?: string;
  ice?: string;
  note?: string;
  unit?: string;
}

const isUnavailableTable = (status: unknown) => ['Bảo trì', 'Ngừng hoạt động'].includes(String(status || ''));

const isMissingExpiresAtError = (err: { code?: string; message?: string } | null | undefined) => {
  if (!err) return false;
  const msg = String(err.message || '');
  return err.code === 'PGRST204' || msg.includes('expires_at');
};

// Bộ nhớ đệm danh mục món và danh sách bàn (giúp giảm tải truy vấn DB lặp đi lặp lại)
let catalogCache: { timestamp: number; tables: any[]; products: any[] } | null = null;
const CATALOG_CACHE_TTL_MS = 60_000; // 60 giây

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const source = body.source as OrderSource;
    if (source !== 'POS_COUNTER' && source !== 'QR_TABLE') {
      return NextResponse.json({ success: false, error: 'Nguồn đơn không hợp lệ.' }, { status: 400 });
    }

    const staff = source === 'POS_COUNTER' ? await getAuthenticatedStaff(request.headers.get('cookie') || '') : null;
    if (source === 'POS_COUNTER' && !staff) {
      return NextResponse.json({ success: false, error: 'Phiên đăng nhập nhân viên đã hết hạn.' }, { status: 401 });
    }

    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Máy chủ chưa cấu hình lưu đơn hàng. Vui lòng báo nhân viên.' }, { status: 503 });
    }
    const isTestEnv = process.env.NODE_ENV === 'test';
    let tables: any[];
    let products: any[];

    if (!isTestEnv && catalogCache && (Date.now() - catalogCache.timestamp < CATALOG_CACHE_TTL_MS)) {
      tables = catalogCache.tables;
      products = catalogCache.products;
    } else {
      const [{ data: liveTables }, { data: liveProducts }] = await Promise.all([
        supabase.from('DSBAN').select('*'),
        supabase.from('DMHH').select('*'),
      ]);
      tables = liveTables?.length ? liveTables : tableData;
      products = liveProducts?.length ? liveProducts : menuData;
      if (!isTestEnv) {
        catalogCache = { timestamp: Date.now(), tables, products };
      }
    }

    const requestedTableId = String(body.tableId || '').trim();
    const normalizedTableId = requestedTableId.toLocaleLowerCase('vi');
    const resolvedTable = normalizedTableId === 'takeaway'
      ? tables.find((table) => table.IDBAN === 'Khách mua về')
      : tables.find((table) => String(table.IDBAN).trim().toLocaleLowerCase('vi') === normalizedTableId);
    if (!resolvedTable || isUnavailableTable(resolvedTable['Trạng thái'])) {
      return NextResponse.json({ success: false, error: 'Bàn không tồn tại hoặc đang ngừng phục vụ.' }, { status: 400 });
    }

    // Bảo vệ đơn QR: Rate limiting & Token verification (sau cờ FEATURE_QR_TOKEN)
    if (source === 'QR_TABLE') {
      const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
      const rateLimitKey = `${clientIp}_${resolvedTable.IDBAN}`;
      const { allowed } = checkOrderRateLimit(rateLimitKey);
      if (!allowed) {
        return NextResponse.json({ success: false, error: 'Quá nhiều yêu cầu đặt món từ bàn này. Vui lòng chờ 1 phút.' }, { status: 429 });
      }

      if (process.env.FEATURE_QR_TOKEN === 'true') {
        const qrToken = String(body.qrToken || request.headers.get('x-qr-token') || '').trim();
        const verification = verifyTableQrToken(qrToken, resolvedTable.IDBAN);
        if (!verification.valid) {
          return NextResponse.json({ success: false, error: verification.reason || 'Mã xác thực bàn không hợp lệ.' }, { status: 403 });
        }
      }
    }

    const items = body.items as IncomingItem[];
    const maxItems = source === 'QR_TABLE' ? 20 : 50;
    if (!Array.isArray(items) || items.length === 0 || items.length > maxItems) {
      return NextResponse.json({ success: false, error: `Đơn cần có từ 1 đến ${maxItems} món.` }, { status: 400 });
    }

    const canonicalItems = [];
    for (const item of items) {
      const productId = String(item.productId || '').trim();
      const product = products.find((row) => row.IDSP === productId && row['Trạng thái'] === 'Hoạt động')
        || menuData.find((row) => row.IDSP === productId && row['Trạng thái'] === 'Hoạt động');
      const quantity = Number(item.quantity);
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        return NextResponse.json({ success: false, error: 'Món hoặc số lượng không hợp lệ.' }, { status: 400 });
      }

      const basePrice = Number(product['Đơn giá']);
      const fallbackProduct = menuData.find((row) => row.IDSP === productId);
      const fallbackBasePrice = fallbackProduct ? Number(fallbackProduct['Đơn giá']) : basePrice;

      const isFood = ['Ăn vặt', 'Bánh ngọt'].includes(product['Loại sản phẩm']);
      const rawSize = String(item.size || '').trim().toUpperCase();
      const normalizedSize = isFood ? '' : (rawSize === 'L' ? 'L' : 'M');

      // Quy định chuẩn: Size gốc M (+0đ), tăng lên Size L (+5.000đ)
      const sizeAdjust = isFood ? 0 : (normalizedSize === 'L' ? 5000 : 0);
      const expectedUnitPrice = basePrice + sizeAdjust;

      // Chấp nhận cả trường hợp client dùng giá từ DMHH.json tĩnh hoặc quy tắc size cũ, nhưng luôn lưu giá chuẩn của server (expectedUnitPrice)
      if (!Number.isFinite(expectedUnitPrice)) {
        return NextResponse.json({ success: false, error: `Giá của món ${product['Tên sản phẩm']} không hợp lệ.` }, { status: 400 });
      }

      if (source === 'POS_COUNTER' && Number.isFinite(Number(item.unitPrice))) {
        const clientPrice = Number(item.unitPrice);
        const validPrices = new Set([
          basePrice,
          basePrice + 5000,
          fallbackBasePrice,
          fallbackBasePrice + 5000,
        ]);
        if (!validPrices.has(clientPrice)) {
          return NextResponse.json({ success: false, error: `Giá của món ${product['Tên sản phẩm']} đã thay đổi. Vui lòng tải lại menu.` }, { status: 400 });
        }
      }

      canonicalItems.push({
        productId,
        productName: product['Tên sản phẩm'],
        unitPrice: expectedUnitPrice,
        quantity,
        size: normalizedSize,
        sugar: String(item.sugar || ''),
        ice: String(item.ice || ''),
        note: String(item.note || '').slice(0, 300),
        unit: product['Đơn vị tính'],
      });
    }

    const idempotencyKey = String(request.headers.get('idempotency-key') || body.idempotencyKey || '').trim();
    if (!idempotencyKey || idempotencyKey.length > 120) {
      return NextResponse.json({ success: false, error: 'Thiếu mã chống gửi trùng đơn.' }, { status: 400 });
    }
    const { data: existingOrder } = await supabase.from('pos_orders').select('id,tracking_token,order_status').eq('idempotency_key', idempotencyKey).maybeSingle();
    if (existingOrder) {
      return NextResponse.json({ success: true, orderId: existingOrder.id, trackingToken: existingOrder.tracking_token, status: existingOrder.order_status, duplicate: true });
    }

    const subtotal = canonicalItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const vatAmount = Math.round(subtotal * 0.1);
    const totalAmount = subtotal + vatAmount;
    const sourceEmployee = source === 'POS_COUNTER' ? String(body.employee || staff?.email || 'Thu ngân').slice(0, 100) : 'Khách QR';
    const orderStatus = source === 'QR_TABLE' ? 'awaiting_confirmation' : 'accepted';
    const trackingToken = source === 'QR_TABLE' ? randomUUID() + randomUUID().replaceAll('-', '') : null;
    const expiresAt = source === 'QR_TABLE' ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

    const baseInsertPayload = {
      source,
      table_id: resolvedTable.IDBAN === 'Khách mua về' ? 'Khách mua về' : resolvedTable.IDBAN,
      table_name: resolvedTable['Tên bàn'],
      employee: sourceEmployee,
      items: canonicalItems,
      subtotal,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      notes: String(body.note || '').slice(0, 1000),
      order_status: orderStatus,
      kitchen_status: 'queued',
      payment_status: 'unpaid',
      tracking_token: trackingToken,
      idempotency_key: idempotencyKey,
    };

    let { data: order, error } = await supabase
      .from('pos_orders')
      .insert({
        ...baseInsertPayload,
        expires_at: expiresAt,
      })
      .select('id,tracking_token,order_status')
      .single();

    // Self-healing fallback: nếu schema cache trên Supabase chưa có cột 'expires_at' (lỗi PGRST204), tự động retry không truyền 'expires_at'
    if (error && isMissingExpiresAtError(error)) {
      console.warn('[Self-Healing Order API] Schema cache missing expires_at column, retrying insert without expires_at...');
      const retryResult = await supabase
        .from('pos_orders')
        .insert(baseInsertPayload)
        .select('id,tracking_token,order_status')
        .single();
      order = retryResult.data;
      error = retryResult.error;
    }

    if (error || !order) {
      if (error?.code === '23505') {
        const { data: duplicate } = await supabase.from('pos_orders').select('id,tracking_token,order_status').eq('idempotency_key', idempotencyKey).maybeSingle();
        if (duplicate) return NextResponse.json({ success: true, orderId: duplicate.id, trackingToken: duplicate.tracking_token, status: duplicate.order_status, duplicate: true });
      }
      console.error('Create order failed:', error);
      return NextResponse.json({ success: false, error: 'Không lưu được đơn hàng. Vui lòng thử lại.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, orderId: order.id, trackingToken: order.tracking_token, status: order.order_status, totalAmount });
  } catch (error) {
    console.error('Order creation failed:', error);
    return NextResponse.json({ success: false, error: 'Không thể xử lý đơn hàng.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Hỗ trợ lấy danh mục sản phẩm trực tiếp cho trang Khách đặt món QR để đồng bộ giá 100% với server
  if (request.nextUrl.searchParams.get('catalog') === '1') {
    const supabase = createAdminSupabaseClient();
    if (supabase) {
      const { data: liveProducts } = await supabase.from('DMHH').select('*');
      if (liveProducts?.length) {
        return NextResponse.json({ success: true, products: liveProducts });
      }
    }
    return NextResponse.json({ success: true, products: menuData });
  }

  const trackingToken = request.nextUrl.searchParams.get('token');
  if (!trackingToken || trackingToken.length < 32) {
    return NextResponse.json({ success: false, error: 'Mã theo dõi không hợp lệ.' }, { status: 400 });
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Dịch vụ đơn hàng chưa sẵn sàng.' }, { status: 503 });

  let { data, error } = await supabase.from('pos_orders')
    .select('id,source,table_id,table_name,items,subtotal,vat_amount,total_amount,notes,order_status,kitchen_status,payment_status,rejection_reason,created_at,updated_at,expires_at')
    .eq('tracking_token', trackingToken)
    .maybeSingle();

  // Self-healing fallback khi truy vấn trạng thái đơn mà DB chưa có cột 'expires_at'
  if (error && isMissingExpiresAtError(error)) {
    const retrySelect = await supabase.from('pos_orders')
      .select('id,source,table_id,table_name,items,subtotal,vat_amount,total_amount,notes,order_status,kitchen_status,payment_status,rejection_reason,created_at,updated_at')
      .eq('tracking_token', trackingToken)
      .maybeSingle();
    data = retrySelect.data ? { ...retrySelect.data, expires_at: null } : null;
    error = retrySelect.error;
  }

  if (error || !data) return NextResponse.json({ success: false, error: 'Không tìm thấy đơn hàng.' }, { status: 404 });

  // Kiểm tra đơn QR tự động hết hạn sau 15 phút nếu chưa được duyệt
  if (data.source === 'QR_TABLE' && data.order_status === 'awaiting_confirmation') {
    const isExpired = data.expires_at
      ? new Date() > new Date(data.expires_at)
      : Date.now() - new Date(data.created_at).getTime() > 15 * 60 * 1000;

    if (isExpired) {
      await supabase
        .from('pos_orders')
        .update({ order_status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', data.id);
      data.order_status = 'expired';
    }
  }

  return NextResponse.json({ success: true, order: data });
}

export async function PATCH(request: NextRequest) {
  const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
  if (!staff) return NextResponse.json({ success: false, error: 'Phiên đăng nhập nhân viên đã hết hạn.' }, { status: 401 });
  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Dịch vụ đơn hàng chưa sẵn sàng.' }, { status: 503 });

  try {
    const body = await request.json();
    const id = String(body.id || '');
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const allowedStatuses = [
      'awaiting_confirmation',
      'accepted',
      'rejected',
      'completed',
      'cancelled',
      'expired',
      'cancelled_by_customer'
    ];
    const allowedKitchenStatuses = ['queued', 'preparing', 'ready', 'served'];
    const allowedPaymentStatuses = ['unpaid', 'paid', 'refunded'];
    if (!id) return NextResponse.json({ success: false, error: 'Thiếu mã đơn.' }, { status: 400 });
    if (body.orderStatus && allowedStatuses.includes(body.orderStatus)) updates.order_status = body.orderStatus;
    if (body.kitchenStatus && allowedKitchenStatuses.includes(body.kitchenStatus)) updates.kitchen_status = body.kitchenStatus;
    if (body.paymentStatus && allowedPaymentStatuses.includes(body.paymentStatus)) updates.payment_status = body.paymentStatus;
    if (body.paymentMethod) updates.payment_method = String(body.paymentMethod).slice(0, 80);
    if (body.invoiceId) updates.invoice_id = String(body.invoiceId).slice(0, 100);
    if (body.orderStatus === 'accepted') updates.accepted_by = staff.email || staff.id;
    if (body.orderStatus === 'rejected') updates.rejection_reason = String(body.rejectionReason || '').slice(0, 300);
    if (Object.keys(updates).length === 1) return NextResponse.json({ success: false, error: 'Không có trạng thái hợp lệ để cập nhật.' }, { status: 400 });

    const { data: current, error: currentError } = await supabase.from('pos_orders').select('*').eq('id', id).single();
    if (currentError || !current) return NextResponse.json({ success: false, error: 'Không tìm thấy đơn hàng.' }, { status: 404 });
    if (body.orderStatus && current.order_status !== 'awaiting_confirmation') {
      return NextResponse.json({ success: false, error: 'Đơn đã được xử lý bởi nhân viên khác.' }, { status: 409 });
    }
    updates.status_version = Number(current.status_version || 0) + 1;
    const { data: updated, error } = await supabase.from('pos_orders').update(updates).eq('id', id).eq('status_version', current.status_version).select('*').maybeSingle();
    if (error || !updated) return NextResponse.json({ success: false, error: 'Đơn vừa được cập nhật ở thiết bị khác. Hãy tải lại danh sách.' }, { status: 409 });

    if (updated.tracking_token) {
      try {
        const channel = supabase.channel(`qr-order:${updated.tracking_token}`);
        await new Promise<void>((resolve) => channel.subscribe((status) => { if (status === 'SUBSCRIBED') resolve(); }));
        await channel.send({ type: 'broadcast', event: 'order-status', payload: {
          order_status: updated.order_status,
          kitchen_status: updated.kitchen_status,
          payment_status: updated.payment_status,
          rejection_reason: updated.rejection_reason,
          updated_at: updated.updated_at,
        } });
        await supabase.removeChannel(channel);
      } catch (broadcastError) {
        console.error('Customer status broadcast failed:', broadcastError);
      }
    }
    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error('Update order failed:', error);
    return NextResponse.json({ success: false, error: 'Không thể cập nhật trạng thái đơn.' }, { status: 500 });
  }
}
