'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useTodayOrdersContext } from '@/context/TodayOrdersContext';
import { syncPrintConfigFromCloud } from '@/utils/printBridgeClient';

interface PosSyncEvent {
  title: string;
  body: string;
  tag: string;
  forceEvenOnPos?: boolean;
}

export function GlobalPosSyncProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { refetch } = useTodayOrdersContext();

  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const originalTitleRef = useRef<string>('');
  const blinkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recentEventMapRef = useRef<Map<string, number>>(new Map());

  // Mở khóa AudioContext ngay khi người dùng chạm/nhấn phím để phát được tiếng kể cả khi tab bị ẩn
  useEffect(() => {
    if (typeof window === 'undefined') return;
    originalTitleRef.current = document.title;

    const unlockAudio = () => {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {});
        }
      } catch {
        // ignore audio unlock errors
      }
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        if (blinkTimerRef.current) {
          clearInterval(blinkTimerRef.current);
          blinkTimerRef.current = null;
        }
        if (originalTitleRef.current) {
          document.title = originalTitleRef.current;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Đồng bộ cấu hình tên máy in từ Cloud về thiết bị hiện tại (hữu ích cho điện thoại)
    syncPrintConfigFromCloud().catch(() => {});

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      if (blinkTimerRef.current) {
        clearInterval(blinkTimerRef.current);
        blinkTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const playPosChime = () => {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const now = ctx.currentTime;
        const playTone = (freq: number, startOffset: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + startOffset);
          gain.gain.setValueAtTime(0.001, now + startOffset);
          gain.gain.exponentialRampToValueAtTime(0.22, now + startOffset + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + startOffset);
          osc.stop(now + startOffset + duration + 0.02);
        };

        // Âm báo Ting-Ting rõ ràng
        playTone(880, 0, 0.18);
        playTone(1174.66, 0.16, 0.28);
      } catch {
        // ignore audio error
      }
    };

    const startTitleBlink = (alertTitle: string) => {
      if (typeof document === 'undefined') return;
      if (!originalTitleRef.current) {
        originalTitleRef.current = document.title;
      }
      if (blinkTimerRef.current) {
        clearInterval(blinkTimerRef.current);
      }
      let toggle = false;
      blinkTimerRef.current = setInterval(() => {
        toggle = !toggle;
        document.title = toggle ? `🔔 ${alertTitle}` : originalTitleRef.current || 'H2 MilkTea POS';
      }, 950);
    };

    const notifyPosEvent = (evt: PosSyncEvent) => {
      const now = Date.now();
      const last = recentEventMapRef.current.get(evt.tag) || 0;
      if (now - last < 1800) return;
      recentEventMapRef.current.set(evt.tag, now);

      const isOnPos = pathnameRef.current?.startsWith('/pos');
      const isHidden = typeof document !== 'undefined' && document.visibilityState !== 'visible';

      // Nếu đang mở /pos và tab đang focus thì màn POS đã xử lý toast riêng (trừ khi ép thông báo)
      if (isOnPos && !isHidden && !evt.forceEvenOnPos) {
        return;
      }

      playPosChime();

      toast(
        (t) => (
          <div className="flex items-start justify-between gap-3 min-w-[260px]">
            <div className="space-y-0.5">
              <div className="font-semibold text-sm text-gray-900">{evt.title}</div>
              <div className="text-xs text-gray-600">{evt.body}</div>
            </div>
            {!isOnPos && (
              <button
                type="button"
                onClick={() => {
                  toast.dismiss(t.id);
                  router.push('/pos');
                }}
                className="shrink-0 px-2.5 py-1 rounded bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
              >
                Mở POS
              </button>
            )}
          </div>
        ),
        { duration: 6000, id: evt.tag }
      );

      if (isHidden) {
        startTitleBlink(evt.title);
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            const notif = new Notification(evt.title, {
              body: evt.body,
              tag: evt.tag,
            });
            notif.onclick = () => {
              window.focus();
              if (!pathnameRef.current?.startsWith('/pos')) {
                router.push('/pos');
              }
              notif.close();
            };
          } catch {
            // ignore notification error
          }
        }
      }
    };

    const posSyncChannel = supabase
      .channel('h2:global-pos-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pos_cart_drafts' },
        (payload) => {
          const row = (payload.new || {}) as Record<string, unknown>;
          const items = Array.isArray(row.items) ? row.items : [];
          if (items.length === 0) return;
          const tableLabel = String(row.table_name || row.table_id || 'Bàn');
          notifyPosEvent({
            title: `Cập nhật giỏ hàng: ${tableLabel}`,
            body: `Hiện có ${items.length} món trên bàn (đồng bộ từ thiết bị khác).`,
            tag: `cart-${tableLabel}`,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pos_orders' },
        (payload) => {
          const row = (payload.new || {}) as Record<string, unknown>;
          const tableLabel = String(row.table_name || row.table_id || row.order_number || 'Đơn mới');
          refetch();
          notifyPosEvent({
            title: 'Có đơn hàng mới!',
            body: `Nguồn: ${tableLabel}. Nhấn để kiểm tra trên POS.`,
            tag: `order-${row.id || Date.now()}`,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'HOADON' },
        (payload) => {
          const row = (payload.new || {}) as Record<string, unknown>;
          const invoiceId = String(row.IDHOADON || 'Hóa đơn mới');
          const totalAmount = Number(row.TONGTIEN || 0);
          refetch();
          notifyPosEvent({
            title: `Hóa đơn mới: ${invoiceId}`,
            body: totalAmount > 0 ? `Tổng tiền: ${totalAmount.toLocaleString('vi-VN')}đ` : 'Hóa đơn vừa được ghi nhận.',
            tag: `invoice-${invoiceId}`,
          });
        }
      )
      .on('broadcast', { event: 'sepay_payment_received' }, ({ payload }) => {
        const data = (payload || {}) as Record<string, unknown>;
        const amount = Number(data.amount || 0);
        refetch();
        notifyPosEvent({
          title: 'Đã nhận chuyển khoản SePay!',
          body: amount > 0 ? `Số tiền: ${amount.toLocaleString('vi-VN')}đ` : 'Giao dịch thanh toán thành công.',
          tag: `sepay-${data.invoiceId || Date.now()}`,
          forceEvenOnPos: true,
        });
      })
      .on('broadcast', { event: 'service_call' }, ({ payload }) => {
        const data = (payload || {}) as Record<string, unknown>;
        const tableLabel = String(data.tableName || data.tableId || 'Khách hàng');
        notifyPosEvent({
          title: `Gọi nhân viên: ${tableLabel}`,
          body: String(data.message || 'Khách đang yêu cầu hỗ trợ tại bàn.'),
          tag: `service-${tableLabel}`,
          forceEvenOnPos: true,
        });
      })
      .subscribe();

    // Lắng nghe kết quả in từ xa (khi Điện thoại gửi lệnh cho Máy tính quầy)
    const printAckChannel = supabase
      .channel('h2:print-bridge')
      .on('broadcast', { event: 'remote_print_ack' }, ({ payload }) => {
        const ack = (payload || {}) as {
          success?: boolean;
          tableName?: string;
          jobType?: string;
          message?: string;
        };
        const label = ack.jobType === 'label' ? 'Tem ly' : 'Hóa đơn';
        const table = ack.tableName || 'Đơn hàng';
        if (ack.success) {
          toast.success(`PC đã in xong ${label} (${table})`, { duration: 4000 });
        } else if (ack.message) {
          toast.error(`Lỗi in ${label} (${table}): ${ack.message}`, { duration: 5000 });
        }
      })
      .subscribe();

    return () => {
      supabase?.removeChannel(posSyncChannel);
      supabase?.removeChannel(printAckChannel);
    };
  }, [refetch, router]);

  return <>{children}</>;
}
