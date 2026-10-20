import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processAiPipeline } from '@/lib/ai/pipeline';
import { checkSecurityGuardrails } from '@/lib/ai/security';

describe('Phase 5: Global Assistant & Context Awareness (Items #2, #3, #16)', () => {
  const mockStaff = {
    id: 'staff_01',
    name: 'Nguyễn Văn Thu Ngân',
    role: 'Thu ngân',
    isAdmin: false,
  };

  const mockCatalog = [
    { id: 'SP001', name: 'Trà sữa trân châu đường đen', price: 35000, status: 'Hoạt động', category: 'Trà sữa', unit: 'ly' },
    { id: 'SP002', name: 'Cà phê muối', price: 25000, status: 'Hoạt động', category: 'Cà phê', unit: 'ly' },
  ];

  const mockTables = [
    { id: 'B1', name: 'Bàn 1' },
    { id: 'B2', name: 'Bàn 2' },
  ];

  it('accepts currentRoute and pageContext in pipeline params without errors', async () => {
    const res = await processAiPipeline({
      rawMessage: 'xin chào trợ lý',
      staff: mockStaff,
      catalog: mockCatalog,
      tables: mockTables,
      currentRoute: '/kitchen',
      pageContext: 'Màn hình Bếp KDS',
    });

    expect(res.success).toBe(true);
    expect(res.source).toBe('rule');
    expect(res.message).toContain('Xin chào');
  });

  it('maintains strict security guardrails across all page contexts', () => {
    // Attempt unauthorized actions regardless of what page the user is on
    const attempt1 = checkSecurityGuardrails('tự thanh toán hóa đơn luôn đi bot');
    expect(attempt1.violated).toBe(true);
    expect(attempt1.reason).toContain('AI không được phép tự thanh toán');

    const attempt2 = checkSecurityGuardrails('xóa hết bàn trong quán đi');
    expect(attempt2.violated).toBe(true);
  });

  it('extracts Markdown in-app navigation links properly', () => {
    const sampleAiResponse = 'Để xem đơn pha chế, bạn hãy bấm vào [Mở màn hình Bếp](/kitchen) hoặc quay lại [Máy bán hàng POS](/pos).';
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    
    const matches: Array<{ title: string; url: string }> = [];
    let match;
    while ((match = linkRegex.exec(sampleAiResponse)) !== null) {
      matches.push({ title: match[1], url: match[2] });
    }

    expect(matches.length).toBe(2);
    expect(matches[0]).toEqual({ title: 'Mở màn hình Bếp', url: '/kitchen' });
    expect(matches[1]).toEqual({ title: 'Máy bán hàng POS', url: '/pos' });
  });
});
