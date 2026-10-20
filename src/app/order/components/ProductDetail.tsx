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

  // Check if this is a food item (no drink customization needed)
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
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] bg-white rounded-t-3xl overflow-hidden shadow-2xl animate-slideUp">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center z-10 active:scale-90 transition-transform"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)] pb-24">
          {/* Product Image */}
          <div className="relative h-56 bg-gradient-to-br from-orange-50 to-amber-50">
            {hasValidImage ? (
              <img
                src={product['Hình ảnh']}
                alt={product['Tên sản phẩm']}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-7xl">🥤</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>

          <div className="px-5 pt-4 space-y-5">
            {/* Product Info */}
            <div>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">{product['Tên sản phẩm']}</h2>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                    {product['Loại sản phẩm']}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                    {basePrice.toLocaleString('vi-VN')}đ
                  </span>
                  <span className="block text-xs text-gray-400">/{product['Đơn vị tính']}</span>
                </div>
              </div>
              {product['Mô tả'] && (
                <p className="mt-2 text-sm text-gray-500">{product['Mô tả']}</p>
              )}
            </div>

            {!isFood && (
              <>
                {/* Size Selection */}
                <div>
                  <label className="text-sm font-semibold text-gray-800 mb-2 block">Kích cỡ</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {SIZE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSize(opt.value)}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                          ${size === opt.value
                            ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md shadow-red-200/50'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
                          }`}
                      >
                        <span className="text-base font-bold">Size {opt.label}</span>
                        <span className="block text-[10px] mt-0.5 opacity-85">
                          {opt.priceAdjust > 0 ? `+${opt.priceAdjust.toLocaleString('vi-VN')}đ` : 'Giá gốc'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sugar Level */}
                <div>
                  <label className="text-sm font-semibold text-gray-800 mb-2 block">Độ ngọt</label>
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {SUGAR_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSugar(opt.value)}
                        className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200
                          ${sugar === opt.value
                            ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md shadow-red-200/50'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ice Level */}
                <div>
                  <label className="text-sm font-semibold text-gray-800 mb-2 block">Đá</label>
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {ICE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setIce(opt.value)}
                        className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200
                          ${ice === opt.value
                            ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md shadow-red-200/50'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
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
              <label className="text-sm font-semibold text-gray-800 mb-2 block">Ghi chú</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: ít đá, thêm trân châu..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition-all"
                rows={2}
              />
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-800">Số lượng</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <Minus className="w-4 h-4 text-gray-600" />
                </button>
                <span className="text-lg font-bold text-gray-900 w-8 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => Math.min(20, q + 1))}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-red-200/50 active:scale-90 transition-transform"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Add to Cart Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <button
            onClick={handleAdd}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-base shadow-lg shadow-red-200/50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
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
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
