import type { ForecastData } from '../types/forecast';

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

// Format percentage
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Format date
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN');
};

// Get accuracy level color
export const getAccuracyColor = (accuracy: number): string => {
  if (accuracy >= 95) return 'text-green-600';
  if (accuracy >= 85) return 'text-blue-600';
  if (accuracy >= 75) return 'text-yellow-600';
  return 'text-red-600';
};

// Get accuracy level badge
export const getAccuracyBadge = (accuracy: number): string => {
  if (accuracy >= 95) return 'bg-green-100 text-green-800';
  if (accuracy >= 85) return 'bg-blue-100 text-blue-800';
  if (accuracy >= 75) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

// Get status color
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Hoàn thành':
      return 'bg-green-100 text-green-800';
    case 'Đang thực hiện':
      return 'bg-blue-100 text-blue-800';
    case 'Cần điều chỉnh':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Calculate forecast accuracy
export const calculateAccuracy = (forecast: number, actual: number): number => {
  if (actual === 0) return 0;
  return Math.max(0, 100 - Math.abs((forecast - actual) / actual) * 100);
};

// Calculate moving average
export const calculateMovingAverage = (data: number[], period: number): number => {
  if (data.length < period) return 0;
  const recentData = data.slice(-period);
  return recentData.reduce((sum, value) => sum + value, 0) / period;
};

// Calculate exponential smoothing
export const calculateExponentialSmoothing = (data: number[], alpha: number = 0.3): number => {
  if (data.length === 0) return 0;
  if (data.length === 1) return data[0];
  
  let smoothed = data[0];
  for (let i = 1; i < data.length; i++) {
    smoothed = alpha * data[i] + (1 - alpha) * smoothed;
  }
  return smoothed;
};

// Calculate seasonal factor
export const calculateSeasonalFactor = (month: number): number => {
  const seasons = [
    { months: [1, 2, 3], factor: 1.1 },   // Mùa xuân
    { months: [4, 5, 6], factor: 1.3 },   // Mùa hè
    { months: [7, 8, 9], factor: 1.0 },   // Mùa thu
    { months: [10, 11, 12], factor: 0.9 } // Mùa đông
  ];
  
  const season = seasons.find(s => s.months.includes(month));
  return season ? season.factor : 1.0;
};

// Calculate weekday factor
export const calculateWeekdayFactor = (weekday: number): number => {
  const factors = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4]; // Thứ 2 đến Chủ nhật
  return factors[weekday] || 1.0;
};

// Generate forecast data
export const generateForecastData = (
  materialId: string,
  materialName: string,
  historicalData: number[],
  period: number,
  method: string
): ForecastData[] => {
  const forecasts: ForecastData[] = [];
  const today = new Date();
  
  for (let i = 1; i <= period; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(today.getDate() + i);
    
    let forecastValue = 0;
    switch (method) {
      case 'moving_average':
        forecastValue = calculateMovingAverage(historicalData, 7);
        break;
      case 'exponential_smoothing':
        forecastValue = calculateExponentialSmoothing(historicalData);
        break;
      case 'linear_regression':
        forecastValue = calculateLinearRegression(historicalData, i);
        break;
      default:
        forecastValue = calculateMovingAverage(historicalData, 7);
    }
    
    // Apply seasonal and weekday adjustments
    const seasonalFactor = calculateSeasonalFactor(forecastDate.getMonth() + 1);
    const weekdayFactor = calculateWeekdayFactor(forecastDate.getDay());
    forecastValue *= seasonalFactor * weekdayFactor;
    
    const forecast: ForecastData = {
      IDDuBao: `DB${String(i).padStart(3, '0')}`,
      IDNguyenLieu: materialId,
      TenNguyenLieu: materialName,
      NgayDuBao: forecastDate.toLocaleDateString('vi-VN'),
      SoLuongDuBao: Math.round(forecastValue * 100) / 100,
      SoLuongThucTe: 0,
      ChenhLech: 0,
      TyLeChinhXac: 0,
      PhuongPhapDuBao: method,
      DonViTinh: 'Kg',
      DonGia: 45000,
      GiaTriDuBao: Math.round(forecastValue * 45000),
      GhiChu: `Dự báo ${method} cho ${materialName}`,
      TrangThai: 'Đang thực hiện'
    };
    
    forecasts.push(forecast);
  }
  
  return forecasts;
};

// Calculate linear regression
export const calculateLinearRegression = (data: number[], periods: number): number => {
  if (data.length < 2) return data[0] || 0;
  
  const n = data.length;
  const x = Array.from({ length: n }, (_, i) => i + 1);
  const y = data;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return slope * (n + periods) + intercept;
};

// Export forecast data to CSV
export const exportForecastData = (forecasts: ForecastData[]) => {
  const headers = [
    'ID Dự báo',
    'ID Nguyên liệu',
    'Tên Nguyên liệu',
    'Ngày dự báo',
    'Số lượng dự báo',
    'Số lượng thực tế',
    'Chênh lệch',
    'Tỷ lệ chính xác',
    'Phương pháp dự báo',
    'Đơn vị tính',
    'Đơn giá',
    'Giá trị dự báo',
    'Ghi chú',
    'Trạng thái'
  ];

  const csvContent = [
    headers.join(','),
    ...forecasts.map(forecast => [
      forecast.IDDuBao,
      forecast.IDNguyenLieu,
      `"${forecast.TenNguyenLieu}"`,
      forecast.NgayDuBao,
      forecast.SoLuongDuBao,
      forecast.SoLuongThucTe,
      forecast.ChenhLech,
      forecast.TyLeChinhXac,
      forecast.PhuongPhapDuBao,
      forecast.DonViTinh,
      forecast.DonGia,
      forecast.GiaTriDuBao,
      `"${forecast.GhiChu}"`,
      forecast.TrangThai
    ].join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `du-bao-nguyen-lieu-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}; 