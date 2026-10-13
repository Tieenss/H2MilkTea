import { Package, AlertTriangle } from 'lucide-react';
import type { MaterialFormData } from '../types/material';

export const MATERIAL_UNITS = [
  'Kg', 'Gram', 'Lít', 'Ml', 'Cái', 'Chiếc', 'Bộ', 'Hộp', 'Thùng', 'Mét', 'M2', 'M3', 'Tấn'
];

export const BASE_UNITS = [
  'Gram', 'Ml', 'Cái', 'Mét'
];

export const INITIAL_MATERIAL_FORM_DATA: MaterialFormData = {
  IDNguyenLieu: '',
  'Tên nguyên liệu': '',
  'Đơn vị tính': 'Kg',
  'Đơn vị cơ sở': 'Gram',
  'Hệ số quy đổi': 1000,
  'Ghi chú': '',
  'Số lượng cảnh báo': 0
};

// Hệ số quy đổi phổ biến
export const COMMON_CONVERSIONS = {
  'Kg -> Gram': 1000,
  'Lít -> Ml': 1000,
  'Tấn -> Kg': 1000,
  'M2 -> M': 1,
  'M3 -> M': 1,
  'Thùng -> Hộp': 12,
  'Thùng -> Cái': 24,
  'Hộp -> Cái': 2
};