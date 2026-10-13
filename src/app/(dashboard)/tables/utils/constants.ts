import { CheckCircle, Settings } from 'lucide-react';
import type { TableFormData } from '../types/table';

export const TABLE_STATUS = [
  { value: 'Đang hoạt động', label: 'Đang hoạt động', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  { value: 'Bảo trì', label: 'Bảo trì', icon: Settings, color: 'bg-red-100 text-red-800' }
];

export const INITIAL_TABLE_FORM_DATA: TableFormData = {
  IDBAN: '',
  'Tên bàn': '',
  'Sức chứa tối đa': 4,
  'Trạng thái': 'Đang hoạt động'
};