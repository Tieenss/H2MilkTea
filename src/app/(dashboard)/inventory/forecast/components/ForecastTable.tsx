import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ForecastData } from '../types/forecast';
import { formatCurrency, formatPercentage, getAccuracyBadge, getStatusColor } from '../utils/formatters';

interface ForecastTableProps {
  data: ForecastData[];
  loading: boolean;
  canEdit: boolean;
}

export function ForecastTable({ data, loading, canEdit }: ForecastTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Không có dữ liệu dự báo</h3>
          <p className="text-sm text-muted-foreground">
            Tạo dự báo đầu tiên để bắt đầu phân tích
          </p>
        </div>
      </div>
    );
  }

  const getTrendIcon = (chenhLech: number) => {
    if (chenhLech > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (chenhLech < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID Dự báo</TableHead>
            <TableHead>Nguyên liệu</TableHead>
            <TableHead>Ngày dự báo</TableHead>
            <TableHead>Số lượng dự báo</TableHead>
            <TableHead>Số lượng thực tế</TableHead>
            <TableHead>Chênh lệch</TableHead>
            <TableHead>Tỷ lệ chính xác</TableHead>
            <TableHead>Phương pháp</TableHead>
            <TableHead>Giá trị dự báo</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((forecast) => (
            <TableRow key={forecast.IDDuBao}>
              <TableCell className="font-medium">
                {forecast.IDDuBao}
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{forecast.TenNguyenLieu}</div>
                  <div className="text-sm text-muted-foreground">
                    {forecast.DonViTinh}
                  </div>
                </div>
              </TableCell>
              <TableCell>{forecast.NgayDuBao}</TableCell>
              <TableCell>
                <div className="font-medium">
                  {forecast.SoLuongDuBao.toFixed(2)}
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">
                  {forecast.SoLuongThucTe > 0 ? forecast.SoLuongThucTe.toFixed(2) : '-'}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {getTrendIcon(forecast.ChenhLech)}
                  <span className={`font-medium ${
                    forecast.ChenhLech > 0 ? 'text-green-600' : 
                    forecast.ChenhLech < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {forecast.ChenhLech > 0 ? '+' : ''}{forecast.ChenhLech.toFixed(2)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getAccuracyBadge(forecast.TyLeChinhXac)}>
                  {formatPercentage(forecast.TyLeChinhXac)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {forecast.PhuongPhapDuBao}
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">
                  {formatCurrency(forecast.GiaTriDuBao)}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(forecast.TrangThai)}>
                  {forecast.TrangThai}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 