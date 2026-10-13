import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Trash2, Star, Phone, Mail, Building2 } from 'lucide-react';
import type { Supplier } from '../types/supplier';
import { formatCurrency, formatRating, getStatusColor, calculateTotalOrderValue } from '../utils/formatters';

interface SupplierDataTableProps {
  suppliers: Supplier[];
  loading: boolean;
  onViewDetails: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplierId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export function SupplierDataTable({
  suppliers,
  loading,
  onViewDetails,
  onEdit,
  onDelete,
  canEdit,
  canDelete
}: SupplierDataTableProps) {
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

  if (suppliers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Không có nhà cung cấp nào</h3>
          <p className="text-sm text-muted-foreground">
            Bắt đầu bằng cách thêm nhà cung cấp đầu tiên
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Tên nhà cung cấp</TableHead>
            <TableHead>Mã số thuế</TableHead>
            <TableHead>Người đại diện</TableHead>
            <TableHead>Liên hệ</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Đánh giá</TableHead>
            <TableHead>Tổng đặt hàng</TableHead>
            <TableHead>Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow key={supplier.IDNhaCungCap}>
              <TableCell className="font-medium">
                {supplier.IDNhaCungCap}
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{supplier.TenNhaCungCap}</div>
                  <div className="text-sm text-muted-foreground">
                    {supplier.DiaChi}
                  </div>
                </div>
              </TableCell>
              <TableCell>{supplier.MaSoThue}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{supplier.NguoiDaiDien}</div>
                  <div className="text-sm text-muted-foreground">
                    {supplier.SoDienThoaiLienHe}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-sm">
                    <Phone className="h-3 w-3" />
                    {supplier.SoDienThoai}
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Mail className="h-3 w-3" />
                    {supplier.Email}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(supplier.TrangThai)}>
                  {supplier.TrangThai}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <span className="text-sm">{formatRating(supplier.DanhGia)}</span>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">
                    {formatCurrency(calculateTotalOrderValue(supplier))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {supplier.LichSuDatHang.length} đơn hàng
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(supplier)}
                    title="Xem chi tiết"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(supplier)}
                      title="Chỉnh sửa"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(supplier.IDNhaCungCap)}
                      title="Xóa"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 