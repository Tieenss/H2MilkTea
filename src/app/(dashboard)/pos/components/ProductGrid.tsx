'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '../utils/formatters';
import type { Product } from '../types/pos';
import { ProductOptionModal, type ProductOptionPayload } from './ProductOptionModal';
import { Sparkles, Zap } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  enableOptionModal?: boolean;
  onAddToCart: (
    productId: string,
    options?: {
      size?: string;
      sugar?: string;
      ice?: string;
      toppings?: string[];
      note?: string;
      quantity?: number;
      toppingPrice?: number;
      priceAdjust?: number;
    }
  ) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  enableOptionModal = true,
  onAddToCart
}) => {
  const [selectedProductForOption, setSelectedProductForOption] = useState<Product | null>(null);

  const handleConfirmOptions = (productId: string, options: ProductOptionPayload) => {
    onAddToCart(productId, options);
  };

  if (products.length === 0) {
    return (
      <div className="flex-grow bg-white rounded-lg shadow-lg overflow-hidden h-full">
        <div className="h-full flex items-center justify-center">
          <div className="text-center py-10">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">Không tìm thấy sản phẩm nào</p>
            <p className="text-gray-400 text-sm mt-2">
              Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm (hỗ trợ tìm không dấu & viết tắt như &quot;tstcdd&quot;, &quot;tan chau&quot;)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto p-1.5 sm:p-2.5 lg:p-3 pb-24 lg:pb-4 hide-scrollbar">
        {/* Khóa cứng kích thước thẻ món ăn (Card Size Locking) theo từng khung thiết bị:
            - Điện thoại nhỏ (< 375px) & Điện thoại thường/lớn (< 640px): 2 cột (grid-cols-2 gap-2 sm:gap-2.5)
            - Máy tính bảng dọc (640px - 1023px): 3 cột (sm:grid-cols-3 md:grid-cols-3)
            - Máy tính bảng ngang (1024px - 1279px): 3 cột (lg:grid-cols-3)
            - Màn hình lớn: 4-5 cột (xl:grid-cols-4 2xl:grid-cols-5)
        */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-2.5 lg:gap-3 auto-rows-fr">
          {products.map((product) => (
            <ProductCard
              key={product.IDSP}
              product={product}
              enableOptionModal={enableOptionModal}
              onOpenOptions={() => {
                if (enableOptionModal) {
                  setSelectedProductForOption(product);
                } else {
                  onAddToCart(product.IDSP);
                }
              }}
              onQuickAdd={() => onAddToCart(product.IDSP)}
            />
          ))}
        </div>
      </div>

      {/* Modal chọn Size, Đường, Đá, Topping & Số lượng */}
      <ProductOptionModal
        product={selectedProductForOption}
        isOpen={!!selectedProductForOption}
        onClose={() => setSelectedProductForOption(null)}
        onConfirm={handleConfirmOptions}
      />
    </div>
  );
};

interface ProductCardProps {
  product: Product;
  enableOptionModal?: boolean;
  onOpenOptions: () => void;
  onQuickAdd: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  enableOptionModal = true,
  onOpenOptions,
  onQuickAdd,
}) => {
  const [imageError, setImageError] = React.useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const defaultImage = "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop&crop=center";
  const isFood = ['Ăn vặt', 'Bánh ngọt'].includes(product['Loại sản phẩm'] || '');

  return (
    <Card
      data-pos-card="true"
      className="bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer border border-slate-200/90 dark:border-slate-800 group flex flex-col justify-between min-w-0 h-full overflow-hidden select-none active:scale-[0.98]"
      onClick={onOpenOptions}
    >
      <div className="mb-1.5 sm:mb-2 shrink-0">
        <div className="relative w-full h-24 xs:h-28 sm:h-32 bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden">
          <img
            src={imageError ? defaultImage : (product['Hình ảnh'] || defaultImage)}
            alt={product['Tên sản phẩm']}
            onError={handleImageError}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />

          {/* Overlay khi hover trên máy tính: Mở chọn Topping / Size / Đường / Đá */}
          <div className="hidden sm:flex absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 items-center justify-center pointer-events-none">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-blue-600/95 text-white px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 text-xs font-semibold whitespace-nowrap">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>{enableOptionModal ? (isFood ? 'Tùy chọn' : '+ Topping / Size') : '+ Thêm vào giỏ'}</span>
              </div>
            </div>
          </div>

          {/* Nút "+ Nhanh" ở góc trên bên phải ảnh sản phẩm để thêm thẳng 1 ly mặc định */}
          {enableOptionModal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd();
              }}
              title="Thêm nhanh 1 phần mặc định (Size M, 100% đường, 100% đá)"
              className="absolute top-1.5 right-1.5 z-10 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10px] sm:text-[11px] font-bold h-6 sm:h-7 px-2 rounded-full shadow-md flex items-center gap-0.5 transition-all whitespace-nowrap shrink-0"
            >
              <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current shrink-0" />
              <span>+ Nhanh</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 justify-between min-w-0 gap-1">
        <h3 className="pos-card-title-lock font-semibold text-gray-900 dark:text-slate-100 text-xs sm:text-sm leading-snug line-clamp-2 break-words min-h-[2rem] sm:min-h-[2.25rem]">
          {product['Tên sản phẩm']}
        </h3>

        <div className="pt-0.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-1 min-w-0">
            <p className="pos-card-price-lock text-blue-600 dark:text-blue-400 font-bold text-xs sm:text-sm md:text-base whitespace-nowrap shrink-0">
              {formatCurrency(parseInt(product['Đơn giá']))}
            </p>

            {product['Loại sản phẩm'] && (
              <span className="text-[10px] sm:text-[11px] px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-full truncate max-w-[75px] sm:max-w-[95px]">
                {product['Loại sản phẩm']}
              </span>
            )}
          </div>

          {enableOptionModal && (
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-blue-600/85 dark:text-blue-400 font-medium truncate">
              <span className="flex items-center gap-0.5 truncate">
                <Sparkles className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                <span className="truncate">{isFood ? 'Ghi chú / SL' : 'Size · Topping'}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
