'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Printer,
  Receipt,
  Tag,
  CheckSquare,
  Square,
  X,
  Sparkles,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CartItem } from '../types/pos';
import { formatCurrency } from '../utils/formatters';

export type PrintActionType = 'labels' | 'receipt' | 'both';

interface PrintSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  tableName?: string;
  isPrinting?: boolean;
  onConfirmPrint: (action: PrintActionType, selectedItems: CartItem[]) => Promise<void>;
}

// Khóa định danh duy nhất cho từng dòng trong danh sách chọn in
export const getPrintItemKey = (item: CartItem, index: number): string => {
  return item.lineItemKey || `${item.id}_${item.size || 'M'}_${item.sugar || ''}_${item.ice || ''}_${(item.toppings || []).join('-')}_${index}`;
};

export function PrintSelectionModal({
  isOpen,
  onClose,
  cart,
  tableName = 'Khách mang về',
  isPrinting = false,
  onConfirmPrint,
}: PrintSelectionModalProps) {
  // Quản lý danh sách Key món được chọn để in tem
  const [selectedItemKeys, setSelectedItemKeys] = useState<Set<string>>(new Set());
  const wasOpenRef = useRef(false);

  // Chỉ khởi tạo khi modal chuyển từ đóng sang mở (tránh reset lựa chọn của thu ngân khi background sync re-render)
  useEffect(() => {
    if (isOpen) {
      if (!wasOpenRef.current) {
        wasOpenRef.current = true;
        const initialSelected = new Set<string>();
        cart.forEach((item, index) => {
          // Món mới hoặc đã sửa: Tự động tích chọn
          // Món đã in trước đó: Mặc định bỏ tích để tránh in lãng phí tem
          if (item.printStatus !== 'printed') {
            initialSelected.add(getPrintItemKey(item, index));
          }
        });

        // Nếu tất cả các món đều đã in, tích chọn tất cả để thu ngân tiện in lại nếu muốn
        if (initialSelected.size === 0 && cart.length > 0) {
          cart.forEach((item, index) => initialSelected.add(getPrintItemKey(item, index)));
        }

        setSelectedItemKeys(initialSelected);
      }
    } else {
      wasOpenRef.current = false;
    }
  }, [isOpen, cart]);

  const toggleItem = (key: string) => {
    setSelectedItemKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedItemKeys(new Set(cart.map((item, idx) => getPrintItemKey(item, idx))));
  };

  const handleDeselectAll = () => {
    setSelectedItemKeys(new Set());
  };

  const handleSelectNewAndModifiedOnly = () => {
    setSelectedItemKeys(
      new Set(
        cart
          .map((item, idx) => ({ key: getPrintItemKey(item, idx), status: item.printStatus }))
          .filter((item) => item.status !== 'printed')
          .map((item) => item.key)
      )
    );
  };

  const selectedCartItems = useMemo(() => {
    return cart.filter((item, idx) => selectedItemKeys.has(getPrintItemKey(item, idx)));
  }, [cart, selectedItemKeys]);

  const totalCupsToPrint = useMemo(() => {
    return selectedCartItems.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
  }, [selectedCartItems]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl border-2 border-indigo-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-indigo-100 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-inner">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Xác Nhận In Tem & Hóa Đơn</h3>
              <p className="text-xs text-purple-100 mt-0.5">Bàn: {tableName} · Tổng {cart.length} dòng món</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPrinting}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 active:scale-95 text-white transition-all"
            title="Đóng cửa sổ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/90 px-4 py-2.5 text-xs text-gray-700">
          <span className="font-semibold">
            Đã chọn: <strong className="text-indigo-700 font-bold">{selectedItemKeys.size}/{cart.length} món ({totalCupsToPrint} ly)</strong>
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleSelectNewAndModifiedOnly}
              className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold border border-indigo-200 text-indigo-700 hover:bg-indigo-50 active:scale-95 transition-all shadow-2xs"
            >
              Chỉ mới & sửa
            </button>
            <button
              type="button"
              onClick={handleSelectAll}
              className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold border border-gray-300 text-gray-700 hover:bg-gray-100 active:scale-95 transition-all shadow-2xs"
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold border border-gray-300 text-gray-600 hover:bg-gray-100 active:scale-95 transition-all shadow-2xs"
            >
              Bỏ chọn
            </button>
          </div>
        </div>

        {/* List of Items with Print Status */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cart.map((item, index) => {
            const itemKey = getPrintItemKey(item, index);
            const isSelected = selectedItemKeys.has(itemKey);
            const status = item.printStatus || 'new';

            return (
              <div
                key={itemKey}
                onClick={() => toggleItem(itemKey)}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    toggleItem(itemKey);
                  }
                }}
                className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer select-none transition-all duration-150 ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/70 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50 opacity-75'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="text-indigo-600 flex-shrink-0">
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900 truncate">
                        {item.name}
                      </span>
                      {item.size && (
                        <span className="rounded-md bg-indigo-100 border border-indigo-200 px-1.5 py-0.2 text-[10px] font-bold text-indigo-800">
                          Size {item.size}
                        </span>
                      )}
                    </div>

                    {/* Options: Sugar, Ice, Toppings */}
                    <div className="text-[11px] text-gray-600 truncate mt-0.5 font-medium">
                      {item.sugar && <span>Đường: {item.sugar} </span>}
                      {item.ice && <span>· Đá: {item.ice} </span>}
                      {item.toppings && item.toppings.length > 0 && (
                        <span>· +{item.toppings.join(', ')}</span>
                      )}
                      {item.note && <span className="italic text-amber-700"> * {item.note}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 pl-2">
                  <span className="text-xs font-bold text-gray-800 bg-white px-2 py-1 rounded-lg border border-gray-200 shadow-2xs">
                    {item.quantity} ly
                  </span>

                  {/* Print Status Badge (Mục #6) */}
                  {status === 'new' && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 text-[10px] font-bold">
                      Vừa thêm
                    </Badge>
                  )}
                  {status === 'modified' && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 text-[10px] font-bold">
                      Đã sửa
                    </Badge>
                  )}
                  {status === 'printed' && (
                    <Badge className="bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-100 text-[10px]">
                      Đã in
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons Footer */}
        <div className="border-t-2 border-gray-100 bg-gray-50/90 p-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Nút 1: Chỉ in tem nhãn các món đã chọn */}
            <Button
              type="button"
              disabled={isPrinting || selectedItemKeys.size === 0}
              onClick={() => onConfirmPrint('labels', selectedCartItems)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <Tag className="h-4 w-4" />
              <span>Chỉ in tem ly ({totalCupsToPrint})</span>
            </Button>

            {/* Nút 2: Chỉ in hóa đơn */}
            <Button
              type="button"
              disabled={isPrinting}
              onClick={() => onConfirmPrint('receipt', selectedCartItems)}
              variant="outline"
              className="border-2 border-blue-200 text-blue-700 hover:bg-blue-50 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <Receipt className="h-4 w-4" />
              <span>Chỉ in hóa đơn</span>
            </Button>
          </div>

          {/* Nút 3: In cả hai (Tem nhãn + Hóa đơn) */}
          <Button
            type="button"
            disabled={isPrinting || selectedItemKeys.size === 0}
            onClick={() => onConfirmPrint('both', selectedCartItems)}
            className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:opacity-95 active:scale-[0.99] text-white font-black text-sm py-3 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
          >
            <Layers className="h-4 w-4" />
            <span>In cả hai ({totalCupsToPrint} tem dán + Hóa đơn)</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
