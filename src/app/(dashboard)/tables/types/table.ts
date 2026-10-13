export interface Table {
  IDBAN: string;
  'Tên bàn': string;
  'Sức chứa tối đa': number;
  'Trạng thái': string;
  [key: string]: any;
}

export interface TableFormData {
  IDBAN: string;
  'Tên bàn': string;
  'Sức chứa tối đa': number;
  'Trạng thái': string;
}