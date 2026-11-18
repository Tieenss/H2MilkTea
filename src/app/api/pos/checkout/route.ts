import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';
import dmhhData from '@/data/DMHH.json';
import { parseFlexibleDecimal, validateDiscountInput } from '@/utils/numberValidation';

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
    const rawDiscount = paymentForm?.discount ?? body.invoice?.['Giảm giá'] ?? body.invoice?.['Ưu đãi'] ?? 0;
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
    const vat = Number(body.invoice?.['VAT'] ?? 0);

    const discountValidation = validateDiscountInput(rawDiscount, Math.max(0, total + vat));
    if (!discountValidation.valid) {
      return NextResponse.json(
        { success: false, error: discountValidation.error || 'Số tiền giảm giá không hợp lệ.' },
        { status: 400 }
      );
    }
    const discount = discountValidation.value;

    // Trong usePOS.ts, body.totalAmount / body.invoice['Tổng tiền'] có thể truyền subtotal (nếu kèm VAT) hoặc finalTotal.
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

    // Truy vấn danh mục DMHH, CAUHINH, NGUYENLIEU từ Supabase trước (chỉ dùng dmhhData làm fallback nếu DB trống)
    const [{ data: liveDmhh }, { data: liveCauhinh }, { data: liveNguyenlieu }] = await Promise.all([
      supabase.from('DMHH').select('*'),
      supabase.from('CAUHINH').select('*'),
      supabase.from('NGUYENLIEU').select('*'),
    ]);

    const resolvedCatalogMap = new Map<string, { name: string; unit: string }>(productCatalogMap);
    if (Array.isArray(liveDmhh) && liveDmhh.length > 0) {
      for (const item of liveDmhh as any[]) {
        const id = String(item?.IDSP || '').trim();
        if (id) {
          resolvedCatalogMap.set(id, {
            name: String(item?.['Tên sản phẩm'] || resolvedCatalogMap.get(id)?.name || '').trim(),
            unit: String(item?.['Đơn vị tính'] || resolvedCatalogMap.get(id)?.unit || 'Ly').trim() || 'Ly',
          });
        }
      }
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

    // Chuẩn bị danh sách chi tiết hóa đơn: chỉ giữ đúng 9 cột hợp lệ của bảng HOADONDETAIL
    const sourceDetails = Array.isArray(body.details) && body.details.length > 0 ? body.details : rawCart;
    const detailsRecords = sourceDetails.map((d: any, idx: number) => {
      const rawId = String(d?.IDSP || d?.id || '').trim();
      const matchedCartItem =
        rawCart.find((c: any) => String(c?.id || c?.IDSP || '').trim() === rawId) || rawCart[idx] || {};
      const resolvedId = rawId || String(matchedCartItem?.id || matchedCartItem?.IDSP || idx + 1).trim();
      const catalogItem = resolvedCatalogMap.get(resolvedId);

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
        IDHOADONDETAIL: String(d?.IDHOADONDETAIL || `${invoiceId}_${resolvedId}_${idx + 1}`),
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

    // Chuẩn bị payload hóa đơn theo đúng schema bảng HOADON (TUYỆT ĐỐI không spread ...body.invoice)
    const invoiceRecord: Record<string, any> = {
      IDHOADON: invoiceId,
      IDBAN: resolvedTableId,
      "Nhân viên": body.invoice?.['Nhân viên'] || body.invoice?.['Thu ngân'] || body.employee || staffName,
      "Khách hàng": customer || body.invoice?.['Khách hàng'] || body.invoice?.['Tên khách hàng'] || 'Khách lẻ',
      "Ngày": body.invoice?.['Ngày'] || formatDate(new Date()),
      "Tổng tiền": total,
      "VAT": vat,
      "Giảm giá": discount,
      "Khách trả": paidAmount,
      "Tiền thừa": change,
      "Ghi chú": note,
      "Trạng thái": body.invoice?.['Trạng thái'] || (isDebt ? 'Ghi nợ' : 'Đã thanh toán'),
      "Trạng thái sự dụng bàn":
        body.invoice?.['Trạng thái sự dụng bàn'] ||
        (tableName === 'Khách mua về' || resolvedTableId === 'Khách mua về' ? 'Mang về' : 'Đã trả bàn'),
      "Loại thanh toán": paymentType,
      "Hóa đơn chi tiết": detailsRecords.map((d) => d.IDHOADONDETAIL).join(' , '),
    };
    delete invoiceRecord.idempotency_key;

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

    // 2.3 Upsert chi tiết hóa đơn theo IDHOADONDETAIL để đảm bảo không bao giờ nhân đôi dòng
    const detailsTable = supabase.from('HOADONDETAIL') as any;
    const { error: detailsError } =
      typeof detailsTable.upsert === 'function'
        ? await detailsTable.upsert(detailsRecords, { onConflict: 'IDHOADONDETAIL' })
        : await detailsTable.insert(detailsRecords);
    if (detailsError) {
      console.error('Lỗi upsert HOADONDETAIL:', detailsError);
      return NextResponse.json({ success: false, error: 'Không thể lưu chi tiết hóa đơn: ' + detailsError.message }, { status: 500 });
    }

    // 2.3b Khấu trừ tồn kho BOM nguyên liệu theo CAUHINH đúng 01 lần duy nhất cho số lượng bán
    // (Chỉ cập nhật NGUYENLIEU['Số lượng tồn'] nếu cột này tồn tại trên DB; không ghi đúp NHAPXUATKHO vì useMaterialInventory đã trừ theo HOADONDETAIL)
    if (Array.isArray(liveCauhinh) && liveCauhinh.length > 0 && Array.isArray(liveNguyenlieu) && liveNguyenlieu.length > 0) {
      try {
        const materialUsageMap = new Map<string, number>();
        for (const detail of detailsRecords) {
          const soldQty = Number(detail['Số lượng']) || 0;
          if (soldQty <= 0) continue;
          const productConfigs = liveCauhinh.filter(
            (cfg: any) => String(cfg?.IDSP || '').trim() === detail.IDSP && cfg?.['Trạng thái'] !== 'Ngừng hoạt động'
          );
          for (const cfg of productConfigs) {
            const idNVL = String(cfg?.IDNguyenLieu || '').trim();
            if (!idNVL) continue;
            const convertedQty = parseFlexibleDecimal(cfg['Số lượng quy đổi']);
            const baseNeededQty = parseFlexibleDecimal(cfg['Số lượng cần']);
            const amountPerUnit =
              !Number.isNaN(convertedQty) && convertedQty > 0
                ? convertedQty
                : !Number.isNaN(baseNeededQty) && baseNeededQty > 0
                  ? baseNeededQty
                  : 0;
            if (amountPerUnit > 0) {
              materialUsageMap.set(idNVL, (materialUsageMap.get(idNVL) || 0) + soldQty * amountPerUnit);
            }
          }
        }

        if (materialUsageMap.size > 0) {
          const materialMap = new Map<string, any>();
          for (const mat of liveNguyenlieu as any[]) {
            const id = String(mat?.IDNguyenLieu || '').trim();
            if (id) materialMap.set(id, mat);
          }

          for (const [idNVL, usedAmount] of materialUsageMap.entries()) {
            const mat = materialMap.get(idNVL);
            if (mat && Object.prototype.hasOwnProperty.call(mat, 'Số lượng tồn') && mat['Số lượng tồn'] !== undefined) {
              const currentStock = parseFlexibleDecimal(mat['Số lượng tồn']);
              if (!Number.isNaN(currentStock)) {
                const nextStock = Math.max(0, Math.round((currentStock - usedAmount) * 1000) / 1000);
                await supabase
                  .from('NGUYENLIEU')
                  .update({ 'Số lượng tồn': nextStock })
                  .eq('IDNguyenLieu', idNVL);
              }
            }
          }
        }
      } catch (bomErr) {
        console.warn('Khấu trừ tồn kho BOM (fallback) gặp cảnh báo:', bomErr);
      }
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

    // 2.6 Đồng bộ đơn pos_orders sang 'paid', 'completed' và 'served' để tự động dọn bếp
    if (linkedOrderIds.length > 0) {
      await supabase
        .from('pos_orders')
        .update({
          kitchen_status: 'served',
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
          kitchen_status: 'served',
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
