import type { Supplier } from '../types/supplier';

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

// Format date
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN');
};

// Format rating with stars
export const formatRating = (rating: number): string => {
  return `${rating.toFixed(1)} ⭐`;
};

// Get status badge color
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Đang hợp tác':
      return 'bg-green-100 text-green-800';
    case 'Tạm ngưng':
      return 'bg-yellow-100 text-yellow-800';
    case 'Ngừng hợp tác':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Calculate total order value
export const calculateTotalOrderValue = (supplier: Supplier): number => {
  return supplier.LichSuDatHang.reduce((total, order) => total + order.TongTien, 0);
};

// Get recent orders (last 5)
export const getRecentOrders = (supplier: Supplier) => {
  return supplier.LichSuDatHang
    .sort((a, b) => new Date(b.NgayDat).getTime() - new Date(a.NgayDat).getTime())
    .slice(0, 5);
};

// Export supplier data to CSV
export const exportSupplierData = (suppliers: Supplier[]) => {
  const headers = [
    'ID Nhà cung cấp',
    'Tên nhà cung cấp',
    'Mã số thuế',
    'Địa chỉ',
    'Số điện thoại',
    'Email',
    'Người đại diện',
    'SĐT liên hệ',
    'Email liên hệ',
    'Ngày hợp tác',
    'Trạng thái',
    'Đánh giá',
    'Thời gian giao hàng',
    'Phương thức thanh toán',
    'Tổng giá trị đặt hàng',
    'Ghi chú'
  ];

  const csvContent = [
    headers.join(','),
    ...suppliers.map(supplier => [
      supplier.IDNhaCungCap,
      `"${supplier.TenNhaCungCap}"`,
      supplier.MaSoThue,
      `"${supplier.DiaChi}"`,
      supplier.SoDienThoai,
      supplier.Email,
      `"${supplier.NguoiDaiDien}"`,
      supplier.SoDienThoaiLienHe,
      supplier.EmailLienHe,
      supplier.NgayHopTac,
      supplier.TrangThai,
      supplier.DanhGia,
      supplier.ThoiGianGiaoHang,
      supplier.PhuongThucThanhToan,
      calculateTotalOrderValue(supplier),
      `"${supplier.GhiChu}"`
    ].join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `nha-cung-cap-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export supplier order history to CSV
export const exportOrderHistory = (supplier: Supplier) => {
  const headers = [
    'Ngày đặt hàng',
    'Tổng tiền',
    'Trạng thái'
  ];

  const csvContent = [
    headers.join(','),
    ...supplier.LichSuDatHang.map(order => [
      order.NgayDat,
      order.TongTien,
      order.TrangThai
    ].join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `lich-su-dat-hang-${supplier.IDNhaCungCap}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Validate supplier form data
export const validateSupplierForm = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.TenNhaCungCap?.trim()) {
    errors.push('Tên nhà cung cấp là bắt buộc');
  }

  if (!data.MaSoThue?.trim()) {
    errors.push('Mã số thuế là bắt buộc');
  }

  if (!data.DiaChi?.trim()) {
    errors.push('Địa chỉ là bắt buộc');
  }

  if (!data.SoDienThoai?.trim()) {
    errors.push('Số điện thoại là bắt buộc');
  }

  if (!data.Email?.trim()) {
    errors.push('Email là bắt buộc');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.Email)) {
    errors.push('Email không hợp lệ');
  }

  if (!data.NguoiDaiDien?.trim()) {
    errors.push('Người đại diện là bắt buộc');
  }

  if (data.DanhGia < 1 || data.DanhGia > 5) {
    errors.push('Đánh giá phải từ 1 đến 5');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}; 