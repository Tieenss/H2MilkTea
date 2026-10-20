'use client';

export type FeatureBadgeType = 'hot' | 'new' | 'recent' | null;

export interface FeatureBadgeInfo {
  label: string;
  type: FeatureBadgeType;
  className: string;
}

export interface DeviceFeatureState {
  visitedHrefs: string[];
  lastVisitedHref: string | null;
  lastUpdated: string;
}

const STORAGE_KEY = 'h2_device_features_v1';

// Danh sách các chức năng mặc định là "Hot"
export const BASE_HOT_HREFS = ['/pos', '/orders', '/kitchen'];

// Danh sách các chức năng mặc định là "Mới"
export const BASE_NEW_HREFS = [
  '/settings/ai',
  '/receipt-settings',
  '/notifications',
  '/inventory/forecast',
];

export function getDeviceFeatureState(): DeviceFeatureState {
  if (typeof window === 'undefined') {
    return { visitedHrefs: [], lastVisitedHref: null, lastUpdated: new Date().toISOString() };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { visitedHrefs: [], lastVisitedHref: null, lastUpdated: new Date().toISOString() };
    }
    const parsed = JSON.parse(raw);
    return {
      visitedHrefs: Array.isArray(parsed.visitedHrefs) ? parsed.visitedHrefs : [],
      lastVisitedHref: typeof parsed.lastVisitedHref === 'string' ? parsed.lastVisitedHref : null,
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch {
    return { visitedHrefs: [], lastVisitedHref: null, lastUpdated: new Date().toISOString() };
  }
}

export function saveDeviceFeatureState(state: DeviceFeatureState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('h2_feature_state_updated', { detail: state }));
  } catch (err) {
    console.error('Failed to save device feature state', err);
  }
}

/**
 * Ghi nhận người dùng truy cập một chức năng trên máy này:
 * - Nếu chức năng đó là "Mới" -> sẽ hết "Mới" (vì đã được thêm vào visitedHrefs).
 * - Chức năng đó chuyển thành "Gần đây".
 * - Chức năng "Gần đây" cũ sẽ mất.
 */
export function recordFeatureVisit(href: string): DeviceFeatureState {
  if (!href || href === '/' || href === '/dashboard') {
    return getDeviceFeatureState();
  }

  const current = getDeviceFeatureState();
  const visitedSet = new Set(current.visitedHrefs);
  visitedSet.add(href);

  const updated: DeviceFeatureState = {
    visitedHrefs: Array.from(visitedSet),
    lastVisitedHref: href,
    lastUpdated: new Date().toISOString(),
  };

  saveDeviceFeatureState(updated);
  return updated;
}

/**
 * Reset toàn bộ trạng thái tính năng trên máy về ban đầu (Mục #8)
 */
export function resetFeatureTracker(): DeviceFeatureState {
  const resetState: DeviceFeatureState = {
    visitedHrefs: [],
    lastVisitedHref: null,
    lastUpdated: new Date().toISOString(),
  };
  saveDeviceFeatureState(resetState);
  return resetState;
}

/**
 * Tính toán badge hiển thị cho từng mục navigation dựa theo trạng thái máy
 */
export function getFeatureBadge(
  href: string | undefined,
  currentState?: DeviceFeatureState
): FeatureBadgeInfo | null {
  if (!href) return null;

  const state = currentState || getDeviceFeatureState();

  // 1. Nếu là chức năng vừa vào gần đây nhất trên máy này -> Hiện "Gần đây"
  if (state.lastVisitedHref === href) {
    return {
      label: 'Gần đây',
      type: 'recent',
      className: 'bg-amber-500 text-white',
    };
  }

  // 2. Nếu là chức năng "Mới" và máy này CHƯA từng vào -> Hiện "Mới"
  if (BASE_NEW_HREFS.includes(href) && !state.visitedHrefs.includes(href)) {
    return {
      label: 'Mới',
      type: 'new',
      className: 'bg-emerald-500 text-white',
    };
  }

  // 3. Nếu là chức năng "Hot" -> Hiện "Hot"
  if (BASE_HOT_HREFS.includes(href)) {
    return {
      label: 'Hot',
      type: 'hot',
      className: 'bg-red-500 text-white',
    };
  }

  return null;
}
