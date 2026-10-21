'use client';

import React from 'react';
import { Coffee } from 'lucide-react';
import { GroupHubView } from '@/components/navigation/GroupHubView';
import { getNavigationByGroup } from '@/lib/navigation';

export default function MenuHubPage() {
  const items = getNavigationByGroup('Menu & Sản phẩm');

  return (
    <GroupHubView
      title="Menu & Sản Phẩm"
      description="Quản lý danh sách đồ uống, toppings, công thức và định lượng nguyên liệu cấu thành"
      icon={Coffee}
      items={items}
      accentGradient="from-amber-600 via-orange-600 to-yellow-600"
    />
  );
}
