// components/CustomerStats.tsx
'use client';

import { Users, UserPlus, Crown, Diamond, Activity, Gift, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPoints } from '../utils/customerFormatters';
import type { CustomerStats } from '../types/customer';

interface CustomerStatsProps {
  stats: CustomerStats;
}

export const CustomerStatsComponent: React.FC<CustomerStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng khách hàng</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCustomers}</div>
          <p className="text-xs text-muted-foreground">
            Khách hàng trong hệ thống
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Khách mới tháng này</CardTitle>
          <UserPlus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.newCustomersThisMonth}</div>
          <p className="text-xs text-muted-foreground">
            Khách hàng mới trong tháng
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Khách VIP</CardTitle>
          <Crown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.vipCustomers}</div>
          <p className="text-xs text-muted-foreground">
            Khách hàng VIP
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Khách kim cương</CardTitle>
          <Diamond className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{stats.diamondCustomers}</div>
          <p className="text-xs text-muted-foreground">
            Khách hàng kim cương
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Đang hoạt động</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">{stats.activeCustomers}</div>
          <p className="text-xs text-muted-foreground">
            Khách hàng hoạt động
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng điểm tích lũy</CardTitle>
          <Gift className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {formatPoints(stats.totalLoyaltyPoints)}
          </div>
          <p className="text-xs text-muted-foreground">
            Điểm tích lũy toàn hệ thống
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng chi tiêu</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
</CardHeader>
<CardContent>
<div className="text-2xl font-bold text-indigo-600">
{formatCurrency(stats.totalSpending)}
</div>
<p className="text-xs text-muted-foreground">
Tổng doanh thu từ khách hàng
</p>
</CardContent>
</Card>
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">Chi tiêu TB</CardTitle>
      <TrendingUp className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-teal-600">
        {formatCurrency(stats.averageSpending)}
      </div>
      <p className="text-xs text-muted-foreground">
        Chi tiêu trung bình/khách
      </p>
    </CardContent>
  </Card>
</div>
);
};