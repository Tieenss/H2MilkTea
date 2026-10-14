'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock3, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface TrackedOrder {
  id: string;
  table_id: string;
  table_name: string;
  items: Array<{ productName: string; quantity: number; unitPrice: number; size?: string; note?: string }>;
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
}

function CustomerOrderStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token') || '';
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const refreshOrder = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`/api/orders?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Không tìm thấy đơn hàng.');
      setOrder(result.order);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tải trạng thái đơn.');
    }
  }, [token]);

  useEffect(() => {
    refreshOrder();
    const interval = window.setInterval(refreshOrder, 12000);
    let channel: RealtimeChannel | null = null;
    let client: SupabaseClient | null = null;
    try {
      if (token) {
        client = createClient();
        channel = client.channel(`qr-order:${token}`)
          .on('broadcast', { event: 'order-status' }, ({ payload }) => {
            setOrder((current) => current ? { ...current, ...payload } : current);
          })
          .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));
      }
    } catch {
      setIsConnected(false);
    }
    return () => {
      window.clearInterval(interval);
      if (client && channel) void client.removeChannel(channel);
    };
  }, [refreshOrder, token]);

  const state = !order ? null : order.order_status === 'rejected'
    ? { title: 'Quán chưa thể nhận đơn', detail: order.rejection_reason || 'Vui lòng gọi nhân viên để được hỗ trợ.', color: 'text-red-700', step: -1 }
    : order.order_status === 'cancelled'
      ? { title: 'Đơn đã bị hủy', detail: 'Nếu cần trợ giúp, vui lòng gọi nhân viên.', color: 'text-gray-700', step: -1 }
      : order.kitchen_status === 'served'
        ? { title: 'Món đã được phục vụ', detail: 'Chúc bạn ngon miệng!', color: 'text-emerald-700', step: 3 }
        : order.kitchen_status === 'ready'
          ? { title: 'Món đã sẵn sàng', detail: 'Nhân viên sẽ mang món ra bàn ngay.', color: 'text-green-700', step: 2 }
          : order.kitchen_status === 'preparing'
            ? { title: 'Đang pha chế', detail: 'Bếp đang chuẩn bị món cho bạn.', color: 'text-orange-700', step: 1 }
            : order.order_status === 'awaiting_confirmation'
              ? { title: 'Đang chờ nhân viên xác nhận', detail: 'Quán sẽ nhận đơn của bạn trong ít phút.', color: 'text-amber-700', step: 0 }
              : { title: 'Đã nhận đơn', detail: 'Đơn đang chờ bếp bắt đầu thực hiện.', color: 'text-blue-700', step: 0 };

  if (!token) return <main className="mx-auto max-w-md px-5 py-20 text-center"><h1 className="text-xl font-bold">Thiếu mã theo dõi đơn hàng</h1></main>;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8">
      <div className="mb-5 flex items-center justify-between text-xs text-gray-500">
        <span className="inline-flex items-center gap-1">{isConnected ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-amber-600" />}{isConnected ? 'Cập nhật trực tiếp' : 'Đang đồng bộ trạng thái'}</span>
        <button onClick={refreshOrder} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white"><RefreshCw className="h-3.5 w-3.5" /> Làm mới</button>
      </div>

      {error && !order && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {!order && !error && <div className="py-24 text-center text-gray-500">Đang tải trạng thái đơn hàng...</div>}

      {order && state && (
        <>
          <section className="rounded-3xl bg-white p-6 text-center shadow-sm">
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${state.step < 0 ? 'bg-red-100' : 'bg-orange-100'}`}>
              {state.step < 0 ? <Clock3 className="h-8 w-8 text-red-600" /> : <CheckCircle2 className="h-8 w-8 text-orange-600" />}
            </div>
            <p className="text-sm text-gray-500">Đơn #{order.id.slice(-8).toUpperCase()} · {order.table_name}</p>
            <h1 className={`mt-2 text-2xl font-bold ${state.color}`}>{state.title}</h1>
            <p className="mt-2 text-sm text-gray-500">{state.detail}</p>
            {state.step >= 0 && (
              <div className="mt-6 grid grid-cols-4 gap-1 text-[10px] text-gray-500">
                {['Quán xác nhận', 'Đang pha chế', 'Sẵn sàng', 'Đã phục vụ'].map((step, index) => (
                  <div key={step} className={`rounded-lg px-1 py-2 ${state.step >= index ? 'bg-orange-100 font-semibold text-orange-700' : 'bg-gray-50'}`}>{step}</div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-gray-900">Món đã gọi</h2>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={`${item.productName}-${index}`} className="flex justify-between gap-3 text-sm">
                  <span className="text-gray-700">{item.quantity} × {item.productName}{item.size ? ` (${item.size})` : ''}</span>
                  <span className="shrink-0 font-medium">{(item.unitPrice * item.quantity).toLocaleString('vi-VN')}đ</span>
                </div>
              ))}
            </div>
            {order.notes && <p className="mt-3 border-t pt-3 text-xs text-gray-500">Ghi chú: {order.notes}</p>}
            <div className="mt-4 space-y-1 border-t pt-3 text-sm text-gray-600">
              <div className="flex justify-between"><span>Tạm tính</span><span>{Number(order.subtotal).toLocaleString('vi-VN')}đ</span></div>
              <div className="flex justify-between"><span>VAT</span><span>{Number(order.vat_amount).toLocaleString('vi-VN')}đ</span></div>
              <div className="flex justify-between pt-1 text-base font-bold text-gray-900"><span>Tổng cộng</span><span className="text-orange-700">{Number(order.total_amount).toLocaleString('vi-VN')}đ</span></div>
            </div>
            <p className="mt-2 text-xs text-gray-500">Thanh toán tại quầy · {order.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</p>
          </section>

          <button onClick={() => router.push(`/order/menu?table=${encodeURIComponent(order.table_id)}`)} className="mt-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 py-3.5 font-bold text-white shadow-lg shadow-orange-100">
            Đặt thêm món
          </button>
        </>
      )}
    </main>
  );
}

export default function CustomerOrderStatusPage() {
  return <Suspense fallback={<div className="p-12 text-center text-gray-500">Đang tải...</div>}><CustomerOrderStatusContent /></Suspense>;
}
