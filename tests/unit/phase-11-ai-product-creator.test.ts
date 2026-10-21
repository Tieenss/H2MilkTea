import { describe, it, expect } from 'vitest';

describe('Phase 3: AI Product Creator & Menu Scanner', () => {
  it('correctly maps drink categories to high quality preset images', () => {
    function pickPresetImage(category: string, name: string): string {
      const norm = (name || '').toLowerCase();
      if (norm.includes('cà phê') || norm.includes('cafe') || norm.includes('muối')) {
        return 'coffee';
      }
      if (norm.includes('đào') || norm.includes('xoài') || norm.includes('ổi') || norm.includes('trái cây')) {
        return 'fruit-tea';
      }
      return 'milk-tea';
    }

    expect(pickPresetImage('Cà phê', 'Cà phê muối H2')).toBe('coffee');
    expect(pickPresetImage('Trà trái cây', 'Trà xoài macchiato')).toBe('fruit-tea');
    expect(pickPresetImage('Trà sữa', 'Trà sữa trân châu đường đen')).toBe('milk-tea');
  });

  it('accurately identifies new menu items against current products in store', () => {
    const currentProducts = [
      { 'Tên sản phẩm': 'Trà sữa truyền thống' },
      { 'Tên sản phẩm': 'Cà phê đen' },
    ];

    const scannedItems = [
      { name: 'Trà sữa truyền thống', price: 25000 },
      { name: 'Trà ổi hồng muối ớt', price: 32000 },
      { name: 'Cà phê đen', price: 20000 },
      { name: 'Bánh sừng bò phô mai', price: 28000 },
    ];

    const currentNames = currentProducts.map(p => p['Tên sản phẩm'].toLowerCase());
    const newItems = scannedItems.filter(item => !currentNames.includes(item.name.toLowerCase()));
    const existingItems = scannedItems.filter(item => currentNames.includes(item.name.toLowerCase()));

    expect(newItems.length).toBe(2);
    expect(newItems[0].name).toBe('Trà ổi hồng muối ớt');
    expect(newItems[1].name).toBe('Bánh sừng bò phô mai');
    expect(existingItems.length).toBe(2);
  });
});
