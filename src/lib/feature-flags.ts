/**
 * Bridge module xuất các cấu hình Feature Flags của hệ thống (bao gồm công tắc VAT mặc định).
 */
export * from './settings/featureFlags';
export { useFeatureFlags } from './settings/useFeatureFlags';

import {
  DEFAULT_FEATURE_CONFIG,
  getStoredFeatureConfig,
  type SystemFeaturesPayload,
} from './settings/featureFlags';

export const DEFAULT_FEATURE_FLAGS = {
  ...DEFAULT_FEATURE_CONFIG.flags,
  enableVat: false,
  defaultVatEnabled: false,
};

export function isDefaultVatEnabled(config?: Partial<SystemFeaturesPayload> | null): boolean {
  const activeConfig = config?.flags ? config : getStoredFeatureConfig();
  const flags = activeConfig?.flags as Record<string, any> | undefined;
  return Boolean(flags?.enableVat ?? flags?.defaultVatEnabled ?? false);
}
