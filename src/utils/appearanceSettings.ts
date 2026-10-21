'use client';

export type FontFamilyOption = 'inter' | 'be-vietnam-pro' | 'roboto' | 'lexend';
export type WebFontSizeOption = 'sm' | 'base' | 'lg' | 'xl';
export type ChatbotFontSizeOption = 'sm' | 'base' | 'lg';
export type ThemeColorOption = 'indigo' | 'emerald' | 'amber' | 'blue';

export interface AppearanceSettings {
  fontFamily: FontFamilyOption;
  fontSize: WebFontSizeOption;
  chatbotFontSize: ChatbotFontSizeOption;
  themeColor: ThemeColorOption;
  lastUpdated: string;
}

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  fontFamily: 'be-vietnam-pro',
  fontSize: 'base',
  chatbotFontSize: 'base',
  themeColor: 'indigo',
  lastUpdated: new Date().toISOString(),
};

const STORAGE_KEY = 'h2_appearance_settings_v1';

export const FONT_FAMILY_MAP: Record<FontFamilyOption, { name: string; cssFont: string; preview: string }> = {
  'be-vietnam-pro': {
    name: 'Be Vietnam Pro (Khuyên dùng)',
    cssFont: '"Be Vietnam Pro", system-ui, -apple-system, sans-serif',
    preview: 'H2 MilkTea - Trà sữa chuẩn vị, thơm ngon đậm đà',
  },
  'inter': {
    name: 'Inter Modern',
    cssFont: 'Inter, system-ui, -apple-system, sans-serif',
    preview: 'H2 MilkTea - Hiện đại, tinh tế và tối ưu hiển thị',
  },
  'roboto': {
    name: 'Roboto Standard',
    cssFont: 'Roboto, system-ui, -apple-system, sans-serif',
    preview: 'H2 MilkTea - Sáng rõ, phù hợp màn hình thu ngân POS',
  },
  'lexend': {
    name: 'Lexend High-Legibility',
    cssFont: 'Lexend, system-ui, -apple-system, sans-serif',
    preview: 'H2 MilkTea - Dễ nhìn, đọc số lượng và giá tiền nhanh',
  },
};

export const WEB_FONT_SIZE_MAP: Record<WebFontSizeOption, { label: string; rootPx: string }> = {
  sm: { label: 'Nhỏ (14px)', rootPx: '14px' },
  base: { label: 'Chuẩn (15px)', rootPx: '15px' },
  lg: { label: 'Lớn (16px)', rootPx: '16px' },
  xl: { label: 'Rất lớn (17.5px)', rootPx: '17.5px' },
};

export const CHATBOT_FONT_SIZE_MAP: Record<ChatbotFontSizeOption, { label: string; textClass: string; px: string }> = {
  sm: { label: 'Nhỏ (13px)', textClass: 'text-[13px]', px: '13px' },
  base: { label: 'Vừa (14px)', textClass: 'text-[14px]', px: '14px' },
  lg: { label: 'Lớn (15.5px)', textClass: 'text-[15.5px]', px: '15.5px' },
};

export const THEME_COLOR_MAP: Record<ThemeColorOption, { name: string; primaryHex: string; ringColor: string; bgSoft: string }> = {
  indigo: {
    name: 'Indigo Hiện Đại (Mặc định)',
    primaryHex: '#4f46e5',
    ringColor: 'ring-indigo-500',
    bgSoft: 'bg-indigo-50 text-indigo-700',
  },
  emerald: {
    name: 'Trà Xanh Thanh Mát (Emerald)',
    primaryHex: '#059669',
    ringColor: 'ring-emerald-500',
    bgSoft: 'bg-emerald-50 text-emerald-700',
  },
  amber: {
    name: 'Hoàng Kim Ấm Áp (Amber / Milk Tea)',
    primaryHex: '#d97706',
    ringColor: 'ring-amber-500',
    bgSoft: 'bg-amber-50 text-amber-700',
  },
  blue: {
    name: 'Xanh Đại Dương Cổ Điển (Blue)',
    primaryHex: '#2563eb',
    ringColor: 'ring-blue-500',
    bgSoft: 'bg-blue-50 text-blue-700',
  },
};

export function getAppearanceSettings(): AppearanceSettings {
  if (typeof window === 'undefined') return DEFAULT_APPEARANCE_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      fontFamily: parsed.fontFamily || DEFAULT_APPEARANCE_SETTINGS.fontFamily,
      fontSize: parsed.fontSize || DEFAULT_APPEARANCE_SETTINGS.fontSize,
      chatbotFontSize: parsed.chatbotFontSize || DEFAULT_APPEARANCE_SETTINGS.chatbotFontSize,
      themeColor: parsed.themeColor || DEFAULT_APPEARANCE_SETTINGS.themeColor,
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch {
    return DEFAULT_APPEARANCE_SETTINGS;
  }
}

export function saveAppearanceSettings(settings: AppearanceSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    applyAppearanceSettings(settings);
    window.dispatchEvent(new CustomEvent('h2_appearance_settings_updated', { detail: settings }));
  } catch (err) {
    console.error('Failed to save appearance settings', err);
  }
}

/**
 * Áp dụng trực tiếp các thiết lập font và kích thước vào document root
 */
export function applyAppearanceSettings(settings: AppearanceSettings): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;

  // 1. Áp dụng font family
  const fontConfig = FONT_FAMILY_MAP[settings.fontFamily] || FONT_FAMILY_MAP['be-vietnam-pro'];
  root.style.setProperty('--h2-app-font', fontConfig.cssFont);
  if (body) {
    body.style.fontFamily = `var(--h2-app-font, ${fontConfig.cssFont})`;
  }

  // 2. Áp dụng font size toàn hệ thống
  const sizeConfig = WEB_FONT_SIZE_MAP[settings.fontSize] || WEB_FONT_SIZE_MAP['base'];
  root.style.setProperty('--h2-app-font-size', sizeConfig.rootPx);
  root.style.fontSize = sizeConfig.rootPx;

  // 3. Áp dụng font size chatbot
  const chatbotConfig = CHATBOT_FONT_SIZE_MAP[settings.chatbotFontSize] || CHATBOT_FONT_SIZE_MAP['base'];
  root.style.setProperty('--h2-chatbot-font-size', chatbotConfig.px);

  // 4. Áp dụng màu chủ đạo theme
  const themeConfig = THEME_COLOR_MAP[settings.themeColor] || THEME_COLOR_MAP['indigo'];
  root.style.setProperty('--h2-theme-primary', themeConfig.primaryHex);
  root.setAttribute('data-h2-theme', settings.themeColor);
}
