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

describe('Kiểm thử xung đột đồng thời & Chống thanh toán trùng lặp (Concurrency & Idempotency)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedStaff.mockResolvedValue({ id: 'staff-1', username: 'admin', fullName: 'Quản trị viên' });
  });

  it('xử lý an toàn khi 2 request cùng idempotencyKey gửi đến (chống double charge)', async () => {
    let callCount = 0;
    const mockRpc = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        // Lần đầu: tạo mới thành công
        return { data: { success: true, invoice_id: 'HD_CONCURRENCY_1', idempotent: false }, error: null };
      } else {
        // Lần 2 gửi trùng key: trả về idempotent true, không tạo lại
        return { data: { success: true, invoice_id: 'HD_CONCURRENCY_1', idempotent: true }, error: null };
      }
    });

    createAdminSupabaseClient.mockReturnValue({
      rpc: mockRpc,
    });

    const payload = {
      tableId: 'BAN_01',
      tableName: 'Bàn 1',
      invoiceId: 'HD_CONCURRENCY_1',
      idempotencyKey: 'IDEMP_KEY_ABC_123',
      paymentForm: { paidAmount: 50000, discount: 0, paymentType: 'Tiền mặt' },
      cart: [{ id: 'SP1', name: 'Trà sữa khoai môn', price: 30000, quantity: 1 }],
    };

    // Bắn 2 request đồng thời
    const [res1, res2] = await Promise.all([
      POST(makeRequest(payload)),
      POST(makeRequest(payload)),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const data1 = await res1.json();
    const data2 = await res2.json();

    expect(data1.success).toBe(true);
    expect(data2.success).toBe(true);
    expect(data1.invoiceId).toBe('HD_CONCURRENCY_1');
    expect(data2.invoiceId).toBe('HD_CONCURRENCY_1');
    // Ít nhất 1 trong 2 phải nhận diện được idempotent
    expect(data1.idempotent || data2.idempotent).toBe(true);
  });
});
