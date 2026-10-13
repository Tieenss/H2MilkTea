export const INVENTORY_TYPES = [
  { value: 'Nhập kho', label: 'Nhập kho' },
  { value: 'Xuất kho', label: 'Xuất kho' }
];

export const INVENTORY_STATUS = [
  { value: 'Chờ xử lý', label: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'Đang xử lý', label: 'Đang xử lý', color: 'bg-blue-100 text-blue-800' },
  { value: 'Hoàn thành', label: 'Hoàn thành', color: 'bg-green-100 text-green-800' },
  { value: 'Đã hủy', label: 'Đã hủy', color: 'bg-red-100 text-red-800' }
];

export const INITIAL_TRANSACTION_FORM = {
  LoaiGiaoDich: 'Nhập kho' as const,
  NhaCungCap: '',
  GhiChu: '',
  ChiTiet: []
};

export const TRANSACTION_COLUMNS = [
  { key: 'IDGiaoDich', label: 'Mã giao dịch', sortable: true },
  { key: 'LoaiGiaoDich', label: 'Loại giao dịch', sortable: true },
  { key: 'NgayGiaoDich', label: 'Ngày giao dịch', sortable: true },
  { key: 'NhaCungCap', label: 'Nhà cung cấp', sortable: true },
  { key: 'NhanVienThucHien', label: 'Nhân viên thực hiện', sortable: true },
  { key: 'TongTien', label: 'Tổng tiền', sortable: true },
  { key: 'TrangThai', label: 'Trạng thái', sortable: true },
  { key: 'actions', label: 'Thao tác', sortable: false }
]; 