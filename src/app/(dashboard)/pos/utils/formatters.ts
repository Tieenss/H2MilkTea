// Currency formatting
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

// Date formatting
export const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
};
export const formatPoints = (points: number): string => {
  return new Intl.NumberFormat('vi-VN').format(points);
};
// Generate unique ID
export const generateId = (prefix: string): string => {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}${timestamp}${random}`;
};

// Format input currency
export const formatInputCurrency = (input: HTMLInputElement): number => {
  // Remove all non-digit characters
  let value = input.value.replace(/[^\d]/g, '');

  // Convert to number
  let number = parseInt(value) || 0;

  // Format number with Vietnamese locale
  let formattedValue = new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    maximumFractionDigits: 0
  }).format(number);

  // Update input value
  input.value = formattedValue;

  // Store numeric value in data attribute
  input.dataset.value = number.toString();

  return number;
};

// Get numeric value from formatted input
export const getNumericValue = (input: HTMLInputElement): number => {
  return parseInt(input.dataset.value || '0') || 0;
};

// Calculate totals
export const calculateTotal = (items: any[]): number => {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
};

// Format phone number (Vietnamese format)
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  return phone;
};

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};