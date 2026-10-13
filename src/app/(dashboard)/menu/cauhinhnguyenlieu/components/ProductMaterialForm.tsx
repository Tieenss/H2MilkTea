// components/ProductMaterialForm.tsx
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Save, Loader2, X, Hash, Calculator, 
  Package, Beaker, AlertTriangle, Search,
  CheckCircle2, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import type { ProductMaterial, ProductMaterialFormData, Product, Material } from '../types/productMaterial';
import { STATUS_OPTIONS } from '../utils/constants';
import { formatNumber, parseNumber } from '../utils/formatters';

interface ProductMaterialFormProps {
  config?: ProductMaterial | null;
  formData: ProductMaterialFormData;
  onFormDataChange: (data: ProductMaterialFormData) => void;
  onSubmit: (data: ProductMaterialFormData) => void;
  onCancel: () => void;
  isAdmin: boolean;
  isManager: boolean;
  products: Product[];
  materials: Material[];
  generateConfigId: () => string;
}

export const ProductMaterialForm: React.FC<ProductMaterialFormProps> = ({
  config,
  formData,
  onFormDataChange,
  onSubmit,
  onCancel,
  isAdmin,
  isManager,
  products,
  materials,
  generateConfigId
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [isSelfConfig, setIsSelfConfig] = useState(false);

  const isEditMode = Boolean(config);

  // Auto-generate config ID for new configs
  useEffect(() => {
    if (!isEditMode && !formData.IDCauHinh) {
      const newId = generateConfigId();
      updateFormData('IDCauHinh', newId);
    }
  }, [isEditMode, formData.IDCauHinh, generateConfigId]);

  // Update selected material when form data changes
  useEffect(() => {
    if (formData.IDNguyenLieu) {
      const material = materials.find(m => m.IDNguyenLieu === formData.IDNguyenLieu);
      setSelectedMaterial(material || null);
    }
  }, [formData.IDNguyenLieu, materials]);

  // Check if this is a self-config (product as material)
  useEffect(() => {
    const isSelf = formData.IDSP === formData.IDNguyenLieu;
    setIsSelfConfig(isSelf);
    if (isSelf) {
      updateFormData('Số lượng cần', 1);
    }
  }, [formData.IDSP, formData.IDNguyenLieu]);

  const updateFormData = useCallback((field: keyof ProductMaterialFormData, value: string | number) => {
    onFormDataChange({ ...formData, [field]: value });
  }, [formData, onFormDataChange]);

  // Filter functions for search
  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    return products.filter(product => 
      product['Tên sản phẩm'].toLowerCase().includes(productSearch.toLowerCase()) ||
      product.IDSP.toLowerCase().includes(productSearch.toLowerCase()) ||
      product['Loại sản phẩm'].toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  const filteredMaterials = useMemo(() => {
    if (!materialSearch) return materials;
    return materials.filter(material => 
      material['Tên nguyên liệu'].toLowerCase().includes(materialSearch.toLowerCase()) ||
      material.IDNguyenLieu.toLowerCase().includes(materialSearch.toLowerCase()) ||
      material['Đơn vị tính'].toLowerCase().includes(materialSearch.toLowerCase())
    );
  }, [materials, materialSearch]);

  // Calculate converted quantity
  const convertedQuantity = useMemo(() => {
    if (!selectedMaterial || !formData['Số lượng cần']) {
      return 0;
    }
    return formData['Số lượng cần'] * (selectedMaterial['Hệ số quy đổi'] || 1);
  }, [formData['Số lượng cần'], selectedMaterial]);

  const validateForm = useCallback((): string[] => {
    const errors: string[] = [];

    if (!formData.IDCauHinh?.trim()) errors.push('Mã cấu hình không được để trống');
    if (!formData.IDSP?.trim()) errors.push('Vui lòng chọn sản phẩm');
    if (!formData.IDNguyenLieu?.trim()) errors.push('Vui lòng chọn nguyên vật liệu');
    if (!formData['Số lượng cần'] || formData['Số lượng cần'] <= 0) errors.push('Số lượng cần phải lớn hơn 0');

    return errors;
  }, [formData]);

  // Trong ProductMaterialForm.tsx, sửa lại handleSubmit:

const handleSubmit = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();

  if (isSubmitting || (!isAdmin && !isManager)) {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền thực hiện chức năng này!');
    }
    return;
  }

  try {
    setIsSubmitting(true);

    const errors = validateForm();
    if (errors.length > 0) {
      toast.error(errors.join('\n'));
      return;
    }

    // Add unit from selected material
    const submitData = {
      ...formData,
      'Đơn vị sử dụng': selectedMaterial?.['Đơn vị tính'] || formData['Đơn vị sử dụng']
    };

    // Chỉ gọi onSubmit, không cần xử lý thêm
    onSubmit(submitData);
  } catch (error) {
    console.error('Error in form submission:', error);
    toast.error('Có lỗi xảy ra khi xử lý form');
  } finally {
    setIsSubmitting(false);
  }
}, [isSubmitting, isAdmin, isManager, formData, selectedMaterial, validateForm, onSubmit]);
  const handleSelfConfig = () => {
    if (formData.IDSP) {
      const product = products.find(p => p.IDSP === formData.IDSP);
      if (product) {
        // Set product as its own material
        updateFormData('IDNguyenLieu', formData.IDSP);
        updateFormData('Số lượng cần', 1);
        toast.success(`Đã thiết lập tự cấu hình cho ${product['Tên sản phẩm']}`);
      }
    } else {
      toast.error('Vui lòng chọn sản phẩm trước');
    }
  };

  const inputHandlers = useMemo(() => ({
    configId: (e: React.ChangeEvent<HTMLInputElement>) => updateFormData('IDCauHinh', e.target.value),
    quantity: (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseNumber(e.target.value);
      updateFormData('Số lượng cần', value);
    },
    notes: (e: React.ChangeEvent<HTMLTextAreaElement>) => updateFormData('Ghi chú', e.target.value),
    status: (value: string) => updateFormData('Trạng thái', value),
  }), [updateFormData]);

  const selectedProduct = products.find(p => p.IDSP === formData.IDSP);

  return (
    <div className="flex flex-col h-full max-h-screen">
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-4 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            
            {/* Self-config notification */}
            {isSelfConfig && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-green-800">Cấu hình tự động</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Sản phẩm này được cấu hình bằng chính nó (1:1). Thường dùng cho sản phẩm thành phẩm không cần gia công thêm.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              
              {/* Column 1 - Basic Information */}
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="configId" className="text-sm font-medium text-gray-700">
                    Mã cấu hình <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="configId"
                      className={`pl-10 h-9 sm:h-10 font-mono ${isEditMode ? 'bg-gray-100' : ''}`}
                      value={formData.IDCauHinh || ''}
                      onChange={inputHandlers.configId}
                      placeholder="Nhập mã cấu hình"
                      readOnly={isEditMode}
                      required
                    />
                  </div>
                  {isEditMode && (
                    <p className="text-xs text-gray-500 mt-1">
                      Mã cấu hình không thể thay đổi sau khi đã tạo.
                    </p>
                  )}
                </div>

                {/* Product Selection with Search */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Sản phẩm <span className="text-red-500">*</span>
                  </Label>
                  <Popover open={productOpen} onOpenChange={setProductOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={productOpen}
                        className="w-full justify-between h-10"
                      >
                        {formData.IDSP ? (
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-500" />
                            <span className="truncate">
                              {products.find(p => p.IDSP === formData.IDSP)?.['Tên sản phẩm'] || 'Không tìm thấy'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Package className="h-4 w-4" />
                            <span>Chọn sản phẩm...</span>
                          </div>
                        )}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Tìm kiếm sản phẩm..." 
                          value={productSearch}
                          onValueChange={setProductSearch}
                        />
                        <CommandEmpty>Không tìm thấy sản phẩm.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-y-auto">
                          {filteredProducts.map((product) => (
                            <CommandItem
                              key={product.IDSP}
                              value={product.IDSP}
                              onSelect={(value) => {
                                updateFormData('IDSP', value);
                                setProductOpen(false);
                                setProductSearch('');
                              }}
                              className="flex items-center gap-3"
                            >
                              <Package className="h-4 w-4 text-blue-500" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{product['Tên sản phẩm']}</div>
                                <div className="text-xs text-gray-500 truncate">
                                  {product.IDSP} • {product['Loại sản phẩm']}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  
                  {/* Self-config option */}
                  {formData.IDSP && (
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelfConfig}
                        className="text-xs"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Tự cấu hình (1:1)
                      </Button>
                      <p className="text-xs text-gray-500 mt-1">
                        Dùng cho sản phẩm thành phẩm không cần gia công
                      </p>
                    </div>
                  )}
                </div>

                {/* Material Selection with Search */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Nguyên vật liệu <span className="text-red-500">*</span>
                  </Label>
                  <Popover open={materialOpen} onOpenChange={setMaterialOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={materialOpen}
                        className="w-full justify-between h-10"
                      >
                        {formData.IDNguyenLieu ? (
                          <div className="flex items-center gap-2">
                            <Beaker className="h-4 w-4 text-green-500" />
                            <span className="truncate">
                              {materials.find(m => m.IDNguyenLieu === formData.IDNguyenLieu)?.['Tên nguyên liệu'] || 
                               products.find(p => p.IDSP === formData.IDNguyenLieu)?.['Tên sản phẩm'] || 
                               'Không tìm thấy'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Beaker className="h-4 w-4" />
                            <span>Chọn nguyên vật liệu...</span>
                          </div>
                        )}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Tìm kiếm nguyên vật liệu..." 
                          value={materialSearch}
                          onValueChange={setMaterialSearch}
                        />
                        <CommandEmpty>Không tìm thấy nguyên vật liệu.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-y-auto">
                          {/* Products as materials (self-config) */}
                          {formData.IDSP && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-medium text-gray-500 bg-gray-50">
                                Sản phẩm (Tự cấu hình)
                              </div>
                              {products.filter(p => 
                                p['Tên sản phẩm'].toLowerCase().includes(materialSearch.toLowerCase()) ||
                                p.IDSP.toLowerCase().includes(materialSearch.toLowerCase())
                              ).map((product) => (
                                <CommandItem
                                  key={`product-${product.IDSP}`}
                                  value={product.IDSP}
                                  onSelect={(value) => {
                                    updateFormData('IDNguyenLieu', value);
                                    setMaterialOpen(false);
                                    setMaterialSearch('');
                                  }}
                                  className="flex items-center gap-3"
                                >
                                  <Package className="h-4 w-4 text-purple-500" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{product['Tên sản phẩm']}</div>
                                    <div className="text-xs text-gray-500 truncate">
                                      {product.IDSP} • Tự cấu hình
                                    </div>
                                  </div>
                                  {product.IDSP === formData.IDSP && (
                                    <Badge variant="secondary" className="text-xs">1:1</Badge>
                                  )}
                                </CommandItem>
                              ))}
                              <div className="px-2 py-1.5 text-xs font-medium text-gray-500 bg-gray-50">
                                Nguyên vật liệu
                              </div>
                            </>
                          )}
                          
                          {/* Regular materials */}
                          {filteredMaterials.map((material) => (
                            <CommandItem
                              key={material.IDNguyenLieu}
                              value={material.IDNguyenLieu}
                              onSelect={(value) => {
                                updateFormData('IDNguyenLieu', value);
                                setMaterialOpen(false);
                                setMaterialSearch('');
                              }}
                              className="flex items-center gap-3"
                            >
                              <Beaker className="h-4 w-4 text-green-500" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{material['Tên nguyên liệu']}</div>
                                <div className="text-xs text-gray-500 truncate">
                                  {material.IDNguyenLieu} • {material['Đơn vị tính']} → {material['Đơn vị cơ sở']}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Trạng thái <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData['Trạng thái']} onValueChange={inputHandlers.status}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <status.icon className="h-4 w-4" />
                            <span>{status.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Column 2 - Quantity & Calculation */}
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-sm font-medium text-gray-700">
                    Số lượng cần <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Calculator className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-400" />
                    <Input
                      id="quantity"
                      type="number"
                      min="0"
                      step="0.001"
                      className="pl-10 h-9 sm:h-10"
                      value={formData['Số lượng cần'] || ''}
                      onChange={inputHandlers.quantity}
                      placeholder="0"
                      required
                      disabled={isSelfConfig}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {isSelfConfig ? 
                      'Tự động = 1 (sản phẩm tự cấu hình)' :
                      `Số lượng ${selectedMaterial?.['Đơn vị tính'] || 'đơn vị'} cần cho 1 sản phẩm`
                    }
                  </p>
                </div>

                {/* Conversion Display */}
                {selectedMaterial && formData['Số lượng cần'] > 0 && !isSelfConfig && (
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator className="h-5 w-5 text-purple-600" />
                      <h4 className="font-medium text-purple-800">Tính toán quy đổi</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-purple-700">Đơn vị sử dụng:</span>
                        <span className="font-semibold text-purple-800">
                          {formatNumber(formData['Số lượng cần'])} {selectedMaterial['Đơn vị tính']}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-700">Quy đổi ra đơn vị gốc:</span>
                        <span className="font-semibold text-orange-600">
                          {formatNumber(convertedQuantity)} {selectedMaterial['Đơn vị cơ sở']}
                        </span>
                      </div>
                      <div className="text-xs text-purple-600 mt-2 p-2 bg-white rounded border">
                        Công thức: {formatNumber(formData['Số lượng cần'])} × {formatNumber(selectedMaterial['Hệ số quy đổi'])} = {formatNumber(convertedQuantity)}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                    Ghi chú
                  </Label>
                  <Textarea
                    id="notes"
                    className="resize-none min-h-[80px] sm:min-h-[100px]"
                    rows={4}
                    value={formData['Ghi chú'] || ''}
                    onChange={inputHandlers.notes}
                    placeholder={isSelfConfig ? 
                      'Ghi chú cho cấu hình tự động...' :
                      'Nhập ghi chú về cấu hình này...'
                    }
                  />
                </div>

                {/* Quick Quantity Actions */}
                {!isSelfConfig && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Thiết lập nhanh
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateFormData('Số lượng cần', 1)}
                        className="text-xs"
                      >
                        1 đơn vị
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateFormData('Số lượng cần', 0.5)}
                        className="text-xs"
                      >
                        0.5 đơn vị
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateFormData('Số lượng cần', 0.1)}
                        className="text-xs"
                      >
                        0.1 đơn vị
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateFormData('Số lượng cần', 0.01)}
                        className="text-xs"
                      >
                        0.01 đơn vị
                      </Button>
                    </div>
                  </div>
                )}

                {/* Info Panel */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-700 mb-2">Thông tin cấu hình</div>
                  <div className="space-y-1 text-xs text-blue-600">
                    <div className="flex justify-between">
                      <span>Mã cấu hình:</span>
                      <span className="font-mono font-medium">{formData.IDCauHinh || 'Chưa có'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trạng thái:</span>
                      <span className="font-medium">{formData['Trạng thái'] || 'Chưa chọn'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Loại cấu hình:</span>
                      <span className="font-medium">
                        {isSelfConfig ? 'Tự động (1:1)' : 'Thông thường'}
                      </span>
                    </div>
                    {selectedMaterial && !isSelfConfig && (
                      <div className="flex justify-between">
                        <span>Hệ số quy đổi:</span>
                        <span className="font-medium">{formatNumber(selectedMaterial['Hệ số quy đổi'])}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white">
        <div className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 w-full">
            <div className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
              {selectedMaterial && formData['Số lượng cần'] > 0 && !isSelfConfig && (
                <span>
                  Tổng cần: {formatNumber(convertedQuantity)} {selectedMaterial['Đơn vị cơ sở']}
                </span>
              )}
              {isSelfConfig && (
                <span>Cấu hình tự động: 1 sản phẩm = 1 sản phẩm</span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto order-1 sm:order-2">
              <Button
                onClick={onCancel}
                variant="outline"
                disabled={isSubmitting}
                type="button"
                className="w-full sm:w-auto text-sm"
              >
                <X className="h-4 w-4 mr-2" />
                Hủy
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto text-sm"
                type="submit"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditMode ? 'Cập nhật cấu hình' : 'Thêm cấu hình'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
     </div>
  );
};