import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';

interface CheckoutBody {
  tableId?: string;
  tableName?: string;
  invoiceId?: string;
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
    const tableId = body.tableId || body.invoice?.IDBAN || '';
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
    const customer = paymentForm?.customer || body.invoice?.['Khách hàng'] || 'Khách lẻ';
    const discount = Number(paymentForm?.discount || body.invoice?.['Giảm giá'] || 0);
    const total = Number(paymentForm?.totalAmount || body.invoice?.['Tổng tiền'] || rawCart.reduce((sum, item) => sum + (Number(item.price || item['Đơn giá']) * Number(item.quantity || item['Số lượng'])), 0));
    const vat = Number(body.invoice?.['VAT'] || 0);
    const finalAmount = total + vat - discount;
    const paymentType = paymentForm?.paymentType || body.invoice?.['Loại thanh toán'] || 'Tiền mặt';
    const paidAmount = Number(paymentForm?.paidAmount ?? body.invoice?.['Khách trả'] ?? finalAmount);
    const note = paymentForm?.note || body.invoice?.['Ghi chú'] || '';

    const isDebt = paymentType === 'Ghi nợ' || body.invoice?.['Trạng thái'] === 'Ghi nợ' || (paymentForm?.debtAmount && paymentForm.debtAmount > 0);
    if (!isDebt && paidAmount < finalAmount) {
      return NextResponse.json({ success: false, error: 'Số tiền khách trả không đủ.' }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Dịch vụ dữ liệu chưa sẵn sàng.' }, { status: 503 });
    }

    const change = isDebt ? 0 : Math.max(0, paidAmount - finalAmount);

    // Chuẩn bị payload hóa đơn
    const invoiceRecord = body.invoice ? {
      ...body.invoice,
      IDHOADON: invoiceId,
      IDBAN: tableId,
      "Nhân viên": body.invoice['Nhân viên'] || staffName,
      "Ngày": body.invoice['Ngày'] || formatDate(new Date()),
      "Trạng thái sự dụng bàn": body.invoice['Trạng thái sự dụng bàn'] || (tableName === 'Khách mua về' ? 'Mang về' : 'Đã trả bàn'),
      "Loại thanh toán": paymentType,
      idempotency_key: idempotencyKey || null,
    } : {
      IDHOADON: invoiceId,
      IDBAN: tableId,
      "Ngày": formatDate(new Date()),
      "Nhân viên": staffName,
      "Khách hàng": customer,
      "Tổng tiền": total,
      "VAT": vat,
      "Giảm giá": discount,
      "Khách trả": paidAmount,
      "Tiền thừa": change,
      "Ghi chú": note,
      "Trạng thái": isDebt ? 'Ghi nợ' : 'Đã thanh toán',
      "Trạng thái sự dụng bàn": tableName === 'Khách mua về' ? 'Mang về' : 'Đã trả bàn',
      "Loại thanh toán": paymentType,
      "Hóa đơn chi tiết": rawCart.map((item: any) => `${invoiceId}_${item.id || item.IDSP}`).join(' , '),
      idempotency_key: idempotencyKey || null,
    };

    // Chuẩn bị danh sách chi tiết hóa đơn
    const detailsRecords = Array.isArray(body.details) && body.details.length > 0
      ? body.details.map((d: any, idx: number) => ({
          IDHOADONDETAIL: d.IDHOADONDETAIL || `${invoiceId}_${d.IDSP || d.id || idx + 1}`,
          IDHOADON: invoiceId,
          IDSP: String(d.IDSP || d.id || ''),
          "Tên sản phẩm": d['Tên sản phẩm'] || d.name || '',
          "Đơn vị tính": d['Đơn vị tính'] || d.unit || 'Ly',
          "Đơn giá": Number(d['Đơn giá'] ?? d.price ?? 0),
          "Số lượng": Number(d['Số lượng'] ?? d.quantity ?? 1),
          "Thành tiền": Number(d['Thành tiền'] ?? (Number(d['Đơn giá'] ?? d.price ?? 0) * Number(d['Số lượng'] ?? d.quantity ?? 1))),
          "Ghi chú": d['Ghi chú'] || d.note || '',
        }))
      : rawCart.map((item: any, idx: number) => ({
          IDHOADONDETAIL: `${invoiceId}_${item.id || item.IDSP || idx + 1}`,
          IDHOADON: invoiceId,
          IDSP: String(item.id || item.IDSP || ''),
          "Tên sản phẩm": item.name || item['Tên sản phẩm'] || '',
          "Đơn vị tính": item.unit || item['Đơn vị tính'] || 'Ly',
          "Đơn giá": Number(item.price || item['Đơn giá'] || 0),
          "Số lượng": Number(item.quantity || item['Số lượng'] || 1),
          "Thành tiền": Number(item.price || item['Đơn giá'] || 0) * Number(item.quantity || item['Số lượng'] || 1),
          "Ghi chú": item.note || item['Ghi chú'] || '',
        }));

    // 1. Thử gọi RPC pos_pay_order trong Postgres (Single-transaction)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('pos_pay_order', {
        payload: {
          idempotency_key: idempotencyKey || null,
          invoice: invoiceRecord,
          details: detailsRecords,
          table_id: tableId,
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
    // 2.1 Kiểm tra Idempotency
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('HOADON')
        .select('IDHOADON')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({
          success: true,
          invoiceId: existing.IDHOADON,
          idempotent: true,
          message: 'Hóa đơn đã được xử lý trước đó.',
        });
      }
    }

    // 2.2 Tạo Hóa Đơn
    const { error: invoiceError } = await supabase.from('HOADON').insert(invoiceRecord);
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
    // 2.6 Đồng bộ đơn pos_orders sang 'paid', 'completed' và 'served' (dọn khỏi bếp)
    if (linkedOrderIds.length > 0) {
      await supabase
        .from('pos_orders')
        .update({
          payment_status: 'paid',
          order_status: 'completed',
          kitchen_status: 'served',
          payment_method: paymentType,
          invoice_id: invoiceId,
          updated_at: new Date().toISOString(),
        })
        .in('id', linkedOrderIds);
    }
    if (tableId && tableId !== 'Khách mua về') {
      await supabase
        .from('pos_orders')
        .update({
          payment_status: 'paid',
          order_status: 'completed',
          kitchen_status: 'served',
          payment_method: paymentType,
          invoice_id: invoiceId,
          updated_at: new Date().toISOString(),
        })
        .eq('table_id', tableId)
        .neq('kitchen_status', 'served');
    }

    return NextResponse.json({ success: true, invoiceId });
  } catch (err: any) {
    console.error('Exception in checkout API:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi server khi thanh toán.' }, { status: 500 });
  }
}
