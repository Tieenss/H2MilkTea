import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Package, DollarSign, Calendar, Clock } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { InventoryStats } from '../types/inventory';

interface InventoryStatsComponentProps {
  stats: InventoryStats;
}

export const InventoryStatsComponent: React.FC<InventoryStatsComponentProps> = ({ stats }) => {
  const statCards = [
    {
      title: 'Tổng nhập kho',
      value: formatCurrency(stats.tongNhap),
      description: 'Tổng giá trị hàng nhập',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Tổng xuất kho',
      value: formatCurrency(stats.tongXuat),
      description: 'Tổng giá trị hàng xuất',
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Tồn kho',
      value: formatCurrency(stats.tonKho),
      description: 'Giá trị hàng tồn kho',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Giao dịch tháng',
      value: stats.soGiaoDichThang.toString(),
      description: 'Số giao dịch trong tháng',
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Giao dịch hôm nay',
      value: stats.soGiaoDichNgay.toString(),
      description: 'Số giao dịch hôm nay',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Giá trị tồn kho',
      value: formatCurrency(stats.giaTriTonKho),
      description: 'Tổng giá trị tồn kho',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {card.value}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}; 