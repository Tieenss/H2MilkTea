export const STOCKTAKE_TYPES = [
  { value: 'Định kỳ', label: 'Định kỳ' },
  { value: 'Đột xuất', label: 'Đột xuất' },
  { value: 'Theo yêu cầu', label: 'Theo yêu cầu' }
];

export const STOCKTAKE_STATUS = [
  { value: 'Chờ thực hiện', label: 'Chờ thực hiện' },
  { value: 'Đang thực hiện', label: 'Đang thực hiện' },
  { value: 'Hoàn thành', label: 'Hoàn thành' },
  { value: 'Đã hủy', label: 'Đã hủy' }
];

export const INITIAL_STOCKTAKE_FORM = {
  NgayKiemKe: '',
  LoaiKiemKe: '',
  NhanVienThucHien: '',
  TrangThai: '',
  GhiChu: '',
  ChiTiet: []
}; 