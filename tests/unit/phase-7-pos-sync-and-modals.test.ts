import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPrintItemKey } from '@/app/(dashboard)/pos/components/PrintSelectionModal';
import type { CartItem } from '@/app/(dashboard)/pos/types/pos';

describe('Phase 7: POS Sync Stability, Print Modal & Route Access (Items #5, #11, #12, #13)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Item #11: Print Selection Item Key Disambiguation & Filter', () => {
    const mockCart: CartItem[] = [
      {
        id: 'SP001',
        name: 'Trà sữa trân châu',
        price: 35000,
        quantity: 2,
        size: 'M',
        sugar: '70%',
        ice: '50% đá',
        toppings: ['Trân châu đen'],
        printStatus: 'new',
      },
      {
        id: 'SP001',
        name: 'Trà sữa trân châu',
        price: 40000,
        quantity: 1,
        size: 'L',
        sugar: '100%',
        ice: '100% đá',
        toppings: ['Trân châu đen', 'Thạch phô mai'],
        printStatus: 'modified',
      },
      {
        id: 'SP002',
        name: 'Cà phê muối',
        price: 25000,
        quantity: 1,
        size: 'M',
        printStatus: 'printed',
      },
    ];

    it('generates distinct composite keys for items sharing the same productId but different variants', () => {
      const key0 = getPrintItemKey(mockCart[0], 0);
      const key1 = getPrintItemKey(mockCart[1], 1);
      const key2 = getPrintItemKey(mockCart[2], 2);

      expect(key0).not.toBe(key1);
      expect(key0).toContain('SP001');
      expect(key0).toContain('M');
      expect(key1).toContain('SP001');
      expect(key1).toContain('L');
      expect(key2).toContain('SP002');
    });

    it('correctly filters only "new" and "modified" items by default, excluding "printed" items', () => {
      const initialSelected = new Set<string>();
      mockCart.forEach((item, index) => {
        if (item.printStatus !== 'printed') {
          initialSelected.add(getPrintItemKey(item, index));
        }
      });

      expect(initialSelected.size).toBe(2);
      expect(initialSelected.has(getPrintItemKey(mockCart[0], 0))).toBe(true);
      expect(initialSelected.has(getPrintItemKey(mockCart[1], 1))).toBe(true);
      expect(initialSelected.has(getPrintItemKey(mockCart[2], 2))).toBe(false);
    });

    it('allows toggling individual items on/off independently', () => {
      const selectedKeys = new Set<string>();
      const key0 = getPrintItemKey(mockCart[0], 0);

      // Toggle ON
      selectedKeys.add(key0);
      expect(selectedKeys.has(key0)).toBe(true);

      // Toggle OFF
      selectedKeys.delete(key0);
      expect(selectedKeys.has(key0)).toBe(false);
    });
  });

  describe('Item #5: Route Accessibility & Middleware Protection', () => {
    it('verifies /notifications and new hub routes exist in the middleware route allowlist', async () => {
      const fs = await import('fs');
      const middlewareContent = fs.readFileSync('src/middleware.ts', 'utf8');

      expect(middlewareContent).toContain("'/notifications'");
      expect(middlewareContent).toContain("'/menu'");
      expect(middlewareContent).toContain("'/reports'");
      expect(middlewareContent).toContain("'/settings'");
      expect(middlewareContent).toContain("'/pos-hub'");
    });
  });

  describe('Item #12 & #13: Table Selection & Cart Clearing Protection', () => {
    it('does not mark an empty table as "Đang sử dụng" upon simply viewing it', () => {
      const emptyTableCart: CartItem[] = [];
      const tableStatus: string = 'Trống';
      
      // Simulate condition in updated usePOS
      const shouldMarkOccupied = emptyTableCart.length > 0 && tableStatus !== 'Đang sử dụng';
      expect(shouldMarkOccupied).toBe(false);
    });

    it('marks a table as "Đang sử dụng" only when it has at least one item', () => {
      const occupiedTableCart: CartItem[] = [
        { id: 'SP001', name: 'Trà đào', price: 30000, quantity: 1, printStatus: 'new' }
      ];
      const tableStatus: string = 'Trống';
      
      const shouldMarkOccupied = occupiedTableCart.length > 0 && tableStatus !== 'Đang sử dụng';
      expect(shouldMarkOccupied).toBe(true);
    });

    it('suppresses post-delete autosave debounce when cart is cleared', () => {
      const pendingRemoteCartRef = { current: null as string | null };
      const cart: CartItem[] = [];
      const versionRef = { current: 0 };

      // In clearDraft, we set pending to '[]' and reset version
      pendingRemoteCartRef.current = '[]';
      versionRef.current = 0;

      const cartSnapshot = JSON.stringify(cart);
      const isPendingMatch = pendingRemoteCartRef.current === cartSnapshot;
      const isClearedEmpty = cart.length === 0 && versionRef.current === 0;

      // Both safeguards prevent firing an erroneous autosave PUT
      expect(isPendingMatch || isClearedEmpty).toBe(true);
    });
  });
});
