// utils/customerConstants.ts
import { CustomerFormData } from "../types/customer";

export const CUSTOMER_TYPES = [
  { value: 'Khách thường', label: 'Khách thường', color: 'bg-gray-100 text-gray-800', points: 0 },
  { value: 'Khách VIP', label: 'Khách VIP', color: 'bg-blue-100 text-blue-800', points: 1000 },
  { value: 'Khách kim cương', label: 'Khách kim cương', color: 'bg-purple-100 text-purple-800', points: 3000 }
];

export const CUSTOMER_STATUS = [
  { value: 'Hoạt động', label: 'Hoạt động', color: 'bg-green-100 text-green-800' },
  { value: 'Tạm ngưng', label: 'Tạm ngưng', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'Ngừng hoạt động', label: 'Ngừng hoạt động', color: 'bg-red-100 text-red-800' }
];

export const GENDER_OPTIONS = [
  { value: 'Nam', label: 'Nam' },
  { value: 'Nữ', label: 'Nữ' },
  { value: 'Khác', label: 'Khác' }
];

export const INITIAL_CUSTOMER_FORM: CustomerFormData = {
  'Tên khách hàng': '',
  'Số điện thoại': '',
  'Email': '',
  'Địa chỉ': '',
  'Ngày sinh': '',
  'Giới tính': 'Nam',
  'Loại khách hàng': 'Khách thường',
  'Điểm tích lũy': 0,
  'Ghi chú': '',
  'Trạng thái': 'Hoạt động',
  'Ưu đãi hiện tại': ''
};

export const LOYALTY_TIERS = [
  {
    name: 'Khách thường',
    minPoints: 0,
    maxPoints: 999,
    benefits: ['Tích điểm cơ bản', 'Sinh nhật giảm 5%'],
    color: 'gray'
  },
  {
    name: 'Khách VIP',
    minPoints: 1000,
    maxPoints: 2999,
    benefits: ['Tích điểm x1.5', 'Giảm 10% mọi đơn hàng', 'Ưu tiên phục vụ'],
    color: 'blue'
  },
  {
    name: 'Khách kim cương',
    minPoints: 3000,
    maxPoints: Infinity,
    benefits: ['Tích điểm x2', 'Giảm 20% mọi đơn hàng', 'Miễn phí ship', 'Quà tặng đặc biệt'],
    color: 'purple'
  }
];