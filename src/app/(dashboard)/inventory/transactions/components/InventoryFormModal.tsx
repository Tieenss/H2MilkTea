import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { InventoryTransaction, InventoryTransactionFormData, InventoryTransactionDetail } from '../types/inventory';
import { INVENTORY_TYPES, INITIAL_TRANSACTION_FORM } from '../utils/constants';
import authUtils from '@/utils/authUtils';

interface InventoryFormModalProps {
  transaction: InventoryTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: InventoryTransactionFormData) => Promise<void>;
  isEditing: boolean;
}

const DEFAULT_MATERIALS = [
  { IDNguyenLieu: 'NVL001', TenNguyenLieu: 'Cà phê hạt Robusta', DonViTinh: 'Kg' },
  { IDNguyenLieu: 'NVL002', TenNguyenLieu: 'Sữa tươi không đường', DonViTinh: 'Hộp 1L' },
  { IDNguyenLieu: 'NVL003', TenNguyenLieu: 'Sữa đặc có đường', DonViTinh: 'Lon' },
  { IDNguyenLieu: 'NVL004', TenNguyenLieu: 'Syrup Caramel', DonViTinh: 'Chai 750ml' },
  { IDNguyenLieu: 'NVL005', TenNguyenLieu: 'Trà đen (Hồng trà)', DonViTinh: 'Túi 500g' },
  { IDNguyenLieu: 'NVL006', TenNguyenLieu: 'Bột Matcha Nhật Bản', DonViTinh: 'Túi 100g' }
];

const DEFAULT_SUPPLIERS = [
  'Công ty TNHH ABC',
  'Công ty XYZ',
  'Công ty DEF',
  'Nhà cung cấp khác'
];

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
  const [materials, setMaterials] = useState(DEFAULT_MATERIALS);
  const [suppliers, setSuppliers] = useState<string[]>(DEFAULT_SUPPLIERS);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  // Nạp danh sách nguyên liệu, nhà cung cấp & tồn kho thực tế từ DB
  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    const loadInventoryContext = async () => {
      try {
        const [matRes, supRes, txRes, detailRes, bomRes] = await Promise.all([
          authUtils.apiRequest('NGUYENLIEU', 'getall', {}).catch(() => []),
          authUtils.apiRequest('NHACUNGCAP', 'getall', {}).catch(() => []),
          authUtils.apiRequest('NHAPXUATKHO', 'getall', {}).catch(() => []),
          authUtils.apiRequest('HOADONDETAIL', 'getall', {}).catch(() => []),
          authUtils.apiRequest('CAUHINH', 'getall', {}).catch(() => []),
        ]);

        if (!active) return;

        if (Array.isArray(matRes) && matRes.length > 0) {
          setMaterials(
            matRes.map((m: any) => ({
              IDNguyenLieu: String(m.IDNguyenLieu || ''),
              TenNguyenLieu: String(m['Tên nguyên liệu'] || m.TenNguyenLieu || ''),
              DonViTinh: String(m['Đơn vị tính'] || m.DonViTinh || 'Kg'),
            }))
          );
        }

        if (Array.isArray(supRes) && supRes.length > 0) {
          const supNames = supRes
            .map((s: any) => String(s.TenNhaCungCap || s['Tên nhà cung cấp'] || '').trim())
            .filter(Boolean);
          if (supNames.length > 0) {
            setSuppliers(Array.from(new Set([...supNames, 'Nhà cung cấp khác'])));
          }
        }

        // Tính tồn kho thực tế cho từng nguyên liệu
        const nextStockMap: Record<string, number> = {};
        const txs = Array.isArray(txRes) ? txRes : [];
        const details = Array.isArray(detailRes) ? detailRes : [];
        const boms = Array.isArray(bomRes) ? bomRes : [];
        const matList = Array.isArray(matRes) ? matRes : [];

        // Cộng/trừ nhập xuất kho
        txs.forEach((tx: any) => {
          if (tx?.TrangThai && tx.TrangThai !== 'Hoàn thành') return;
          const items = Array.isArray(tx?.ChiTiet) ? tx.ChiTiet : [];
          items.forEach((line: any) => {
            const matId = String(line?.IDNguyenLieu || '');
            if (!matId) return;
            const qty = parseFloat(String(line?.SoLuong || 0).replace(',', '.')) || 0;
            if (tx.LoaiGiaoDich === 'Nhập kho') {
              nextStockMap[matId] = (nextStockMap[matId] || 0) + qty;
            } else if (tx.LoaiGiaoDich === 'Xuất kho') {
              nextStockMap[matId] = (nextStockMap[matId] || 0) - qty;
            }
          });
        });

        // Trừ tiêu hao theo hóa đơn bán + BOM
        const soldBySp: Record<string, number> = {};
        details.forEach((d: any) => {
          const idSp = String(d?.IDSP || '');
          if (!idSp) return;
          const qty = parseFloat(String(d?.['Số lượng'] || 0).replace(',', '.')) || 0;
          soldBySp[idSp] = (soldBySp[idSp] || 0) + qty;
        });

        boms.forEach((cfg: any) => {
          const matId = String(cfg?.IDNguyenLieu || '');
          const idSp = String(cfg?.IDSP || '');
          if (!matId || !idSp) return;
          const soldQty = soldBySp[idSp] || 0;
          if (soldQty <= 0) return;
          const perUnit =
            parseFloat(String(cfg['Số lượng quy đổi'] || cfg['Số lượng cần'] || 0).replace(',', '.')) || 0;
          nextStockMap[matId] = (nextStockMap[matId] || 0) - soldQty * perUnit;
        });

        // Đảm bảo không âm do làm tròn và mọi nguyên liệu đều có key
        matList.forEach((m: any) => {
          const matId = String(m?.IDNguyenLieu || '');
          if (matId) {
            const directStock = parseFloat(String(m?.['Số lượng tồn'] ?? m?.SoLuongTon ?? '').replace(',', '.'));
            if (Number.isFinite(directStock) && nextStockMap[matId] === undefined) {
              nextStockMap[matId] = Math.max(0, directStock);
            } else {
              nextStockMap[matId] = Math.max(0, Math.round((nextStockMap[matId] || 0) * 100) / 100);
            }
          }
        });

        setStockMap(nextStockMap);
      } catch (err) {
        console.warn('Could not load inventory context:', err);
      }
    };

    loadInventoryContext();
    return () => {
      active = false;
    };
  }, [isOpen]);

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

      formData.ChiTiet.forEach((item, idx) => {
        if (!item.IDNguyenLieu) {
          validationErrors.push(`Dòng ${idx + 1}: Vui lòng chọn nguyên liệu`);
        }
        if (!item.SoLuong || item.SoLuong <= 0) {
          validationErrors.push(`Dòng ${idx + 1} (${item.TenNguyenLieu || 'Chưa chọn'}): Số lượng phải lớn hơn 0`);
        }
        if (item.DonGia < 0) {
          validationErrors.push(`Dòng ${idx + 1}: Đơn giá không được âm`);
        }

        // Chặn lập phiếu Xuất kho vượt quá số lượng tồn kho thực tế (MOD-TX-EDGE)
        if (formData.LoaiGiaoDich === 'Xuất kho' && item.IDNguyenLieu) {
          const currentStock = stockMap[item.IDNguyenLieu];
          if (currentStock !== undefined && item.SoLuong > currentStock) {
            validationErrors.push(
              `Số lượng xuất của "${item.TenNguyenLieu || item.IDNguyenLieu}" (${item.SoLuong} ${item.DonViTinh}) vượt quá tồn kho thực tế hiện có (${currentStock} ${item.DonViTinh}).`
            );
          }
        }
      });

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
        updatedChiTiet[index].ThanhTien = (Number(soLuong) || 0) * (Number(donGia) || 0);
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
          <DialogTitle className="pr-8">
            {isEditing ? 'Chỉnh sửa giao dịch kho' : 'Thêm giao dịch kho mới'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Cập nhật thông tin giao dịch kho' : 'Tạo giao dịch nhập/xuất kho mới'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4" role="alert">
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
              <div className="text-center py-8 text-gray-500 border border-dashed rounded-md">
                Chưa có mặt hàng nào. Hãy thêm mặt hàng đầu tiên.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
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
                    {formData.ChiTiet.map((item, index) => {
                      const availableStock = item.IDNguyenLieu ? stockMap[item.IDNguyenLieu] : undefined;
                      const isOverStock =
                        formData.LoaiGiaoDich === 'Xuất kho' &&
                        availableStock !== undefined &&
                        item.SoLuong > availableStock;

                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              value={item.IDNguyenLieu}
                              onValueChange={(value) => updateItem(index, 'IDNguyenLieu', value)}
                            >
                              <SelectTrigger className="w-[130px]">
                                <SelectValue placeholder="Chọn" />
                              </SelectTrigger>
                              <SelectContent>
                                {materials.map(material => (
                                  <SelectItem key={material.IDNguyenLieu} value={material.IDNguyenLieu}>
                                    {material.IDNguyenLieu} - {material.TenNguyenLieu}
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
                            {formData.LoaiGiaoDich === 'Xuất kho' && availableStock !== undefined && (
                              <div className={`text-[11px] mt-1 ${isOverStock ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                Tồn kho hiện có: {availableStock} {item.DonViTinh}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.SoLuong}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                updateItem(index, 'SoLuong', Number.isFinite(val) && val >= 0 ? val : 0);
                              }}
                              placeholder="0"
                              min="0"
                              step="0.01"
                              className={isOverStock ? 'border-red-500 text-red-700' : ''}
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
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                updateItem(index, 'DonGia', Number.isFinite(val) && val >= 0 ? val : 0);
                              }}
                              placeholder="0"
                              min="0"
                              step="1000"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium whitespace-nowrap">
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
                      );
                    })}
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
