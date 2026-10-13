export interface Material {
  IDNguyenLieu: string;
  'Tên nguyên liệu': string;
  'Đơn vị tính': string;
  'Đơn vị cơ sở': string;
  'Hệ số quy đổi': number;
  'Ghi chú': string;
  'Số lượng cảnh báo': number;
  [key: string]: any;
}

export interface MaterialFormData {
  IDNguyenLieu: string;
  'Tên nguyên liệu': string;
  'Đơn vị tính': string;
  'Đơn vị cơ sở': string;
  'Hệ số quy đổi': number;
  'Ghi chú': string;
  'Số lượng cảnh báo': number;
}