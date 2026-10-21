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

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
}

if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = {
    documentElement: {
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
  DEFAULT_APPEARANCE_SETTINGS,
  FONT_FAMILY_MAP,
  WEB_FONT_SIZE_MAP,
  CHATBOT_FONT_SIZE_MAP,
  THEME_COLOR_MAP,
} from '@/utils/appearanceSettings';
import { navigation, getNavigationByGroup } from '@/lib/navigation';
import { RARITY_CONFIGS } from '@/app/order/components/DrinkGachaCSGO';
import { GOOGLE_DRIVE_CONFIG } from '@/config/googleDrive';

describe('Phase 8, 9, 10 Enhancements Verification', () => {
  beforeEach(() => {
    storageMap.clear();
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

  describe('Item #4 & #7: Appearance Settings (Fonts, Chatbot Size, Theme)', () => {
    it('provides correct default appearance settings', () => {
      const settings = getAppearanceSettings();
      expect(settings.fontFamily).toBe(DEFAULT_APPEARANCE_SETTINGS.fontFamily);
      expect(settings.fontSize).toBe(DEFAULT_APPEARANCE_SETTINGS.fontSize);
      expect(settings.chatbotFontSize).toBe(DEFAULT_APPEARANCE_SETTINGS.chatbotFontSize);
      expect(settings.themeColor).toBe(DEFAULT_APPEARANCE_SETTINGS.themeColor);
    });

    it('saves and restores appearance settings from localStorage', () => {
      const customSettings = {
        fontFamily: 'lexend' as const,
        fontSize: 'lg' as const,
        chatbotFontSize: 'lg' as const,
        themeColor: 'emerald' as const,
        lastUpdated: new Date().toISOString(),
      };

      saveAppearanceSettings(customSettings);
      const loaded = getAppearanceSettings();

      expect(loaded.fontFamily).toBe('lexend');
      expect(loaded.fontSize).toBe('lg');
      expect(loaded.chatbotFontSize).toBe('lg');
      expect(loaded.themeColor).toBe('emerald');
    });

    it('validates font family and size maps have proper CSS definitions', () => {
      expect(FONT_FAMILY_MAP['be-vietnam-pro'].cssFont).toContain('Be Vietnam Pro');
      expect(WEB_FONT_SIZE_MAP['base'].rootPx).toBe('15px');
      expect(CHATBOT_FONT_SIZE_MAP['lg'].px).toBe('15.5px');
      expect(THEME_COLOR_MAP['emerald'].primaryHex).toBe('#059669');
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
  });

  describe('Item #8: Google Drive Configuration & Utils', () => {
    it('supports custom client ID via localStorage', () => {
      GOOGLE_DRIVE_CONFIG.setCustomClientId('987654321-custom.apps.googleusercontent.com');
      expect(GOOGLE_DRIVE_CONFIG.CLIENT_ID).toBe('987654321-custom.apps.googleusercontent.com');
      expect(GOOGLE_DRIVE_CONFIG.isValid()).toBe(true);

      const debug = GOOGLE_DRIVE_CONFIG.getDebugInfo();
      expect(debug.hasClientId).toBe(true);
      expect(debug.customSet).toBe(true);
    });
  });
});
