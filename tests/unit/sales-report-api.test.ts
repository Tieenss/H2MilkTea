import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reports/sales/route';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabaseClient: vi.fn(),
  getAuthenticatedStaff: vi.fn(),
}));

describe('Sales Report Server-Side Aggregation API (GET /api/reports/sales)', () => {
  const mockInvoices = [
    {
      IDHOADON: 'HD001',
      Ngày: '10/15/2026 10:00:00',
      'Tổng tiền': 100000,
      'Trạng thái': 'Đã thanh toán',
      'Loại thanh toán': 'Tiền mặt',
      created_at: '2026-10-15T10:00:00.000Z',
    },
    {
      IDHOADON: 'HD002',
      Ngày: '10/16/2026 14:30:00',
      'Tổng tiền': 200000,
      'Trạng thái': 'Đã thanh toán',
      'Loại thanh toán': 'Chuyển khoản',
      created_at: '2026-10-16T14:30:00.000Z',
    },
    {
      IDHOADON: 'HD_CANCEL',
      Ngày: '10/16/2026 16:00:00',
      'Tổng tiền': 50000,
      'Trạng thái': 'Đã hủy', // Không được tính
      'Loại thanh toán': 'Tiền mặt',
      created_at: '2026-10-16T16:00:00.000Z',
    },
  ];

  const mockDetails = [
    {
      IDHOADONDETAIL: 'HD001_SP1',
      IDHOADON: 'HD001',
      IDSP: 'SP1',
      'Tên sản phẩm': 'Trà sữa trân châu',
      'Số lượng': 2,
      'Thành tiền': 100000,
    },
    {
      IDHOADONDETAIL: 'HD002_SP2',
      IDHOADON: 'HD002',
      IDSP: 'SP2',
      'Tên sản phẩm': 'Trà đào cam sả',
      'Số lượng': 4,
      'Thành tiền': 200000,
    },
  ];

  const mockProducts = [
    { IDSP: 'SP1', 'Tên sản phẩm': 'Trà sữa trân châu', 'Loại sản phẩm': 'Trà sữa' },
    { IDSP: 'SP2', 'Tên sản phẩm': 'Trà đào cam sả', 'Loại sản phẩm': 'Trà trái cây' },
  ];

  it('tổng hợp chính xác doanh thu, số đơn, và cơ cấu danh mục theo khoảng thời gian', async () => {
    (createAdminSupabaseClient as any).mockReturnValue({
      from: vi.fn((tableName: string) => {
        if (tableName === 'HOADON') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockInvoices,
                error: null,
              }),
            }),
          };
        }
        if (tableName === 'HOADONDETAIL') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: mockDetails,
                error: null,
              }),
            }),
          };
        }
        if (tableName === 'DMHH') {
          return {
            select: vi.fn().mockResolvedValue({
              data: mockProducts,
              error: null,
            }),
          };
        }
        return {};
      }),
    });

    const req = new NextRequest(
      'http://localhost/api/reports/sales?from=2026-10-01T00:00:00.000Z&to=2026-10-31T23:59:59.000Z'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.current.revenue).toBe(300000);
    expect(json.data.current.orders).toBe(2);
    expect(json.data.current.averageOrderValue).toBe(150000);
    expect(json.data.current.categories.length).toBe(2);
    expect(json.data.current.paymentMethods.length).toBe(2);
  });
});
