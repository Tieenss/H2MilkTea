'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MapPin, ArrowRight, Coffee, Clock, Wifi, Sparkles, AlertCircle } from 'lucide-react';
import { useCart } from './context/CartContext';
import { StoreFAQModal } from './components/StoreFAQModal';

export default function OrderWelcomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Đang tải...</div>}>
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
  const [activeOrderToken, setActiveOrderToken] = useState<string | null>(null);
  const [activeOrderItemCount, setActiveOrderItemCount] = useState<number>(0);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [faqCategory, setFaqCategory] = useState('Tất cả');

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

          // Kiểm tra xem bàn hiện tại có đơn đang pha chế / phục vụ hay không
          fetch(`/api/customer-order/table-cart?tableId=${encodeURIComponent(table)}`, { cache: 'no-store' })
            .then(cartRes => cartRes.json())
            .then(cartData => {
              if (cartData.success && cartData.activeOrder?.tracking_token) {
                setActiveOrderToken(cartData.activeOrder.tracking_token);
                setActiveOrderItemCount(cartData.activeOrder.items?.length || 1);
                try {
                  localStorage.setItem(`h2_table_order_token_${table}`, cartData.activeOrder.tracking_token);
                } catch {}
              } else {
                // Fallback kiểm tra localStorage
                try {
                  const saved = localStorage.getItem(`h2_table_order_token_${table}`);
                  if (saved) {
                    setActiveOrderToken(saved);
                    setActiveOrderItemCount(1);
                  }
                } catch {}
              }
            })
            .catch(() => {});
        } else {
          setIsValidTable(false);
          setTableError(data.error || 'Bàn không tồn tại');
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-600 flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg shadow-orange-600/20">
            <span className="text-white font-black text-2xl">H2</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // Invalid or Maintenance table
  if (!isValidTable) {
    const isMaintenance = tableError.toLowerCase().includes('không hoạt động') || tableError.toLowerCase().includes('bảo trì');

    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-slate-50">
        <div className="text-center max-w-sm">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 ${
            isMaintenance ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
          }`}>
            <AlertCircle className="w-10 h-10" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            {isMaintenance ? 'Bàn tạm ngừng phục vụ' : 'Không tìm thấy bàn'}
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            {tableError || 'Mã QR không hợp lệ hoặc bàn không tồn tại. Vui lòng quét lại mã QR trên bàn của bạn.'}
          </p>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-600 font-medium">
              💡 {isMaintenance ? 'Vui lòng chọn một bàn trống khác trong quán hoặc gọi nhân viên để được xếp bàn.' : 'Nếu vẫn gặp lỗi, hãy gọi nhân viên quầy thu ngân để được hỗ trợ.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Welcome page
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="relative z-10 text-center max-w-sm w-full">
          {/* Logo */}
          <div className="w-20 h-20 rounded-3xl bg-orange-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-600/25">
            <span className="text-white font-black text-3xl">H2</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
            H2 MilkTea
          </h1>
          <p className="text-sm text-slate-600 mb-6 font-medium">
            Trà sữa & Cà phê tươi mỗi ngày
          </p>

          {/* Table Info Card */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-xs mb-6">
            <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="text-base font-bold text-slate-900">
              {tableName}
            </span>
          </div>

          {/* Nút theo dõi đơn bàn đang hoạt động nếu khách quét lại QR */}
          {activeOrderToken && (
            <button
              onClick={() => router.push(`/order/status?token=${encodeURIComponent(activeOrderToken)}`)}
              className="w-full mb-6 p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-700/20 active:scale-[0.98] transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5 text-left">
                <span className="flex h-3 w-3 rounded-full bg-emerald-300 animate-ping shrink-0" />
                <div>
                  <div className="text-xs uppercase tracking-wider text-emerald-100 font-extrabold">Đang phục vụ tại bàn</div>
                  <div className="text-sm font-black">Bàn đang có đơn ({activeOrderItemCount} món)</div>
                </div>
              </div>
              <span className="text-xs underline font-bold bg-white/20 px-2.5 py-1 rounded-lg shrink-0">
                Xem tiến độ →
              </span>
            </button>
          )}

          {/* Features */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <Coffee className="w-5 h-5 text-orange-600" />
              <span className="text-xs text-slate-700 font-semibold">50+ Món</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <Clock className="w-5 h-5 text-orange-600" />
              <span className="text-xs text-slate-700 font-semibold">Làm nhanh</span>
            </div>
            <button
              onClick={() => {
                setFaqCategory('Tiện ích');
                setShowFaqModal(true);
              }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white hover:bg-orange-50/60 border border-slate-200 hover:border-orange-300 shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <Wifi className="w-5 h-5 text-orange-600" />
              <span className="text-xs text-orange-600 font-bold underline">Pass Wifi</span>
            </button>
          </div>

          {/* Quick FAQ & Utilities Banner */}
          <button
            onClick={() => {
              setFaqCategory('Tất cả');
              setShowFaqModal(true);
            }}
            className="w-full mb-6 py-2.5 px-4 rounded-2xl bg-orange-50 hover:bg-orange-100/70 border border-orange-200 text-orange-950 text-xs font-semibold flex items-center justify-between transition-all shadow-2xs active:scale-[0.98]"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
              <span>Tiện ích: Wifi, Giờ mở cửa, Bãi xe, Menu...</span>
            </span>
            <span className="text-[11px] text-orange-600 font-bold underline">Xem</span>
          </button>

          {/* CTA Button */}
          <button
            onClick={handleStartOrder}
            className="w-full py-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-base
                       shadow-lg shadow-orange-600/25 active:scale-[0.98] transition-transform
                       flex items-center justify-center gap-2"
          >
            <span>Xem Menu & Đặt Món</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          {totalItems > 0 && (
            <button
              onClick={() => router.push(`/order/cart?table=${encodeURIComponent(tableId || '')}`)}
              className="mt-3 w-full py-3.5 rounded-2xl bg-white border border-orange-300 text-orange-700 font-bold text-sm
                         active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Xem giỏ hàng ({totalItems} món)</span>
            </button>
          )}

          {/* Notice */}
          <p className="mt-6 text-xs text-slate-500 font-medium">
            Không cần cài ứng dụng · Đặt món & gọi phục vụ tại bàn
          </p>

          {/* Modal Tiện ích quán */}
          <StoreFAQModal
            isOpen={showFaqModal}
            onClose={() => setShowFaqModal(false)}
            initialCategory={faqCategory}
          />
        </div>
      </div>
    </div>
  );
}
