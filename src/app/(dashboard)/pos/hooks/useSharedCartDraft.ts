'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CartItem } from '../types/pos';
import { createClient } from '@/lib/supabase/client';

interface CartDraft {
  table_id: string;
  cart: CartItem[];
  version: number;
}

interface UseSharedCartDraftOptions {
  tableId: string | null;
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  onRemoteCart?: (tableId: string, cart: CartItem[]) => void;
}

export function useSharedCartDraft({ tableId, cart, setCart, onRemoteCart }: UseSharedCartDraftOptions) {
  const [status, setStatus] = useState<'disabled' | 'loading' | 'connected' | 'offline' | 'conflict'>('disabled');
  const versionRef = useRef(0);
  const ignoreNextPublishRef = useRef(false);
  const cartRef = useRef(cart);
  cartRef.current = cart;

  const applyDraft = useCallback((draft: CartDraft | null) => {
    versionRef.current = draft?.version || 0;
    ignoreNextPublishRef.current = true;
    const nextCart = draft?.cart || [];
    setCart(nextCart);
    if (tableId) onRemoteCart?.(tableId, nextCart);
  }, [onRemoteCart, setCart, tableId]);

  const fetchDraft = useCallback(async (currentTableId: string) => {
    const response = await fetch(`/api/pos/cart-draft?tableId=${encodeURIComponent(currentTableId)}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Không tải được giỏ hàng dùng chung.');
    applyDraft(result.draft);
  }, [applyDraft]);

  useEffect(() => {
    if (!tableId) {
      setStatus('disabled');
      versionRef.current = 0;
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
          if (payload.eventType === 'DELETE') applyDraft(null);
          return;
        }
        applyDraft(payload.new as CartDraft);
      })
      .subscribe((connectionStatus) => {
        if (!active) return;
        setStatus(connectionStatus === 'SUBSCRIBED' ? 'connected' : 'offline');
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

  useEffect(() => {
    if (!tableId) return;
    if (ignoreNextPublishRef.current) {
      ignoreNextPublishRef.current = false;
      return;
    }

    const timeout = window.setTimeout(async () => {
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
          await fetchDraft(tableId);
          return;
        }
        if (!response.ok || !result.success) throw new Error(result.error || 'Không lưu được giỏ hàng dùng chung.');
        versionRef.current = result.draft.version;
        setStatus('connected');
      } catch (error) {
        console.error('Save shared cart draft failed:', error);
        setStatus('offline');
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [cart, fetchDraft, tableId]);

  const clearDraft = useCallback(async () => {
    if (!tableId) return;
    const response = await fetch(`/api/pos/cart-draft?tableId=${encodeURIComponent(tableId)}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Không xóa được giỏ hàng dùng chung.');
    versionRef.current = 0;
  }, [tableId]);

  return { status, clearDraft };
}
