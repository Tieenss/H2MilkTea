import { useState, useEffect, useCallback } from 'react';
import authUtils from '@/utils/authUtils';
import {
  type SystemFeatureKey,
  type SystemFeaturesPayload,
  FEATURE_STORAGE_KEY,
  FEATURE_EVENT_NAME,
  getStoredFeatureConfig,
  saveStoredFeatureConfig,
  normalizeFeatureConfig,
  isFeatureEnabledForUser,
} from './featureFlags';

export function useFeatureFlags() {
  const [config, setConfig] = useState<SystemFeaturesPayload>(() => getStoredFeatureConfig());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/features', { cache: 'no-store' });
      if (response.ok) {
        const result = await response.json();
        if (result?.success && result?.config) {
          const normalized = normalizeFeatureConfig(result.config);
          setConfig(normalized);
          saveStoredFeatureConfig(normalized);
          return normalized;
        }
      }
    } catch {
      // Giữ nguyên cấu hình từ localStorage nếu offline
    } finally {
      setIsLoading(false);
    }
    return getStoredFeatureConfig();
  }, []);

  useEffect(() => {
    setConfig(getStoredFeatureConfig());
    refresh();

    const handleCustomUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SystemFeaturesPayload>;
      if (customEvent.detail) {
        setConfig(normalizeFeatureConfig(customEvent.detail));
      } else {
        setConfig(getStoredFeatureConfig());
      }
    };

    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === FEATURE_STORAGE_KEY) {
        setConfig(getStoredFeatureConfig());
      }
    };

    window.addEventListener(FEATURE_EVENT_NAME, handleCustomUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener(FEATURE_EVENT_NAME, handleCustomUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [refresh]);

  const updateConfig = useCallback(
    async (nextConfig: SystemFeaturesPayload): Promise<{ success: boolean; error?: string }> => {
      setIsSaving(true);
      const normalized = normalizeFeatureConfig({
        ...nextConfig,
        updatedAt: new Date().toISOString(),
      });

      // Lưu ngay vào localStorage để giao diện phản hồi tức thì
      setConfig(normalized);
      saveStoredFeatureConfig(normalized);

      try {
        const response = await fetch('/api/settings/features', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalized),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          return {
            success: false,
            error: result.error || 'Đã lưu cục bộ nhưng chưa đồng bộ được lên máy chủ.',
          };
        }
        if (result.config) {
          const serverConfig = normalizeFeatureConfig(result.config);
          setConfig(serverConfig);
          saveStoredFeatureConfig(serverConfig);
        }
        return { success: true };
      } catch {
        return {
          success: true, // Vẫn hoạt động tốt với localStorage ở chế độ demo/offline
        };
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const isFeatureEnabled = useCallback(
    (featureKey: SystemFeatureKey, customUser?: any): boolean => {
      const activeUser = customUser !== undefined ? customUser : authUtils.getUserData();
      return isFeatureEnabledForUser(featureKey, activeUser, config);
    },
    [config]
  );

  return {
    config,
    isFeatureEnabled,
    updateConfig,
    isLoading,
    isSaving,
    refresh,
  };
}

export default useFeatureFlags;
