import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  generateTableQrToken,
  verifyTableQrToken,
  checkOrderRateLimit,
} from '@/lib/qr/token';

const { createAdminSupabaseClient } = vi.hoisted(() => ({
  createAdminSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabaseClient,
}));

import { POST as cancelOrderRoute } from '@/app/api/orders/cancel/route';
import { POST as createOrderRoute } from '@/app/api/orders/route';

function makeRequest(method: string, url: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('QR Order Lifecycle & Security (Phase 1 & 2)', () => {
  describe('HMAC Token & Rate Limiting', () => {
    it('generates and verifies valid QR tokens', () => {
      const token = generateTableQrToken('B3');
      expect(typeof token).toBe('string');

      const verified = verifyTableQrToken(token, 'B3');
      expect(verified.valid).toBe(true);

      // Fails with wrong table
      const wrongTable = verifyTableQrToken(token, 'B4');
      expect(wrongTable.valid).toBe(false);
      expect(wrongTable.reason).toContain('không khớp');

      // Fails with corrupted signature
      const tampered = token.slice(0, -4) + 'abcd';
      const tamperedCheck = verifyTableQrToken(tampered, 'B3');
      expect(tamperedCheck.valid).toBe(false);
    });

    it('rejects expired QR tokens', () => {
      // Token created 25 hours ago (beyond default 24h)
      const pastTimestamp = Date.now() - 25 * 60 * 60 * 1000;
      const expiredToken = generateTableQrToken('B3', pastTimestamp);
      const res = verifyTableQrToken(expiredToken, 'B3');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('hết hạn');
    });

    it('enforces order rate limiting per IP and Table identifier', () => {
      const testIdentifier = `192.168.1.100:TEST_TABLE_${Date.now()}`;

      // First call should pass
      const firstCheck = checkOrderRateLimit(testIdentifier);
      expect(firstCheck.allowed).toBe(true);
      expect(firstCheck.remaining).toBe(4);

      // Spam 4 more times to reach limit 5
      for (let i = 0; i < 4; i++) {
        checkOrderRateLimit(testIdentifier);
      }

      // 6th call should be blocked
      const blockedCheck = checkOrderRateLimit(testIdentifier);
      expect(blockedCheck.allowed).toBe(false);
      expect(blockedCheck.remaining).toBe(0);
    });
  });

  describe('QR Order Creation Self-Healing & Size Pricing (POST /api/orders)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('auto-falls back when expires_at column is missing (PGRST204) and prices M (+0đ) & L (+5000đ) accurately', async () => {
      const insertedOrderPayloads: Array<Record<string, unknown>> = [];
      let orderInsertAttempt = 0;

      const dsbanChain = {
        select: vi.fn(async () => ({
          data: [
            {
              IDBAN: 'B1',
              'Tên bàn': 'Bàn 1',
              'Trạng thái': 'Hoạt động',
            },
          ],
          error: null,
        })),
      };

      const dmhhChain = {
        select: vi.fn(async () => ({
          data: [
            {
              IDSP: 'SP1',
              'Tên sản phẩm': 'Hồng trà đào',
              'Đơn giá': 20000,
              'Loại sản phẩm': 'Trà trái cây',
              'Đơn vị tính': 'Ly',
              'Hình ảnh': '',
              'Trạng thái': 'Hoạt động',
            },
          ],
          error: null,
        })),
      };

      const posOrdersChain = {
        select: vi.fn(() => posOrdersChain),
        eq: vi.fn(() => posOrdersChain),
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        insert: vi.fn((payload: Record<string, unknown>) => {
          orderInsertAttempt += 1;
          insertedOrderPayloads.push(payload);
          const attempt = orderInsertAttempt;
          return {
            select: vi.fn(() => ({
              single: vi.fn(async () => {
                if (attempt === 1) {
                  return {
                    data: null,
                    error: {
                      code: 'PGRST204',
                      message: "Could not find the 'expires_at' column of 'pos_orders' in the schema cache",
                    },
                  };
                }
                return {
                  data: {
                    id: 'ord-self-healed-1',
                    tracking_token: 'tok-123',
                    order_status: 'awaiting_confirmation',
                  },
                  error: null,
                };
              }),
            })),
          };
        }),
      };

      createAdminSupabaseClient.mockReturnValue({
        from: vi.fn((tableName: string) => {
          if (tableName === 'DSBAN') return dsbanChain;
          if (tableName === 'DMHH') return dmhhChain;
          return posOrdersChain;
        }),
      });

      const res = await createOrderRoute(
        makeRequest('POST', '/api/orders', {
          source: 'QR_TABLE',
          tableId: 'B1',
          idempotencyKey: `idem-test-${Date.now()}`,
          items: [
            {
              productId: 'SP1',
              productName: 'Hồng trà đào',
              quantity: 1,
              size: 'M',
            },
            {
              productId: 'SP1',
              productName: 'Hồng trà đào',
              quantity: 1,
              size: 'L',
            },
          ],
        })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.orderId).toBe('ord-self-healed-1');
      expect(orderInsertAttempt).toBe(2);
      expect(insertedOrderPayloads[0]).toHaveProperty('expires_at');
      expect(insertedOrderPayloads[1]).not.toHaveProperty('expires_at');
      // 1 ly M (20.000đ) + 1 ly L (25.000đ) = subtotal 45.000đ, VAT 10% = 4.500đ, total = 49.500đ
      expect(insertedOrderPayloads[1].subtotal).toBe(45000);
      expect(insertedOrderPayloads[1].total_amount).toBe(49500);
    });
  });

  describe('Customer Cancel Order API (POST /api/orders/cancel)', () => {
    const validUuidToken = '11111111-2222-3333-4444-555555555555';

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('rejects requests without trackingToken or invalid token length', async () => {
      const res1 = await cancelOrderRoute(makeRequest('POST', '/api/orders/cancel', {}));
      expect(res1.status).toBe(400);

      const res2 = await cancelOrderRoute(makeRequest('POST', '/api/orders/cancel', { trackingToken: 'short' }));
      expect(res2.status).toBe(400);
    });

    it('rejects cancellation when order is not found', async () => {
      const queryChain = {
        select: vi.fn(() => queryChain),
        eq: vi.fn(() => queryChain),
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      };
      createAdminSupabaseClient.mockReturnValue({
        from: vi.fn(() => queryChain),
      });

      const res = await cancelOrderRoute(makeRequest('POST', '/api/orders/cancel', {
        trackingToken: validUuidToken,
      }));

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toContain('Không tìm thấy đơn');
    });

    it('prevents cancellation if order is already accepted or finished', async () => {
      const queryChain = {
        select: vi.fn(() => queryChain),
        eq: vi.fn(() => queryChain),
        maybeSingle: vi.fn(async () => ({
          data: {
            id: 'ord-123',
            order_status: 'accepted',
            tracking_token: validUuidToken,
            status_version: 1,
          },
          error: null,
        })),
      };
      createAdminSupabaseClient.mockReturnValue({
        from: vi.fn(() => queryChain),
      });

      const res = await cancelOrderRoute(makeRequest('POST', '/api/orders/cancel', {
        trackingToken: validUuidToken,
      }));

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('không thể hủy');
    });

    it('successfully cancels awaiting_confirmation orders', async () => {
      const queryChain = {
        select: vi.fn(() => queryChain),
        eq: vi.fn(() => queryChain),
        maybeSingle: vi.fn(async () => ({
          data: {
            id: 'ord-123',
            order_status: 'awaiting_confirmation',
            tracking_token: validUuidToken,
            status_version: 1,
            updated_at: new Date().toISOString(),
          },
          error: null,
        })),
        update: vi.fn(() => queryChain),
      };

      const channelMock = {
        subscribe: vi.fn((cb) => {
          cb('SUBSCRIBED');
          return channelMock;
        }),
        send: vi.fn(async () => {}),
      };

      createAdminSupabaseClient.mockReturnValue({
        from: vi.fn(() => queryChain),
        channel: vi.fn(() => channelMock),
        removeChannel: vi.fn(async () => {}),
      });

      const res = await cancelOrderRoute(makeRequest('POST', '/api/orders/cancel', {
        trackingToken: validUuidToken,
        reason: 'Đặt nhầm món',
      }));

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.orderStatus).toBe('cancelled_by_customer');
    });
  });
});
