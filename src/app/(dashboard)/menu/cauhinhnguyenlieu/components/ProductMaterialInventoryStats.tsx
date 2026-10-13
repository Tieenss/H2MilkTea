import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, TrendingUp, TrendingDown, Settings, BarChart3 } from 'lucide-react';
import { ProductMaterialInventoryStats } from '../hooks/useProductMaterialInventory';
import { formatNumber } from '../utils/formatters';

interface ProductMaterialInventoryStatsProps {
  stats: ProductMaterialInventoryStats[];
  loading: boolean;
}

export const ProductMaterialInventoryStats: React.FC<ProductMaterialInventoryStatsProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đang tải...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalProducts = stats.length;
  const totalSold = stats.reduce((sum, item) => sum + item['Số lượng bán'], 0);
  const totalMaterialsUsed = stats.reduce((sum, item) => sum + item['Tổng NVL sử dụng'], 0);
  const totalMaterialsConsumed = stats.reduce((sum, item) => sum + item['Tổng NVL tiêu thụ'], 0);
  
  const bestSellers = stats.filter(item => item['Trạng thái'] === 'Bán chạy');
  const goodSellers = stats.filter(item => item['Trạng thái'] === 'Bán tốt');
  const lowSellers = stats.filter(item => item['Trạng thái'] === 'Ít bán');

  return (
    <div className="space-y-6">
      {/* Thống kê tổng quan */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng sản phẩm</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalProducts)}</div>
            <p className="text-xs text-muted-foreground">
              Sản phẩm có cấu hình NVL
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng bán</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(totalSold)}
            </div>
            <p className="text-xs text-muted-foreground">
              Số lượng sản phẩm đã bán
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NVL sử dụng</CardTitle>
            <Settings className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(totalMaterialsUsed)}
            </div>
            <p className="text-xs text-muted-foreground">
              Tổng NVL cần cho 1 sản phẩm
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NVL tiêu thụ</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatNumber(totalMaterialsConsumed)}
            </div>
            <p className="text-xs text-muted-foreground">
              Tổng NVL đã tiêu thụ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Phân tích hiệu suất bán hàng */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <TrendingUp className="h-5 w-5" />
              Bán chạy
            </CardTitle>
            <CardDescription className="text-green-700">
              {bestSellers.length} sản phẩm
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bestSellers.slice(0, 3).map((item) => (
                <div key={item.IDSP} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-green-800 truncate">
                    {item['Tên sản phẩm']}
                  </span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {formatNumber(item['Số lượng bán'])}
                  </Badge>
                </div>
              ))}
              {bestSellers.length > 3 && (
                <div className="text-xs text-green-600">
                  +{bestSellers.length - 3} sản phẩm khác
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <BarChart3 className="h-5 w-5" />
              Bán tốt
            </CardTitle>
            <CardDescription className="text-blue-700">
              {goodSellers.length} sản phẩm
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {goodSellers.slice(0, 3).map((item) => (
                <div key={item.IDSP} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-800 truncate">
                    {item['Tên sản phẩm']}
                  </span>
                  <Badge variant="default" className="bg-blue-100 text-blue-800">
                    {formatNumber(item['Số lượng bán'])}
                  </Badge>
                </div>
              ))}
              {goodSellers.length > 3 && (
                <div className="text-xs text-blue-600">
                  +{goodSellers.length - 3} sản phẩm khác
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <TrendingDown className="h-5 w-5" />
              Ít bán
            </CardTitle>
            <CardDescription className="text-orange-700">
              {lowSellers.length} sản phẩm
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowSellers.slice(0, 3).map((item) => (
                <div key={item.IDSP} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-800 truncate">
                    {item['Tên sản phẩm']}
                  </span>
                  <Badge variant="default" className="bg-orange-100 text-orange-800">
                    {formatNumber(item['Số lượng bán'])}
                  </Badge>
                </div>
              ))}
              {lowSellers.length > 3 && (
                <div className="text-xs text-orange-600">
                  +{lowSellers.length - 3} sản phẩm khác
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bảng thống kê chi tiết */}
      <Card>
        <CardHeader>
          <CardTitle>Thống kê chi tiết cấu hình NVL</CardTitle>
          <CardDescription>
            Số lượng bán và tiêu thụ nguyên vật liệu theo sản phẩm
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Tên sản phẩm</th>
                  <th className="text-right p-2 font-medium">NVL sử dụng</th>
                  <th className="text-right p-2 font-medium">Số lượng bán</th>
                  <th className="text-right p-2 font-medium">NVL tiêu thụ</th>
                  <th className="text-center p-2 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((item) => {
                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'Bán chạy':
                        return 'bg-green-100 text-green-800';
                      case 'Bán tốt':
                        return 'bg-blue-100 text-blue-800';
                      case 'Bán trung bình':
                        return 'bg-yellow-100 text-yellow-800';
                      case 'Ít bán':
                        return 'bg-orange-100 text-orange-800';
                      default:
                        return 'bg-gray-100 text-gray-800';
                    }
                  };
                  
                  return (
                    <tr key={item.IDSP} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{item['Tên sản phẩm']}</td>
                      <td className="p-2 text-right text-blue-600">
                        {formatNumber(item['Tổng NVL sử dụng'])}
                      </td>
                      <td className="p-2 text-right text-green-600">
                        {formatNumber(item['Số lượng bán'])}
                      </td>
                      <td className="p-2 text-right font-medium">
                        {formatNumber(item['Tổng NVL tiêu thụ'])}
                      </td>
                      <td className="p-2 text-center">
                        <Badge variant="default" className={getStatusColor(item['Trạng thái'])}>
                          {item['Trạng thái']}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 