import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { findRelevantFAQ, getStoreFAQPrompt, getKnowledgeBasePrompt, StoreFAQItem } from '@/lib/ai/knowledge';

const { getAuthenticatedStaff, createAdminSupabaseClient, getStaffRole } = vi.hoisted(() => ({
  getAuthenticatedStaff: vi.fn(),
  createAdminSupabaseClient: vi.fn(),
  getStaffRole: vi.fn(),
}));

vi.mock('@/lib/supabase/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase/server')>();
  return {
    ...actual,
    getAuthenticatedStaff,
    createAdminSupabaseClient,
    getStaffRole,
  };
});

import { GET, PUT } from '@/app/api/ai/faq/route';

function makeRequest(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/ai/faq', {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeSupabaseMock(store: Record<string, any> = {}) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((col: string, val: any) => {
      chain._lastQueryKey = val;
      return chain;
    }),
    maybeSingle: vi.fn(async () => ({ data: store[chain._lastQueryKey] || null, error: null })),
    upsert: vi.fn(async (payload: any) => {
      store[payload.key] = payload;
      return { data: payload, error: null };
    }),
    _lastQueryKey: '',
  };
  return { from: vi.fn(() => chain), _store: store };
}

describe('Store FAQ & Knowledge Integration', () => {
  const sampleFaqs: StoreFAQItem[] = [
    {
      id: 'faq-wifi',
      category: 'Tiện ích',
      question: 'Mật khẩu Wifi là gì?',
      answer: 'Pass: 88888888',
      keywords: ['wifi', 'pass wifi', 'mật khẩu'],
      isActive: true,
      order: 1,
    },
    {
      id: 'faq-hours',
      category: 'Hoạt động',
      question: 'Giờ mở cửa?',
      answer: 'Mở cửa 08:00 - 22:30',
      keywords: ['giờ mở cửa', 'mấy giờ đóng'],
      isActive: true,
      order: 2,
    },
    {
      id: 'faq-inactive',
      category: 'Tạm ngưng',
      question: 'Câu hỏi đã tắt',
      answer: 'Nội dung tắt',
      keywords: ['tắt'],
      isActive: false,
      order: 3,
    },
  ];

  describe('FAQ Matcher & Prompt Generator', () => {
    it('matches wifi query correctly', () => {
      const match = findRelevantFAQ('cho em xin pass wifi với ạ', sampleFaqs);
      expect(match?.id).toBe('faq-wifi');
    });

    it('matches store hours query', () => {
      const match = findRelevantFAQ('quán mấy giờ đóng cửa vậy', sampleFaqs);
      expect(match?.id).toBe('faq-hours');
    });

    it('ignores inactive FAQs when searching', () => {
      const match = findRelevantFAQ('câu hỏi đã tắt', sampleFaqs);
      expect(match).toBeNull();
    });

    it('generates prompt with only active FAQs', () => {
      const prompt = getStoreFAQPrompt(sampleFaqs);
      expect(prompt).toContain('Mật khẩu Wifi là gì?');
      expect(prompt).toContain('Pass: 88888888');
      expect(prompt).toContain('Giờ mở cửa?');
      expect(prompt).not.toContain('Câu hỏi đã tắt');
    });

    it('integrates FAQ section into knowledgeBasePrompt', () => {
      const fullPrompt = getKnowledgeBasePrompt(sampleFaqs);
      expect(fullPrompt).toContain('THÔNG TIN & TIỆN ÍCH QUÁN H2 MILKTEA');
      expect(fullPrompt).toContain('HƯỚNG DẪN SỬ DỤNG HỆ THỐNG POS H2 MILKTEA');
    });
  });

  describe('API Route /api/ai/faq', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('GET returns default or stored FAQs', async () => {
      getAuthenticatedStaff.mockResolvedValue(null);
      getStaffRole.mockResolvedValue({ role: 'Khách', isAdmin: false });
      createAdminSupabaseClient.mockReturnValue(null);

      const res = await GET(makeRequest('GET'));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.faqs)).toBe(true);
      expect(data.faqs.length).toBeGreaterThan(0);
    });

    it('PUT returns 401 when staff not logged in', async () => {
      getAuthenticatedStaff.mockResolvedValue(null);
      const res = await PUT(makeRequest('PUT', { faqs: [] }));
      expect(res.status).toBe(401);
    });

    it('PUT returns 403 when non-admin staff attempts to save', async () => {
      getAuthenticatedStaff.mockResolvedValue({ id: 'staff-1', email: 'nv@h2.com' });
      getStaffRole.mockResolvedValue({ role: 'Nhân viên', isAdmin: false });
      createAdminSupabaseClient.mockReturnValue(makeSupabaseMock());

      const res = await PUT(makeRequest('PUT', { faqs: sampleFaqs }));
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Chỉ Admin');
    });

    it('PUT saves FAQs successfully when user is Admin', async () => {
      getAuthenticatedStaff.mockResolvedValue({ id: 'admin-1', email: 'admin@h2.com' });
      getStaffRole.mockResolvedValue({ role: 'Admin', isAdmin: true });
      const client = makeSupabaseMock();
      createAdminSupabaseClient.mockReturnValue(client);

      const res = await PUT(makeRequest('PUT', { faqs: sampleFaqs }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.faqs.length).toBe(3);
    });
  });
});
