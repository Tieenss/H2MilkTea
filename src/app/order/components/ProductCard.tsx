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
        className="group bg-white rounded-2xl shadow-xs border border-gray-100 p-2.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all hover:shadow-md hover:border-orange-200"
      >
        <div className="relative w-20 h-20 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden shrink-0">
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
          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-orange-50 text-orange-700">
            {product['Loại sản phẩm']}
          </span>
          <h3 className="text-sm font-bold text-gray-900 truncate mt-0.5">
            {product['Tên sản phẩm']}
          </h3>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-sm font-bold text-orange-600">
              {price.toLocaleString('vi-VN')}đ
            </span>
            <span className="text-[10px] text-gray-400 uppercase mr-2">{product['Đơn vị tính']}</span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd(product);
          }}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-md shadow-orange-500/20 flex items-center justify-center shrink-0 active:scale-90 transition-transform hover:scale-105"
          title="Chọn món"
          aria-label="Chọn món"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Chế độ xem Lưới mặc định (Grid View)
  return (
    <div
      onClick={() => onSelect(product)}
      className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer 
                 active:scale-[0.97] transition-all duration-200 hover:shadow-lg hover:border-orange-200"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
        {hasValidImage ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-orange-100 to-amber-100" />
            )}
            <img
              src={product['Hình ảnh']}
              alt={product['Tên sản phẩm']}
              className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              loading="lazy"
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">🥤</span>
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/90 backdrop-blur-sm text-gray-700 shadow-sm">
            {product['Loại sản phẩm']}
          </span>
        </div>

        {/* Quick Add Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd(product);
          }}
          className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 
                     text-white shadow-lg shadow-red-200/50 flex items-center justify-center
                     active:scale-90 transition-all duration-200 hover:scale-105"
          aria-label="Chọn món"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight min-h-[2.5rem]">
          {product['Tên sản phẩm']}
        </h3>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-base font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
            {price.toLocaleString('vi-VN')}đ
          </span>
          <span className="text-[10px] text-gray-400 uppercase">{product['Đơn vị tính']}</span>
        </div>
      </div>
    </div>
  );
}
