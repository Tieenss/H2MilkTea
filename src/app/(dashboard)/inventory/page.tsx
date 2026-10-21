'use client';

import React from 'react';
import { Warehouse } from 'lucide-react';
import { GroupHubView } from '@/components/navigation/GroupHubView';
import { getNavigationByGroup } from '@/lib/navigation';

export default function InventoryHubPage() {
  const items = getNavigationByGroup('Quản lý kho');

  return (
    <GroupHubView
      title="Quản Lý Kho Hàng"
      description="Quản lý nhập xuất nguyên vật liệu, kiểm kê tồn kho, nhà cung cấp và mô hình AI dự báo nhu cầu nhập hàng"
      icon={Warehouse}
      items={items}
      accentGradient="from-emerald-600 via-teal-600 to-green-600"
    />
  );
}
