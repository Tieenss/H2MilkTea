import { describe, it, expect, vi } from 'vitest';
import { calculateBomDeductions, recordInventoryExport } from '@/lib/inventory/bomDeduction';

describe('BOM Inventory Deduction Unit Tests', () => {
  const mockMaterials = [
    {
      IDNguyenLieu: 'NVL001',
      'Tên nguyên liệu': 'Trà đen (Hồng trà)',
      'Đơn vị tính': 'Kg',
    },
    {
      IDNguyenLieu: 'NVL002',
      'Tên nguyên liệu': 'Sữa đặc có đường',
      'Đơn vị tính': 'Lon',
    },
    {
      IDNguyenLieu: 'NVL003',
      'Tên nguyên liệu': 'Trân châu đen',
      'Đơn vị tính': 'Kg',
    },
  ];

  const mockRecipes = [
    {
      IDCauHinh: 'CFG001',
      IDSP: 'SP_MILKTEA',
      IDNguyenLieu: 'NVL001',
      'Số lượng cần': 0.015,
      'Số lượng quy đổi': 0.015,
      'Đơn vị sử dụng': 'Kg',
      'Trạng thái': 'Hoạt động',
    },
    {
      IDCauHinh: 'CFG002',
      IDSP: 'SP_MILKTEA',
      IDNguyenLieu: 'NVL002',
      'Số lượng cần': 0.05,
      'Số lượng quy đổi': 0.05,
      'Đơn vị sử dụng': 'Lon',
      'Trạng thái': 'Hoạt động',
    },
    {
      IDCauHinh: 'CFG003',
      IDSP: 'SP_PEARL_TEA',
      IDNguyenLieu: 'NVL001',
      'Số lượng cần': 0.015,
      'Số lượng quy đổi': 0.015,
      'Đơn vị sử dụng': 'Kg',
      'Trạng thái': 'Hoạt động',
    },
    {
      IDCauHinh: 'CFG004',
      IDSP: 'SP_PEARL_TEA',
      IDNguyenLieu: 'NVL003',
      'Số lượng cần': 0.04,
      'Số lượng quy đổi': 0.04,
      'Đơn vị sử dụng': 'Kg',
      'Trạng thái': 'Hoạt động',
    },
    {
      IDCauHinh: 'CFG005',
      IDSP: 'SP_MILKTEA',
      IDNguyenLieu: 'NVL999',
      'Số lượng cần': 0.1,
      'Trạng thái': 'Tạm ngừng', // Đang tạm ngừng, không được trừ
    },
  ];

  it('trả về mảng rỗng nếu giỏ hàng hoặc công thức rỗng', () => {
    expect(calculateBomDeductions([], mockRecipes, mockMaterials)).toEqual([]);
    expect(calculateBomDeductions([{ id: 'SP_MILKTEA', quantity: 2 }], [], mockMaterials)).toEqual([]);
  });

  it('tính toán chính xác định lượng và gộp nguyên liệu trùng nhau từ nhiều sản phẩm', () => {
    const cart = [
      { id: 'SP_MILKTEA', quantity: 2 },   // 2 ly Trà sữa
      { id: 'SP_PEARL_TEA', quantity: 3 }, // 3 ly Trà sữa trân châu
    ];

    const deductions = calculateBomDeductions(cart, mockRecipes, mockMaterials);

    // NVL001 (Hồng trà):
    // 2 * 0.015 + 3 * 0.015 = 0.03 + 0.045 = 0.075 Kg
    const tea = deductions.find((d) => d.IDNguyenLieu === 'NVL001');
    expect(tea).toBeDefined();
    expect(tea?.SoLuong).toBe(0.075);
    expect(tea?.TenNguyenLieu).toBe('Trà đen (Hồng trà)');
    expect(tea?.DonViTinh).toBe('Kg');

    // NVL002 (Sữa đặc):
    // 2 * 0.05 = 0.1 Lon
    const milk = deductions.find((d) => d.IDNguyenLieu === 'NVL002');
    expect(milk).toBeDefined();
    expect(milk?.SoLuong).toBe(0.1);
    expect(milk?.DonViTinh).toBe('Lon');

    // NVL003 (Trân châu):
    // 3 * 0.04 = 0.12 Kg
    const pearl = deductions.find((d) => d.IDNguyenLieu === 'NVL003');
    expect(pearl).toBeDefined();
    expect(pearl?.SoLuong).toBe(0.12);
    expect(pearl?.DonViTinh).toBe('Kg');

    // NVL999 có trạng thái 'Tạm ngừng' nên không được có trong danh sách xuất kho
    const disabledMat = deductions.find((d) => d.IDNguyenLieu === 'NVL999');
    expect(disabledMat).toBeUndefined();
  });

  it('recordInventoryExport gọi Supabase upsert và tạo đúng mã giao dịch XK_{invoiceId}', async () => {
    let upsertPayload: any = null;
    const mockSupabase: any = {
      from: vi.fn((tableName: string) => {
        if (tableName === 'CAUHINH') {
          return {
            select: vi.fn().mockResolvedValue({ data: mockRecipes, error: null }),
          };
        }
        if (tableName === 'NGUYENLIEU') {
          return {
            select: vi.fn().mockResolvedValue({ data: mockMaterials, error: null }),
          };
        }
        if (tableName === 'NHAPXUATKHO') {
          return {
            upsert: vi.fn((record: any) => {
              upsertPayload = record;
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {};
      }),
    };

    const cart = [{ id: 'SP_MILKTEA', quantity: 2 }];
    const result = await recordInventoryExport(mockSupabase, 'HD_TEST_001', 'Nguyễn Thu Ngân', cart);

    expect(result.success).toBe(true);
    expect(result.transactionId).toBe('XK_HD_TEST_001');
    expect(upsertPayload).toBeDefined();
    expect(upsertPayload.IDGiaoDich).toBe('XK_HD_TEST_001');
    expect(upsertPayload.LoaiGiaoDich).toBe('Xuất kho');
    expect(upsertPayload.NhanVienThucHien).toBe('Nguyễn Thu Ngân');
    expect(upsertPayload.ChiTiet.length).toBe(2);
  });
});
