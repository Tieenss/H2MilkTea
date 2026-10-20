'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  Receipt,
  Tag,
  CheckSquare,
  Square,
  X,
  Sparkles,
  RefreshCw,
  AlertCircle,
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

export function PrintSelectionModal({
  isOpen,
  onClose,
  cart,
  tableName = 'Khách mang về',
  isPrinting = false,
  onConfirmPrint,
}: PrintSelectionModalProps) {
  // Quản lý danh sách ID món được chọn để in tem
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Khi modal mở, mặc định chọn các món 'new' hoặc 'modified', bỏ tích các món 'printed' (Mục #6)
  useEffect(() => {
    if (isOpen) {
      const initialSelected = new Set<string>();
      cart.forEach((item) => {
        // Món mới hoặc đã sửa: Tự động tích chọn
        // Món đã in trước đó: Mặc định bỏ tích để tránh in lãng phí tem
        if (item.printStatus !== 'printed') {
          initialSelected.add(item.id);
        }
      });

      // Nếu tất cả các món đều đã in, tích chọn tất cả để thu ngân tiện in lại nếu muốn
      if (initialSelected.size === 0 && cart.length > 0) {
        cart.forEach((i) => initialSelected.add(i.id));
      }

      setSelectedItemIds(initialSelected);
    }
  }, [isOpen, cart]);

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedItemIds(new Set(cart.map((i) => i.id)));
  };

  const handleDeselectAll = () => {
    setSelectedItemIds(new Set());
  };

  const handleSelectNewAndModifiedOnly = () => {
    setSelectedItemIds(
      new Set(cart.filter((i) => i.printStatus !== 'printed').map((i) => i.id))
    );
  };

  const selectedCartItems = useMemo(() => {
    return cart.filter((i) => selectedItemIds.has(i.id));
  }, [cart, selectedItemIds]);

  const totalCupsToPrint = useMemo(() => {
    return selectedCartItems.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
  }, [selectedCartItems]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Xác Nhận In Tem & Hóa Đơn</h3>
              <p className="text-xs text-purple-100">Bàn: {tableName} · Tổng {cart.length} dòng món</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPrinting}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-5 py-2.5 text-xs text-gray-600">
          <span className="font-medium">
            Đã chọn: <strong className="text-purple-700">{selectedItemIds.size}/{cart.length} món ({totalCupsToPrint} ly)</strong>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSelectNewAndModifiedOnly}
              className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold border border-gray-200 text-gray-700 hover:bg-gray-100 active:scale-95"
            >
              Chỉ món mới & sửa
            </button>
            <button
              type="button"
              onClick={handleSelectAll}
              className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold border border-gray-200 text-gray-700 hover:bg-gray-100 active:scale-95"
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold border border-gray-200 text-gray-700 hover:bg-gray-100 active:scale-95"
            >
              Bỏ chọn
            </button>
          </div>
        </div>

        {/* List of Items with Print Status */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.map((item) => {
            const isSelected = selectedItemIds.has(item.id);
            const status = item.printStatus || 'new';

            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                  isSelected
                    ? 'border-purple-300 bg-purple-50/50 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300 opacity-70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="text-purple-600">
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5" />
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
                        <span className="rounded bg-gray-100 px-1.5 py-0.2 text-[10px] font-bold text-gray-600">
                          {item.size}
                        </span>
                      )}
                    </div>

                    {/* Options: Sugar, Ice, Toppings */}
                    <div className="text-[11px] text-gray-500 truncate mt-0.5">
                      {item.sugar && <span>Đường: {item.sugar} </span>}
                      {item.ice && <span>· Đá: {item.ice} </span>}
                      {item.toppings && item.toppings.length > 0 && (
                        <span>· +{item.toppings.join(', ')}</span>
                      )}
                      {item.note && <span className="italic"> * {item.note}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 pl-2">
                  <span className="text-xs font-semibold text-gray-700">
                    {item.quantity} ly
                  </span>

                  {/* Print Status Badge (Mục #6) */}
                  {status === 'new' && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-[10px] font-bold">
                      Vừa thêm
                    </Badge>
                  )}
                  {status === 'modified' && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-[10px] font-bold">
                      Đã sửa
                    </Badge>
                  )}
                  {status === 'printed' && (
                    <Badge className="bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100 text-[10px]">
                      Đã in
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons Footer */}
        <div className="border-t border-gray-100 bg-gray-50/80 p-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Nút 1: Chỉ in tem nhãn các món đã chọn */}
            <Button
              type="button"
              disabled={isPrinting || selectedItemIds.size === 0}
              onClick={() => onConfirmPrint('labels', selectedCartItems)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1.5"
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
              className="border-blue-200 text-blue-700 hover:bg-blue-50 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5"
            >
              <Receipt className="h-4 w-4" />
              <span>Chỉ in hóa đơn</span>
            </Button>
          </div>

          {/* Nút 3: In cả hai (Tem nhãn + Hóa đơn) */}
          <Button
            type="button"
            disabled={isPrinting || selectedItemIds.size === 0}
            onClick={() => onConfirmPrint('both', selectedCartItems)}
            className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:opacity-95 text-white font-black text-sm py-3 rounded-xl shadow-md flex items-center justify-center gap-2"
          >
            <Layers className="h-4 w-4" />
            <span>In cả hai (In {totalCupsToPrint} tem dán + Hóa đơn)</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
