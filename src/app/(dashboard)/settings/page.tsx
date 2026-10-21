'use client';

import React from 'react';
import { Settings } from 'lucide-react';
import { GroupHubView } from '@/components/navigation/GroupHubView';
import { getNavigationByGroup } from '@/lib/navigation';

export default function SettingsHubPage() {
  const items = getNavigationByGroup('Cài đặt');

  return (
    <GroupHubView
      title="Cài Đặt Hệ Thống"
      description="Quản trị cấu hình toàn diện: font chữ, giao diện, phân quyền nhân sự, trợ lý AI, mẫu in hóa đơn/tem nhãn và sao lưu dữ liệu"
      icon={Settings}
      items={items}
      accentGradient="from-slate-700 via-gray-800 to-indigo-900"
    />
  );
}
