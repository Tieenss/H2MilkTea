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
    <div className="h-full overflow-hidden">
      <div className="h-full overflow-y-auto p-2 sm:p-4 hide-scrollbar">
        {/* Mobile: 2 columns, Tablet: 3 columns, Desktop: responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
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
      className="bg-white p-2 sm:p-3 rounded-lg shadow hover:shadow-md transition-all duration-200 cursor-pointer border group hover:scale-[1.02] touch-target"
      onClick={onOpenOptions}
    >
      <div className="mb-2 sm:mb-3">
        <div className="relative w-full h-24 sm:h-32 bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={imageError ? defaultImage : (product['Hình ảnh'] || defaultImage)}
            alt={product['Tên sản phẩm']}
            onError={handleImageError}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />

          {/* Overlay khi hover: Mở chọn Topping / Size / Đường / Đá */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center pointer-events-none">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-blue-600/95 text-white px-2.5 py-1.5 rounded-full shadow-lg flex items-center gap-1 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
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
              className="absolute top-1.5 right-1.5 z-10 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-0.5 transition-all"
            >
              <Zap className="w-3 h-3 fill-current" />
              <span>+ Nhanh</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1 sm:space-y-1.5">
        <h3 className="font-medium text-gray-900 text-xs sm:text-sm line-clamp-2 break-words min-h-[2rem] sm:min-h-[2.5rem] leading-tight">
          {product['Tên sản phẩm']}
        </h3>

        <div className="flex items-center justify-between">
          <p className="text-blue-600 font-semibold text-sm sm:text-base">
            {formatCurrency(parseInt(product['Đơn giá']))}
          </p>

          {product['Loại sản phẩm'] && (
            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full hidden sm:inline truncate max-w-[90px]">
              {product['Loại sản phẩm']}
            </span>
          )}
        </div>

        {/* Category on mobile - bottom line */}
        <div className="flex items-center justify-between pt-0.5">
          {product['Loại sản phẩm'] && (
            <span className="text-[11px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full sm:hidden">
              {product['Loại sản phẩm']}
            </span>
          )}
          {enableOptionModal && (
            <span className="text-[11px] text-blue-600/80 font-medium flex items-center gap-0.5 ml-auto">
              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
              <span>{isFood ? 'Ghi chú / SL' : 'Chọn Size · Topping'}</span>
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
