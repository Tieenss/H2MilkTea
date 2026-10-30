import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export interface SePayWebhookBody {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  code?: string | null;
  content?: string;
  transferType?: 'in' | 'out';
  transferAmount?: number;
  accumulated?: number;
  subAccount?: string | null;
  referenceCode?: string;
  description?: string;
}

export function extractPaymentKeywords(content: string = '') {
  const normalized = content.toUpperCase();

  // 1. Tìm mã hóa đơn (ví dụ: H2 HD1024, HD1024, INV-1234, H2-INV1024)
  const invoiceMatch = normalized.match(/(?:H2[_\s-]?)?((?:HD|INV)[-_]?[A-Z0-9]+)/i);
  const matchedInvoiceCode = invoiceMatch ? invoiceMatch[1].replace(/\s+/g, '') : null;

  // 2. Tìm mã bàn (ví dụ: BAN01, BAN 01, BÀN 01, BAN-1)
  const tableMatch = normalized.match(/(?:BAN|BÀN)[_\s-]?0*([1-9][0-9]?)/i);
  let matchedTableId: string | null = null;
  if (tableMatch) {
    const tableNum = parseInt(tableMatch[1], 10);
    matchedTableId = `BAN${String(tableNum).padStart(2, '0')}`;
  }

  return { matchedInvoiceCode, matchedTableId };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  // 1. Xác thực API Key từ SePay (nếu cấu hình SEPAY_API_KEY trong biến môi trường)
  const expectedApiKey = process.env.SEPAY_API_KEY;
  if (expectedApiKey) {
    const authHeader = req.headers.authorization || '';
    const isAuthorized =
      authHeader === `Apikey ${expectedApiKey}` ||
      authHeader === `Bearer ${expectedApiKey}` ||
      authHeader.includes(expectedApiKey);

    if (!isAuthorized) {
      console.warn('[SePay Webhook] Unauthorized request received with header:', authHeader);
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid SePay API Key' });
    }
  }

  const payload: SePayWebhookBody = req.body || {};

  // 2. Chỉ xử lý giao dịch tiền vào (transferType === 'in')
  if (payload.transferType && payload.transferType !== 'in') {
    return res.status(200).json({ success: true, message: 'Bỏ qua giao dịch tiền ra (outgoing transfer).' });
  }

  const transferAmount = Number(payload.transferAmount || 0);
  const content = String(payload.content || '');

  // 3. Phân tích nội dung chuyển khoản để nhận diện Hóa đơn hoặc Bàn
  const { matchedInvoiceCode, matchedTableId } = extractPaymentKeywords(content);

  const supabase = createAdminSupabaseClient();
  let updatedInvoiceId: string | null = null;
  let resolvedTableId: string | null = matchedTableId;

  if (supabase) {
    try {
      // 4.1 Nếu tìm thấy mã hóa đơn trong nội dung chuyển khoản
      if (matchedInvoiceCode) {
        // Tìm hóa đơn khớp chính xác hoặc khớp chuỗi
        const { data: invoices } = await supabase
          .from('HOADON')
          .select('IDHOADON, IDBAN, "Tổng tiền", "Trạng thái"')
          .or(`IDHOADON.eq.${matchedInvoiceCode},IDHOADON.ilike.%${matchedInvoiceCode}%`)
          .limit(1);

        if (invoices && invoices.length > 0) {
          const inv = invoices[0];
          updatedInvoiceId = inv.IDHOADON;
          resolvedTableId = resolvedTableId || inv.IDBAN;

          // Cập nhật trạng thái hóa đơn sang Đã thanh toán
          await supabase
            .from('HOADON')
            .update({
              'Trạng thái': 'Đã thanh toán',
              'Loại thanh toán': 'Chuyển khoản SePay',
              'Khách trả': transferAmount,
              'Tiền thừa': Math.max(0, transferAmount - Number(inv['Tổng tiền'] || 0)),
              'Ghi chú': `Thanh toán tự động qua SePay GD #${payload.id || 'N/A'} lúc ${new Date().toLocaleString('vi-VN')}`,
            })
            .eq('IDHOADON', inv.IDHOADON);
        }
      }

      // 4.2 Nếu có mã bàn (từ nội dung hoặc từ hóa đơn vừa tìm thấy)
      if (resolvedTableId && resolvedTableId !== 'Khách mua về') {
        // Cập nhật trạng thái bàn về 'Trống'
        await supabase
          .from('DSBAN')
          .update({ 'Trạng thái': 'Trống' })
          .eq('IDBAN', resolvedTableId);

        // Xóa giỏ draft của bàn
        await supabase
          .from('pos_cart_drafts')
          .delete()
          .eq('table_id', resolvedTableId);

        // Hoàn tất và dọn dẹp các đơn bếp của bàn đó
        await supabase
          .from('pos_orders')
          .update({
            payment_status: 'paid',
            order_status: 'completed',
            kitchen_status: 'served',
            payment_method: 'Chuyển khoản SePay',
            updated_at: new Date().toISOString(),
          })
          .eq('table_id', resolvedTableId);
      }

      // 5. Gửi Realtime Broadcast tới toàn bộ màn hình POS đang mở
      try {
        const channel = supabase.channel('pos-all-cart-drafts-global');
        await channel.send({
          type: 'broadcast',
          event: 'sepay_payment_received',
          payload: {
            transactionId: payload.id,
            gateway: payload.gateway,
            accountNumber: payload.accountNumber,
            amount: transferAmount,
            content,
            matchedTableId: resolvedTableId,
            matchedInvoiceId: updatedInvoiceId,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (broadcastErr) {
        console.warn('[SePay Webhook] Broadcast error:', broadcastErr);
      }
    } catch (dbErr) {
      console.error('[SePay Webhook] Database processing error:', dbErr);
    }
  }

  return res.status(200).json({
    success: true,
    message: 'SePay Webhook đã xử lý thành công giao dịch.',
    transactionId: payload.id,
    amount: transferAmount,
    matchedTableId: resolvedTableId,
    matchedInvoiceId: updatedInvoiceId,
  });
}
