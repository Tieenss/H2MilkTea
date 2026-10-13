import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  User, 
  Calendar, 
  Star, 
  Truck, 
  CreditCard, 
  FileText,
  Edit,
  Download
} from 'lucide-react';
import type { Supplier } from '../types/supplier';
import { formatCurrency, formatRating, getStatusColor, calculateTotalOrderValue, getRecentOrders, exportOrderHistory } from '../utils/formatters';

interface SupplierDetailsModalProps {
  supplier: Supplier;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  canEdit: boolean;
}

export function SupplierDetailsModal({
  supplier,
  isOpen,
  onClose,
  onEdit,
  canEdit
}: SupplierDetailsModalProps) {
  const recentOrders = getRecentOrders(supplier);
  const totalOrderValue = calculateTotalOrderValue(supplier);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Chi tiết Nhà cung cấp
          </DialogTitle>
          <DialogDescription>
            Thông tin chi tiết và lịch sử đặt hàng của {supplier.TenNhaCungCap}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with actions */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{supplier.TenNhaCungCap}</h2>
              <p className="text-muted-foreground">ID: {supplier.IDNhaCungCap}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportOrderHistory(supplier)}
              >
                <Download className="h-4 w-4 mr-2" />
                Xuất lịch sử
              </Button>
              {canEdit && (
                <Button size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Chỉnh sửa
                </Button>
              )}
            </div>
          </div>

          {/* Status and Rating */}
          <div className="flex gap-4">
            <Badge className={getStatusColor(supplier.TrangThai)}>
              {supplier.TrangThai}
            </Badge>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{formatRating(supplier.DanhGia)}</span>
            </div>
          </div>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Thông tin cơ bản
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Mã số thuế</label>
                  <p className="font-medium">{supplier.MaSoThue}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ngày hợp tác</label>
                  <p className="font-medium">{supplier.NgayHopTac}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Địa chỉ
                </label>
                <p className="font-medium">{supplier.DiaChi}</p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Thông tin liên hệ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    Số điện thoại
                  </label>
                  <p className="font-medium">{supplier.SoDienThoai}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    Email
                  </label>
                  <p className="font-medium">{supplier.Email}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Người đại diện
                  </label>
                  <p className="font-medium">{supplier.NguoiDaiDien}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    SĐT liên hệ
                  </label>
                  <p className="font-medium">{supplier.SoDienThoaiLienHe || 'Chưa có'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Email liên hệ
                </label>
                <p className="font-medium">{supplier.EmailLienHe || 'Chưa có'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Thông tin kinh doanh
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Truck className="h-4 w-4" />
                    Thời gian giao hàng
                  </label>
                  <p className="font-medium">{supplier.ThoiGianGiaoHang}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    Phương thức thanh toán
                  </label>
                  <p className="font-medium">{supplier.PhuongThucThanhToan}</p>
                </div>
              </div>
              {supplier.GhiChu && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ghi chú</label>
                  <p className="font-medium">{supplier.GhiChu}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Lịch sử đặt hàng
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Tổng giá trị</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(totalOrderValue)}
                  </div>
                </div>
              </CardTitle>
              <CardDescription>
                {supplier.LichSuDatHang.length} đơn hàng trong lịch sử
              </CardDescription>
            </CardHeader>
            <CardContent>
              {supplier.LichSuDatHang.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Chưa có lịch sử đặt hàng</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Hiển thị {recentOrders.length} đơn hàng gần nhất
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ngày đặt</TableHead>
                        <TableHead>Tổng tiền</TableHead>
                        <TableHead>Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.map((order, index) => (
                        <TableRow key={index}>
                          <TableCell>{order.NgayDat}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(order.TongTien)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {order.TrangThai}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Close button */}
          <div className="flex justify-end pt-6 border-t">
            <Button onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 