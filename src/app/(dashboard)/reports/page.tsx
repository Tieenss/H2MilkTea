'use client';

import React from 'react';
import { PieChart } from 'lucide-react';
import { GroupHubView } from '@/components/navigation/GroupHubView';
import { getNavigationByGroup } from '@/lib/navigation';

export default function ReportsHubPage() {
  const items = getNavigationByGroup('Báo cáo');

  return (
    <GroupHubView
      title="Báo Cáo & Thống Kê"
      description="Trung tâm phân tích doanh thu, thống kê món bán chạy, hiệu suất làm việc của nhân sự và báo cáo tài chính"
      icon={PieChart}
      items={items}
      accentGradient="from-purple-600 via-violet-600 to-indigo-600"
    />
  );
}
