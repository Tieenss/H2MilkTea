'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2, Clock3, RefreshCw, Wifi, WifiOff,
  AlertCircle, ArrowLeft, Plus, Bell, X, Check,
  UtensilsCrossed, ReceiptText, Sparkles, Coffee, AlertTriangle
} from 'lucide-react';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { CustomerChatbot } from '../components/CustomerChatbot';

interface TrackedItem {
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  size?: string;
  note?: string;
  ice?: string;
  sugar?: string;
  toppings?: Array<{ name: string; price: number }>;
}

interface TrackedOrder {
  id: string;
  table_id: string;
  table_name: string;
  items: TrackedItem[];
  total_amount: number;
  subtotal: number;
  vat_amount: number;
  notes: string;
  order_status: string;
  kitchen_status: string;
  payment_status: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string | null;
}

const SERVICE_REQUEST_OPTIONS = [
  { id: 'ice', label: 'Xin thêm đá lạnh', icon: '🧊' },
  { id: 'water', label: 'Xin thêm nước lọc', icon: '🥛' },
  { id: 'tissue', label: 'Khăn giấy & Ống hút', icon: '🥢' },
  { id: 'bill', label: 'Yêu cầu tính tiền tại bàn', icon: '💳' },
  { id: 'other', label: 'Cần nhân viên hỗ trợ trực tiếp', icon: '🙋' },
];

function CustomerOrderStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [token, setToken] = useState<string>(() => {
    return searchParams?.get('token') || '';
  });

  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Khách muốn chọn lại món');
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceFeedback, setServiceFeedback] = useState<string | null>(null);

  // Khôi phục token từ localStorage nếu truy cập không có query param
  useEffect(() => {
    if (!token && typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('h2_active_order_token');
      if (savedToken) {
        setToken(savedToken);
      }
    }
  }, [token]);

  const refreshOrder = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/orders?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Không tìm thấy thông tin đơn hàng.');
      }
      setOrder(result.order);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tải trạng thái đơn.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Lắng nghe Realtime từ Supabase khi thu ngân POS bấm duyệt hoặc cập nhật đơn
  useEffect(() => {
    if (!token) return;
    refreshOrder();
    const interval = window.setInterval(refreshOrder, 8000);

    let channel: RealtimeChannel | null = null;
    let client: SupabaseClient | null = null;
    try {
      client = createClient();
      channel = client.channel(`qr-order:${token}`)
        .on('broadcast', { event: 'order-status' }, ({ payload }) => {
          setOrder((current) => {
            if (!current) return current;
            const updated = { ...current, ...payload };
            if (current.order_status === 'awaiting_confirmation' && payload.order_status === 'accepted') {
              toast.success('🎉 Quầy POS đã nhận đơn! Đang chuyển xuống quầy pha chế.', { duration: 4000 });
            }
            if (payload.order_status === 'cancellation_pending') {
              toast('⏳ Yêu cầu hủy đơn đã gửi tới thu ngân.', { icon: '⚠️' });
            }
            if (payload.order_status === 'cancelled') {
              toast.success('Đơn hàng đã được quầy xác nhận hủy thành công.');
            }
            return updated;
          });
        })
        .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));
    } catch {
      setIsConnected(false);
    }

    return () => {
      window.clearInterval(interval);
      if (client && channel) void client.removeChannel(channel);
    };
  }, [refreshOrder, token]);

  // Hủy đơn hàng hoặc gửi yêu cầu hủy đơn
  const handleCancelOrder = async () => {
    if (!token) return;
    setIsCancelling(true);
    try {
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingToken: token,
          reason: cancelReason,
          requestCancellation: !isAwaiting,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể hủy đơn hàng.');
      }
      if (data.cancellationPending) {
        toast.success('Đã gửi yêu cầu hủy đơn đến quầy thu ngân!');
        setOrder((prev) => prev ? { ...prev, order_status: 'cancellation_pending' } : null);
      } else {
        toast.success('Đã hủy đơn hàng thành công.');
        setOrder((prev) => prev ? { ...prev, order_status: 'cancelled_by_customer' } : null);
      }
      setShowCancelModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi hủy đơn.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Khách gửi yêu cầu hỗ trợ bàn
  const handleRequestService = async (optionLabel: string) => {
    setServiceFeedback(`Đã gửi yêu cầu "${optionLabel}". Nhân viên sẽ tới bàn ngay!`);
    setShowServiceModal(false);
    toast.success(`Đã thông báo: ${optionLabel}`, { icon: '🔔' });
    setTimeout(() => setServiceFeedback(null), 8000);

    // Gửi yêu cầu thực tế lên quầy POS qua API & Supabase Realtime
    try {
      await fetch('/api/customer-order/service-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: order?.table_id || 'Bàn',
          tableName: order?.table_name || 'Bàn',
          requestType: optionLabel,
        }),
      });
    } catch (err) {
      console.warn('Lỗi gửi gọi phục vụ:', err);
    }
  };

  if (!token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-100 text-3xl">
          🍹
        </div>
        <h1 className="text-xl font-bold text-gray-900">Chưa có đơn hàng nào</h1>
        <p className="mt-2 text-sm text-gray-500">
          Hãy quét mã QR tại bàn để xem menu và đặt đồ uống thơm ngon nhé!
        </p>
        <button
          onClick={() => router.push('/order/menu')}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-6 py-3 font-bold text-white shadow-lg shadow-orange-200 active:scale-95 transition-transform"
        >
          <UtensilsCrossed className="h-4 w-4" /> Xem Menu Quán
        </button>
      </main>
    );
  }

  // Xác định trạng thái tiến trình
  const isAwaiting = order?.order_status === 'awaiting_confirmation';
  const isCancellationPending = Boolean(
    order?.order_status === 'cancellation_pending' || 
    order?.rejection_reason?.includes('YÊU CẦU HỦY ĐƠN')
  );
  const isAcceptedOrServing = order && ['accepted', 'preparing', 'ready', 'served', 'completed', 'cancellation_pending'].includes(order.order_status);
  const isRejected = order?.order_status === 'rejected';
  const isCancelled = order && ['cancelled', 'cancelled_by_customer'].includes(order.order_status);
  const isExpired = order?.order_status === 'expired';

  // Tiến trình pha chế 4 bước
  const currentStep = !order ? 0
    : order.kitchen_status === 'served' || order.order_status === 'completed' ? 3
    : order.kitchen_status === 'ready' ? 2
    : order.kitchen_status === 'preparing' ? 1
    : isAcceptedOrServing ? 0
    : 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col bg-gray-50/50 pb-28 text-gray-900">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-orange-100 bg-white/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.push(order?.table_id ? `/order/menu?table=${encodeURIComponent(order.table_id)}` : '/order/menu')}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600 active:scale-90 transition-transform"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-gray-900">
              {order ? `Giỏ Hàng & Hóa Đơn ${order.table_name}` : 'Quản Lý Đơn Hàng'}
            </h1>
            <p className="text-[11px] text-gray-500">
              {order ? `#${order.id.slice(-8).toUpperCase()}` : 'H2 MilkTea'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            isConnected ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {isConnected ? <Wifi className="h-3 w-3 text-green-600 animate-pulse" /> : <WifiOff className="h-3 w-3" />}
            {isConnected ? 'Realtime' : 'Đồng bộ'}
          </span>
          <button
            onClick={refreshOrder}
            aria-label="Làm mới trạng thái"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 active:scale-90"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Thông báo phản hồi phục vụ nếu có */}
      {serviceFeedback && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-xs font-semibold text-white shadow-md animate-in fade-in slide-in-from-top duration-200">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>{serviceFeedback}</span>
        </div>
      )}

      {/* Lỗi tải */}
      {error && !order && (
        <div role="alert" className="mx-4 mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
          <AlertCircle className="mx-auto mb-2 h-6 w-6 text-red-500" />
          <p className="font-semibold">{error}</p>
          <button
            onClick={refreshOrder}
            className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Skeleton Loading */}
      {isLoading && !order && !error && (
        <div className="space-y-4 px-4 py-8">
          <div className="h-40 animate-pulse rounded-3xl bg-gray-200" />
          <div className="h-60 animate-pulse rounded-3xl bg-gray-200" />
        </div>
      )}

      {order && (
        <div className="flex-1 px-4 pt-4 space-y-4">
          {/* TRƯỜNG HỢP 1: ĐANG CHỜ QUẦY POS XÁC NHẬN (Awaiting Confirmation) */}
          {isAwaiting && (
            <section className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 text-center shadow-sm">
              <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-30" />
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-300">
                  <Clock3 className="h-8 w-8 animate-spin" style={{ animationDuration: '6s' }} />
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Đang chuyển đơn đến thu ngân
              </div>

              <h2 className="mt-3 text-xl font-extrabold text-gray-900">
                Đang chờ quầy POS tiếp nhận...
              </h2>
              <p className="mt-1.5 text-xs text-gray-600 max-w-xs mx-auto">
                Đơn của bạn đã được gửi tới hệ thống. Sau khi thu ngân nhấn xác nhận, màn hình sẽ tự động chuyển sang quản lý giỏ hàng bàn này!
              </p>

              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 active:scale-95"
                >
                  Hủy đơn này
                </button>
                <button
                  onClick={() => router.push(`/order/menu?table=${encodeURIComponent(order.table_id)}`)}
                  className="rounded-xl bg-orange-100 px-4 py-2 text-xs font-bold text-orange-800 hover:bg-orange-200 active:scale-95"
                >
                  Xem thêm menu
                </button>
              </div>
            </section>
          )}

          {/* TRƯỜNG HỢP 2: THU NGÂN ĐÃ DUYỆT -> MÀN HÌNH QUẢN LÝ GIỎ HÀNG BÀN (Item #13) */}
          {isAcceptedOrServing && (
            <>
              {/* Table Live Session Banner */}
              <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700 p-5 text-white shadow-lg shadow-emerald-700/20">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                      <span className="h-2 w-2 rounded-full bg-emerald-300 animate-ping" />
                      Đang phục vụ tại bàn
                    </div>
                    <h2 className="mt-2 text-2xl font-black tracking-tight">{order.table_name}</h2>
                    <p className="mt-1 text-xs text-emerald-100">
                      Đơn #{order.id.slice(-8).toUpperCase()} · Nhận lúc {new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/15 p-3 text-center backdrop-blur-sm">
                    <Coffee className="h-6 w-6 mx-auto text-emerald-200" />
                    <span className="mt-1 block text-[10px] font-bold text-emerald-100">
                      {order.kitchen_status === 'served' ? 'Đã ra bàn' : order.kitchen_status === 'ready' ? 'Sẵn sàng' : 'Đang làm'}
                    </span>
                  </div>
                </div>

                {/* 4-Step Barista Stepper */}
                <div className="mt-5 rounded-2xl bg-black/15 p-3 backdrop-blur-sm">
                  <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                    {[
                      { label: 'Đã nhận đơn', stepIdx: 0 },
                      { label: 'Đang pha chế', stepIdx: 1 },
                      { label: 'Món sẵn sàng', stepIdx: 2 },
                      { label: 'Đã phục vụ', stepIdx: 3 },
                    ].map((step) => {
                      const isActive = currentStep >= step.stepIdx;
                      const isCurrent = currentStep === step.stepIdx;
                      return (
                        <div
                          key={step.label}
                          className={`flex flex-col items-center gap-1 rounded-xl py-1.5 px-1 transition-all ${
                            isCurrent
                              ? 'bg-white text-emerald-900 font-extrabold shadow-sm'
                              : isActive
                              ? 'bg-white/30 text-white font-medium'
                              : 'text-emerald-200/60'
                          }`}
                        >
                          <span className="text-xs">
                            {isActive ? (isCurrent ? '⚡' : '✓') : '○'}
                          </span>
                          <span className="leading-tight">{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Danh sách món đang phục vụ tại bàn (Table Cart Items) */}
              <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ReceiptText className="h-4 w-4 text-orange-600" />
                    <h3 className="font-extrabold text-gray-900">
                      Món của bàn ({order.items?.length || 0})
                    </h3>
                  </div>
                  <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                    Đồng bộ máy POS
                  </span>
                </div>

                <div className="space-y-3 divide-y divide-gray-50">
                  {order.items.map((item, index) => {
                    const isSizeL = item.size === 'L';
                    return (
                      <div key={`${item.productName}-${index}`} className="pt-3 first:pt-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-orange-100 text-xs font-bold text-orange-700">
                                {item.quantity}
                              </span>
                              <span className="font-bold text-gray-900 text-sm">
                                {item.productName}
                              </span>
                              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                isSizeL ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                Size {item.size || 'M'}
                              </span>
                            </div>

                            {/* Toppings / Notes / Sugar / Ice */}
                            <div className="mt-1 pl-7 text-[11px] text-gray-500 space-y-0.5">
                              {item.ice && <span>· Đá: {item.ice} </span>}
                              {item.sugar && <span>· Đường: {item.sugar} </span>}
                              {item.toppings && item.toppings.length > 0 && (
                                <p className="text-orange-700">
                                  + {item.toppings.map(t => t.name).join(', ')}
                                </p>
                              )}
                              {item.note && <p className="italic text-gray-400">"{item.note}"</p>}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-extrabold text-gray-900">
                              {(item.unitPrice * item.quantity).toLocaleString('vi-VN')}đ
                            </span>
                            <span className="block text-[10px] text-gray-400">
                              {item.unitPrice.toLocaleString('vi-VN')}đ/ly
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {order.notes && (
                  <div className="mt-4 rounded-xl bg-amber-50/70 p-3 text-xs text-amber-900 border border-amber-100">
                    <span className="font-bold">Ghi chú gửi quán:</span> {order.notes}
                  </div>
                )}

                {/* Bảng Hóa Đơn Tạm Tính Bàn */}
                <div className="mt-5 space-y-2 border-t border-dashed border-gray-200 pt-4 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Tạm tính tiền món</span>
                    <span className="font-medium text-gray-800">{Number(order.subtotal || 0).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thuế GTGT (VAT 10%)</span>
                    <span className="font-medium text-gray-800">{Number(order.vat_amount || 0).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-gray-100 pt-3">
                    <div>
                      <span className="text-sm font-bold text-gray-900">Tổng hóa đơn bàn</span>
                      <p className="text-[10px] text-gray-400">
                        {order.payment_status === 'paid' ? 'Đã thanh toán tại quầy' : 'Thanh toán tại quầy khi rời quán'}
                      </p>
                    </div>
                    <span className="text-xl font-black text-orange-600">
                      {Number(order.total_amount || 0).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>
              </section>

              {/* Nút hành động nhanh tại bàn: Gọi thêm món & Gọi phục vụ */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.push(order.table_id ? `/order/menu?table=${encodeURIComponent(order.table_id)}` : '/order/menu')}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 p-3.5 font-bold text-white shadow-lg shadow-orange-500/20 active:scale-95 transition-transform"
                >
                  <Plus className="h-4 w-4" />
                  <span>Gọi thêm món</span>
                </button>

                <button
                  onClick={() => setShowServiceModal(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-white p-3.5 font-bold text-orange-800 shadow-sm hover:bg-orange-50 active:scale-95 transition-transform"
                >
                  <Bell className="h-4 w-4 text-orange-600" />
                  <span>Gọi phục vụ</span>
                </button>
              </div>

              {/* Thông báo hoặc nút Hủy đơn cho khách */}
              {isCancellationPending ? (
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-3.5 text-center text-xs font-bold text-amber-900 shadow-sm animate-pulse">
                  ⏳ Bạn đã gửi yêu cầu hủy đơn này. Quầy thu ngân đang xác nhận...
                </div>
              ) : (!isCancelled && !isRejected && order.kitchen_status !== 'ready' && order.kitchen_status !== 'served' && order.order_status !== 'completed') ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-2xl border-2 border-red-200 bg-red-50/70 text-red-600 hover:bg-red-100 font-bold text-xs transition-colors shadow-xs"
                  >
                    <X className="w-4 h-4" />
                    Đổi ý? Gửi yêu cầu hủy đơn tới quầy
                  </button>
                </div>
              ) : null}
            </>
          )}

          {/* TRƯỜNG HỢP 3: BỊ TỪ CHỐI / HỦY / HẾT HẠN */}
          {(isRejected || isCancelled || isExpired) && (
            <section className="rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900">
                {isRejected ? 'Quán chưa thể nhận đơn' : isExpired ? 'Đơn hàng đã hết hạn' : 'Đơn hàng đã bị hủy'}
              </h2>
              <p className="mt-2 text-xs text-gray-500 max-w-xs mx-auto">
                {isRejected
                  ? order.rejection_reason || 'Rất tiếc quán đang quá tải hoặc hết nguyên liệu món bạn chọn. Vui lòng liên hệ quầy thu ngân.'
                  : isExpired
                  ? 'Đơn chưa được tiếp nhận trong thời gian quy định. Vui lòng đặt lại đơn mới.'
                  : 'Đơn hàng này đã được hủy thành công.'}
              </p>

              <button
                onClick={() => router.push(order.table_id ? `/order/menu?table=${encodeURIComponent(order.table_id)}` : '/order/menu')}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-6 py-3 font-bold text-white shadow-lg shadow-orange-200 active:scale-95"
              >
                <UtensilsCrossed className="h-4 w-4" /> Đặt Lại Đơn Mới
              </button>
            </section>
          )}
        </div>
      )}

      {/* Modal xác nhận Hủy đơn */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">
              {isAwaiting ? 'Xác nhận hủy đơn hàng?' : 'Gửi yêu cầu hủy đơn tới quầy?'}
            </h3>
            <p className="mt-2 text-xs text-gray-500">
              {isAwaiting 
                ? 'Đơn hàng chưa được quầy tiếp nhận. Bạn có thể hủy ngay lập tức.' 
                : 'Đơn đã được tiếp nhận. Yêu cầu của bạn sẽ gửi tới quầy thu ngân để xác nhận hủy.'}
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Lý do bạn muốn hủy:
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs rounded-xl border border-gray-300 p-2.5 focus:border-red-500 focus:outline-none"
              >
                <option value="Đổi ý / Đặt nhầm món">Đổi ý / Đặt nhầm món</option>
                <option value="Thời gian chờ đợi lâu">Thời gian chờ đợi lâu</option>
                <option value="Muốn gọi món khác">Muốn gọi món khác</option>
                <option value="Khách có việc bận gấp">Có việc bận phải rời đi</option>
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="rounded-xl px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Giữ đơn
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700"
              >
                {isCancelling ? 'Đang gửi...' : isAwaiting ? 'Đồng ý hủy' : 'Gửi yêu cầu hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gọi Nhân Viên Phục Vụ Bàn */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-600" />
                <h3 className="font-extrabold text-gray-900">Hỗ trợ tại {order?.table_name}</h3>
              </div>
              <button
                onClick={() => setShowServiceModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Chọn nhu cầu bạn cần, nhân viên phục vụ sẽ có mặt hỗ trợ bàn ngay:
            </p>

            <div className="mt-4 space-y-2">
              {SERVICE_REQUEST_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleRequestService(opt.label)}
                  className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 text-left text-sm font-semibold text-gray-800 hover:border-orange-300 hover:bg-orange-50/50 active:scale-[0.98] transition-all"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-lg">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </span>
                  <Check className="h-4 w-4 text-orange-600 opacity-60" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tích hợp Trợ lý Barista AI ngay trên trang quản lý bàn */}
      <CustomerChatbot
        tableName={order?.table_name}
        tableId={order?.table_id}
      />
    </main>
  );
}

export default function CustomerOrderStatusPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-500">Đang tải trạng thái đơn...</div>}>
      <CustomerOrderStatusContent />
    </Suspense>
  );
}