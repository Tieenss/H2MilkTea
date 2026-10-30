'use client';

import React, { useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import type { Product } from '../types/customer-order';
import { SIZE_OPTIONS, SUGAR_OPTIONS, ICE_OPTIONS } from '../types/customer-order';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

interface ProductDetailProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetail({ product, isOpen, onClose }: ProductDetailProps) {
  const { addItem } = useCart();
  const [size, setSize] = useState<'S' | 'M' | 'L'>('M');
  const [sugar, setSugar] = useState('100%');
  const [ice, setIce] = useState('Vừa đá');
  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [imgError, setImgError] = useState(false);

  if (!isOpen || !product) return null;

  const basePrice = parseInt(product['Đơn giá']);
  const isFood = ['Ăn vặt', 'Bánh ngọt'].includes(product['Loại sản phẩm']);
  const sizeAdjust = isFood ? 0 : SIZE_OPTIONS.find(s => s.value === size)?.priceAdjust || 0;
  const unitPrice = basePrice + sizeAdjust;
  const totalPrice = unitPrice * quantity;
  const isPlaceholder = product['Hình ảnh']?.includes('placeholder');
  const hasValidImage = product['Hình ảnh'] && !isPlaceholder && !imgError;

  const handleAdd = () => {
    addItem(product, { size, sugar, ice, note, quantity });
    toast.success(`Đã thêm ${product['Tên sản phẩm']}`, { duration: 1500 });
    // Reset state
    setSize('M');
    setSugar('100%');
    setIce('Vừa đá');
    setNote('');
    setQuantity(1);
    setImgError(false);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] bg-white rounded-t-3xl overflow-hidden shadow-2xl animate-slideUp">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Close button - Đạt chuẩn 40px */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center z-10 active:scale-90 transition-transform"
          aria-label="Đóng"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>

        <div className="overflow-y-auto max-h-[calc(90vh-90px)] pb-28">
          {/* Product Image */}
          <div className="relative h-56 bg-slate-100">
            {hasValidImage ? (
              <img
                src={product['Hình ảnh']}
                alt={product['Tên sản phẩm']}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-7xl">🧋</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>

          <div className="px-5 pt-4 space-y-5">
            {/* Product Info */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-slate-900">{product['Tên sản phẩm']}</h2>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700">
                    {product['Loại sản phẩm']}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-black text-orange-600">
                    {basePrice.toLocaleString('vi-VN')}đ
                  </span>
                  <span className="block text-xs text-slate-500 font-medium">/{product['Đơn vị tính']}</span>
                </div>
              </div>
              {product['Mô tả'] && (
                <p className="mt-2 text-xs sm:text-sm text-slate-600">{product['Mô tả']}</p>
              )}
            </div>

            {!isFood && (
              <>
                {/* Size Selection - Pill Selector chuẩn 44px */}
                <div>
                  <label className="text-sm font-bold text-slate-900 mb-2 block">Kích cỡ (Size)</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {SIZE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSize(opt.value)}
                        className={`h-12 rounded-xl text-sm font-semibold transition-all duration-150 flex flex-col items-center justify-center border
                          ${size === opt.value
                            ? 'bg-orange-50 border-2 border-orange-500 text-orange-700 shadow-xs font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-98'
                          }`}
                      >
                        <span className="text-sm font-bold">Size {opt.label}</span>
                        <span className="text-[10px] opacity-80 font-medium">
                          {opt.priceAdjust > 0 ? `+${opt.priceAdjust.toLocaleString('vi-VN')}đ` : 'Giá chuẩn'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sugar Level - Chiều cao 40px đạt chuẩn ngón cái */}
                <div>
                  <label className="text-sm font-bold text-slate-900 mb-2 block">Độ ngọt (Đường)</label>
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {SUGAR_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSugar(opt.value)}
                        className={`shrink-0 h-10 px-4 rounded-xl text-xs font-semibold transition-all duration-150 border
                          ${sugar === opt.value
                            ? 'bg-orange-50 border-2 border-orange-500 text-orange-700 shadow-xs font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-98'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ice Level - Chiều cao 40px đạt chuẩn ngón cái */}
                <div>
                  <label className="text-sm font-bold text-slate-900 mb-2 block">Lượng đá</label>
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {ICE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setIce(opt.value)}
                        className={`shrink-0 h-10 px-4 rounded-xl text-xs font-semibold transition-all duration-150 border
                          ${ice === opt.value
                            ? 'bg-orange-50 border-2 border-orange-500 text-orange-700 shadow-xs font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-98'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Note */}
            <div>
              <label className="text-sm font-bold text-slate-900 mb-1.5 block">Ghi chú cho quầy pha chế</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Mang ra cùng lúc, thêm ống hút to..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all placeholder:text-slate-400"
                rows={2}
              />
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-between pt-1">
              <label className="text-sm font-bold text-slate-900">Số lượng ly</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center active:scale-90 transition-transform text-slate-700"
                  aria-label="Giảm số lượng"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="text-lg font-black text-slate-900 w-8 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.min(20, q + 1))}
                  className="w-11 h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center shadow-md shadow-orange-600/20 active:scale-90 transition-transform"
                  aria-label="Tăng số lượng"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Add to Cart Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <button
            onClick={handleAdd}
            className="w-full py-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-base shadow-lg shadow-orange-600/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Thêm vào giỏ · {totalPrice.toLocaleString('vi-VN')}đ
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.25s ease-out;
        }
      `}</style>
    </>
  );
}
