import { describe, expect, it } from 'vitest';
import { tinhTienDonHang } from '@/lib/cart/pricing';

describe('Kiểm thử an toàn tài chính & độ chính xác tiền tệ (Finance Precision & Safety)', () => {
  it('tính toán chính xác tiền hàng và làm tròn VAT không sinh số thập phân', () => {
    // 3 ly trà sữa giá 33.333đ (tổng 99.999đ), VAT 10% = 9.999,9đ -> phải làm tròn nguyên thành 10.000đ
    const result = tinhTienDonHang({
      cart: [{ id: 'TS1', name: 'Trà sữa ô long', price: 33333, quantity: 3 }],
      vatPercent: 10,
      paidAmount: 120000,
    });

    expect(result.isValid).toBe(true);
    expect(result.subtotal).toBe(99999);
    expect(result.vatAmount).toBe(10000); // 9999.9 làm tròn thành 10000
    expect(result.finalAmount).toBe(109999);
    expect(result.change).toBe(10001); // 120.000 - 109.999 = 10.001
    expect(Number.isInteger(result.finalAmount)).toBe(true);
    expect(Number.isInteger(result.change)).toBe(true);
  });

  it('ngăn chặn lỗi số lượng âm hoặc số lượng bằng 0 (Negative Quantity Exploit)', () => {
    // Kẻ gian gửi số lượng âm -2 để làm giảm tiền phải trả
    const resultAm = tinhTienDonHang({
      cart: [{ id: 'TS1', name: 'Trà sữa trân châu', price: 30000, quantity: -2 }],
      paidAmount: 50000,
    });

    expect(resultAm.isValid).toBe(false);
    expect(resultAm.errorMessage).toContain('phải là số nguyên lớn hơn 0');

    // Số lượng 0
    const resultKhong = tinhTienDonHang({
      cart: [{ id: 'TS1', name: 'Trà sữa trân châu', price: 30000, quantity: 0 }],
      paidAmount: 50000,
    });

    expect(resultKhong.isValid).toBe(false);
    expect(resultKhong.errorMessage).toContain('phải là số nguyên lớn hơn 0');
  });

  it('ngăn chặn giá âm (Negative Price Exploit)', () => {
    const result = tinhTienDonHang({
      cart: [{ id: 'TS1', name: 'Món lậu', price: -50000, quantity: 1 }],
      paidAmount: 10000,
    });

    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('không hợp lệ');
  });

  it('khống chế giảm giá không vượt quá tổng hóa đơn (Over-discount Guard)', () => {
    // Đơn 50k nhưng áp mã giảm 200k -> chỉ giảm tối đa 50k, tiền phải trả về 0đ chứ không bị âm tiền
    const result = tinhTienDonHang({
      cart: [{ id: 'TS1', name: 'Trà đào', price: 50000, quantity: 1 }],
      vatPercent: 0,
      discount: 200000,
      paidAmount: 0,
    });

    expect(result.isValid).toBe(true);
    expect(result.discount).toBe(50000); // Tối đa bằng tổng tiền
    expect(result.finalAmount).toBe(0);
    expect(result.change).toBe(0);
  });

  it('kiểm tra chặn khi khách đưa thiếu tiền', () => {
    const result = tinhTienDonHang({
      cart: [{ id: 'TS1', name: 'Trà sữa H2', price: 30000, quantity: 1 }],
      vatPercent: 10, // 30k + 3k = 33k
      paidAmount: 30000, // Đưa thiếu 3k
    });

    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('không đủ tiền');
    expect(result.change).toBe(0);
  });
});
