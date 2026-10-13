import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { MaterialInventoryStats } from '../hooks/useMaterialInventory';
import { formatNumber } from '../utils/formatters';

interface MaterialInventoryStatsProps {
  stats: MaterialInventoryStats[];
  loading: boolean;
}

export const MaterialInventoryStats: React.FC<MaterialInventoryStatsProps> = ({ stats, loading }) => {
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

  const totalMaterials = stats.length;
  const totalNhap = stats.reduce((sum, item) => sum + item['Số lượng nhập'], 0);
  const totalBan = stats.reduce((sum, item) => sum + item['Số lượng bán'], 0);
  const totalTon = stats.reduce((sum, item) => sum + item['Số lượng tồn'], 0);
  const totalGiaTri = stats.reduce((sum, item) => sum + item['Giá trị tồn'], 0);
  
  const lowStockMaterials = stats.filter(item => item['Số lượng tồn'] <= 10);
  const outOfStockMaterials = stats.filter(item => item['Số lượng tồn'] === 0);

  return (
    <div className="space-y-6">
      {/* Thống kê tổng quan */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng NVL</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalMaterials)}</div>
            <p className="text-xs text-muted-foreground">
              Loại nguyên vật liệu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng nhập</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(totalNhap)}
            </div>
            <p className="text-xs text-muted-foreground">
              Số lượng đã nhập
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng bán</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatNumber(totalBan)}
            </div>
            <p className="text-xs text-muted-foreground">
              Số lượng đã bán
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng tồn</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(totalTon)}
            </div>
            <p className="text-xs text-muted-foreground">
              Giá trị: {formatNumber(totalGiaTri)} VNĐ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cảnh báo tồn kho */}
      {(lowStockMaterials.length > 0 || outOfStockMaterials.length > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Cảnh báo tồn kho
            </CardTitle>
            <CardDescription className="text-orange-700">
              Có {outOfStockMaterials.length} NVL hết hàng và {lowStockMaterials.length} NVL sắp hết
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {outOfStockMaterials.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700 mb-2">Hết hàng:</h4>
                  <div className="flex flex-wrap gap-2">
                    {outOfStockMaterials.map((item) => (
                      <Badge key={item.IDNguyenLieu} variant="destructive">
                        {item['Tên nguyên liệu']}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {lowStockMaterials.length > 0 && (
                <div>
                  <h4 className="font-medium text-orange-700 mb-2">Sắp hết hàng:</h4>
                  <div className="flex flex-wrap gap-2">
                    {lowStockMaterials
                      .filter(item => item['Số lượng tồn'] > 0)
                      .map((item) => (
                        <Badge key={item.IDNguyenLieu} variant="secondary" className="bg-orange-100 text-orange-800">
                          {item['Tên nguyên liệu']} ({item['Số lượng tồn']} {item['Đơn vị tính']})
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bảng thống kê chi tiết */}
      <Card>
        <CardHeader>
          <CardTitle>Thống kê chi tiết tồn kho</CardTitle>
          <CardDescription>
            Số lượng nhập, bán và tồn của từng nguyên vật liệu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Tên NVL</th>
                  <th className="text-right p-2 font-medium">Nhập</th>
                  <th className="text-right p-2 font-medium">Bán</th>
                  <th className="text-right p-2 font-medium">Tồn</th>
                  <th className="text-right p-2 font-medium">Giá trị tồn</th>
                  <th className="text-center p-2 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((item) => {
                  const isLowStock = item['Số lượng tồn'] <= 10;
                  const isOutOfStock = item['Số lượng tồn'] === 0;
                  
                  return (
                    <tr key={item.IDNguyenLieu} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{item['Tên nguyên liệu']}</td>
                      <td className="p-2 text-right text-green-600">
                        {formatNumber(item['Số lượng nhập'])} {item['Đơn vị tính']}
                      </td>
                      <td className="p-2 text-right text-red-600">
                        {formatNumber(item['Số lượng bán'])} {item['Đơn vị tính']}
                      </td>
                      <td className="p-2 text-right font-medium">
                        {formatNumber(item['Số lượng tồn'])} {item['Đơn vị tính']}
                      </td>
                      <td className="p-2 text-right">
                        {formatNumber(item['Giá trị tồn'])} VNĐ
                      </td>
                      <td className="p-2 text-center">
                        {isOutOfStock ? (
                          <Badge variant="destructive">Hết hàng</Badge>
                        ) : isLowStock ? (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            Sắp hết
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Đủ hàng
                          </Badge>
                        )}
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