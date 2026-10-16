import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getStaffRole } from '@/lib/supabase/server';

const { getAuthenticatedStaff, createAdminSupabaseClient } = vi.hoisted(() => ({
  getAuthenticatedStaff: vi.fn(),
  createAdminSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase/server')>();
  return {
    ...actual,
    getAuthenticatedStaff,
    createAdminSupabaseClient,
  };
});

import { GET, PUT } from '@/app/api/ai/settings/route';

function makeRequest(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/ai/settings', {
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
    or: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: store[chain._lastQueryKey] || null, error: null })),
    upsert: vi.fn(async (payload: any) => {
      store[payload.key] = payload;
      return { data: payload, error: null };
    }),
    _lastQueryKey: '',
  };
  return { from: vi.fn(() => chain), _store: store };
}

describe('AI Settings & Admin Role Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStaffRole function', () => {
    it('identifies admin when username is admin or email starts with admin@', async () => {
      const res1 = await getStaffRole(null, { id: 'u1', email: 'admin@h2.com' });
      expect(res1.isAdmin).toBe(true);
      expect(res1.role).toBe('Admin');

      const res2 = await getStaffRole(null, { id: 'u2', email: 'admin@gmail.com' });
      expect(res2.isAdmin).toBe(true);
      expect(res2.role).toBe('Admin');
    });

    it('identifies admin via DSNV.json fallback for phuocnv', async () => {
      const res = await getStaffRole(null, { id: 'u3', email: 'phuocnv@h2.com' });
      expect(res.isAdmin).toBe(true);
      expect(res.role).toBe('Admin');
    });

    it('treats unknown staff as standard staff with isAdmin = false', async () => {
      const res = await getStaffRole(null, { id: 'u4', email: 'nhanvien_order@h2.com' });
      expect(res.isAdmin).toBe(false);
      expect(res.role).toBe('Nhân viên');
    });

    it('returns Guest for unauthenticated staff', async () => {
      const res = await getStaffRole(null, null);
      expect(res.isAdmin).toBe(false);
      expect(res.role).toBe('Khách');
    });
  });

  describe('API Route /api/ai/settings', () => {
    it('returns 401 when staff is not authenticated', async () => {
      getAuthenticatedStaff.mockResolvedValue(null);
      const res = await GET(makeRequest('GET'));
      expect(res.status).toBe(401);
    });

    it('returns 403 when non-admin staff tries to update settings', async () => {
      getAuthenticatedStaff.mockResolvedValue({ id: 'staff-99', email: 'nhanvien_order@h2.com' });
      const client = makeSupabaseMock();
      createAdminSupabaseClient.mockReturnValue(client);

      const res = await PUT(makeRequest('PUT', { enabled: false }));
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Chỉ Admin mới được đổi cài đặt');
    });

    it('allows admin staff (admin@h2.com) to save settings with 200 OK', async () => {
      getAuthenticatedStaff.mockResolvedValue({ id: 'admin-1', email: 'admin@h2.com' });
      const client = makeSupabaseMock();
      createAdminSupabaseClient.mockReturnValue(client);

      const res = await PUT(makeRequest('PUT', {
        enabled: true,
        autoSubmitVoice: false,
        voiceSilenceTimeoutMs: 2000,
        maxItemQuantity: 15,
      }));

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isAdmin).toBe(true);
      expect(data.settings.autoSubmitVoice).toBe(false);
      expect(data.settings.voiceSilenceTimeoutMs).toBe(2000);
      expect(data.settings.maxItemQuantity).toBe(15);
    });

    it('returns isAdmin in GET response', async () => {
      getAuthenticatedStaff.mockResolvedValue({ id: 'admin-1', email: 'admin@h2.com' });
      const client = makeSupabaseMock();
      createAdminSupabaseClient.mockReturnValue(client);

      const res = await GET(makeRequest('GET'));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isAdmin).toBe(true);
    });
  });
});
