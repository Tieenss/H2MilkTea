'use client';

import { useTodayOrdersContext } from '@/context/TodayOrdersContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';

export const TodayOrdersCard = () => {
  const { todayOrdersCount, loading } = useTodayOrdersContext();

  return (
    <Link href="/orders">
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Đơn hàng hôm nay</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? (
              <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
            ) : (
              todayOrdersCount
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Tổng số đơn hàng trong ngày
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}; 