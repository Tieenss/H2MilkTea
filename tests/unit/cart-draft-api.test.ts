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

import { DELETE, GET, PUT } from '@/app/api/pos/cart-draft/route';

function makeRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeSupabaseMock(result: { data?: unknown; error?: unknown }) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
    upsert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    single: vi.fn(async () => result),
    delete: vi.fn(() => chain),
    then: (resolve: any) => Promise.resolve(result).then(resolve),
  };
  return { from: vi.fn(() => chain) };
}

describe('cart draft API (Phase 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedStaff.mockResolvedValue({ id: 'staff-1' });
  });

  it('rejects unauthenticated access', async () => {
    getAuthenticatedStaff.mockResolvedValue(null);
    const response = await GET(makeRequest('GET', '/api/pos/cart-draft?tableId=B3'));
    expect(response.status).toBe(401);
  });

  it('fetches all cart drafts when tableId is omitted (Item #18)', async () => {
    const drafts = [
      { table_id: 'B1', cart: [{ id: 'SP1', quantity: 2 }], version: 1 },
      { table_id: 'B2', cart: [{ id: 'SP2', quantity: 1 }], version: 2 },
    ];
    const client = makeSupabaseMock({ data: drafts, error: null });
    createAdminSupabaseClient.mockReturnValue(client);

    const res = await GET(makeRequest('GET', '/api/pos/cart-draft'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.drafts).toHaveLength(2);
    expect(client.from).toHaveBeenCalledWith('pos_cart_drafts');
  });

  it('validates cart payloads with max item limits', async () => {
    const response = await PUT(makeRequest('PUT', '/api/pos/cart-draft', {
      tableId: 'B3',
      cart: Array.from({ length: 51 }, () => ({})),
    }));
    expect(response.status).toBe(400);
  });

  it('reads, writes, and deletes a draft with customer sync (Item #10)', async () => {
    const draft = {
      table_id: 'B3',
      cart: [{ id: 'SP001', quantity: 1 }],
      selected_customer: { IDKH: 'KH001', 'Tên khách hàng': 'Nguyễn Văn A' },
      version: 1,
    };
    const client = makeSupabaseMock({ data: draft, error: null });
    createAdminSupabaseClient.mockReturnValue(client);

    expect((await GET(makeRequest('GET', '/api/pos/cart-draft?tableId=B3'))).status).toBe(200);
    expect((await PUT(makeRequest('PUT', '/api/pos/cart-draft', {
      tableId: 'B3',
      cart: [{ id: 'SP001', quantity: 1 }],
      selectedCustomer: { IDKH: 'KH001', 'Tên khách hàng': 'Nguyễn Văn A' },
      expectedVersion: 1,
    }))).status).toBe(200);
    expect((await DELETE(makeRequest('DELETE', '/api/pos/cart-draft?tableId=B3'))).status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('pos_cart_drafts');
  });

  it('returns conflict when the draft version is stale', async () => {
    let count = 0;
    const chain = {
      update: vi.fn(() => chain),
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => {
        count++;
        if (count === 1) return { data: null, error: null }; // update không match dòng nào do lệch version
        return { data: { version: 4 }, error: null }; // current version
      }),
    };
    createAdminSupabaseClient.mockReturnValue({ from: vi.fn(() => chain) });

    const response = await PUT(makeRequest('PUT', '/api/pos/cart-draft', {
      tableId: 'B3',
      cart: [],
      expectedVersion: 3,
    }));
    expect(response.status).toBe(409);
    expect((await response.json()).conflict).toBe(true);
  });
});
