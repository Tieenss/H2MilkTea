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

export const INITIAL_TABLE_FORM_DATA: TableFormData = {
  IDBAN: '',
  'Tên bàn': '',
  'Sức chứa tối đa': 4,
  'Trạng thái': 'Đang hoạt động'
};
