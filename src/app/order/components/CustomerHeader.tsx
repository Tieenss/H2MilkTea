'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingBag, MapPin, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { StoreFAQModal } from './StoreFAQModal';
import { getAppearanceSettings, saveAppearanceSettings } from '@/utils/appearanceSettings';

interface CustomerHeaderProps {
  onCartClick?: () => void;
}

export function CustomerHeader({ onCartClick }: CustomerHeaderProps) {
  const { totalItems, tableName } = useCart();
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [elderlyMode, setElderlyMode] = useState<boolean>(false);

  useEffect(() => {
    setElderlyMode(getAppearanceSettings().elderlyMode);
    const handleUpdate = () => {
      setElderlyMode(getAppearanceSettings().elderlyMode);
    };
    window.addEventListener('h2_appearance_settings_updated', handleUpdate);
    return () => window.removeEventListener('h2_appearance_settings_updated', handleUpdate);
  }, []);

  const toggleElderlyMode = () => {
    const current = getAppearanceSettings();
    const next = !current.elderlyMode;
    saveAppearanceSettings({ ...current, elderlyMode: next });
    setElderlyMode(next);
  };

  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-orange-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo & Table */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-md shadow-red-200/50">
              <span className="text-white font-bold text-sm">H2</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">H2 MilkTea</h1>
              {tableName && (
                <div className="flex items-center gap-1 text-xs text-orange-600">
                  <MapPin className="w-3 h-3" />
                  <span className="font-medium">{tableName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFaqModal(true)}
              className="p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200/80 shadow-xs active:scale-95 transition-all flex items-center gap-1 text-xs font-semibold"
              title="Thông tin tiện ích quán"
            >
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span className="hidden xs:inline">Tiện ích</span>
            </button>

            {/* Quick Elderly / Large Font Mode Button for Table Customers */}
            <button
              onClick={toggleElderlyMode}
              className={`p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 flex items-center gap-1 cursor-pointer ${
                elderlyMode
                  ? 'bg-amber-100 border-amber-400 text-amber-900 ring-2 ring-amber-300'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
              }`}
              title={elderlyMode ? 'Tắt Chế độ Chữ lớn' : 'Bật Chế độ Chữ lớn & Dễ nhìn cho người lớn tuổi'}
            >
              <span className="text-sm">👓</span>
              <span className="hidden xs:inline">{elderlyMode ? 'Chữ lớn: Bật' : 'Chữ lớn'}</span>
            </button>

            {/* Cart Button */}
            <button
              onClick={onCartClick}
              className="relative p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-md shadow-red-200/50 active:scale-95 transition-transform"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-gray-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm animate-bounce">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <StoreFAQModal isOpen={showFaqModal} onClose={() => setShowFaqModal(false)} />
    </>
  );
}
