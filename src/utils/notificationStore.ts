'use client';

export interface AppNotification {
  id: string | number;
  title: string;
  message: string;
  time: string;
  createdAt: string;
  type: 'warning' | 'success' | 'info' | 'error';
  unread: boolean;
  route: string;
  actionLabel?: string;
  category?: 'inventory' | 'order' | 'kitchen' | 'system';
}

const STORAGE_KEY = 'h2_notifications_data';

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Cảnh báo tồn kho',
    message: 'Nguyên liệu Bột sữa và Trân châu đen sắp chạm ngưỡng an toàn (còn dưới 5kg)',
    time: '5 phút trước',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    type: 'warning',
    unread: true,
    route: '/inventory/transactions',
    actionLabel: 'Kiểm tra kho',
    category: 'inventory',
  },
  {
    id: 'notif-2',
    title: 'Đơn hàng mới từ QR bàn',
    message: 'Bàn 3 vừa gửi đơn order trà sữa qua mã QR cần thu ngân xác nhận',
    time: '12 phút trước',
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    type: 'info',
    unread: true,
    route: '/pos',
    actionLabel: 'Mở POS xem bàn',
    category: 'order',
  },
  {
    id: 'notif-3',
    title: 'Khu vực bếp KDS',
    message: 'Có 3 đơn pha chế đang chờ thực hiện quá 15 phút tại quầy bar',
    time: '25 phút trước',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    type: 'warning',
    unread: true,
    route: '/kitchen',
    actionLabel: 'Mở Bếp KDS',
    category: 'kitchen',
  },
  {
    id: 'notif-4',
    title: 'Cài đặt mẫu in tem & VAT',
    message: 'Đã kích hoạt tính năng in tem tách món và cấu hình thuế VAT mới',
    time: '1 giờ trước',
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    type: 'success',
    unread: false,
    route: '/receipt-settings',
    actionLabel: 'Cấu hình mẫu in',
    category: 'system',
  },
  {
    id: 'notif-5',
    title: 'Đồng bộ Google Drive',
    message: 'Kiểm tra trạng thái sao lưu dữ liệu tự động lên đám mây',
    time: '2 giờ trước',
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    type: 'info',
    unread: false,
    route: '/settingdata',
    actionLabel: 'Xem sao lưu',
    category: 'system',
  },
];

export function getStoredNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return INITIAL_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_NOTIFICATIONS;
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

export function saveNotifications(notifications: AppNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('h2_notifications_updated', { detail: notifications }));
  } catch (err) {
    console.error('Failed to save notifications', err);
  }
}

export function markAsRead(id: string | number): AppNotification[] {
  const current = getStoredNotifications();
  const updated = current.map((item) =>
    item.id === id ? { ...item, unread: false } : item
  );
  saveNotifications(updated);
  return updated;
}

export function markAllAsRead(): AppNotification[] {
  const current = getStoredNotifications();
  const updated = current.map((item) => ({ ...item, unread: false }));
  saveNotifications(updated);
  return updated;
}

export function clearAllNotifications(): AppNotification[] {
  saveNotifications([]);
  return [];
}

export function resetDefaultNotifications(): AppNotification[] {
  saveNotifications(INITIAL_NOTIFICATIONS);
  return INITIAL_NOTIFICATIONS;
}

export function getUnreadCount(notifications: AppNotification[]): number {
  return notifications.filter((n) => n.unread).length;
}
