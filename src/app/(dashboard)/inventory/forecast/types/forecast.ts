export interface ForecastData {
  IDDuBao: string;
  IDNguyenLieu: string;
  TenNguyenLieu: string;
  NgayDuBao: string;
  SoLuongDuBao: number;
  SoLuongThucTe: number;
  ChenhLech: number;
  TyLeChinhXac: number;
  PhuongPhapDuBao: string;
  DonViTinh: string;
  DonGia: number;
  GiaTriDuBao: number;
  GhiChu: string;
  TrangThai: 'Đang thực hiện' | 'Hoàn thành' | 'Cần điều chỉnh';
}

export interface ForecastStats {
  tongDuBao: number;
  duBaoChinhXac: number;
  duBaoCanDieuChinh: number;
  tyLeChinhXacTrungBinh: number;
  tongGiaTriDuBao: number;
  tongChenhLech: number;
}

export interface ForecastFilter {
  period: number;
  method: string;
  materialId: string;
  dateRange: {
    from: Date;
    to: Date;
  };
}

export interface ForecastSettings {
  period: number;
  method: string;
  confidenceLevel: number;
  seasonalAdjustment: boolean;
}

export interface SeasonalData {
  thang: string;
  soLuong: number;
  tyLe: number;
}

export interface DemandTrend {
  ngay: string;
  soLuong: number;
  duBao: number;
  thucTe: number;
} 