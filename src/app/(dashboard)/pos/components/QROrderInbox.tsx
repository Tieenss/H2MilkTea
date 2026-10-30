'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BellRing, Check, Clock3, X, ChevronUp, ChevronDown, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';

export interface IncomingOrder {
  id: string;
  table_id: string;
  table_name: string;
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number; note?: string; size?: string; sugar?: string; ice?: string; unit?: string }>;
  total_amount: number;
  notes?: string;
  created_at: string;
  order_status: 'awaiting_confirmation' | 'accepted' | 'cancellation_pending';
  kitchen_status: string;
  rejection_reason?: string;
}

interface ActionModalState {
  isOpen: boolean;
  type: 'reject' | 'reject_cancellation' | 'cancel' | 'clear_all' | null;
  order?: IncomingOrder | null;
  reason: string;
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

export function QROrderInbox({
  onSettle,
  onAccept,
  activeOrders,
}: { 
  onSettle: (order: IncomingOrder) => void;
  onAccept?: (order: IncomingOrder) => void;
  activeOrders?: Map<string, any>;
}) {
  const [orders, setOrders] = useState<IncomingOrder[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [processingId, setProcessingId] = useState('');
  const [error, setError] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const knownIds = useRef(new Set<string>());

  // State quản lý Dialog Radix UI thay thế window.prompt / window.confirm
  const [actionModal, setActionModal] = useState<ActionModalState>({
    isOpen: false,
    type: null,
    order: null,
    reason: '',
  });

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
    const topic = 'staff-pos-qr-orders';

    try {
      const existing = supabase.getChannels().find(
        (ch) => ch.topic === `realtime:${topic}` || ch.topic === topic
      );
      if (existing) {
        void supabase.removeChannel(existing);
      }
    } catch {
      // Bỏ qua lỗi dọn channel
    }

    let channel: any = null;
    try {
      channel = supabase.channel(topic)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pos_orders', filter: 'source=eq.QR_TABLE' }, (payload) => {
          const order = payload.new as IncomingOrder & { order_status?: string };
          if (order.order_status === 'awaiting_confirmation' && !knownIds.current.has(order.id)) playAlert();
          void refresh();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pos_orders', filter: 'source=eq.QR_TABLE' }, (payload) => {
          const updatedOrder = payload.new as IncomingOrder;
          if (updatedOrder?.rejection_reason?.includes('YÊU CẦU HỦY ĐƠN')) {
            playAlert();
          }
          void refresh();
        })
        .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));
    } catch (e) {
      console.warn('Lỗi kết nối Realtime đơn QR:', e);
    }

    const handleSettled = (e: any) => {
      const settledIds = e.detail?.orderIds || [];
      if (settledIds.length > 0) {
        setOrders(prev => prev.filter(o => !settledIds.includes(o.id)));
      }
      void refresh();
    };
    window.addEventListener('pos_order_settled', handleSettled);
    const fallback = window.setInterval(refresh, 15000);
    return () => {
      window.removeEventListener('pos_order_settled', handleSettled);
      window.clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const executeDecision = async (
    order: IncomingOrder,
    decision: 'accept' | 'reject' | 'cancel' | 'dismiss' | 'reject_cancellation',
    providedReason: string = ''
  ) => {
    setProcessingId(order.id);
    setError('');
    try {
      const response = await fetch('/api/pos/orders/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, decision, reason: providedReason }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Không xử lý được đơn.');
      if (decision === 'accept' && onAccept) {
        onAccept(order);
      }
      if (decision === 'cancel') {
        window.dispatchEvent(new CustomEvent('pos_order_cancelled', {
          detail: {
            tableId: order.table_id,
            tableName: order.table_name,
            items: order.items,
            orderId: order.id,
          },
        }));
      }
      // Loại bỏ đơn khỏi state local ngay tức thì
      setOrders(prev => prev.filter(o => o.id !== order.id));
      await refresh();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Không xử lý được đơn.');
      await refresh();
    } finally {
      setProcessingId('');
    }
  };

  const handleOpenActionModal = (
    order: IncomingOrder,
    type: 'reject' | 'reject_cancellation' | 'cancel'
  ) => {
    let initialReason = '';
    if (type === 'reject') initialReason = 'Quán đang quá tải / Hết món';
    else if (type === 'reject_cancellation') initialReason = 'Đồ uống đã pha chế xong, đang chuyển ra bàn';
    else if (type === 'cancel') initialReason = 'Nhân viên hủy tại quầy';

    setActionModal({
      isOpen: true,
      type,
      order,
      reason: initialReason,
    });
  };

  const handleConfirmModalAction = async () => {
    const { type, order, reason } = actionModal;
    if (!type) return;

    if (type === 'clear_all') {
      setActionModal(prev => ({ ...prev, isOpen: false }));
      try {
        await fetch('/api/pos/orders', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });
        await refresh();
      } catch {}
      return;
    }

    if (!order) return;
    setActionModal(prev => ({ ...prev, isOpen: false }));

    if (type === 'reject') {
      await executeDecision(order, 'reject', reason.trim() || 'Quán đang quá tải');
    } else if (type === 'reject_cancellation') {
      await executeDecision(order, 'reject_cancellation', reason.trim() || 'Đang pha chế');
    } else if (type === 'cancel') {
      await executeDecision(order, 'cancel', reason.trim() || 'Nhân viên hủy');
    }
  };

  const handleOpenClearAllModal = () => {
    setActionModal({
      isOpen: true,
      type: 'clear_all',
      order: null,
      reason: '',
    });
  };

  // Kiểm tra bàn đang phục vụ để gắn nhãn "Gọi thêm lượt mới"
  const isTableReorder = (order: IncomingOrder): boolean => {
    if (!activeOrders) return false;
    const byId = activeOrders.get(order.table_id);
    const byName = activeOrders.get(order.table_name);
    return Boolean((byId && byId.length > 0) || (byName && byName.length > 0));
  };

  if (!orders.length && !error) return null;
  return (
    <>
      <section className="mx-2 mb-3 rounded-xl border border-amber-300 bg-amber-50/80 p-2.5 shadow-xs lg:mx-0 transition-all" aria-live="polite">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-amber-700 animate-bounce" />
            <h2 className="font-bold text-amber-950 text-xs sm:text-sm flex items-center gap-1.5">
              Đơn QR cần xử lý
              <span className="rounded-full bg-red-600 px-2 py-0.2 text-[11px] text-white font-extrabold">{orders.length}</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {orders.some(o => o.order_status === 'accepted') && (
              <button
                type="button"
                onClick={handleOpenClearAllModal}
                className="text-[11px] font-semibold text-amber-900 bg-amber-200/70 hover:bg-amber-300 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1"
                title="Đánh dấu hoàn tất và xóa toàn bộ đơn đã nhận"
              >
                <Trash2 className="w-3 h-3" />
                Dọn đơn đã nhận
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-md hover:bg-amber-200/80 text-amber-800 transition-colors"
              title={isCollapsed ? "Mở rộng danh sách đơn" : "Thu gọn thông báo"}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Danh sách cuộn độc lập max-h-[220px] chống giật layout và chống đẩy tụt ProductGrid */}
        {!isCollapsed && (
          <div className="mt-2.5 space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {orders.map((order) => {
              const isCancellation = order.order_status === 'cancellation_pending' || Boolean(order.rejection_reason?.includes('YÊU CẦU HỦY ĐƠN'));
              const reorder = isTableReorder(order);

              return (
                <article 
                  key={order.id} 
                  className={`rounded-lg border bg-white p-2.5 transition-colors shadow-2xs ${
                    isCancellation 
                      ? 'border-red-400 bg-red-50/50 ring-1 ring-red-400' 
                      : 'border-amber-200'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                        <span>{order.table_name}</span>
                        <span className="text-[11px] font-normal text-gray-500">· QR #{order.id.slice(-6).toUpperCase()}</span>
                        {reorder && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-black bg-blue-600 text-white shadow-2xs">
                            <Sparkles className="w-2.5 h-2.5" /> Gọi thêm lượt mới
                          </span>
                        )}
                        {isCancellation && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded text-[10px] font-extrabold bg-red-600 text-white animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> KHÁCH XIN HỦY ĐƠN
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                        <Clock3 className="h-3 w-3" />
                        {new Date(order.created_at).toLocaleTimeString('vi-VN')}
                      </p>
                    </div>
                    <p className="font-bold text-sm text-orange-700">{Number(order.total_amount).toLocaleString('vi-VN')}đ</p>
                  </div>

                  {isCancellation && order.rejection_reason && (
                    <div className="my-1.5 p-1.5 rounded-md bg-red-100 border border-red-200 text-xs text-red-800 font-semibold">
                      ⚠️ Lý do: {order.rejection_reason}
                    </div>
                  )}

                  <ul className="my-1.5 space-y-0.5 text-xs text-gray-700">
                    {order.items.map((item, index) => (
                      <li key={`${item.productName}-${index}`} className="flex items-baseline gap-1">
                        <span className="font-bold text-gray-900">{item.quantity}×</span>
                        <span>{item.productName}</span>
                        {item.size && <span className="text-[10px] text-gray-500 font-medium">({item.size})</span>}
                        {item.note && <span className="text-[10px] text-amber-700 italic">· {item.note}</span>}
                      </li>
                    ))}
                  </ul>

                  {order.notes && <p className="mb-1.5 rounded bg-amber-50 p-1.5 text-xs text-gray-700 border border-amber-100">Ghi chú: {order.notes}</p>}

                  {isCancellation ? (
                    <div className="flex items-center gap-2 pt-1 border-t border-red-200">
                      <Button 
                        size="sm" 
                        disabled={!!processingId} 
                        onClick={() => handleOpenActionModal(order, 'cancel')} 
                        className="h-8 bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        {processingId === order.id ? 'Đang hủy...' : 'Đồng ý hủy đơn'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        disabled={!!processingId} 
                        onClick={() => handleOpenActionModal(order, 'reject_cancellation')} 
                        className="h-8 border-gray-300 text-gray-700 hover:bg-gray-100 text-xs"
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Từ chối (Bếp đang làm)
                      </Button>
                    </div>
                  ) : order.order_status === 'awaiting_confirmation' ? (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" disabled={!!processingId} onClick={() => executeDecision(order, 'accept')} className="h-8 bg-green-600 hover:bg-green-700 text-xs font-semibold">
                        <Check className="mr-1 h-3.5 w-3.5" />{processingId === order.id ? 'Đang xử lý...' : 'Nhận đơn & gửi bếp'}
                      </Button>
                      <Button size="sm" variant="outline" disabled={!!processingId} onClick={() => handleOpenActionModal(order, 'reject')} className="h-8 border-red-200 text-red-700 hover:bg-red-50 text-xs">
                        <X className="mr-1 h-3.5 w-3.5" />Từ chối
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] font-medium text-green-700">
                        Đã nhận · {order.kitchen_status === 'preparing' ? 'Đang pha chế' : order.kitchen_status === 'ready' ? 'Đã sẵn sàng' : 'Chờ bếp'}
                      </span>
                      <Button size="sm" disabled={!!processingId} onClick={() => onSettle(order)} className="h-8 bg-blue-600 hover:bg-blue-700 text-xs">
                        Thanh toán tại quầy
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Dialog React/Radix UI không đóng băng Event Loop POS */}
      <Dialog open={actionModal.isOpen} onOpenChange={(open) => !open && setActionModal(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">
              {actionModal.type === 'reject' && `Từ chối đơn của ${actionModal.order?.table_name}`}
              {actionModal.type === 'reject_cancellation' && `Từ chối hủy đơn ${actionModal.order?.table_name}`}
              {actionModal.type === 'cancel' && `Xác nhận hủy đơn ${actionModal.order?.table_name}`}
              {actionModal.type === 'clear_all' && 'Dọn dẹp danh sách đơn QR đã nhận'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {actionModal.type === 'clear_all'
                ? 'Thao tác này sẽ xóa các đơn đã hoàn tất khỏi hộp thư thông báo để giữ màn hình gọn gàng.'
                : 'Thông tin này sẽ được gửi tới khách hàng qua trang theo dõi đơn hàng.'}
            </DialogDescription>
          </DialogHeader>

          {actionModal.type !== 'clear_all' && (
            <div className="py-2">
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Lý do thông báo tới khách:
              </label>
              <Input
                value={actionModal.reason}
                onChange={(e) => setActionModal(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Nhập lý do..."
                className="h-9 text-xs"
                autoFocus
              />
            </div>
          )}

          <DialogFooter className="flex sm:justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
              className="text-xs"
            >
              Quay lại
            </Button>
            <Button
              type="button"
              size="sm"
              variant={actionModal.type === 'reject' || actionModal.type === 'cancel' ? 'destructive' : 'default'}
              onClick={handleConfirmModalAction}
              className="text-xs font-bold"
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
