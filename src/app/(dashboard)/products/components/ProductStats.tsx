'use client';

import { Package, TrendingUp, AlertTriangle, Archive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Product } from '../types/product';
import { formatCurrency } from '../utils/formatters';

interface ProductStatsProps {
  products: Product[];
}

export const ProductStats: React.FC<ProductStatsProps> = ({ products }) => {
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p['Trạng thái'] === 'Hoạt động').length;
  const outOfStockProducts = products.filter(p => p['Trạng thái'] === 'Hết hàng').length;
  const discontinuedProducts = products.filter(p => p['Trạng thái'] === 'Ngừng kinh doanh').length;

  const categories = Array.from(new Set(products.map(p => p['Loại sản phẩm']).filter(Boolean)));
  const categoryCount = categories.length;

  const averagePrice = products.length > 0 
    ? products.reduce((sum, p) => sum + (p['Đơn giá'] || 0), 0) / products.length
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng sản phẩm</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalProducts}</div>
          <p className="text-xs text-muted-foreground">
            Hoạt động: {activeProducts} | Ngừng: {discontinuedProducts}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Giá trung bình</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(averagePrice)}
          </div>
          <p className="text-xs text-muted-foreground">
            Đơn giá trung bình
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hết hàng</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{outOfStockProducts}</div>
          <p className="text-xs text-muted-foreground">
            Cần nhập hàng
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Loại sản phẩm</CardTitle>
          <Archive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{categoryCount}</div>
          <p className="text-xs text-muted-foreground">
            Danh mục sản phẩm
          </p>
        </CardContent>
      </Card>
    </div>
  );
};