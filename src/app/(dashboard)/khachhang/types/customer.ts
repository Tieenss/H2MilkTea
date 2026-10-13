// types/customer.ts
export interface Customer {
  IDKHACHHANG: string;
  'Tên khách hàng': string;
  'Số điện thoại': string;
  'Email': string;
  'Địa chỉ': string;
  'Ngày sinh': string;
  'Giới tính': string;
  'Loại khách hàng': string;
  'Điểm tích lũy': number;
  'Tổng chi tiêu': number;
  'Lần mua cuối': string;
  'Ghi chú': string;
  'Trạng thái': string;
  'Ngày tạo': string;
  'Ngày cập nhật': string;
  'Hóa đơn liên quan': string;
  'Ưu đãi hiện tại': string;
  [key: string]: any;
}

export interface CustomerFormData {
  'Tên khách hàng': string;
  'Số điện thoại': string;
  'Email': string;
  'Địa chỉ': string;
  'Ngày sinh': string;
  'Giới tính': string;
  'Loại khách hàng': string;
  'Điểm tích lũy': number;
  'Ghi chú': string;
  'Trạng thái': string;
  'Ưu đãi hiện tại': string;
}

export interface CustomerStats {
  totalCustomers: number;
  newCustomersThisMonth: number;
  vipCustomers: number;
  diamondCustomers: number;
  activeCustomers: number;
  totalLoyaltyPoints: number;
  totalSpending: number;
  averageSpending: number;
}

export interface CustomerTransaction {
  IDHOADON: string;
  'Ngày': string;
  'Tổng tiền': number;
  'Trạng thái': string;
  'Bàn': string;
}