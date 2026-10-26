'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ParticipantPresence {
  role: 'pos' | 'customer_qr';
  tableId: string | null;
  actorName?: string;
  itemCount?: number;
  clientId?: string;
  updatedAt: number;
}

export interface TablePresenceSummary {
  cashiers: string[];
  posCount: number;
  customerCount: number;
  customerItemCount: number;
}

interface UseTablePresenceOptions {
  role: 'pos' | 'customer_qr';
  tableId: string | null;
  actorName?: string;
  itemCount?: number;
}

function getPresenceClientId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = window.sessionStorage.getItem('h2_presence_client_id');
    if (!id) {
      id = 'cli_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      window.sessionStorage.setItem('h2_presence_client_id', id);
    }
    return id;
  } catch {
    return 'cli_' + Math.random().toString(36).substring(2, 9);
  }
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
    const seenCustomerClientsByTable = new Map<string, Set<string>>();
    const seenPosClientsByTable = new Map<string, Set<string>>();

    Object.entries(state).forEach(([key, presences]) => {
      if (!Array.isArray(presences) || presences.length === 0) return;
      // Lấy bản ghi presence mới nhất của client key này
      const item = presences[presences.length - 1] as Partial<ParticipantPresence>;
      const tId = item.tableId;
      if (!tId) return;

      if (!summaryMap.has(tId)) {
        summaryMap.set(tId, {
          cashiers: [],
          posCount: 0,
          customerCount: 0,
          customerItemCount: 0,
        });
        seenCustomerClientsByTable.set(tId, new Set<string>());
        seenPosClientsByTable.set(tId, new Set<string>());
      }

      const current = summaryMap.get(tId)!;
      const seenCustClients = seenCustomerClientsByTable.get(tId)!;
      const seenPosClients = seenPosClientsByTable.get(tId)!;
      const cId = item.clientId || key;

      if (item.role === 'pos') {
        const name = item.actorName || 'Thu ngân';
        if (!current.cashiers.includes(name)) {
          current.cashiers.push(name);
        }
        if (!seenPosClients.has(cId)) {
          seenPosClients.add(cId);
          current.posCount += 1;
        }
      } else if (item.role === 'customer_qr') {
        if (!seenCustClients.has(cId)) {
          seenCustClients.add(cId);
          current.customerCount += 1;
          current.customerItemCount += Number(item.itemCount) || 0;
        }
      }
    });

    setPresenceByTable(summaryMap);
  }, []);

  useEffect(() => {
    let client: ReturnType<typeof createClient>;
    try {
      client = createClient();
    } catch {
      return;
    }

    let active = true;
    const clientId = getPresenceClientId();
    const channelName = 'pos-table-presence';
    const channel = client.channel(channelName, {
      config: {
        presence: { key: clientId },
      },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        if (!active) return;
        computeSummary(channel.presenceState());
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
              clientId,
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
      const clientId = getPresenceClientId();
      void channelRef.current.track({
        role,
        tableId,
        actorName,
        itemCount,
        clientId,
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
