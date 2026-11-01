import { describe, it, expect } from 'vitest';
import {
  normalizeVN,
  createProductSearchIndex,
  scoreProductMatch,
} from '@/app/(dashboard)/pos/hooks/useProducts';
import { getNormalizedPosItemKey } from '@/app/(dashboard)/pos/hooks/useCart';
import {
  DEFAULT_FEATURE_CONFIG,
  isFeatureEnabledForUser,
  type SystemFeaturesPayload,
} from '@/lib/settings/featureFlags';
import type { Product } from '@/app/(dashboard)/pos/types/pos';

const sampleProducts: Product[] = [
  {
    IDSP: 'SP001',
    'Tên sản phẩm': 'Trà sữa trân châu đường đen',
    'Loại sản phẩm': 'Trà sữa',
    'Đơn vị tính': 'Ly',
    'Đơn giá': '35000',
    'Hình ảnh': '',
    'Trạng thái': 'Còn hàng',
  },
  {
    IDSP: 'SP002',
    'Tên sản phẩm': 'Trà đào cam sả',
    'Loại sản phẩm': 'Trà trái cây',
    'Đơn vị tính': 'Ly',
    'Đơn giá': '32000',
    'Hình ảnh': '',
    'Trạng thái': 'Còn hàng',
  },
  {
    IDSP: 'SP003',
    'Tên sản phẩm': 'Cà phê sữa đá',
    'Loại sản phẩm': 'Cà phê',
    'Đơn vị tính': 'Ly',
    'Đơn giá': '25000',
    'Hình ảnh': '',
    'Trạng thái': 'Còn hàng',
  },
  {
    IDSP: 'SP004',
    'Tên sản phẩm': 'Bạc xỉu đá',
    'Loại sản phẩm': 'Cà phê',
    'Đơn vị tính': 'Ly',
    'Đơn giá': '28000',
    'Hình ảnh': '',
    'Trạng thái': 'Còn hàng',
  },
];

describe('POS Intelligent Fuzzy & Beverage Alias Search', () => {
  const indexes = sampleProducts.map(createProductSearchIndex);

  const search = (query: string) =>
    indexes
      .map(idx => ({ name: idx.product['Tên sản phẩm'], score: scoreProductMatch(idx, query) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(r => r.name);

  it('normalizes Vietnamese accents properly', () => {
    expect(normalizeVN('Trà sữa trân châu đường đen')).toBe('tra sua tran chau duong den');
  });

  it('matches unaccented keywords like "tran" and "tran chau"', () => {
    expect(search('tran')).toContain('Trà sữa trân châu đường đen');
    expect(search('tran chau')).toContain('Trà sữa trân châu đường đen');
  });

  it('matches fuzzy typos like "tan" or "tan chau" to "Trà sữa trân châu đường đen"', () => {
    expect(search('tan')).toContain('Trà sữa trân châu đường đen');
    expect(search('tan chau')).toContain('Trà sữa trân châu đường đen');
    expect(search('ts tan chau')).toContain('Trà sữa trân châu đường đen');
  });

  it('matches beverage abbreviations like "tstcdd", "ts", "dcs", "cf", "cfsd", "bx"', () => {
    expect(search('tstcdd')[0]).toBe('Trà sữa trân châu đường đen');
    expect(search('ts tc dd')[0]).toBe('Trà sữa trân châu đường đen');
    expect(search('dcs')[0]).toBe('Trà đào cam sả');
    expect(search('cf')).toContain('Cà phê sữa đá');
    expect(search('cfsd')[0]).toBe('Cà phê sữa đá');
    expect(search('bx')[0]).toBe('Bạc xỉu đá');
  });
});

describe('POS Cart Line Item Key Normalization (Scenario 1.2 Merge Fix)', () => {
  it('generates identical normalized keys for default drink options across local & server drafts', () => {
    const firstClickItem = {
      id: 'SP001',
      category: 'Trà sữa',
      size: 'M',
      sugar: undefined,
      ice: undefined,
      toppings: undefined,
      note: '',
    };

    const draftHydratedItem = {
      id: 'SP001',
      category: 'Trà sữa',
      size: '',
      sugar: '100% đường',
      ice: '100% đá',
      toppings: [],
      note: '  ',
    };

    expect(getNormalizedPosItemKey(firstClickItem)).toBe(getNormalizedPosItemKey(draftHydratedItem));
  });

  it('distinguishes items when Size or Toppings differ', () => {
    const sizeM = { id: 'SP001', category: 'Trà sữa', size: 'M', toppings: ['Trân châu đen'] };
    const sizeL = { id: 'SP001', category: 'Trà sữa', size: 'L', toppings: ['Trân châu đen'] };
    const diffTopping = { id: 'SP001', category: 'Trà sữa', size: 'M', toppings: ['Kem Cheese Macchiato'] };

    expect(getNormalizedPosItemKey(sizeM)).not.toBe(getNormalizedPosItemKey(sizeL));
    expect(getNormalizedPosItemKey(sizeM)).not.toBe(getNormalizedPosItemKey(diffTopping));
  });
});

describe('System Feature Flags & Staff Overrides', () => {
  it('disables feature for EVERYONE (including Admin) when global toggle is OFF', () => {
    const config: SystemFeaturesPayload = {
      ...DEFAULT_FEATURE_CONFIG,
      flags: {
        ...DEFAULT_FEATURE_CONFIG.flags,
        pos_barcode_scanner: false,
        pos_transfer_table: false,
      },
    };

    const adminUser = { username: 'admin', 'Vai trò': 'Admin' };
    const cashierUser = { username: 'thungan01', 'Vai trò': 'Thu ngân' };

    expect(isFeatureEnabledForUser('pos_barcode_scanner', adminUser, config)).toBe(false);
    expect(isFeatureEnabledForUser('pos_transfer_table', adminUser, config)).toBe(false);
    expect(isFeatureEnabledForUser('pos_transfer_table', cashierUser, config)).toBe(false);
  });

  it('honors per-staff extra granted and revoked feature overrides when global toggle is ON', () => {
    const config: SystemFeaturesPayload = {
      ...DEFAULT_FEATURE_CONFIG,
      flags: {
        ...DEFAULT_FEATURE_CONFIG.flags,
        pos_barcode_scanner: true,
        pos_transfer_table: true,
      },
      rolePermissions: {
        ...DEFAULT_FEATURE_CONFIG.rolePermissions,
        pos_barcode_scanner: ['Admin'], // Mặc định Thu ngân không có quyền
        pos_transfer_table: ['Admin', 'Quản lý', 'Thu ngân'],
      },
      staffOverrides: {
        thungan_vip: {
          granted: ['pos_barcode_scanner'],
          revoked: [],
        },
        thungan_restricted: {
          granted: [],
          revoked: ['pos_transfer_table'],
        },
      },
    };

    const normalCashier = { username: 'thungan01', 'Vai trò': 'Thu ngân' };
    const vipCashier = { username: 'thungan_vip', 'Vai trò': 'Thu ngân' };
    const restrictedCashier = { username: 'thungan_restricted', 'Vai trò': 'Thu ngân' };

    expect(isFeatureEnabledForUser('pos_barcode_scanner', normalCashier, config)).toBe(false);
    expect(isFeatureEnabledForUser('pos_barcode_scanner', vipCashier, config)).toBe(true);
    expect(isFeatureEnabledForUser('pos_transfer_table', restrictedCashier, config)).toBe(false);
  });
});
