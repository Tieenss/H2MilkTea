export interface Product {
  IDSP: string;
  'Tên sản phẩm': string;
  'Hình ảnh': string;
  'Loại sản phẩm': string;
  'Đơn vị tính': string;
  'Giá vốn': number;
  'Đơn giá': number;
  'Mô tả': string;
  'Trạng thái': string;
  [key: string]: any;
}

export interface ProductFormData {
  IDSP: string;
  'Tên sản phẩm': string;
  'Hình ảnh': string;
  'Loại sản phẩm': string;
  'Đơn vị tính': string;
  'Giá vốn': number;
  'Đơn giá': number;
  'Mô tả': string;
  'Trạng thái': string;
}