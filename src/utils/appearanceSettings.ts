'use client';

export type FontFamilyOption = 'inter' | 'be-vietnam-pro' | 'roboto' | 'lexend';
export type WebFontSizeOption = 'sm' | 'base' | 'lg' | 'xl';
export type ChatbotFontSizeOption = 'sm' | 'base' | 'lg';
export type ThemeColorOption = 'indigo' | 'emerald' | 'amber' | 'blue' | 'rose';
export type ColorModeOption = 'light' | 'dark' | 'system';

export interface AppearanceSettings {
  fontFamily: FontFamilyOption;
  fontSize: WebFontSizeOption;
  chatbotFontSize: ChatbotFontSizeOption;
  themeColor: ThemeColorOption;
  colorMode: ColorModeOption;
  lastUpdated: string;
}

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  fontFamily: 'be-vietnam-pro',
  fontSize: 'base',
  chatbotFontSize: 'base',
  themeColor: 'indigo',
  colorMode: 'light',
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

export const COLOR_MODE_OPTIONS: Record<ColorModeOption, { label: string; description: string }> = {
  light: {
    label: 'Giao diện Sáng',
    description: 'Nền sáng dịu mắt, phù hợp môi trường ban ngày',
  },
  dark: {
    label: 'Giao diện Tối (Dark Mode)',
    description: 'Màu nền đen than huyền bí, chống mỏi mắt cho ca tối',
  },
  system: {
    label: 'Tự động theo thiết bị',
    description: 'Đồng bộ chế độ sáng/tối theo cài đặt của hệ điều hành',
  },
};

export const THEME_COLOR_MAP: Record<
  ThemeColorOption,
  {
    name: string;
    primaryHex: string;
    primaryHsl: string;
    ringHsl: string;
    gradientClass: string;
    activeNavClass: string;
  }
> = {
  indigo: {
    name: 'Indigo Tinh Tế',
    primaryHex: '#4f46e5',
    primaryHsl: '243 75% 59%',
    ringHsl: '243 75% 59%',
    gradientClass: 'from-indigo-600 to-purple-600',
    activeNavClass: 'bg-indigo-600 text-white',
  },
  emerald: {
    name: 'Trà Xanh Thanh Mát',
    primaryHex: '#059669',
    primaryHsl: '160 84% 39%',
    ringHsl: '160 84% 39%',
    gradientClass: 'from-emerald-600 to-teal-600',
    activeNavClass: 'bg-emerald-600 text-white',
  },
  amber: {
    name: 'Hoàng Kim Trân Châu',
    primaryHex: '#d97706',
    primaryHsl: '38 92% 50%',
    ringHsl: '38 92% 50%',
    gradientClass: 'from-amber-500 to-yellow-600',
    activeNavClass: 'bg-amber-600 text-white',
  },
  blue: {
    name: 'Xanh Đại Dương',
    primaryHex: '#2563eb',
    primaryHsl: '221 83% 53%',
    ringHsl: '221 83% 53%',
    gradientClass: 'from-blue-600 to-indigo-600',
    activeNavClass: 'bg-blue-600 text-white',
  },
  rose: {
    name: 'Hồng Trà Dâu Tây',
    primaryHex: '#e11d48',
    primaryHsl: '349 77% 62%',
    ringHsl: '349 77% 62%',
    gradientClass: 'from-rose-500 to-pink-600',
    activeNavClass: 'bg-rose-600 text-white',
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
      colorMode: parsed.colorMode || DEFAULT_APPEARANCE_SETTINGS.colorMode,
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
 * Áp dụng Dark Mode và Màu chủ đạo toàn diện vào DOM
 */
export function applyAppearanceSettings(settings: AppearanceSettings): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;

  // 1. ÁP DỤNG DARK MODE THỰC THỤ
  let isDark = false;
  if (settings.colorMode === 'dark') {
    isDark = true;
  } else if (settings.colorMode === 'system') {
    isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // 2. ÁP DỤNG FONT FAMILY & FONT SIZE
  const fontConfig = FONT_FAMILY_MAP[settings.fontFamily] || FONT_FAMILY_MAP['be-vietnam-pro'];
  root.style.setProperty('--h2-app-font', fontConfig.cssFont);
  if (body) {
    body.style.fontFamily = `var(--h2-app-font, ${fontConfig.cssFont})`;
  }

  const sizeConfig = WEB_FONT_SIZE_MAP[settings.fontSize] || WEB_FONT_SIZE_MAP['base'];
  root.style.setProperty('--h2-app-font-size', sizeConfig.rootPx);
  root.style.fontSize = sizeConfig.rootPx;

  const chatbotConfig = CHATBOT_FONT_SIZE_MAP[settings.chatbotFontSize] || CHATBOT_FONT_SIZE_MAP['base'];
  root.style.setProperty('--h2-chatbot-font-size', chatbotConfig.px);

  // 3. ÁP DỤNG MÀU CHỦ ĐẠO THEME (Tác động lên mọi Button, Accent, Ring, Gradient)
  const themeConfig = THEME_COLOR_MAP[settings.themeColor] || THEME_COLOR_MAP['indigo'];
  root.style.setProperty('--h2-theme-primary', themeConfig.primaryHex);
  root.style.setProperty('--primary', themeConfig.primaryHsl);
  root.style.setProperty('--ring', themeConfig.ringHsl);
  root.setAttribute('data-h2-theme', settings.themeColor);
  root.setAttribute('data-theme-mode', settings.colorMode);
}
