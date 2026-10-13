'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { StocktakeFormData, StocktakeDetail } from '../types/stocktake';
import { STOCKTAKE_TYPES, STOCKTAKE_STATUS, INITIAL_STOCKTAKE_FORM } from '../utils/constants';

interface StocktakeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StocktakeFormData) => void;
  stocktake?: any;
  isEditing: boolean;
  loading: boolean;
}

export function StocktakeFormModal({
  isOpen,
  onClose,
  onSubmit,
  stocktake,
  isEditing,
  loading
}: StocktakeFormModalProps) {
  const [formData, setFormData] = useState<StocktakeFormData>(INITIAL_STOCKTAKE_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load data when editing
  useEffect(() => {
    if (isEditing && stocktake) {
      setFormData({
        NgayKiemKe: stocktake.NgayKiemKe,
        LoaiKiemKe: stocktake.LoaiKiemKe,
        NhanVienThucHien: stocktake.NhanVienThucHien,
        TrangThai: stocktake.TrangThai,
        GhiChu: stocktake.GhiChu || '',
        ChiTiet: stocktake.ChiTiet || []
      });
    } else {
      setFormData(INITIAL_STOCKTAKE_FORM);
    }
    setErrors({});
  }, [isEditing, stocktake, isOpen]);

  const handleInputChange = (field: keyof StocktakeFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleAddItem = () => {
    const newItem: StocktakeDetail = {
      IDNguyenLieu: '',
      TenNguyenLieu: '',
      SoLuongTheoSo: 0,
      SoLuongThucTe: 0,
      ChenhLech: 0,
      DonViTinh: '',
      DonGia: 0,
      GiaTriChenhLech: 0,
      LyDo: ''
    };
    
    setFormData(prev => ({
      ...prev,
      ChiTiet: [...prev.ChiTiet, newItem]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ChiTiet: prev.ChiTiet.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index: number, field: keyof StocktakeDetail, value: any) => {
    setFormData(prev => ({
      ...prev,
      ChiTiet: prev.ChiTiet.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          
          // Auto-calculate discrepancy
          if (field === 'SoLuongThucTe' || field === 'SoLuongTheoSo') {
            updatedItem.ChenhLech = updatedItem.SoLuongThucTe - updatedItem.SoLuongTheoSo;
          }
          
          // Auto-calculate discrepancy value
          if (field === 'ChenhLech' || field === 'DonGia') {
            updatedItem.GiaTriChenhLech = (updatedItem.ChenhLech || 0) * (updatedItem.DonGia || 0);
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.NgayKiemKe) {
      newErrors.NgayKiemKe = 'Vui lòng chọn ngày kiểm kê';
    }

    if (!formData.LoaiKiemKe) {
      newErrors.LoaiKiemKe = 'Vui lòng chọn loại kiểm kê';
    }

    if (!formData.NhanVienThucHien) {
      newErrors.NhanVienThucHien = 'Vui lòng nhập tên nhân viên';
    }

    if (!formData.TrangThai) {
      newErrors.TrangThai = 'Vui lòng chọn trạng thái';
    }

    // Validate items
    formData.ChiTiet.forEach((item, index) => {
              if (!item.IDNguyenLieu) {
          newErrors[`item_${index}_IDNguyenLieu`] = 'Vui lòng nhập mã nguyên liệu';
        }
      if (!item.TenNguyenLieu) {
        newErrors[`item_${index}_TenNguyenLieu`] = 'Vui lòng nhập tên nguyên liệu';
      }
              if (item.SoLuongTheoSo < 0) {
          newErrors[`item_${index}_SoLuongTheoSo`] = 'Số lượng không được âm';
        }
      if (item.SoLuongThucTe < 0) {
        newErrors[`item_${index}_SoLuongThucTe`] = 'Số lượng không được âm';
      }
      if (item.DonGia < 0) {
        newErrors[`item_${index}_DonGia`] = 'Đơn giá không được âm';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const calculateTotalValue = () => {
    return formData.ChiTiet.reduce((sum, item) => sum + ((item.SoLuongThucTe || 0) * (item.DonGia || 0)), 0);
  };

  const getDiscrepancyColor = (discrepancy: number) => {
    if (discrepancy === 0) return 'text-green-600';
    if (discrepancy > 0) return 'text-red-600';
    return 'text-blue-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{isEditing ? 'Chỉnh sửa kiểm kê' : 'Thêm kiểm kê mới'}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Thông tin cơ bản */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="NgayKiemKe">Ngày kiểm kê *</Label>
              <Input
                id="NgayKiemKe"
                type="date"
                value={formData.NgayKiemKe}
                onChange={(e) => handleInputChange('NgayKiemKe', e.target.value)}
                className={errors.NgayKiemKe ? 'border-red-500' : ''}
              />
              {errors.NgayKiemKe && (
                <p className="text-sm text-red-500 mt-1">{errors.NgayKiemKe}</p>
              )}
            </div>

            <div>
              <Label htmlFor="LoaiKiemKe">Loại kiểm kê *</Label>
              <Select
                value={formData.LoaiKiemKe}
                onValueChange={(value) => handleInputChange('LoaiKiemKe', value)}
              >
                <SelectTrigger className={errors.LoaiKiemKe ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Chọn loại kiểm kê" />
                </SelectTrigger>
                <SelectContent>
                  {STOCKTAKE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.LoaiKiemKe && (
                <p className="text-sm text-red-500 mt-1">{errors.LoaiKiemKe}</p>
              )}
            </div>

            <div>
              <Label htmlFor="NhanVienThucHien">Nhân viên thực hiện *</Label>
              <Input
                id="NhanVienThucHien"
                value={formData.NhanVienThucHien}
                onChange={(e) => handleInputChange('NhanVienThucHien', e.target.value)}
                className={errors.NhanVienThucHien ? 'border-red-500' : ''}
              />
              {errors.NhanVienThucHien && (
                <p className="text-sm text-red-500 mt-1">{errors.NhanVienThucHien}</p>
              )}
            </div>

            <div>
              <Label htmlFor="TrangThai">Trạng thái *</Label>
              <Select
                value={formData.TrangThai}
                onValueChange={(value) => handleInputChange('TrangThai', value)}
              >
                <SelectTrigger className={errors.TrangThai ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  {STOCKTAKE_STATUS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.TrangThai && (
                <p className="text-sm text-red-500 mt-1">{errors.TrangThai}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="GhiChu">Ghi chú</Label>
            <Textarea
              id="GhiChu"
              value={formData.GhiChu}
              onChange={(e) => handleInputChange('GhiChu', e.target.value)}
              placeholder="Nhập ghi chú (nếu có)"
              rows={3}
            />
          </div>

          {/* Chi tiết mặt hàng */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Chi tiết mặt hàng</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-8 px-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                Thêm mặt hàng
              </Button>
            </div>

            {formData.ChiTiet.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                Chưa có mặt hàng nào. Vui lòng thêm mặt hàng để kiểm kê.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã nguyên liệu *</TableHead>
                      <TableHead>Tên nguyên liệu *</TableHead>
                      <TableHead>Số lượng hệ thống</TableHead>
                      <TableHead>Số lượng thực tế</TableHead>
                      <TableHead>Chênh lệch</TableHead>
                      <TableHead>Đơn giá</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.ChiTiet.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={item.IDNguyenLieu}
                            onChange={(e) => handleItemChange(index, 'IDNguyenLieu', e.target.value)}
                            className={errors[`item_${index}_IDNguyenLieu`] ? 'border-red-500' : ''}
                          />
                          {errors[`item_${index}_IDNguyenLieu`] && (
                            <p className="text-xs text-red-500 mt-1">{errors[`item_${index}_IDNguyenLieu`]}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.TenNguyenLieu}
                            onChange={(e) => handleItemChange(index, 'TenNguyenLieu', e.target.value)}
                            className={errors[`item_${index}_TenNguyenLieu`] ? 'border-red-500' : ''}
                          />
                          {errors[`item_${index}_TenNguyenLieu`] && (
                            <p className="text-xs text-red-500 mt-1">{errors[`item_${index}_TenNguyenLieu`]}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.SoLuongTheoSo}
                            onChange={(e) => handleItemChange(index, 'SoLuongTheoSo', Number(e.target.value))}
                            className={errors[`item_${index}_SoLuongTheoSo`] ? 'border-red-500' : ''}
                          />
                          {errors[`item_${index}_SoLuongTheoSo`] && (
                            <p className="text-xs text-red-500 mt-1">{errors[`item_${index}_SoLuongTheoSo`]}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.SoLuongThucTe}
                            onChange={(e) => handleItemChange(index, 'SoLuongThucTe', Number(e.target.value))}
                            className={errors[`item_${index}_SoLuongThucTe`] ? 'border-red-500' : ''}
                          />
                          {errors[`item_${index}_SoLuongThucTe`] && (
                            <p className="text-xs text-red-500 mt-1">{errors[`item_${index}_SoLuongThucTe`]}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getDiscrepancyColor(item.ChenhLech)}>
                            {item.ChenhLech > 0 ? '+' : ''}{item.ChenhLech}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.DonGia}
                            onChange={(e) => handleItemChange(index, 'DonGia', Number(e.target.value))}
                            className={errors[`item_${index}_DonGia`] ? 'border-red-500' : ''}
                          />
                          {errors[`item_${index}_DonGia`] && (
                            <p className="text-xs text-red-500 mt-1">{errors[`item_${index}_DonGia`]}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Tóm tắt */}
            {formData.ChiTiet.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Tổng mặt hàng</p>
                    <p className="text-lg font-medium">{formData.ChiTiet.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tổng giá trị</p>
                    <p className="text-lg font-medium">
                      {(calculateTotalValue() || 0).toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Mặt hàng có chênh lệch</p>
                    <p className="text-lg font-medium text-red-600">
                      {formData.ChiTiet.filter(item => item.ChenhLech !== 0).length}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading || formData.ChiTiet.length === 0}
            >
              {loading ? 'Đang xử lý...' : (isEditing ? 'Cập nhật' : 'Thêm mới')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 