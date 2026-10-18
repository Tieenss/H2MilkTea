import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { getAuthenticatedStaff, createAdminSupabaseClient } = vi.hoisted(() => ({
  getAuthenticatedStaff: vi.fn(),
  createAdminSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  getAuthenticatedStaff,
  createAdminSupabaseClient,
}));

import { POST } from '@/app/api/pos/transfer-table/route';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/pos/transfer-table', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POS Transfer Table API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedStaff.mockResolvedValue({ id: 'staff-1' });
  });

  it('rejects unauthenticated requests', async () => {
    getAuthenticatedStaff.mockResolvedValue(null);
    const response = await POST(makeRequest({ sourceTableId: 'B1', targetTableId: 'B2' }));
    expect(response.status).toBe(401);
  });

  it('validates source and target table ids', async () => {
    // Thiếu mã bàn
    expect((await POST(makeRequest({ sourceTableId: 'B1' }))).status).toBe(400);

    // Bàn nguồn và bàn đích trùng nhau
    const sameTableRes = await POST(makeRequest({ sourceTableId: 'B1', targetTableId: 'B1' }));
    expect(sameTableRes.status).toBe(400);
    const body = await sameTableRes.json();
    expect(body.error).toContain('trùng nhau');
  });

  it('transfers cart draft from source to target via RPC when available', async () => {
    const mockSupabase = {
      rpc: vi.fn(async () => ({ data: { success: true, source_table_id: 'B1', target_table_id: 'B2' }, error: null })),
    };
    createAdminSupabaseClient.mockReturnValue(mockSupabase);

    const response = await POST(makeRequest({ sourceTableId: 'B1', targetTableId: 'B2' }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('pos_transfer_table_cart', {
      p_source_table_id: 'B1',
      p_target_table_id: 'B2',
      p_staff_id: 'staff-1',
    });
  });

  it('falls back to atomic server-side transfer and merges carts if target has draft', async () => {
    let callCount = 0;
    const chain = {
      select: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => {
        callCount++;
        // Lần 1: source draft có 1 món
        if (callCount === 1) return { data: { table_id: 'B1', cart: [{ id: 'SP1', quantity: 1 }], version: 2 }, error: null };
        // Lần 2: target draft đã có 1 món
        return { data: { table_id: 'B2', cart: [{ id: 'SP2', quantity: 2 }], version: 1 }, error: null };
      }),
    };
    const mockSupabase = {
      rpc: vi.fn(async () => ({ data: null, error: { message: 'function not found' } })),
      from: vi.fn(() => chain),
    };
    createAdminSupabaseClient.mockReturnValue(mockSupabase);

    const response = await POST(makeRequest({ sourceTableId: 'B1', targetTableId: 'B2' }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    // Draft bàn nguồn được xóa sau khi merge vào bàn đích
    expect(chain.delete).toHaveBeenCalled();
  });
});
