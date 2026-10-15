import { describe, expect, it } from 'vitest';
import { normalizeSearchText, resolveProduct, toActiveCatalog } from '@/lib/ai/catalog';

describe('product catalog resolver', () => {
  const products = toActiveCatalog([
    {
      IDSP: 'SP001',
      'Tên sản phẩm': 'Trà sữa nướng',
      'Loại sản phẩm': 'Trà sữa',
      'Đơn vị tính': 'Ly',
      'Đơn giá': '30000',
      'Trạng thái': 'Hoạt động',
    },
    {
      IDSP: 'SP002',
      'Tên sản phẩm': 'Trà sữa nướng đặc biệt',
      'Loại sản phẩm': 'Trà sữa',
      'Đơn vị tính': 'Ly',
      'Đơn giá': '35000',
      'Trạng thái': 'Hoạt động',
    },
    {
      IDSP: 'SP003',
      'Tên sản phẩm': 'Món đã ngừng bán',
      'Loại sản phẩm': 'Trà sữa',
      'Đơn vị tính': 'Ly',
      'Đơn giá': '10000',
      'Trạng thái': 'Ngừng hoạt động',
    },
  ]);

  it('normalizes Vietnamese text and punctuation', () => {
    expect(normalizeSearchText('  Trà-Sữa NƯỚNG  ')).toBe('tra sua nuong');
  });

  it('resolves an exact active product', () => {
    const result = resolveProduct('tra sua nuong', products);
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') expect(result.product.id).toBe('SP001');
  });

  it('does not return inactive products', () => {
    expect(resolveProduct('món đã ngừng bán', products).status).toBe('not_found');
  });
});
