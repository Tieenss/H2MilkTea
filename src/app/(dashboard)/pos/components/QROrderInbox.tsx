'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BellRing, Check, Clock3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

interface IncomingOrder {
  id: string;
  table_id: string;
  table_name: string;
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number; note?: string; size?: string; sugar?: string; ice?: string; unit?: string }>;
  total_amount: number;
  notes?: string;
  created_at: string;
  order_status: 'awaiting_confirmation' | 'accepted';
  kitchen_status: string;
}

function playAlert() {
  try {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.35);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.35);
  } catch { /* Audio is optional; the visible inbox remains authoritative. */ }
}

export function QROrderInbox({ onSettle }: { onSettle: (order: IncomingOrder) => void }) {
  const [orders, setOrders] = useState<IncomingOrder[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [processingId, setProcessingId] = useState('');
  const [error, setError] = useState('');
  const knownIds = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/pos/orders', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Không tải được đơn QR.');
      setOrders(result.orders);
      knownIds.current = new Set(result.orders.map((order: IncomingOrder) => order.id));
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không tải được đơn QR.');
    }
  }, []);

  useEffect(() => {
    refresh();
    const supabase = createClient();
    const channel = supabase.channel('staff-pos-qr-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pos_orders', filter: 'source=eq.QR_TABLE' }, (payload) => {
        const order = payload.new as IncomingOrder & { order_status?: string };
        if (order.order_status === 'awaiting_confirmation' && !knownIds.current.has(order.id)) playAlert();
        void refresh();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pos_orders', filter: 'source=eq.QR_TABLE' }, () => void refresh())
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));
    const fallback = window.setInterval(refresh, 20000);
    return () => {
      window.clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const decide = async (order: IncomingOrder, decision: 'accept' | 'reject') => {
    let reason = '';
    if (decision === 'reject') {
      reason = window.prompt(`Lý do từ chối đơn bàn ${order.table_name}:`, '')?.trim() || '';
      if (!reason) return;
    }
    setProcessingId(order.id);
    setError('');
    try {
      const response = await fetch('/api/pos/orders/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, decision, reason }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Không xử lý được đơn.');
      await refresh();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Không xử lý được đơn.');
      await refresh();
    } finally {
      setProcessingId('');
    }
  };

  if (!orders.length && !error) return null;
  return (
    <section className="mx-2 mb-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-3 shadow-sm lg:mx-0" aria-live="polite">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-amber-700" />
          <h2 className="font-bold text-amber-950">Đơn QR cần xử lý <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{orders.length}</span></h2>
        </div>
        <span className={`text-xs ${isConnected ? 'text-green-700' : 'text-amber-800'}`}>{isConnected ? '● Realtime' : 'Đang đồng bộ dự phòng'}</span>
      </header>
      {error && <p role="alert" className="mb-2 text-sm text-red-700">{error}</p>}
      <div className="space-y-3">
        {orders.map((order) => (
          <article key={order.id} className="rounded-lg border border-amber-200 bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold text-gray-900">{order.table_name} <span className="text-xs font-normal text-gray-500">· QR · #{order.id.slice(-7).toUpperCase()}</span></p>
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-500"><Clock3 className="h-3.5 w-3.5" />{new Date(order.created_at).toLocaleTimeString('vi-VN')}</p>
              </div>
              <p className="font-bold text-orange-700">{Number(order.total_amount).toLocaleString('vi-VN')}đ</p>
            </div>
            <ul className="my-2 space-y-1 text-sm text-gray-700">
              {order.items.map((item, index) => <li key={`${item.productName}-${index}`}>{item.quantity} × {item.productName}{item.note ? ` · ${item.note}` : ''}</li>)}
            </ul>
            {order.notes && <p className="mb-2 rounded bg-yellow-50 p-2 text-xs text-gray-700">Ghi chú: {order.notes}</p>}
            {order.order_status === 'awaiting_confirmation' ? (
              <div className="flex gap-2">
                <Button size="sm" disabled={!!processingId} onClick={() => decide(order, 'accept')} className="bg-green-600 hover:bg-green-700">
                  <Check className="mr-1 h-4 w-4" />{processingId === order.id ? 'Đang xử lý...' : 'Nhận đơn & gửi bếp'}
                </Button>
                <Button size="sm" variant="outline" disabled={!!processingId} onClick={() => decide(order, 'reject')} className="border-red-200 text-red-700 hover:bg-red-50">
                  <X className="mr-1 h-4 w-4" />Từ chối
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-green-700">Đã nhận · {order.kitchen_status === 'preparing' ? 'Đang pha chế' : order.kitchen_status === 'ready' ? 'Đã sẵn sàng' : 'Chờ bếp'}</span>
                <Button size="sm" disabled={!!processingId} onClick={() => onSettle(order)} className="bg-blue-600 hover:bg-blue-700">Thanh toán tại quầy</Button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
