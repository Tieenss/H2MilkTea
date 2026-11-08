import { CheckCircle, Settings, Users, Coffee } from 'lucide-react';
import type { TableFormData } from '../types/table';

export const TABLE_STATUS = [
  { value: 'Đang hoạt động', label: 'Đang hoạt động', icon: CheckCircle, color: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300' },
  { value: 'Trống', label: 'Trống (Sẵn sàng)', icon: Coffee, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
  { value: 'Đang sử dụng', label: 'Đang sử dụng', icon: Users, color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
  { value: 'Có khách', label: 'Đang có khách', icon: Users, color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' },
  { value: 'Bảo trì', label: 'Bảo trì', icon: Settings, color: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300' }
];

export const DEFAULT_AREAS = [
  'Tất cả',
  'Phòng hát',
  'Quầy',
  'Vườn',
  'Mang về'
];

export const TABLE_AREA_OPTIONS = [
  'Phòng hát',
  'Quầy',
  'Vườn',
  'Mang về'
];

/**
 * Thứ tự ưu tiên hiển thị các Khối Khu vực khi chọn "Tất cả"
 */
export const AREA_DISPLAY_ORDER = [
  'Quầy',
  'Phòng hát',
  'Vườn',
  'Mang về'
] as const;

export interface AreaMetaInfo {
  area: string;
  label: string;
  emoji: string;
  badgeClass: string;
  headerBorderClass: string;
}

export const AREA_META: Record<string, AreaMetaInfo> = {
  'Quầy': {
    area: 'Quầy',
    label: 'Khu vực Quầy',
    emoji: '☕',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    headerBorderClass: 'border-indigo-200/80 dark:border-indigo-900/60'
  },
  'Phòng hát': {
    area: 'Phòng hát',
    label: 'Khu vực Phòng hát',
    emoji: '🎤',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    headerBorderClass: 'border-purple-200/80 dark:border-purple-900/60'
  },
  'Vườn': {
    area: 'Vườn',
    label: 'Khu vực Vườn',
    emoji: '🌿',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    headerBorderClass: 'border-emerald-200/80 dark:border-emerald-900/60'
  },
  'Mang về': {
    area: 'Mang về',
    label: 'Khu vực Mang về',
    emoji: '🛍️',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    headerBorderClass: 'border-amber-200/80 dark:border-amber-900/60'
  }
};

export function getAreaMeta(areaName: string): AreaMetaInfo {
  return AREA_META[areaName] || {
    area: areaName,
    label: `Khu vực ${areaName}`,
    emoji: '📍',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    headerBorderClass: 'border-slate-200 dark:border-slate-800'
  };
}

export type TableSortMode = 'name-asc' | 'name-desc' | 'occupied-first';

export const TABLE_SORT_OPTIONS: Array<{ value: TableSortMode; label: string; shortLabel: string }> = [
  { value: 'name-asc', label: 'Tên bàn (A → Z)', shortLabel: 'A → Z' },
  { value: 'name-desc', label: 'Tên bàn (Z → A)', shortLabel: 'Z → A' },
  { value: 'occupied-first', label: 'Ưu tiên bàn có khách', shortLabel: 'Có khách trước' }
];

const viNaturalCollator = new Intl.Collator('vi', {
  numeric: true,
  sensitivity: 'base'
});

export interface SortableTableLike {
  IDBAN?: string;
  'Tên bàn'?: string;
  'Khu vực'?: string;
  'Trạng thái'?: string;
  'Trạng thái sử dụng'?: string;
}

/**
 * Nhận diện Khu vực của Bàn (Hybrid Area Detection):
 * Tự động phân loại chính xác vào 4 khu vực của quán: Phòng hát, Quầy, Vườn, Mang về
 */
export function detectTableArea(tableName?: string, explicitArea?: string): string {
  if (explicitArea && explicitArea.trim() && explicitArea.trim() !== 'Tất cả') {
    return explicitArea.trim();
  }
  const name = (tableName || '').trim().toLowerCase();
  if (!name) return 'Quầy';

  if (name.includes('phòng hát') || name.includes('hát') || name.includes('karaoke') || name.includes('vip') || name.startsWith('ph')) {
    return 'Phòng hát';
  }
  if (name.includes('vườn') || name.includes('ngoài trời') || name.includes('garden') || name.startsWith('v')) {
    return 'Vườn';
  }
  if (name.includes('mang về') || name.includes('mua về') || name.includes('takeaway')) {
    return 'Mang về';
  }
  if (name.includes('quầy') || name.includes('bar') || name.startsWith('q')) {
    return 'Quầy';
  }

  return 'Quầy';
}

/**
 * So sánh tự nhiên 2 bàn theo Tên bàn (numeric-aware: Bàn 1 < Bàn 02 < Bàn 09 < Bàn 10 < Bàn 15).
 * Nếu trùng Tên bàn thì đối chiếu tiếp theo IDBAN.
 */
export function compareTableNatural(a: SortableTableLike, b: SortableTableLike): number {
  const nameA = (a['Tên bàn'] || a.IDBAN || '').trim();
  const nameB = (b['Tên bàn'] || b.IDBAN || '').trim();

  // Giữ bàn đặc biệt "Khách mua về" ở cuối nếu so sánh chung trong 1 danh sách phẳng
  const isTakeawayA = nameA.toLowerCase() === 'khách mua về';
  const isTakeawayB = nameB.toLowerCase() === 'khách mua về';
  if (isTakeawayA && !isTakeawayB) return 1;
  if (!isTakeawayA && isTakeawayB) return -1;

  const cmp = viNaturalCollator.compare(nameA, nameB);
  if (cmp !== 0) return cmp;

  const idA = (a.IDBAN || '').trim();
  const idB = (b.IDBAN || '').trim();
  return viNaturalCollator.compare(idA, idB);
}

function defaultIsOccupied(table: SortableTableLike): boolean {
  const status = (table['Trạng thái sử dụng'] || table['Trạng thái'] || '').trim();
  return status === 'Đang sử dụng' || status === 'Có khách';
}

/**
 * Sắp xếp mảng bàn mà không làm thay đổi mảng gốc (immutable).
 */
export function sortTables<T extends SortableTableLike>(
  tables: T[],
  sortMode: TableSortMode = 'name-asc',
  isOccupiedFn: (table: T) => boolean = defaultIsOccupied
): T[] {
  if (!Array.isArray(tables) || tables.length <= 1) {
    return Array.isArray(tables) ? [...tables] : [];
  }

  const cloned = [...tables];
  cloned.sort((a, b) => {
    if (sortMode === 'occupied-first') {
      const occA = isOccupiedFn(a);
      const occB = isOccupiedFn(b);
      if (occA !== occB) {
        return occA ? -1 : 1;
      }
      return compareTableNatural(a, b);
    }

    if (sortMode === 'name-desc') {
      const nameA = (a['Tên bàn'] || a.IDBAN || '').trim().toLowerCase();
      const nameB = (b['Tên bàn'] || b.IDBAN || '').trim().toLowerCase();
      if (nameA === 'khách mua về' && nameB !== 'khách mua về') return 1;
      if (nameA !== 'khách mua về' && nameB === 'khách mua về') return -1;
      return -compareTableNatural(a, b);
    }

    return compareTableNatural(a, b);
  });

  return cloned;
}

export interface TableAreaGroup<T extends SortableTableLike> {
  area: string;
  meta: AreaMetaInfo;
  tables: T[];
  occupiedCount: number;
}

/**
 * Chia danh sách bàn thành từng Khối Khu vực theo thứ tự chuẩn (Quầy -> Phòng hát -> Vườn -> Mang về),
 * bên trong mỗi khu vực được sắp xếp tự nhiên theo `sortMode`.
 */
export function groupTablesByArea<T extends SortableTableLike>(
  tables: T[],
  sortMode: TableSortMode = 'name-asc',
  isOccupiedFn: (table: T) => boolean = defaultIsOccupied,
  includeEmptyAreas = false
): TableAreaGroup<T>[] {
  const buckets = new Map<string, T[]>();

  for (const area of AREA_DISPLAY_ORDER) {
    buckets.set(area, []);
  }

  for (const table of tables || []) {
    const area = detectTableArea(table['Tên bàn'], table['Khu vực']);
    if (!buckets.has(area)) {
      buckets.set(area, []);
    }
    buckets.get(area)!.push(table);
  }

  const result: TableAreaGroup<T>[] = [];
  for (const [area, areaTables] of buckets.entries()) {
    if (!includeEmptyAreas && areaTables.length === 0) {
      continue;
    }
    const sorted = sortTables(areaTables, sortMode, isOccupiedFn);
    const occupiedCount = sorted.filter((t) => isOccupiedFn(t)).length;
    result.push({
      area,
      meta: getAreaMeta(area),
      tables: sorted,
      occupiedCount
    });
  }

  return result;
}

export const INITIAL_TABLE_FORM_DATA: TableFormData = {
  IDBAN: '',
  'Tên bàn': '',
  'Sức chứa tối đa': 4,
  'Trạng thái': 'Đang hoạt động',
  'Khu vực': 'Quầy'
};
