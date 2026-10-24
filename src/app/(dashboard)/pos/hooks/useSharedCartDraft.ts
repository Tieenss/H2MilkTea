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
  device_id?: string;
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

function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = window.localStorage.getItem('pos_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).slice(2, 10);
      window.localStorage.setItem('pos_device_id', id);
    }
    return id;
  } catch {
    return 'dev_unknown';
  }
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
  const pollDelayRef = useRef(3500); // 3.5s base delay để đồng bộ dự phòng cực nhanh
  const debounceTimerRef = useRef<number | null>(null);
  const fetchRequestIdRef = useRef(0);

  // Kênh Realtime channel Ref để gửi broadcast tức thời
  const channelRef = useRef<any>(null);
  const globalChannelRef = useRef<any>(null);

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

  const saveMergedDraft = useCallback(async (mergedCart: CartItem[], mergedCustomer: Customer | null, targetVersion: number) => {
    if (!tableId) return;
    try {
      const response = await fetch('/api/pos/cart-draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          cart: mergedCart,
          selectedCustomer: mergedCustomer,
          expectedVersion: targetVersion,
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        versionRef.current = result.draft.version;
        setLastSyncAt(new Date());
        void channelRef.current?.send({
          type: 'broadcast',
          event: 'cart_sync',
          payload: {
            table_id: tableId,
            cart: result.draft.cart,
            selected_customer: result.draft.selected_customer,
            version: result.draft.version,
            device_id: getDeviceId(),
          },
        });
      }
    } catch (e) {
      console.warn('Lỗi lưu bản gộp giỏ hàng:', e);
    }
  }, [tableId]);

  const applyDraft = useCallback((draft: CartDraft | null, force = false) => {
    const remoteVersion = draft?.version || 0;
    const remoteCart = draft?.cart || [];
    const remoteCustomer = draft?.selected_customer ?? null;

    // Lần đầu mở bàn (force)
    if (force) {
      versionRef.current = remoteVersion;
      // Nếu local có món và server có món -> tự động gộp (diffCartItems)
      if (cartRef.current.length > 0 && remoteCart.length > 0) {
        const diff = diffCartItems(cartRef.current, remoteCart);
        const targetCart = diff.canAutoMerge ? diff.mergedCart : remoteCart;
        pendingRemoteCartRef.current = JSON.stringify(targetCart);
        setCart(targetCart);
        if (tableId) onRemoteCartRef.current?.(tableId, targetCart);
        setLastSyncAt(new Date());
        setStatus(diff.hasConflict ? 'conflict' : 'connected');
        if (diff.canAutoMerge && diff.mergedCart.length > remoteCart.length) {
          void saveMergedDraft(diff.mergedCart, remoteCustomer, remoteVersion);
        }
        return;
      }
      // Nếu thu ngân đã bấm món trong lúc tải bản nháp rỗng từ server, giữ lại và lưu lên server
      if (remoteCart.length === 0 && cartRef.current.length > 0) {
        setLastSyncAt(new Date());
        setStatus('connected');
        setConflictData(null);
        void saveMergedDraft(cartRef.current, customerRef.current, 0);
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

    // Với broadcast/poll thông thường:
    // Chỉ bỏ qua nếu remoteVersion <= version hiện tại VÀ nội dung giỏ hàng giống hệt nhau
    const currentLocalCart = cartRef.current;
    const currentSnapshot = JSON.stringify(currentLocalCart);
    const remoteSnapshot = JSON.stringify(remoteCart);
    if (remoteVersion <= versionRef.current && currentSnapshot === remoteSnapshot) {
      return;
    }

    // Đồng bộ khách hàng nếu có cập nhật từ thiết bị khác
    if (tableId && draft && draft.selected_customer !== undefined) {
      onRemoteCustomerRef.current?.(tableId, remoteCustomer);
    }

    // So sánh xung đột giữa localCart và remoteCart theo lineItemKey
    const diff = diffCartItems(currentLocalCart, remoteCart);

    if (diff.canAutoMerge) {
      // Tự động gộp hai bên an toàn (không ghi đè âm thầm)
      versionRef.current = Math.max(versionRef.current, remoteVersion);
      pendingRemoteCartRef.current = JSON.stringify(diff.mergedCart);
      setCart(diff.mergedCart);
      if (tableId) onRemoteCartRef.current?.(tableId, diff.mergedCart);
      setLastSyncAt(new Date());
      setStatus('connected');
      setConflictData(null);

      // Nếu sau khi gộp có món mới từ local mà remote chưa có -> lưu bản gộp lên server
      if (diff.mergedCart.length > remoteCart.length) {
        void saveMergedDraft(diff.mergedCart, remoteCustomer, remoteVersion);
      }
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
  }, [saveMergedDraft, setCart, tableId]);

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
      pollDelayRef.current = 3500; // Reset về 3.5s
      setStatus((prev) => (prev === 'offline' || prev === 'loading' ? 'connected' : prev));
    } catch (err) {
      if (currentRequestId !== fetchRequestIdRef.current) return;
      console.error('Fetch shared cart draft failed:', err);
      // Backoff tối đa 10s
      pollDelayRef.current = Math.min(pollDelayRef.current * 1.5, 10000);
      setStatus((prev) => (prev === 'loading' ? 'connected' : 'offline'));
    }
  }, [applyDraft]);

  // Realtime Broadcast & Visibility-aware fallback polling
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
    const myDevId = getDeviceId();

    // Khởi tạo global channel để gửi broadcast trạng thái bàn
    const globalChannel = client.channel('pos-all-cart-drafts-global', {
      config: { broadcast: { self: false } },
    });
    globalChannelRef.current = globalChannel;
    globalChannel.subscribe();

    // Khởi tạo table channel hỗ trợ cả Broadcast thời gian thực lẫn postgres_changes
    const channel = client
      .channel(`pos-cart-draft:${tableId}`, {
        config: { broadcast: { self: false } },
      })
      // 1. Lắng nghe Broadcast trực tiếp từ thiết bị khác (< 50ms)
      .on('broadcast', { event: 'cart_sync' }, (payload) => {
        if (!active) return;
        const remote = payload.payload as (CartDraft & { device_id?: string });
        if (!remote || remote.table_id !== tableId) return;
        if (remote.device_id && remote.device_id === myDevId) return;
        applyDraft(remote, false);
      })
      .on('broadcast', { event: 'cart_cleared' }, (payload) => {
        if (!active) return;
        if (payload.payload?.device_id && payload.payload.device_id === myDevId) return;
        applyDraft(null, true);
      })
      // 2. Lắng nghe postgres_changes dự phòng
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

    channelRef.current = channel;

    setStatus('loading');
    void fetchDraft(tableId, true);

    // Watchdog an toàn: nếu mạng chập chờn kẹt status 'loading' quá 3.5 giây, tự phục hồi về 'connected'
    const loadingWatchdog = window.setTimeout(() => {
      if (active) {
        setStatus((prev) => (prev === 'loading' ? 'connected' : prev));
      }
    }, 3500);

    // Polling dự phòng 3.5s
    const scheduleNextPoll = () => {
      if (!active) return;
      pollIntervalRef.current = window.setTimeout(async () => {
        if (typeof document === 'undefined' || !document.hidden) {
          await fetchDraft(tableId, false);
        }
        scheduleNextPoll();
      }, pollDelayRef.current);
    };

    scheduleNextPoll();

    const handleVisibilityChange = () => {
      if (!document.hidden && active) {
        void fetchDraft(tableId, false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      channelRef.current = null;
      globalChannelRef.current = null;
      window.clearTimeout(loadingWatchdog);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollIntervalRef.current) window.clearTimeout(pollIntervalRef.current);
      void client.removeChannel(channel);
      void client.removeChannel(globalChannel);
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
          if (result.draft) {
            applyDraft(result.draft, false);
          } else {
            await fetchDraft(tableId, false);
          }
          return;
        }
        if (!response.ok || !result.success) throw new Error(result.error || 'Không lưu được giỏ hàng.');
        versionRef.current = result.draft.version;
        setLastSyncAt(new Date());
        setStatus('connected');

        // Bắn broadcast tức thời cho các máy khác (< 50ms)
        const myDevId = getDeviceId();
        void channelRef.current?.send({
          type: 'broadcast',
          event: 'cart_sync',
          payload: {
            table_id: tableId,
            cart: result.draft.cart,
            selected_customer: result.draft.selected_customer,
            version: result.draft.version,
            device_id: myDevId,
          },
        });

        void globalChannelRef.current?.send({
          type: 'broadcast',
          event: 'table_status_sync',
          payload: {
            tableId,
            cart: result.draft.cart,
            version: result.draft.version,
            deviceId: myDevId,
          },
        });
      } catch (error) {
        console.error('Save shared cart draft failed:', error);
        setStatus('offline');
      } finally {
        writeInFlightRef.current = false;
        debounceTimerRef.current = null;
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [cart, selectedCustomer, fetchDraft, tableId, applyDraft]);

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

        const myDevId = getDeviceId();
        void channelRef.current?.send({
          type: 'broadcast',
          event: 'cart_sync',
          payload: {
            table_id: tableId,
            cart: result.draft.cart,
            selected_customer: result.draft.selected_customer,
            version: result.draft.version,
            device_id: myDevId,
          },
        });
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

      const myDevId = getDeviceId();
      void channelRef.current?.send({
        type: 'broadcast',
        event: 'cart_cleared',
        payload: { tableId, device_id: myDevId },
      });
      void globalChannelRef.current?.send({
        type: 'broadcast',
        event: 'table_cleared',
        payload: { tableId, deviceId: myDevId },
      });
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
