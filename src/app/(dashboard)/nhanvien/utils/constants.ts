import { Shield, Briefcase, User } from 'lucide-react';
import type { EmployeeFormData } from '../types/employee';

export const EMPLOYEE_ROLES = [
  { value: 'Admin', label: 'Admin', icon: Shield },
  { value: 'Giám đốc', label: 'Giám đốc', icon: Briefcase },
  { value: 'Nhân viên', label: 'Nhân viên', icon: User }
];

export const INITIAL_FORM_DATA: EmployeeFormData = {
  'Họ và Tên': '',
  'Chức vụ': '',
  'Phòng': '',
  'username': '',
  'password': '123',
  'Phân quyền': 'Nhân viên',
  'Email': '',
  'Image': '',
  'Quyền View': '',
  'Số điện thoại': '',
  'Địa chỉ': '',
  'Ngày sinh': '',
  'Ngày vào làm': '',
  'Ghi chú': ''
};