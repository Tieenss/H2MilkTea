'use client';

import { useTodayOrdersContext } from '@/context/TodayOrdersContext';
import { Badge } from '@/components/ui/badge';

export const TodayOrdersBadge = () => {
  const { todayOrdersCount, loading } = useTodayOrdersContext();

  if (loading) {
    return (
      <Badge variant="secondary" className="animate-pulse">
        ...
      </Badge>
    );
  }

  if (todayOrdersCount === 0) {
    return null; // Không hiển thị badge nếu không có đơn hàng
  }

  return (
    <Badge variant="destructive" className="ml-2">
      {todayOrdersCount}
    </Badge>
  );
}; 