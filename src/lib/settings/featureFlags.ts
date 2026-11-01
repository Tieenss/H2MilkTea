'use client';

import { useState, useEffect, useCallback } from 'react';
import authUtils from '@/utils/authUtils';

export type SystemFeatureKey =
  | 'pos_barcode_scanner'
  | 'pos_topping_modal'
  | 'pos_transfer_table'
  | 'pos_qr_inbox'
  | 'pos_ai_assistant'
  | 'pos_offline_queue'
  | 'pos_kitchen_print'
  | 'pos_customer_Create';

export type FeatureCategory = 'POS & Bán hàng' | 'Bếp & QR' | 'Hệ thống & AI';

export interface FeatureFlagItem {
  key: SystemFeatureKey;
  name: string;
  description: string;
  category: FeatureCategory;
  enabledGlobally: boolean;
  allowedRoles: string[];
}

export interface StaffFeatureOverrides {
  [username: string]: {
    granted: SystemFeatureKey[];
    revoked: SystemFeatureKey[];
  };
}

export interface SystemFeaturesPayload {
  flags: Record<SystemFeatureKey, boolean>;
  rolePermissions: Record<SystemFeatureKey, string[]>;
  staffOverrides: StaffFeatureOverrides;
  updatedAt?: string;
  updatedBy?: string;
}

export const FEATURE_STORAGE_KEY = 'h2_system_features_config';
export const FEATURE_EVENT_NAME = 'h2:feature-flags-updated';

export const DEFAULT_ALLOWED_ROLES = [
  'Admin',
  'Quản trị viên',
  'Giám đốc',
  'Quản lý',
  'Thu ngân',
  'Nhân viên',
  'Pha chế / Bếp',
];

export const CONFIGURABLE_ROLES = [
  { id: 'Quản lý', label: 'Quản lý / Giám đốc', aliases: ['Quản lý', 'Giám đốc'] },
  { id: 'Thu ngân', label: 'Thu ngân / Nhân viên POS', aliases: ['Thu ngân', 'Nhân viên'] },
  { id: 'Pha chế / Bếp', label: 'Pha chế / Bếp', aliases: ['Pha chế / Bếp', 'Pha chế', 'Bếp'] },
];

export const SYSTEM_FEATURE_DEFINITIONS: FeatureFlagItem[] = [
  {
    key: 'pos_barcode_scanner',
    name: 'Máy quét mã vạch (Barcode Scanner)',
    description:
      'Hiển thị công cụ quét mã vạch sản phẩm trên màn hình POS. Mặc định tắt để giao diện quán trà sữa gọn gàng, Admin có thể bật khi cần dùng hoặc demo.',
    category: 'POS & Bán hàng',
    enabledGlobally: false,
    allowedRoles: [...DEFAULT_ALLOWED_ROLES],
  },
  {
    key: 'pos_topping_modal',
    name: 'Popup chọn Topping & Đường/Đá khi bấm món',
    description:
      'Mở bảng tùy chọn Size (M/L), mức Đường, mức Đá và Topping đi kèm ngay khi nhấp chọn món trên màn hình POS.',
    category: 'POS & Bán hàng',
    enabledGlobally: true,
    allowedRoles: [...DEFAULT_ALLOWED_ROLES],
  },
  {
    key: 'pos_transfer_table',
    name: 'Chức năng Chuyển bàn',
    description:
      'Cho phép nhân viên chuyển toàn bộ đơn hàng và món đang phục vụ từ bàn này sang bàn khác trên màn hình POS.',
    category: 'POS & Bán hàng',
    enabledGlobally: true,
    allowedRoles: [...DEFAULT_ALLOWED_ROLES],
  },
  {
    key: 'pos_customer_Create',
    name: 'Tạo & Gắn khách hàng thành viên tại POS',
    description:
      'Cho phép tìm kiếm, thêm mới khách hàng thành viên để tích điểm và quản lý công nợ ngay tại quầy thu ngân.',
    category: 'POS & Bán hàng',
    enabledGlobally: true,
    allowedRoles: [...DEFAULT_ALLOWED_ROLES],
  },
  {
    key: 'pos_qr_inbox',
    name: 'Tiếp nhận đơn QR tại bàn',
    description:
      'Hiển thị hộp thư nhận đơn tự động khi khách hàng quét mã QR gọi món tại bàn trên màn hình POS.',
    category: 'Bếp & QR',
    enabledGlobally: true,
    allowedRoles: [...DEFAULT_ALLOWED_ROLES],
  },
  {
    key: 'pos_kitchen_print',
    name: 'Gửi bếp & In tem nhãn pha chế',
    description:
      'Cho phép đồng bộ đơn hàng xuống màn hình KDS Bếp/Pha chế và in tem nhãn dán ly tự động.',
    category: 'Bếp & QR',
    enabledGlobally: true,
    allowedRoles: [...DEFAULT_ALLOWED_ROLES],
  },
  {
    key: 'pos_ai_assistant',
    name: 'Trợ lý ảo AI nội bộ',
    description:
      'Hiển thị nút Trợ lý AI thông minh hỗ trợ gọi món bằng giọng nói, tra cứu công thức và điều khiển POS nhanh.',
    category: 'Hệ thống & AI',
    enabledGlobally: true,
    allowedRoles: [...DEFAULT_ALLOWED_ROLES],
  },
  {
    key: 'pos_offline_queue',
    name: 'Chế độ Bán hàng Ngoại tuyến (Offline Resilience)',
    description:
      'Tự động lưu đơn hàng vào hàng đợi cục bộ khi mất kết nối mạng và đồng bộ lại lên máy chủ khi có mạng.',
    category: 'Hệ thống & AI',
    enabledGlobally: true,
    allowedRoles: [...DEFAULT_ALLOWED_ROLES],
  },
];

export function createDefaultFeatureConfig(): SystemFeaturesPayload {
  const flags = {} as Record<SystemFeatureKey, boolean>;
  const rolePermissions = {} as Record<SystemFeatureKey, string[]>;

  for (const item of SYSTEM_FEATURE_DEFINITIONS) {
    flags[item.key] = item.enabledGlobally;
    rolePermissions[item.key] = [...item.allowedRoles];
  }

  return {
    flags,
    rolePermissions,
    staffOverrides: {},
  };
}

export const DEFAULT_FEATURE_CONFIG: SystemFeaturesPayload = createDefaultFeatureConfig();

export function normalizeFeatureConfig(raw?: Partial<SystemFeaturesPayload> | null): SystemFeaturesPayload {
  const base = createDefaultFeatureConfig();
  if (!raw || typeof raw !== 'object') return base;

  if (raw.flags && typeof raw.flags === 'object') {
    for (const item of SYSTEM_FEATURE_DEFINITIONS) {
      if (typeof raw.flags[item.key] === 'boolean') {
        base.flags[item.key] = raw.flags[item.key];
      }
    }
  }

  if (raw.rolePermissions && typeof raw.rolePermissions === 'object') {
    for (const item of SYSTEM_FEATURE_DEFINITIONS) {
      const roles = raw.rolePermissions[item.key];
      if (Array.isArray(roles)) {
        base.rolePermissions[item.key] = roles.map((r) => String(r));
      }
    }
  }

  if (raw.staffOverrides && typeof raw.staffOverrides === 'object') {
    const cleanOverrides: StaffFeatureOverrides = {};
    for (const [username, entry] of Object.entries(raw.staffOverrides)) {
      if (entry && typeof entry === 'object') {
        cleanOverrides[username.toLowerCase().trim()] = {
          granted: Array.isArray(entry.granted) ? entry.granted : [],
          revoked: Array.isArray(entry.revoked) ? entry.revoked : [],
        };
      }
    }
    base.staffOverrides = cleanOverrides;
  }

  if (raw.updatedAt) base.updatedAt = raw.updatedAt;
  if (raw.updatedBy) base.updatedBy = raw.updatedBy;

  return base;
}

export function getStoredFeatureConfig(): SystemFeaturesPayload {
  if (typeof window === 'undefined') return DEFAULT_FEATURE_CONFIG;
  try {
    const raw = localStorage.getItem(FEATURE_STORAGE_KEY);
    if (!raw) return DEFAULT_FEATURE_CONFIG;
    return normalizeFeatureConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_FEATURE_CONFIG;
  }
}

export function saveStoredFeatureConfig(config: SystemFeaturesPayload): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized = normalizeFeatureConfig(config);
    localStorage.setItem(FEATURE_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(FEATURE_EVENT_NAME, { detail: normalized }));
  } catch {
    // Bỏ qua lỗi ghi localStorage
  }
}

/**
 * Kiểm tra quyền sử dụng tính năng hệ thống của người dùng hiện tại:
 * 1. Nếu công tắc tổng `flags[featureKey] === false` -> Trả về `false` cho tất cả tài khoản để ẩn trên POS.
 * 2. Nếu công tắc tổng `flags[featureKey] === true`:
 *    - Nếu tài khoản là Admin / Quản trị viên -> Luôn trả về `true`.
 *    - Kiểm tra `staffOverrides[username]`:
 *      + Nếu nằm trong `revoked` -> Trả về `false`.
 *      + Nếu nằm trong `granted` -> Trả về `true` (cấp quyền vượt vai trò mặc định).
 *    - Kiểm tra `rolePermissions[featureKey]` có chứa vai trò của nhân viên không.
 */
export function isFeatureEnabledForUser(
  featureKey: SystemFeatureKey,
  userData: any,
  config?: SystemFeaturesPayload
): boolean {
  const activeConfig = config ? normalizeFeatureConfig(config) : getStoredFeatureConfig();

  // 1. Nếu công tắc tổng bị tắt bởi Admin -> Vô hiệu hóa và ẩn cho toàn bộ tài khoản
  if (activeConfig.flags[featureKey] === false) {
    return false;
  }

  // Nếu chưa có thông tin user (đang khởi tạo client), trả về trạng thái công tắc tổng
  if (!userData) {
    return Boolean(activeConfig.flags[featureKey]);
  }

  const username = String(userData.username || userData.IDNV || '')
    .toLowerCase()
    .trim();
  const rawRole = String(userData['Phân quyền'] || userData.role || 'Nhân viên').trim();
  const roleLower = rawRole.toLowerCase();

  // 2. Tài khoản Admin / Quản trị viên luôn có quyền khi công tắc tổng đang bật
  if (
    roleLower === 'admin' ||
    roleLower === 'quản trị viên' ||
    username === 'admin'
  ) {
    return true;
  }

  // 3. Kiểm tra phân quyền đặc cách theo từng nhân viên (Staff Feature Overrides)
  if (username && activeConfig.staffOverrides[username]) {
    const userOverride = activeConfig.staffOverrides[username];
    if (Array.isArray(userOverride.revoked) && userOverride.revoked.includes(featureKey)) {
      return false;
    }
    if (Array.isArray(userOverride.granted) && userOverride.granted.includes(featureKey)) {
      return true;
    }
  }

  // 4. Kiểm tra quyền theo vai trò mặc định (Role Permissions)
  const allowedRoles = activeConfig.rolePermissions[featureKey] || DEFAULT_ALLOWED_ROLES;
  const matchedGroup = CONFIGURABLE_ROLES.find((g) =>
    g.aliases.some((alias) => alias.toLowerCase() === roleLower)
  );

  if (matchedGroup) {
    return allowedRoles.some(
      (r) =>
        r.toLowerCase() === matchedGroup.id.toLowerCase() ||
        matchedGroup.aliases.some((a) => a.toLowerCase() === r.toLowerCase())
    );
  }

  return allowedRoles.some((r) => r.toLowerCase() === roleLower);
}

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
