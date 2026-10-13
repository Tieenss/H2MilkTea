import { InventoryTransaction } from '../types/inventory';

export const formatNumber = (number: number): string => {
  return new Intl.NumberFormat('vi-VN').format(number);
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Chờ xử lý':
      return 'bg-yellow-100 text-yellow-800';
    case 'Đang xử lý':
      return 'bg-blue-100 text-blue-800';
    case 'Hoàn thành':
      return 'bg-green-100 text-green-800';
    case 'Đã hủy':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getTransactionTypeColor = (type: string): string => {
  switch (type) {
    case 'Nhập kho':
      return 'bg-green-100 text-green-800';
    case 'Xuất kho':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const generateTransactionId = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `GD${timestamp.slice(-6)}${random}`;
};

export const calculateTotalAmount = (details: any[]): number => {
  return details.reduce((total, detail) => total + (detail.ThanhTien || 0), 0);
};

export const exportInventoryData = (transactions: InventoryTransaction[]): any[] => {
  return transactions.map(transaction => ({
    'Mã giao dịch': transaction.IDGiaoDich,
    'Loại giao dịch': transaction.LoaiGiaoDich,
    'Ngày giao dịch': formatDate(transaction.NgayGiaoDich),
    'Nhà cung cấp': transaction.NhaCungCap,
    'Nhân viên thực hiện': transaction.NhanVienThucHien,
    'Tổng tiền': formatCurrency(transaction.TongTien),
    'Trạng thái': transaction.TrangThai,
    'Ghi chú': transaction.GhiChu,
    'Số lượng mặt hàng': transaction.ChiTiet.length
  }));
};

export const validateTransactionData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.LoaiGiaoDich) {
    errors.push('Loại giao dịch là bắt buộc');
  }

  if (data.LoaiGiaoDich === 'Nhập kho' && !data.NhaCungCap) {
    errors.push('Nhà cung cấp là bắt buộc cho giao dịch nhập kho');
  }

  if (!data.ChiTiet || data.ChiTiet.length === 0) {
    errors.push('Phải có ít nhất một mặt hàng trong giao dịch');
  }

  if (data.ChiTiet) {
    data.ChiTiet.forEach((detail: any, index: number) => {
      if (!detail.IDNguyenLieu) {
        errors.push(`Mặt hàng ${index + 1}: Mã nguyên liệu là bắt buộc`);
      }
      if (!detail.SoLuong || detail.SoLuong <= 0) {
        errors.push(`Mặt hàng ${index + 1}: Số lượng phải lớn hơn 0`);
      }
      if (data.LoaiGiaoDich === 'Nhập kho' && (!detail.DonGia || detail.DonGia <= 0)) {
        errors.push(`Mặt hàng ${index + 1}: Đơn giá phải lớn hơn 0 cho giao dịch nhập kho`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}; 