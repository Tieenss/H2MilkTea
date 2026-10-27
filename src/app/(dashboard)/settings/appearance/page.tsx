'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Palette,
  Type,
  Maximize2,
  Bot,
  RotateCcw,
  Check,
  ChevronLeft,
  Sparkles,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  AppearanceSettings,
  DEFAULT_APPEARANCE_SETTINGS,
  FONT_FAMILY_MAP,
  WEB_FONT_SIZE_MAP,
  CHATBOT_FONT_SIZE_MAP,
  THEME_COLOR_MAP,
  COLOR_MODE_OPTIONS,
  FontFamilyOption,
  WebFontSizeOption,
  ChatbotFontSizeOption,
  ThemeColorOption,
  ColorModeOption,
  getAppearanceSettings,
  saveAppearanceSettings,
} from '@/utils/appearanceSettings';

export default function AppearanceSettingsPage() {
  const [settings, setSettings] = useState<AppearanceSettings>(DEFAULT_APPEARANCE_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSettings(getAppearanceSettings());
    setMounted(true);
  }, []);

  const handleUpdate = <K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) => {
    const next = { ...settings, [key]: value, lastUpdated: new Date().toISOString() };
    setSettings(next);
    saveAppearanceSettings(next);
  };

  const handleReset = () => {
    setSettings(DEFAULT_APPEARANCE_SETTINGS);
    saveAppearanceSettings(DEFAULT_APPEARANCE_SETTINGS);
    toast.success('Đã khôi phục cài đặt giao diện về mặc định!');
  };

  if (!mounted) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const currentFont = FONT_FAMILY_MAP[settings.fontFamily] || FONT_FAMILY_MAP['be-vietnam-pro'];
  const currentTheme = THEME_COLOR_MAP[settings.themeColor] || THEME_COLOR_MAP['indigo'];
  const isDarkMode =
    settings.colorMode === 'dark' ||
    (settings.colorMode === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="min-h-screen bg-gray-50/70 dark:bg-gray-950 pb-16 transition-colors duration-200">
      {/* Top Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/settings"
                className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Quay lại Cài đặt"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="p-1.5 rounded-lg text-white"
                    style={{ backgroundColor: currentTheme.primaryHex }}
                  >
                    <Palette className="w-5 h-5" />
                  </span>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    Cài đặt Giao diện & Font chữ
                  </h1>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Tùy chỉnh Dark Mode, màu sắc chủ đạo, font chữ và kích cỡ hiển thị toàn diện
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-xs"
              >
                <RotateCcw className="w-4 h-4 text-gray-500" />
                Khôi phục mặc định
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Realtime Live Preview Banner */}
        <div
          className={`border rounded-2xl p-6 shadow-sm transition-all duration-200 ${
            isDarkMode
              ? 'bg-gray-900 border-gray-800 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold mb-3 text-sm" style={{ color: currentTheme.primaryHex }}>
            <Sparkles className="w-4 h-4" />
            Xem trước trực tiếp (Live Preview)
          </div>
          <div
            className={`p-5 rounded-xl border shadow-inner space-y-3 ${
              isDarkMode
                ? 'bg-gray-950 border-gray-800 text-gray-100'
                : 'bg-gray-50 border-gray-200 text-gray-900'
            }`}
            style={{ fontFamily: currentFont.cssFont }}
          >
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
              <span className="font-bold text-base">H2 MilkTea & Coffee - Chi nhánh 1</span>
              <span
                className="text-xs px-2.5 py-0.5 rounded-full text-white font-medium"
                style={{ backgroundColor: currentTheme.primaryHex }}
              >
                {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </span>
            </div>
            <p className="leading-relaxed opacity-90">
              Trà sữa Trân Châu Đường Đen Size L - 35,000đ | Cà phê Muối H2 - 28,000đ. Đơn hàng #1085 đang được pha chế tại khu bếp.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs opacity-75">
              <span>Font: <strong>{currentFont.name}</strong></span>
              <span>•</span>
              <span>Cỡ chữ: <strong>{WEB_FONT_SIZE_MAP[settings.fontSize]?.label}</strong></span>
              <span>•</span>
              <span>Theme: <strong>{currentTheme.name}</strong></span>
            </div>
          </div>
        </div>

        {/* Chế độ Người cao tuổi & Dễ thao tác (Senior / Accessibility Mode) */}
        <div className={`rounded-2xl border-2 p-6 shadow-sm transition-all duration-300 ${
          settings.elderlyMode
            ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-amber-400 dark:border-amber-600 shadow-md ring-4 ring-amber-400/20'
            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-gray-800">
            <div className="flex items-start sm:items-center gap-3">
              <span className={`p-3 rounded-2xl text-2xl shadow-inner ${
                settings.elderlyMode
                  ? 'bg-amber-500 text-white shadow-amber-600/50 ring-4 ring-amber-300 dark:ring-amber-800'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}>
                👓
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    Chế độ Người cao tuổi & Dễ nhìn (Senior Accessibility)
                  </h2>
                  {settings.elderlyMode && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white uppercase tracking-wider animate-pulse">
                      Đang Bật
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Tự động phóng to chữ toàn hệ thống, tăng diện tích nút bấm chống bấm trượt, tương phản sắc nét dành cho người lớn tuổi hoặc người ít rành công nghệ.
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center gap-3 self-end sm:self-center">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {settings.elderlyMode ? 'Đang kích hoạt' : 'Đang tắt'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={settings.elderlyMode}
                onClick={() => {
                  const next = !settings.elderlyMode;
                  handleUpdate('elderlyMode', next);
                  if (next) {
                    toast.success('👓 Đã kích hoạt Chế độ Người cao tuổi: Chữ to, nút bấm lớn, dễ thao tác!');
                  } else {
                    toast('Đã chuyển về giao diện tiêu chuẩn', { icon: 'ℹ️' });
                  }
                }}
                className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                  settings.elderlyMode ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.elderlyMode ? 'translate-x-8' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 4 Feature Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
            <div className="p-4 rounded-xl bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 space-y-1.5 shadow-xs">
              <div className="text-amber-600 dark:text-amber-400 font-bold text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> 1. Chữ Siêu To & Rõ
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Tự động phóng to chữ lên 18px - 19px, giãn dòng thoáng mắt, đọc giá tiền và tên món không bị nheo mắt.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 space-y-1.5 shadow-xs">
              <div className="text-amber-600 dark:text-amber-400 font-bold text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> 2. Nút Bấm Khổ Lớn
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Mọi nút bấm và ô nhập có chiều cao $\ge$ 48px, chạm ngón tay cực nhạy và chống bấm nhầm trên màn hình cảm ứng.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 space-y-1.5 shadow-xs">
              <div className="text-amber-600 dark:text-amber-400 font-bold text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> 3. Tương Phản Đậm Nét
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Xóa bỏ các dòng chữ mờ xám khó đọc, viền dày 2px rõ nét giúp người già phân biệt các khu vực thao tác dễ dàng.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 space-y-1.5 shadow-xs">
              <div className="text-amber-600 dark:text-amber-400 font-bold text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> 4. Đa Thiết Bị Linh Hoạt
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Tự động tối ưu trên PC thu ngân, Laptop, iPad/Tablet để bàn và Điện thoại cá nhân với độ mượt mà cao.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Dark Mode / Light Mode */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
            <Sun className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">1. Chế độ Giao diện (Dark Mode)</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Chuyển đổi giữa chế độ nền sáng hoặc nền tối chống mỏi mắt cho nhân viên thu ngân ca đêm
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(Object.keys(COLOR_MODE_OPTIONS) as ColorModeOption[]).map((modeKey) => {
              const item = COLOR_MODE_OPTIONS[modeKey];
              const isSelected = settings.colorMode === modeKey;
              const IconComp = modeKey === 'light' ? Sun : modeKey === 'dark' ? Moon : Laptop;

              return (
                <button
                  key={modeKey}
                  type="button"
                  onClick={() => {
                    handleUpdate('colorMode', modeKey);
                    toast.success(`Đã chuyển sang ${item.label}`);
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs ring-2 ring-indigo-500/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                      <IconComp className="w-5 h-5" />
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                  <div className="font-bold text-gray-900 dark:text-white text-sm mb-1">{item.label}</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Màu sắc chủ đạo (Theme Colors) */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
            <Palette className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">2. Màu sắc chủ đạo (Theme Accent Color)</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Thay đổi màu các nút bấm, viền nổi bật, thanh header và trợ lý AI trên toàn hệ thống
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {(Object.keys(THEME_COLOR_MAP) as ThemeColorOption[]).map((themeKey) => {
              const theme = THEME_COLOR_MAP[themeKey];
              const isSelected = settings.themeColor === themeKey;
              return (
                <button
                  key={themeKey}
                  type="button"
                  onClick={() => {
                    handleUpdate('themeColor', themeKey);
                    toast.success(`Đã đổi chủ đề: ${theme.name}`);
                  }}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-gray-900 dark:border-white shadow-md ring-2 ring-indigo-500/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="w-7 h-7 rounded-full shadow-inner border-2 border-white dark:border-gray-800"
                      style={{ backgroundColor: theme.primaryHex }}
                    />
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <div className="font-bold text-gray-900 dark:text-white text-xs mb-1">{theme.name}</div>
                  <div className="text-[10px] font-mono text-gray-400">{theme.primaryHex}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Font chữ hệ thống */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
            <Type className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">3. Phông chữ hệ thống</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Lựa chọn font hiển thị trên toàn bộ các trang quản trị và POS</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(FONT_FAMILY_MAP) as FontFamilyOption[]).map((key) => {
              const font = FONT_FAMILY_MAP[key];
              const isSelected = settings.fontFamily === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    handleUpdate('fontFamily', key);
                    toast.success(`Đã đổi font sang ${font.name}`);
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-xs'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                  }`}
                  style={{ fontFamily: font.cssFont }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{font.name}</span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{font.preview}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Kích thước font chữ toàn web */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
            <Maximize2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">4. Kích thước font chữ toàn phần mềm</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Phóng to hoặc thu nhỏ chữ phù hợp với khoảng cách màn hình máy tính / máy POS</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.keys(WEB_FONT_SIZE_MAP) as WebFontSizeOption[]).map((sizeKey) => {
              const item = WEB_FONT_SIZE_MAP[sizeKey];
              const isSelected = settings.fontSize === sizeKey;
              return (
                <button
                  key={sizeKey}
                  type="button"
                  onClick={() => {
                    handleUpdate('fontSize', sizeKey);
                    toast.success(`Cỡ chữ web: ${item.label}`);
                  }}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                  }`}
                >
                  <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">{item.rootPx}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{item.label}</div>
                  {isSelected && (
                    <div className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Đang chọn
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 5: Kích thước font chữ Chatbot AI */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
            <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">5. Kích thước chữ Chatbot AI</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Điều chỉnh độ lớn nội dung tin nhắn trong khung trợ lý thông minh</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.keys(CHATBOT_FONT_SIZE_MAP) as ChatbotFontSizeOption[]).map((botSizeKey) => {
              const item = CHATBOT_FONT_SIZE_MAP[botSizeKey];
              const isSelected = settings.chatbotFontSize === botSizeKey;
              return (
                <button
                  key={botSizeKey}
                  type="button"
                  onClick={() => {
                    handleUpdate('chatbotFontSize', botSizeKey);
                    toast.success(`Cỡ chữ Chatbot: ${item.label}`);
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-900 dark:text-white text-sm">{item.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                  <p className={`${item.textClass} text-gray-600 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700`}>
                    "Xin chào! Tôi có thể giúp gì cho bạn trong việc bán hàng và quản lý kho hôm nay?"
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
