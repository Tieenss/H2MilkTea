'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown,
  Package,
  Users,
  Clock,
  Target
} from 'lucide-react';
import { ReportData } from '@/hooks/useReportData';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ReportKPICardsProps {
  data: ReportData;
  className?: string;
}

export const ReportKPICards: React.FC<ReportKPICardsProps> = ({ data, className }) => {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' ₫';
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getGrowthColor = (isPositive: boolean) => {
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  const getGrowthIcon = (isPositive: boolean) => {
    return isPositive ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getTimeRangeLabel = () => {
    const { type, current } = data.timeRange;
    const fromDate = format(current.from, 'dd/MM/yyyy', { locale: vi });
    const toDate = format(current.to, 'dd/MM/yyyy', { locale: vi });
    
    switch (type) {
      case 'day':
        return `Ngày ${fromDate}`;
      case 'week':
        return `Tuần từ ${fromDate} đến ${toDate}`;
      case 'month':
        return `Tháng ${format(current.from, 'MM/yyyy', { locale: vi })}`;
      case 'quarter':
        return `Quý ${Math.ceil((current.from.getMonth() + 1) / 3)}/${current.from.getFullYear()}`;
      case 'year':
        return `Năm ${current.from.getFullYear()}`;
      default:
        return `Từ ${fromDate} đến ${toDate}`;
    }
  };

  const getPreviousPeriodLabel = () => {
    const { type, previous } = data.timeRange;
    const fromDate = format(previous.from, 'dd/MM/yyyy', { locale: vi });
    const toDate = format(previous.to, 'dd/MM/yyyy', { locale: vi });
    
    switch (type) {
      case 'day':
        return `Ngày ${fromDate}`;
      case 'week':
        return `Tuần từ ${fromDate} đến ${toDate}`;
      case 'month':
        return `Tháng ${format(previous.from, 'MM/yyyy', { locale: vi })}`;
      case 'quarter':
        return `Quý ${Math.ceil((previous.from.getMonth() + 1) / 3)}/${previous.from.getFullYear()}`;
      case 'year':
        return `Năm ${previous.from.getFullYear()}`;
      default:
        return `Từ ${fromDate} đến ${toDate}`;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Time Range Info */}
      <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
        <h3 className="text-lg font-semibold text-purple-900 mb-1">
          {getTimeRangeLabel()}
        </h3>
        <p className="text-sm text-purple-600">
          So sánh với {getPreviousPeriodLabel()}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Card */}
        <Card className="border-l-4 border-l-purple-600 transform transition-all duration-200 hover:scale-105 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Doanh Thu</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {formatCurrency(data.current.revenue)}
            </div>
            <div className="flex items-center gap-1 text-xs mt-1">
              {getGrowthIcon(data.comparison.isRevenuePositive)}
              <span className={getGrowthColor(data.comparison.isRevenuePositive)}>
                {formatPercentage(data.comparison.revenueGrowth)}
              </span>
              <span className="text-muted-foreground">so với kỳ trước</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Kỳ trước: {formatCurrency(data.previous.revenue)}
            </div>
          </CardContent>
        </Card>

        {/* Orders Card */}
        <Card className="border-l-4 border-l-purple-500 transform transition-all duration-200 hover:scale-105 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Đơn Hàng</CardTitle>
            <ShoppingCart className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {data.current.orders.toLocaleString('vi-VN')}
            </div>
            <div className="flex items-center gap-1 text-xs mt-1">
              {getGrowthIcon(data.comparison.isOrdersPositive)}
              <span className={getGrowthColor(data.comparison.isOrdersPositive)}>
                {formatPercentage(data.comparison.ordersGrowth)}
              </span>
              <span className="text-muted-foreground">so với kỳ trước</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Kỳ trước: {data.previous.orders.toLocaleString('vi-VN')} đơn
            </div>
          </CardContent>
        </Card>

        {/* Average Order Value Card */}
        <Card className="border-l-4 border-l-purple-400 transform transition-all duration-200 hover:scale-105 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Giá Trị TB/Đơn</CardTitle>
            <Target className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {formatCurrency(data.current.averageOrderValue)}
            </div>
            <div className="flex items-center gap-1 text-xs mt-1">
              {getGrowthIcon(data.comparison.isAverageOrderValuePositive)}
              <span className={getGrowthColor(data.comparison.isAverageOrderValuePositive)}>
                {formatPercentage(data.comparison.averageOrderValueGrowth)}
              </span>
              <span className="text-muted-foreground">so với kỳ trước</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Kỳ trước: {formatCurrency(data.previous.averageOrderValue)}
            </div>
          </CardContent>
        </Card>

        {/* Top Product Card */}
        <Card className="border-l-4 border-l-purple-300 transform transition-all duration-200 hover:scale-105 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sản Phẩm Bán Chạy</CardTitle>
            <Package className="h-4 w-4 text-purple-300" />
          </CardHeader>
          <CardContent>
            {data.current.products.length > 0 ? (
              <>
                <div className="text-lg font-bold text-purple-900 truncate">
                  {data.current.products[0].name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {data.current.products[0].quantity} ly - {formatCurrency(data.current.products[0].revenue)}
                </div>
                <Badge variant="outline" className="mt-1 text-xs">
                  {data.current.products[0].category}
                </Badge>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Không có dữ liệu
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Categories Summary */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Danh Mục Hàng Đầu
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.current.categories.slice(0, 3).map((category, index) => (
              <div key={index} className="flex items-center justify-between py-1">
                <span className="text-sm font-medium">{category.name}</span>
                <div className="text-right">
                  <div className="text-sm font-bold">{formatCurrency(category.revenue)}</div>
                  <div className="text-xs text-muted-foreground">{category.percentage.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Payment Methods Summary */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Phương Thức Thanh Toán
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.current.paymentMethods.slice(0, 3).map((payment, index) => (
              <div key={index} className="flex items-center justify-between py-1">
                <span className="text-sm font-medium">{payment.method}</span>
                <div className="text-right">
                  <div className="text-sm font-bold">{payment.count} đơn</div>
                  <div className="text-xs text-muted-foreground">{payment.percentage.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Hiệu Suất
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Tăng trưởng doanh thu</span>
                <Badge 
                  variant={data.comparison.isRevenuePositive ? "default" : "destructive"}
                  className="text-xs"
                >
                  {formatPercentage(data.comparison.revenueGrowth)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Tăng trưởng đơn hàng</span>
                <Badge 
                  variant={data.comparison.isOrdersPositive ? "default" : "destructive"}
                  className="text-xs"
                >
                  {formatPercentage(data.comparison.ordersGrowth)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Tăng trưởng giá trị TB</span>
                <Badge 
                  variant={data.comparison.isAverageOrderValuePositive ? "default" : "destructive"}
                  className="text-xs"
                >
                  {formatPercentage(data.comparison.averageOrderValueGrowth)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 