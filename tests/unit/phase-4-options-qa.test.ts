import { describe, it, expect } from 'vitest';
import { getLineItemKey, diffCartItems } from '@/lib/cart/mergeCart';
import { matchRuleBased } from '@/lib/ai/ruleEngine';
import {
  POS_KNOWLEDGE_BASE,
  formatCitation,
  appendCitationIfMissing,
  findRelevantKnowledge,
} from '@/lib/ai/knowledge';
import type { CartItem } from '@/app/(dashboard)/pos/types/pos';

describe('Phase 4: Item Options & User Guide Citations', () => {
  describe('1. Line Item Key with Options (Size, Sugar, Ice, Toppings)', () => {
    const baseItem: CartItem = {
      id: 'SP001',
      name: 'Trà Sữa Trân Châu',
      price: 30000,
      quantity: 1,
      unit: 'Ly',
      image: '',
    };

    it('generates identical key for items without options (backward compatibility)', () => {
      const item1 = { ...baseItem, note: 'ít ngọt' };
      const item2 = { ...baseItem, note: '  ÍT NGỌT  ' };
      expect(getLineItemKey(item1)).toBe(getLineItemKey(item2));
      expect(getLineItemKey(item1)).toBe('SP001::ít ngọt');
    });

    it('differentiates items with different sizes', () => {
      const itemSizeM = { ...baseItem, size: 'M' };
      const itemSizeL = { ...baseItem, size: 'L' };
      expect(getLineItemKey(itemSizeM)).not.toBe(getLineItemKey(itemSizeL));
      expect(getLineItemKey(itemSizeM)).toContain('size=M');
      expect(getLineItemKey(itemSizeL)).toContain('size=L');
    });

    it('differentiates items with different sugar levels', () => {
      const item50 = { ...baseItem, size: 'M', sugar: '50%' };
      const item100 = { ...baseItem, size: 'M', sugar: '100%' };
      expect(getLineItemKey(item50)).not.toBe(getLineItemKey(item100));
      expect(getLineItemKey(item50)).toContain('sugar=50%');
      expect(getLineItemKey(item100)).toContain('sugar=100%');
    });

    it('differentiates items with different ice levels', () => {
      const itemNoIce = { ...baseItem, ice: 'không đá' };
      const itemLessIce = { ...baseItem, ice: 'ít đá' };
      expect(getLineItemKey(itemNoIce)).not.toBe(getLineItemKey(itemLessIce));
    });

    it('sorts toppings so key is deterministic regardless of array order', () => {
      const itemOrderA = {
        ...baseItem,
        toppings: ['Trân Châu Đen', 'Thạch Củ Năng'],
      };
      const itemOrderB = {
        ...baseItem,
        toppings: ['Thạch Củ Năng', 'Trân Châu Đen'],
      };
      expect(getLineItemKey(itemOrderA)).toBe(getLineItemKey(itemOrderB));
    });

    it('keeps two cups with same product but different options in separate lines during cart merge', () => {
      const cupM = { ...baseItem, size: 'M', sugar: '50%', ice: 'ít đá', quantity: 1 };
      const cupL = { ...baseItem, size: 'L', sugar: '100%', ice: 'nhiều đá', quantity: 1 };

      const diff = diffCartItems([cupM], [cupL]);
      expect(diff.hasConflict).toBe(false);
      expect(diff.mergedCart.length).toBe(2);
      expect(diff.mergedCart.find((i) => i.size === 'M')?.quantity).toBe(1);
      expect(diff.mergedCart.find((i) => i.size === 'L')?.quantity).toBe(1);
    });
  });

  describe('2. Rule Engine Option Extraction', () => {
    const mockCatalog = [
      { id: 'SP001', name: 'Trà Sữa Topping Thạch Củ Năng', price: 35000, category: 'Trà sữa' },
      { id: 'SP002', name: 'Cafe Sữa Đá', price: 25000, category: 'Cà phê' },
    ];
    const mockTables = [{ id: 'b1', name: 'Bàn 1' }, { id: 'b2', name: 'Bàn 2' }];

    it('extracts size, sugar, and ice properly from natural language', () => {
      const result = matchRuleBased('cho 2 trà sữa nướng size L 50% đường ít đá vào bàn 1', mockCatalog, mockTables);
      expect(result.matched).toBe(true);
      expect(result.output?.action).toBe('add');
      expect(result.output?.targetTable?.name).toBe('Bàn 1');
      expect(result.output?.items.length).toBe(1);

      const parsed = result.output?.items[0];
      expect(parsed?.productId).toBe('SP001');
      expect(parsed?.quantity).toBe(2);
      expect(parsed?.size).toBe('L');
      expect(parsed?.sugar).toBe('50%');
      expect(parsed?.ice).toBe('ít đá');
    });

    it('extracts toppings when mentioned', () => {
      const result = matchRuleBased('1 trà sữa nướng thêm trân châu đen', mockCatalog, mockTables);
      expect(result.matched).toBe(true);
      const parsed = result.output?.items[0];
      expect(parsed?.toppings).toBeDefined();
      expect(parsed?.toppings?.some((t) => t.includes('tran chau'))).toBe(true);
    });
  });

  describe('3. User Guide QA Citations', () => {
    it('every knowledge topic in POS_KNOWLEDGE_BASE has sectionId and sectionTitle', () => {
      const validSectionIds = [
        'introduction',
        'login',
        'pos',
        'orders',
        'customers',
        'menu',
        'reports',
        'settings',
        'shortcuts',
        'mobile',
        'troubleshooting',
        'support',
        'ai-assistant',
      ];

      for (const topic of POS_KNOWLEDGE_BASE) {
        expect(topic.sectionId).toBeDefined();
        expect(validSectionIds).toContain(topic.sectionId);
        expect(topic.sectionTitle).toBeDefined();
        expect(topic.sectionTitle.length).toBeGreaterThan(0);
      }
    });

    it('formatCitation outputs standard markdown link with anchor hash', () => {
      const citation = formatCitation('Cài đặt hệ thống', 'settings');
      expect(citation).toBe('[Nguồn: Hướng dẫn sử dụng > Cài đặt hệ thống](/user-guide#settings)');
    });

    it('appendCitationIfMissing appends appropriate source citation if missing', () => {
      const rawAnswer = 'Để cài máy in, bạn vào Cài đặt in hóa đơn và chọn khổ K80.';
      const topic = findRelevantKnowledge('cách cài đặt máy in');
      expect(topic).not.toBeNull();
      const withCitation = appendCitationIfMissing(rawAnswer, topic);

      expect(withCitation).toContain(rawAnswer);
      expect(withCitation).toContain('[Nguồn: Hướng dẫn sử dụng > Cài đặt hệ thống](/user-guide#settings)');
    });

    it('appendCitationIfMissing does not duplicate citation if already present', () => {
      const rawWithCitation = 'Xem danh sách phím tắt.\n\n[Nguồn: Hướng dẫn sử dụng > Phím tắt](/user-guide#shortcuts)';
      const topic = findRelevantKnowledge('phím tắt');
      const result = appendCitationIfMissing(rawWithCitation, topic);
      expect(result).toBe(rawWithCitation);
    });
  });
});
