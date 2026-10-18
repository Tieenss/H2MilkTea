import type { CartItem } from '@/app/(dashboard)/pos/types/pos';

export interface ConflictingItem {
  key: string;
  id: string;
  name: string;
  price: number;
  unit: string;
  note?: string;
  localQuantity: number;
  remoteQuantity: number;
}

export interface CartDiffResult {
  hasConflict: boolean;
  canAutoMerge: boolean;
  mergedCart: CartItem[];
  conflictingItems: ConflictingItem[];
}

export function getLineItemKey(item: CartItem): string {
  const noteNormalized = (item.note || '').trim().toLowerCase();
  return `${item.id}::${noteNormalized}`;
}

/**
 * So sánh và phân loại xung đột giữa giỏ hàng cục bộ và giỏ hàng từ xa
 */
export function diffCartItems(localCart: CartItem[], remoteCart: CartItem[]): CartDiffResult {
  const localMap = new Map<string, CartItem>();
  const remoteMap = new Map<string, CartItem>();

  for (const item of localCart) {
    localMap.set(getLineItemKey(item), item);
  }
  for (const item of remoteCart) {
    remoteMap.set(getLineItemKey(item), item);
  }

  const conflictingItems: ConflictingItem[] = [];
  const mergedMap = new Map<string, CartItem>();

  // 1. Duyệt các món của Local
  for (const [key, localItem] of localMap.entries()) {
    const remoteItem = remoteMap.get(key);
    if (!remoteItem) {
      // Chỉ có ở local -> an toàn đưa vào bản merge
      mergedMap.set(key, { ...localItem });
    } else if (localItem.quantity === remoteItem.quantity) {
      // Giống nhau cả key và số lượng -> không xung đột
      mergedMap.set(key, { ...localItem });
    } else {
      // Cùng key nhưng khác số lượng -> XUNG ĐỘT
      conflictingItems.push({
        key,
        id: localItem.id,
        name: localItem.name,
        price: localItem.price,
        unit: localItem.unit,
        note: localItem.note,
        localQuantity: localItem.quantity,
        remoteQuantity: remoteItem.quantity,
      });
      // Tạm thời chọn số lượng lớn hơn nếu cần fallback
      mergedMap.set(key, {
        ...localItem,
        quantity: Math.max(localItem.quantity, remoteItem.quantity),
      });
    }
  }

  // 2. Duyệt các món chỉ có ở Remote
  for (const [key, remoteItem] of remoteMap.entries()) {
    if (!localMap.has(key)) {
      mergedMap.set(key, { ...remoteItem });
    }
  }

  const hasConflict = conflictingItems.length > 0;
  return {
    hasConflict,
    canAutoMerge: !hasConflict,
    mergedCart: Array.from(mergedMap.values()),
    conflictingItems,
  };
}

/**
 * Giải quyết xung đột theo chiến lược được thu ngân chọn
 */
export function resolveCartConflict(
  localCart: CartItem[],
  remoteCart: CartItem[],
  resolution: 'keep_local' | 'take_remote' | 'merge_quantities'
): CartItem[] {
  if (resolution === 'keep_local') return [...localCart];
  if (resolution === 'take_remote') return [...remoteCart];

  // Merge quantities: cộng dồn số lượng các món trùng key
  const resultMap = new Map<string, CartItem>();

  for (const item of localCart) {
    const key = getLineItemKey(item);
    resultMap.set(key, { ...item });
  }

  for (const item of remoteCart) {
    const key = getLineItemKey(item);
    const existing = resultMap.get(key);
    if (existing) {
      resultMap.set(key, {
        ...existing,
        quantity: existing.quantity + item.quantity,
      });
    } else {
      resultMap.set(key, { ...item });
    }
  }

  return Array.from(resultMap.values());
}
