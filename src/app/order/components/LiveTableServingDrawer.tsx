'use client';

import React, { useEffect, useState } from 'react';
import { Coffee, ShoppingBag, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface LiveDraftItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  unit?: string;
  note?: string;
  image?: string;
}

interface LiveTableServingDrawerProps {
  tableId: string;
  tableName?: string;
  isOpen: boolean;
  onClose: () => void;
  onOrderMore: () => void;
}

export function LiveTableServingDrawer({
  tableId,
  tableName,
  isOpen,
  onClose,
  onOrderMore,
}: LiveTableServingDrawerProps) {
  const [items, setItems] = useState<LiveDraftItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  const fetchServingItems = async () => {
    if (!tableId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/customer-order/table-cart?tableId=${encodeURIComponent(tableId)}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success && data.liveCart) {
        setItems(data.liveCart.items || []);
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
      }
    } catch (err) {
      console.warn('Lỗi tải giỏ hàng bàn:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!tableId) return;
    fetchServingItems();

    // Lắng nghe Realtime thay đổi trực tiếp từ máy POS
    const supabase = createClient();
    const channel = supabase
      .channel(`customer-table-sync:${tableId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pos_cart_drafts', filter: `table_id=eq.${tableId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setItems([]);
          } else if (payload.new && (payload.new as any).cart) {
            setItems((payload.new as any).cart || []);
          }
          setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tableId]);

  if (!isOpen) return null;

  const totalAmount = items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
  const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                Giỏ Hàng {tableName || tableId}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/30 text-emerald-100 font-bold border border-emerald-300/30">
                  Live POS
                </span>
              </h3>
              <p className="text-[11px] text-emerald-100">
                {lastSyncTime ? `Đồng bộ lúc ${lastSyncTime}` : 'Đang đồng bộ với quầy thu ngân'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchServingItems}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">
                🍵
              </div>
              <p className="font-bold text-gray-800 text-sm">Bàn hiện chưa có món nào</p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                Khi thu ngân chọn món cho bàn này hoặc bạn gửi đơn mới, danh sách món sẽ tự động hiển thị tại đây theo thời gian thực!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-gray-500 flex justify-between items-center px-1">
                <span>Danh sách món đang phục vụ ({totalQuantity} ly/phần)</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đang cập nhật từ quầy
                </span>
              </div>

              {items.map((item, idx) => (
                <div
                  key={`${item.id || item.name}-${idx}`}
                  className="p-3 rounded-2xl border border-gray-100 bg-gray-50/80 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-sm shrink-0">
                      {item.quantity}x
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-xs sm:text-sm">{item.name}</p>
                      {item.note && (
                        <p className="text-[11px] text-gray-500 mt-0.5">{item.note}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-extrabold text-orange-600 text-xs sm:text-sm">
                      {(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString('vi-VN')}đ
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {Number(item.price || 0).toLocaleString('vi-VN')}đ/{item.unit || 'ly'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-xs font-semibold text-gray-600">Tổng tạm tính tại bàn:</span>
              <span className="text-lg font-black text-orange-600">
                {totalAmount.toLocaleString('vi-VN')}đ
              </span>
            </div>

            <button
              onClick={() => {
                onClose();
                onOrderMore();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-orange-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              Chọn Thêm Món Mới Cho Bàn
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
