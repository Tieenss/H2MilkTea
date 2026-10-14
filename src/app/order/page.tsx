'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MapPin, ArrowRight, Coffee, Star, Clock, Wifi } from 'lucide-react';
import { useCart } from './context/CartContext';

export default function OrderWelcomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <OrderWelcomeContent />
    </Suspense>
  );
}

function OrderWelcomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setTableInfo, totalItems } = useCart();
  const [tableId, setTableId] = useState<string | null>(null);
  const [tableName, setTableName] = useState<string>('');
  const [isValidTable, setIsValidTable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tableError, setTableError] = useState('');

  useEffect(() => {
    const table = searchParams.get('table');
    if (!table) {
      setIsValidTable(false);
      setIsLoading(false);
      return;
    }

    setTableId(table);

    // Validate table by fetching from API
    fetch(`/api/customer-order/validate-table?table=${encodeURIComponent(table)}`)
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setIsValidTable(true);
          setTableName(data.tableName);
          setTableInfo(table, data.tableName);
        } else {
          setIsValidTable(false);
        }
      })
      .catch(() => {
        setIsValidTable(false);
        setTableError('Không thể xác thực bàn lúc này. Vui lòng thử lại hoặc gọi nhân viên.');
      })
      .finally(() => setIsLoading(false));
  }, [searchParams, setTableInfo]);

  const handleStartOrder = () => {
    router.push(`/order/menu?table=${encodeURIComponent(tableId || '')}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg shadow-red-200/50">
            <span className="text-white font-bold text-2xl">H2</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // Invalid table
  if (!isValidTable) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">😕</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy bàn</h1>
          <p className="text-sm text-gray-500 mb-6">
            {tableError || 'Mã QR không hợp lệ hoặc bàn không tồn tại. Vui lòng quét lại mã QR trên bàn của bạn.'}
          </p>
          <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100">
            <p className="text-xs text-orange-700">
              💡 Nếu vẫn gặp lỗi, hãy gọi nhân viên để được hỗ trợ.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Welcome page
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Decorative background circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-200/30 to-red-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-amber-200/30 to-orange-200/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 text-center max-w-sm">
          {/* Logo */}
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-200/50">
            <span className="text-white font-bold text-4xl">H2</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            H2 MilkTea
          </h1>
          <p className="text-base text-gray-500 mb-6">
            Trà sữa & Cà phê thượng hạng
          </p>

          {/* Table Info Card */}
          <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 shadow-sm mb-8">
            <MapPin className="w-5 h-5 text-orange-600" />
            <span className="text-base font-semibold text-gray-800">
              {tableName}
            </span>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/80 border border-gray-100 shadow-sm">
              <Coffee className="w-5 h-5 text-orange-500" />
              <span className="text-[11px] text-gray-600 font-medium">50+ Món</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/80 border border-gray-100 shadow-sm">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="text-[11px] text-gray-600 font-medium">Phục vụ nhanh</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/80 border border-gray-100 shadow-sm">
              <Wifi className="w-5 h-5 text-orange-500" />
              <span className="text-[11px] text-gray-600 font-medium">Free Wifi</span>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleStartOrder}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-lg
                       shadow-xl shadow-red-200/50 active:scale-[0.98] transition-transform
                       flex items-center justify-center gap-3"
          >
            <span>Xem Menu & Đặt Món</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          {totalItems > 0 && (
            <button
              onClick={() => router.push(`/order/cart?table=${encodeURIComponent(tableId || '')}`)}
              className="mt-3 w-full py-3 rounded-2xl bg-white border-2 border-orange-200 text-orange-600 font-semibold text-sm
                         active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <span>Xem giỏ hàng ({totalItems} món)</span>
            </button>
          )}

          {/* Notice */}
          <p className="mt-6 text-xs text-gray-400">
            Không cần tải ứng dụng · Đặt món ngay trên trình duyệt
          </p>
        </div>
      </div>
    </div>
  );
}
