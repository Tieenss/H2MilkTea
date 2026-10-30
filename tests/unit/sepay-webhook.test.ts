import { describe, expect, it, vi, beforeEach } from 'vitest';
import sepayWebhookHandler, { extractPaymentKeywords } from '@/pages/api/payment/sepay-webhook';

const { createAdminSupabaseClient } = vi.hoisted(() => ({
  createAdminSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabaseClient,
}));

describe('SePay Webhook & Auto Payment Matching (Phase 2)', () => {
  describe('extractPaymentKeywords', () => {
    it('accurately extracts invoice code from transfer content', () => {
      const res1 = extractPaymentKeywords('H2 HD1024 ck tien');
      expect(res1.matchedInvoiceCode).toBe('HD1024');

      const res2 = extractPaymentKeywords('Thanh toan INV-9988 qua sepay');
      expect(res2.matchedInvoiceCode).toBe('INV-9988');

      // Kiểm tra trường hợp khách chuyển khoản có dấu cách giữa HD và mã số
      const res3 = extractPaymentKeywords('H2 HD 1024 tra sua');
      expect(res3.matchedInvoiceCode).toBe('HD1024');

      const res4 = extractPaymentKeywords('INV 5678 ck');
      expect(res4.matchedInvoiceCode).toBe('INV5678');
    });

    it('accurately extracts and normalizes table ID from transfer content', () => {
      const res1 = extractPaymentKeywords('H2 BAN01 thanh toan tra sua');
      expect(res1.matchedTableId).toBe('BAN01');

      const res2 = extractPaymentKeywords('Chuyen tien BAN 3');
      expect(res2.matchedTableId).toBe('BAN03');

      const res3 = extractPaymentKeywords('Ban 12 tra tien');
      expect(res3.matchedTableId).toBe('BAN12');
    });

    it('handles generic non-matching content safely', () => {
      const res = extractPaymentKeywords('Chuyen tien an trua ban oi');
      expect(res.matchedInvoiceCode).toBeNull();
    });
  });

  describe('sepayWebhookHandler', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      delete process.env.SEPAY_API_KEY;
    });

    it('rejects non-POST requests with 405', async () => {
      const req: any = { method: 'GET' };
      let statusCode = 0;
      const res: any = {
        setHeader: vi.fn(),
        status: vi.fn((code: number) => {
          statusCode = code;
          return { json: vi.fn() };
        }),
      };

      await sepayWebhookHandler(req, res);
      expect(statusCode).toBe(405);
    });

    it('enforces SEPAY_API_KEY authentication when env is set', async () => {
      process.env.SEPAY_API_KEY = 'test_secret_key_123';
      const req: any = {
        method: 'POST',
        headers: { authorization: 'Apikey wrong_key' },
        body: {},
      };
      let statusCode = 0;
      const res: any = {
        status: vi.fn((code: number) => {
          statusCode = code;
          return { json: vi.fn() };
        }),
      };

      await sepayWebhookHandler(req, res);
      expect(statusCode).toBe(401);
    });

    it('processes valid incoming transfer and broadcasts to POS', async () => {
      const broadcastMock = vi.fn(async () => ({}));
      const chain = {
        select: vi.fn(() => chain),
        or: vi.fn(() => chain),
        limit: vi.fn(async () => ({ data: [{ IDHOADON: 'HD1024', IDBAN: 'BAN01', 'Tổng tiền': 85000 }], error: null })),
        update: vi.fn(() => chain),
        delete: vi.fn(() => chain),
        eq: vi.fn(() => chain),
      };

      const mockSupabase = {
        from: vi.fn(() => chain),
        channel: vi.fn(() => ({
          send: broadcastMock,
        })),
      };
      createAdminSupabaseClient.mockReturnValue(mockSupabase);

      const req: any = {
        method: 'POST',
        headers: {},
        body: {
          id: 99999,
          gateway: 'MBBank',
          accountNumber: '0901234567',
          content: 'H2 BAN01 HD1024',
          transferType: 'in',
          transferAmount: 85000,
        },
      };

      let jsonResult: any = null;
      let statusCode = 0;
      const res: any = {
        status: vi.fn((code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              jsonResult = data;
            },
          };
        }),
      };

      await sepayWebhookHandler(req, res);

      expect(statusCode).toBe(200);
      expect(jsonResult.success).toBe(true);
      expect(jsonResult.matchedTableId).toBe('BAN01');
      expect(jsonResult.matchedInvoiceId).toBe('HD1024');
      expect(broadcastMock).toHaveBeenCalledTimes(1);
    });

    it('enforces idempotency: ignores duplicate webhook replay for already processed transaction', async () => {
      const broadcastMock = vi.fn(async () => ({}));
      const chain = {
        select: vi.fn(() => chain),
        or: vi.fn(() => chain),
        limit: vi.fn(async () => ({ data: [{ IDHOADON: 'HD1025', IDBAN: 'BAN02', 'Tổng tiền': 50000 }], error: null })),
        update: vi.fn(() => chain),
        delete: vi.fn(() => chain),
        eq: vi.fn(() => chain),
      };

      const mockSupabase = {
        from: vi.fn(() => chain),
        channel: vi.fn(() => ({ send: broadcastMock })),
      };
      createAdminSupabaseClient.mockReturnValue(mockSupabase);

      const req: any = {
        method: 'POST',
        headers: {},
        body: {
          id: 88888,
          gateway: 'Vietcombank',
          accountNumber: '1234567890',
          content: 'H2 BAN02 HD1025',
          transferType: 'in',
          transferAmount: 50000,
        },
      };

      let json1: any = null;
      const res1: any = {
        status: vi.fn(() => ({ json: (d: any) => { json1 = d; } })),
      };

      // Lần gọi 1: Xử lý bình thường
      await sepayWebhookHandler(req, res1);
      expect(json1.success).toBe(true);
      expect(json1.isDuplicate).toBeUndefined();
      expect(broadcastMock).toHaveBeenCalledTimes(1);

      // Lần gọi 2 (Duplicate replay với cùng transaction id: 88888)
      let json2: any = null;
      let statusCode2 = 0;
      const res2: any = {
        status: vi.fn((code: number) => {
          statusCode2 = code;
          return { json: (d: any) => { json2 = d; } };
        }),
      };

      await sepayWebhookHandler(req, res2);
      expect(statusCode2).toBe(200);
      expect(json2.success).toBe(true);
      expect(json2.isDuplicate).toBe(true);
      // Không broadcast thêm lần nào nữa
      expect(broadcastMock).toHaveBeenCalledTimes(1);
    });

    it('enforces idempotency: returns 200 without overwriting if invoice is already Đã thanh toán in DB', async () => {
      const updateMock = vi.fn();
      const chain = {
        select: vi.fn(() => chain),
        or: vi.fn(() => chain),
        limit: vi.fn(async () => ({
          data: [{ IDHOADON: 'HD1026', IDBAN: 'BAN03', 'Tổng tiền': 60000, 'Trạng thái': 'Đã thanh toán' }],
          error: null
        })),
        update: updateMock,
        delete: vi.fn(() => chain),
        eq: vi.fn(() => chain),
      };

      const mockSupabase = {
        from: vi.fn(() => chain),
        channel: vi.fn(() => ({ send: vi.fn() })),
      };
      createAdminSupabaseClient.mockReturnValue(mockSupabase);

      const req: any = {
        method: 'POST',
        headers: {},
        body: {
          id: 77777,
          gateway: 'Techcombank',
          content: 'H2 HD1026',
          transferType: 'in',
          transferAmount: 60000,
        },
      };

      let jsonResult: any = null;
      const res: any = {
        status: vi.fn(() => ({ json: (d: any) => { jsonResult = d; } })),
      };

      await sepayWebhookHandler(req, res);
      expect(jsonResult.success).toBe(true);
      expect(jsonResult.isDuplicate).toBe(true);
      expect(jsonResult.message).toContain('đã được thanh toán trước đó');
      // Không ghi đè cập nhật hóa đơn
      expect(updateMock).not.toHaveBeenCalled();
    });
  });
});
