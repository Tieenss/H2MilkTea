import { describe, it, expect } from 'vitest';
import { resolveTableFlexible, extractTableNumber, normalizeTableKey } from '@/lib/tableResolver';
import tableData from '@/data/DSBAN.json';

describe('Smart Table Resolver Unit Tests', () => {
  it('normalizes table key and extracts table numbers correctly', () => {
    expect(normalizeTableKey('Bàn 01')).toBe('ban01');
    expect(normalizeTableKey('BAN-01')).toBe('ban01');
    expect(normalizeTableKey('Khách mua về')).toBe('khachmuave');

    expect(extractTableNumber('1')).toBe(1);
    expect(extractTableNumber('01')).toBe(1);
    expect(extractTableNumber('BAN01')).toBe(1);
    expect(extractTableNumber('Bàn 02')).toBe(2);
    expect(extractTableNumber('takeaway')).toBeNull();
  });

  it('resolves exact match by IDBAN or Tên bàn', () => {
    const tableB001 = resolveTableFlexible('B001', tableData);
    expect(tableB001).toBeTruthy();
    expect(tableB001?.['Tên bàn']).toBe('Bàn 01');

    const tableByName = resolveTableFlexible('Bàn 02', tableData);
    expect(tableByName).toBeTruthy();
    expect(tableByName?.IDBAN).toBe('B002');
  });

  it('resolves takeaway variations', () => {
    expect(resolveTableFlexible('takeaway', tableData)?.IDBAN).toBe('Khách mua về');
    expect(resolveTableFlexible('mang ve', tableData)?.IDBAN).toBe('Khách mua về');
    expect(resolveTableFlexible('muave', tableData)?.IDBAN).toBe('Khách mua về');
    expect(resolveTableFlexible('Khách mua về', tableData)?.IDBAN).toBe('Khách mua về');
  });

  it('resolves common QR scan variants like BAN01, B1, 1, 01 to Bàn 01 (E2E-01-HP checklist requirement)', () => {
    // Tester input in E2E-01-HP: /order?table=BAN01
    const resBan01 = resolveTableFlexible('BAN01', tableData);
    expect(resBan01).toBeTruthy();
    expect(resBan01?.['Tên bàn']).toBe('Bàn 01');

    const res1 = resolveTableFlexible('1', tableData);
    expect(res1).toBeTruthy();
    expect(res1?.['Tên bàn']).toBe('Bàn 01');

    const res01 = resolveTableFlexible('01', tableData);
    expect(res01).toBeTruthy();
    expect(res01?.['Tên bàn']).toBe('Bàn 01');

    const resB1 = resolveTableFlexible('b1', tableData);
    expect(resB1).toBeTruthy();
    expect(resB1?.['Tên bàn']).toBe('Bàn 01');

    const resBan1NoAccent = resolveTableFlexible('ban 1', tableData);
    expect(resBan1NoAccent).toBeTruthy();
    expect(resBan1NoAccent?.['Tên bàn']).toBe('Bàn 01');
  });

  it('resolves higher numbered tables and outdoor areas', () => {
    const resB003 = resolveTableFlexible('Bàn 09', tableData);
    expect(resB003).toBeTruthy();
    expect(resB003?.['Tên bàn']).toContain('Bàn 09');

    const resSofa = resolveTableFlexible('sofa 01', tableData);
    expect(resSofa).toBeTruthy();
    expect(resSofa?.['Tên bàn']).toContain('Sofa 01');
  });

  it('gracefully returns null for empty or non-existent inputs', () => {
    expect(resolveTableFlexible('', tableData)).toBeNull();
    expect(resolveTableFlexible(null, tableData)).toBeNull();
    expect(resolveTableFlexible('non_existent_table_9999', tableData)).toBeNull();
  });
});
