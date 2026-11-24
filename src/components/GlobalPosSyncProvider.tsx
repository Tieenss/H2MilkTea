'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useTodayOrdersContext } from '@/context/TodayOrdersContext';
import {
  getPrintDeviceConfig,
  isLikelyMobileOrTablet,
  syncPrintConfigFromCloud,
} from '@/utils/printBridgeClient';

interface PosSyncEvent {
  title: string;
  body: string;
  tag: string;
  forceEvenOnPos?: boolean;
}

function getTabId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let tabId = window.sessionStorage.getItem('h2_pos_tab_id');
    if (!tabId) {
      tabId = 'tab_' + Math.random().toString(36).slice(2, 10);
      window.sessionStorage.setItem('h2_pos_tab_id', tabId);
    }
    return tabId;
  } catch {
    return 'tab_unknown';
  }
}

/**
 * Tạo WAV data URI 16-bit PCM cho âm báo "Ting-Ting" (880Hz -> 1318.5Hz)
 * Dùng làm fallback dự phòng song song với Web Audio API khi tab không được focus.
 */
function buildTingTingWavDataUri(): string {
  try {
    const sampleRate = 22050;
    const durationSec = 0.45;
    const numSamples = Math.floor(sampleRate * durationSec);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const freq = t < 0.14 ? 880 : 1318.5;
      const localT = t < 0.14 ? t : t - 0.14;
      const env = Math.exp(-localT * 9.5);
      const sample = Math.sin(2 * Math.PI * freq * t) * env * 0.45;
      const pcm = Math.max(-1, Math.min(1, sample));
      view.setInt16(44 + i * 2, pcm * 32767, true);
    }

    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:audio/wav;base64,${btoa(binary)}`;
  } catch {
    return '';
  }
}

export function GlobalPosSyncProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { todayOrdersCount, loading: ordersLoading, refetch } = useTodayOrdersContext();

  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const prevOrdersCountRef = useRef<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const wavDataUriRef = useRef<string>('');
  const originalTitleRef = useRef<string>('');
  const blinkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recentEventMapRef = useRef<Map<string, number>>(new Map());
  const tableNameMapRef = useRef<Map<string, string>>(new Map());
  const knownDraftsRef = useRef<
    Map<string, { version: number; totalQty: number; itemCount: number }>
  >(new Map());
  const initialDraftsLoadedRef = useRef<boolean>(false);
  const lastLocalPosInteractionRef = useRef<number>(0);
  const processedPrintJobsRef = useRef<Set<string>>(new Set());

  const resolveTableLabel = (rawTableId?: string): string => {
    const id = String(rawTableId || '').trim();
    if (!id) return 'Bàn khách';
    const mapped = tableNameMapRef.current.get(id);
    if (mapped) return mapped;
    if (/^bàn\s/i.test(id)) return id;
    return `Bàn ${id}`;
  };

  // Mở khóa AudioContext ngay khi người dùng chạm/nhấn phím để phát được tiếng kể cả khi tab bị ẩn
  useEffect(() => {
    if (typeof window === 'undefined') return;
    originalTitleRef.current = document.title;
    wavDataUriRef.current = buildTingTingWavDataUri();

    const unlockAudio = () => {
      if (pathnameRef.current?.startsWith('/pos') && document.hasFocus() && !document.hidden) {
        lastLocalPosInteractionRef.current = Date.now();
      }
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

    window.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true });
    window.addEventListener('keydown', unlockAudio, { capture: true, passive: true });
    window.addEventListener('click', unlockAudio, { capture: true, passive: true });

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) {
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

    // Đồng bộ cấu hình tên máy in từ Cloud về thiết bị hiện tại
    syncPrintConfigFromCloud().catch(() => {});

    // Tải danh sách tên bàn để hiển thị thông báo rõ ràng
    fetch('/api/db?table=BAN', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
        for (const r of rows) {
          const id = String(r?.IDBAN || r?.id || '').trim();
          const name = String(r?.['Tên bàn'] || r?.name || '').trim();
          if (id && name) {
            tableNameMapRef.current.set(id, name);
          }
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('pointerdown', unlockAudio, true);
      window.removeEventListener('keydown', unlockAudio, true);
      window.removeEventListener('click', unlockAudio, true);
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
      let playedViaWebAudio = false;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioCtx();
          }
          const ctx = audioCtxRef.current;
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
          if (ctx.state === 'running') {
            const now = ctx.currentTime;
            const playTone = (freq: number, startOffset: number, duration: number) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, now + startOffset);
              gain.gain.setValueAtTime(0.001, now + startOffset);
              gain.gain.exponentialRampToValueAtTime(0.25, now + startOffset + 0.02);
              gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start(now + startOffset);
              osc.stop(now + startOffset + duration + 0.02);
            };
            playTone(880, 0, 0.18);
            playTone(1318.5, 0.15, 0.28);
            playedViaWebAudio = true;
          }
        }
      } catch {
        // fallback to HTML5 Audio below
      }

      if (!playedViaWebAudio && wavDataUriRef.current) {
        try {
          const audio = new Audio(wavDataUriRef.current);
          audio.volume = 0.85;
          audio.play().catch(() => {});
        } catch {
          // ignore audio fallback error
        }
      }
    };

    const startTitleBlink = (alertTitle: string) => {
      if (typeof document === 'undefined') return;
      if (!originalTitleRef.current && !document.title.startsWith('🔔')) {
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

      const isOnPos = Boolean(pathnameRef.current?.startsWith('/pos'));
      const isUnfocused =
        typeof document !== 'undefined' &&
        (document.visibilityState !== 'visible' || !document.hasFocus());

      playPosChime();

      toast(
        (t) => (
          <div
            data-testid="global-pos-sync-toast"
            className="flex items-start justify-between gap-3 min-w-[260px]"
          >
            <div className="space-y-0.5">
              <div className="font-semibold text-sm text-gray-900">🔔 {evt.title}</div>
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
        { duration: 6500, id: evt.tag }
      );

      if (!isOnPos || isUnfocused) {
        startTitleBlink(evt.title);
      }

      if (
        isUnfocused &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
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
    };

    const handleIncomingCartDraft = (params: {
      tableId: string;
      itemCount: number;
      totalQty: number;
      version: number;
      tabId?: string;
    }) => {
      const { tableId, itemCount, totalQty, version, tabId } = params;
      if (!tableId) return;

      if (itemCount <= 0) {
        knownDraftsRef.current.delete(tableId);
        return;
      }

      const prev = knownDraftsRef.current.get(tableId);
      knownDraftsRef.current.set(tableId, { version, totalQty, itemCount });

      // Nếu không có thay đổi số lượng hoặc version thấp hơn/bằng bản đã biết thì bỏ qua
      if (prev && version <= prev.version && totalQty === prev.totalQty && itemCount === prev.itemCount) {
        return;
      }

      const myTabId = getTabId();
      const isOnPos = Boolean(pathnameRef.current?.startsWith('/pos'));
      const isFocused =
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        document.hasFocus();

      // Chỉ bỏ qua nếu chính tab POS đang mở và đang focus vừa thao tác
      const isSelfActivePosTab =
        isOnPos &&
        isFocused &&
        ((tabId && tabId === myTabId) || Date.now() - lastLocalPosInteractionRef.current < 2200);

      if (isSelfActivePosTab) {
        return;
      }

      const tableLabel = resolveTableLabel(tableId);
      notifyPosEvent({
        title: `Giỏ hàng mới: ${tableLabel}`,
        body: `Hiện có ${itemCount} món (${totalQty} phần) vừa được cập nhật lên giỏ hàng.`,
        tag: `cart-${tableId}-v${version}-q${totalQty}`,
        forceEvenOnPos: true,
      });
    };

    // 1. Kênh Realtime toàn cục h2:global-pos-sync
    const posSyncChannel = supabase
      .channel('h2:global-pos-sync')
      .on('broadcast', { event: 'global_cart_draft_updated' }, ({ payload }) => {
        const data = (payload || {}) as Record<string, unknown>;
        const tableId = String(data.tableId || '').trim();
        const itemCount = Number(data.itemCount || 0);
        const totalQty = Number(data.totalQty || itemCount || 0);
        const version = Number(data.version || 1);
        const tabId = String(data.tabId || '');
        handleIncomingCartDraft({ tableId, itemCount, totalQty, version, tabId });
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pos_cart_drafts' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldRow = (payload.old || {}) as Record<string, unknown>;
            const oldTableId = String(oldRow.table_id || '').trim();
            if (oldTableId) knownDraftsRef.current.delete(oldTableId);
            return;
          }
          const row = (payload.new || {}) as Record<string, unknown>;
          const rawCart = Array.isArray(row.cart)
            ? row.cart
            : Array.isArray(row.items)
              ? row.items
              : [];
          const tableId = String(row.table_id || row.table_name || '').trim();
          const totalQty = rawCart.reduce(
            (sum: number, it: any) => sum + Math.max(1, Number(it?.quantity || 1)),
            0
          );
          const version = Number(row.version || 1);
          handleIncomingCartDraft({
            tableId,
            itemCount: rawCart.length,
            totalQty,
            version,
            tabId: String(row.updated_by_device || ''),
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pos_orders' },
        (payload) => {
          const row = (payload.new || {}) as Record<string, unknown>;
          const tableLabel = resolveTableLabel(
            String(row.table_name || row.table_id || row.order_number || 'Đơn mới')
          );
          refetch();
          notifyPosEvent({
            title: 'Có đơn hàng mới!',
            body: `Nguồn: ${tableLabel}. Nhấn để kiểm tra trên POS.`,
            tag: `order-${row.id || Date.now()}`,
            forceEvenOnPos: true,
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
            body:
              totalAmount > 0
                ? `Tổng tiền: ${totalAmount.toLocaleString('vi-VN')}đ`
                : 'Hóa đơn vừa được ghi nhận.',
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
          body:
            amount > 0
              ? `Số tiền: ${amount.toLocaleString('vi-VN')}đ`
              : 'Giao dịch thanh toán thành công.',
          tag: `sepay-${data.invoiceId || Date.now()}`,
          forceEvenOnPos: true,
        });
      })
      .on('broadcast', { event: 'service_call' }, ({ payload }) => {
        const data = (payload || {}) as Record<string, unknown>;
        const tableLabel = resolveTableLabel(String(data.tableName || data.tableId || 'Khách hàng'));
        notifyPosEvent({
          title: `Gọi nhân viên: ${tableLabel}`,
          body: String(data.message || data.requestType || 'Khách đang yêu cầu hỗ trợ tại bàn.'),
          tag: `service-${tableLabel}-${Date.now()}`,
          forceEvenOnPos: true,
        });
      })
      .subscribe();

    // 2. Global Polling 3.5s cho pos_cart_drafts (Đảm bảo 100% báo chuông kể cả khi ở trang khác / tab bị ẩn)
    let pollActive = true;
    const pollCartDrafts = async () => {
      if (!pollActive) return;
      try {
        const res = await fetch('/api/pos/cart-draft', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          const drafts = Array.isArray(json?.drafts) ? json.drafts : [];
          if (!initialDraftsLoadedRef.current) {
            initialDraftsLoadedRef.current = true;
            for (const d of drafts) {
              const tId = String(d?.table_id || '').trim();
              const cartArr = Array.isArray(d?.cart) ? d.cart : [];
              if (tId && cartArr.length > 0) {
                const totalQty = cartArr.reduce(
                  (sum: number, it: any) => sum + Math.max(1, Number(it?.quantity || 1)),
                  0
                );
                knownDraftsRef.current.set(tId, {
                  version: Number(d?.version || 1),
                  totalQty,
                  itemCount: cartArr.length,
                });
              }
            }
          } else {
            const seenTables = new Set<string>();
            for (const d of drafts) {
              const tId = String(d?.table_id || '').trim();
              if (!tId) continue;
              const cartArr = Array.isArray(d?.cart) ? d.cart : [];
              if (cartArr.length > 0) {
                seenTables.add(tId);
                const totalQty = cartArr.reduce(
                  (sum: number, it: any) => sum + Math.max(1, Number(it?.quantity || 1)),
                  0
                );
                handleIncomingCartDraft({
                  tableId: tId,
                  itemCount: cartArr.length,
                  totalQty,
                  version: Number(d?.version || 1),
                });
              }
            }
            for (const existingKey of Array.from(knownDraftsRef.current.keys())) {
              if (!seenTables.has(existingKey)) {
                knownDraftsRef.current.delete(existingKey);
              }
            }
          }
        }
      } catch {
        // ignore poll error
      }
    };

    void pollCartDrafts();
    const pollTimer = setInterval(pollCartDrafts, 3500);

    // 3. Kênh h2:print-bridge & Hàng đợi DB (/api/print/dispatch?claim=1): Nhận lệnh in từ Điện thoại trên Máy tính
    let printBridgeChannel: any = null;

    const executeRemotePrintJob = async (job: {
      jobId?: string;
      jobType?: 'receipt' | 'label';
      printerName?: string;
      tableName?: string;
      htmlList?: string[];
      widthMm?: number;
      heightMm?: number;
      requestedBy?: string;
    }) => {
      if (isLikelyMobileOrTablet()) return;

      const jobId = String(job.jobId || `job_${Date.now()}`);
      if (processedPrintJobsRef.current.has(jobId)) return;
      processedPrintJobsRef.current.add(jobId);

      const htmlList = Array.isArray(job.htmlList) ? job.htmlList : [];
      if (htmlList.length === 0) return;

      const labelText = job.jobType === 'label' ? 'Tem nhãn ly' : 'Hóa đơn';
      const tableText = job.tableName || 'Khách mang về';

      playPosChime();
      toast.success(
        `🖨️ Nhận lệnh in từ điện thoại: ${labelText} — ${tableText} (${htmlList.length} bản)`,
        { duration: 6000, id: `remote-print-${jobId}` }
      );

      const cfg = getPrintDeviceConfig();
      const targetPrinter =
        job.printerName ||
        (job.jobType === 'label' ? cfg.labelPrinterName : cfg.receiptPrinterName) ||
        '';

      // Ưu tiên 1: Gửi tới Local USB Print Bridge (127.0.0.1:18181) để in âm thầm không hiện Ctrl+P
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 2500);
        const bridgeRes = await fetch(`${cfg.bridgeUrl.replace(/\/$/, '')}/print`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            jobId,
            jobType: job.jobType || 'receipt',
            printerName: targetPrinter,
            tableName: tableText,
            htmlList,
            widthMm: job.widthMm || (job.jobType === 'label' ? 50 : 80),
            heightMm: job.heightMm || (job.jobType === 'label' ? 30 : 0),
          }),
        });
        clearTimeout(t);
        if (bridgeRes.ok) {
          toast.success(`PC đã in xong ${labelText} (${tableText}) qua Trạm In USB!`, {
            duration: 4500,
          });
          try {
            await printBridgeChannel?.send({
              type: 'broadcast',
              event: 'remote_print_ack',
              payload: {
                jobId,
                success: true,
                jobType: job.jobType,
                tableName: tableText,
                message: `Đã in trực tiếp qua máy in USB (${targetPrinter || 'Mặc định Windows'})`,
              },
            });
          } catch {}
          return;
        }
      } catch {
        // Local bridge chưa bật -> chuyển sang in qua iframe trình duyệt máy tính cho đúng bàn điện thoại chọn
      }

      // Ưu tiên 2: Nạp đúng HTML bàn của điện thoại vào iframe trên máy tính và gọi in
      try {
        let iframe = document.getElementById('h2-remote-print-iframe') as HTMLIFrameElement | null;
        if (iframe) iframe.remove();
        iframe = document.createElement('iframe');
        iframe.id = 'h2-remote-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(htmlList.join('<div style="page-break-after:always;"></div>'));
          doc.close();
          setTimeout(() => {
            try {
              iframe?.contentWindow?.focus();
              iframe?.contentWindow?.print();
            } catch {
              // ignore print error
            }
          }, 300);
        }

        try {
          await printBridgeChannel?.send({
            type: 'broadcast',
            event: 'remote_print_ack',
            payload: {
              jobId,
              success: true,
              jobType: job.jobType,
              tableName: tableText,
              message: `Máy tính đã nhận và mở lệnh in cho ${tableText}`,
            },
          });
        } catch {}
      } catch {
        // ignore fallback error
      }
    };

    printBridgeChannel = supabase
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
      .on('broadcast', { event: 'remote_print_job' }, async ({ payload }) => {
        await executeRemotePrintJob((payload || {}) as any);
      })
      .subscribe();

    const pollRemotePrintQueue = async () => {
      if (!pollActive || isLikelyMobileOrTablet()) return;
      try {
        const res = await fetch('/api/print/dispatch?claim=1', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        const jobs = Array.isArray(json?.jobs) ? json.jobs : [];
        for (const job of jobs) {
          await executeRemotePrintJob(job);
        }
      } catch {
        // ignore queue poll error
      }
    };

    const printPollTimer = setInterval(pollRemotePrintQueue, 2500);

    return () => {
      pollActive = false;
      clearInterval(pollTimer);
      clearInterval(printPollTimer);
      supabase?.removeChannel(posSyncChannel);
      if (printBridgeChannel) supabase?.removeChannel(printBridgeChannel);
    };
  }, [refetch, router]);

  // Theo dõi biến động số lượng đơn hàng/hóa đơn hôm nay để báo chuông kể cả khi WebSocket Realtime bị lỗi
  useEffect(() => {
    if (ordersLoading) return;
    if (prevOrdersCountRef.current === null) {
      prevOrdersCountRef.current = todayOrdersCount;
      return;
    }
    if (todayOrdersCount > prevOrdersCountRef.current) {
      const diff = todayOrdersCount - prevOrdersCountRef.current;
      prevOrdersCountRef.current = todayOrdersCount;
      const isOnPos = Boolean(pathnameRef.current?.startsWith('/pos'));
      const isFocused =
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        document.hasFocus();
      if (!isOnPos || !isFocused) {
        if (wavDataUriRef.current) {
          try {
            const audio = new Audio(wavDataUriRef.current);
            audio.volume = 0.85;
            audio.play().catch(() => {});
          } catch {}
        }
        toast.success(`🔔 Có ${diff} hóa đơn / đơn hàng mới vừa được tạo! (Tổng hôm nay: ${todayOrdersCount})`, {
          duration: 6000,
          id: `orders-count-${todayOrdersCount}`,
        });
      }
    } else {
      prevOrdersCountRef.current = todayOrdersCount;
    }
  }, [todayOrdersCount, ordersLoading]);

  return <>{children}</>;
}
