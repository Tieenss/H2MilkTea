// components/MaterialCalculator.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Calculator, Package, Beaker, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Product, Material, ProductMaterial } from '../types/productMaterial';

import { formatNumber, parseNumber } from '../utils/formatters';

interface MaterialCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  materials: Material[];
  productMaterials: ProductMaterial[];
}

export const MaterialCalculator: React.FC<MaterialCalculatorProps> = ({
  isOpen,
  onClose,
  products,
  materials,
  productMaterials
}) => {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [calculationResults, setCalculationResults] = useState<any[]>([]);

  // Get materials for selected product
  const productConfigs = useMemo(() => {
    if (!selectedProduct) return [];
    return productMaterials.filter(config => 
      config.IDSP === selectedProduct && config['Trạng thái'] === 'Hoạt động'
    );
  }, [selectedProduct, productMaterials]);

  // Calculate material needs
  const calculateMaterials = () => {
    if (!selectedProduct || quantity <= 0) {
      setCalculationResults([]);
      return;
    }

    const results = productConfigs.map(config => {
      const material = materials.find(m => m.IDNguyenLieu === config.IDNguyenLieu);
      const totalNeeded = (config['Số lượng cần'] || 0) * quantity;
      const totalInBaseUnit = totalNeeded * (material?.['Hệ số quy đổi'] || 1);

      return {
        ...config,
        materialInfo: material,
        totalNeeded,
        totalInBaseUnit,
        displayUnit: config['Đơn vị sử dụng'] || material?.['Đơn vị tính'] || 'đơn vị',
        baseUnit: material?.['Đơn vị cơ sở'] || 'đơn vị cơ sở'
      };
    });

    setCalculationResults(results);
  };

  // Auto calculate when inputs change
  React.useEffect(() => {
    calculateMaterials();
  }, [selectedProduct, quantity, productConfigs]);

  const selectedProductInfo = useMemo(() => {
    return products.find(p => p.IDSP === selectedProduct);
  }, [selectedProduct, products]);

  const totalMaterialTypes = calculationResults.length;
  const totalBaseUnits = calculationResults.reduce((sum, result) => sum + result.totalInBaseUnit, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-purple-600" />
            Máy tính định mức nguyên vật liệu
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="space-y-6">
            {/* Input Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Chọn sản phẩm <span className="text-red-500">*</span>
                  </Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-500" />
                        <SelectValue placeholder="Chọn sản phẩm để tính toán" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.IDSP} value={product.IDSP}>
                          <div className="flex flex-col">
                            <span className="font-medium">{product['Tên sản phẩm']}</span>
                            <span className="text-xs text-gray-500">{product.IDSP} • {product['Loại sản phẩm']}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-sm font-medium text-gray-700">
                    Số lượng sản xuất <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseNumber(e.target.value) || 1)}
                    placeholder="Nhập số lượng cần sản xuất"
                    className="h-10"
                  />
                  <p className="text-xs text-gray-500">
                    Nhập số lượng {selectedProductInfo?.['Tên sản phẩm'] || 'sản phẩm'} cần sản xuất
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-4">
                {selectedProduct && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-5 w-5 text-blue-600" />
                        Thông tin sản xuất
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sản phẩm:</span>
                        <span className="font-medium">{selectedProductInfo?.['Tên sản phẩm']}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Số lượng:</span>
                        <span className="font-semibold text-blue-600">{formatNumber(quantity)} sản phẩm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Loại NVL cần:</span>
                        <span className="font-medium text-green-600">{totalMaterialTypes} loại</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tổng định mức:</span>
                        <span className="font-semibold text-orange-600">{formatNumber(totalBaseUnits)} đơn vị cơ sở</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Results Section */}
            {selectedProduct && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Beaker className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-800">
                    Định mức nguyên vật liệu
                  </h3>
                </div>

                {calculationResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {calculationResults.map((result, index) => (
                      <Card key={index} className="border-l-4 border-l-green-500">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Beaker className="h-4 w-4 text-green-600" />
                            <span className="truncate" title={result['Tên nguyên liệu']}>
                              {result['Tên nguyên liệu']}
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Định mức/SP:</span>
                              <span className="text-sm font-medium">
                                {formatNumber(result['Số lượng cần'])} {result.displayUnit}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Tổng cần:</span>
                              <span className="text-sm font-semibold text-purple-600">
                                {formatNumber(result.totalNeeded)} {result.displayUnit}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Quy đổi:</span>
                              <span className="text-sm font-semibold text-orange-600">
                                {formatNumber(result.totalInBaseUnit)} {result.baseUnit}
                              </span>
                            </div>
                          </div>
                          
                          <div className="pt-2 border-t">
                            <div className="text-xs text-gray-500 space-y-1">
                              <div>Mã NVL: {result.IDNguyenLieu}</div>
                              <div>Hệ số QĐ: {formatNumber(result.materialInfo?.['Hệ số quy đổi'] || 1)}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                      <div className="text-center">
                        <h4 className="text-lg font-medium text-gray-600 mb-2">
                          Chưa có cấu hình nguyên vật liệu
                        </h4>
                        <p className="text-gray-500">
                          Sản phẩm này chưa được cấu hình nguyên vật liệu.
                          Vui lòng thêm cấu hình trước khi tính toán.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Export/Action Section */}
            {calculationResults.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-gray-800">
                      Kết quả tính toán cho {formatNumber(quantity)} {selectedProductInfo?.['Tên sản phẩm']}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Xuất Excel
                    </Button>
                    <Button variant="outline" size="sm">
                      In báo cáo
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={calculateMaterials} className="bg-purple-600 hover:bg-purple-700">
            <Calculator className="h-4 w-4 mr-2" />
            Tính toán lại
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};