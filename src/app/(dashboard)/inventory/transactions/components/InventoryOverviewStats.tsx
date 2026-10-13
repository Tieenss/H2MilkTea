import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, TrendingUp, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';
import { formatNumber } from '../utils/formatters';

interface InventoryOverviewStatsProps {
  stats: {
    tongNhap: number;
    tongXuat: number;
    tonKho: number;
    giaTriTonKho: number;
    soGiaoDichThang: number;
    soGiaoDichNgay: number;
  };
  loading: boolean;
}

export const InventoryOverviewStats: React.FC<InventoryOverviewStatsProps> = ({ stats, loading }) => {
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

  const { tongNhap, tongXuat, tonKho, giaTriTonKho, soGiaoDichThang, soGiaoDichNgay } = stats;

  return (
    <div className="space-y-6">
      {/* Thống kê tổng quan */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng nhập</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(tongNhap)}
            </div>
            <p className="text-xs text-muted-foreground">
              Số lượng đã nhập kho
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng xuất</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatNumber(tongXuat)}
            </div>
            <p className="text-xs text-muted-foreground">
              Số lượng đã xuất kho
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tồn kho</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(tonKho)}
            </div>
            <p className="text-xs text-muted-foreground">
              Số lượng hiện tại
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Giá trị tồn</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatNumber(giaTriTonKho)} VNĐ
            </div>
            <p className="text-xs text-muted-foreground">
              Tổng giá trị tồn kho
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Thống kê giao dịch */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Hoạt động giao dịch
            </CardTitle>
            <CardDescription>
              Thống kê giao dịch trong tháng và ngày hiện tại
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Giao dịch tháng này:</span>
                <Badge variant="default" className="bg-blue-100 text-blue-800">
                  {formatNumber(soGiaoDichThang)}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Giao dịch hôm nay:</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {formatNumber(soGiaoDichNgay)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Cảnh báo tồn kho
            </CardTitle>
            <CardDescription>
              Tình trạng tồn kho hiện tại
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Tỷ lệ sử dụng:</span>
                <Badge variant="default" className="bg-purple-100 text-purple-800">
                  {tongNhap > 0 ? Math.round((tongXuat / tongNhap) * 100) : 0}%
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Hiệu suất kho:</span>
                <Badge 
                  variant="default" 
                  className={tonKho > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                >
                  {tonKho > 0 ? 'Tốt' : 'Cần bổ sung'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Biểu đồ tỷ lệ */}
      <Card>
        <CardHeader>
          <CardTitle>Phân tích tồn kho</CardTitle>
          <CardDescription>
            Tỷ lệ nhập, xuất và tồn kho
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Nhập kho</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${tongNhap > 0 ? (tongNhap / (tongNhap + tongXuat + tonKho)) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">
                  {formatNumber(tongNhap)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Xuất kho</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full" 
                    style={{ width: `${tongXuat > 0 ? (tongXuat / (tongNhap + tongXuat + tonKho)) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">
                  {formatNumber(tongXuat)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tồn kho</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${tonKho > 0 ? (tonKho / (tongNhap + tongXuat + tonKho)) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">
                  {formatNumber(tonKho)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 