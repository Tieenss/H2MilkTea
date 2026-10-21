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
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  AppearanceSettings,
  DEFAULT_APPEARANCE_SETTINGS,
  FONT_FAMILY_MAP,
  WEB_FONT_SIZE_MAP,
  CHATBOT_FONT_SIZE_MAP,
  THEME_COLOR_MAP,
  FontFamilyOption,
  WebFontSizeOption,
  ChatbotFontSizeOption,
  ThemeColorOption,
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

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/settings"
                className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Quay lại Cài đặt"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Palette className="w-5 h-5" />
                  </span>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Cài đặt Giao diện & Font chữ
                  </h1>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  Tùy biến phông chữ, kích thước hiển thị toàn web, chatbot AI và chủ đề màu sắc
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
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
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-700 font-semibold mb-2 text-sm">
            <Sparkles className="w-4 h-4" />
            Xem trước trực tiếp (Live Preview)
          </div>
          <div
            className="p-5 bg-white rounded-xl border border-gray-200 shadow-inner space-y-3"
            style={{ fontFamily: currentFont.cssFont }}
          >
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-base text-gray-900">H2 MilkTea & Coffee - Chi nhánh 1</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                Đang mở cửa
              </span>
            </div>
            <p className="text-gray-700 leading-relaxed">
              Trà sữa Trân Châu Đường Đen Size L - 35,000đ | Cà phê Muối H2 - 28,000đ. Đơn hàng #1085 đang được pha chế tại khu bếp.
            </p>
            <div className="flex items-center gap-3 pt-1 text-xs text-gray-500">
              <span>Font: <strong>{currentFont.name}</strong></span>
              <span>•</span>
              <span>Cỡ chữ web: <strong>{WEB_FONT_SIZE_MAP[settings.fontSize]?.label}</strong></span>
              <span>•</span>
              <span>Chatbot: <strong>{CHATBOT_FONT_SIZE_MAP[settings.chatbotFontSize]?.label}</strong></span>
            </div>
          </div>
        </div>

        {/* Section 1: Font chữ hệ thống */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Type className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="font-semibold text-gray-900">1. Phông chữ hệ thống</h2>
              <p className="text-xs text-gray-500">Lựa chọn font hiển thị trên toàn bộ các trang quản trị và POS</p>
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
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-sm ring-2 ring-indigo-500/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                  style={{ fontFamily: font.cssFont }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{font.name}</span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{font.preview}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Kích thước font chữ toàn web */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Maximize2 className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="font-semibold text-gray-900">2. Kích thước font chữ toàn phần mềm</h2>
              <p className="text-xs text-gray-500">Phóng to hoặc thu nhỏ chữ phù hợp với khoảng cách màn hình máy tính / máy POS</p>
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
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="text-lg font-bold text-gray-900 mb-1">{item.rootPx}</div>
                  <div className="text-xs text-gray-600">{item.label}</div>
                  {isSelected && (
                    <div className="mt-2 text-xs font-semibold text-indigo-600 flex items-center justify-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Đang chọn
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Kích thước font chữ Chatbot AI (Mục #4) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Bot className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="font-semibold text-gray-900">3. Kích thước chữ Chatbot AI</h2>
              <p className="text-xs text-gray-500">Điều chỉnh độ lớn nội dung tin nhắn trong khung trợ lý thông minh</p>
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
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-900 text-sm">{item.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className={`${item.textClass} text-gray-600 mt-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200`}>
                    "Xin chào! Tôi có thể giúp gì cho bạn trong việc bán hàng và quản lý kho hôm nay?"
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Chủ đề màu sắc (Theme) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Palette className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="font-semibold text-gray-900">4. Chủ đề màu sắc (Theme)</h2>
              <p className="text-xs text-gray-500">Chọn phong cách màu chủ đạo cho toàn bộ hệ thống quán</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.keys(THEME_COLOR_MAP) as ThemeColorOption[]).map((themeKey) => {
              const theme = THEME_COLOR_MAP[themeKey];
              const isSelected = settings.themeColor === themeKey;
              return (
                <button
                  key={themeKey}
                  type="button"
                  onClick={() => {
                    handleUpdate('themeColor', themeKey);
                    toast.success(`Đã chọn chủ đề: ${theme.name}`);
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="w-7 h-7 rounded-full shadow-inner border border-white"
                      style={{ backgroundColor: theme.primaryHex }}
                    />
                    <span className="text-xs font-mono font-medium text-gray-600">{theme.primaryHex}</span>
                  </div>
                  <div className="font-semibold text-gray-900 text-sm mb-1">{theme.name}</div>
                  {isSelected && (
                    <div className="text-xs font-semibold text-indigo-600 flex items-center gap-1 mt-2">
                      <Check className="w-3.5 h-3.5" /> Đang kích hoạt
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
