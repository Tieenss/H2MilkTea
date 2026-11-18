/**
 * Các hàm tiện ích chuẩn hóa và kiểm tra dữ liệu số (hỗ trợ cả dấu chấm `.` và dấu phẩy `,` thập phân kiểu Việt Nam)
 */

/**
 * Chuyển đổi chuỗi hoặc số nhập vào (hỗ trợ cả `.` và `,` làm dấu thập phân) thành number.
 * Trả về NaN nếu chuỗi rỗng hoặc không hợp lệ.
 */
export function parseFlexibleDecimal(input: string | number): number {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : NaN;
  }

  if (input === null || input === undefined) {
    return NaN;
  }

  const trimmed = String(input).trim().replace(/\s+/g, '');
  if (!trimmed) {
    return NaN;
  }

  let normalized = trimmed;
  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');

  if (hasComma && hasDot) {
    // Có cả dấu chấm và dấu phẩy: dấu xuất hiện sau cùng là dấu thập phân
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (hasComma) {
    const commaCount = (normalized.match(/,/g) || []).length;
    if (commaCount === 1) {
      normalized = normalized.replace(',', '.');
    } else if (/^[+-]?\d{1,3}(,\d{3})+$/.test(normalized)) {
      normalized = normalized.replace(/,/g, '');
    } else {
      return NaN;
    }
  } else if (hasDot) {
    const dotCount = (normalized.match(/\./g) || []).length;
    if (dotCount > 1) {
      if (/^[+-]?\d{1,3}(\.\d{3})+$/.test(normalized)) {
        normalized = normalized.replace(/\./g, '');
      } else {
        return NaN;
      }
    }
  }

  if (!/^[+-]?(\d+(\.\d+)?|\.\d+)$/.test(normalized)) {
    return NaN;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

/**
 * Kiểm tra giá trị giảm giá nhập vào:
 * - Chặn số âm (< 0)
 * - Chặn vượt quá tổng tiền hàng (> subtotal)
 * - Kẹp giá trị an toàn trong khoảng [0, subtotal]
 */
export function validateDiscountInput(
  rawDiscount: any,
  subtotal: number
): { valid: boolean; value: number; error?: string } {
  const safeSubtotal = Number.isFinite(subtotal) ? Math.max(0, subtotal) : 0;

  if (rawDiscount === '' || rawDiscount === null || rawDiscount === undefined) {
    return { valid: true, value: 0 };
  }

  if (typeof rawDiscount === 'string' && rawDiscount.trim() === '') {
    return { valid: true, value: 0 };
  }

  const parsed = parseFlexibleDecimal(rawDiscount);
  if (Number.isNaN(parsed)) {
    return {
      valid: false,
      value: 0,
      error: 'Số tiền giảm giá không hợp lệ!',
    };
  }

  if (parsed < 0) {
    return {
      valid: false,
      value: 0,
      error: 'Số tiền giảm giá không được là số âm!',
    };
  }

  if (parsed > safeSubtotal) {
    return {
      valid: false,
      value: Math.min(safeSubtotal, Math.max(0, parsed)),
      error: 'Mức giảm giá không được vượt quá tổng tiền đơn hàng!',
    };
  }

  return {
    valid: true,
    value: Math.min(safeSubtotal, Math.max(0, parsed)),
  };
}

/**
 * Kiểm tra số lượng / định mức dương (> 0, không NaN).
 */
export function validatePositiveQuantity(
  rawQty: any,
  fieldName = 'Số lượng'
): { valid: boolean; value: number; error?: string } {
  const label = (fieldName || 'Số lượng').trim();

  if (rawQty === '' || rawQty === null || rawQty === undefined) {
    return {
      valid: false,
      value: 0,
      error: `${label} không được để trống và phải lớn hơn 0!`,
    };
  }

  const parsed = parseFlexibleDecimal(rawQty);
  if (Number.isNaN(parsed)) {
    return {
      valid: false,
      value: 0,
      error: `${label} không hợp lệ, vui lòng nhập số hợp lệ!`,
    };
  }

  if (parsed <= 0) {
    return {
      valid: false,
      value: 0,
      error: `${label} phải lớn hơn 0!`,
    };
  }

  return {
    valid: true,
    value: parsed,
  };
}
