'use client';

import { useEffect } from 'react';
import { getAppearanceSettings, applyAppearanceSettings } from '@/utils/appearanceSettings';

export function AppearanceProvider() {
  useEffect(() => {
    // Khởi tạo cài đặt ban đầu
    const settings = getAppearanceSettings();
    applyAppearanceSettings(settings);

    // Lắng nghe cập nhật từ các tab/window khác hoặc ngay trong session
    const handleUpdate = () => {
      const latest = getAppearanceSettings();
      applyAppearanceSettings(latest);
    };

    window.addEventListener('h2_appearance_settings_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('h2_appearance_settings_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return null;
}
