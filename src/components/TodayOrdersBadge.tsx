'use client';

import { useTodayOrdersContext } from '@/context/TodayOrdersContext';
import { Badge } from '@/components/ui/badge';
import { usePathname } from 'next/navigation';

export const TodayOrdersBadge = () => {
  const { unreadOrdersCount, loading } = useTodayOrdersContext();
  const pathname = usePathname();

  // Đang xem trang /orders thì ẩn luôn badge cảnh báo
  if (pathname === '/orders') {
    return null;
  }

  if (loading) {
    return null;
  }

  // Nếu không có đơn mới chưa xem thì ẩn hoàn toàn badge
  if (unreadOrdersCount <= 0) {
    return null;
  }

  return (
    <Badge
      variant="destructive"
      className="ml-2 px-1.5 py-0.2 min-w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full bg-red-600 text-white shadow-xs animate-pulse"
      title={`${unreadOrdersCount} đơn mới chưa xem`}
    >
      {unreadOrdersCount > 99 ? '99+' : unreadOrdersCount}
    </Badge>
  );
};
