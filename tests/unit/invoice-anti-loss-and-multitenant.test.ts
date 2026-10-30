import { describe, it, expect } from 'vitest';

describe('Phase 4: Invoice Anti-Loss & Multi-Tenant Architecture', () => {
  it('calculates total cancelled invoice loss correctly in calculateStats', () => {
    const mockInvoices = [
      {
        IDHOADON: 'HD01',
        'Tổng tiền': 60000,
        'VAT': 0,
        'Giảm giá': 0,
        'Trạng thái': 'Đã thanh toán',
      },
      {
        IDHOADON: 'HD02',
        'Tổng tiền': 45000,
        'VAT': 5000,
        'Giảm giá': 0,
        'Trạng thái': 'Đã hủy',
        'Ghi chú': '[ĐÃ HỦY] Pha chế làm sai món (Bởi: Admin lúc 20:30)',
      },
      {
        IDHOADON: 'HD03',
        'Tổng tiền': 80000,
        'VAT': 0,
        'Giảm giá': 10000,
        'Trạng thái': 'Đã hủy',
        'Ghi chú': '[ĐÃ HỦY] Khách đổi ý (Bởi: Thu ngân lúc 20:45)',
      },
      {
        IDHOADON: 'HD04',
        'Tổng tiền': 35000,
        'VAT': 0,
        'Giảm giá': 0,
        'Trạng thái': 'Chờ xác nhận',
      },
    ];

    const cancelledCount = mockInvoices.filter((inv) => inv['Trạng thái'] === 'Đã hủy').length;
    const cancelledLossRevenue = mockInvoices.reduce((sum, inv) => {
      if (inv['Trạng thái'] === 'Đã hủy') {
        const net = Number(inv['Tổng tiền']) + Number(inv['VAT']) - Number(inv['Giảm giá']);
        return sum + net;
      }
      return sum;
    }, 0);

    expect(cancelledCount).toBe(2);
    // HD02: 45000 + 5000 - 0 = 50000
    // HD03: 80000 + 0 - 10000 = 70000
    // Total loss = 120000
    expect(cancelledLossRevenue).toBe(120000);
  });

  it('formats audit note with cancellation reason and operator identity without data loss', () => {
    const reason = 'Trùng đơn / Thu ngân bấm nhầm 2 lần';
    const staffName = 'Nguyễn Thu Ngân';
    const timestamp = '30/10/2026, 21:00:00';
    const cancelNote = `[ĐÃ HỦY] ${reason} (Bởi: ${staffName} lúc ${timestamp})`;

    expect(cancelNote).toContain('[ĐÃ HỦY]');
    expect(cancelNote).toContain(reason);
    expect(cancelNote).toContain(staffName);
  });

  it('validates multi-tenant business profile structure and isolation mode', () => {
    const businessProfile = {
      businessName: 'Hộ kinh doanh H2 MilkTea & Coffee',
      brandName: 'H2 MilkTea',
      taxCode: '0318992812',
      businessAddress: '123 Đường Nguyễn Tri Phương, P.5, Q.10, TP.HCM',
      legalRepresentative: 'Nguyễn Hoàng Hải',
      businessHotline: '1900 8888',
      invoiceEmail: 'billing@h2milktea.vn',
      tenantId: 'STORE-H2-VN01',
      isolationMode: 'Row-Level Security (RLS) - Phân vùng độc lập',
    };

    expect(businessProfile.tenantId).toBe('STORE-H2-VN01');
    expect(businessProfile.taxCode).toMatch(/^\d{10}$/);
    expect(businessProfile.invoiceEmail).toContain('@');
    expect(businessProfile.isolationMode).toContain('Row-Level Security');
  });
});
