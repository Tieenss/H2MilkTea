import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, Star, DollarSign, Users, Clock } from 'lucide-react';
import type { SupplierStats } from '../types/supplier';
import { formatCurrency } from '../utils/formatters';

interface SupplierStatsComponentProps {
  stats: SupplierStats;
}

export function SupplierStatsComponent({ stats }: SupplierStatsComponentProps) {
  const statCards = [
    {
      title: 'Tổng nhà cung cấp',
      value: stats.tongNhaCungCap,
      description: 'Tổng số nhà cung cấp',
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Đang hợp tác',
      value: stats.dangHopTac,
      description: 'Nhà cung cấp đang hoạt động',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Tạm ngưng',
      value: stats.tamNgung,
      description: 'Nhà cung cấp tạm ngưng',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Ngừng hợp tác',
      value: stats.ngungHopTac,
      description: 'Nhà cung cấp đã ngừng',
      icon: TrendingUp,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Tổng giá trị đặt hàng',
      value: formatCurrency(stats.tongGiaTriDatHang),
      description: 'Tổng giá trị các đơn hàng',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Đánh giá trung bình',
      value: `${stats.trungBinhDanhGia.toFixed(1)} ⭐`,
      description: 'Đánh giá trung bình của tất cả',
      icon: Star,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {statCards.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <IconComponent className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
} 