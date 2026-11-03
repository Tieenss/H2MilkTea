import { describe, expect, it, vi } from 'vitest';
import { matchRuleBased, extractNoteAndOptions, computeCartDiff } from '@/lib/ai/ruleEngine';
import { processAiPipeline } from '@/lib/ai/pipeline';
import { POST as customerChatPost, parseDrinkCustomization } from '@/app/api/ai/customer-chat/route';
import { NextRequest } from 'next/server';
import type { CatalogProduct, TableInfo } from '@/lib/ai/types';

vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabaseClient: vi.fn(() => null),
}));

const mockCatalog: CatalogProduct[] = [
  { id: 'SP001', name: 'Trà sữa trân châu đen', price: 30000, status: 'Hoạt động', category: 'Trà sữa', unit: 'ly' },
  { id: 'SP002', name: 'Trà sữa topping thạch củ năng', price: 38000, status: 'Hoạt động', category: 'Trà sữa', unit: 'ly' },
  { id: 'SP003', name: 'Trà sữa khoai môn', price: 35000, status: 'Hoạt động', category: 'Trà sữa', unit: 'ly' },
  { id: 'SP004', name: 'Trà đào cam sả', price: 40000, status: 'Hoạt động', category: 'Trà', unit: 'ly' },
  { id: 'SP005', name: 'Trà vải', price: 38000, status: 'Hoạt động', category: 'Trà', unit: 'ly' },
  { id: 'SP006', name: 'Trà chanh', price: 20000, status: 'Hoạt động', category: 'Trà', unit: 'ly' },
  { id: 'SP007', name: 'Cafe sữa đá', price: 28000, status: 'Hoạt động', category: 'Cà phê', unit: 'ly' },
  { id: 'SP008', name: 'Cafe đen đá', price: 25000, status: 'Hoạt động', category: 'Cà phê', unit: 'ly' },
  { id: 'SP009', name: 'Bạc xỉu', price: 30000, status: 'Hoạt động', category: 'Cà phê', unit: 'ly' },
  { id: 'SP010', name: 'Ép dưa hấu', price: 20000, status: 'Hoạt động', category: 'Nước ép', unit: 'ly' },
  { id: 'SP011', name: 'Nước ép cam', price: 30000, status: 'Hoạt động', category: 'Nước ép', unit: 'ly' },
];

const mockTables: TableInfo[] = [
  { id: 'B1', name: 'Bàn 1' },
  { id: 'B2', name: 'Bàn 2' },
  { id: 'MV', name: 'Khách mua về' },
];

const mockStaff = {
  id: 'staff-p1-p2-test',
  name: 'Thu Ngân Test',
  role: 'Thu ngân',
  isAdmin: false,
};

describe('P1-P2 AI NLP, Detailed Options, Disambiguation & Cart Diff Upgrade', () => {
  describe('1. Detailed Multi-Topping, Sugar, Ice, and Size Extraction', () => {
    it('extracts multiple toppings connected by "và", commas, and "kèm"', () => {
      const res1 = matchRuleBased(
        'cho 2 trà sữa nướng size L 30% đường đá riêng thêm trân châu đen và kem cheese vào bàn 1',
        mockCatalog,
        mockTables
      );
      expect(res1.matched).toBe(true);
      expect(res1.output?.action).toBe('add');
      const item1 = res1.output?.items[0];
      expect(item1?.productId).toBe('SP002');
      expect(item1?.quantity).toBe(2);
      expect(item1?.size).toBe('L');
      expect(item1?.sugar).toBe('30%');
      expect(item1?.ice).toBe('đá riêng');
      expect(item1?.toppings).toEqual(['Trân châu đen', 'Kem cheese']);

      const res2 = matchRuleBased(
        '1 trà đào cỡ nhỏ không đường kèm pudding trứng, thạch củ năng',
        mockCatalog,
        mockTables
      );
      expect(res2.matched).toBe(true);
      const item2 = res2.output?.items[0];
      expect(item2?.productId).toBe('SP004');
      expect(item2?.size).toBe('S');
      expect(item2?.sugar).toBe('0%');
      expect(item2?.toppings).toEqual(['Pudding trứng', 'Thạch củ năng']);
    });

    it('normalizes 5+ toppings in a single command accurately', () => {
      const parsed = extractNoteAndOptions(
        'trà vải cỡ vừa 70 đường nóng topping trân châu trắng, sương sáo, kem phô mai, đào miếng, hạt đác'
      );
      expect(parsed.size).toBe('M');
      expect(parsed.sugar).toBe('70%');
      expect(parsed.ice).toBe('nóng');
      expect(parsed.toppings).toEqual([
        'Trân châu trắng',
        'Thạch sương sáo',
        'Kem phô mai',
        'Đào miếng',
        'Hạt đác',
      ]);
    });

    it('supports multi-topping and size S/M/L in customer-chat parseDrinkCustomization', () => {
      const custom = parseDrinkCustomization(
        '1 trà đào cỡ lớn 50% đường đá để riêng thêm trân châu đen và thạch phô mai'
      );
      expect(custom.size).toBe('L');
      expect(custom.sugar).toBe('50% đường');
      expect(custom.ice).toBe('đá riêng');
      expect(custom.toppings).toEqual(['Trân châu đen', 'Thạch phô mai']);
    });
  });

  describe('2. Ambiguous Product Query Disambiguation (Hỏi rõ món trùng loại)', () => {
    it('returns disambiguation candidates when ordering generic "cho 2 trà sữa"', () => {
      const res = matchRuleBased('cho 2 trà sữa', mockCatalog, mockTables);
      expect(res.matched).toBe(true);
      expect(res.output?.action).toBe('none');
      expect(res.output?.items).toEqual([]);
      expect(res.output?.disambiguation).toBeDefined();
      expect(res.output?.disambiguation?.length).toBeGreaterThanOrEqual(3);
      expect(res.output?.message).toContain('Quán có nhiều món khớp với yêu cầu');
      expect(res.output?.message).toContain('Bạn muốn chọn cụ thể món nào ạ?');
    });

    it('returns disambiguation candidates for generic "lấy 1 cà phê", "thêm 1 trà", and "1 nước ép"', async () => {
      const resCafe = matchRuleBased('lấy 1 cà phê', mockCatalog, mockTables);
      expect(resCafe.matched).toBe(true);
      expect(resCafe.output?.action).toBe('none');
      expect(resCafe.output?.disambiguation?.some((c) => c.name.includes('Cafe'))).toBe(true);

      const resTra = matchRuleBased('thêm 1 trà', mockCatalog, mockTables);
      expect(resTra.matched).toBe(true);
      expect(resTra.output?.action).toBe('none');
      expect(resTra.output?.disambiguation?.some((c) => c.name.includes('Trà đào'))).toBe(true);

      const pipeNuocEp = await processAiPipeline({
        rawMessage: '1 nước ép cho bàn 1',
        staff: mockStaff,
        catalog: mockCatalog,
        tables: mockTables,
      });
      expect(pipeNuocEp.action).toBe('none');
      expect(pipeNuocEp.disambiguation?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('3. Negative Cart Guard (Chặn bớt món âm giỏ)', () => {
    it('blocks removal when the requested item is not in currentCart (beforeQty === 0)', async () => {
      const currentCart = [{ id: 'SP001', name: 'Trà sữa trân châu đen', quantity: 2 }];
      const res = await processAiPipeline({
        rawMessage: 'bớt 1 trà đào bàn 1',
        staff: mockStaff,
        catalog: mockCatalog,
        tables: mockTables,
        currentCart,
      });

      expect(res.action).toBe('none');
      expect(res.items).toEqual([]);
      expect(res.message).toContain('Chặn bớt món âm giỏ');
      expect(res.message).toContain('Trà đào cam sả');
    });

    it('caps removal quantity when requested removal exceeds quantity in currentCart', async () => {
      const currentCart = [{ id: 'SP004', name: 'Trà đào cam sả', quantity: 1 }];
      const res = await processAiPipeline({
        rawMessage: 'bớt 3 trà đào',
        staff: mockStaff,
        catalog: mockCatalog,
        tables: mockTables,
        currentCart,
      });

      expect(res.action).toBe('remove');
      expect(res.items).toHaveLength(1);
      expect(res.items[0].quantity).toBe(1);
      expect(res.message).toContain('tự động điều chỉnh mức bớt tối đa là 1 món');
      expect(res.cartDiff).toEqual([
        {
          productId: 'SP004',
          productName: 'Trà đào cam sả',
          beforeQty: 1,
          afterQty: 0,
          delta: -1,
          unitPrice: 40000,
        },
      ]);
    });
  });

  describe('4. Visual Cart Diff Calculation', () => {
    it('computes beforeQty, afterQty, delta, and unitPrice for add and remove actions', async () => {
      const currentCart = [
        { id: 'SP001', name: 'Trà sữa trân châu đen', quantity: 2 },
        { id: 'SP009', name: 'Bạc xỉu', quantity: 3 },
      ];

      const addRes = await processAiPipeline({
        rawMessage: 'thêm 2 ts và 1 trà vải vào bàn 2',
        staff: mockStaff,
        catalog: mockCatalog,
        tables: mockTables,
        currentCart,
      });

      expect(addRes.action).toBe('add');
      expect(addRes.cartDiff).toEqual([
        {
          productId: 'SP001',
          productName: 'Trà sữa trân châu đen',
          beforeQty: 2,
          afterQty: 4,
          delta: 2,
          unitPrice: 30000,
        },
        {
          productId: 'SP005',
          productName: 'Trà vải',
          beforeQty: 0,
          afterQty: 1,
          delta: 1,
          unitPrice: 38000,
        },
      ]);

      const removeDiff = computeCartDiff(
        'remove',
        [
          {
            productId: 'SP009',
            productName: 'Bạc xỉu',
            quantity: 2,
            note: '',
            size: 'M',
            sugar: '100%',
            ice: '100% đá',
            toppings: [],
          },
        ],
        currentCart,
        mockCatalog
      );

      expect(removeDiff).toEqual([
        {
          productId: 'SP009',
          productName: 'Bạc xỉu',
          beforeQty: 3,
          afterQty: 1,
          delta: -2,
          unitPrice: 30000,
        },
      ]);
    });
  });

  describe('5. Customer Chat Allergy, Caffeine, Calorie & Ingredient Support', () => {
    function makeCustomerReq(message: string, ip: string) {
      return new NextRequest(new URL('/api/ai/customer-chat', 'http://localhost:3000'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify({ message }),
      });
    }

    it('recommends dairy-free fruit teas and juices when customer has lactose/milk allergy', async () => {
      const res = await customerChatPost(makeCustomerReq('mình bị dị ứng sữa lactose thì uống món gì được?', '10.1.0.1'));
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.intent).toBe('RECOMMENDATION');
      expect(json.message).toContain('lactose');
      expect(json.suggestedProducts.length).toBeGreaterThan(0);
    });

    it('warns about caffeine and suggests caffeine-free drinks for insomnia/evening queries', async () => {
      const res = await customerChatPost(makeCustomerReq('uống buổi tối sợ mất ngủ và say cà phê thì chọn gì?', '10.1.0.2'));
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.intent).toBe('RECOMMENDATION');
      expect(json.message).toContain('caffeine');
      expect(json.suggestedProducts.length).toBeGreaterThan(0);
    });

    it('suggests 0%-30% sugar and low-calorie options for diet/weight-loss queries', async () => {
      const res = await customerChatPost(makeCustomerReq('mình đang ăn kiêng giảm cân cần món ít calo', '10.1.0.3'));
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.intent).toBe('RECOMMENDATION');
      expect(json.message).toContain('30% đường');
      expect(json.suggestedProducts[0]?.sugar).toBe('30% đường');
    });

    it('explains drink ingredients clearly when asked about formula/ingredients', async () => {
      const res = await customerChatPost(makeCustomerReq('cho hỏi thành phần nguyên liệu của trà đào cam sả làm từ gì?', '10.1.0.4'));
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.intent).toBe('FAQ_GENERAL');
      expect(json.message).toContain('thành phần nguyên liệu');
    });
  });
});
