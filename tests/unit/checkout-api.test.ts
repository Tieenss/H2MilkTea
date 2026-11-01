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

  it('sanitizes usePOS.ts client payload and populates missing product names in details', async () => {
    const insertedInvoices: any[] = [];
    const insertedDetails: any[] = [];

    const makeTableChain = (tableName: string) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        in: vi.fn(async () => ({ error: null })),
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        update: vi.fn(() => chain),
        delete: vi.fn(() => chain),
        insert: vi.fn(async (payload: any) => {
          if (tableName === 'HOADON') insertedInvoices.push(payload);
          if (tableName === 'HOADONDETAIL') insertedDetails.push(payload);
          return { error: null };
        }),
      };
      return chain;
    };

    const mockSupabase = {
      rpc: vi.fn(async () => ({ data: null, error: { message: 'rpc disabled for fallback test' } })),
      from: vi.fn((tableName: string) => makeTableChain(tableName)),
    };
    createAdminSupabaseClient.mockReturnValue(mockSupabase);

    const usePosPayload = {
      invoice: {
        IDHD: 'HD20261101001',
        'Thời gian': '01/11/2026 13:30:00',
        'Tổng số lượng': 3,
        'Mã bàn': 'BAN02',
        'Thu ngân': 'Thu Ngân Ca Sáng',
        'Hình thức thanh toán': 'Tiền mặt',
        'Mã khách hàng': 'KH001',
        'Tên khách hàng': 'Nguyễn Văn Khách',
        'Số điện thoại': '0901234567',
        'Tổng tiền': 60000,
        'Ưu đãi': 5000,
        'Tiền khách đưa': 60000,
        'Tiền thối': 0,
        'Tiền nợ': 0,
        'Đã thanh toán': 60000,
        'Ghi chú': 'Ít ngọt',
      },
      details: [
        {
          IDHD: 'HD20261101001',
          IDSP: 'SP001',
          'Số lượng': 2,
          'Đơn giá': 20000,
          'Thành tiền': 40000,
          'Ghi chú': 'Ít đá',
        },
        {
          IDHD: 'HD20261101001',
          IDSP: 'SP002',
          'Số lượng': 1,
          'Đơn giá': 25000,
          'Thành tiền': 25000,
          'Ghi chú': '',
        },
      ],
      items: [
        { id: 'SP001', name: 'Ép dưa hấu tươi', price: 20000, quantity: 2, unit: 'Ly' },
        { id: 'SP002', price: 25000, quantity: 1 }, // thiếu name -> fallback từ DMHH.json ("Cafe đen nóng")
      ],
      totalAmount: 60000,
      tableId: 'BAN02',
      employee: 'Thu Ngân Ca Sáng',
    };

    const response = await POST(makeRequest(usePosPayload));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ success: true, invoiceId: 'HD20261101001' });

    expect(insertedInvoices).toHaveLength(1);
    const savedInvoice = insertedInvoices[0];
    // Đảm bảo các trường thừa từ client bị loại bỏ hoàn toàn
    expect(savedInvoice).not.toHaveProperty('IDHD');
    expect(savedInvoice).not.toHaveProperty('Thời gian');
    expect(savedInvoice).not.toHaveProperty('Tổng số lượng');
    expect(savedInvoice).not.toHaveProperty('Mã bàn');
    expect(savedInvoice).not.toHaveProperty('Thu ngân');
    expect(savedInvoice).not.toHaveProperty('Hình thức thanh toán');
    expect(savedInvoice).not.toHaveProperty('Tiền khách đưa');
    expect(savedInvoice).not.toHaveProperty('Tiền thối');
    expect(savedInvoice).not.toHaveProperty('Đã thanh toán');
    // Đảm bảo các cột hợp lệ của bảng HOADON được ánh xạ chính xác
    expect(savedInvoice.IDHOADON).toBe('HD20261101001');
    expect(savedInvoice.IDBAN).toBe('BAN02');
    expect(savedInvoice['Nhân viên']).toBe('Thu Ngân Ca Sáng');
    expect(savedInvoice['Khách hàng']).toBe('Nguyễn Văn Khách');
    expect(savedInvoice['Giảm giá']).toBe(5000);
    expect(savedInvoice['Khách trả']).toBe(60000);
    expect(savedInvoice['Tiền thừa']).toBe(0);

    expect(insertedDetails).toHaveLength(1);
    const savedDetails = insertedDetails[0];
    expect(savedDetails).toHaveLength(2);
    expect(savedDetails[0]['Tên sản phẩm']).toBe('Ép dưa hấu tươi');
    expect(savedDetails[0]['Đơn vị tính']).toBe('Ly');
    expect(savedDetails[0]).not.toHaveProperty('IDHD');
    expect(savedDetails[1]['Tên sản phẩm']).toBe('Cafe đen nóng');
    expect(savedDetails[1]['Đơn vị tính']).toBeTruthy();
  });

  it('guarantees HOADON table insert never contains idempotency_key column', async () => {
    const hoadonInsertCalls: any[] = [];

    const makeTableChain = (tableName: string) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        in: vi.fn(async () => ({ error: null })),
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        update: vi.fn(() => chain),
        delete: vi.fn(() => chain),
        insert: vi.fn(async (payload: any) => {
          if (tableName === 'HOADON') {
            hoadonInsertCalls.push(payload);
          }
          return { error: null };
        }),
      };
      return chain;
    };

    const mockSupabase = {
      rpc: vi.fn(async () => ({ data: null, error: { message: 'function not found' } })),
      from: vi.fn((tableName: string) => makeTableChain(tableName)),
    };
    createAdminSupabaseClient.mockReturnValue(mockSupabase);

    const response = await POST(
      makeRequest({
        tableId: 'BAN01',
        tableName: 'Bàn 01',
        invoiceId: 'INV-SELF-HEAL',
        paymentForm: { paidAmount: 25000, paymentType: 'Tiền mặt' },
        cart: [{ id: 'SP001', name: 'Ép dưa hấu', price: 25000, quantity: 1 }],
        idempotencyKey: 'pos-key-self-heal',
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.invoiceId).toBe('INV-SELF-HEAL');
    expect(hoadonInsertCalls).toHaveLength(1);
    expect(hoadonInsertCalls[0]).not.toHaveProperty('idempotency_key');
  });
});
