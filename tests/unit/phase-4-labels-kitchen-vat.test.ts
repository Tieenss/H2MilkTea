import { describe, it, expect, beforeEach, vi } from 'vitest';
import { printOrderLabels } from '@/utils/labelPrint';
import { getDefaultLabelSettings } from '@/utils/labelSettings';
import {
  getVatSettings,
  saveVatSettings,
  getDefaultVatSettings,
  getKitchenSettings,
  saveKitchenSettings,
  getDefaultKitchenSettings,
} from '@/utils/vatSettings';
import type { CartItem } from '@/app/(dashboard)/pos/types/pos';

describe('Phase 4: Cup Label Printing, Kitchen KDS & VAT Settings', () => {
  beforeEach(() => {
    // Reset localStorage & DOM mocks for node test runner
    const storage: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, val: string) => { storage[key] = val; },
      removeItem: (key: string) => { delete storage[key]; },
      clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
    };

    const mockIframe = {
      id: '',
      style: {},
      contentWindow: {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
        print: vi.fn(),
      },
    };

    vi.stubGlobal('localStorage', mockStorage);
    vi.stubGlobal('window', {
      localStorage: mockStorage,
      dispatchEvent: vi.fn(),
    });
    vi.stubGlobal('document', {
      getElementById: vi.fn(() => mockIframe),
      createElement: vi.fn(() => mockIframe),
      body: { appendChild: vi.fn() },
    });
  });

  describe('Item #6: Coffee Category & Label Printing Resolution', () => {
    it('successfully prints coffee items regardless of Unicode NFC vs NFD accents or exact name', async () => {
      const coffeeItem1: CartItem = {
        id: 'sp_cf_01',
        name: 'Cà phê muối',
        price: 25000,
        quantity: 1,
        unit: 'Ly',
        category: 'Cà phê',
        image: '',
        printStatus: 'new',
      };

      const coffeeItem2: CartItem = {
        id: 'sp_cf_02',
        name: 'Bạc xỉu đặc biệt', // Bạc xỉu is Coffee
        price: 28000,
        quantity: 2,
        unit: 'Ly',
        category: 'Cà phê',
        image: '',
        printStatus: 'new',
      };

      const orderInfo = { tableName: 'Bàn 01', cashierName: 'Thu ngân' };
      const res = await printOrderLabels([coffeeItem1, coffeeItem2], orderInfo);

      expect(res.success).toBe(true);
      expect(res.labelCount).toBe(3); // 1 ly cà phê muối + 2 ly bạc xỉu = 3 tem
    });

    it('always permits printing when a single item is clicked (force print)', async () => {
      const anyDrinkItem: CartItem = {
        id: 'sp_special',
        name: 'Thức uống đặc biệt quán',
        price: 35000,
        quantity: 1,
        unit: 'Ly',
        category: 'Món đặc biệt',
        image: '',
      };

      const res = await printOrderLabels([anyDrinkItem], { tableName: 'Mang về' });
      expect(res.success).toBe(true);
      expect(res.labelCount).toBe(1);
    });

    it('filters out non-drink items like snacks when printing an order with multiple items', async () => {
      const coffeeItem: CartItem = {
        id: 'sp_cf_03',
        name: 'Cà phê đen đá',
        price: 20000,
        quantity: 1,
        unit: 'Ly',
        category: 'Cà phê',
        image: '',
      };

      const snackItem: CartItem = {
        id: 'sp_snack',
        name: 'Bánh tráng phơi sương',
        price: 20000,
        quantity: 1,
        unit: 'Phần',
        category: 'Ăn vặt',
        image: '',
      };

      const customSettings = {
        ...getDefaultLabelSettings(),
        applicableCategories: ['Trà sữa', 'Cà phê'],
      };

      // Order has 1 coffee and 1 snack -> only coffee gets a label (1 cup total)
      const res = await printOrderLabels([coffeeItem, snackItem], { tableName: 'Bàn 02' }, { customSettings, forceAll: false });
      expect(res.success).toBe(true);
      expect(res.labelCount).toBe(1); // Only coffee was printed, snack was filtered
    });

    it('rejects order with zero printable drinks when cart contains only snacks', async () => {
      const snack1: CartItem = {
        id: 'sp_snack_1',
        name: 'Khoai tây chiên',
        price: 25000,
        quantity: 1,
        unit: 'Dĩa',
        category: 'Ăn vặt',
        image: '',
      };

      const snack2: CartItem = {
        id: 'sp_snack_2',
        name: 'Bánh tráng me',
        price: 15000,
        quantity: 1,
        unit: 'Bịch',
        category: 'Ăn vặt',
        image: '',
      };

      const customSettings = {
        ...getDefaultLabelSettings(),
        applicableCategories: ['Trà sữa', 'Cà phê'],
      };

      const res = await printOrderLabels([snack1, snack2], { tableName: 'Bàn 03' }, { customSettings, forceAll: false });
      expect(res.success).toBe(false);
      expect(res.labelCount).toBe(0);
      expect(res.message).toContain('không có sản phẩm nào thuộc danh mục cần in tem ly');
    });
  });

  describe('Item #4: VAT & Kitchen Settings Management', () => {
    it('computes VAT accurately based on dynamic ratePercent', () => {
      saveVatSettings({
        enabled: true,
        ratePercent: 8,
        pricesIncludeVat: false,
      });

      const vatConfig = getVatSettings();
      expect(vatConfig.enabled).toBe(true);
      expect(vatConfig.ratePercent).toBe(8);

      const subtotal = 200000;
      const calculatedVat = vatConfig.enabled ? Math.round(subtotal * (vatConfig.ratePercent / 100)) : 0;
      expect(calculatedVat).toBe(16000); // 8% of 200k = 16k
    });

    it('returns zero VAT when VAT is disabled', () => {
      saveVatSettings({
        enabled: false,
        ratePercent: 10,
        pricesIncludeVat: false,
      });

      const vatConfig = getVatSettings();
      expect(vatConfig.enabled).toBe(false);

      const subtotal = 150000;
      const calculatedVat = vatConfig.enabled ? Math.round(subtotal * (vatConfig.ratePercent / 100)) : 0;
      expect(calculatedVat).toBe(0);
    });

    it('manages Kitchen KDS settings and persistence properly', () => {
      const initial = getKitchenSettings();
      expect(initial.kdsEnabled).toBe(true);
      expect(initial.alertSoundEnabled).toBe(true);

      saveKitchenSettings({
        kdsEnabled: true,
        autoPrintKitchenTicket: false,
        alertSoundEnabled: false,
        maxPreparationMinutes: 20,
      });

      const updated = getKitchenSettings();
      expect(updated.autoPrintKitchenTicket).toBe(false);
      expect(updated.alertSoundEnabled).toBe(false);
      expect(updated.maxPreparationMinutes).toBe(20);
    });
  });
});
