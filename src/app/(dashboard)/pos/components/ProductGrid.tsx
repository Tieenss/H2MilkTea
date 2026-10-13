'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '../utils/formatters';
import type { Product } from '../types/pos';

interface ProductGridProps {
  products: Product[];
  onAddToCart: (productId: string) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onAddToCart
}) => {
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
              Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
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
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const [imageError, setImageError] = React.useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const defaultImage = "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop&crop=center";

  return (
    <Card
      className="bg-white p-2 sm:p-3 rounded-lg shadow hover:shadow-md transition-all duration-200 cursor-pointer border group hover:scale-[1.02] touch-target"
      onClick={() => onAddToCart(product.IDSP)}
    >
      <div className="mb-2 sm:mb-3">
        <div className="relative w-full h-24 sm:h-32 bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={imageError ? defaultImage : (product['Hình ảnh'] || defaultImage)}
            alt={product['Tên sản phẩm']}
            onError={handleImageError}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />

          {/* Quick add button overlay - Enhanced for mobile */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-blue-600 text-white p-2 sm:p-3 rounded-full shadow-lg">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
          </div>

          {/* Mobile tap indicator */}
          <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full opacity-80 sm:hidden">
            +
          </div>
        </div>
      </div>

      <div className="space-y-1 sm:space-y-2">
        <h3 className="font-medium text-gray-900 text-xs sm:text-sm line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] leading-tight">
          {product['Tên sản phẩm']}
        </h3>

        <div className="flex items-center justify-between">
          <p className="text-blue-600 font-semibold text-sm sm:text-base">
            {formatCurrency(parseInt(product['Đơn giá']))}
          </p>

          {product['Loại sản phẩm'] && (
            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full hidden sm:inline">
              {product['Loại sản phẩm']}
            </span>
          )}
        </div>

        {/* Category on mobile - bottom line */}
        {product['Loại sản phẩm'] && (
          <div className="sm:hidden">
            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {product['Loại sản phẩm']}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};