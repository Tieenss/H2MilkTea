import { CheckCircle, Settings, Users, Coffee } from 'lucide-react';
import type { TableFormData } from '../types/table';

export const TABLE_STATUS = [
  { value: 'Đang hoạt động', label: 'Đang hoạt động', icon: CheckCircle, color: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300' },
  { value: 'Trống', label: 'Trống (Sẵn sàng)', icon: Coffee, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
  { value: 'Có khách', label: 'Đang có khách', icon: Users, color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' },
  { value: 'Bảo trì', label: 'Bảo trì', icon: Settings, color: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300' }
];

export const DEFAULT_AREAS = [
  'Tất cả',
  'Tầng 1',
  'Tầng 2',
  'Sân vườn',
  'Phòng VIP',
  'Mang về',
  'Khu vực chung'
];

/**
 * Nhận diện Khu vực của Bàn (Hybrid Area Detection):
 * Ưu tiên trường explicitArea, nếu không có sẽ tự động phân loại thông minh qua tiền tố tên bàn
 */
export function detectTableArea(tableName?: string, explicitArea?: string): string {
  if (explicitArea && explicitArea.trim() && explicitArea.trim() !== 'Tất cả') {
    return explicitArea.trim();
  }
  const name = (tableName || '').trim().toLowerCase();
  if (!name) return 'Khu vực chung';

  if (name.includes('tầng 1') || name.startsWith('t1') || name.includes('t1-') || name.includes('t1_')) {
    return 'Tầng 1';
  }
  if (name.includes('tầng 2') || name.startsWith('t2') || name.includes('t2-') || name.includes('t2_')) {
    return 'Tầng 2';
  }
  if (name.includes('tầng 3') || name.startsWith('t3') || name.includes('t3-')) {
    return 'Tầng 3';
  }
  if (name.includes('vip') || name.startsWith('vip')) {
    return 'Phòng VIP';
  }
  if (name.includes('sân vườn') || name.includes('ngoài trời') || name.includes('garden')) {
    return 'Sân vườn';
  }
  if (name.includes('mang về') || name.includes('takeaway') || name.includes('mua về')) {
    return 'Mang về';
  }

  return 'Khu vực chung';
}

export const INITIAL_TABLE_FORM_DATA: TableFormData = {
  IDBAN: '',
  'Tên bàn': '',
  'Sức chứa tối đa': 4,
  'Trạng thái': 'Đang hoạt động'
};
