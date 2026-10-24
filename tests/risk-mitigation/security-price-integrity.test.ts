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

import { POST } from '@/app/api/pos/checkout/route';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/pos/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Kiểm thử bảo mật dữ liệu đầu vào & Chống gian lận giá (Security & Price Integrity)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedStaff.mockResolvedValue({ id: 'staff-1', username: 'admin', fullName: 'Quản trị viên' });
  });

  it('chặn đơn hàng có số lượng âm hoặc số lượng 0', async () => {
    // Kẻ gian gửi số lượng âm
    const resAm = await POST(makeRequest({
      invoiceId: 'HD_TAMPER_1',
      cart: [{ id: 'SP1', price: 30000, quantity: -2 }],
      paymentForm: { paidAmount: 50000 },
    }));
    expect(resAm.status).toBe(400);
    const bodyAm = await resAm.json();
    expect(bodyAm.error).toMatch(/số lượng|không hợp lệ/i);

    // Kẻ gian gửi số lượng 0
    const resKhong = await POST(makeRequest({
      invoiceId: 'HD_TAMPER_2',
      cart: [{ id: 'SP1', price: 30000, quantity: 0 }],
      paymentForm: { paidAmount: 50000 },
    }));
    expect(resKhong.status).toBe(400);
  });

  it('chặn đơn hàng có đơn giá âm', async () => {
    const res = await POST(makeRequest({
      invoiceId: 'HD_TAMPER_3',
      cart: [{ id: 'SP1', price: -30000, quantity: 1 }],
      paymentForm: { paidAmount: 50000 },
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/giá|không hợp lệ/i);
  });

  it('chặn discount âm (làm tăng khống tiền)', async () => {
    const res = await POST(makeRequest({
      invoiceId: 'HD_TAMPER_4',
      cart: [{ id: 'SP1', price: 30000, quantity: 1 }],
      paymentForm: { discount: -50000, paidAmount: 50000 },
    }));
    expect(res.status).toBe(400);
  });
});
