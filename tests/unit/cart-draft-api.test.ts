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
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
    upsert: vi.fn(() => chain),
    single: vi.fn(async () => result),
    delete: vi.fn(() => chain),
  };
  return { from: vi.fn(() => chain) };
}

describe('cart draft API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedStaff.mockResolvedValue({ id: 'staff-1' });
  });

  it('rejects unauthenticated access', async () => {
    getAuthenticatedStaff.mockResolvedValue(null);
    const response = await GET(makeRequest('GET', '/api/pos/cart-draft?tableId=B3'));
    expect(response.status).toBe(401);
  });

  it('validates table and cart payloads', async () => {
    expect((await GET(makeRequest('GET', '/api/pos/cart-draft'))).status).toBe(400);
    const response = await PUT(makeRequest('PUT', '/api/pos/cart-draft', {
      tableId: 'B3',
      cart: Array.from({ length: 51 }, () => ({})),
    }));
    expect(response.status).toBe(400);
  });

  it('reads, writes, and deletes a draft', async () => {
    const draft = { table_id: 'B3', cart: [], version: 1 };
    const client = makeSupabaseMock({ data: draft, error: null });
    createAdminSupabaseClient.mockReturnValue(client);

    expect((await GET(makeRequest('GET', '/api/pos/cart-draft?tableId=B3'))).status).toBe(200);
    expect((await PUT(makeRequest('PUT', '/api/pos/cart-draft', {
      tableId: 'B3',
      cart: [{ id: 'SP001', quantity: 1 }],
      expectedVersion: 1,
    }))).status).toBe(200);
    expect((await DELETE(makeRequest('DELETE', '/api/pos/cart-draft?tableId=B3'))).status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('pos_cart_drafts');
  });

  it('returns conflict when the draft version is stale', async () => {
    createAdminSupabaseClient.mockReturnValue(
      makeSupabaseMock({ data: { version: 4 }, error: null }),
    );
    const response = await PUT(makeRequest('PUT', '/api/pos/cart-draft', {
      tableId: 'B3',
      cart: [],
      expectedVersion: 3,
    }));
    expect(response.status).toBe(409);
    expect((await response.json()).conflict).toBe(true);
  });
});
