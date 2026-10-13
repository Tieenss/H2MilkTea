export const POS_CONFIG = {
  timeouts: {
    notification: 2000,
    barcodeBuffer: 100,
    debounceSearch: 300
  },
  customerDisplayUrl: '/customer-display',
  maxCartItems: 50,
  maxTableCapacity: 20,
  defaultVatRate: 0.1,
  currency: 'VND',
  locale: 'vi-VN'
};

export const PAYMENT_TYPES = [
  { value: 'Tiền mặt', label: 'Tiền mặt' },
  { value: 'Chuyển khoản', label: 'Chuyển khoản' },
  { value: 'Thẻ', label: 'Thẻ' }
];

export const TABLE_STATUS = {
  EMPTY: 'Trống',
  OCCUPIED: 'Đang sử dụng',
  RESERVED: 'Đã đặt',
  CLEANING: 'Đang dọn dẹp'
};

export const PRICE_RANGES = [
  { value: 'all', label: 'Tất cả giá' },
  { value: '0-20000', label: '0đ - 20,000đ' },
  { value: '20000-50000', label: '20,000đ - 50,000đ' },
  { value: '50000-100000', label: '50,000đ - 100,000đ' },
  { value: '100000+', label: 'Trên 100,000đ' }
];

export const NOTE_TEMPLATES = {
  sizes: ['S', 'M', 'L', 'XL'],
  sugar: ['Không đường', 'Ít đường', 'Vừa', 'Nhiều đường'],
  ice: ['Không đá', 'Ít đá', 'Vừa', 'Nhiều đá'],
  temperature: ['Nóng', 'Ấm', 'Lạnh', 'Đá']
};

export const KEYBOARD_SHORTCUTS = {
  F1: 'Reset filters',
  F2: 'Focus search',
  F4: 'Quick checkout',
  F5: 'Sync data',
  Escape: 'Clear cart',
  'Ctrl+B': 'Focus barcode'
};

export const ERROR_MESSAGES = {
  EMPTY_CART: 'Giỏ hàng trống!',
  INVALID_EMPLOYEE: 'Vui lòng chọn nhân viên thanh toán!',
  INVALID_TOTAL: 'Tổng tiền không hợp lệ!',
  INVALID_DISCOUNT: 'Giảm giá không hợp lệ!',
  INVALID_PAID_AMOUNT: 'Số tiền thanh toán không hợp lệ!',
  INSUFFICIENT_PAYMENT: 'Số tiền khách trả không đủ!',
  NETWORK_ERROR: 'Lỗi kết nối! Vui lòng kiểm tra lại.',
  DATABASE_ERROR: 'Lỗi lưu dữ liệu! Vui lòng thử lại.',
  TABLE_NOT_SELECTED: 'Vui lòng chọn bàn trước!',
  PRODUCT_NOT_FOUND: 'Không tìm thấy sản phẩm!',
  TABLE_NOT_FOUND: 'Không tìm thấy bàn!'
};