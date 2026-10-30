import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { getAuthenticatedStaff, createAdminSupabaseClient } = vi.hoisted(() => ({
  getAuthenticatedStaff: vi.fn(),
  createAdminSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  getAuthenticatedStaff,
  createAdminSupabaseClient,
}));

import { POST as checkoutPOST } from '@/app/api/pos/checkout/route';
import kitchenOrdersHandler from '@/pages/api/kitchen/orders';
import kitchenClearStaleHandler from '@/pages/api/kitchen/clear-stale';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/pos/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Kitchen Cleanup & Checkout Logic Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedStaff.mockResolvedValue({ id: 'staff-1', username: 'admin', fullName: 'Quản trị viên' });
  });

  it('1. Đảm bảo checkout không chèn idempotency_key vào HOADON và cập nhật kitchen_status: served', async () => {
    let insertedHoadon: any = null;
    let updatedOrdersPayload: any = null;

    const chain = {
      select: vi.fn(() => chain),
      insert: vi.fn(async (payload) => {
        return { error: null };
      }),
      update: vi.fn((payload) => {
        updatedOrdersPayload = payload;
        return chain;
      }),
      delete: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      neq: vi.fn(() => chain),
      in: vi.fn(async () => ({ error: null })),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    };
    const mockSupabase = {
      rpc: vi.fn(async () => ({ data: null, error: { message: 'function not found' } })),
      from: vi.fn((table: string) => {
        if (table === 'HOADON') {
          return {
            ...chain,
            insert: vi.fn(async (payload) => {
              insertedHoadon = payload;
              return { error: null };
            }),
          };
        }
        return chain;
      }),
    };
    createAdminSupabaseClient.mockReturnValue(mockSupabase);

    const response = await checkoutPOST(makeRequest({
      tableId: 'BAN01',
      tableName: 'Bàn 01',
      invoiceId: 'INV-TEST-CLEANUP',
      paymentForm: { paidAmount: 50000, paymentType: 'Tiền mặt' },
      cart: [{ id: 'SP001', name: 'Ép dưa hấu', price: 20000, quantity: 2 }],
      linkedOrderIds: ['order-uuid-999'],
      idempotencyKey: 'pos-key-idemp',
    }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    // Bảng HOADON tuyệt đối không được chứa cột idempotency_key
    expect(insertedHoadon).not.toHaveProperty('idempotency_key');
    expect(insertedHoadon.IDHOADON).toBe('INV-TEST-CLEANUP');
    expect(insertedHoadon.IDBAN).toBe('BAN01');

    // pos_orders bắt buộc phải được cập nhật kitchen_status: 'served' để tự động dọn bếp
    expect(updatedOrdersPayload).toMatchObject({
      kitchen_status: 'served',
      order_status: 'completed',
      payment_status: 'paid',
    });
  });

  it('2. Đảm bảo API /api/kitchen/orders chỉ lấy đơn accepted chưa served, chưa paid và trong vòng 16h', async () => {
    const mockOrders = [
      {
        id: 'ord-1',
        source: 'POS_COUNTER',
        table_id: 'BAN01',
        table_name: 'Bàn 01',
        employee: 'Thu ngân',
        items: [{ productId: 'SP001', productName: 'Trà sữa', quantity: 1 }],
        notes: '',
        kitchen_status: 'queued',
        payment_status: 'unpaid',
        order_status: 'accepted',
        created_at: new Date().toISOString(),
        tracking_token: 'tok-1',
      }
    ];

    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn((col, val) => {
        expect(col).toBe('order_status');
        expect(val).toBe('accepted');
        return chain;
      }),
      neq: vi.fn((col, val) => {
        if (col === 'kitchen_status') expect(val).toBe('served');
        if (col === 'payment_status') expect(val).toBe('paid');
        return chain;
      }),
      gte: vi.fn((col, val) => {
        expect(col).toBe('created_at');
        expect(typeof val).toBe('string');
        return chain;
      }),
      order: vi.fn(async () => ({ data: mockOrders, error: null })),
    };

    const mockSupabase = {
      from: vi.fn((table) => {
        expect(table).toBe('pos_orders');
        return chain;
      }),
    };
    createAdminSupabaseClient.mockReturnValue(mockSupabase);

    const req: any = {
      method: 'GET',
      headers: { cookie: 'staffUser={"role":"Admin"}' },
    };
    let jsonResult: any = null;
    let statusCode: number = 0;
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

    await kitchenOrdersHandler(req, res);

    expect(statusCode).toBe(200);
    expect(jsonResult.success).toBe(true);
    expect(jsonResult.orders).toHaveLength(1);
    expect(jsonResult.orders[0].id).toBe('ord-1');
    expect(jsonResult.orders[0].status).toBe('pending');
  });

  it('3. Đảm bảo API /api/kitchen/clear-stale cập nhật toàn bộ đơn tồn đọng sang served', async () => {
    let updatePayload: any = null;
    const chain = {
      update: vi.fn((payload) => {
        updatePayload = payload;
        return chain;
      }),
      neq: vi.fn((col, val) => {
        expect(col).toBe('kitchen_status');
        expect(val).toBe('served');
        return chain;
      }),
      select: vi.fn(async () => ({ data: [{ id: 'order-old-1' }, { id: 'order-old-2' }], error: null })),
    };

    const mockSupabase = {
      from: vi.fn((table) => {
        expect(table).toBe('pos_orders');
        return chain;
      }),
    };
    createAdminSupabaseClient.mockReturnValue(mockSupabase);

    const req: any = {
      method: 'POST',
      headers: { cookie: 'staffUser={"role":"Admin"}' },
    };
    let jsonResult: any = null;
    let statusCode: number = 0;
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

    await kitchenClearStaleHandler(req, res);

    expect(statusCode).toBe(200);
    expect(jsonResult.success).toBe(true);
    expect(jsonResult.clearedCount).toBe(2);
    expect(updatePayload).toMatchObject({
      kitchen_status: 'served',
    });
  });
});
