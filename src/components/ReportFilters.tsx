'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { Filter, X, RefreshCw } from 'lucide-react';
import AuthUtils from '@/utils/authUtils';

export interface ReportFiltersProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (dateRange: DateRange | undefined) => void;
  categories: string[];
  onCategoriesChange: (categories: string[]) => void;
  paymentMethods: string[];
  onPaymentMethodsChange: (paymentMethods: string[]) => void;
  minAmount: number | undefined;
  onMinAmountChange: (amount: number | undefined) => void;
  maxAmount: number | undefined;
  onMaxAmountChange: (amount: number | undefined) => void;
  onReset: () => void;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  dateRange,
  onDateRangeChange,
  categories,
  onCategoriesChange,
  paymentMethods,
  onPaymentMethodsChange,
  minAmount,
  onMinAmountChange,
  maxAmount,
  onMaxAmountChange,
  onReset
}) => {
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const [sanPhamRes, hoaDonRes] = await Promise.all([
        AuthUtils.getAllSanPham(),
        AuthUtils.getAllHoaDon()
      ]);

      const sanPhams = Array.isArray(sanPhamRes) ? sanPhamRes : sanPhamRes.data;
      const hoaDons = Array.isArray(hoaDonRes) ? hoaDonRes : hoaDonRes.data;

      // Extract unique categories
      const categories = [...new Set(sanPhams.map(sp => sp['Loại sản phẩm']).filter(Boolean))];
      setAvailableCategories(categories);

      // Extract unique payment methods
      const paymentMethods = [...new Set(hoaDons.map(hd => hd['Loại thanh toán']).filter(Boolean))];
      setAvailablePaymentMethods(paymentMethods);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const handleCategoryToggle = (category: string) => {
    if (categories.includes(category)) {
      onCategoriesChange(categories.filter(c => c !== category));
    } else {
      onCategoriesChange([...categories, category]);
    }
  };

  const handlePaymentMethodToggle = (method: string) => {
    if (paymentMethods.includes(method)) {
      onPaymentMethodsChange(paymentMethods.filter(m => m !== method));
    } else {
      onPaymentMethodsChange([...paymentMethods, method]);
    }
  };

  const handleReset = () => {
    onDateRangeChange(undefined);
    onCategoriesChange([]);
    onPaymentMethodsChange([]);
    onMinAmountChange(undefined);
    onMaxAmountChange(undefined);
    onReset();
  };

  const hasActiveFilters = dateRange || categories.length > 0 || paymentMethods.length > 0 || minAmount || maxAmount;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Bộ Lọc Báo Cáo
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                {[
                  dateRange && 'Thời gian',
                  categories.length > 0 && `${categories.length} danh mục`,
                  paymentMethods.length > 0 && `${paymentMethods.length} phương thức`,
                  minAmount && 'Số tiền tối thiểu',
                  maxAmount && 'Số tiền tối đa'
                ].filter(Boolean).join(', ')}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Thu gọn' : 'Mở rộng'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label>Khoảng thời gian</Label>
          <DateRangePicker
            date={dateRange}
            onDateChange={onDateRangeChange}
            placeholder="Chọn khoảng thời gian"
          />
        </div>

        {isExpanded && (
          <>
            {/* Amount Range Filters */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Số tiền tối thiểu (VNĐ)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minAmount || ''}
                  onChange={(e) => onMinAmountChange(e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
              <div className="space-y-2">
                <Label>Số tiền tối đa (VNĐ)</Label>
                <Input
                  type="number"
                  placeholder="Không giới hạn"
                  value={maxAmount || ''}
                  onChange={(e) => onMaxAmountChange(e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            </div>

            {/* Categories Filter */}
            {availableCategories.length > 0 && (
              <div className="space-y-2">
                <Label>Danh mục sản phẩm</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableCategories.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category}`}
                        checked={categories.includes(category)}
                        onCheckedChange={() => handleCategoryToggle(category)}
                      />
                      <Label
                        htmlFor={`category-${category}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {category}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Methods Filter */}
            {availablePaymentMethods.length > 0 && (
              <div className="space-y-2">
                <Label>Phương thức thanh toán</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availablePaymentMethods.map((method) => (
                    <div key={method} className="flex items-center space-x-2">
                      <Checkbox
                        id={`payment-${method}`}
                        checked={paymentMethods.includes(method)}
                        onCheckedChange={() => handlePaymentMethodToggle(method)}
                      />
                      <Label
                        htmlFor={`payment-${method}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {method}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-1" />
                Xóa bộ lọc
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadFilterOptions}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Làm mới
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}; 