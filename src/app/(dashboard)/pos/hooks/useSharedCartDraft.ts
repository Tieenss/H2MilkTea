'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CartItem } from '../types/pos';
import { createClient } from '@/lib/supabase/client';
import { diffCartItems, resolveCartConflict, type ConflictingItem } from '@/lib/cart/mergeCart';
import type { Customer } from '@/app/(dashboard)/khachhang/types/customer';

export interface CartDraft {
  table_id: string;
  cart: CartItem[];
  selected_customer?: Customer | null;
  version: number;
}

export type SharedCartStatus =
  | 'disabled'
  | 'loading'
  | 'connected'
  | 'syncing'
  | 'offline'
  | 'conflict';

export type RealtimeStatus =
  | 'CONNECTING'
  | 'SUBSCRIBED'
  | 'CHANNEL_ERROR'
  | 'TIMED_OUT'
  | 'CLOSED';

export interface ConflictData {
  remoteDraft: CartDraft;
  conflictingItems: ConflictingItem[];
}

interface UseSharedCartDraftOptions {
  tableId: string | null;
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  selectedCustomer?: Customer | null;
  onRemoteCart?: (tableId: string, cart: CartItem[]) => void;
  onRemoteCustomer?: (tableId: string, customer: Customer | null) => void;
}

export function useSharedCartDraft({
  tableId,
  cart,
  setCart,
  selectedCustomer,
  onRemoteCart,
  onRemoteCustomer,
}: UseSharedCartDraftOptions) {
  const [status, setStatus] = useState<SharedCartStatus>('disabled');
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('CLOSED');
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);

  const versionRef = useRef(0);
  const initializedTableRef = useRef<string | null>(null);
  const pendingRemoteCartRef = useRef<string | null>(null);
  const cartRef = useRef(cart);
  const customerRef = useRef(selectedCustomer);
  const statusRef = useRef<SharedCartStatus>(status);
  const writeInFlightRef = useRef(false);
  const pollIntervalRef = useRef<number | null>(null);
  const pollDelayRef = useRef(15000); // 15s base delay
  const debounceTimerRef = useRef<number | null>(null);
  const fetchRequestIdRef = useRef(0);

  // Lưu trữ callback dạng Ref để tránh thay đổi tham chiếu làm trigger lại useEffect kết nối
  const onRemoteCartRef = useRef(onRemoteCart);
  const onRemoteCustomerRef = useRef(onRemoteCustomer);
  onRemoteCartRef.current = onRemoteCart;
  onRemoteCustomerRef.current = onRemoteCustomer;

  cartRef.current = cart;
  customerRef.current = selectedCustomer;
  statusRef.current = status;

  const cancelPendingAutosave = useCallback(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const applyDraft = useCallback((draft: CartDraft | null, force = false) => {
    const remoteVersion = draft?.version || 0;
    const remoteCart = draft?.cart || [];
    const remoteCustomer = draft?.selected_customer ?? null;

    // Lần đầu mở bàn (force)
    if (force) {
      versionRef.current = remoteVersion;
      // Nếu thu ngân đã kịp bấm thêm món trong lúc đang tải bản nháp rỗng từ server, giữ lại món của thu ngân
      if (remoteCart.length === 0 && cartRef.current.length > 0) {
        setLastSyncAt(new Date());
        setStatus('connected');
        setConflictData(null);
        return;
      }
      pendingRemoteCartRef.current = JSON.stringify(remoteCart);
      setCart(remoteCart);
      if (tableId) {
        onRemoteCartRef.current?.(tableId, remoteCart);
        if (draft && draft.selected_customer !== undefined) {
          onRemoteCustomerRef.current?.(tableId, remoteCustomer);
        }
      }
      setLastSyncAt(new Date());
      setStatus('connected');
      setConflictData(null);
      return;
    }

    if (remoteVersion <= versionRef.current) return;

    // Đồng bộ khách hàng nếu có cập nhật từ thiết bị khác
    if (tableId && draft && draft.selected_customer !== undefined) {
      onRemoteCustomerRef.current?.(tableId, remoteCustomer);
    }

    // So sánh xung đột giữa localCart và remoteCart theo lineItemKey
    const currentLocalCart = cartRef.current;
    const diff = diffCartItems(currentLocalCart, remoteCart);

    if (diff.canAutoMerge) {
      // Tự động gộp hai bên an toàn (không ghi đè âm thầm)
      versionRef.current = remoteVersion;
      pendingRemoteCartRef.current = JSON.stringify(diff.mergedCart);
      setCart(diff.mergedCart);
      if (tableId) onRemoteCartRef.current?.(tableId, diff.mergedCart);
      setLastSyncAt(new Date());
      setStatus('connected');
      setConflictData(null);
    } else {
      // Có xung đột thực sự trên cùng 1 món -> Mở hộp thoại giải quyết xung đột
      console.warn('[POS Sync Conflict] Phát hiện xung đột giỏ hàng tại bàn:', tableId, diff.conflictingItems);
      setStatus('conflict');
      if (draft) {
        setConflictData({
          remoteDraft: draft,
          conflictingItems: diff.conflictingItems,
        });
      }
    }
  }, [setCart, tableId]);

  const fetchDraft = useCallback(async (currentTableId: string, isInitialLoad = false) => {
    const currentRequestId = ++fetchRequestIdRef.current;
    try {
      const response = await fetch(`/api/pos/cart-draft?tableId=${encodeURIComponent(currentTableId)}`, { cache: 'no-store' });
      const result = await response.json();

      // Nếu người dùng đã chuyển sang bàn khác trong lúc fetch thì bỏ qua response cũ
      if (currentRequestId !== fetchRequestIdRef.current) return;
      if (!response.ok || !result.success) throw new Error(result.error || 'Không tải được giỏ hàng dùng chung.');

      const shouldForce = isInitialLoad && initializedTableRef.current !== currentTableId;
      initializedTableRef.current = currentTableId;
      applyDraft(result.draft, shouldForce);
      pollDelayRef.current = 15000; // Reset backoff on success
      setStatus((prev) => (prev === 'offline' || prev === 'loading' ? 'connected' : prev));
    } catch (err) {
      if (currentRequestId !== fetchRequestIdRef.current) return;
      console.error('Fetch shared cart draft failed:', err);
      // Exponential backoff up to 60s
      pollDelayRef.current = Math.min(pollDelayRef.current * 1.5, 60000);
      setStatus((prev) => (prev === 'loading' ? 'connected' : 'offline')); // Tuyệt đối không kẹt vĩnh viễn ở 'loading'
    }
  }, [applyDraft]);

  // Realtime subscription & Visibility-aware fallback polling
  useEffect(() => {
    if (!tableId) {
      setStatus('disabled');
      versionRef.current = 0;
      initializedTableRef.current = null;
      pendingRemoteCartRef.current = null;
      setConflictData(null);
      return;
    }

    let active = true;
    versionRef.current = 0;
    const client = createClient();
    const channel = client
      .channel(`pos-cart-draft:${tableId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pos_cart_drafts',
        filter: `table_id=eq.${tableId}`,
      }, (payload) => {
        if (!active || payload.eventType === 'DELETE') {
          if (payload.eventType === 'DELETE') applyDraft(null, true);
          return;
        }
        applyDraft(payload.new as CartDraft);
      })
      .subscribe((connectionStatus) => {
        if (!active) return;
        setRealtimeStatus(connectionStatus as RealtimeStatus);
        if (connectionStatus === 'SUBSCRIBED') {
          setStatus((prev) => (prev === 'conflict' ? 'conflict' : 'connected'));
        } else if (connectionStatus === 'CHANNEL_ERROR' || connectionStatus === 'TIMED_OUT') {
          setStatus('offline');
        }
      });

    setStatus('loading');
    void fetchDraft(tableId, true);

    // Watchdog an toàn: nếu mạng chập chờn kẹt status 'loading' quá 3.5 giây, tự phục hồi về 'connected'
    const loadingWatchdog = window.setTimeout(() => {
      if (active) {
        setStatus((prev) => (prev === 'loading' ? 'connected' : prev));
      }
    }, 3500);

    // Polling dự phòng có kiểm tra tab ẩn và exponential backoff
    const scheduleNextPoll = () => {
      if (!active) return;
      pollIntervalRef.current = window.setTimeout(async () => {
        // Dừng polling khi tab bị ẩn để tiết kiệm tài nguyên
        if (typeof document === 'undefined' || !document.hidden) {
          await fetchDraft(tableId, false);
        }
        scheduleNextPoll();
      }, pollDelayRef.current);
    };

    scheduleNextPoll();

    const handleVisibilityChange = () => {
      if (!document.hidden && active) {
        // Khi người dùng quay lại tab, tải ngay dữ liệu mới nhất
        void fetchDraft(tableId, false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.clearTimeout(loadingWatchdog);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollIntervalRef.current) window.clearTimeout(pollIntervalRef.current);
      void client.removeChannel(channel);
    };
  }, [applyDraft, fetchDraft, tableId]);

  // Debounce Autosave (lưu cả cart và selectedCustomer)
  useEffect(() => {
    if (!tableId || statusRef.current === 'conflict') return;
    const cartSnapshot = JSON.stringify(cart);

    // Nếu giỏ hàng vừa được nhận từ server hoặc đã xóa sạch (cart=[] và version=0), không trigger autosave đè
    if (pendingRemoteCartRef.current === cartSnapshot) {
      pendingRemoteCartRef.current = null;
      return;
    }
    if (cart.length === 0 && versionRef.current === 0) {
      return;
    }

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(async () => {
      writeInFlightRef.current = true;
      setStatus((prev) => (prev === 'connected' ? 'syncing' : prev));
      try {
        const response = await fetch('/api/pos/cart-draft', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableId,
            cart: cartRef.current,
            selectedCustomer: customerRef.current,
            expectedVersion: versionRef.current,
          }),
        });
        const result = await response.json();
        if (response.status === 409) {
          writeInFlightRef.current = false;
          await fetchDraft(tableId, false);
          return;
        }
        if (!response.ok || !result.success) throw new Error(result.error || 'Không lưu được giỏ hàng.');
        versionRef.current = result.draft.version;
        setLastSyncAt(new Date());
        setStatus('connected');
      } catch (error) {
        console.error('Save shared cart draft failed:', error);
        setStatus('offline');
      } finally {
        writeInFlightRef.current = false;
        debounceTimerRef.current = null;
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [cart, selectedCustomer, fetchDraft, tableId]);

  // Giải quyết xung đột theo lựa chọn của thu ngân
  const resolveConflict = useCallback(async (strategy: 'keep_local' | 'take_remote' | 'merge_quantities') => {
    if (!conflictData || !tableId) return;

    cancelPendingAutosave();
    const finalCart = resolveCartConflict(cartRef.current, conflictData.remoteDraft.cart, strategy);
    const targetVersion = conflictData.remoteDraft.version;

    setCart(finalCart);
    setConflictData(null);
    setStatus('syncing');

    try {
      const response = await fetch('/api/pos/cart-draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          cart: finalCart,
          selectedCustomer: customerRef.current,
          expectedVersion: targetVersion,
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        versionRef.current = result.draft.version;
        setLastSyncAt(new Date());
        setStatus('connected');
      } else {
        await fetchDraft(tableId);
      }
    } catch (err) {
      console.error('Lỗi khi lưu giỏ hàng sau khi giải quyết xung đột:', err);
      setStatus('offline');
    }
  }, [cancelPendingAutosave, conflictData, fetchDraft, setCart, tableId]);

  // Xóa giỏ hàng nháp sạch sẽ, chống race condition với autosave
  const clearDraft = useCallback(async () => {
    cancelPendingAutosave();
    if (!tableId) return;
    pendingRemoteCartRef.current = '[]';
    versionRef.current = 0;
    setConflictData(null);
    try {
      const response = await fetch(`/api/pos/cart-draft?tableId=${encodeURIComponent(tableId)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Không xóa được giỏ hàng dùng chung.');
      setStatus('connected');
    } catch (err) {
      console.error('Error clearing shared cart draft:', err);
    }
  }, [cancelPendingAutosave, tableId]);

  // Chặn thanh toán khi trạng thái chưa chắc chắn (đang xung đột hoặc mất kết nối)
  const canCheckout = status === 'connected' || status === 'syncing';

  return {
    status,
    realtimeStatus,
    lastSyncAt,
    conflictData,
    resolveConflict,
    canCheckout,
    clearDraft,
    cancelPendingAutosave,
  };
}
