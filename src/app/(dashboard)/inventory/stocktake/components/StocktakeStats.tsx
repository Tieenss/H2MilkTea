'use client';

import React from 'react';
import { ClipboardList, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { StocktakeStats } from '../types/stocktake';

interface StocktakeStatsComponentProps {
  stats: StocktakeStats;
}

export function StocktakeStatsComponent({ stats }: StocktakeStatsComponentProps) {
  const statCards = [
    {
      title: 'Tổng kiểm kê',
      value: stats.TongKiemKe,
      description: 'Lần kiểm kê trong tháng',
      icon: ClipboardList,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Đang thực hiện',
      value: stats.DangThucHien,
      description: 'Kiểm kê đang tiến hành',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Hoàn thành',
      value: stats.HoanThanh,
      description: 'Kiểm kê đã hoàn thành',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Có chênh lệch',
      value: stats.CoChenhLech,
      description: 'Kiểm kê có sai lệch',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Tỷ lệ chính xác',
      value: `${stats.TyLeChinhXac}%`,
      description: 'Độ chính xác trung bình',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Giá trị tồn kho',
      value: `${(stats.GiaTriTonKho || 0).toLocaleString('vi-VN')}đ`,
      description: 'Tổng giá trị hiện tại',
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
      {statCards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <IconComponent className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
} 