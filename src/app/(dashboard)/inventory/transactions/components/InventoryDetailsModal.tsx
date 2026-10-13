import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, X } from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor, getTransactionTypeColor } from '../utils/formatters';
import { InventoryTransaction } from '../types/inventory';

interface InventoryDetailsModalProps {
  transaction: InventoryTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export const InventoryDetailsModal: React.FC<InventoryDetailsModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onEdit
}) => {
  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Chi tiết giao dịch kho</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-1" />
                Chỉnh sửa
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Thông tin chi tiết về giao dịch kho
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Mã giao dịch</label>
                <p className="text-lg font-semibold">{transaction.IDGiaoDich}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Loại giao dịch</label>
                <div className="mt-1">
                  <Badge className={getTransactionTypeColor(transaction.LoaiGiaoDich)}>
                    {transaction.LoaiGiaoDich}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Ngày giao dịch</label>
                <p className="text-lg">{formatDate(transaction.NgayGiaoDich)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Trạng thái</label>
                <div className="mt-1">
                  <Badge className={getStatusColor(transaction.TrangThai)}>
                    {transaction.TrangThai}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Nhà cung cấp</label>
                <p className="text-lg">{transaction.NhaCungCap || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Nhân viên thực hiện</label>
                <p className="text-lg">{transaction.NhanVienThucHien}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Tổng tiền</label>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(transaction.TongTien)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Ghi chú</label>
                <p className="text-lg">{transaction.GhiChu || 'Không có ghi chú'}</p>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Chi tiết mặt hàng</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã nguyên liệu</TableHead>
                    <TableHead>Tên nguyên liệu</TableHead>
                    <TableHead className="text-right">Số lượng</TableHead>
                    <TableHead>Đơn vị tính</TableHead>
                    <TableHead className="text-right">Đơn giá</TableHead>
                    <TableHead className="text-right">Thành tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transaction.ChiTiet.map((detail, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {detail.IDNguyenLieu}
                      </TableCell>
                      <TableCell>{detail.TenNguyenLieu}</TableCell>
                      <TableCell className="text-right">
                        {detail.SoLuong.toLocaleString()}
                      </TableCell>
                      <TableCell>{detail.DonViTinh}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(detail.DonGia)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(detail.ThanhTien)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Tổng cộng</span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(transaction.TongTien)}
              </span>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              {transaction.ChiTiet.length} mặt hàng
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 