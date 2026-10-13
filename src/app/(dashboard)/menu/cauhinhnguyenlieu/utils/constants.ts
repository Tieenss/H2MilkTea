// utils/constants.ts
import { CheckCircle, XCircle, Zap, Beaker } from 'lucide-react';
import type { ProductMaterialFormData } from '../types/productMaterial';

export const STATUS_OPTIONS = [
  { value: 'Hoạt động', label: 'Hoạt động', icon: CheckCircle },
  { value: 'Tạm ngừng', label: 'Tạm ngừng', icon: XCircle }
];

export const CONFIG_TYPE_OPTIONS = [
  { value: 'Thông thường', label: 'Thông thường', icon: Beaker, description: 'Sử dụng nguyên vật liệu khác' },
  { value: 'Tự động', label: 'Tự động (1:1)', icon: Zap, description: 'Sản phẩm tự cấu hình' }
];

export const INITIAL_PRODUCT_MATERIAL_FORM_DATA: ProductMaterialFormData = {
  IDCauHinh: '',
  IDSP: '',
  IDNguyenLieu: '',
  'Số lượng cần': 0,
  'Đơn vị sử dụng': '',
  'Ghi chú': '',
  'Trạng thái': 'Hoạt động',
  'Loại cấu hình': 'Thông thường'
};

export const QUICK_QUANTITY_OPTIONS = [
  { label: '1 đơn vị', value: 1 },
  { label: '0.5 đơn vị', value: 0.5 },
  { label: '0.1 đơn vị', value: 0.1 },
  { label: '0.01 đơn vị', value: 0.01 }
];

// Validation rules
export const VALIDATION_RULES = {
  CONFIG_ID: {
    required: true,
    pattern: /^CFG\d{3}$/,
    message: 'Mã cấu hình phải có định dạng CFG001, CFG002...'
  },
  QUANTITY: {
    required: true,
    min: 0.001,
    max: 999999,
    message: 'Số lượng phải lớn hơn 0 và nhỏ hơn 999999'
  }
};

// Default pagination
export const PAGINATION_DEFAULT = {
  pageSize: 50,
  pageIndex: 0
};

// Export options for reports
export const EXPORT_OPTIONS = [
  { label: 'Xuất Excel', value: 'excel', icon: 'FileSpreadsheet' },
  { label: 'Xuất PDF', value: 'pdf', icon: 'FileText' },
  { label: 'In báo cáo', value: 'print', icon: 'Printer' }
];