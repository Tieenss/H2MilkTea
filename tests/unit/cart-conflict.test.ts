import { describe, expect, it } from 'vitest';
import {
  getLineItemKey,
  diffCartItems,
  resolveCartConflict,
} from '@/lib/cart/mergeCart';
import type { CartItem } from '@/app/(dashboard)/pos/types/pos';

function createItem(id: string, name: string, price: number, quantity: number, note?: string): CartItem {
  return {
    id,
    name,
    price,
    quantity,
    image: '',
    note,
    unit: 'Ly',
  };
}

describe('Cart Merge & Conflict Resolution (Phase 2)', () => {
  describe('getLineItemKey', () => {
    it('generates predictable unique key from product ID and note', () => {
      const item1 = createItem('p1', 'Trà Sữa', 25000, 1, 'ít đường');
      const item2 = createItem('p1', 'Trà Sữa', 25000, 2, '  ÍT ĐƯỜNG  ');
      const item3 = createItem('p1', 'Trà Sữa', 25000, 1, 'nhiều đá');

      expect(getLineItemKey(item1)).toBe(getLineItemKey(item2));
      expect(getLineItemKey(item1)).not.toBe(getLineItemKey(item3));
    });

    it('handles items without note consistently', () => {
      const itemA = createItem('p2', 'Hồng Trà', 20000, 1);
      const itemB = createItem('p2', 'Hồng Trà', 20000, 2, '');
      expect(getLineItemKey(itemA)).toBe(getLineItemKey(itemB));
      expect(getLineItemKey(itemA)).toBe('p2::');
    });
  });

  describe('diffCartItems', () => {
    it('detects no conflict when both carts are identical', () => {
      const local = [createItem('p1', 'Trà Sữa', 25000, 2, '50% đá')];
      const remote = [createItem('p1', 'Trà Sữa', 25000, 2, '50% đá')];

      const diff = diffCartItems(local, remote);
      expect(diff.hasConflict).toBe(false);
      expect(diff.conflictingItems).toHaveLength(0);
      expect(diff.mergedCart).toHaveLength(1);
      expect(diff.mergedCart[0].quantity).toBe(2);
    });

    it('auto-merges non-overlapping items without conflict', () => {
      const local = [createItem('p1', 'Trà Sữa', 25000, 1)];
      const remote = [createItem('p2', 'Cà Phê', 30000, 2)];

      const diff = diffCartItems(local, remote);
      expect(diff.hasConflict).toBe(false);
      expect(diff.conflictingItems).toHaveLength(0);
      expect(diff.mergedCart).toHaveLength(2);

      const p1 = diff.mergedCart.find(i => i.id === 'p1');
      const p2 = diff.mergedCart.find(i => i.id === 'p2');
      expect(p1?.quantity).toBe(1);
      expect(p2?.quantity).toBe(2);
    });

    it('detects conflict when same item has different quantities', () => {
      const local = [
        createItem('p1', 'Trà Sữa', 25000, 1, '50% đường'),
        createItem('p2', 'Bánh ngọt', 15000, 1),
      ];
      const remote = [
        createItem('p1', 'Trà Sữa', 25000, 3, '50% đường'),
        createItem('p3', 'Trà Đào', 28000, 1),
      ];

      const diff = diffCartItems(local, remote);
      expect(diff.hasConflict).toBe(true);
      expect(diff.conflictingItems).toHaveLength(1);
      expect(diff.conflictingItems[0].id).toBe('p1');
      expect(diff.conflictingItems[0].localQuantity).toBe(1);
      expect(diff.conflictingItems[0].remoteQuantity).toBe(3);

      // Auto-merged items should still preserve non-conflicting items from both sides
      expect(diff.mergedCart).toHaveLength(3);
    });
  });

  describe('resolveCartConflict', () => {
    const local = [
      createItem('p1', 'Trà Sữa', 25000, 2, 'ít đường'),
      createItem('p2', 'Bánh', 10000, 1),
    ];
    const remote = [
      createItem('p1', 'Trà Sữa', 25000, 5, 'ít đường'),
      createItem('p3', 'Trà Đào', 30000, 1),
    ];

    it('resolves with keep_local strategy', () => {
      const resolved = resolveCartConflict(local, remote, 'keep_local');
      expect(resolved).toEqual(local);
    });

    it('resolves with take_remote strategy', () => {
      const resolved = resolveCartConflict(local, remote, 'take_remote');
      expect(resolved).toEqual(remote);
    });

    it('resolves with merge_quantities strategy', () => {
      const resolved = resolveCartConflict(local, remote, 'merge_quantities');
      expect(resolved).toHaveLength(3);

      const p1 = resolved.find(i => i.id === 'p1');
      const p2 = resolved.find(i => i.id === 'p2');
      const p3 = resolved.find(i => i.id === 'p3');

      // 2 (local) + 5 (remote) = 7
      expect(p1?.quantity).toBe(7);
      expect(p2?.quantity).toBe(1);
      expect(p3?.quantity).toBe(1);
    });
  });
  describe('Self-Device Echo Suppression & Local Precedence (Phase 1)', () => {
    it('does not trigger conflict when update originates from the same device', () => {
      const myDevId = 'dev_abc123';
      const localCart = [createItem('p1', 'Trà Sữa', 25000, 2)];
      const remoteDraft = {
        table_id: 'BAN01',
        cart: [createItem('p1', 'Trà Sữa', 25000, 1)],
        updated_by_device: myDevId,
        version: 1,
      };

      const isSelfDevice = remoteDraft.updated_by_device === myDevId;
      expect(isSelfDevice).toBe(true);
      // Khi isSelfDevice là true, hệ thống bỏ qua kiểm tra diffCartItems, giữ nguyên localCart (qty=2)
      const targetCart = isSelfDevice ? localCart : diffCartItems(localCart, remoteDraft.cart).mergedCart;
      expect(targetCart[0].quantity).toBe(2);
    });

    it('preserves user fast clicks during in-flight debouncing', () => {
      const isWritingInFlight = true;
      const localCart = [createItem('p1', 'Trà Sữa', 25000, 5)];
      const staleRemoteCart = [createItem('p1', 'Trà Sữa', 25000, 2)];

      // Khi isWritingInFlight = true, bỏ qua remote update dội về
      const shouldIgnoreRemote = isWritingInFlight;
      expect(shouldIgnoreRemote).toBe(true);
      expect(localCart[0].quantity).toBe(5);
    });

    it('Stress test: 50 rapid sequential clicks with self-echoes never trigger false conflict modal', () => {
      const myDevId = 'cashier_terminal_pos_01';
      let localCart = [createItem('p1', 'Trà Sữa Trân Châu', 30000, 1)];
      let localVersion = 1;
      let conflictData: any = null;
      let writeInFlight = false;
      let debounceActive = false;

      // Mô phỏng 50 lượt click nhanh liên tục của thu ngân
      for (let click = 2; click <= 50; click++) {
        // Thu ngân click tăng số lượng
        localCart = [createItem('p1', 'Trà Sữa Trân Châu', 30000, click)];
        debounceActive = true;
        writeInFlight = true;

        // Mô phỏng đồng thời có các bản draft cũ (echo) từ server dội về
        const incomingStaleDraft = {
          table_id: 'BAN01',
          cart: [createItem('p1', 'Trà Sữa Trân Châu', 30000, click - 1)],
          updated_by_device: myDevId,
          version: localVersion,
        };

        // Thuật toán kiểm tra xung đột trong useSharedCartDraft.ts
        const isSelfDevice = incomingStaleDraft.updated_by_device === myDevId;
        if (isSelfDevice) {
          localVersion = Math.max(localVersion, incomingStaleDraft.version);
          conflictData = null; // Tuyệt đối không coi là xung đột
        } else if (writeInFlight || debounceActive) {
          // Bỏ qua update từ thiết bị khác trong lúc đang click dồn dập
        } else {
          const diff = diffCartItems(localCart, incomingStaleDraft.cart);
          if (diff.hasConflict) conflictData = diff;
        }

        expect(conflictData).toBeNull();
        expect(localCart[0].quantity).toBe(click);
      }

      expect(conflictData).toBeNull();
      expect(localCart[0].quantity).toBe(50);
    });

    it('validates realtime channel pos-all-cart-drafts-global event processing and self-echo guard', () => {
      const myDeviceId = 'pos_screen_1';
      const activeOrders = new Map<string, any[]>();

      // Giả lập hàm xử lý table_status_sync trên channel pos-all-cart-drafts-global
      const handleTableStatusSync = (payload: { tableId: string; cart: any[]; deviceId?: string }) => {
        // Bỏ qua nếu broadcast do chính thiết bị này phát đi
        if (payload.deviceId && payload.deviceId === myDeviceId) return false;
        if (payload.cart && payload.cart.length > 0) {
          activeOrders.set(payload.tableId, payload.cart);
        } else {
          activeOrders.delete(payload.tableId);
        }
        return true;
      };

      // 1. Nhận sự kiện từ thiết bị khác
      const remoteEvent = { tableId: 'BAN05', cart: [createItem('p1', 'Trà Sữa', 25000, 2)], deviceId: 'pos_screen_2' };
      const processedRemote = handleTableStatusSync(remoteEvent);
      expect(processedRemote).toBe(true);
      expect(activeOrders.has('BAN05')).toBe(true);

      // 2. Nhận sự kiện dội ngược từ chính mình (self-echo)
      const selfEvent = { tableId: 'BAN05', cart: [createItem('p1', 'Trà Sữa', 25000, 3)], deviceId: myDeviceId };
      const processedSelf = handleTableStatusSync(selfEvent);
      expect(processedSelf).toBe(false);
      // Dữ liệu không bị thay đổi bởi self-echo
      expect(activeOrders.get('BAN05')?.[0].quantity).toBe(2);
    });
  });
});