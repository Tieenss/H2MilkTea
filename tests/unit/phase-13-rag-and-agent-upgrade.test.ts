import { describe, it, expect } from 'vitest';
import {
  retrieveProjectKnowledge,
  buildSelectiveRagPrompt,
  getMergedProjectChunks,
  type ProjectKnowledgeChunk,
} from '@/lib/ai/ragEngine';
import { matchRuleBased } from '@/lib/ai/ruleEngine';
import { checkSecurityGuardrails } from '@/lib/ai/security';
import { buildMergedToppingNote, detectServiceCallReason } from '@/lib/ai/customerDrinkParser';
import { toActiveCatalog } from '@/lib/ai/catalog';
import menuData from '@/data/DMHH.json';

const catalog = toActiveCatalog(menuData);
const sampleTables = [
  { id: 'BAN01', name: 'Bàn 01' },
  { id: 'BAN02', name: 'Bàn 02' },
  { id: 'BAN03', name: 'Bàn 03' },
];

describe('Phase 13: In-App Hybrid RAG Engine & AI Agent Upgrades', () => {
  describe('1. Hybrid RAG Engine (Multi-source & Accent-insensitive)', () => {
    it('retrieves accurate project knowledge chunks even with unaccented Vietnamese queries', () => {
      const hitsBulk = retrieveProjectKnowledge('cach tao ban nhanh tu ban01 den ban15', {
        topK: 3,
        roleScope: 'staff',
      });
      expect(hitsBulk.length).toBeGreaterThan(0);
      expect(hitsBulk[0].id).toBe('rag-tables-bulk-and-area');
      expect(hitsBulk[0].content).toContain('Tạo bàn nhanh');

      const hitsKds = retrieveProjectKnowledge('bat man hinh bep o dau khi bi loi', {
        topK: 3,
        roleScope: 'staff',
      });
      expect(hitsKds.length).toBeGreaterThan(0);
      expect(['rag-kitchen-kds-mobile', 'kitchen-kds-mobile']).toContain(hitsKds[0].id);
      expect(hitsKds[0].content).toContain('/settings/features');
    });

    it('retrieves BOM ingredient norms from CAUHINH.json and recipes from store_recipes.json', () => {
      const bomHits = retrieveProjectKnowledge('dinh muc nguyen lieu tru kho bom SP001', {
        topK: 5,
        roleScope: 'staff',
      });
      expect(bomHits.some((h) => h.sourceType === 'bom_config' || h.sourceType === 'recipe')).toBe(true);
    });

    it('enforces strict roleScope isolation so customer QR chatbot never sees internal staff docs', () => {
      const customerHits = retrieveProjectKnowledge('cach huy hoa don va chinh sua vat', {
        topK: 5,
        roleScope: 'customer',
      });
      const leakedStaffChunks = customerHits.filter(
        (h) => h.id === 'rag-orders-security-audit' || h.id === 'rag-receipt-printer-sepay'
      );
      expect(leakedStaffChunks.length).toBe(0);
    });

    it('merges custom admin RAG chunks from /settings/ai and builds selective anti-hallucination prompt', () => {
      const customChunk: ProjectKnowledgeChunk = {
        id: 'rag-custom-promo',
        category: 'Khuyến mãi',
        title: 'Chương trình Mua 2 Tặng 1 Thứ Tư',
        sectionId: 'pos',
        sectionTitle: 'Khuyến mãi',
        keywords: ['mua 2 tang 1', 'khuyen mai thu tu', 'happy hour'],
        content: 'Thứ Tư hàng tuần quán áp dụng Mua 2 Tặng 1 cho dòng Trà trái cây từ 14h-17h.',
        roleScope: 'all',
      };

      const merged = getMergedProjectChunks([customChunk]);
      expect(merged.some((c) => c.id === 'rag-custom-promo')).toBe(true);
      expect(merged.some((c) => c.id === 'rag-tables-bulk-and-area')).toBe(true);

      const { prompt } = buildSelectiveRagPrompt('khuyen mai thu tu mua 2 tang 1', {
        topK: 3,
        roleScope: 'customer',
        customChunks: [customChunk],
      });
      expect(prompt).toContain('Chương trình Mua 2 Tặng 1 Thứ Tư');
      expect(prompt).toContain('ANTI-HALLUCINATION');
    });
  });

  describe('2. Rule Engine: 0ms RAG QA & Multi-turn Table Context Inheritance', () => {
    it('answers system how-to questions in 0ms via RAG Engine with source citation', () => {
      const res = matchRuleBased(
        'làm sao để tạo bàn nhanh từ BAN01 đến BAN15 ở khu phòng hát?',
        catalog,
        sampleTables
      );
      expect(res.matched).toBe(true);
      expect(res.output?.action).toBe('qa');
      expect(res.output?.message).toContain('Tạo bàn nhanh');
      expect(res.output?.message).toContain('[Nguồn:');
    });

    it('inherits targetTable from currentTable or conversation history when user omits table in follow-up order', () => {
      // Trường hợp 1: Kế thừa từ currentTable đang mở trên POS
      const fromCurrent = matchRuleBased(
        'thêm 2 trà đào cam sả size L ít đá',
        catalog,
        sampleTables,
        undefined,
        [],
        { currentTable: 'Bàn 02' }
      );
      expect(fromCurrent.matched).toBe(true);
      expect(fromCurrent.output?.action).toBe('add');
      expect(fromCurrent.output?.targetTable?.id).toBe('BAN02');

      // Trường hợp 2: Kế thừa từ lịch sử hội thoại (lượt trước vừa mở Bàn 03)
      const fromHistory = matchRuleBased(
        'cho thêm 1 bạc xỉu ít ngọt',
        catalog,
        sampleTables,
        undefined,
        [],
        {
          history: [
            { role: 'user', content: 'mở bàn 3' },
            { role: 'assistant', content: 'Đã chọn Bàn 03. Bạn muốn gọi thêm món gì?' },
          ],
        }
      );
      expect(fromHistory.matched).toBe(true);
      expect(fromHistory.output?.action).toBe('add');
      expect(fromHistory.output?.targetTable?.id).toBe('BAN03');
    });
  });

  describe('3. Security Guardrails: Manager (Quản lý) vs Cashier Permissions', () => {
    it('allows Admin and Quản lý to query store revenue while blocking regular cashier staff', () => {
      const managerCheck = checkSecurityGuardrails('Tổng doanh thu hôm nay của quán là bao nhiêu?', 'Quản lý');
      expect(managerCheck.violated).toBe(false);

      const adminCheck = checkSecurityGuardrails('Báo cáo doanh thu tháng này', 'Admin');
      expect(adminCheck.violated).toBe(false);

      const cashierCheck = checkSecurityGuardrails('Tổng doanh thu hôm nay của quán là bao nhiêu?', 'Thu ngân');
      expect(cashierCheck.violated).toBe(true);
      expect(cashierCheck.type).toBe('unauthorized');
    });
  });

  describe('4. Customer QR Chatbot: Topping Preservation & Service-Call Trigger', () => {
    it('preserves extracted toppings in note even when original note is empty', () => {
      const mergedEmpty = buildMergedToppingNote(['Trân châu đen', 'Kem cheese'], '');
      expect(mergedEmpty).toBe('Thêm Trân châu đen, Kem cheese');

      const mergedWithNote = buildMergedToppingNote(['Trân châu trắng'], 'Để đá riêng');
      expect(mergedWithNote).toBe('Thêm Trân châu trắng · Để đá riêng');

      // Không bị nhân đôi nếu trong note đã có sẵn tên topping
      const noDup = buildMergedToppingNote(['Kem cheese'], 'Thêm Kem cheese');
      expect(noDup).toBe('Thêm Kem cheese');
    });

    it('detects customer service-call intents accurately', () => {
      expect(detectServiceCallReason('Cho mình xin thêm khăn giấy bạn ơi')).toBe('Xin thêm khăn giấy tại bàn');
      expect(detectServiceCallReason('Cho xin thêm cốc đá nhé')).toBe('Xin thêm đá / nước lọc');
      expect(detectServiceCallReason('Nhân viên ơi tính tiền tại bàn giúp mình')).toBe('Cần nhân viên hỗ trợ tại bàn');
      expect(detectServiceCallReason('Cho mình 2 ly trà đào cam sả')).toBeNull();
    });
  });
});
