import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';
import dmhhData from '@/data/DMHH.json';

interface CheckoutBody {
  tableId?: string;
  tableName?: string;
  invoiceId?: string;
  employee?: string;
  totalAmount?: number;
  paymentForm?: {
    customer?: string;
    discount?: number;
    paidAmount?: number;
    note?: string;
    paymentType?: string;
    debtAmount?: number;
    totalAmount?: number;
  };
  cart?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    unit?: string;
    note?: string;
  }>;
  items?: Array<any>;
  invoice?: any;
  details?: any[];
  orderIds?: string[];
  linkedOrderIds?: string[];
  idempotencyKey?: string;
}

const productCatalogMap = new Map<string, { name: string; unit: string }>();
if (Array.isArray(dmhhData)) {
  for (const item of dmhhData as any[]) {
    const id = String(item?.IDSP || '').trim();
    if (id) {
      productCatalogMap.set(id, {
        name: String(item?.['Tên sản phẩm'] || '').trim(),
        unit: String(item?.['Đơn vị tính'] || 'Ly').trim() || 'Ly',
      });
    }
  }
}

function isMissingColumnError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || '');
  const message = String(err.message || '').toLowerCase();
  const details = String(err.details || '').toLowerCase();
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    message.includes('idempotency_key') ||
    message.includes('column') ||
    details.includes('idempotency_key')
  );
}

function formatDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
}

export async function POST(request: NextRequest) {
  try {
    const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });
    }

    const body: CheckoutBody = await request.json();
    const tableId = body.tableId || body.invoice?.['Mã bàn'] || body.invoice?.IDBAN || '';
    const tableName = body.tableName || body.invoice?.['Bàn'] || '';
    const invoiceId = String(body.invoiceId || body.invoice?.IDHOADON || body.invoice?.IDHD || '').trim();
    const paymentForm = body.paymentForm;
    const rawCart = body.cart || body.items || [];
    const idempotencyKey = body.idempotencyKey || body.invoice?.idempotency_key;
    const rawLinked = body.linkedOrderIds || body.orderIds;
    const linkedOrderIds: string[] = Array.isArray(rawLinked) ? rawLinked : [];

    if (!invoiceId) {
      return NextResponse.json({ success: false, error: 'Thiếu mã hóa đơn.' }, { status: 400 });
    }
    if (!Array.isArray(rawCart) || rawCart.length === 0) {
      return NextResponse.json({ success: false, error: 'Giỏ hàng trống.' }, { status: 400 });
    }

    const staffName = staff.user_metadata?.name || staff.user_metadata?.username || staff.email || 'Thu ngân';
    const customer = paymentForm?.customer || body.invoice?.['Khách hàng'] || body.invoice?.['Tên khách hàng'] || 'Khách lẻ';
    const discount = Number(paymentForm?.discount ?? body.invoice?.['Giảm giá'] ?? body.invoice?.['Ưu đãi'] ?? 0);
    const cartSubtotal = rawCart.reduce(
      (sum, item) => sum + Number(item.price ?? item['Đơn giá'] ?? 0) * Number(item.quantity ?? item['Số lượng'] ?? 1),
      0
    );
    const hasExplicitTotal =
      paymentForm?.totalAmount !== undefined ||
      body.totalAmount !== undefined ||
      body.invoice?.['Tổng tiền'] !== undefined;
    const total = Number(
      paymentForm?.totalAmount ?? body.totalAmount ?? body.invoice?.['Tổng tiền'] ?? cartSubtotal
    );
    const vat = Number(body.invoice?.['VAT'] || 0);
    // Trong usePOS.ts, body.totalAmount / body.invoice['Tổng tiền'] đã bao gồm VAT và trừ giảm giá (finalTotal).
    // Nếu không truyền VAT riêng, không cộng/trừ trùng để tránh lệch finalAmount.
    const finalAmount = hasExplicitTotal
      ? body.invoice?.['VAT'] !== undefined
        ? Math.max(0, total + vat - discount)
        : total
      : Math.max(0, cartSubtotal + vat - discount);

    const paymentType =
      paymentForm?.paymentType ||
      body.invoice?.['Loại thanh toán'] ||
      body.invoice?.['Hình thức thanh toán'] ||
      'Tiền mặt';
    const paidAmount = Number(
      paymentForm?.paidAmount ??
        body.invoice?.['Khách trả'] ??
        body.invoice?.['Tiền khách đưa'] ??
        body.invoice?.['Đã thanh toán'] ??
        finalAmount
    );
    const note = paymentForm?.note ?? body.invoice?.['Ghi chú'] ?? '';

    const isDebt =
      paymentType === 'Ghi nợ' ||
      body.invoice?.['Trạng thái'] === 'Ghi nợ' ||
      Number(paymentForm?.debtAmount ?? body.invoice?.['Tiền nợ'] ?? 0) > 0;
    if (!isDebt && paidAmount < finalAmount) {
      return NextResponse.json({ success: false, error: 'Số tiền khách trả không đủ.' }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Dịch vụ dữ liệu chưa sẵn sàng.' }, { status: 503 });
    }

    const change =
      body.invoice?.['Tiền thừa'] !== undefined
        ? Number(body.invoice['Tiền thừa'])
        : body.invoice?.['Tiền thối'] !== undefined
          ? Number(body.invoice['Tiền thối'])
          : isDebt
            ? 0
            : Math.max(0, paidAmount - finalAmount);

    const resolvedTableId = tableId || body.invoice?.['Mã bàn'] || body.invoice?.IDBAN || 'Khách mua về';

    // Chuẩn bị payload hóa đơn theo đúng schema bảng HOADON (TUYỆT ĐỐI không spread ...body.invoice)
    const invoiceRecord: Record<string, any> = {
      IDHOADON: invoiceId,
      IDBAN: resolvedTableId,
      "Nhân viên": body.invoice?.['Nhân viên'] || body.invoice?.['Thu ngân'] || body.employee || staffName,
      "Khách hàng": customer || body.invoice?.['Khách hàng'] || body.invoice?.['Tên khách hàng'] || 'Khách lẻ',
      "Ngày": body.invoice?.['Ngày'] || formatDate(new Date()),
      "Tổng tiền": total,
      "VAT": vat,
      "Giảm giá": discount || Number(body.invoice?.['Ưu đãi'] || 0),
      "Khách trả": paidAmount,
      "Tiền thừa": change,
      "Ghi chú": note,
      "Trạng thái": body.invoice?.['Trạng thái'] || (isDebt ? 'Ghi nợ' : 'Đã thanh toán'),
      "Trạng thái sự dụng bàn":
        body.invoice?.['Trạng thái sự dụng bàn'] ||
        (tableName === 'Khách mua về' || resolvedTableId === 'Khách mua về' ? 'Mang về' : 'Đã trả bàn'),
      "Loại thanh toán": paymentType,
      "Hóa đơn chi tiết": rawCart
        .map((item: any, idx: number) => `${invoiceId}_${item.id || item.IDSP || idx + 1}`)
        .join(' , '),
      idempotency_key: idempotencyKey || null,
    };

    // Chuẩn bị danh sách chi tiết hóa đơn: chỉ giữ đúng 9 cột hợp lệ của bảng HOADONDETAIL
    const sourceDetails = Array.isArray(body.details) && body.details.length > 0 ? body.details : rawCart;
    const detailsRecords = sourceDetails.map((d: any, idx: number) => {
      const rawId = String(d?.IDSP || d?.id || '').trim();
      const matchedCartItem =
        rawCart.find((c: any) => String(c?.id || c?.IDSP || '').trim() === rawId) || rawCart[idx] || {};
      const resolvedId = rawId || String(matchedCartItem?.id || matchedCartItem?.IDSP || idx + 1).trim();
      const catalogItem = productCatalogMap.get(resolvedId);

      const productName =
        String(
          d?.['Tên sản phẩm'] ||
            d?.name ||
            matchedCartItem?.name ||
            matchedCartItem?.['Tên sản phẩm'] ||
            catalogItem?.name ||
            `Sản phẩm ${resolvedId}`
        ).trim() || `Sản phẩm ${resolvedId}`;

      const unit =
        String(
          d?.['Đơn vị tính'] ||
            d?.unit ||
            matchedCartItem?.unit ||
            matchedCartItem?.['Đơn vị tính'] ||
            catalogItem?.unit ||
            'Ly'
        ).trim() || 'Ly';

      const price = Number(d?.['Đơn giá'] ?? d?.price ?? matchedCartItem?.price ?? matchedCartItem?.['Đơn giá'] ?? 0);
      const quantity = Number(
        d?.['Số lượng'] ?? d?.quantity ?? matchedCartItem?.quantity ?? matchedCartItem?.['Số lượng'] ?? 1
      );
      const subtotal = Number(d?.['Thành tiền'] ?? price * quantity);
      const itemNote = String(d?.['Ghi chú'] ?? d?.note ?? matchedCartItem?.note ?? matchedCartItem?.['Ghi chú'] ?? '');

      return {
        IDHOADONDETAIL: String(d?.IDHOADONDETAIL || `${invoiceId}_${resolvedId}`),
        IDHOADON: invoiceId,
        IDSP: resolvedId,
        "Tên sản phẩm": productName,
        "Đơn vị tính": unit,
        "Đơn giá": price,
        "Số lượng": quantity,
        "Thành tiền": subtotal,
        "Ghi chú": itemNote,
      };
    });

    // 1. Thử gọi RPC pos_pay_order trong Postgres (Single-transaction)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('pos_pay_order', {
        payload: {
          idempotency_key: idempotencyKey || null,
          invoice: invoiceRecord,
          details: detailsRecords,
          table_id: resolvedTableId,
          linked_order_ids: linkedOrderIds,
        }
      });

      if (!rpcError && rpcData && rpcData.success) {
        return NextResponse.json({
          success: true,
          invoiceId: rpcData.invoice_id || invoiceId,
          idempotent: !!rpcData.idempotent,
        });
      }
    } catch (rpcCallErr) {
      console.warn('RPC pos_pay_order không khả dụng, thực thi server-side transaction fallback:', rpcCallErr);
    }

    // 2. Server-Side Fallback an toàn (sử dụng service_role)
    // 2.1 Kiểm tra Idempotency (bỏ qua nếu bảng HOADON chưa có cột idempotency_key)
    if (idempotencyKey) {
      try {
        const { data: existing, error: idempError } = await supabase
          .from('HOADON')
          .select('IDHOADON')
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle();

        if (!idempError && existing) {
          return NextResponse.json({
            success: true,
            invoiceId: existing.IDHOADON,
            idempotent: true,
            message: 'Hóa đơn đã được xử lý trước đó.',
          });
        }
      } catch (idempErr) {
        console.warn('Bỏ qua kiểm tra idempotency_key do lỗi truy vấn:', idempErr);
      }
    }

    // 2.2 Tạo Hóa Đơn (kèm cơ chế self-healing nếu thiếu cột idempotency_key)
    let { error: invoiceError } = await supabase.from('HOADON').insert(invoiceRecord);
    if (invoiceError && isMissingColumnError(invoiceError)) {
      const fallbackInvoiceRecord = { ...invoiceRecord };
      delete fallbackInvoiceRecord.idempotency_key;
      const retryResult = await supabase.from('HOADON').insert(fallbackInvoiceRecord);
      invoiceError = retryResult.error;
    }

    if (invoiceError) {
      if (invoiceError.message?.includes('duplicate key') || invoiceError.code === '23505') {
        return NextResponse.json({ success: true, invoiceId, idempotent: true });
      }
      console.error('Lỗi insert HOADON:', invoiceError);
      return NextResponse.json({ success: false, error: 'Không thể lưu hóa đơn: ' + invoiceError.message }, { status: 500 });
    }

    // 2.3 Bulk insert chi tiết hóa đơn
    const { error: detailsError } = await supabase.from('HOADONDETAIL').insert(detailsRecords);
    if (detailsError) {
      console.error('Lỗi insert HOADONDETAIL:', detailsError);
      return NextResponse.json({ success: false, error: 'Không thể lưu chi tiết hóa đơn: ' + detailsError.message }, { status: 500 });
    }

    // 2.4 Cập nhật trạng thái bàn về 'Trống'
    if (tableId && tableId !== 'Khách mua về') {
      const { error: tableError } = await supabase
        .from('DSBAN')
        .update({ 'Trạng thái': 'Trống' })
        .eq('IDBAN', tableId);
      if (tableError) {
        console.warn('Cập nhật trạng thái bàn sau thanh toán thất bại:', tableError);
      }
    }

    // 2.5 Xóa giỏ draft của bàn
    if (tableId) {
      await supabase.from('pos_cart_drafts').delete().eq('table_id', tableId);
    }

    // 2.6 Đồng bộ đơn pos_orders sang 'paid' và 'completed'
    if (linkedOrderIds.length > 0) {
      await supabase
        .from('pos_orders')
        .update({
          payment_status: 'paid',
          order_status: 'completed',
          payment_method: paymentType,
          invoice_id: invoiceId,
          updated_at: new Date().toISOString(),
        })
        .in('id', linkedOrderIds);
    } else if (tableId && tableId !== 'Khách mua về') {
      await supabase
        .from('pos_orders')
        .update({
          payment_status: 'paid',
          order_status: 'completed',
          payment_method: paymentType,
          invoice_id: invoiceId,
          updated_at: new Date().toISOString(),
        })
        .eq('table_id', tableId)
        .eq('payment_status', 'unpaid');
    }

    return NextResponse.json({ success: true, invoiceId });
  } catch (err: any) {
    console.error('Exception in checkout API:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi server khi thanh toán.' }, { status: 500 });
  }
}
