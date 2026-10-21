'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, LayoutGrid, List, Sparkles } from 'lucide-react';
import { CustomerHeader } from '../components/CustomerHeader';
import { CategoryTabs } from '../components/CategoryTabs';
import { ProductCard } from '../components/ProductCard';
import { ProductDetail } from '../components/ProductDetail';
import { CartFloatingBar } from '../components/CartFloatingBar';
import { CustomerChatbot } from '../components/CustomerChatbot';
import { DrinkGachaCSGO } from '../components/DrinkGachaCSGO';
import { useCart } from '../context/CartContext';
import { useTablePresence } from '@/hooks/useTablePresence';
import type { Product } from '../types/customer-order';

// Import fallback menu data
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(() =>
    (menuData as Product[]).filter(p => p['Trạng thái'] === 'Hoạt động')
  );
  const [activeTableToken, setActiveTableToken] = useState<string | null>(null);
  const [isGachaOpen, setIsGachaOpen] = useState(false);

  const tableParam = searchParams.get('table') || tableId;

  // Realtime Presence: Báo cho máy POS biết có khách đang xem menu và chọn món tại bàn này (Mục #7)
    useTablePresence({
    role: 'customer_qr',
    tableId: tableParam || null,
    itemCount: totalItems,
  });

  // Kiểm tra nếu bàn đang có đơn phục vụ trước đó để hiện thanh truy cập giỏ hàng bàn (Mục #13)
  useEffect(() => {
    try {
      const savedToken = (tableParam ? localStorage.getItem(`h2_table_order_token_${tableParam}`) : null) || localStorage.getItem('h2_active_order_token');
      if (savedToken) setActiveTableToken(savedToken);
    } catch {
      // Bỏ qua
    }
  }, [tableParam]);

  // Khôi phục tùy chọn chế độ xem Grid / List từ localStorage (Mục #13)
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('h2_menu_view_mode');
      if (savedMode === 'grid' || savedMode === 'list') {
        setViewMode(savedMode);
      }
    } catch {
      // Bỏ qua lỗi truy cập storage
    }
  }, []);

  const handleToggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('h2_menu_view_mode', mode);
    } catch {
      // Bỏ qua
    }
  };

  // Đồng bộ danh mục sản phẩm trực tiếp từ Supabase qua API để luôn khớp giá với máy POS
  useEffect(() => {
    let active = true;
    fetch('/api/orders?catalog=1')
      .then(res => res.json())
      .then(result => {
        if (active && result?.success && Array.isArray(result.products) && result.products.length > 0) {
          setCatalogProducts(
            (result.products as Product[]).filter(p => !p['Trạng thái'] || p['Trạng thái'] === 'Hoạt động')
          );
        }
      })
      .catch(() => {
        // Giữ nguyên dữ liệu fallback từ DMHH.json nếu mất mạng
      });
    return () => {
      active = false;
    };
  }, []);

  const products = catalogProducts;

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
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  const handleViewCart = () => {
    router.push(`/order/cart?table=${encodeURIComponent(tableParam || '')}`);
  };

  return (
    <div className="min-h-screen pb-28">
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

      {/* Banner Gacha CS:GO Mở Hòm Đồ Uống (Mục #1) */}
      <div className="px-4 pt-3">
        <button
          type="button"
          onClick={() => setIsGachaOpen(true)}
          className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 via-indigo-950 to-purple-950 border border-yellow-500/40 p-3 text-left shadow-lg shadow-purple-900/10 flex items-center justify-between group active:scale-98 transition-transform"
        >
          <div className="flex items-center gap-3 z-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-black flex items-center justify-center font-black shadow-md shadow-yellow-500/30 shrink-0 group-hover:rotate-12 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-yellow-300">
                  CS:GO Drink Gacha
                </span>
                <span className="px-1.5 py-0.2 bg-red-600 text-white text-[9px] font-extrabold rounded-full uppercase">
                  Hot
                </span>
              </div>
              <p className="text-[11px] text-gray-300 mt-0.5">
                Không biết hôm nay uống gì? Thử vận may mở hòm nhận món ngay!
              </p>
            </div>
          </div>
          <div className="z-10 px-3 py-1.5 rounded-xl bg-yellow-400 text-black text-xs font-extrabold shrink-0 group-hover:bg-yellow-300 transition-colors shadow-sm">
            Quay ngay 🎰
          </div>
        </button>
      </div>

      {/* View Mode & Results Count Bar (Mục #13) */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between text-xs text-gray-500">
        <span>Hiển thị <strong className="text-gray-800">{filteredProducts.length}</strong> món</span>
        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
          <button
            onClick={() => handleToggleViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'grid' ? 'bg-white text-orange-600 shadow-xs font-bold' : 'text-gray-500 hover:text-gray-700'
            }`}
            title="Xem dạng lưới 2 cột"
            aria-label="Xem dạng lưới 2 cột"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggleViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'list' ? 'bg-white text-orange-600 shadow-xs font-bold' : 'text-gray-500 hover:text-gray-700'
            }`}
            title="Xem dạng danh sách ngang dễ nhìn"
            aria-label="Xem dạng danh sách ngang dễ nhìn"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Products Display (Grid vs List) */}
      <div className="px-4 py-2">
        {filteredProducts.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.IDSP}
                  product={product}
                  viewMode="grid"
                  onSelect={handleSelectProduct}
                  onQuickAdd={handleQuickAdd}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.IDSP}
                  product={product}
                  viewMode="list"
                  onSelect={handleSelectProduct}
                  onQuickAdd={handleQuickAdd}
                />
              ))}
            </div>
          )
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

      {/* Trợ lý AI tư vấn gọi món cho khách (Mục #13) */}
      <CustomerChatbot
        onSelectProduct={handleSelectProduct}
        catalogProducts={catalogProducts}
      />

            {/* Modal CS:GO Gacha Quay Thưởng (Mục #1) */}
      <DrinkGachaCSGO
        isOpen={isGachaOpen}
        onClose={() => setIsGachaOpen(false)}
        products={catalogProducts}
      />

      {/* Product Detail Bottom Sheet */}
      <ProductDetail
        product={selectedProduct}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />

      {/* Thanh nổi truy cập giỏ hàng & hóa đơn của bàn (Mục #13) */}
      {activeTableToken && (
        <div className="fixed bottom-20 left-4 right-4 z-40 max-w-lg mx-auto pointer-events-auto">
          <button
            onClick={() => router.push(`/order/status?token=${encodeURIComponent(activeTableToken)}`)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-700/25 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-300 animate-ping" />
              <span className="text-xs font-bold tracking-wide">Bàn đang có đơn phục vụ</span>
            </div>
            <span className="text-xs font-semibold underline underline-offset-2 flex items-center gap-1">
              Quản lý giỏ hàng bàn →
            </span>
          </button>
        </div>
      )}

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
