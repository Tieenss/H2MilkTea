import { describe, it, expect, vi } from 'vitest';
import { resolveTableFlexible } from '@/lib/tableResolver';
import { buildMergedToppingNote } from '@/lib/ai/customerDrinkParser';

describe('QR Order to POS Realtime Notification & Topping Flow', () => {
  it('resolves table smoothly even if table is not in database (auto-fallback)', () => {
    const mockTables = [
      { IDBAN: 'BAN000', 'Tên bàn': 'Khách mua về', 'Trạng thái': 'Đang hoạt động' },
      { IDBAN: 'Q01', 'Tên bàn': 'Quầy 01', 'Trạng thái': 'Đang hoạt động' },
    ];

    // Khớp bàn 1 vào Quầy 01
    const match1 = resolveTableFlexible('1', mockTables);
    expect(match1).not.toBeNull();
    expect(match1?.IDBAN).toBe('Q01');

    // Bàn 99 không có trong DB: trả về null để caller tự fallback an toàn thành Bàn 99
    const match99 = resolveTableFlexible('99', mockTables);
    expect(match99).toBeNull();
  });

  it('builds merged topping note correctly for customer drinks', () => {
    const toppings = ['Trân châu đen', 'Kem cheese'];
    const customNote = 'ít ngọt, lấy ly mang đi';

    const merged = buildMergedToppingNote(toppings, customNote);
    expect(merged).toContain('Thêm Trân châu đen, Kem cheese');
    expect(merged).toContain('ít ngọt, lấy ly mang đi');
  });

  it('handles empty toppings and empty notes cleanly', () => {
    expect(buildMergedToppingNote([], 'ít đá')).toBe('ít đá');
    expect(buildMergedToppingNote(['Thạch củ năng'], '')).toBe('Thêm Thạch củ năng');
  });
});
