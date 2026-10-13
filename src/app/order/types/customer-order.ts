// Types cho Customer QR Order

export interface Product {
  IDSP: string;
  'Tên sản phẩm': string;
  'Hình ảnh': string;
  'Loại sản phẩm': string;
  'Đơn vị tính': string;
  'Giá vốn': string;
  'Đơn giá': string;
  'Mô tả': string;
  'Trạng thái': string;
}

export interface CartItem {
  id: string;          // unique id for cart item
  product: Product;
  quantity: number;
  size: 'S' | 'M' | 'L';
  sugar: string;       // '0%' | '30%' | '50%' | '70%' | '100%'
  ice: string;         // 'Không đá' | 'Ít đá' | 'Vừa đá' | 'Nhiều đá'
  note: string;
  unitPrice: number;   // Giá sau khi tính size
}

export interface TableInfo {
  IDBAN: string;
  'Tên bàn': string;
  'Sức chứa tối đa': string;
  'Trạng thái': string;
}

export interface CustomerOrder {
  orderId: string;
  tableId: string;
  tableName: string;
  items: CartItem[];
  totalAmount: number;
  note: string;
  status: OrderStatus;
  createdAt: string;
}

export type OrderStatus = 
  | 'pending'        // Chờ xác nhận
  | 'confirmed'      // Đã nhận đơn
  | 'preparing'      // Đang pha chế
  | 'completed'      // Hoàn thành
  | 'served'         // Đã phục vụ
  | 'rejected';      // Từ chối

export const ORDER_STATUS_MAP: Record<OrderStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'Chờ xác nhận', color: 'text-yellow-600', icon: '⏳' },
  confirmed: { label: 'Đã nhận đơn', color: 'text-blue-600', icon: '✅' },
  preparing: { label: 'Đang pha chế', color: 'text-orange-600', icon: '👨‍🍳' },
  completed: { label: 'Hoàn thành', color: 'text-green-600', icon: '🎉' },
  served: { label: 'Đã phục vụ', color: 'text-emerald-600', icon: '🥤' },
  rejected: { label: 'Đã từ chối', color: 'text-red-600', icon: '❌' },
};

export const SIZE_OPTIONS = [
  { value: 'S' as const, label: 'S', priceAdjust: 0 },
  { value: 'M' as const, label: 'M', priceAdjust: 5000 },
  { value: 'L' as const, label: 'L', priceAdjust: 10000 },
];

export const SUGAR_OPTIONS = [
  { value: '0%', label: 'Không đường' },
  { value: '30%', label: '30% đường' },
  { value: '50%', label: '50% đường' },
  { value: '70%', label: '70% đường' },
  { value: '100%', label: '100% đường' },
];

export const ICE_OPTIONS = [
  { value: 'Không đá', label: 'Không đá' },
  { value: 'Ít đá', label: 'Ít đá' },
  { value: 'Vừa đá', label: 'Vừa đá' },
  { value: 'Nhiều đá', label: 'Nhiều đá' },
];
