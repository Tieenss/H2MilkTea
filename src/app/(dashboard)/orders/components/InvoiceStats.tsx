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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng hóa đơn</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalInvoices}</div>
          <p className="text-xs text-muted-foreground">
            Tổng số hóa đơn trong hệ thống
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Doanh thu</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.totalRevenue)}
          </div>
          <p className="text-xs text-muted-foreground">
            Tổng doanh thu đã thanh toán
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Chờ xác nhận</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.pendingInvoices}</div>
          <p className="text-xs text-muted-foreground">
            Hóa đơn chờ xác nhận
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Đã hoàn thành</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.completedInvoices}</div>
          <p className="text-xs text-muted-foreground">
            Hóa đơn đã thanh toán
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Đã hủy</CardTitle>
          <XCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.cancelledInvoices}</div>
          <p className="text-xs text-muted-foreground">
            Hóa đơn đã bị hủy
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hôm nay</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">
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