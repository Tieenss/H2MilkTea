import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  parseFlexibleDate,
  formatVNDate,
  formatVNDateTime,
  formatRelativeTimeVN,
} from '@/utils/dateUtils';

describe('dateUtils', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('parseFlexibleDate', () => {
    it('parses standard Vietnamese DD/MM/YYYY dates accurately', () => {
      const d1 = parseFlexibleDate('15/05/1999');
      expect(d1).not.toBeNull();
      expect(d1?.getFullYear()).toBe(1999);
      expect(d1?.getMonth()).toBe(4);
      expect(d1?.getDate()).toBe(15);

      const d2 = parseFlexibleDate('01/01/2025');
      expect(d2?.getFullYear()).toBe(2025);
      expect(d2?.getMonth()).toBe(0);
      expect(d2?.getDate()).toBe(1);

      const d3 = parseFlexibleDate('20/03/2003');
      expect(d3?.getFullYear()).toBe(2003);
      expect(d3?.getMonth()).toBe(2);
      expect(d3?.getDate()).toBe(20);
    });

    it('prioritizes DD/MM/YYYY over MM/DD/YYYY when both parts <= 12', () => {
      const d = parseFlexibleDate('08/11/2026');
      expect(d).not.toBeNull();
      expect(d?.getFullYear()).toBe(2026);
      expect(d?.getMonth()).toBe(10); // Tháng 11 (0-indexed)
      expect(d?.getDate()).toBe(8);

      const gd1 = parseFlexibleDate('05/11/2026');
      expect(gd1?.getMonth()).toBe(10);
      expect(gd1?.getDate()).toBe(5);

      const gd2 = parseFlexibleDate('10/11/2026');
      expect(gd2?.getMonth()).toBe(10);
      expect(gd2?.getDate()).toBe(10);
    });

    it('supports DD/MM/YYYY HH:mm:ss and DD/MM/YYYY HH:mm', () => {
      const d = parseFlexibleDate('15/11/2026 10:00:00');
      expect(d).not.toBeNull();
      expect(d?.getFullYear()).toBe(2026);
      expect(d?.getMonth()).toBe(10);
      expect(d?.getDate()).toBe(15);
      expect(d?.getHours()).toBe(10);
      expect(d?.getMinutes()).toBe(0);
      expect(d?.getSeconds()).toBe(0);

      const dNoSec = parseFlexibleDate('16/11/2026 14:25');
      expect(dNoSec?.getDate()).toBe(16);
      expect(dNoSec?.getHours()).toBe(14);
      expect(dNoSec?.getMinutes()).toBe(25);
    });

    it('falls back to MM/DD/YYYY when second part > 12 (US HOADON compatibility)', () => {
      const d = parseFlexibleDate('11/25/2026 09:15:30');
      expect(d).not.toBeNull();
      expect(d?.getFullYear()).toBe(2026);
      expect(d?.getMonth()).toBe(10);
      expect(d?.getDate()).toBe(25);
      expect(d?.getHours()).toBe(9);
      expect(d?.getMinutes()).toBe(15);
    });

    it('parses YYYY-MM-DD in local time without UTC day shift', () => {
      const d = parseFlexibleDate('2026-11-18');
      expect(d).not.toBeNull();
      expect(d?.getFullYear()).toBe(2026);
      expect(d?.getMonth()).toBe(10);
      expect(d?.getDate()).toBe(18);
      expect(d?.getHours()).toBe(0);
    });

    it('parses ISO datetime strings and Date instances', () => {
      const iso = parseFlexibleDate('2026-11-18T07:30:00.000Z');
      expect(iso).not.toBeNull();
      expect(iso instanceof Date).toBe(true);

      const now = new Date(2026, 10, 18);
      expect(parseFlexibleDate(now)).toBe(now);
    });

    it('returns null for empty, invalid, or impossible calendar dates', () => {
      expect(parseFlexibleDate('')).toBeNull();
      expect(parseFlexibleDate(null)).toBeNull();
      expect(parseFlexibleDate(undefined)).toBeNull();
      expect(parseFlexibleDate('invalid')).toBeNull();
      expect(parseFlexibleDate(new Date('invalid'))).toBeNull();
      expect(parseFlexibleDate('31/02/2026')).toBeNull();
      expect(parseFlexibleDate('31/04/2026')).toBeNull();
      expect(parseFlexibleDate('2026-02-30')).toBeNull();
      expect(parseFlexibleDate('13/13/2026')).toBeNull();
      expect(parseFlexibleDate('15/11/2026 25:00:00')).toBeNull();
    });
  });

  describe('formatVNDate & formatVNDateTime', () => {
    it('formats valid dates to dd/MM/yyyy and dd/MM/yyyy HH:mm', () => {
      expect(formatVNDate('16/11/2026')).toBe('16/11/2026');
      expect(formatVNDate('08/11/2026')).toBe('08/11/2026');
      expect(formatVNDate('2026-11-18')).toBe('18/11/2026');
      expect(formatVNDateTime('15/11/2026 10:00:00')).toBe('15/11/2026 10:00');
      expect(formatVNDateTime('15/11/2026 10:05:09', '—', true)).toBe('15/11/2026 10:05:09');
    });

    it('returns fallback for invalid values', () => {
      expect(formatVNDate('')).toBe('—');
      expect(formatVNDate(null, 'Chưa cập nhật')).toBe('Chưa cập nhật');
      expect(formatVNDateTime('invalid', 'Không hợp lệ')).toBe('Không hợp lệ');
    });
  });

  describe('formatRelativeTimeVN', () => {
    it('calculates relative Vietnamese time without reversing day/month', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 10, 18, 12, 0, 0));

      expect(formatRelativeTimeVN('18/11/2026 08:00:00')).toBe('Hôm nay');
      expect(formatRelativeTimeVN('17/11/2026 10:00:00')).toBe('Hôm qua');
      expect(formatRelativeTimeVN('08/11/2026')).toBe('1 tuần trước');
      expect(formatRelativeTimeVN('invalid')).toBe('Không xác định');
    });
  });
});
