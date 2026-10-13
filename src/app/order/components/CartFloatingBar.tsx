'use client';

import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface CartFloatingBarProps {
  onViewCart: () => void;
}

export function CartFloatingBar({ onViewCart }: CartFloatingBarProps) {
  const { totalItems, totalAmount } = useCart();

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-safe">
      <div className="max-w-lg mx-auto">
        <button
          onClick={onViewCart}
          className="w-full flex items-center justify-between py-3.5 px-5 rounded-2xl
                     bg-gradient-to-r from-red-500 to-orange-500 text-white
                     shadow-xl shadow-red-300/40 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 bg-yellow-400 text-gray-900 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {totalItems}
              </span>
            </div>
            <span className="font-semibold text-sm">Xem giỏ hàng</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base">{totalAmount.toLocaleString('vi-VN')}đ</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>
    </div>
  );
}
