import { InvoiceFormData } from "../types/invoice";

// utils/invoiceConstants.ts
export const INVOICE_STATUS = [
  { value: 'Chờ xác nhận', label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'Đã xác nhận', label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800' },
  { value: 'Đã thanh toán', label: 'Đã thanh toán', color: 'bg-green-100 text-green-800' },
  { value: 'Đã hủy', label: 'Đã hủy', color: 'bg-red-100 text-red-800' }
];

export const TABLE_STATUS = [
  { value: 'Trống', label: 'Trống' },
  { value: 'Đang sử dụng', label: 'Đang sử dụng' },
  { value: 'Đã dọn dẹp', label: 'Đã dọn dẹp' }
];

export const PAYMENT_METHODS = [
  { value: 'Tiền mặt', label: 'Tiền mặt' },
  { value: 'Chuyển khoản', label: 'Chuyển khoản' },
  { value: 'Thẻ', label: 'Thẻ' },
  { value: 'VietQR', label: 'VietQR' }
];

export const INITIAL_INVOICE_FORM: InvoiceFormData = {
  IDBAN: '',
  'Nhân viên': '',
  'Khách hàng': 'Khách lẻ',
  'Tổng tiền': 0,
  'VAT': 0,
  'Giảm giá': 0,
  'Khách trả': 0,
  'Tiền thừa': 0,
  'Ghi chú': '',
  'Trạng thái': 'Chờ xác nhận',
  'Trạng thái sử dụng bàn': 'Trống',
  'Loại thanh toán': 'Tiền mặt'
};