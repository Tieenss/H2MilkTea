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
    <div className="w-full rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap px-2.5 lg:px-3">ID</TableHead>
            <TableHead className="min-w-[160px] px-2.5 lg:px-3">Tên nhà cung cấp</TableHead>
            <TableHead className="whitespace-nowrap px-2.5 lg:px-3">Mã số thuế</TableHead>
            <TableHead className="min-w-[130px] px-2.5 lg:px-3">Người đại diện</TableHead>
            <TableHead className="min-w-[155px] px-2.5 lg:px-3">Liên hệ</TableHead>
            <TableHead className="whitespace-nowrap px-2.5 lg:px-3">Trạng thái</TableHead>
            <TableHead className="whitespace-nowrap px-2.5 lg:px-3">Đánh giá</TableHead>
            <TableHead className="whitespace-nowrap px-2.5 lg:px-3">Tổng đặt hàng</TableHead>
            <TableHead className="whitespace-nowrap px-2.5 lg:px-3 text-right sticky right-0 bg-white dark:bg-slate-900 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
              Thao tác
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow key={supplier.IDNhaCungCap}>
              <TableCell className="font-medium whitespace-nowrap px-2.5 lg:px-3 py-2.5">
                {supplier.IDNhaCungCap}
              </TableCell>
              <TableCell className="px-2.5 lg:px-3 py-2.5">
                <div>
                  <div className="font-medium">{supplier.TenNhaCungCap}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {supplier.DiaChi}
                  </div>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap px-2.5 lg:px-3 py-2.5">{supplier.MaSoThue}</TableCell>
              <TableCell className="px-2.5 lg:px-3 py-2.5">
                <div>
                  <div className="font-medium whitespace-nowrap">{supplier.NguoiDaiDien}</div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {supplier.SoDienThoaiLienHe}
                  </div>
                </div>
              </TableCell>
              <TableCell className="px-2.5 lg:px-3 py-2.5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-xs whitespace-nowrap">
                    <Phone className="h-3 w-3 shrink-0" />
                    {supplier.SoDienThoai}
                  </div>
                  <div className="flex items-center gap-1 text-xs whitespace-nowrap">
                    <Mail className="h-3 w-3 shrink-0" />
                    {supplier.Email}
                  </div>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap px-2.5 lg:px-3 py-2.5">
                <Badge className={`${getStatusColor(supplier.TrangThai)} whitespace-nowrap`}>
                  {supplier.TrangThai}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap px-2.5 lg:px-3 py-2.5">
                <div className="flex items-center gap-1">
                  <span className="text-sm">{formatRating(supplier.DanhGia)}</span>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap px-2.5 lg:px-3 py-2.5">
                <div>
                  <div className="font-medium">
                    {formatCurrency(calculateTotalOrderValue(supplier))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(supplier.LichSuDatHang || []).length} đơn hàng
                  </div>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap px-2.5 lg:px-3 py-2.5 sticky right-0 bg-white dark:bg-slate-900 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                <div className="flex items-center justify-end gap-1">
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