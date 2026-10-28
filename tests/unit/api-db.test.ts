import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabaseClient: vi.fn(() => mockSupabase),
}));

import { GET, POST } from '@/app/api/db/route';

describe('Cloud Database API Route (/api/db)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/db?table=HOADON fetches invoices from Supabase Admin without RLS blocking', async () => {
    const mockData = [{ IDHOADON: 'INV123', 'Tổng tiền': 50000 }];
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const req = new NextRequest('http://localhost:3000/api/db?table=HOADON');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockData);
    expect(mockFrom).toHaveBeenCalledWith('HOADON');
  });

  it('GET /api/db?table=invalid rejects unauthorized table names', async () => {
    const req = new NextRequest('http://localhost:3000/api/db?table=non_existent_table');
    const res = await GET(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('POST /api/db successfully inserts with schema sanitization and numeric casting', async () => {
    const mockInsertSelect = vi.fn().mockResolvedValue({
      data: [{ IDHOADON: 'INV_NEW_1', 'Tổng tiền': 45000 }],
      error: null,
    });
    const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const insertPayload = {
      table: 'HOADON',
      action: 'create',
      data: {
        IDHOADON: 'INV_NEW_1',
        IDBAN: 'BAN001',
        'Bàn': 'Bàn 01 (extra field that must be stripped)',
        'Nhân viên': 'Admin',
        'Khách hàng': 'Khách Test',
        'Ngày': '10/28/2026',
        'Tổng tiền': '45000', // Must be converted to number
        'VAT': '4500',        // Must be converted to number
        'Giảm giá': 0,
        'Khách trả': 50000,
        'Tiền thừa': 500,
        'Ghi chú': 'Test',
        'Trạng thái': 'Đã thanh toán',
        'Loại thanh toán': 'Tiền mặt'
      }
    };

    const req = new NextRequest('http://localhost:3000/api/db', {
      method: 'POST',
      body: JSON.stringify(insertPayload)
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Verify sanitization: 'Bàn' was stripped, 'Tổng tiền' became number 45000, 'VAT' became number 4500
    const insertedRecord = mockInsert.mock.calls[0][0][0];
    expect(insertedRecord).not.toHaveProperty('Bàn');
    expect(insertedRecord['Tổng tiền']).toBe(45000);
    expect(insertedRecord['VAT']).toBe(4500);
    expect(insertedRecord.IDBAN).toBe('BAN001');
  });

  it('POST /api/db successfully updates existing record', async () => {
    const mockEq = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ IDHOADON: 'INV_1' }], error: null }),
    });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const updatePayload = {
      table: 'HOADON',
      action: 'update',
      data: {
        IDHOADON: 'INV_1',
        'Trạng thái': 'Đã hủy'
      }
    };

    const req = new NextRequest('http://localhost:3000/api/db', {
      method: 'POST',
      body: JSON.stringify(updatePayload)
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('IDHOADON', 'INV_1');
  });

  it('POST /api/db successfully cascades delete to HOADONDETAIL when deleting HOADON', async () => {
    const mockDeleteDetailEq = vi.fn().mockResolvedValue({ error: null });
    const mockDeleteInvoiceEq = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((tableName: string) => {
      if (tableName === 'HOADONDETAIL') {
        return { delete: vi.fn().mockReturnValue({ eq: mockDeleteDetailEq }) };
      }
      return { delete: vi.fn().mockReturnValue({ eq: mockDeleteInvoiceEq }) };
    });

    const deletePayload = {
      table: 'HOADON',
      action: 'delete',
      data: {
        IDHOADON: 'INV_TO_DELETE'
      }
    };

    const req = new NextRequest('http://localhost:3000/api/db', {
      method: 'POST',
      body: JSON.stringify(deletePayload)
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Verify both HOADONDETAIL and HOADON were deleted
    expect(mockFrom).toHaveBeenCalledWith('HOADONDETAIL');
    expect(mockDeleteDetailEq).toHaveBeenCalledWith('IDHOADON', 'INV_TO_DELETE');
    expect(mockFrom).toHaveBeenCalledWith('HOADON');
    expect(mockDeleteInvoiceEq).toHaveBeenCalledWith('IDHOADON', 'INV_TO_DELETE');
  });
});
