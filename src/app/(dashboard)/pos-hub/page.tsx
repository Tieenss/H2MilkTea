'use client';

import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { GroupHubView } from '@/components/navigation/GroupHubView';
import { getNavigationByGroup } from '@/lib/navigation';

export default function POSHubPage() {
  const items = getNavigationByGroup('POS & Bán hàng');

  return (
    <GroupHubView
      title="POS & Bán Hàng"
      description="Trung tâm bán hàng trực tiếp, quản lý sơ đồ bàn, đơn đặt món online và kết nối nhà bếp KDS"
      icon={ShoppingCart}
      items={items}
      accentGradient="from-cyan-600 via-teal-600 to-emerald-600"
    />
  );
}
