'use client';

import React from 'react';
import { Eye, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Stocktake } from '../types/stocktake';

interface StocktakeDataTableProps {
  stocktakes: Stocktake[];
  onViewDetails: (stocktake: Stocktake) => void;
  onEdit: (stocktake: Stocktake) => void;
  onDelete: (stocktakeId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export function StocktakeDataTable({
  stocktakes,
  onViewDetails,
  onEdit,
  onDelete,
  canEdit,
  canDelete
}: StocktakeDataTableProps) {
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

  const getDiscrepancyIcon = (hasDiscrepancy: boolean) => {
    if (hasDiscrepancy) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã kiểm kê</TableHead>
            <TableHead>Ngày kiểm kê</TableHead>
            <TableHead>Loại kiểm kê</TableHead>
            <TableHead>Nhân viên</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Số mặt hàng</TableHead>
            <TableHead>Tổng giá trị</TableHead>
            <TableHead>Chênh lệch</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stocktakes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                Không có dữ liệu kiểm kê nào
              </TableCell>
            </TableRow>
          ) : (
            stocktakes.map((stocktake) => (
              <TableRow key={stocktake.IDKiemKe}>
                <TableCell className="font-medium">
                  {stocktake.IDKiemKe}
                </TableCell>
                <TableCell>
                  {stocktake.NgayKiemKe ? 
                    (() => {
                      try {
                        return new Date(stocktake.NgayKiemKe.split('/').reverse().join('-')).toLocaleDateString('vi-VN');
                      } catch (error) {
                        return stocktake.NgayKiemKe; // Fallback to original string
                      }
                    })() 
                    : 'N/A'
                  }
                </TableCell>
                <TableCell>
                  {getTypeText(stocktake.LoaiKiemKe)}
                </TableCell>
                <TableCell>
                  {stocktake.NhanVienThucHien}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(stocktake.TrangThai)}>
                    {getStatusText(stocktake.TrangThai)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {stocktake.TongMatHang}
                </TableCell>
                <TableCell>
                  {(stocktake.TongGiaTri || 0).toLocaleString('vi-VN')}đ
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {getDiscrepancyIcon(stocktake.ChiTiet.some(item => item.ChenhLech !== 0))}
                    <span className={stocktake.ChiTiet.some(item => item.ChenhLech !== 0) ? 'text-red-600' : 'text-green-600'}>
                      {stocktake.ChiTiet.filter(item => item.ChenhLech !== 0).length}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(stocktake)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(stocktake)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(stocktake.IDKiemKe)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
} 