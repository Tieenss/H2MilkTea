import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';
import { tinhTienDonHang } from '@/lib/cart/pricing';

interface CheckoutBody {
  tableId: string;
  tableName: string;
  invoiceId: string;
  paymentForm: {
    customer?: string;
    discount?: number;
    paidAmount?: number;
    note?: string;
    paymentType?: string;
  };
  cart: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    unit?: string;
    note?: string;
  }>;
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
    const { tableId, tableName, invoiceId, paymentForm, cart, idempotencyKey } = body;
    const rawLinked = body.linkedOrderIds || (body as any).orderIds;
    const linkedOrderIds: string[] = Array.isArray(rawLinked) ? rawLinked : [];

    if (!invoiceId?.trim()) {
      return NextResponse.json({ success: false, error: 'Thiếu mã hóa đơn.' }, { status: 400 });
    }
    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ success: false, error: 'Giỏ hàng trống.' }, { status: 400 });
    }

    const customer = paymentForm?.customer || 'Khách lẻ';
    const discount = Number(paymentForm?.discount) || 0;
    const paidAmount = Number(paymentForm?.paidAmount) || 0;
    const note = paymentForm?.note || '';
    const paymentType = paymentForm?.paymentType || 'Tiền mặt';

    const pricing = tinhTienDonHang({
      cart,
      discount,
      vatPercent: 10,
      paidAmount,
    });

    if (!pricing.isValid) {
      return NextResponse.json({ success: false, error: pricing.errorMessage || 'Dữ liệu tính tiền không hợp lệ.' }, { status: 400 });
    }

    const { subtotal: total, vatAmount: vat, finalAmount, change } = pricing;

    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Dịch vụ dữ liệu chưa sẵn sàng.' }, { status: 503 });
    }


    // Chuẩn bị payload chuẩn cho RPC và DB
    const invoiceRecord = {
      IDHOADON: invoiceId,
      IDBAN: tableId || '',
      "Ngày": formatDate(new Date()),
      "Nhân viên": (staff as any).fullName || (staff as any).username || staff.user_metadata?.full_name || staff.email || 'Nhân viên',
      "Khách hàng": customer,
      "Tổng tiền": total,
      "VAT": vat,
      "Giảm giá": discount,
      "Khách trả": paidAmount,
      "Tiền thừa": change,
      "Ghi chú": note,
      "Trạng thái": "Đã thanh toán",
      "Trạng thái sự dụng bàn": tableName === 'Khách mua về' ? 'Mang về' : 'Đã trả bàn',
      "Loại thanh toán": paymentType,
      "Hóa đơn chi tiết": cart.map(item => `${invoiceId}_${item.id}`).join(' , '),
      idempotency_key: idempotencyKey || null,
    };

    const detailsRecords = cart.map(item => ({
      IDHOADONDETAIL: `${invoiceId}_${item.id}`,
      IDHOADON: invoiceId,
      IDSP: item.id,
      "Tên sản phẩm": item.name || '',
      "Đơn vị tính": item.unit || 'Cái',
      "Đơn giá": Number(item.price) || 0,
      "Số lượng": Number(item.quantity) || 1,
      "Thành tiền": Number(item.price) * Number(item.quantity),
      "Ghi chú": item.note || '',
    }));

    // 1. Thử gọi RPC pos_pay_order trong Postgres
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
      // Nếu lỗi duplicate key trên idempotency_key do request đồng thời
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

    // 2.6 Đồng bộ đơn bếp pos_orders sang 'paid'
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
      // Tự động tìm và hoàn tất tất cả đơn QR đang active của bàn này
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
