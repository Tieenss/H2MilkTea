// utils/invoiceFormatters.ts
import { INVOICE_STATUS } from './invoiceConstants';

// Helper function to parse Vietnamese date format (DD/MM/YYYY HH:mm:ss)
const parseVietnameseDate = (dateString: string): Date | null => {
  if (!dateString || dateString.trim() === '') return null;
  
  try {
    // Nếu đã là định dạng ISO hoặc có thể parse trực tiếp
    const directParse = new Date(dateString);
    if (!isNaN(directParse.getTime())) {
      return directParse;
    }
    
    // Xử lý định dạng DD/MM/YYYY hoặc DD/MM/YYYY HH:mm:ss
    const parts = dateString.trim().split(' ');
    const datePart = parts[0];
    const timePart = parts[1] || '00:00:00';
    
    const [day, month, year] = datePart.split('/').map(num => parseInt(num, 10));
    const [hour, minute, second] = timePart.split(':').map(num => parseInt(num, 10));
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return null;
    }
    
    const date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

export const formatInvoiceDate = (dateString: string): string => {
  if (!dateString) return 'Chưa cập nhật';
  
  const date = parseVietnameseDate(dateString);
  if (!date) return 'Không hợp lệ';
  
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

export const formatInvoiceDateTime = (dateString: string): string => {
  if (!dateString) return 'Chưa cập nhật';
  
  const date = parseVietnameseDate(dateString);
  if (!date) return 'Không hợp lệ';
  
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatShortDate = (dateString: string): string => {
  if (!dateString) return 'Chưa cập nhật';
  
  const date = parseVietnameseDate(dateString);
  if (!date) return 'Không hợp lệ';
  
  return date.toLocaleDateString('vi-VN');
};

export const formatDateTime = (dateString: string): string => {
  if (!dateString) return 'Chưa cập nhật';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return 'Không hợp lệ';
  }
};

export const getStatusColor = (status: string): string => {
  const statusConfig = INVOICE_STATUS.find(s => s.value === status);
  return statusConfig?.color || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
};

export const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'Chờ xác nhận':
      return '⏳';
    case 'Đã xác nhận':
      return '✅';
    case 'Đã thanh toán':
      return '💰';
    case 'Đã hủy':
      return '❌';
    default:
      return '📄';
  }
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

export const formatNumber = (number: number): string => {
  return new Intl.NumberFormat('vi-VN').format(number);
};

export const calculateInvoiceTotal = (invoice: any): number => {
  return invoice['Tổng tiền'] + invoice['VAT'] - invoice['Giảm giá'];
};

export const calculateSubtotal = (details: any[]): number => {
  return details.reduce((sum, detail) => sum + detail['Thành tiền'], 0);
};

export const formatPaymentMethod = (method: string): string => {
  const methods: Record<string, string> = {
    'Tiền mặt': '💵 Tiền mặt',
    'Chuyển khoản': '🏦 Chuyển khoản',
    'Thẻ': '💳 Thẻ',
    'VietQR': '📱 VietQR'
  };
  return methods[method] || method;
};

export const getTimeAgo = (dateString: string): string => {
  if (!dateString) return 'Không xác định';

  const date = parseVietnameseDate(dateString);
  if (!date) return 'Không hợp lệ';

  try {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Vừa xong';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} phút trước`;
    } else if (diffInHours < 24) {
      return `${diffInHours} giờ trước`;
    } else if (diffInDays === 1) {
      return 'Hôm qua';
    } else if (diffInDays < 7) {
      return `${diffInDays} ngày trước`;
    } else {
      return formatShortDate(dateString);
    }
  } catch {
    return 'Không hợp lệ';
  }
};

export const formatTableName = (tableId: string): string => {
  if (!tableId) return 'Chưa chọn bàn';
  
  // Extract table name from ID if needed
  if (tableId.includes('_')) {
    return tableId.split('_')[1] || tableId;
  }
  
  return tableId;
};

export const generateInvoiceId = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const timestamp = now.getTime().toString().slice(-6);
  
  return `HD${year}${month}${day}${timestamp}`;
};

export const parseInvoiceDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  
  try {
    return new Date(dateString);
  } catch {
    return null;
  }
};

export const isToday = (dateString: string): boolean => {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  } catch {
    return false;
  }
};

export const isThisWeek = (dateString: string): boolean => {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    
    return date >= weekStart && date <= weekEnd;
  } catch {
    return false;
  }
};

export const isThisMonth = (dateString: string): boolean => {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    const today = new Date();
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  } catch {
    return false;
  }
};

// Format percentage
export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
};

// Format file size for export
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Validate invoice data
export const validateInvoiceData = (invoice: any): string[] => {
  const errors: string[] = [];
  
  if (!invoice.IDBAN) errors.push('Thiếu thông tin bàn');
  if (!invoice['Nhân viên']) errors.push('Thiếu thông tin nhân viên');
  if (!invoice['Khách hàng']) errors.push('Thiếu thông tin khách hàng');
  if (invoice['Tổng tiền'] < 0) errors.push('Tổng tiền không hợp lệ');
  if (invoice['VAT'] < 0) errors.push('VAT không hợp lệ');
  if (invoice['Giảm giá'] < 0) errors.push('Giảm giá không hợp lệ');
  if (invoice['Khách trả'] < 0) errors.push('Số tiền khách trả không hợp lệ');
  
  return errors;
};

// Format invoice summary text
export const formatInvoiceSummary = (invoice: any): string => {
  const total = calculateInvoiceTotal(invoice);
  return `${invoice.IDHOADON} - ${formatCurrency(total)} - ${invoice['Trạng thái']}`;
};

// Export helpers
export const prepareExportData = (invoices: any[]): any[] => {
  return invoices.map(invoice => ({
    'Mã hóa đơn': invoice.IDHOADON,
    'Ngày tạo': formatInvoiceDate(invoice['Ngày']),
    'Bàn': invoice.IDBAN,
    'Khách hàng': invoice['Khách hàng'],
    'Nhân viên': invoice['Nhân viên'],
    'Tổng tiền hàng': formatNumber(invoice['Tổng tiền']),
    'VAT': formatNumber(invoice['VAT']),
    'Giảm giá': formatNumber(invoice['Giảm giá']),
    'Thành tiền': formatNumber(calculateInvoiceTotal(invoice)),
    'Khách trả': formatNumber(invoice['Khách trả']),
    'Tiền thừa': formatNumber(invoice['Tiền thừa']),
    'Loại thanh toán': invoice['Loại thanh toán'],
    'Trạng thái': invoice['Trạng thái'],
    'Ghi chú': invoice['Ghi chú'] || ''
  }));
};