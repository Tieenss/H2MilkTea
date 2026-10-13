'use client';

import React from 'react';
import { ShoppingBag, MapPin } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface CustomerHeaderProps {
  onCartClick?: () => void;
}

export function CustomerHeader({ onCartClick }: CustomerHeaderProps) {
  const { totalItems, tableName } = useCart();

  return (
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
    </header>
  );
}
