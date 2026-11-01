import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  queueOfflineCheckout,
  getOfflineCheckoutQueue,
  getPendingOfflineCount,
  removeOfflineCheckout,
  syncPendingCheckouts,
  initAutoOfflineSync,
} from '@/lib/offline/offlineSyncQueue';

// In-memory mock for localStorage & browser window in Node environment
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => storageMap.get(key) || null),
  setItem: vi.fn((key: string, value: string) => {
    storageMap.set(key, String(value));
  }),
  removeItem: vi.fn((key: string) => {
    storageMap.delete(key);
  }),
  clear: vi.fn(() => {
    storageMap.clear();
  }),
};

const eventListeners = new Map<string, Array<(e: any) => void>>();
const windowMock = {
  addEventListener: vi.fn((event: string, cb: any) => {
    const arr = eventListeners.get(event) || [];
    arr.push(cb);
    eventListeners.set(event, arr);
  }),
  removeEventListener: vi.fn((event: string, cb: any) => {
    const arr = eventListeners.get(event) || [];
    eventListeners.set(event, arr.filter(f => f !== cb));
  }),
  dispatchEvent: vi.fn((event: any) => {
    const arr = eventListeners.get(event.type) || [];
    arr.forEach(cb => cb(event));
    return true;
  }),
};

(global as any).localStorage = localStorageMock;
(global as any).window = windowMock;
(global as any).CustomEvent = class CustomEvent {
  type: string;
  detail: any;
  constructor(type: string, init?: { detail?: any }) {
    this.type = type;
    this.detail = init?.detail;
  }
};

describe('Offline Checkout Queue & Resilience (Local-First)', () => {
  beforeEach(() => {
    storageMap.clear();
    eventListeners.clear();
    vi.clearAllMocks();
  });

  const mockPayload = {
    invoiceId: 'INV-TEST-001',
    tableId: 'ban_1',
    tableName: 'Bàn 1',
    cart: [{ id: 'SP001', name: 'Trà đào', price: 25000, quantity: 2 }],
    items: [{ id: 'SP001', name: 'Trà đào', price: 25000, quantity: 2 }],
    invoice: { IDHD: 'INV-TEST-001', 'Tổng tiền': 50000, 'Ghi chú': '' },
    details: [{ IDHD: 'INV-TEST-001', IDSP: 'SP001', 'Số lượng': 2, 'Đơn giá': 25000 }],
    totalAmount: 50000,
    employee: 'Thu ngân 1',
    idempotencyKey: 'INV-TEST-001',
    paymentForm: { paidAmount: 50000, totalAmount: 50000, paymentType: 'Tiền mặt' },
  };

  it('correctly queues offline transactions and records queue timestamp and offline note', () => {
    expect(getPendingOfflineCount()).toBe(0);

    const queued = queueOfflineCheckout(mockPayload);
    expect(queued).toBeDefined();
    expect(queued.queuedAt).toBeGreaterThan(0);
    expect(queued.invoice['Ghi chú']).toContain('Thanh toán ngoại tuyến');

    expect(getPendingOfflineCount()).toBe(1);
    const queue = getOfflineCheckoutQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].invoiceId).toBe('INV-TEST-001');
  });

  it('prevents duplicate queuing for the same idempotencyKey', () => {
    queueOfflineCheckout(mockPayload);
    queueOfflineCheckout(mockPayload);

    expect(getPendingOfflineCount()).toBe(1);
  });

  it('removes item from queue on demand', () => {
    queueOfflineCheckout(mockPayload);
    expect(getPendingOfflineCount()).toBe(1);

    removeOfflineCheckout('INV-TEST-001');
    expect(getPendingOfflineCount()).toBe(0);
  });

  it('syncs pending checkouts to /api/pos/checkout successfully when online', async () => {
    queueOfflineCheckout(mockPayload);
    expect(getPendingOfflineCount()).toBe(1);

    // Mock global fetch to return success
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, invoiceId: 'INV-TEST-001' }),
    } as any);

    const result = await syncPendingCheckouts();
    expect(result.successCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(result.remainingCount).toBe(0);

    expect(getPendingOfflineCount()).toBe(0);
    expect(global.fetch).toHaveBeenCalledWith('/api/pos/checkout', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('handles server failure gracefully and keeps un-synced items in queue for future retry', async () => {
    queueOfflineCheckout(mockPayload);
    expect(getPendingOfflineCount()).toBe(1);

    // Mock global fetch to throw a network error (simulating still offline)
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await syncPendingCheckouts();
    expect(result.successCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(result.remainingCount).toBe(1);

    // Item must remain in queue!
    expect(getPendingOfflineCount()).toBe(1);
  });

  it('initializes window online event listener cleanly', () => {
    initAutoOfflineSync();
    expect(windowMock.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
  });
});
