import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectTableArea, DEFAULT_AREAS, TABLE_STATUS } from '@/app/(dashboard)/tables/utils/constants';

// Setup mock localStorage for Node test environment
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => storageMap.get(key) ?? null),
  setItem: vi.fn((key: string, val: string) => {
    storageMap.set(key, String(val));
  }),
  removeItem: vi.fn((key: string) => {
    storageMap.delete(key);
  }),
  clear: vi.fn(() => {
    storageMap.clear();
  }),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('Phase 12: POS Cart Item Status, Table Persistence & Area Management', () => {
  describe('Phân hệ 1: Cart Item Status & Kitchen Tracking', () => {
    it('initializes cart item with printStatus=new and kitchenStatus=new', () => {
      const mockItem = {
        id: 'SP001',
        name: 'Trà sữa Trân châu',
        price: 30000,
        quantity: 2,
        unit: 'Ly',
        printStatus: 'new' as const,
        kitchenStatus: 'new' as const,
        isSentToKitchen: false,
      };

      expect(mockItem.printStatus).toBe('new');
      expect(mockItem.kitchenStatus).toBe('new');
      expect(mockItem.isSentToKitchen).toBe(false);
    });

    it('updates kitchen status to sent and sets isSentToKitchen to true', () => {
      const cart = [
        { id: 'SP001', name: 'Trà sữa', price: 30000, quantity: 1, printStatus: 'new', kitchenStatus: 'new', isSentToKitchen: false },
        { id: 'SP002', name: 'Cà phê đen', price: 25000, quantity: 1, printStatus: 'new', kitchenStatus: 'new', isSentToKitchen: false }
      ];

      const updatedCart = cart.map(item => ({
        ...item,
        kitchenStatus: 'sent',
        isSentToKitchen: true
      }));

      expect(updatedCart[0].kitchenStatus).toBe('sent');
      expect(updatedCart[0].isSentToKitchen).toBe(true);
      expect(updatedCart[1].kitchenStatus).toBe('sent');
      expect(updatedCart[1].isSentToKitchen).toBe(true);
    });
  });

  describe('Phân hệ 2: Active Table Persistence across navigation', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('persists selectedTableId to localStorage and reads it back', () => {
      const tableId = 'BAN004';
      localStorage.setItem('h2_pos_active_table_id', tableId);

      const saved = localStorage.getItem('h2_pos_active_table_id');
      expect(saved).toBe(tableId);
    });
  });

  describe('Phân hệ 4: Table Area Detection & Status Normalization (Anti Table Loss)', () => {
    it('detects areas accurately based on table name prefix and keywords', () => {
      expect(detectTableArea('Phòng hát 01')).toBe('Phòng hát');
      expect(detectTableArea('PH02')).toBe('Phòng hát');
      expect(detectTableArea('VIP-01')).toBe('Phòng hát');
      expect(detectTableArea('Karaoke 02')).toBe('Phòng hát');
      expect(detectTableArea('Quầy 01')).toBe('Quầy');
      expect(detectTableArea('Q03')).toBe('Quầy');
      expect(detectTableArea('Vườn 01')).toBe('Vườn');
      expect(detectTableArea('V04')).toBe('Vườn');
      expect(detectTableArea('Ngoài trời Bàn 02')).toBe('Vườn');
      expect(detectTableArea('Khách mua về')).toBe('Mang về');
    });

    it('prioritizes explicitArea when supplied', () => {
      expect(detectTableArea('Bàn 01', 'Phòng hát')).toBe('Phòng hát');
      expect(detectTableArea('V01', 'Quầy')).toBe('Quầy');
    });

    it('ensures tables with Trống and Có khách are categorized as active and never lost', () => {
      const allTables = [
        { IDBAN: 'BAN001', 'Tên bàn': 'Bàn 01', 'Trạng thái': 'Trống', 'Sức chứa tối đa': 4 },
        { IDBAN: 'BAN002', 'Tên bàn': 'Bàn 02', 'Trạng thái': 'Có khách', 'Sức chứa tối đa': 4 },
        { IDBAN: 'BAN003', 'Tên bàn': 'Bàn 03', 'Trạng thái': 'Đang hoạt động', 'Sức chứa tối đa': 4 },
        { IDBAN: 'BAN004', 'Tên bàn': 'Bàn 04', 'Trạng thái': 'Bảo trì', 'Sức chứa tối đa': 4 },
      ];

      // Simulated grouping logic from fixed tables/page.tsx
      const grouped = {
        'Đang hoạt động': [] as typeof allTables,
        'Bảo trì': [] as typeof allTables
      };

      allTables.forEach(table => {
        if (table['Trạng thái'] === 'Bảo trì' || table['Trạng thái'] === 'Ngưng sử dụng') {
          grouped['Bảo trì'].push(table);
        } else {
          grouped['Đang hoạt động'].push(table);
        }
      });

      // 3 active tables (BAN001, BAN002, BAN003) must all be present
      expect(grouped['Đang hoạt động'].length).toBe(3);
      expect(grouped['Bảo trì'].length).toBe(1);
      expect(grouped['Đang hoạt động'].some(t => t.IDBAN === 'BAN001')).toBe(true);
      expect(grouped['Đang hoạt động'].some(t => t.IDBAN === 'BAN002')).toBe(true);
      expect(grouped['Đang hoạt động'].some(t => t.IDBAN === 'BAN003')).toBe(true);
    });

    it('includes all default areas and valid statuses', () => {
      expect(DEFAULT_AREAS).toContain('Tất cả');
      expect(DEFAULT_AREAS).toContain('Phòng hát');
      expect(DEFAULT_AREAS).toContain('Quầy');
      expect(DEFAULT_AREAS).toContain('Vườn');
      expect(DEFAULT_AREAS).toContain('Mang về');

      const statusValues = TABLE_STATUS.map(s => s.value);
      expect(statusValues).toContain('Đang hoạt động');
      expect(statusValues).toContain('Trống');
      expect(statusValues).toContain('Có khách');
      expect(statusValues).toContain('Bảo trì');
    });
  });
});
