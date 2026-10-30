'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Product } from '../types/customer-order';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  viewMode?: 'grid' | 'list';
}

export function ProductCard({ product, onSelect, onQuickAdd, viewMode = 'grid' }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const price = parseInt(product['Đơn giá']) || 0;
  const isPlaceholder = product['Hình ảnh']?.includes('placeholder');
  const hasValidImage = product['Hình ảnh'] && !isPlaceholder && !imgError;

  // Chế độ xem Danh sách (List View - Dễ nhìn & thao tác nhanh trên điện thoại)
  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onSelect(product)}
        className="group bg-white rounded-2xl shadow-2xs border border-slate-200/80 p-2.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all hover:shadow-md hover:border-orange-300"
      >
        <div className="relative w-20 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0">
          {hasValidImage ? (
            <img
              src={product['Hình ảnh']}
              alt={product['Tên sản phẩm']}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">🧋</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700">
            {product['Loại sản phẩm']}
          </span>
          <h3 className="text-sm font-bold text-slate-900 truncate mt-1">
            {product['Tên sản phẩm']}
          </h3>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-base font-extrabold text-orange-600">
              {price.toLocaleString('vi-VN')}đ
            </span>
            <span className="text-[11px] text-slate-500 font-medium uppercase mr-2">{product['Đơn vị tính']}</span>
          </div>
        </div>

        {/* Nút Quick Add đạt chuẩn vùng chạm 44px */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd(product);
          }}
          className="w-11 h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20 flex items-center justify-center shrink-0 active:scale-90 transition-transform"
          title="Chọn món"
          aria-label="Chọn món"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Chế độ xem Lưới mặc định (Grid View)
  return (
    <div
      onClick={() => onSelect(product)}
      className="group bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden cursor-pointer 
                 active:scale-[0.97] transition-all duration-200 hover:shadow-md hover:border-orange-300 flex flex-col justify-between"
    >
      <div>
        {/* Image */}
        <div className="relative aspect-square bg-slate-100 overflow-hidden">
          {hasValidImage ? (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 animate-pulse bg-slate-200" />
              )}
              <img
                src={product['Hình ảnh']}
                alt={product['Tên sản phẩm']}
                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                loading="lazy"
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl">🧋</span>
            </div>
          )}

          {/* Category badge */}
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 backdrop-blur-xs text-slate-800 shadow-2xs">
              {product['Loại sản phẩm']}
            </span>
          </div>

          {/* Quick Add Button - Đạt chuẩn kích thước 40px */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdd(product);
            }}
            className="absolute bottom-2 right-2 w-10 h-10 rounded-xl bg-orange-600 hover:bg-orange-700 
                       text-white shadow-md shadow-orange-600/30 flex items-center justify-center
                       active:scale-90 transition-all duration-200"
            aria-label="Chọn món"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug min-h-[2.5rem]">
            {product['Tên sản phẩm']}
          </h3>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-base font-extrabold text-orange-600">
              {price.toLocaleString('vi-VN')}đ
            </span>
            <span className="text-[11px] text-slate-500 font-medium uppercase">{product['Đơn vị tính']}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
