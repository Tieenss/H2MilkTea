import { describe, it, expect, beforeEach, vi } from 'vitest';

// Setup mock browser globals for Node test environment
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => storageMap.get(key) ?? null),
  setItem: vi.fn((key: string, val: string) => {
    storageMap.set(key, String(val));
  }),
  removeItem: vi.fn((key: string) => {
    storageMap.delete(key);
  }),
  clear: vi.fn(() => {
    storageMap.clear();
  }),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
}

import {
  getStoredNotifications,
  saveNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
  resetDefaultNotifications,
  getUnreadCount,
  type AppNotification,
} from '@/utils/notificationStore';
import {
  getDeviceFeatureState,
  recordFeatureVisit,
  resetFeatureTracker,
  getFeatureBadge,
  BASE_HOT_HREFS,
  BASE_NEW_HREFS,
} from '@/utils/featureTracker';

describe('Phase 6: UI/UX & System Polish (Items #8, #9, #15, #17)', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Item #17: Sidebar Collapse State Persistence', () => {
    it('persists and retrieves user collapsed preference from localStorage', () => {
      // Simulating user collapsing the sidebar
      localStorage.setItem('h2_sidebar_collapsed', 'true');
      expect(localStorage.getItem('h2_sidebar_collapsed')).toBe('true');

      // Simulating user expanding the sidebar
      localStorage.setItem('h2_sidebar_collapsed', 'false');
      expect(localStorage.getItem('h2_sidebar_collapsed')).toBe('false');
    });
  });

  describe('Item #15: Top Notification Bell, Green Dot & Management', () => {
    it('initializes with default notifications containing unread items', () => {
      const notifs = getStoredNotifications();
      expect(notifs.length).toBeGreaterThan(0);
      const unread = getUnreadCount(notifs);
      expect(unread).toBeGreaterThan(0);
    });

    it('marks a single notification as read, removing its unread status and decreasing unread count', () => {
      const initial = resetDefaultNotifications();
      const firstUnread = initial.find((n) => n.unread)!;
      expect(firstUnread).toBeDefined();

      const updated = markAsRead(firstUnread.id);
      const after = updated.find((n) => n.id === firstUnread.id)!;
      expect(after.unread).toBe(false);
      expect(getUnreadCount(updated)).toBe(getUnreadCount(initial) - 1);
    });

    it('marks all notifications as read and clears unread count to 0', () => {
      resetDefaultNotifications();
      const updated = markAllAsRead();
      expect(getUnreadCount(updated)).toBe(0);
      expect(updated.every((n) => !n.unread)).toBe(true);
    });

    it('clears all notifications when requested', () => {
      resetDefaultNotifications();
      const cleared = clearAllNotifications();
      expect(cleared.length).toBe(0);
      expect(getStoredNotifications().length).toBe(0);
    });

    it('supports functional routing link on each notification', () => {
      const notifs = resetDefaultNotifications();
      const inventoryNotif = notifs.find((n) => n.category === 'inventory')!;
      expect(inventoryNotif.route).toBe('/inventory/transactions');
      expect(inventoryNotif.actionLabel).toBeDefined();
    });
  });

  describe('Item #8: Device Feature Usage Tracker (Hot, Mới, Gần đây, Reset)', () => {
    it('shows "Mới" badge for newly introduced features before they are visited', () => {
      resetFeatureTracker();
      const badge = getFeatureBadge('/settings/ai');
      expect(badge).not.toBeNull();
      expect(badge?.label).toBe('Mới');
      expect(badge?.type).toBe('new');
    });

    it('shows "Hot" badge for core frequent features', () => {
      resetFeatureTracker();
      const badge = getFeatureBadge('/pos');
      expect(badge).not.toBeNull();
      expect(badge?.label).toBe('Hot');
      expect(badge?.type).toBe('hot');
    });

    it('converts a "Mới" feature to "Gần đây" upon visiting, and removes "Mới" permanently on this device', () => {
      resetFeatureTracker();
      
      // Step 1: User visits new feature /settings/ai
      recordFeatureVisit('/settings/ai');
      
      // Immediately, it is the most recent feature
      const badgeAfterVisit = getFeatureBadge('/settings/ai');
      expect(badgeAfterVisit?.label).toBe('Gần đây');
      expect(badgeAfterVisit?.type).toBe('recent');

      // Step 2: User moves to another feature /orders
      recordFeatureVisit('/orders');

      // Now /orders is "Gần đây"
      const ordersBadge = getFeatureBadge('/orders');
      expect(ordersBadge?.label).toBe('Gần đây');

      // And /settings/ai is no longer "Gần đây" AND no longer "Mới" (since it was visited on this machine)
      const aiBadgeAfterMoving = getFeatureBadge('/settings/ai');
      expect(aiBadgeAfterMoving).toBeNull();
    });

    it('resets all features back to original default state when user clicks reset', () => {
      // User visited several features
      recordFeatureVisit('/settings/ai');
      recordFeatureVisit('/receipt-settings');
      recordFeatureVisit('/pos');

      // Trigger machine reset
      resetFeatureTracker();

      const state = getDeviceFeatureState();
      expect(state.visitedHrefs.length).toBe(0);
      expect(state.lastVisitedHref).toBeNull();

      // Features return to original Hot / Mới badges
      expect(getFeatureBadge('/settings/ai')?.label).toBe('Mới');
      expect(getFeatureBadge('/receipt-settings')?.label).toBe('Mới');
      expect(getFeatureBadge('/pos')?.label).toBe('Hot');
    });
  });
});
