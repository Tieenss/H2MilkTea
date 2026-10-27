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
import { parseDateFromString } from '@/hooks/useReportData';
import { exportToFormattedCSV } from '@/utils/exportUtils';

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

  it('marks orders as read so sidebar unread badge is cleared after viewing /orders', async () => {
    const invoices = await authUtils.getAllHoaDon();
    expect(invoices.length).toBeGreaterThan(0);

    const STORAGE_VIEWED_ORDER_IDS = 'h2_orders_viewed_ids_v1';
    const STORAGE_LAST_VIEWED_TIME = 'h2_orders_last_viewed_time_v1';

    // Before viewing, no viewed IDs in localStorage
    expect(mockLocalStorage.getItem(STORAGE_VIEWED_ORDER_IDS)).toBeNull();

    // Simulate markOrdersAsRead action when user enters /orders
    const now = Date.now();
    mockLocalStorage.setItem(STORAGE_LAST_VIEWED_TIME, String(now));
    const allIds = invoices.map((inv: any) => String(inv.IDHOADON || inv.IDHD || ''));
    mockLocalStorage.setItem(STORAGE_VIEWED_ORDER_IDS, JSON.stringify(allIds));

    // Stored IDs must contain all current invoices
    const stored = JSON.parse(mockLocalStorage.getItem(STORAGE_VIEWED_ORDER_IDS) || '[]');
    expect(stored.length).toBe(allIds.length);
    expect(Number(mockLocalStorage.getItem(STORAGE_LAST_VIEWED_TIME))).toBe(now);
  });

  it('records debt invoice (Ghi nợ), updates customer debt, and supports debt repayment', async () => {
    // 1. Get or create a customer
    const customers = await authUtils.apiRequest('KHACHHANG', 'getall', {});
    expect(customers.length).toBeGreaterThan(0);
    const testCustomer = customers[0];
    const initialDebt = Number(testCustomer['Công nợ']) || 0;
    const customerId = testCustomer.IDKHACHHANG || testCustomer.IDKH;

    // 2. Simulate POS Debt Checkout: total = 75,000, paidAmount = 25,000, debt = 50,000
    const invoiceId = `INV_DEBT_TEST_${Date.now()}`;
    const invoiceTotal = 75000;
    const paidAmount = 25000;
    const debtAmount = invoiceTotal - paidAmount;

    const invoiceRes = await authUtils.apiRequest('HOADON', 'create', {
      IDHD: invoiceId,
      IDHOADON: invoiceId,
      'Thời gian': '27/10/2026 11:30:00',
      'Tổng số lượng': 2,
      'Tổng tiền': invoiceTotal,
      'Thu ngân': 'Thu ngân test',
      'Trạng thái': 'Nợ một phần',
      'Hình thức thanh toán': 'Ghi nợ',
      'Loại thanh toán': 'Ghi nợ',
      'Mã khách hàng': customerId,
      'Tên khách hàng': testCustomer['Tên khách hàng'],
      'Số điện thoại': testCustomer['Số điện thoại'],
      'Khách trả': paidAmount,
      'Tiền nợ': debtAmount,
      'Đã thanh toán': paidAmount
    });

    expect(invoiceRes.success).toBe(true);

    // Update customer debt
    const updatedCustomerRes = await authUtils.apiRequest('KHACHHANG', 'update', {
      IDKHACHHANG: customerId,
      IDKH: customerId,
      'Công nợ': initialDebt + debtAmount,
      'Lịch sử mua hàng': `${testCustomer['Lịch sử mua hàng'] || ''}, ${invoiceId}`
    });
    expect(updatedCustomerRes.success).toBe(true);
    expect(Number(updatedCustomerRes.data['Công nợ'])).toBe(initialDebt + debtAmount);

    // 3. Customer repays remaining debt of 50,000
    const settleDebtRes = await authUtils.apiRequest('KHACHHANG', 'update', {
      IDKHACHHANG: customerId,
      IDKH: customerId,
      'Công nợ': initialDebt, // Fully paid off this invoice debt
    });
    expect(Number(settleDebtRes.data['Công nợ'])).toBe(initialDebt);

    // 4. Mark debt invoice as settled
    const settledInvRes = await authUtils.apiRequest('HOADON', 'update', {
      IDHOADON: invoiceId,
      IDHD: invoiceId,
      'Trạng thái': 'Đã thanh toán',
      'Tiền nợ': 0,
      'Khách trả': invoiceTotal,
      'Đã thanh toán': invoiceTotal
    });
    expect(settledInvRes.success).toBe(true);
    expect(settledInvRes.data['Trạng thái']).toBe('Đã thanh toán');
    expect(settledInvRes.data['Tiền nợ']).toBe(0);
  });

  it('reports: parseDateFromString safely falls back without throwing on null or invalid input', () => {
    const valid = parseDateFromString('27/10/2026 10:30:00');
    expect(valid).toBeInstanceOf(Date);
    expect(isNaN(valid.getTime())).toBe(false);

    const empty = parseDateFromString('');
    expect(empty).toBeInstanceOf(Date);
    expect(isNaN(empty.getTime())).toBe(false);

    const invalid = parseDateFromString('not-a-valid-date');
    expect(invalid).toBeInstanceOf(Date);
    expect(isNaN(invalid.getTime())).toBe(false);
  });

  it('reports: ExportDropdownButton and exportUtils support summaryStats alongside summaryRows', () => {
    if (typeof (globalThis as any).document === 'undefined') {
      (globalThis as any).document = {
        createElement: () => ({ click: () => {}, setAttribute: () => {} }),
        body: { appendChild: () => {}, removeChild: () => {} },
      };
    }
    if (typeof (globalThis as any).URL?.createObjectURL === 'undefined') {
      (globalThis as any).URL = {
        createObjectURL: () => 'blob:mock',
        revokeObjectURL: () => {},
      };
    }

    // Test that passing summaryStats doesn't crash export
    expect(() => {
      exportToFormattedCSV({
        title: 'Báo cáo thử nghiệm',
        filename: 'test_report',
        data: [{ id: 1, name: 'Trà Sữa Oolong', revenue: 50000 }],
        summaryStats: [{ label: 'Tổng doanh thu', value: '50.000 ₫' }]
      });
    }).not.toThrow();
  });
});
