'use client';

import React from 'react';
import { X, Edit, AlertTriangle, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import type { Stocktake } from '../types/stocktake';

interface StocktakeDetailsModalProps {
  stocktake: Stocktake | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  canEdit: boolean;
}

export function StocktakeDetailsModal({
  stocktake,
  isOpen,
  onClose,
  onEdit,
  canEdit
}: StocktakeDetailsModalProps) {
  if (!stocktake) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hoàn thành':
        return 'bg-green-100 text-green-800';
      case 'Đang thực hiện':
        return 'bg-yellow-100 text-yellow-800';
      case 'Chờ thực hiện':
        return 'bg-blue-100 text-blue-800';
      case 'Đã hủy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    return status; // Return as is since we're using Vietnamese values
  };

  const getTypeText = (type: string) => {
    return type; // Return as is since we're using Vietnamese values
  };

  const getDiscrepancyColor = (discrepancy: number) => {
    if (discrepancy === 0) return 'text-green-600';
    if (discrepancy > 0) return 'text-red-600';
    return 'text-blue-600';
  };

  const getDiscrepancyIcon = (discrepancy: number) => {
    if (discrepancy === 0) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Chi tiết kiểm kê: {stocktake.IDKiemKe}</span>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  className="h-8 px-3"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Chỉnh sửa
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Thông tin cơ bản */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-sm text-gray-500 mb-1">Mã kiểm kê</h3>
              <p className="text-sm">{stocktake.IDKiemKe}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-gray-500 mb-1">Ngày kiểm kê</h3>
              <p className="text-sm">
                {new Date(stocktake.NgayKiemKe).toLocaleDateString('vi-VN')}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-gray-500 mb-1">Loại kiểm kê</h3>
              <p className="text-sm">{getTypeText(stocktake.LoaiKiemKe)}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-gray-500 mb-1">Nhân viên thực hiện</h3>
              <p className="text-sm">{stocktake.NhanVienThucHien}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-gray-500 mb-1">Trạng thái</h3>
              <Badge className={getStatusColor(stocktake.TrangThai)}>
                {getStatusText(stocktake.TrangThai)}
              </Badge>
            </div>
            <div>
              <h3 className="font-medium text-sm text-gray-500 mb-1">Tổng mặt hàng</h3>
              <p className="text-sm">{stocktake.TongMatHang}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-gray-500 mb-1">Tổng giá trị</h3>
              <p className="text-sm font-medium">
                {(stocktake.TongGiaTri || 0).toLocaleString('vi-VN')}đ
              </p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-gray-500 mb-1">Ghi chú</h3>
              <p className="text-sm">{stocktake.GhiChu || 'Không có'}</p>
            </div>
          </div>

          <Separator />

          {/* Chi tiết mặt hàng */}
          <div>
            <h3 className="font-medium text-lg mb-4">Chi tiết mặt hàng</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã nguyên liệu</TableHead>
                    <TableHead>Tên nguyên liệu</TableHead>
                    <TableHead>Số lượng hệ thống</TableHead>
                    <TableHead>Số lượng thực tế</TableHead>
                    <TableHead>Chênh lệch</TableHead>
                    <TableHead>Đơn giá</TableHead>
                    <TableHead>Giá trị chênh lệch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocktake.ChiTiet.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {item.IDNguyenLieu}
                      </TableCell>
                      <TableCell>
                        {item.TenNguyenLieu}
                      </TableCell>
                      <TableCell>
                        {item.SoLuongTheoSo}
                      </TableCell>
                      <TableCell>
                        {item.SoLuongThucTe}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getDiscrepancyIcon(item.ChenhLech)}
                          <span className={getDiscrepancyColor(item.ChenhLech)}>
                            {item.ChenhLech > 0 ? '+' : ''}{item.ChenhLech}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(item.DonGia || 0).toLocaleString('vi-VN')}đ
                      </TableCell>
                      <TableCell>
                        <span className={getDiscrepancyColor(item.ChenhLech)}>
                          {((item.ChenhLech || 0) * (item.DonGia || 0)).toLocaleString('vi-VN')}đ
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Tóm tắt chênh lệch */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-lg mb-3">Tóm tắt chênh lệch</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Mặt hàng có chênh lệch</p>
                <p className="text-lg font-medium text-red-600">
                  {stocktake.ChiTiet.filter(item => item.ChenhLech !== 0).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tổng giá trị chênh lệch</p>
                <p className="text-lg font-medium text-red-600">
                  {stocktake.ChiTiet
                    .reduce((sum, item) => sum + ((item.ChenhLech || 0) * (item.DonGia || 0)), 0)
                    .toLocaleString('vi-VN')}đ
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tỷ lệ chính xác</p>
                <p className="text-lg font-medium text-green-600">
                  {Math.round(
                    ((stocktake.ChiTiet.length - stocktake.ChiTiet.filter(item => item.ChenhLech !== 0).length) /
                      stocktake.ChiTiet.length) * 100
                  )}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 