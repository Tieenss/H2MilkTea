export interface Employee {
  username: string;
  password: string;
  'Họ và Tên': string;
  'Chức vụ': string;
  'Phòng': string;
  'Email': string;
  'Image': string;
  'Phân quyền': string;
  'Quyền View': string;
  'Số điện thoại': string;
  'Địa chỉ': string;
  'Ngày sinh': string;
  'Ngày vào làm': string;
  'Ghi chú': string;
  [key: string]: any;
}

export interface EmployeeFormData {
  'Họ và Tên': string;
  'Chức vụ': string;
  'Phòng': string;
  'username': string;
  'password': string;
  'Phân quyền': string;
  'Email': string;
  'Image': string;
  'Quyền View': string;
  'Số điện thoại': string;
  'Địa chỉ': string;
  'Ngày sinh': string;
  'Ngày vào làm': string;
  'Ghi chú': string;
}