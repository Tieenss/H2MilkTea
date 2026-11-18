// components/InvoiceStats.tsx
'use client';

import { FileText, DollarSign, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '../utils/invoiceFormatters';
import type { InvoiceStats } from '../types/invoice';
import { useTodayOrdersContext } from '@/context/TodayOrdersContext';

interface InvoiceStatsProps {
  stats: InvoiceStats;
}

export const InvoiceStatsComponent: React.FC<InvoiceStatsProps> = ({ stats }) => {
  const { todayOrdersCount, loading } = useTodayOrdersContext();
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <Card className="min-w-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium truncate">Tổng hóa đơn</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="text-lg sm:text-xl xl:text-2xl font-bold truncate">{stats.totalInvoices}</div>
          <p className="text-xs text-muted-foreground">
            Tổng số hóa đơn trong hệ thống
          </p>
        </CardContent>
      </Card>
      
      <Card className="min-w-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium truncate">Doanh thu</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardHeader>
        <CardContent className="min-w-0">
          <div
            className="text-lg sm:text-xl xl:text-lg 2xl:text-2xl font-bold text-green-600 truncate"
            title={formatCurrency(stats.totalRevenue)}
          >
            {formatCurrency(stats.totalRevenue)}
          </div>
          <p className="text-xs text-muted-foreground">
            Tổng doanh thu đã thanh toán
          </p>
        </CardContent>
      </Card>
      
      <Card className="min-w-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium truncate">Chờ xác nhận</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="text-lg sm:text-xl xl:text-2xl font-bold text-yellow-600 truncate">{stats.pendingInvoices}</div>
          <p className="text-xs text-muted-foreground">
            Hóa đơn chờ xác nhận
          </p>
        </CardContent>
      </Card>
      
      <Card className="min-w-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium truncate">Đã hoàn thành</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="text-lg sm:text-xl xl:text-2xl font-bold text-blue-600 truncate">{stats.completedInvoices}</div>
          <p className="text-xs text-muted-foreground">
            Hóa đơn đã thanh toán
          </p>
        </CardContent>
      </Card>
      
      <Card className="border-rose-200 bg-rose-50/20 min-w-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-rose-900 truncate">Đã hủy (Kiểm toán)</CardTitle>
          <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="text-lg sm:text-xl xl:text-2xl font-bold text-rose-600 truncate">{stats.cancelledInvoices}</div>
          <p className="text-xs text-rose-600/90 font-medium truncate" title={`Thất thoát: ${formatCurrency(stats.cancelledLossRevenue || 0)}`}>
            Thất thoát: {formatCurrency(stats.cancelledLossRevenue || 0)}
          </p>
        </CardContent>
      </Card>
      
      <Card className="min-w-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium truncate">Hôm nay</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="text-lg sm:text-xl xl:text-2xl font-bold text-purple-600 truncate">
            {loading ? (
              <div className="animate-pulse bg-gray-200 h-8 w-8 rounded"></div>
            ) : (
              todayOrdersCount
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Đơn hàng trong ngày hôm nay
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
