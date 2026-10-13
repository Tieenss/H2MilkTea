// utils/customerFormatters.ts
import { CUSTOMER_TYPES, CUSTOMER_STATUS } from './customerConstants';

// Hàm chuyển đổi định dạng ngày từ DD/MM/YYYY hoặc DD/MM/YYYY HH:mm:ss sang Date object
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

export const formatCustomerDate = (dateString: string): string => {
  if (!dateString) return 'Chưa cập nhật';
  
  const date = parseVietnameseDate(dateString);
  if (!date) return 'Không hợp lệ';
  
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

export const formatCustomerDateTime = (dateString: string): string => {
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

export const getCustomerTypeColor = (type: string): string => {
  const typeConfig = CUSTOMER_TYPES.find(t => t.value === type);
  return typeConfig?.color || 'bg-gray-100 text-gray-800';
};

export const getCustomerStatusColor = (status: string): string => {
  const statusConfig = CUSTOMER_STATUS.find(s => s.value === status);
  return statusConfig?.color || 'bg-gray-100 text-gray-800';
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

export const formatPoints = (points: number): string => {
  return new Intl.NumberFormat('vi-VN').format(points);
};

export const calculateCustomerTier = (points: number): string => {
  if (points >= 3000) return 'Khách kim cương';
  if (points >= 1000) return 'Khách VIP';
  return 'Khách thường';
};

export const getTimeAgo = (dateString: string): string => {
  if (!dateString || dateString.trim() === '') return 'Chưa có';

  const date = parseVietnameseDate(dateString);
  if (!date) return 'Không xác định';
  
  try {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    
    // Nếu ngày trong tương lai hoặc quá xa trong quá khứ
    if (diffInMs < 0) return 'Trong tương lai';
    
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return 'Hôm nay';
    } else if (diffInDays === 1) {
      return 'Hôm qua';
    } else if (diffInDays < 7) {
      return `${diffInDays} ngày trước`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} tuần trước`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return `${months} tháng trước`;
    } else {
      const years = Math.floor(diffInDays / 365);
      return `${years} năm trước`;
    }
  } catch {
    return 'Không xác định';
  }
};

export const validateCustomerData = (customer: any): string[] => {
  const errors: string[] = [];
  
  if (!customer['Tên khách hàng']) errors.push('Thiếu tên khách hàng');
  if (!customer['Số điện thoại']) errors.push('Thiếu số điện thoại');
  if (customer['Số điện thoại'] && !/^[0-9]{10,11}$/.test(customer['Số điện thoại'])) {
    errors.push('Số điện thoại không hợp lệ');
  }
  if (customer['Email'] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer['Email'])) {
    errors.push('Email không hợp lệ');
  }
  if (customer['Điểm tích lũy'] < 0) errors.push('Điểm tích lũy không hợp lệ');
  
  return errors;
};

export const generateCustomerId = (): string => {
  const now = new Date();
  const timestamp = now.getTime().toString().slice(-6);
  return `KH${timestamp}`;
};

export const calculateAge = (birthDate: string): number => {
  if (!birthDate) return 0;
  
  const birth = parseVietnameseDate(birthDate);
  if (!birth) return 0;
  
  try {
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age > 0 ? age : 0;
  } catch {
    return 0;
  }
};

export const formatAge = (birthDate: string): string => {
  const age = calculateAge(birthDate);
  return age > 0 ? `${age} tuổi` : 'Chưa có';
};

export const getCustomerLevel = (totalSpending: number): string => {
  if (totalSpending >= 50000000) return 'Khách kim cương';
  if (totalSpending >= 20000000) return 'Khách VIP';
  if (totalSpending >= 5000000) return 'Khách thân thiết';
  return 'Khách thường';
};

export const getLoyaltyMultiplier = (customerType: string): number => {
  switch (customerType) {
    case 'Khách kim cương': return 2;
    case 'Khách VIP': return 1.5;
    default: return 1;
  }
};

export const calculatePointsFromSpending = (amount: number, customerType: string): number => {
  const basePoints = Math.floor(amount / 1000); // 1 điểm cho mỗi 1,000 VND
  const multiplier = getLoyaltyMultiplier(customerType);
  return Math.floor(basePoints * multiplier);
};

export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as XXX-XXX-XXXX or XXXX-XXX-XXX for Vietnamese numbers
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone;
};

export const formatGender = (gender: string): string => {
  const genderMap: Record<string, string> = {
    'Nam': '👨 Nam',
    'Nữ': '👩 Nữ',
    'Khác': '🔄 Khác'
  };
  return genderMap[gender] || gender;
};

export const exportCustomerData = (customers: any[]): any[] => {
  return customers.map(customer => ({
    'Mã khách hàng': customer.IDKHACHHANG,
    'Tên khách hàng': customer['Tên khách hàng'],
    'Số điện thoại': customer['Số điện thoại'],
    'Email': customer['Email'],
    'Địa chỉ': customer['Địa chỉ'],
    'Ngày sinh': formatCustomerDate(customer['Ngày sinh']),
    'Tuổi': formatAge(customer['Ngày sinh']),
    'Giới tính': customer['Giới tính'],
    'Loại khách hàng': customer['Loại khách hàng'],
    'Điểm tích lũy': formatPoints(customer['Điểm tích lũy']),
    'Tổng chi tiêu': formatCurrency(customer['Tổng chi tiêu']),
    'Lần mua cuối': formatCustomerDateTime(customer['Lần mua cuối']),
    'Trạng thái': customer['Trạng thái'],
    'Ngày tạo': formatCustomerDateTime(customer['Ngày tạo']),
    'Ghi chú': customer['Ghi chú'] || ''
  }));
};