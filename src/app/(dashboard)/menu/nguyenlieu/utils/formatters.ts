/**
 * Utilities for formatting data display
 */

// Currency formatter for Vietnamese Dong
export const formatCurrency = (amount: number | string): string => {
  if (!amount && amount !== 0) return '0 ₫';
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '0 ₫';
  
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numAmount);
};

// Number formatter with thousand separators
export const formatNumber = (value: number | string): string => {
  if (!value && value !== 0) return '0';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '0';
  
  return new Intl.NumberFormat('vi-VN').format(numValue);
};

// Parse number from formatted string (remove commas, spaces, etc.)
export const parseNumber = (value: string): number => {
  if (!value) return 0;
  
  // Remove all non-digit characters except decimal point and minus sign
  const cleaned = value.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Parse currency string to number
export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  
  // Remove currency symbols, spaces, and commas
  const cleaned = value.replace(/[₫,\s]/g, '').replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Format percentage
export const formatPercentage = (value: number, decimals: number = 1): string => {
  if (!value && value !== 0) return '0%';
  return `${value.toFixed(decimals)}%`;
};

// Calculate profit margin percentage
export const calculateProfitMargin = (sellingPrice: number, costPrice: number): number => {
  if (!costPrice || costPrice === 0) return 0;
  return ((sellingPrice - costPrice) / costPrice) * 100;
};

// Calculate profit amount
export const calculateProfit = (sellingPrice: number, costPrice: number): number => {
  return (sellingPrice || 0) - (costPrice || 0);
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

// Format date for Vietnamese locale
export const formatDate = (dateString: string | Date): string => {
  if (!dateString) return 'Chưa cập nhật';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return 'Không hợp lệ';
    
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch {
    return 'Không hợp lệ';
  }
};

// Format datetime for Vietnamese locale
export const formatDateTime = (dateString: string | Date): string => {
  if (!dateString) return 'Chưa cập nhật';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return 'Không hợp lệ';
    
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Không hợp lệ';
  }
};

// Format phone number for Vietnamese format
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return 'Chưa cập nhật';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Vietnamese phone number patterns
  if (cleaned.length === 10) {
    // Mobile: 0xxx xxx xxx
    return cleaned.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  } else if (cleaned.length === 11 && cleaned.startsWith('84')) {
    // International format: +84 xxx xxx xxx
    return `+${cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4')}`;
  } else if (cleaned.length === 9 && !cleaned.startsWith('0')) {
    // Mobile without leading 0: xxx xxx xxx
    return `0${cleaned.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}`;
  }
  
  return phone; // Return original if doesn't match patterns
};

// Format product code/ID
export const formatProductCode = (code: string): string => {
  if (!code) return '';
  return code.toUpperCase().trim();
};

// Truncate text with ellipsis
export const truncateText = (text: string, maxLength: number = 50): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

// Format status badge color
export const getStatusColor = (status: string): { bg: string; text: string } => {
  const statusColors = {
    'Hoạt động': { bg: 'bg-green-100', text: 'text-green-800' },
    'Ngừng kinh doanh': { bg: 'bg-gray-100', text: 'text-gray-800' },
    'Hết hàng': { bg: 'bg-red-100', text: 'text-red-800' },
    'Sắp hết hàng': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    'Đang nhập': { bg: 'bg-blue-100', text: 'text-blue-800' },
    default: { bg: 'bg-gray-100', text: 'text-gray-800' }
  };
  
  return statusColors[status as keyof typeof statusColors] || statusColors.default;
};

// Format inventory status
export const formatInventoryStatus = (quantity: number, minStock: number = 0): {
  status: string;
  color: { bg: string; text: string };
} => {
  if (quantity <= 0) {
    return {
      status: 'Hết hàng',
      color: { bg: 'bg-red-100', text: 'text-red-800' }
    };
  } else if (quantity <= minStock) {
    return {
      status: 'Sắp hết hàng',
      color: { bg: 'bg-yellow-100', text: 'text-yellow-800' }
    };
  } else {
    return {
      status: 'Còn hàng',
      color: { bg: 'bg-green-100', text: 'text-green-800' }
    };
  }
};

// Format compact number (1K, 1M, etc.)
export const formatCompactNumber = (value: number): string => {
  if (!value && value !== 0) return '0';
  
  const formatter = new Intl.NumberFormat('vi-VN', {
    notation: 'compact',
    maximumFractionDigits: 1
  });
  
  return formatter.format(value);
};

// Format price range
export const formatPriceRange = (minPrice: number, maxPrice: number): string => {
  if (!minPrice && !maxPrice) return 'Chưa có giá';
  if (minPrice === maxPrice) return formatCurrency(minPrice);
  return `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`;
};

// Validate and format decimal input
export const formatDecimalInput = (value: string, decimals: number = 2): string => {
  // Remove non-numeric characters except decimal point
  let cleaned = value.replace(/[^\d.]/g, '');
  
  // Ensure only one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Limit decimal places
  if (parts[1] && parts[1].length > decimals) {
    cleaned = parts[0] + '.' + parts[1].substring(0, decimals);
  }
  
  return cleaned;
};

// Format search highlight
export const highlightSearchTerm = (text: string, searchTerm: string): string => {
  if (!searchTerm.trim()) return text;
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
};

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date: string | Date): string => {
  if (!date) return '';
  
  try {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} tháng trước`;
    return `${Math.floor(diffInSeconds / 31536000)} năm trước`;
  } catch {
    return '';
  }
};
export const convertToBaseUnit = (quantity: number, conversionRatio: number): number => {
  return quantity * conversionRatio;
};

export const convertFromBaseUnit = (baseQuantity: number, conversionRatio: number): number => {
  return baseQuantity / conversionRatio;
};

export const formatConversion = (quantity: number, unit: string, baseQuantity: number, baseUnit: string): string => {
  return `${formatNumber(quantity)} ${unit} = ${formatNumber(baseQuantity)} ${baseUnit}`;
};

export const calculateMaterialNeed = (
  recipeAmount: number, 
  recipeUnit: string, 
  materialConversionRatio: number,
  materialBaseUnit: string
): { baseAmount: number; displayText: string } => {
  const baseAmount = recipeAmount * materialConversionRatio;
  const displayText = `${formatNumber(recipeAmount)} ${recipeUnit} = ${formatNumber(baseAmount)} ${materialBaseUnit}`;
  
  return { baseAmount, displayText };
};
// Export all formatters as a single object for easier importing
export const formatters = {
  currency: formatCurrency,
  number: formatNumber,
  parseNumber,
  parseCurrency,
  percentage: formatPercentage,
  calculateProfitMargin,
  calculateProfit,
  fileSize: formatFileSize,
  date: formatDate,
  dateTime: formatDateTime,
  phoneNumber: formatPhoneNumber,
  productCode: formatProductCode,
  truncateText,
  getStatusColor,
  inventoryStatus: formatInventoryStatus,
  compactNumber: formatCompactNumber,
  priceRange: formatPriceRange,
  decimalInput: formatDecimalInput,
  highlightSearchTerm,
  relativeTime: formatRelativeTime ,
  convertToBaseUnit,
  convertFromBaseUnit,
  formatConversion,
  calculateMaterialNeed
  
};

export default formatters;