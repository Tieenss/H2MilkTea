import { describe, it, expect, vi, beforeEach } from 'vitest';
import { canProductHaveSize } from '@/app/order/components/DrinkGachaCSGO';
import { GET as getTableCartRoute } from '@/app/api/customer-order/table-cart/route';
import { POST as cancelOrderRoute } from '@/app/api/orders/cancel/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabaseClient: vi.fn(),
}));

import { createAdminSupabaseClient } from '@/lib/supabase/server';

function makeRequest(method: string, url: string, body?: any) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Patch 0.2210: Order Sync, Gacha 60FPS & Cancellation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. canProductHaveSize', () => {
    it('returns false for snacks, food and non-drink items', () => {
      expect(canProductHaveSize({ 'Tên sản phẩm': 'Hướng dương vị dừa', 'Loại sản phẩm': 'Đồ ăn', 'Đơn vị tính': 'Gói' } as any)).toBe(false);
      expect(canProductHaveSize({ 'Tên sản phẩm': 'Chân gà sả tắc', 'Loại sản phẩm': 'Món ăn vặt', 'Đơn vị tính': 'Dĩa' } as any)).toBe(false);
      expect(canProductHaveSize({ 'Tên sản phẩm': 'Khô gà lá chanh', 'Loại sản phẩm': 'Đồ ăn', 'Đơn vị tính': 'Hũ' } as any)).toBe(false);
      expect(canProductHaveSize({ 'Tên sản phẩm': 'Bánh Tiramisu', 'Loại sản phẩm': 'Bánh', 'Đơn vị tính': 'Cái' } as any)).toBe(false);
    });

    it('returns true for drinks (Coffee, Milk Tea, Fruit Tea)', () => {
      expect(canProductHaveSize({ 'Tên sản phẩm': 'Trà sữa trân châu hoàng kim', 'Loại sản phẩm': 'Trà sữa', 'Đơn vị tính': 'Ly' } as any)).toBe(true);
      expect(canProductHaveSize({ 'Tên sản phẩm': 'Cafe sữa đá', 'Loại sản phẩm': 'Cà phê', 'Đơn vị tính': 'Ly' } as any)).toBe(true);
      expect(canProductHaveSize({ 'Tên sản phẩm': 'Trà đào cam sả', 'Loại sản phẩm': 'Trà trái cây', 'Đơn vị tính': 'Ly' } as any)).toBe(true);
    });
  });

  describe('2. Table Cart API (GET /api/customer-order/table-cart)', () => {
    it('returns 400 when tableId is missing', async () => {
      const res = await getTableCartRoute(makeRequest('GET', '/api/customer-order/table-cart'));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('returns live draft and active order for the specified table', async () => {
      const mockQueryDraft = {
        select: vi.fn(() => mockQueryDraft),
        eq: vi.fn(() => mockQueryDraft),
        maybeSingle: vi.fn(async () => ({
          data: {
            table_id: 'BAN04',
            cart: [{ productId: 'sp-1', quantity: 2, productName: 'Trà đào' }],
            version: 1,
          },
          error: null,
        })),
      };

      const mockQueryOrder = {
        select: vi.fn(() => mockQueryOrder),
        eq: vi.fn(() => mockQueryOrder),
        in: vi.fn(() => mockQueryOrder),
        order: vi.fn(() => mockQueryOrder),
        limit: vi.fn(() => mockQueryOrder),
        maybeSingle: vi.fn(async () => ({
          data: {
            id: 'ord-999',
            tracking_token: '12345678-1234-1234-1234-123456789abc',
            order_status: 'accepted',
            total_amount: 60000,
            items: [{ productId: 'sp-1', quantity: 2 }],
          },
          error: null,
        })),
      };

      (createAdminSupabaseClient as any).mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'pos_cart_drafts') return mockQueryDraft;
          return mockQueryOrder;
        }),
      });

      const res = await getTableCartRoute(makeRequest('GET', '/api/customer-order/table-cart?tableId=BAN04'));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.tableId).toBe('BAN04');
      expect(json.liveCart.itemCount).toBe(2);
      expect(json.activeOrder.id).toBe('ord-999');
    });
  });

  describe('3. Customer Cancellation Request Flow (POST /api/orders/cancel)', () => {
    it('allows customer to request cancellation when order is accepted and kitchen is queued', async () => {
      const validToken = '12345678-1234-1234-1234-123456789abc';
      const mockQuery = {
        select: vi.fn(() => mockQuery),
        eq: vi.fn(() => mockQuery),
        maybeSingle: vi.fn(async () => ({
          data: {
            id: 'ord-123',
            order_status: 'accepted',
            kitchen_status: 'queued',
            tracking_token: validToken,
            status_version: 2,
            table_name: 'Bàn 4',
          },
          error: null,
        })),
        update: vi.fn(() => mockQuery),
      };

      const mockChannel = {
        subscribe: vi.fn((cb) => { cb('SUBSCRIBED'); return mockChannel; }),
        send: vi.fn(async () => {}),
      };

      (createAdminSupabaseClient as any).mockReturnValue({
        from: vi.fn(() => mockQuery),
        channel: vi.fn(() => mockChannel),
        removeChannel: vi.fn(async () => {}),
      });

      const res = await cancelOrderRoute(makeRequest('POST', '/api/orders/cancel', {
        trackingToken: validToken,
        reason: 'Muốn đổi đồ uống',
        requestCancellation: true,
      }));

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.cancellationPending).toBe(true);
      expect(json.orderStatus).toBe('accepted');
    });
  });

  describe('4. Table Service Call API (POST /api/customer-order/service-call)', () => {
    it('successfully broadcasts service call to POS staff', async () => {
      const { POST: serviceCallRoute } = await import('@/app/api/customer-order/service-call/route');
      const mockChannel = {
        subscribe: vi.fn((cb) => { cb('SUBSCRIBED'); return mockChannel; }),
        send: vi.fn(async () => {}),
      };

      (createAdminSupabaseClient as any).mockReturnValue({
        channel: vi.fn(() => mockChannel),
        removeChannel: vi.fn(async () => {}),
      });

      const res = await serviceCallRoute(makeRequest('POST', '/api/customer-order/service-call', {
        tableId: 'BAN04',
        tableName: 'Bàn 4 (Tầng 1)',
        requestType: 'Thêm đá',
      }));

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain('Thêm đá');
    });
  });
});
