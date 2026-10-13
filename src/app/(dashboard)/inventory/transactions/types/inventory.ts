export interface InventoryTransaction {
  IDGiaoDich: string;
  LoaiGiaoDich: 'Nhập kho' | 'Xuất kho';
  NgayGiaoDich: string;
  NhaCungCap: string;
  NhanVienThucHien: string;
  GhiChu: string;
  TongTien: number;
  TrangThai: 'Chờ xử lý' | 'Đang xử lý' | 'Hoàn thành' | 'Đã hủy';
  ChiTiet: InventoryTransactionDetail[];
}

export interface InventoryTransactionDetail {
  IDNguyenLieu: string;
  TenNguyenLieu: string;
  SoLuong: number;
  DonViTinh: string;
  DonGia: number;
  ThanhTien: number;
}

export interface InventoryTransactionFormData {
  LoaiGiaoDich: 'Nhập kho' | 'Xuất kho';
  NhaCungCap: string;
  GhiChu: string;
  ChiTiet: InventoryTransactionDetail[];
}

export interface InventoryStats {
  tongNhap: number;
  tongXuat: number;
  tonKho: number;
  giaTriTonKho: number;
  soGiaoDichThang: number;
  soGiaoDichNgay: number;
}

export interface InventoryFilter {
  loaiGiaoDich: string;
  nhaCungCap: string;
  trangThai: string;
  dateRange: any;
  searchTerm: string;
} 