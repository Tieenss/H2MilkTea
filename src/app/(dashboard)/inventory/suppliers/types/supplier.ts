export interface Supplier {
  IDNhaCungCap: string;
  TenNhaCungCap: string;
  MaSoThue: string;
  DiaChi: string;
  SoDienThoai: string;
  Email: string;
  NguoiDaiDien: string;
  SoDienThoaiLienHe: string;
  EmailLienHe: string;
  NgayHopTac: string;
  TrangThai: 'Đang hợp tác' | 'Tạm ngưng' | 'Ngừng hợp tác';
  GhiChu: string;
  DanhGia: number;
  ThoiGianGiaoHang: string;
  PhuongThucThanhToan: string;
  LichSuDatHang: OrderHistory[];
}

export interface OrderHistory {
  NgayDat: string;
  TongTien: number;
  TrangThai: string;
}

export interface SupplierFormData {
  TenNhaCungCap: string;
  MaSoThue: string;
  DiaChi: string;
  SoDienThoai: string;
  Email: string;
  NguoiDaiDien: string;
  SoDienThoaiLienHe: string;
  EmailLienHe: string;
  NgayHopTac: string;
  TrangThai: string;
  GhiChu: string;
  DanhGia: number;
  ThoiGianGiaoHang: string;
  PhuongThucThanhToan: string;
}

export interface SupplierStats {
  tongNhaCungCap: number;
  dangHopTac: number;
  tamNgung: number;
  ngungHopTac: number;
  tongGiaTriDatHang: number;
  trungBinhDanhGia: number;
}

export interface SupplierFilter {
  trangThai: string;
  danhGia: string;
  searchTerm: string;
} 