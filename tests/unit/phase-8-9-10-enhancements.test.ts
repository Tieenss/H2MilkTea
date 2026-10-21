import { describe, it, expect, beforeEach, vi } from 'vitest';

// Setup mock browser globals for Node test environment
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => storageMap.get(key) ?? null),
  setItem: vi.fn((key: string, val: string) => {
    storageMap.set(key, String(val));
  }),
  removeItem: vi.fn((key: string) => {
    storageMap.delete(key);
  }),
  clear: vi.fn(() => {
    storageMap.clear();
  }),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

const classListSet = new Set<string>();
const mockClassList = {
  add: vi.fn((cls: string) => classListSet.add(cls)),
  remove: vi.fn((cls: string) => classListSet.delete(cls)),
  contains: vi.fn((cls: string) => classListSet.has(cls)),
};

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matchMedia: vi.fn(() => ({ matches: false })),
  };
}

if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = {
    documentElement: {
      classList: mockClassList,
      style: {
        setProperty: vi.fn(),
      },
      setAttribute: vi.fn(),
    },
    body: {
      style: {
        fontFamily: '',
      },
    },
  };
}

import {
  getFeatureBadge,
  saveDeviceFeatureState,
  recordFeatureVisit,
  resetFeatureTracker,
  BASE_HOT_HREFS,
  BASE_NEW_HREFS,
} from '@/utils/featureTracker';
import {
  getAppearanceSettings,
  saveAppearanceSettings,
  applyAppearanceSettings,
  DEFAULT_APPEARANCE_SETTINGS,
  FONT_FAMILY_MAP,
  WEB_FONT_SIZE_MAP,
  CHATBOT_FONT_SIZE_MAP,
  THEME_COLOR_MAP,
  COLOR_MODE_OPTIONS,
} from '@/utils/appearanceSettings';
import { navigation, getNavigationByGroup } from '@/lib/navigation';
import { RARITY_CONFIGS, getProductPrice } from '@/app/order/components/DrinkGachaCSGO';
import { GOOGLE_DRIVE_CONFIG } from '@/config/googleDrive';
import GoogleDriveUtils from '@/utils/googleDriveUtils';

describe('Phase 8, 9, 10 Enhancements Verification', () => {
  beforeEach(() => {
    storageMap.clear();
    classListSet.clear();
    vi.clearAllMocks();
  });

  describe('Item #2: Feature Tracker - Removal of "Gần đây" badge', () => {
    it('does NOT display "Gần đây" badge even for the most recently visited href', () => {
      saveDeviceFeatureState({
        visitedHrefs: ['/pos', '/orders'],
        lastVisitedHref: '/pos',
        lastUpdated: new Date().toISOString(),
      });

      const badge = getFeatureBadge('/pos');
      // Trước đây trả về label: 'Gần đây', bây giờ chỉ trả về 'Hot' (vì /pos thuộc BASE_HOT_HREFS)
      expect(badge?.label).not.toBe('Gần đây');
      expect(badge?.label).toBe('Hot');
    });

    it('returns "Mới" only for new unvisited features and disappears after visit', () => {
      resetFeatureTracker();
      const newRoute = BASE_NEW_HREFS[0]; // '/settings/appearance'
      let badge = getFeatureBadge(newRoute);
      expect(badge?.label).toBe('Mới');

      // Record visit
      recordFeatureVisit(newRoute);

      // Now badge should be null
      badge = getFeatureBadge(newRoute);
      expect(badge).toBeNull();
    });
  });

  describe('Item #4 & #7: Appearance Settings (Fonts, Chatbot Size, Theme, Dark Mode)', () => {
    it('provides correct default appearance settings including light color mode', () => {
      const settings = getAppearanceSettings();
      expect(settings.fontFamily).toBe(DEFAULT_APPEARANCE_SETTINGS.fontFamily);
      expect(settings.fontSize).toBe(DEFAULT_APPEARANCE_SETTINGS.fontSize);
      expect(settings.chatbotFontSize).toBe(DEFAULT_APPEARANCE_SETTINGS.chatbotFontSize);
      expect(settings.themeColor).toBe(DEFAULT_APPEARANCE_SETTINGS.themeColor);
      expect(settings.colorMode).toBe('light');
    });

    it('saves and restores appearance settings with dark mode from localStorage', () => {
      const customSettings = {
        fontFamily: 'lexend' as const,
        fontSize: 'lg' as const,
        chatbotFontSize: 'lg' as const,
        themeColor: 'emerald' as const,
        colorMode: 'dark' as const,
        lastUpdated: new Date().toISOString(),
      };

      saveAppearanceSettings(customSettings);
      const loaded = getAppearanceSettings();

      expect(loaded.fontFamily).toBe('lexend');
      expect(loaded.fontSize).toBe('lg');
      expect(loaded.chatbotFontSize).toBe('lg');
      expect(loaded.themeColor).toBe('emerald');
      expect(loaded.colorMode).toBe('dark');
    });

    it('applies dark class to documentElement when dark mode is enabled', () => {
      applyAppearanceSettings({
        ...DEFAULT_APPEARANCE_SETTINGS,
        colorMode: 'dark',
      });
      expect(mockClassList.add).toHaveBeenCalledWith('dark');

      applyAppearanceSettings({
        ...DEFAULT_APPEARANCE_SETTINGS,
        colorMode: 'light',
      });
      expect(mockClassList.remove).toHaveBeenCalledWith('dark');
    });

    it('validates theme colors include hex and hsl properties', () => {
      expect(THEME_COLOR_MAP['emerald'].primaryHex).toBe('#059669');
      expect(THEME_COLOR_MAP['emerald'].primaryHsl).toContain('160');
      expect(THEME_COLOR_MAP['amber'].primaryHex).toBe('#d97706');
      expect(COLOR_MODE_OPTIONS['dark'].label).toContain('Dark Mode');
    });
  });

  describe('Item #6: Navigation Group Hubs', () => {
    it('ensures all major groups have an href route attached', () => {
      const posGroup = navigation.find((item) => item.name === 'POS & Bán hàng');
      const menuGroup = navigation.find((item) => item.name === 'Menu & Sản phẩm');
      const inventoryGroup = navigation.find((item) => item.name === 'Quản lý kho');
      const reportsGroup = navigation.find((item) => item.name === 'Báo cáo');
      const settingsGroup = navigation.find((item) => item.name === 'Cài đặt');

      expect(posGroup?.href).toBe('/pos-hub');
      expect(menuGroup?.href).toBe('/menu');
      expect(inventoryGroup?.href).toBe('/inventory');
      expect(reportsGroup?.href).toBe('/reports');
      expect(settingsGroup?.href).toBe('/settings');
    });

    it('ensures settings group contains Giao diện & Font chữ item', () => {
      const settingsItems = getNavigationByGroup('Cài đặt');
      const appearanceItem = settingsItems.find((it) => it.href === '/settings/appearance');

      expect(appearanceItem).toBeDefined();
      expect(appearanceItem?.name).toBe('Giao diện & Font chữ');
    });
  });

  describe('Item #1: CS:GO Drink Gacha System', () => {
    it('defines 4 tiers of CS:GO rarity with distinctive colors and styles', () => {
      expect(RARITY_CONFIGS.covert.label).toContain('Covert');
      expect(RARITY_CONFIGS.covert.borderColor).toBe('border-yellow-400');

      expect(RARITY_CONFIGS.classified.label).toContain('Classified');
      expect(RARITY_CONFIGS.classified.borderColor).toBe('border-pink-500');

      expect(RARITY_CONFIGS.restricted.label).toContain('Restricted');
      expect(RARITY_CONFIGS.restricted.borderColor).toBe('border-purple-500');

      expect(RARITY_CONFIGS.milspec.label).toContain('Mil-Spec');
      expect(RARITY_CONFIGS.milspec.borderColor).toBe('border-blue-500');
    });

    it('parses product price accurately from Đơn giá or Giá bán', () => {
      const p1: any = { IDSP: 'SP1', 'Tên sản phẩm': 'Trà Sữa Truyền Thống', 'Đơn giá': '28000' };
      const p2: any = { IDSP: 'SP2', 'Tên sản phẩm': 'Trà Đào Cam Sả', 'Đơn giá': '32.000đ' };
      const p3: any = { IDSP: 'SP3', 'Tên sản phẩm': 'Hồng Trà', 'Giá bán': 25000 };

      expect(getProductPrice(p1)).toBe(28000);
      expect(getProductPrice(p2)).toBe(32000);
      expect(getProductPrice(p3)).toBe(25000);
    });
  });

  describe('Item #8: Google Drive Configuration & Utils', () => {
    it('supports custom client ID via localStorage and exposes syncLatestData', () => {
      GOOGLE_DRIVE_CONFIG.setCustomClientId('987654321-custom.apps.googleusercontent.com');
      expect(GOOGLE_DRIVE_CONFIG.CLIENT_ID).toBe('987654321-custom.apps.googleusercontent.com');
      expect(GOOGLE_DRIVE_CONFIG.isValid()).toBe(true);
      expect(typeof GoogleDriveUtils.syncLatestData).toBe('function');

      const debug = GOOGLE_DRIVE_CONFIG.getDebugInfo();
      expect(debug.hasClientId).toBe(true);
      expect(debug.customSet).toBe(true);
    });
  });
});
