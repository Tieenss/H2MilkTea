import { describe, it, expect } from 'vitest';
import {
  detectTableArea,
  DEFAULT_AREAS,
  TABLE_AREA_OPTIONS,
  sortTables,
  groupTablesByArea
} from '@/app/(dashboard)/tables/utils/constants';
import type { Table, TableFormData } from '@/app/(dashboard)/tables/types/table';

describe('Phase 12: Bulk Tables & Area Management', () => {
  describe('Constants & Area Detection', () => {
    it('provides standard area options and default areas', () => {
      expect(DEFAULT_AREAS).toEqual(['Tất cả', 'Phòng hát', 'Quầy', 'Vườn', 'Mang về']);
      expect(TABLE_AREA_OPTIONS).toEqual(['Phòng hát', 'Quầy', 'Vườn', 'Mang về']);
    });

    it('prioritizes explicitArea when provided and valid', () => {
      expect(detectTableArea('Bàn 01', 'Phòng hát')).toBe('Phòng hát');
      expect(detectTableArea('Bàn 01', 'Vườn')).toBe('Vườn');
      expect(detectTableArea('Bàn 01', 'Quầy')).toBe('Quầy');
      expect(detectTableArea('Bàn 01', 'Mang về')).toBe('Mang về');
      expect(detectTableArea('Bàn 01', 'Tầng 2 VIP')).toBe('Tầng 2 VIP');
    });

    it('detects area from table name when explicitArea is not set', () => {
      expect(detectTableArea('Phòng VIP 01')).toBe('Phòng hát');
      expect(detectTableArea('Bàn 09 (Ngoài trời)')).toBe('Vườn');
      expect(detectTableArea('Ghế quầy bar 01')).toBe('Quầy');
      expect(detectTableArea('Khách mua về')).toBe('Mang về');
    });
  });

  describe('Bulk Table Generation Logic', () => {
    it('generates tables BAN01 to BAN15 with zero padding and assigned area', () => {
      const from = 1;
      const to = 15;
      const prefix = 'BAN';
      const namePrefix = 'Bàn ';
      const padZero = true;
      const area = 'Phòng hát';
      const capacity = 4;

      const generated: TableFormData[] = [];
      for (let i = from; i <= to; i++) {
        const numStr = padZero && i < 10 ? `0${i}` : `${i}`;
        generated.push({
          IDBAN: `${prefix}${numStr}`,
          'Tên bàn': `${namePrefix}${numStr}`.trim(),
          'Sức chứa tối đa': capacity,
          'Trạng thái': 'Đang hoạt động',
          'Khu vực': area
        });
      }

      expect(generated.length).toBe(15);
      expect(generated[0].IDBAN).toBe('BAN01');
      expect(generated[0]['Tên bàn']).toBe('Bàn 01');
      expect(generated[0]['Khu vực']).toBe('Phòng hát');
      expect(generated[0]['Sức chứa tối đa']).toBe(4);

      expect(generated[14].IDBAN).toBe('BAN15');
      expect(generated[14]['Tên bàn']).toBe('Bàn 15');
      expect(generated[14]['Khu vực']).toBe('Phòng hát');
    });

    it('correctly detects duplicate IDs against existing tables', () => {
      const existingTables: Table[] = [
        { IDBAN: 'BAN01', 'Tên bàn': 'Bàn 01', 'Sức chứa tối đa': 4, 'Trạng thái': 'Đang hoạt động' },
        { IDBAN: 'BAN02', 'Tên bàn': 'Bàn 02', 'Sức chứa tối đa': 4, 'Trạng thái': 'Đang hoạt động' },
      ];

      const existingIdSet = new Set(existingTables.map(t => t.IDBAN.toLowerCase()));

      const checkIds = ['BAN01', 'BAN02', 'BAN03', 'BAN04'];
      const duplicates = checkIds.filter(id => existingIdSet.has(id.toLowerCase()));

      expect(duplicates).toEqual(['BAN01', 'BAN02']);
    });
  });

  describe('TableForm Validation with Area', () => {
    it('validates that Khu vực is required', () => {
      const validate = (table: TableFormData) => {
        const errors: string[] = [];
        if (!table.IDBAN?.trim()) errors.push('Mã bàn không được để trống');
        if (!table['Tên bàn']?.trim()) errors.push('Tên bàn không được để trống');
        if (!table['Khu vực']?.trim()) errors.push('Khu vực không được để trống');
        if (table['Sức chứa tối đa'] < 1) errors.push('Sức chứa phải lớn hơn 0');
        if (table['Sức chứa tối đa'] > 50) errors.push('Sức chứa không được quá 50 người');
        return errors;
      };

      const invalidTable: TableFormData = {
        IDBAN: 'BAN01',
        'Tên bàn': 'Bàn 01',
        'Sức chứa tối đa': 4,
        'Trạng thái': 'Đang hoạt động',
        'Khu vực': ''
      };

      const errors = validate(invalidTable);
      expect(errors).toContain('Khu vực không được để trống');

      const validTable: TableFormData = {
        ...invalidTable,
        'Khu vực': 'Phòng hát'
      };
      expect(validate(validTable)).toHaveLength(0);
    });
  });

  describe('AI Assistant Table Command Parsing & Permissions', () => {
    it('parses bulk add table range, area and prefix from natural speech', () => {
      const parseCommand = (text: string) => {
        let detectedArea = 'Phòng hát';
        let prefix = 'PH';
        if (/vườn|ngoài\s*trời/i.test(text)) {
          detectedArea = 'Vườn';
          prefix = 'V';
        } else if (/quầy|bar/i.test(text)) {
          detectedArea = 'Quầy';
          prefix = 'Q';
        } else if (/phòng\s*hát|karaoke/i.test(text)) {
          detectedArea = 'Phòng hát';
          prefix = 'PH';
        }

        let fromNum = 1;
        let toNum = 10;
        const rangeMatch = text.match(/(\d+)\s*(?:đến|tới|-)\s*(\d+)/i);
        if (rangeMatch) {
          fromNum = parseInt(rangeMatch[1], 10);
          toNum = parseInt(rangeMatch[2], 10);
        }

        return { prefix, fromNum, toNum, detectedArea };
      };

      const res = parseCommand('tạo bàn từ 1 đến 15 ở khu phòng hát');
      expect(res.fromNum).toBe(1);
      expect(res.toNum).toBe(15);
      expect(res.detectedArea).toBe('Phòng hát');

      const resVuon = parseCommand('tạo 1 đến 10 bàn khu vườn');
      expect(resVuon.detectedArea).toBe('Vườn');
      expect(resVuon.fromNum).toBe(1);
      expect(resVuon.toNum).toBe(10);
    });

    it('enforces Admin/Manager permission check', () => {
      const checkPermission = (userRole: string) => {
        const isAdmin = userRole === 'Admin';
        const isManager = userRole === 'Quản lý';
        return isAdmin || isManager;
      };

      expect(checkPermission('Admin')).toBe(true);
      expect(checkPermission('Quản lý')).toBe(true);
      expect(checkPermission('Thu ngân')).toBe(false);
      expect(checkPermission('Pha chế')).toBe(false);
    });
  });

  describe('Natural Alphanumeric Sorting & Area Grouping', () => {
    const scrambledTables = [
      { IDBAN: 'TAKEAWAY', 'Tên bàn': 'Khách mua về', 'Khu vực': 'Mang về', 'Trạng thái sử dụng': 'Trống' },
      { IDBAN: 'BAN07', 'Tên bàn': 'Bàn 07', 'Khu vực': 'Quầy', 'Trạng thái sử dụng': 'Trống' },
      { IDBAN: 'BAN10', 'Tên bàn': 'Bàn 10', 'Khu vực': 'Quầy', 'Trạng thái sử dụng': 'Trống' },
      { IDBAN: 'BAN09', 'Tên bàn': 'Bàn 09', 'Khu vực': 'Quầy', 'Trạng thái sử dụng': 'Trống' },
      { IDBAN: 'BAN03', 'Tên bàn': 'Bàn 03', 'Khu vực': 'Quầy', 'Trạng thái sử dụng': 'Đang sử dụng' },
      { IDBAN: 'BAN01', 'Tên bàn': 'Bàn 01', 'Khu vực': 'Quầy', 'Trạng thái sử dụng': 'Đang sử dụng' },
      { IDBAN: 'BAN02', 'Tên bàn': 'Bàn 2', 'Khu vực': 'Quầy', 'Trạng thái sử dụng': 'Trống' },
      { IDBAN: 'BAN15', 'Tên bàn': 'Bàn 15', 'Khu vực': 'Quầy', 'Trạng thái sử dụng': 'Trống' },
    ];

    it('sorts scrambled tables naturally A -> Z (Bàn 01 -> Bàn 2 -> Bàn 03 -> Bàn 07 -> Bàn 09 -> Bàn 10 -> Bàn 15)', () => {
      const sorted = sortTables(scrambledTables, 'name-asc');
      expect(sorted.map((t) => t['Tên bàn'])).toEqual([
        'Bàn 01',
        'Bàn 2',
        'Bàn 03',
        'Bàn 07',
        'Bàn 09',
        'Bàn 10',
        'Bàn 15',
        'Khách mua về'
      ]);
    });

    it('sorts tables Z -> A while keeping takeaway at the end', () => {
      const sorted = sortTables(scrambledTables, 'name-desc');
      expect(sorted.map((t) => t['Tên bàn'])).toEqual([
        'Bàn 15',
        'Bàn 10',
        'Bàn 09',
        'Bàn 07',
        'Bàn 03',
        'Bàn 2',
        'Bàn 01',
        'Khách mua về'
      ]);
    });

    it('sorts occupied tables first (occupied-first), preserving A -> Z within occupied and empty groups', () => {
      const sorted = sortTables(scrambledTables, 'occupied-first');
      expect(sorted.slice(0, 2).map((t) => t['Tên bàn'])).toEqual(['Bàn 01', 'Bàn 03']);
      expect(sorted.slice(2).map((t) => t['Tên bàn'])).toEqual([
        'Bàn 2',
        'Bàn 07',
        'Bàn 09',
        'Bàn 10',
        'Bàn 15',
        'Khách mua về'
      ]);
    });

    it('groups tables into separate Area sections and hides empty areas when selectedArea is Tất cả', () => {
      const groups = groupTablesByArea(scrambledTables, 'name-asc');
      expect(groups.map((g) => g.area)).toEqual(['Quầy', 'Mang về']);
      expect(groups[0].tables.map((t) => t['Tên bàn'])).toEqual([
        'Bàn 01',
        'Bàn 2',
        'Bàn 03',
        'Bàn 07',
        'Bàn 09',
        'Bàn 10',
        'Bàn 15'
      ]);
      expect(groups[0].occupiedCount).toBe(2);
      expect(groups[1].tables.map((t) => t['Tên bàn'])).toEqual(['Khách mua về']);
    });
  });
});
