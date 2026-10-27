import { describe, it, expect, beforeEach } from 'vitest';

const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => (storageMap.has(key) ? storageMap.get(key)! : null),
  setItem: (key: string, val: string) => {
    storageMap.set(key, String(val));
  },
  removeItem: (key: string) => {
    storageMap.delete(key);
  },
  clear: () => {
    storageMap.clear();
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

if (typeof (globalThis as any).window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: globalThis,
    writable: true,
  });
}

import authUtils from '@/utils/authUtils';

describe('Patch 0.2710 - Application-Level Sync, Duplicate Prevention & Triggers', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('1.d - Adding a product does not mutate caller array in-place or create duplicate IDSP', async () => {
    const initialList = await authUtils.apiRequest('DMHH', 'getall', {});
    const initialCount = initialList.length;

    const createdRes = await authUtils.apiRequest('DMHH', 'create', {
      IDSP: 'SP001', // Duplicate ID with existing SP001
      'Tên sản phẩm': 'Bún Bò Huế Đặc Biệt',
      'Loại sản phẩm': 'Món ăn',
      'Đơn vị tính': 'Tô',
      'Đơn giá': 45000,
      'Giá vốn': 22000,
      'Trạng thái': 'Còn hàng',
    });

    const newItem = createdRes?.data || createdRes;
    // Because SP001 already exists, handleCreate must assign a new unique IDSP
    expect(newItem.IDSP).not.toBe('SP001');
    expect(newItem['Tên sản phẩm']).toBe('Bún Bò Huế Đặc Biệt');

    // initialList must not have been mutated in-place by handleCreate
    expect(initialList.length).toBe(initialCount);

    const updatedList = await authUtils.apiRequest('DMHH', 'getall', {});
    expect(updatedList.length).toBe(initialCount + 1);

    const bunBoRows = updatedList.filter((p: any) => p['Tên sản phẩm'] === 'Bún Bò Huế Đặc Biệt');
    expect(bunBoRows.length).toBe(1);
  });

  it('Enriches HOADONDETAIL from DMHH and normalizes HOADON dates & statuses for Reports', async () => {
    const invoices = await authUtils.getAllHoaDon();
    const details = await authUtils.getAllHoaDonDetail();

    expect(Array.isArray(invoices)).toBe(true);
    expect(invoices.length).toBeGreaterThan(0);

    const firstInvoice = invoices[0];
    expect(firstInvoice.IDHOADON).toBeDefined();
    expect(firstInvoice.IDHD).toBe(firstInvoice.IDHOADON);

    const parsedDate = authUtils.parseFlexibleDate(firstInvoice['Ngày']);
    const daysDiff = Math.abs(Date.now() - parsedDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeLessThan(90);

    expect(details.length).toBeGreaterThan(0);
    const firstDetail = details[0];
    expect(Number(firstDetail['Đơn giá'])).toBeGreaterThan(0);
    expect(Number(firstDetail['Thành tiền'])).toBeGreaterThan(0);
    expect(String(firstDetail['Tên sản phẩm'] || '').length).toBeGreaterThan(0);
  });

  it('Triggers automatic ingredient deduction and NHAPXUATKHO log when HOADONDETAIL is created', async () => {
    await authUtils.apiRequest('NGUYENLIEU', 'getall', {});
    const configs = await authUtils.apiRequest('CAUHINH', 'getall', {});
    expect(configs.length).toBeGreaterThan(0);

    const sampleRecipe = configs[0];
    const targetProductId = sampleRecipe.IDSP;
    const targetMaterialId = sampleRecipe.IDNguyenLieu;
    const recipeQtyPerUnit =
      Number(sampleRecipe['Số lượng quy đổi']) ||
      Number(sampleRecipe['Số lượng cần']) ||
      0;

    const materialsBefore = await authUtils.apiRequest('NGUYENLIEU', 'getall', {});
    const targetMatBefore = materialsBefore.find((m: any) => m.IDNguyenLieu === targetMaterialId);
    const stockBefore = Number(targetMatBefore['Số lượng tồn']) || 0;

    const txBefore = await authUtils.apiRequest('NHAPXUATKHO', 'getall', {});

    // Create a sale detail for 2 units of targetProductId
    await authUtils.apiRequest('HOADONDETAIL', 'create', {
      IDHOADON: 'HD_TEST_TRIGGER_01',
      IDSP: targetProductId,
      'Số lượng': 2,
    });

    const materialsAfter = await authUtils.apiRequest('NGUYENLIEU', 'getall', {});
    const targetMatAfter = materialsAfter.find((m: any) => m.IDNguyenLieu === targetMaterialId);
    const stockAfter = Number(targetMatAfter['Số lượng tồn']) || 0;

    expect(stockAfter).toBeCloseTo(Math.max(0, stockBefore - recipeQtyPerUnit * 2), 2);

    const txAfter = await authUtils.apiRequest('NHAPXUATKHO', 'getall', {});
    expect(txAfter.length).toBe(txBefore.length + 1);
    expect(txAfter[0].LoaiGiaoDich).toBe('Xuất kho');
  });

  it('seedSynchronizedTestDatabase generates synchronized 60-day dataset for all reports', async () => {
    const summary = await authUtils.seedSynchronizedTestDatabase();
    expect(summary.invoices).toBeGreaterThanOrEqual(25);
    expect(summary.details).toBeGreaterThanOrEqual(40);

    const invoices = await authUtils.getAllHoaDon();
    expect(invoices.length).toBeGreaterThanOrEqual(25);
  });
});
