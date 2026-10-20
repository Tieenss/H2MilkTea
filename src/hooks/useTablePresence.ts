'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ParticipantPresence {
  role: 'pos' | 'customer_qr';
  tableId: string | null;
  actorName?: string;
  itemCount?: number;
  updatedAt: number;
}

export interface TablePresenceSummary {
  cashiers: string[];
  customerCount: number;
  customerItemCount: number;
}

interface UseTablePresenceOptions {
  role: 'pos' | 'customer_qr';
  tableId: string | null;
  actorName?: string;
  itemCount?: number;
}

export function useTablePresence({
  role,
  tableId,
  actorName,
  itemCount = 0,
}: UseTablePresenceOptions) {
  const [presenceByTable, setPresenceByTable] = useState<Map<string, TablePresenceSummary>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const optionsRef = useRef({ role, tableId, actorName, itemCount });
  optionsRef.current = { role, tableId, actorName, itemCount };

  const computeSummary = useCallback((state: Record<string, unknown[]>) => {
    const summaryMap = new Map<string, TablePresenceSummary>();

    Object.values(state).forEach((presences) => {
      if (!Array.isArray(presences)) return;
      presences.forEach((p) => {
        const item = p as Partial<ParticipantPresence>;
        const tId = item.tableId;
        if (!tId) return;

        if (!summaryMap.has(tId)) {
          summaryMap.set(tId, {
            cashiers: [],
            customerCount: 0,
            customerItemCount: 0,
          });
        }

        const current = summaryMap.get(tId)!;
        if (item.role === 'pos') {
          const name = item.actorName || 'Thu ngân';
          if (!current.cashiers.includes(name)) {
            current.cashiers.push(name);
          }
        } else if (item.role === 'customer_qr') {
          current.customerCount += 1;
          current.customerItemCount += Number(item.itemCount) || 0;
        }
      });
    });

    setPresenceByTable(summaryMap);
  }, []);

  useEffect(() => {
    let client: ReturnType<typeof createClient>;
    try {
      client = createClient();
    } catch {
      // Supabase chưa cấu hình hoặc trong môi trường test
      return;
    }

    let active = true;
    const channelName = 'pos-table-presence';
    const channel = client.channel(channelName);
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        if (!active) return;
        const state = channel.presenceState();
        computeSummary(state);
      })
      .on('presence', { event: 'join' }, () => {
        if (!active) return;
        computeSummary(channel.presenceState());
      })
      .on('presence', { event: 'leave' }, () => {
        if (!active) return;
        computeSummary(channel.presenceState());
      })
      .subscribe(async (status) => {
        if (!active) return;
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          try {
            await channel.track({
              role: optionsRef.current.role,
              tableId: optionsRef.current.tableId,
              actorName: optionsRef.current.actorName,
              itemCount: optionsRef.current.itemCount,
              updatedAt: Date.now(),
            });
          } catch {
            // Không làm gián đoạn UI nếu track lỗi
          }
        } else {
          setIsConnected(false);
        }
      });

    return () => {
      active = false;
      channelRef.current = null;
      void client.removeChannel(channel);
    };
  }, [computeSummary]);

  // Cập nhật thông tin khi tableId hoặc itemCount thay đổi
  useEffect(() => {
    if (!channelRef.current || !isConnected) return;
    try {
      void channelRef.current.track({
        role,
        tableId,
        actorName,
        itemCount,
        updatedAt: Date.now(),
      });
    } catch {
      // Bỏ qua lỗi track phụ
    }
  }, [role, tableId, actorName, itemCount, isConnected]);

  return {
    presenceByTable,
    isConnected,
  };
}
