import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, AlertTriangle, BarChart3, DollarSign, TrendingDown } from 'lucide-react';
import type { ForecastStats } from '../types/forecast';
import { formatCurrency, formatPercentage } from '../utils/formatters';

interface ForecastStatsComponentProps {
  stats: ForecastStats;
}

export function ForecastStatsComponent({ stats }: ForecastStatsComponentProps) {
  const statCards = [
    {
      title: 'Tổng dự báo',
      value: stats.tongDuBao,
      description: 'Tổng số dự báo đã tạo',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Dự báo chính xác',
      value: stats.duBaoChinhXac,
      description: 'Dự báo có độ chính xác ≥85%',
      icon: Target,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Cần điều chỉnh',
      value: stats.duBaoCanDieuChinh,
      description: 'Dự báo cần điều chỉnh',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Tỷ lệ chính xác TB',
      value: formatPercentage(stats.tyLeChinhXacTrungBinh),
      description: 'Tỷ lệ chính xác trung bình',
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Tổng giá trị dự báo',
      value: formatCurrency(stats.tongGiaTriDuBao),
      description: 'Tổng giá trị các dự báo',
      icon: DollarSign,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Tổng chênh lệch',
      value: formatCurrency(stats.tongChenhLech),
      description: 'Tổng chênh lệch dự báo',
      icon: TrendingDown,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
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