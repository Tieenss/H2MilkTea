import { describe, expect, it } from 'vitest';
import { resolveTableFromMessage, TableInfo } from '@/lib/ai/table';
import { resolveProduct, expandAliases, toActiveCatalog } from '@/lib/ai/catalog';
import { findRelevantKnowledge } from '@/lib/ai/knowledge';

describe('AI Features & Resolvers', () => {
  const mockTables: TableInfo[] = [
    { id: 'Khách mua về', name: 'Khách mua về' },
    { id: 'B001', name: 'Bàn 01' },
    { id: 'B002', name: 'Bàn 02' },
    { id: 'BAN001', name: 'Bàn 03' }, // Chú ý: ID BAN001 nhưng tên lại là Bàn 03
    { id: 'BAN002', name: 'Bàn 04' }, // Chú ý: ID BAN002 nhưng tên lại là Bàn 04
    { id: 'BAN003', name: 'Bàn 05' },
    { id: 'TB_VIP', name: 'Bàn VIP Sân Thượng' },
    { id: 'TB_GARDEN', name: 'Sân Vườn 02' },
  ];

  const mockProducts = toActiveCatalog([
    { IDSP: 'SP001', 'Tên sản phẩm': 'Trà sữa nướng', 'Đơn giá': '30000', 'Trạng thái': 'Hoạt động' },
    { IDSP: 'SP002', 'Tên sản phẩm': 'Trà đào cam sả', 'Đơn giá': '35000', 'Trạng thái': 'Hoạt động' },
    { IDSP: 'SP003', 'Tên sản phẩm': 'Bạc xỉu', 'Đơn giá': '25000', 'Trạng thái': 'Hoạt động' },
    { IDSP: 'SP004', 'Tên sản phẩm': 'Trà sữa truyền thống', 'Đơn giá': '28000', 'Trạng thái': 'Hoạt động' },
  ]);

  describe('Table Detection', () => {
    it('detects table with "bàn 3" or "bàn 03"', () => {
      const result1 = resolveTableFromMessage('cho tôi 3 ly trà sữa vào bàn 3', mockTables);
      expect(result1?.table.name).toBe('Bàn 03');
      expect(result1?.table.id).toBe('BAN001');

      const result2 = resolveTableFromMessage('bàn 03 thêm 2 ly', mockTables);
      expect(result2?.table.name).toBe('Bàn 03');
      expect(result2?.table.id).toBe('BAN001');
    });

    it('prioritizes table name over ID when ID and Name conflict (Bàn 1 -> Bàn 01, not BAN001)', () => {
      // Bàn 1 phải tìm đúng Bàn 01 (id B001), KHÔNG ĐƯỢC nhầm sang id BAN001 (mang tên Bàn 03)
      const res1 = resolveTableFromMessage('mở bàn 1', mockTables);
      expect(res1?.table.name).toBe('Bàn 01');
      expect(res1?.table.id).toBe('B001');

      // Bàn 2 phải tìm đúng Bàn 02 (id B002), KHÔNG ĐƯỢC nhầm sang id BAN002 (mang tên Bàn 04)
      const res2 = resolveTableFromMessage('mở bàn 2', mockTables);
      expect(res2?.table.name).toBe('Bàn 02');
      expect(res2?.table.id).toBe('B002');

      // Bàn 4 phải tìm đúng Bàn 04 (id BAN002)
      const res4 = resolveTableFromMessage('mở bàn 4', mockTables);
      expect(res4?.table.name).toBe('Bàn 04');
      expect(res4?.table.id).toBe('BAN002');
    });

    it('detects custom renamed tables (Bàn VIP Sân Thượng, Sân Vườn 02)', () => {
      const resVIP = resolveTableFromMessage('mở bàn VIP sân thượng thêm 2 trà sữa', mockTables);
      expect(resVIP?.table.name).toBe('Bàn VIP Sân Thượng');
      expect(resVIP?.table.id).toBe('TB_VIP');

      const resGarden = resolveTableFromMessage('chuyển đơn sang sân vườn 2', mockTables);
      expect(resGarden?.table.name).toBe('Sân Vườn 02');
      expect(resGarden?.table.id).toBe('TB_GARDEN');
    });

    it('detects short syntax "b4" or "table 2"', () => {
      const resultB4 = resolveTableFromMessage('b4 bỏ 1 ly trà đào', mockTables);
      expect(resultB4?.table.name).toBe('Bàn 04');

      const resultTable2 = resolveTableFromMessage('chuyển sang table 2', mockTables);
      expect(resultTable2?.table.name).toBe('Bàn 02');
    });

    it('detects takeaway "mang về" / "khách mua về"', () => {
      const result1 = resolveTableFromMessage('mang về 2 bạc xỉu', mockTables);
      expect(result1?.table.name).toBe('Khách mua về');

      const result2 = resolveTableFromMessage('khách mua về 1 trà sữa', mockTables);
      expect(result2?.table.name).toBe('Khách mua về');
    });

    it('returns isNotFound flag for non-existing tables and null if no table pattern mentioned', () => {
      const result = resolveTableFromMessage('bàn 99 thêm 1 ly', mockTables);
      expect(result?.isNotFound).toBe(true);
      expect(result?.requestedName).toBe('Bàn 99');

      const noTable = resolveTableFromMessage('cho 1 ly trà đào', mockTables);
      expect(noTable).toBeNull();
    });
  });

  describe('Product Alias & Matching', () => {
    it('expands alias "ts", "dcs", "bx"', () => {
      expect(expandAliases('2 ts nuong')).toBe('2 tra sua nuong');
      expect(expandAliases('1 dcs')).toBe('1 tra dao cam sa');
      expect(expandAliases('bx it duong')).toBe('bac xiu it duong');
    });

    it('resolves product with alias input', () => {
      const res1 = resolveProduct('ts nuong', mockProducts);
      expect(res1.status).toBe('resolved');
      if (res1.status === 'resolved') expect(res1.product.id).toBe('SP001');

      const res2 = resolveProduct('dcs', mockProducts);
      expect(res2.status).toBe('resolved');
      if (res2.status === 'resolved') expect(res2.product.id).toBe('SP002');
    });
  });

  describe('Knowledge Base QA', () => {
    it('finds user guide topic for adding product', () => {
      const topic = findRelevantKnowledge('làm sao để thêm món mới vào thực đơn');
      expect(topic?.id).toBe('add-product');
    });

    it('finds shortcuts topic', () => {
      const topic = findRelevantKnowledge('phím tắt thanh toán nhanh là gì');
      expect(topic?.id).toBe('shortcuts');
    });

    it('finds printer setup topic', () => {
      const topic = findRelevantKnowledge('cách cài đặt máy in hóa đơn k80');
      expect(topic?.id).toBe('printer-setup');
    });
  });
});
