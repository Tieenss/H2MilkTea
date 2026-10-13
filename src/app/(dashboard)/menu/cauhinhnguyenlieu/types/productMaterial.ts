// types/productMaterial.ts
export interface ProductMaterial {
  IDCauHinh: string;
  IDSP: string; // ID sản phẩm
  IDNguyenLieu: string; // ID nguyên vật liệu hoặc sản phẩm (cho tự cấu hình)
  'Tên sản phẩm': string;
  'Tên nguyên liệu': string;
  'Số lượng cần': number; // Số lượng nguyên liệu cần cho 1 sản phẩm
  'Đơn vị sử dụng': string; // Đơn vị khi sử dụng trong sản phẩm
  'Đơn vị gốc': string; // Đơn vị gốc của nguyên liệu
  'Hệ số quy đổi': number; // Hệ số quy đổi từ đơn vị sử dụng sang đơn vị gốc
  'Số lượng quy đổi': number; // Số lượng thực tế cần tính theo đơn vị gốc
  'Ghi chú': string;
  'Trạng thái': string; // Hoạt động, Tạm ngừng
  'Loại cấu hình': 'Thông thường' | 'Tự động'; // Thêm loại cấu hình
  'Ngày tạo': string;
  'Ngày cập nhật': string;
  [key: string]: any;
}

export interface ProductMaterialFormData {
  IDCauHinh: string;
  IDSP: string;
  IDNguyenLieu: string;
  'Số lượng cần': number;
  'Đơn vị sử dụng': string;
  'Ghi chú': string;
  'Trạng thái': string;
  'Loại cấu hình'?: 'Thông thường' | 'Tự động';
}

export interface Product {
  IDSP: string;
  'Tên sản phẩm': string;
  'Loại sản phẩm': string;
  'Trạng thái': string;
  'Đơn vị tính'?: string; // Thêm đơn vị tính cho sản phẩm
  'Đơn vị cơ sở'?: string; // Thêm đơn vị cơ sở cho sản phẩm
  'Hệ số quy đổi'?: number; // Thêm hệ số quy đổi cho sản phẩm
}

export interface Material {
  IDNguyenLieu: string;
  'Tên nguyên liệu': string;
  'Đơn vị tính': string;
  'Đơn vị cơ sở': string;
  'Hệ số quy đổi': number;
}

// Thêm type để kết hợp product và material
export interface MaterialOption {
  id: string;
  name: string;
  type: 'material' | 'product';
  unit?: string;
  baseUnit?: string;
  conversionRatio?: number;
}