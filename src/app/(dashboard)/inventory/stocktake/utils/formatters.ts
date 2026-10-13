import type { Stocktake } from '../types/stocktake';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('vi-VN');
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'pending':
      return 'bg-blue-100 text-blue-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getStatusText = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'Hoàn thành';
    case 'in_progress':
      return 'Đang thực hiện';
    case 'pending':
      return 'Chờ thực hiện';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return status;
  }
};

export const getTypeText = (type: string): string => {
  switch (type) {
    case 'periodic':
      return 'Định kỳ';
    case 'random':
      return 'Ngẫu nhiên';
    case 'full':
      return 'Toàn bộ';
    case 'partial':
      return 'Một phần';
    default:
      return type;
  }
};

export const generateStocktakeId = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `KK${timestamp}${random}`;
};

export const calculateTotalValue = (stocktake: Stocktake): number => {
  return stocktake.ChiTiet.reduce((sum, item) => sum + (item.SoLuongThucTe * item.DonGia), 0);
};

export const calculateDiscrepancyValue = (stocktake: Stocktake): number => {
  return stocktake.ChiTiet.reduce((sum, item) => sum + (item.ChenhLech * item.DonGia), 0);
};

export const exportStocktakeData = (stocktakes: Stocktake[]): string => {
  const headers = [
    'Mã kiểm kê',
    'Ngày kiểm kê',
    'Loại kiểm kê',
    'Nhân viên thực hiện',
    'Trạng thái',
    'Tổng mặt hàng',
    'Tổng giá trị',
    'Số mặt hàng có chênh lệch',
    'Giá trị chênh lệch',
    'Ghi chú'
  ];

  const rows = stocktakes.map(stocktake => [
    stocktake.IDKiemKe,
    formatDate(stocktake.NgayKiemKe),
    getTypeText(stocktake.LoaiKiemKe),
    stocktake.NhanVienThucHien,
    getStatusText(stocktake.TrangThai),
    stocktake.TongMatHang,
    formatCurrency(stocktake.TongGiaTri),
    stocktake.ChiTiet.filter(item => item.ChenhLech !== 0).length,
    formatCurrency(calculateDiscrepancyValue(stocktake)),
    stocktake.GhiChu || ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
};

export const validateStocktakeData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.NgayKiemKe) {
    errors.push('Ngày kiểm kê là bắt buộc');
  }

  if (!data.LoaiKiemKe) {
    errors.push('Loại kiểm kê là bắt buộc');
  }

  if (!data.NhanVienThucHien) {
    errors.push('Nhân viên thực hiện là bắt buộc');
  }

  if (!data.TrangThai) {
    errors.push('Trạng thái là bắt buộc');
  }

  if (!data.ChiTiet || data.ChiTiet.length === 0) {
    errors.push('Phải có ít nhất một mặt hàng để kiểm kê');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}; 