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

export interface ToppingOption {
  name: string;
  price: number;
}

export const AVAILABLE_TOPPINGS: readonly ToppingOption[] = [
  { name: 'Trân châu đen', price: 5000 },
  { name: 'Trân châu trắng', price: 5000 },
  { name: 'Kem cheese', price: 10000 },
  { name: 'Thạch củ năng', price: 5000 },
  { name: 'Pudding trứng', price: 5000 },
];

export function normalizeToppings(
  toppings?: Array<string | { name: string; price?: number }>
): ToppingOption[] {
  if (!Array.isArray(toppings) || toppings.length === 0) return [];
  const seen = new Set<string>();
  const result: ToppingOption[] = [];

  for (const raw of toppings) {
    const rawName = typeof raw === 'string' ? raw : raw?.name;
    const cleanName = String(rawName || '').trim();
    if (!cleanName) continue;
    const matched = AVAILABLE_TOPPINGS.find(
      (t) => t.name.toLowerCase() === cleanName.toLowerCase()
    );
    const canonicalName = matched ? matched.name : cleanName;
    if (seen.has(canonicalName.toLowerCase())) continue;
    seen.add(canonicalName.toLowerCase());

    const explicitPrice = typeof raw === 'object' && raw !== null ? Number(raw.price) : NaN;
    const price =
      Number.isFinite(explicitPrice) && explicitPrice > 0
        ? explicitPrice
        : matched?.price || 5000;

    result.push({ name: canonicalName, price });
  }

  return result;
}

export function extractToppingsFromNote(note?: string): ToppingOption[] {
  const cleanNote = String(note || '').trim();
  if (!cleanNote) return [];
  const lower = cleanNote.toLowerCase();
  const matched: ToppingOption[] = [];
  for (const top of AVAILABLE_TOPPINGS) {
    if (lower.includes(top.name.toLowerCase())) {
      matched.push({ name: top.name, price: top.price });
    }
  }
  return matched;
}

export function calculateToppingsPrice(
  toppings?: Array<string | { name: string; price?: number }>
): number {
  return normalizeToppings(toppings).reduce((sum, t) => sum + t.price, 0);
}

export interface CartItem {
  id: string;          // unique id for cart item
  product: Product;
  quantity: number;
  size: 'S' | 'M' | 'L';
  sugar: string;       // '0%' | '30%' | '50%' | '70%' | '100%'
  ice: string;         // 'Không đá' | 'Ít đá' | 'Vừa đá' | 'Nhiều đá'
  note: string;
  toppings?: ToppingOption[];
  toppingsAdjust?: number;
  unitPrice: number;   // Giá sau khi tính size + topping
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

// Quy định chuẩn của quán: Size gốc là M (+0đ), tăng lên Size L (+5.000đ)
export const SIZE_OPTIONS = [
  { value: 'M' as const, label: 'M', priceAdjust: 0 },
  { value: 'L' as const, label: 'L', priceAdjust: 5000 },
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
