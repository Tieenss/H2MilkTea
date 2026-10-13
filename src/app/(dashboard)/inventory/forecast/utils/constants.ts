export const FORECAST_PERIODS = [
  { value: '7', label: '7 ngày' },
  { value: '14', label: '14 ngày' },
  { value: '30', label: '30 ngày' },
  { value: '60', label: '60 ngày' },
  { value: '90', label: '90 ngày' }
];

export const FORECAST_METHODS = [
  { value: 'moving_average', label: 'Trung bình động' },
  { value: 'exponential_smoothing', label: 'Làm mịn hàm mũ' },
  { value: 'linear_regression', label: 'Hồi quy tuyến tính' },
  { value: 'seasonal_decomposition', label: 'Phân rã theo mùa' },
  { value: 'arima', label: 'ARIMA' }
];

export const FORECAST_STATUS = [
  { value: 'Đang thực hiện', label: 'Đang thực hiện' },
  { value: 'Hoàn thành', label: 'Hoàn thành' },
  { value: 'Cần điều chỉnh', label: 'Cần điều chỉnh' }
];

export const ACCURACY_LEVELS = [
  { value: 'excellent', label: 'Xuất sắc (≥95%)', min: 95 },
  { value: 'good', label: 'Tốt (85-94%)', min: 85, max: 94 },
  { value: 'fair', label: 'Trung bình (75-84%)', min: 75, max: 84 },
  { value: 'poor', label: 'Kém (<75%)', max: 75 }
];

export const MATERIALS = [
  { id: 'NVL001', name: 'Cà phê hạt Robusta', unit: 'Kg' },
  { id: 'NVL002', name: 'Sữa tươi không đường', unit: 'Hộp 1L' },
  { id: 'NVL003', name: 'Đường cát trắng', unit: 'Kg' },
  { id: 'NVL004', name: 'Syrup Caramel', unit: 'Chai 750ml' },
  { id: 'NVL005', name: 'Kem tươi', unit: 'Hộp 500ml' },
  { id: 'NVL006', name: 'Bột Matcha Nhật Bản', unit: 'Túi 100g' }
];

export const SEASONS = [
  { name: 'Mùa xuân', months: [1, 2, 3], factor: 1.1 },
  { name: 'Mùa hè', months: [4, 5, 6], factor: 1.3 },
  { name: 'Mùa thu', months: [7, 8, 9], factor: 1.0 },
  { name: 'Mùa đông', months: [10, 11, 12], factor: 0.9 }
];

export const WEEKDAYS = [
  { name: 'Thứ 2', factor: 0.8 },
  { name: 'Thứ 3', factor: 0.9 },
  { name: 'Thứ 4', factor: 1.0 },
  { name: 'Thứ 5', factor: 1.1 },
  { name: 'Thứ 6', factor: 1.2 },
  { name: 'Thứ 7', factor: 1.3 },
  { name: 'Chủ nhật', factor: 1.4 }
]; 