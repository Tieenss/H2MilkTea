export interface Stocktake {
  IDKiemKe: string;
  NgayKiemKe: string;
  LoaiKiemKe: 'Định kỳ' | 'Đột xuất' | 'Theo yêu cầu';
  NhanVienThucHien: string;
  TrangThai: 'Chờ thực hiện' | 'Đang thực hiện' | 'Hoàn thành' | 'Đã hủy';
  GhiChu: string;
  TongMatHang: number;
  TongGiaTri: number;
  ChiTiet: StocktakeDetail[];
}

export interface StocktakeDetail {
  IDNguyenLieu: string;
  TenNguyenLieu: string;
  SoLuongTheoSo: number;
  SoLuongThucTe: number;
  ChenhLech: number;
  DonViTinh: string;
  DonGia: number;
  GiaTriChenhLech: number;
  LyDo: string;
}

export interface StocktakeFormData {
  NgayKiemKe: string;
  LoaiKiemKe: string;
  NhanVienThucHien: string;
  TrangThai: string;
  GhiChu: string;
  ChiTiet: StocktakeDetail[];
}

export interface StocktakeStats {
  TongKiemKe: number;
  HoanThanh: number;
  DangThucHien: number;
  ChoThucHien: number;
  CoChenhLech: number;
  TyLeChinhXac: number;
  GiaTriTonKho: number;
  TongGiaTriChenhLech: number;
  SoMatHangChenhLech: number;
}

export interface StocktakeFilter {
  loaiKiemKe: string;
  trangThai: string;
  nhanVien: string;
  dateRange: any;
  searchTerm: string;
}

export interface StocktakeAlert {
  id: string;
  IDCanhBao: string;
  type: 'warning' | 'error' | 'info' | 'overdue' | 'low_stock' | 'discrepancy';
  LoaiCanhBao: string;
  title: string;
  TieuDe: string;
  message: string;
  NoiDung: string;
  date: string;
  NgayTao: string;
  NgayHetHan?: string;
  isRead: boolean;
  DaDoc: boolean;
}
