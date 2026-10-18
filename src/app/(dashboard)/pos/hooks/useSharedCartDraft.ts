'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CartItem } from '../types/pos';
import { createClient } from '@/lib/supabase/client';

interface CartDraft {
  table_id: string;
  cart: CartItem[];
  version: number;
}

export type SharedCartStatus =
  | 'disabled'
  | 'loading'
  | 'connected'
  | 'offline'
  | 'conflict';

export type RealtimeStatus =
  | 'CONNECTING'
  | 'SUBSCRIBED'
  | 'CHANNEL_ERROR'
  | 'TIMED_OUT'
  | 'CLOSED';

interface UseSharedCartDraftOptions {
  tableId: string | null;
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  onRemoteCart?: (tableId: string, cart: CartItem[]) => void;
}

export function useSharedCartDraft({ tableId, cart, setCart, onRemoteCart }: UseSharedCartDraftOptions) {
  const [status, setStatus] = useState<SharedCartStatus>('disabled');
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('CLOSED');
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const versionRef = useRef(0);
  const pendingRemoteCartRef = useRef<string | null>(null);
  const cartRef = useRef(cart);
  const writeInFlightRef = useRef(false);
  cartRef.current = cart;

  const applyDraft = useCallback((draft: CartDraft | null, force = false) => {
    const remoteVersion = draft?.version || 0;
    if (!force && remoteVersion < versionRef.current) return;
    versionRef.current = remoteVersion;
    const nextCart = draft?.cart || [];
    pendingRemoteCartRef.current = JSON.stringify(nextCart);
    setCart(nextCart);
    if (tableId) onRemoteCart?.(tableId, nextCart);
    setLastSyncAt(new Date());
  }, [onRemoteCart, setCart, tableId]);

  const fetchDraft = useCallback(async (currentTableId: string) => {
    if (writeInFlightRef.current) return;
    const response = await fetch(`/api/pos/cart-draft?tableId=${encodeURIComponent(currentTableId)}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Không tải được giỏ hàng dùng chung.');
    applyDraft(result.draft, versionRef.current === 0);
  }, [applyDraft]);

  useEffect(() => {
    if (!tableId) {
      setStatus('disabled');
      versionRef.current = 0;
      pendingRemoteCartRef.current = null;
      return;
    }

    let active = true;
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
        setStatus(connectionStatus === 'SUBSCRIBED' ? 'connected' : 'offline');
        console.info('[POS Realtime]', {
          channel: `pos-cart-draft:${tableId}`,
          status: connectionStatus,
          timestamp: new Date().toISOString(),
        });
      });

    setStatus('loading');
    fetchDraft(tableId).catch((error) => {
      console.error('Load shared cart draft failed:', error);
      if (active) setStatus('offline');
    });

    const fallback = window.setInterval(() => {
      fetchDraft(tableId).catch((error) => console.error('Refresh shared cart draft failed:', error));
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(fallback);
      void client.removeChannel(channel);
    };
  }, [applyDraft, fetchDraft, tableId]);

  const debounceTimerRef = useRef<number | null>(null);

  const cancelPendingAutosave = useCallback(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!tableId) return;
    const cartSnapshot = JSON.stringify(cart);
    if (pendingRemoteCartRef.current === cartSnapshot) {
      pendingRemoteCartRef.current = null;
      return;
    }

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(async () => {
      writeInFlightRef.current = true;
      try {
        const response = await fetch('/api/pos/cart-draft', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableId,
            cart: cartRef.current,
            expectedVersion: versionRef.current,
          }),
        });
        const result = await response.json();
        if (response.status === 409) {
          setStatus('conflict');
          writeInFlightRef.current = false;
          await fetchDraft(tableId);
          return;
        }
        if (!response.ok || !result.success) throw new Error(result.error || 'Không lưu được giỏ hàng dùng chung.');
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
  }, [cart, fetchDraft, tableId]);

  const clearDraft = useCallback(async () => {
    cancelPendingAutosave();
    if (!tableId) return;
    const response = await fetch(`/api/pos/cart-draft?tableId=${encodeURIComponent(tableId)}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Không xóa được giỏ hàng dùng chung.');
    versionRef.current = 0;
  }, [cancelPendingAutosave, tableId]);

  return { status, realtimeStatus, lastSyncAt, clearDraft, cancelPendingAutosave };
}
