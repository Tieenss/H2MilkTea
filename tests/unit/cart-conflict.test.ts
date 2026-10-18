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
});
