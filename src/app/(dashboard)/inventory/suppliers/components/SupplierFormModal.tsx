import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from 'lucide-react';
import type { Supplier, SupplierFormData } from '../types/supplier';
import { SUPPLIER_STATUS, PAYMENT_METHODS, DELIVERY_TIMES } from '../utils/constants';
import { validateSupplierForm } from '../utils/formatters';

interface SupplierFormModalProps {
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: SupplierFormData) => void;
  isEditing: boolean;
}

export function SupplierFormModal({
  supplier,
  isOpen,
  onClose,
  onSubmit,
  isEditing
}: SupplierFormModalProps) {
  const [formData, setFormData] = useState<SupplierFormData>({
    TenNhaCungCap: '',
    MaSoThue: '',
    DiaChi: '',
    SoDienThoai: '',
    Email: '',
    NguoiDaiDien: '',
    SoDienThoaiLienHe: '',
    EmailLienHe: '',
    NgayHopTac: '',
    TrangThai: 'Đang hợp tác',
    GhiChu: '',
    DanhGia: 5,
    ThoiGianGiaoHang: '2-3 ngày',
    PhuongThucThanhToan: 'Chuyển khoản 30 ngày'
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when supplier changes
  useEffect(() => {
    if (supplier && isEditing) {
      setFormData({
        TenNhaCungCap: supplier.TenNhaCungCap,
        MaSoThue: supplier.MaSoThue,
        DiaChi: supplier.DiaChi,
        SoDienThoai: supplier.SoDienThoai,
        Email: supplier.Email,
        NguoiDaiDien: supplier.NguoiDaiDien,
        SoDienThoaiLienHe: supplier.SoDienThoaiLienHe,
        EmailLienHe: supplier.EmailLienHe,
        NgayHopTac: supplier.NgayHopTac,
        TrangThai: supplier.TrangThai,
        GhiChu: supplier.GhiChu,
        DanhGia: supplier.DanhGia,
        ThoiGianGiaoHang: supplier.ThoiGianGiaoHang,
        PhuongThucThanhToan: supplier.PhuongThucThanhToan
      });
    } else {
      // Reset form for new supplier
      setFormData({
        TenNhaCungCap: '',
        MaSoThue: '',
        DiaChi: '',
        SoDienThoai: '',
        Email: '',
        NguoiDaiDien: '',
        SoDienThoaiLienHe: '',
        EmailLienHe: '',
        NgayHopTac: new Date().toLocaleDateString('vi-VN'),
        TrangThai: 'Đang hợp tác',
        GhiChu: '',
        DanhGia: 5,
        ThoiGianGiaoHang: '2-3 ngày',
        PhuongThucThanhToan: 'Chuyển khoản 30 ngày'
      });
    }
    setErrors([]);
  }, [supplier, isEditing, isOpen]);

  const handleInputChange = (field: keyof SupplierFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateSupplierForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Chỉnh sửa Nhà cung cấp' : 'Thêm Nhà cung cấp mới'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Cập nhật thông tin nhà cung cấp'
              : 'Nhập thông tin chi tiết của nhà cung cấp mới'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error messages */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">Có lỗi xảy ra:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Thông tin cơ bản</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenNhaCungCap">Tên nhà cung cấp *</Label>
                <Input
                  id="tenNhaCungCap"
                  value={formData.TenNhaCungCap}
                  onChange={(e) => handleInputChange('TenNhaCungCap', e.target.value)}
                  placeholder="Nhập tên nhà cung cấp"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maSoThue">Mã số thuế *</Label>
                <Input
                  id="maSoThue"
                  value={formData.MaSoThue}
                  onChange={(e) => handleInputChange('MaSoThue', e.target.value)}
                  placeholder="Nhập mã số thuế"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="diaChi">Địa chỉ *</Label>
              <Input
                id="diaChi"
                value={formData.DiaChi}
                onChange={(e) => handleInputChange('DiaChi', e.target.value)}
                placeholder="Nhập địa chỉ đầy đủ"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Thông tin liên hệ</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="soDienThoai">Số điện thoại *</Label>
                <Input
                  id="soDienThoai"
                  value={formData.SoDienThoai}
                  onChange={(e) => handleInputChange('SoDienThoai', e.target.value)}
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.Email}
                  onChange={(e) => handleInputChange('Email', e.target.value)}
                  placeholder="Nhập email"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nguoiDaiDien">Người đại diện *</Label>
                <Input
                  id="nguoiDaiDien"
                  value={formData.NguoiDaiDien}
                  onChange={(e) => handleInputChange('NguoiDaiDien', e.target.value)}
                  placeholder="Nhập tên người đại diện"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="soDienThoaiLienHe">SĐT liên hệ</Label>
                <Input
                  id="soDienThoaiLienHe"
                  value={formData.SoDienThoaiLienHe}
                  onChange={(e) => handleInputChange('SoDienThoaiLienHe', e.target.value)}
                  placeholder="Nhập số điện thoại liên hệ"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailLienHe">Email liên hệ</Label>
              <Input
                id="emailLienHe"
                type="email"
                value={formData.EmailLienHe}
                onChange={(e) => handleInputChange('EmailLienHe', e.target.value)}
                placeholder="Nhập email liên hệ"
              />
            </div>
          </div>

          {/* Business Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Thông tin kinh doanh</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ngayHopTac">Ngày hợp tác</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ngayHopTac"
                    value={formData.NgayHopTac}
                    onChange={(e) => handleInputChange('NgayHopTac', e.target.value)}
                    placeholder="dd/mm/yyyy"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trangThai">Trạng thái</Label>
                <Select value={formData.TrangThai} onValueChange={(value) => handleInputChange('TrangThai', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPLIER_STATUS.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="danhGia">Đánh giá</Label>
                <Select value={formData.DanhGia.toString()} onValueChange={(value) => handleInputChange('DanhGia', parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map(rating => (
                      <SelectItem key={rating} value={rating.toString()}>
                        {rating} sao
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="thoiGianGiaoHang">Thời gian giao hàng</Label>
                <Select value={formData.ThoiGianGiaoHang} onValueChange={(value) => handleInputChange('ThoiGianGiaoHang', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_TIMES.map(time => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phuongThucThanhToan">Phương thức thanh toán</Label>
                <Select value={formData.PhuongThucThanhToan} onValueChange={(value) => handleInputChange('PhuongThucThanhToan', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(method => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ghiChu">Ghi chú</Label>
              <Textarea
                id="ghiChu"
                value={formData.GhiChu}
                onChange={(e) => handleInputChange('GhiChu', e.target.value)}
                placeholder="Nhập ghi chú về nhà cung cấp"
                rows={3}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : (isEditing ? 'Cập nhật' : 'Thêm mới')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 