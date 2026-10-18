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

import { POST } from '@/app/api/pos/checkout/route';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/pos/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POS Checkout API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedStaff.mockResolvedValue({ id: 'staff-1', username: 'admin', fullName: 'Quản trị viên' });
  });

  it('rejects unauthenticated requests', async () => {
    getAuthenticatedStaff.mockResolvedValue(null);
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(401);
  });

  it('validates required fields', async () => {
    // Thiếu invoiceId
    const res1 = await POST(makeRequest({ cart: [{ id: 'SP1', price: 20000, quantity: 1 }] }));
    expect(res1.status).toBe(400);

    // Giỏ hàng trống
    const res2 = await POST(makeRequest({ invoiceId: 'INV1', cart: [] }));
    expect(res2.status).toBe(400);

    // Số tiền khách trả không đủ
    const res3 = await POST(makeRequest({
      invoiceId: 'INV1',
      cart: [{ id: 'SP1', price: 20000, quantity: 1 }], // total=20k + vat 2k = 22k
      paymentForm: { paidAmount: 10000 }
    }));
    expect(res3.status).toBe(400);
    const body = await res3.json();
    expect(body.error).toContain('không đủ');
  });

  it('executes checkout and saves invoice in single server flow', async () => {
    const chain = {
      select: vi.fn(() => chain),
      insert: vi.fn(async () => ({ error: null })),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      in: vi.fn(async () => ({ error: null })),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    };
    const mockSupabase = {
      rpc: vi.fn(async () => ({ data: { success: true, invoice_id: 'INV123' }, error: null })),
      from: vi.fn(() => chain),
    };
    createAdminSupabaseClient.mockReturnValue(mockSupabase);

    const response = await POST(makeRequest({
      tableId: 'BAN01',
      tableName: 'Bàn 01',
      invoiceId: 'INV123',
      paymentForm: {
        paidAmount: 50000,
        paymentType: 'Tiền mặt',
      },
      cart: [
        { id: 'SP001', name: 'Trà sữa Oolong', price: 25000, quantity: 1 }
      ],
      linkedOrderIds: ['order-uuid-1'],
      idempotencyKey: 'pos-payment-INV123',
    }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.invoiceId).toBe('INV123');
  });

  it('handles idempotency by returning existing invoice without duplicating', async () => {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => ({ data: { IDHOADON: 'INV-EXISTING' }, error: null })),
      insert: vi.fn(),
    };
    const mockSupabase = {
      rpc: vi.fn(async () => ({ data: null, error: { message: 'function not found' } })),
      from: vi.fn(() => chain),
    };
    createAdminSupabaseClient.mockReturnValue(mockSupabase);

    const response = await POST(makeRequest({
      tableId: 'BAN01',
      tableName: 'Bàn 01',
      invoiceId: 'INV-NEW',
      paymentForm: { paidAmount: 50000 },
      cart: [{ id: 'SP001', name: 'Trà sữa', price: 25000, quantity: 1 }],
      idempotencyKey: 'pos-payment-DUPLICATE',
    }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.idempotent).toBe(true);
    expect(data.invoiceId).toBe('INV-EXISTING');
    expect(chain.insert).not.toHaveBeenCalled();
  });
});
