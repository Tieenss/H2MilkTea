import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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

import { GET, POST } from '@/app/api/settings/features/route';

function makeRequest(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/settings/features', {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('System Features Settings API (/api/settings/features)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/settings/features', () => {
    it('returns default config when no database or unauthenticated', async () => {
      createAdminSupabaseClient.mockReturnValue(null);
      getAuthenticatedStaff.mockResolvedValue(null);

      const res = await GET(makeRequest('GET'));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isAdmin).toBe(false);
      expect(data.config).toBeDefined();
      expect(data.config.flags).toBeDefined();
    });

    it('returns stored config from Supabase app_settings', async () => {
      const mockConfig = {
        flags: { pos_ai_assistant: false },
        rolePermissions: {},
        staffOverrides: {},
        updatedAt: '2026-11-01T20:00:00Z',
        updatedBy: 'admin',
      };

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { value: mockConfig, updated_at: '2026-11-01T20:00:00Z', updated_by: null },
                error: null,
              }),
            }),
          }),
        }),
      };

      createAdminSupabaseClient.mockReturnValue(mockSupabase);
      getAuthenticatedStaff.mockResolvedValue({ id: 'admin', email: 'admin@h2.com' });
      getStaffRole.mockResolvedValue({ role: 'Admin', isAdmin: true });

      const res = await GET(makeRequest('GET'));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isAdmin).toBe(true);
      expect(data.config.flags.pos_ai_assistant).toBe(false);
      expect(data.config.updatedBy).toBe('admin');
    });
  });

  describe('POST /api/settings/features', () => {
    it('returns 401 when staff is not authenticated', async () => {
      getAuthenticatedStaff.mockResolvedValue(null);

      const res = await POST(makeRequest('POST', { flags: {} }));
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Chưa xác thực');
    });

    it('returns 403 when staff is not an Admin', async () => {
      createAdminSupabaseClient.mockReturnValue({});
      getAuthenticatedStaff.mockResolvedValue({ id: 'staff_1', email: 'staff@h2.com' });
      getStaffRole.mockResolvedValue({ role: 'Thu ngân', isAdmin: false });

      const res = await POST(makeRequest('POST', { flags: {} }));
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Chỉ Quản trị viên');
    });

    it('successfully saves config and safely handles non-UUID staff.id (admin)', async () => {
      let savedRecord: any = null;
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockImplementation((record: any) => {
            savedRecord = record;
            return Promise.resolve({ error: null });
          }),
        }),
      };

      createAdminSupabaseClient.mockReturnValue(mockSupabase);
      getAuthenticatedStaff.mockResolvedValue({
        id: 'admin',
        email: 'admin@h2.com',
        user_metadata: { username: 'admin', name: 'Quản trị viên' },
      });
      getStaffRole.mockResolvedValue({ role: 'Quản trị viên', isAdmin: true });

      const payload = {
        flags: { pos_ai_assistant: true, pos_qr_inbox: false },
      };

      const res = await POST(makeRequest('POST', payload));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isAdmin).toBe(true);
      expect(data.config.flags.pos_qr_inbox).toBe(false);

      // updated_by phải là null vì 'admin' không phải là UUID
      expect(savedRecord).toBeDefined();
      expect(savedRecord.updated_by).toBeNull();
      expect(savedRecord.value.updatedBy).toBe('admin');
    });
  });
});
