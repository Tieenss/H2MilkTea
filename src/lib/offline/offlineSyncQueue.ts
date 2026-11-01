/**
 * Offline Sync Queue & Network Resilience Manager for H2MilkTea POS
 * Hỗ trợ lưu trữ hóa đơn ngoại tuyến và tự động đồng bộ khi có kết nối Internet.
 */

export interface OfflineCheckoutPayload {
  invoiceId: string;
  tableId: string | null;
  tableName: string;
  cart: any[];
  items: any[];
  invoice: any;
  details: any[];
  linkedOrderIds?: string[];
  orderIds?: string[];
  totalAmount: number;
  employee: string;
  idempotencyKey: string;
  paymentForm: any;
  queuedAt: number;
}

const STORAGE_KEY = 'h2_pos_offline_checkout_queue_v1';

/**
 * Lấy danh sách hàng đợi ngoại tuyến từ Storage (hỗ trợ fallback an toàn)
 */
export function getOfflineCheckoutQueue(): OfflineCheckoutPayload[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.error('Lỗi khi đọc hàng đợi ngoại tuyến:', error);
    return [];
  }
}

/**
 * Lưu danh sách hàng đợi ngoại tuyến vào Storage
 */
function saveOfflineCheckoutQueue(queue: OfflineCheckoutPayload[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    notifyQueueChange(queue.length);
  } catch (error) {
    console.error('Lỗi khi lưu hàng đợi ngoại tuyến:', error);
  }
}

/**
 * Phát CustomEvent để UI cập nhật số lượng đơn chờ đồng bộ theo thời gian thực
 */
function notifyQueueChange(count: number) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('h2_offline_queue_changed', { detail: { count } }));
  }
}

/**
 * Thêm một giao dịch thanh toán vào hàng đợi ngoại tuyến
 */
export function queueOfflineCheckout(payload: Omit<OfflineCheckoutPayload, 'queuedAt'>): OfflineCheckoutPayload {
  const item: OfflineCheckoutPayload = {
    ...payload,
    queuedAt: Date.now(),
    invoice: {
      ...payload.invoice,
      'Ghi chú': payload.invoice['Ghi chú']
        ? `${payload.invoice['Ghi chú']} (Thanh toán ngoại tuyến)`
        : '(Thanh toán ngoại tuyến)',
    },
  };

  const queue = getOfflineCheckoutQueue();
  // Tránh thêm trùng idempotencyKey
  const existingIdx = queue.findIndex((q) => q.idempotencyKey === item.idempotencyKey);
  if (existingIdx >= 0) {
    queue[existingIdx] = item;
  } else {
    queue.push(item);
  }

  saveOfflineCheckoutQueue(queue);
  return item;
}

/**
 * Đếm số lượng đơn hàng đang chờ đồng bộ
 */
export function getPendingOfflineCount(): number {
  return getOfflineCheckoutQueue().length;
}

/**
 * Xóa một đơn hàng đã đồng bộ thành công khỏi hàng đợi
 */
export function removeOfflineCheckout(idempotencyKey: string) {
  const queue = getOfflineCheckoutQueue();
  const nextQueue = queue.filter((q) => q.idempotencyKey !== idempotencyKey);
  saveOfflineCheckoutQueue(nextQueue);
}

/**
 * Đồng bộ toàn bộ các đơn hàng ngoại tuyến lên máy chủ
 */
export async function syncPendingCheckouts(): Promise<{
  successCount: number;
  failedCount: number;
  remainingCount: number;
}> {
  const queue = getOfflineCheckoutQueue();
  if (queue.length === 0) {
    return { successCount: 0, failedCount: 0, remainingCount: 0 };
  }

  let successCount = 0;
  let failedCount = 0;

  for (const item of [...queue]) {
    try {
      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        removeOfflineCheckout(item.idempotencyKey);
        successCount++;
      } else {
        // Nếu mã đơn đã tồn tại (do idempotency trigger thành công trước đó), an toàn xóa khỏi queue
        if (data.error && /đã tồn tại|duplicate|already exists/i.test(data.error)) {
          removeOfflineCheckout(item.idempotencyKey);
          successCount++;
        } else {
          failedCount++;
        }
      }
    } catch (netErr) {
      console.warn(`Đồng bộ đơn ${item.invoiceId} thất bại (mạng chưa ổn định):`, netErr);
      failedCount++;
      // Nếu mất mạng giữa chừng, tạm dừng vòng lặp sync để chờ kết nối lại
      break;
    }
  }

  const remainingCount = getPendingOfflineCount();
  notifyQueueChange(remainingCount);

  return { successCount, failedCount, remainingCount };
}

/**
 * Khởi tạo listener tự động đồng bộ khi phát hiện trình duyệt có mạng trở lại
 */
let isAutoSyncInitialized = false;

export function initAutoOfflineSync() {
  if (typeof window === 'undefined' || isAutoSyncInitialized) return;
  isAutoSyncInitialized = true;

  window.addEventListener('online', () => {
    console.log('[OfflineSync] Phát hiện kết nối Internet phục hồi, tiến hành đồng bộ hàng đợi...');
    setTimeout(() => {
      void syncPendingCheckouts();
    }, 1500);
  });
}
