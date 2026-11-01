'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '../utils/formatters';
import type { Product } from '../types/pos';
import { X, Plus, Minus, Sparkles, Coffee, UtensilsCrossed, Check, Zap } from 'lucide-react';

export interface ToppingOption {
  id: string;
  name: string;
  price: number;
  shortLabel: string;
}

export const H2_TOPPING_LIST: ToppingOption[] = [
  { id: 'tc_den', name: 'Trân châu đen', price: 5000, shortLabel: 'Trân châu đen (+5k)' },
  { id: 'tc_trang', name: 'Trân châu trắng', price: 5000, shortLabel: 'Trân châu trắng (+5k)' },
  { id: 'tc_duong_den', name: 'Trân châu đường đen', price: 7000, shortLabel: 'Trân châu đường đen (+7k)' },
  { id: 'kem_cheese', name: 'Kem Cheese Macchiato', price: 10000, shortLabel: 'Kem Cheese Macchiato (+10k)' },
  { id: 'thach_cu_nang', name: 'Thạch củ năng', price: 5000, shortLabel: 'Thạch củ năng (+5k)' },
  { id: 'thach_dua', name: 'Thạch dừa', price: 5000, shortLabel: 'Thạch dừa (+5k)' },
  { id: 'pudding_trung', name: 'Pudding trứng', price: 7000, shortLabel: 'Pudding trứng (+7k)' },
  { id: 'dao_mieng', name: 'Đào miếng', price: 8000, shortLabel: 'Đào miếng (+8k)' },
  { id: 'suong_sao', name: 'Sương sáo', price: 5000, shortLabel: 'Sương sáo (+5k)' },
];

const SUGAR_OPTIONS = [
  '100% đường',
  '70% đường',
  '50% đường',
  '30% đường',
  '0% đường',
];

const ICE_OPTIONS = [
  '100% đá',
  '70% đá',
  '50% đá',
  '30% đá',
  '0% đá',
  'Nóng / Ấm',
];

const QUICK_DRINK_NOTES = [
  'Đá để riêng',
  'Ít ngọt béo',
  'Mang về riêng bịch',
  'Không lấy ống hút',
];

const QUICK_FOOD_NOTES = [
  'Không cay',
  'Thêm tương ớt',
  'Để sốt riêng',
  'Làm nóng giòn',
];

export interface ProductOptionPayload {
  size?: string;
  sugar?: string;
  ice?: string;
  toppings?: string[];
  note?: string;
  priceAdjust?: number;
  toppingPrice?: number;
  quantity?: number;
}

interface ProductOptionModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (productId: string, options: ProductOptionPayload) => void;
}

export const ProductOptionModal: React.FC<ProductOptionModalProps> = ({
  product,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [size, setSize] = useState<'M' | 'L'>('M');
  const [sugar, setSugar] = useState<string>('100% đường');
  const [ice, setIce] = useState<string>('100% đá');
  const [selectedToppingIds, setSelectedToppingIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [customNote, setCustomNote] = useState<string>('');

  const isFood = useMemo(() => {
    if (!product) return false;
    return ['Ăn vặt', 'Bánh ngọt'].includes(product['Loại sản phẩm'] || '');
  }, [product]);

  // Reset lại toàn bộ lựa chọn mặc định mỗi khi mở modal cho sản phẩm mới
  useEffect(() => {
    if (isOpen && product) {
      setSize('M');
      setSugar('100% đường');
      setIce('100% đá');
      setSelectedToppingIds([]);
      setQuantity(1);
      setCustomNote('');
    }
  }, [isOpen, product]);

  const basePrice = useMemo(() => {
    if (!product) return 0;
    return Number(product['Đơn giá']) || 0;
  }, [product]);

  const sizeAdjust = useMemo(() => {
    if (isFood) return 0;
    return size === 'L' ? 5000 : 0;
  }, [isFood, size]);

  const selectedToppings = useMemo(() => {
    if (isFood) return [];
    return H2_TOPPING_LIST.filter(t => selectedToppingIds.includes(t.id));
  }, [isFood, selectedToppingIds]);

  const toppingPrice = useMemo(() => {
    return selectedToppings.reduce((sum, t) => sum + t.price, 0);
  }, [selectedToppings]);

  const unitPrice = basePrice + sizeAdjust + toppingPrice;
  const totalPrice = unitPrice * quantity;

  if (!isOpen || !product) {
    return null;
  }

  const toggleTopping = (toppingId: string) => {
    setSelectedToppingIds(prev =>
      prev.includes(toppingId)
        ? prev.filter(id => id !== toppingId)
        : [...prev, toppingId]
    );
  };

  const handleToggleQuickNote = (chip: string) => {
    const trimmed = customNote.trim();
    if (!trimmed) {
      setCustomNote(chip);
      return;
    }
    const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.includes(chip)) {
      setCustomNote(parts.filter(p => p !== chip).join(', '));
    } else {
      setCustomNote([...parts, chip].join(', '));
    }
  };

  const handleConfirmAdd = () => {
    const toppingsLabels = selectedToppings.map(t => t.shortLabel);

    // Xây dựng chuỗi ghi chú tổng hợp rõ ràng cho giỏ hàng và in bếp/in tem
    // Chỉ nối các tùy chọn khác mặc định để món mặc định gộp dòng đồng nhất với nút "+ Nhanh"
    const summaryParts: string[] = [];
    if (!isFood) {
      if (size === 'L') summaryParts.push('Size L (+5k)');
      if (sugar && sugar !== '100% đường') summaryParts.push(sugar);
      if (ice && ice !== '100% đá') summaryParts.push(ice);
      if (toppingsLabels.length > 0) {
        summaryParts.push(`+${toppingsLabels.join(', +')}`);
      }
    }
    if (customNote.trim()) {
      summaryParts.push(customNote.trim());
    }

    const combinedNote = summaryParts.join(' · ');

    onConfirm(product.IDSP, {
      size: isFood ? undefined : size,
      sugar: isFood ? undefined : sugar,
      ice: isFood ? undefined : ice,
      toppings: isFood ? undefined : toppingsLabels,
      note: combinedNote,
      priceAdjust: sizeAdjust + toppingPrice,
      toppingPrice,
      quantity,
    });
    onClose();
  };

  const handleQuickDefaultAdd = () => {
    onConfirm(product.IDSP, {
      size: isFood ? undefined : 'M',
      sugar: isFood ? undefined : '100% đường',
      ice: isFood ? undefined : '100% đá',
      toppings: [],
      note: '',
      priceAdjust: 0,
      toppingPrice: 0,
      quantity: 1,
    });
    onClose();
  };

  const defaultImage = "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop&crop=center";

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header thông tin sản phẩm */}
        <div className="p-4 sm:p-5 border-b dark:border-gray-800 flex items-start justify-between gap-4 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/50 dark:from-gray-900 dark:to-gray-900">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 shadow-xs">
              <img
                src={product['Hình ảnh'] || defaultImage}
                alt={product['Tên sản phẩm']}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = defaultImage;
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs font-semibold">
                  {isFood ? (
                    <span className="inline-flex items-center gap-1">
                      <UtensilsCrossed className="w-3 h-3" />
                      {product['Loại sản phẩm']}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Coffee className="w-3 h-3" />
                      {product['Loại sản phẩm'] || 'Đồ uống'}
                    </span>
                  )}
                </Badge>
                <span className="text-xs text-gray-500">
                  Giá gốc: <strong>{formatCurrency(basePrice)}</strong>
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">
                {product['Tên sản phẩm']}
              </h2>
              <p className="text-sm font-bold text-blue-600 mt-0.5">
                Đơn giá: {formatCurrency(unitPrice)} / {product['Đơn vị tính'] || (isFood ? 'Phần' : 'Ly')}
                {(sizeAdjust > 0 || toppingPrice > 0) && (
                  <span className="text-xs font-medium text-emerald-600 ml-2">
                    (+{formatCurrency(sizeAdjust + toppingPrice)} tùy chọn)
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung tùy chọn cuộn được */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-5">
          {!isFood && (
            <>
              {/* 1. Chọn Size */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                    1. Chọn Size ly
                  </label>
                  <span className="text-xs text-gray-500">Bắt buộc · Mặc định Size M</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSize('M')}
                    className={`p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                      size === 'M'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm">Size M (Tiêu chuẩn)</div>
                      <div className="text-xs text-gray-500">+0đ (Mặc định)</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      size === 'M' ? 'bg-blue-600 text-white' : 'border border-gray-300'
                    }`}>
                      {size === 'M' && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSize('L')}
                    className={`p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                      size === 'L'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm">Size L (Ly lớn)</div>
                      <div className="text-xs text-emerald-600 font-semibold">+5.000đ</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      size === 'L' ? 'bg-blue-600 text-white' : 'border border-gray-300'
                    }`}>
                      {size === 'L' && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Chọn Mức đường */}
              <div>
                <label className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide block mb-2">
                  2. Mức đường
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {SUGAR_OPTIONS.map((opt) => {
                    const active = sugar === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSugar(opt)}
                        className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Chọn Mức đá */}
              <div>
                <label className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide block mb-2">
                  3. Mức đá / Nhiệt độ
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {ICE_OPTIONS.map((opt) => {
                    const active = ice === opt;
                    const isHot = opt.includes('Nóng');
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setIce(opt)}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${
                          active
                            ? isHot
                              ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                              : 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Chọn Thêm Topping (Multi-select) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>4. Chọn thêm Topping (Có thể chọn nhiều)</span>
                  </label>
                  {selectedToppings.length > 0 && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Đã chọn {selectedToppings.length} (+{formatCurrency(toppingPrice)})
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {H2_TOPPING_LIST.map((topping) => {
                    const isChecked = selectedToppingIds.includes(topping.id);
                    return (
                      <button
                        key={topping.id}
                        type="button"
                        onClick={() => toggleTopping(topping.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                          isChecked
                            ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-xs ring-1 ring-emerald-500'
                            : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{topping.name}</div>
                          <div className="text-[11px] font-semibold text-emerald-600">
                            +{formatCurrency(topping.price)}
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                            isChecked
                              ? 'bg-emerald-600 text-white'
                              : 'border border-gray-300 bg-gray-50'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Ghi chú thêm & Gợi ý nhanh */}
          <div>
            <label className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide block mb-2">
              {isFood ? '1. Ghi chú chế biến' : '5. Ghi chú pha chế thêm'}
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(isFood ? QUICK_FOOD_NOTES : QUICK_DRINK_NOTES).map((chip) => {
                const isSelected = customNote.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleToggleQuickNote(chip)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    + {chip}
                  </button>
                );
              })}
            </div>
            <Input
              type="text"
              placeholder={isFood ? 'Ví dụ: Không cay, để riêng tương ớt...' : 'Ví dụ: Đá để riêng, ít ngọt béo...'}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Footer: Chọn số lượng & Xác nhận thêm vào giỏ */}
        <div className="p-4 sm:p-5 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Bộ chọn số lượng */}
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Số lượng:</span>
            <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-700 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center font-bold text-base text-gray-900 dark:text-white">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(q => q + 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Các nút hành động */}
          <div className="flex items-center gap-2.5 flex-1 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleQuickDefaultAdd}
              className="border-blue-200 text-blue-700 hover:bg-blue-50 text-xs sm:text-sm font-semibold"
              title="Thêm nhanh 1 phần mặc định (Size M, 100% đường, 100% đá)"
            >
              <Zap className="w-4 h-4 mr-1 text-amber-500" />
              Thêm nhanh mặc định
            </Button>

            <Button
              type="button"
              onClick={handleConfirmAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 text-sm shadow-md flex-1 sm:flex-initial"
            >
              <span>Xác nhận thêm · {formatCurrency(totalPrice)}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
