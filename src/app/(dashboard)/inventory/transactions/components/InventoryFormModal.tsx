import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, X } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { InventoryTransaction, InventoryTransactionFormData, InventoryTransactionDetail } from '../types/inventory';
import { INVENTORY_TYPES, INITIAL_TRANSACTION_FORM } from '../utils/constants';

interface InventoryFormModalProps {
  transaction: InventoryTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: InventoryTransactionFormData) => Promise<void>;
  isEditing: boolean;
}

export const InventoryFormModal: React.FC<InventoryFormModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onSubmit,
  isEditing
}) => {
  const [formData, setFormData] = useState<InventoryTransactionFormData>(INITIAL_TRANSACTION_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Sample materials data - in real app, this would come from API
  const materials = [
    { IDNguyenLieu: 'NVL001', TenNguyenLieu: 'Cà phê hạt Robusta', DonViTinh: 'Kg' },
    { IDNguyenLieu: 'NVL002', TenNguyenLieu: 'Sữa tươi không đường', DonViTinh: 'Hộp 1L' },
    { IDNguyenLieu: 'NVL003', TenNguyenLieu: 'Sữa đặc có đường', DonViTinh: 'Lon' },
    { IDNguyenLieu: 'NVL004', TenNguyenLieu: 'Syrup Caramel', DonViTinh: 'Chai 750ml' },
    { IDNguyenLieu: 'NVL005', TenNguyenLieu: 'Trà đen (Hồng trà)', DonViTinh: 'Túi 500g' },
    { IDNguyenLieu: 'NVL006', TenNguyenLieu: 'Bột Matcha Nhật Bản', DonViTinh: 'Túi 100g' }
  ];

  // Sample suppliers data
  const suppliers = [
    'Công ty TNHH ABC',
    'Công ty XYZ',
    'Công ty DEF',
    'Nhà cung cấp khác'
  ];

  // Initialize form data when editing
  useEffect(() => {
    if (transaction && isEditing) {
      setFormData({
        LoaiGiaoDich: transaction.LoaiGiaoDich,
        NhaCungCap: transaction.NhaCungCap,
        GhiChu: transaction.GhiChu,
        ChiTiet: transaction.ChiTiet
      });
    } else {
      setFormData(INITIAL_TRANSACTION_FORM);
    }
    setErrors([]);
  }, [transaction, isEditing, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    try {
      // Validate form data
      const validationErrors: string[] = [];
      
      if (!formData.LoaiGiaoDich) {
        validationErrors.push('Loại giao dịch là bắt buộc');
      }

      if (formData.LoaiGiaoDich === 'Nhập kho' && !formData.NhaCungCap) {
        validationErrors.push('Nhà cung cấp là bắt buộc cho giao dịch nhập kho');
      }

      if (!formData.ChiTiet || formData.ChiTiet.length === 0) {
        validationErrors.push('Phải có ít nhất một mặt hàng trong giao dịch');
      }

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        setLoading(false);
        return;
      }

      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors(['Có lỗi xảy ra khi lưu giao dịch']);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    const newItem: InventoryTransactionDetail = {
      IDNguyenLieu: '',
      TenNguyenLieu: '',
      SoLuong: 0,
      DonViTinh: '',
      DonGia: 0,
      ThanhTien: 0
    };
    setFormData(prev => ({
      ...prev,
      ChiTiet: [...prev.ChiTiet, newItem]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ChiTiet: prev.ChiTiet.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: keyof InventoryTransactionDetail, value: any) => {
    setFormData(prev => {
      const updatedChiTiet = [...prev.ChiTiet];
      updatedChiTiet[index] = {
        ...updatedChiTiet[index],
        [field]: value
      };

      // Auto-calculate ThanhTien
      if (field === 'SoLuong' || field === 'DonGia') {
        const soLuong = field === 'SoLuong' ? value : updatedChiTiet[index].SoLuong;
        const donGia = field === 'DonGia' ? value : updatedChiTiet[index].DonGia;
        updatedChiTiet[index].ThanhTien = soLuong * donGia;
      }

      // Auto-fill material info
      if (field === 'IDNguyenLieu') {
        const material = materials.find(m => m.IDNguyenLieu === value);
        if (material) {
          updatedChiTiet[index].TenNguyenLieu = material.TenNguyenLieu;
          updatedChiTiet[index].DonViTinh = material.DonViTinh;
        }
      }

      return {
        ...prev,
        ChiTiet: updatedChiTiet
      };
    });
  };

  const totalAmount = formData.ChiTiet.reduce((sum, item) => sum + item.ThanhTien, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{isEditing ? 'Chỉnh sửa giao dịch kho' : 'Thêm giao dịch kho mới'}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Cập nhật thông tin giao dịch kho' : 'Tạo giao dịch nhập/xuất kho mới'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-red-800 font-medium mb-2">Có lỗi xảy ra:</div>
              <ul className="text-red-700 text-sm space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loaiGiaoDich">Loại giao dịch *</Label>
              <Select
                value={formData.LoaiGiaoDich}
                onValueChange={(value) => setFormData(prev => ({ ...prev, LoaiGiaoDich: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại giao dịch" />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nhaCungCap">
                Nhà cung cấp {formData.LoaiGiaoDich === 'Nhập kho' && '*'}
              </Label>
              <Select
                value={formData.NhaCungCap}
                onValueChange={(value) => setFormData(prev => ({ ...prev, NhaCungCap: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nhà cung cấp" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
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
              onChange={(e) => setFormData(prev => ({ ...prev, GhiChu: e.target.value }))}
              placeholder="Nhập ghi chú cho giao dịch..."
              rows={3}
            />
          </div>

          {/* Items Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Chi tiết mặt hàng</h3>
              <Button type="button" onClick={addItem} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Thêm mặt hàng
              </Button>
            </div>

            {formData.ChiTiet.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Chưa có mặt hàng nào. Hãy thêm mặt hàng đầu tiên.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã nguyên liệu</TableHead>
                      <TableHead>Tên nguyên liệu</TableHead>
                      <TableHead>Số lượng</TableHead>
                      <TableHead>Đơn vị tính</TableHead>
                      <TableHead>Đơn giá</TableHead>
                      <TableHead>Thành tiền</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.ChiTiet.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={item.IDNguyenLieu}
                            onValueChange={(value) => updateItem(index, 'IDNguyenLieu', value)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue placeholder="Chọn" />
                            </SelectTrigger>
                            <SelectContent>
                              {materials.map(material => (
                                <SelectItem key={material.IDNguyenLieu} value={material.IDNguyenLieu}>
                                  {material.IDNguyenLieu}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.TenNguyenLieu}
                            onChange={(e) => updateItem(index, 'TenNguyenLieu', e.target.value)}
                            placeholder="Tên nguyên liệu"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.SoLuong}
                            onChange={(e) => updateItem(index, 'SoLuong', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.DonViTinh}
                            onChange={(e) => updateItem(index, 'DonViTinh', e.target.value)}
                            placeholder="Đơn vị"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.DonGia}
                            onChange={(e) => updateItem(index, 'DonGia', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            min="0"
                            step="1000"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatCurrency(item.ThanhTien)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700"
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
          </div>

          {/* Total */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Tổng cộng</span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              {formData.ChiTiet.length} mặt hàng
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Đang lưu...' : (isEditing ? 'Cập nhật' : 'Thêm giao dịch')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 