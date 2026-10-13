import { Package, Archive, ShoppingCart } from 'lucide-react';
import type { ProductFormData } from '../types/product';

export const PRODUCT_STATUS = [
  { value: 'Hoạt động', label: 'Hoạt động', icon: Package },
  { value: 'Ngừng kinh doanh', label: 'Ngừng kinh doanh', icon: Archive },
  { value: 'Hết hàng', label: 'Hết hàng', icon: ShoppingCart }
];

export const PRODUCT_UNITS = [
  'Cái', 'Chiếc', 'Bộ', 'Hộp', 'Thùng', 'Kg', 'Gram', 'Lít', 'Ml', 'Mét', 'M2', 'M3'
];

export const INITIAL_PRODUCT_FORM_DATA: ProductFormData = {
  IDSP: '',
  'Tên sản phẩm': '',
  'Hình ảnh': '',
  'Loại sản phẩm': '',
  'Đơn vị tính': 'Cái',
  'Giá vốn': 0,
  'Đơn giá': 0,
  'Mô tả': '',
  'Trạng thái': 'Hoạt động'
};