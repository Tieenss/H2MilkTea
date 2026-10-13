'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { CustomerHeader } from '../components/CustomerHeader';
import { CategoryTabs } from '../components/CategoryTabs';
import { ProductCard } from '../components/ProductCard';
import { ProductDetail } from '../components/ProductDetail';
import { CartFloatingBar } from '../components/CartFloatingBar';
import { useCart } from '../context/CartContext';
import type { Product } from '../types/customer-order';
import toast from 'react-hot-toast';

// Import menu data
import menuData from '@/data/DMHH.json';

function MenuPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tableId, totalItems } = useCart();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const tableParam = searchParams.get('table') || tableId;

  // Filter active products only
  const products: Product[] = useMemo(() => {
    return (menuData as Product[]).filter(p => p['Trạng thái'] === 'Hoạt động');
  }, []);

  // Get unique categories and counts
  const { categories, categoryCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      const cat = p['Loại sản phẩm'];
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return {
      categories: Object.keys(counts).sort(),
      categoryCounts: counts,
    };
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = activeCategory === 'Tất cả' || p['Loại sản phẩm'] === activeCategory;
      const matchesSearch = !searchTerm ||
        p['Tên sản phẩm'].toLowerCase().includes(searchTerm.toLowerCase()) ||
        p['Loại sản phẩm'].toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchTerm]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  const handleQuickAdd = (product: Product) => {
    // Quick add with default options
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  const handleViewCart = () => {
    router.push(`/order/cart?table=${encodeURIComponent(tableParam || '')}`);
  };

  return (
    <div className="min-h-screen pb-24">
      <CustomerHeader onCartClick={handleViewCart} />

      {/* Search Bar */}
      <div className="sticky top-[57px] z-45 bg-white/90 backdrop-blur-lg px-4 py-2 border-b border-orange-50">
        <div className={`relative transition-all duration-200 ${isSearchFocused ? 'scale-[1.02]' : ''}`}>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Tìm món bạn muốn..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-100 text-sm
                       focus:outline-none focus:ring-2 focus:ring-orange-300 focus:bg-white
                       transition-all placeholder:text-gray-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        categoryCounts={categoryCounts}
      />

      {/* Products Grid */}
      <div className="px-4 py-4">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.IDSP}
                product={product}
                onSelect={handleSelectProduct}
                onQuickAdd={handleQuickAdd}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-4">🔍</span>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Không tìm thấy món nào</h3>
            <p className="text-sm text-gray-500 mb-4">Thử tìm kiếm với từ khóa khác</p>
            <button
              onClick={() => { setSearchTerm(''); setActiveCategory('Tất cả'); }}
              className="px-4 py-2 rounded-xl bg-gray-100 text-sm font-medium text-gray-700 active:scale-95 transition-transform"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Product Detail Bottom Sheet */}
      <ProductDetail
        product={selectedProduct}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />

      {/* Cart Floating Bar */}
      <CartFloatingBar onViewCart={handleViewCart} />
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-lg px-4">
          <div className="h-12 bg-gray-200 rounded-xl" />
          <div className="h-10 bg-gray-200 rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    }>
      <MenuPageContent />
    </Suspense>
  );
}
