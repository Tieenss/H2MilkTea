import { describe, it, expect } from 'vitest';
import {
  navigation,
  NAVIGATION_SECTIONS,
  findActiveNavigationContext
} from '@/lib/navigation';

describe('Sidebar Navigation UI/UX Hierarchy & Smart Hover Metadata', () => {
  it('defines 3 clear visual sections (core, management, system)', () => {
    expect(NAVIGATION_SECTIONS.map((s) => s.id)).toEqual([
      'core',
      'management',
      'system'
    ]);
  });

  it('provides rich description, tierLabel, and roleHint for every sidebar item and child', () => {
    for (const item of navigation) {
      if (!item.sidebar) continue;
      expect(item.description && item.description.length).toBeGreaterThan(15);
      expect(item.tierLabel).toBeTruthy();
      expect(item.section).toBeTruthy();

      if (item.isGroup && item.children) {
        for (const child of item.children) {
          if (!child.sidebar) continue;
          expect(child.description && child.description.length).toBeGreaterThan(15);
          expect(child.tierLabel).toBeTruthy();
          expect(child.roleHint).toBeTruthy();
        }
      }
    }
  });

  it('accurately resolves active item, parent group, and section for any route via findActiveNavigationContext', () => {
    const posCtx = findActiveNavigationContext('/pos');
    expect(posCtx.activeItem?.name).toBe('POS Bán hàng');
    expect(posCtx.parentGroup?.name).toBe('POS & Bán hàng');
    expect(posCtx.sectionMeta?.id).toBe('core');

    const forecastCtx = findActiveNavigationContext('/inventory/forecast');
    expect(forecastCtx.activeItem?.name).toBe('Dự báo nhu cầu');
    expect(forecastCtx.parentGroup?.name).toBe('Quản lý kho');
    expect(forecastCtx.sectionMeta?.id).toBe('management');

    const ragCtx = findActiveNavigationContext('/settings/ai');
    expect(ragCtx.activeItem?.name).toBe('Cài đặt chatbot AI');
    expect(ragCtx.parentGroup?.name).toBe('Cài đặt');
    expect(ragCtx.sectionMeta?.id).toBe('system');

    const homeCtx = findActiveNavigationContext('/dashboard');
    expect(homeCtx.activeItem?.name).toBe('Trang chủ');
    expect(homeCtx.parentGroup).toBeNull();
    expect(homeCtx.sectionMeta?.id).toBe('core');
  });
});
