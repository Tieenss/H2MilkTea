/**
 * Module tính toán tiền tệ và hóa đơn cho quán trà sữa H2 (Thuần TypeScript, không thư viện ngoài)
 * Nguyên tắc: Tiền Việt Nam Đồng (VND) luôn là số nguyên, không có số lẻ thập phân.
 */

export interface CartItem {
  id: string;
  name?: string;
  price: number;
  quantity: number;
}

export interface PricingOptions {
  cart: CartItem[];
  discount?: number;       // Số tiền giảm giá (VND)
  vatPercent?: number;     // Tỷ lệ VAT (0, 5, 8, 10, v.v.), mặc định 10%
  paidAmount?: number;     // Số tiền khách đưa (VND)
}

export interface PricingResult {
  subtotal: number;        // Tổng tiền hàng trước thuế
  vatAmount: number;       // Tiền thuế VAT (đã làm tròn nguyên VND)
  discount: number;        // Số tiền giảm giá hợp lệ
  finalAmount: number;     // Tổng số tiền khách cần thanh toán
  paidAmount: number;      // Số tiền khách đưa
  change: number;          // Tiền thừa trả lại khách (>= 0)
  isValid: boolean;        // Trạng thái hợp lệ
  errorMessage?: string;   // Lý do lỗi (nếu có)
}

/**
 * Tính toán chi tiết hóa đơn thanh toán
 */
export function tinhTienDonHang(options: PricingOptions): PricingResult {
  const { cart, discount = 0, vatPercent = 10, paidAmount = 0 } = options;

  // 1. Kiểm tra giỏ hàng
  if (!Array.isArray(cart) || cart.length === 0) {
    return {
      subtotal: 0,
      vatAmount: 0,
      discount: 0,
      finalAmount: 0,
      paidAmount,
      change: 0,
      isValid: false,
      errorMessage: 'Giỏ hàng không được để trống.',
    };
  }

  // 2. Tính tiền hàng và kiểm tra từng món
  let subtotal = 0;
  for (const item of cart) {
    const price = Number(item.price);
    const quantity = Number(item.quantity);

    // Chặn số lượng âm hoặc không phải số nguyên
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return {
        subtotal: 0,
        vatAmount: 0,
        discount: 0,
        finalAmount: 0,
        paidAmount,
        change: 0,
        isValid: false,
        errorMessage: `Số lượng món "${item.name || item.id}" phải là số nguyên lớn hơn 0.`,
      };
    }

    // Chặn giá âm
    if (price < 0 || !Number.isFinite(price)) {
      return {
        subtotal: 0,
        vatAmount: 0,
        discount: 0,
        finalAmount: 0,
        paidAmount,
        change: 0,
        isValid: false,
        errorMessage: `Giá món "${item.name || item.id}" không hợp lệ.`,
      };
    }

    subtotal += Math.round(price) * quantity;
  }

  // 3. Tính thuế VAT (làm tròn số nguyên VND, chặn tỷ lệ âm)
  const validVatPercent = Math.max(0, Number(vatPercent) || 0);
  const vatAmount = Math.round((subtotal * validVatPercent) / 100);

  // 4. Kiểm tra giảm giá (chặn số âm, không được lớn hơn tổng tiền sau thuế)
  if (discount < 0) {
    return {
      subtotal: 0,
      vatAmount: 0,
      discount: 0,
      finalAmount: 0,
      paidAmount,
      change: 0,
      isValid: false,
      errorMessage: 'Số tiền giảm giá không được âm.',
    };
  }

  const validDiscount = Math.round(Number(discount) || 0);
  const totalBeforeDiscount = subtotal + vatAmount;
  const actualDiscount = Math.min(validDiscount, totalBeforeDiscount);

  // 5. Tổng tiền cần thanh toán
  const finalAmount = totalBeforeDiscount - actualDiscount;

  // 6. Tính tiền thừa
  const validPaidAmount = Math.max(0, Math.round(Number(paidAmount) || 0));
  const change = Math.max(0, validPaidAmount - finalAmount);

  // Kiểm tra khách trả đủ tiền không
  if (validPaidAmount < finalAmount) {
    return {
      subtotal,
      vatAmount,
      discount: actualDiscount,
      finalAmount,
      paidAmount: validPaidAmount,
      change: 0,
      isValid: false,
      errorMessage: `Khách trả không đủ tiền (thiếu ${(finalAmount - validPaidAmount).toLocaleString('vi-VN')} đ).`,
    };
  }

  return {
    subtotal,
    vatAmount,
    discount: actualDiscount,
    finalAmount,
    paidAmount: validPaidAmount,
    change,
    isValid: true,
  };
}
