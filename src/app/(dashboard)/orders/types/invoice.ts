// types/invoice.ts
export interface Invoice {
  IDHOADON: string;
  IDBAN: string;
  'Nhân viên': string;
  'Khách hàng': string;
  'Ngày': string;
  'Tổng tiền': number;
  'VAT': number;
  'Giảm giá': number;
  'Khách trả': number;
  'Tiền thừa': number;
  'Ghi chú': string;
  'Trạng thái': string;
  'Trạng thái sử dụng bàn': string;
  'Loại thanh toán': string;
  [key: string]: any;
}

export interface InvoiceDetail {
  IDHOADONDETAIL: string;
  IDHOADON: string;
  IDSP: string;
  'Tên sản phẩm': string;
  'Đơn vị tính': string;
  'Đơn giá': number;
  'Số lượng': number;
  'Thành tiền': number;
  'Ghi chú': string;
  [key: string]: any;
}

export interface InvoiceFormData {
  IDBAN: string;
  'Nhân viên': string;
  'Khách hàng': string;
  'Tổng tiền': number;
  'VAT': number;
  'Giảm giá': number;
  'Khách trả': number;
  'Tiền thừa': number;
  'Ghi chú': string;
  'Trạng thái': string;
  'Trạng thái sử dụng bàn': string;
  'Loại thanh toán': string;
}

export interface InvoiceStats {
  totalInvoices: number;
  totalRevenue: number;
  pendingInvoices: number;
  completedInvoices: number;
  cancelledInvoices: number;
}