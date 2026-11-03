'use client';

import { useState, useCallback, useEffect } from 'react';
import type { CartItem, Product } from '../types/pos';
import { getLineItemKey } from '@/lib/cart/mergeCart';

function normalizeSugarOption(sugar?: string): string {
  const s = (sugar || '').trim().toLowerCase();
  if (!s || s === '100%' || s === '100% đường' || s === '100% duong' || s === 'bình thường') {
    return '';
  }
  return s;
}

function normalizeIceOption(ice?: string): string {
  const i = (ice || '').trim().toLowerCase();
  if (!i || i === '100%' || i === '100% đá' || i === '100% da' || i === 'bình thường') {
    return '';
  }
  return i;
}

export function getNormalizedPosItemKey(item: Partial<CartItem> & { id: string }, forceIsFood?: boolean): string {
  const category = item.category || '';
  const isFood = forceIsFood !== undefined ? forceIsFood : ['Ăn vặt', 'Bánh ngọt'].includes(category);
  const rawSize = (item.size || '').trim().toUpperCase();
  const normalizedSize = isFood ? '' : (rawSize === 'L' ? 'L' : 'M');
  const normalizedSugar = isFood ? '' : normalizeSugarOption(item.sugar);
  const normalizedIce = isFood ? '' : normalizeIceOption(item.ice);

  return getLineItemKey({
    id: String(item.id || '').trim(),
    note: (item.note || '').trim(),
    size: normalizedSize,
    sugar: normalizedSugar,
    ice: normalizedIce,
    toppings: item.toppings,
  });
}

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeOrders, setActiveOrders] = useState<Map<string, CartItem[]>>(new Map());
  const [selectedTableId, setSelectedTableId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('h2_pos_active_table_id') || null;
      } catch {
        return null;
      }
    }
    return null;
  });

  // Persist selectedTableId to localStorage for seamless cross-page navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (selectedTableId) {
          localStorage.setItem('h2_pos_active_table_id', selectedTableId);
        }
      } catch (e) {
        console.warn('Could not persist table id to localStorage', e);
      }
    }
  }, [selectedTableId]);

  // Add product to cart with options support (Size gốc M = +0đ, Size L = +5000đ + Topping price)
  const addToCart = useCallback((
    product: Product,
    options?: {
      size?: string;
      sugar?: string;
      ice?: string;
      toppings?: string[];
      note?: string;
      quantity?: number;
      toppingPrice?: number;
      priceAdjust?: number;
    }
  ) => {
    setCart(prevCart => {
      const category = product['Loại sản phẩm'] || '';
      const isFood = ['Ăn vặt', 'Bánh ngọt'].includes(category);
      const normalizedSize = isFood
        ? undefined
        : (options?.size ? (options.size.toUpperCase() === 'L' ? 'L' : 'M') : 'M');
      const sizeAdjust = !isFood && normalizedSize === 'L' ? 5000 : 0;
      const extraToppingPrice = !isFood ? (Number(options?.toppingPrice) || 0) : 0;
      const basePrice = Number(product['Đơn giá']) || 0;
      const addQty = Math.max(1, Number(options?.quantity) || 1);

      const newItem: CartItem = {
        id: product.IDSP,
        name: product['Tên sản phẩm'],
        note: (options?.note || '').trim(),
        image: product['Hình ảnh'] || '',
        price: basePrice + sizeAdjust + extraToppingPrice,
        quantity: addQty,
        unit: product['Đơn vị tính'] || 'Cái',
        category,
        size: normalizedSize,
        sugar: options?.sugar,
        ice: options?.ice,
        toppings: options?.toppings,
        printStatus: 'new',
        kitchenStatus: 'new',
        isSentToKitchen: false,
      };

      const newKey = getNormalizedPosItemKey(newItem, isFood);
      const existingIndex = prevCart.findIndex(
        item => getNormalizedPosItemKey(item, !item.category ? isFood : undefined) === newKey
      );
      let newCart: CartItem[];

      if (existingIndex >= 0) {
        newCart = prevCart.map((item, idx) =>
          idx === existingIndex 
            ? {
                ...item,
                quantity: (Number(item.quantity) || 0) + addQty,
                printStatus: item.printStatus === 'printed' ? 'modified' : (item.printStatus || 'new'),
              } 
            : item
        );
      } else {
        newCart = [...prevCart, newItem];
      }

      // Update active orders if table is selected
      if (selectedTableId) {
        setActiveOrders(prev => {
          const newOrders = new Map(prev);
          newOrders.set(selectedTableId, [...newCart]);
          return newOrders;
        });
      }

      return newCart;
    });
  }, [selectedTableId]);

  // Remove item from cart
  const removeFromCart = useCallback((productId: string) => {
    setCart(prevCart => {
      const hasExactKeyMatch = prevCart.some(item => getLineItemKey(item) === productId);
      const newCart = hasExactKeyMatch
        ? prevCart.filter(item => getLineItemKey(item) !== productId)
        : prevCart.filter(item => item.id !== productId);

      // Update active orders if table is selected
      if (selectedTableId) {
        setActiveOrders(prev => {
          const newOrders = new Map(prev);
          if (newCart.length === 0) {
            newOrders.delete(selectedTableId);
          } else {
            newOrders.set(selectedTableId, [...newCart]);
          }
          return newOrders;
        });
      }

      return newCart;
    });
  }, [selectedTableId]);

  // Adjust item quantity
  const adjustQuantity = useCallback((productId: string, amount: number) => {
    setCart(prevCart => {
      const hasExactKeyMatch = prevCart.some(item => getLineItemKey(item) === productId);
      // Nếu có nhiều dòng cùng productId nhưng truyền theo item.id, ưu tiên dòng đầu tiên khớp hoặc khớp theo key
      let adjusted = false;
      const updatedCart = prevCart.map(item => {
        const isMatch = hasExactKeyMatch ? getLineItemKey(item) === productId : item.id === productId;
        if (isMatch && !adjusted) {
          adjusted = true;
          const currentQty = Number(item.quantity) || 0;
          const newQuantity = currentQty + Number(amount);
          if (newQuantity <= 0) return null;
          return {
            ...item,
            quantity: newQuantity,
            printStatus: item.printStatus === 'printed' ? 'modified' : (item.printStatus || 'new'),
          };
        }
        return item;
      }).filter(Boolean) as CartItem[];

      // Update active orders if table is selected
      if (selectedTableId) {
        setActiveOrders(prev => {
          const newOrders = new Map(prev);
          if (updatedCart.length === 0) {
            newOrders.delete(selectedTableId);
          } else {
            newOrders.set(selectedTableId, [...updatedCart]);
          }
          return newOrders;
        });
      }

      return updatedCart;
    });
  }, [selectedTableId]);

  // Update cart item quantity directly
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart => {
      const hasExactKeyMatch = prevCart.some(item => getLineItemKey(item) === productId);
      let updated = false;
      const newCart = prevCart.map(item => {
        const isMatch = hasExactKeyMatch ? getLineItemKey(item) === productId : item.id === productId;
        if (isMatch && !updated) {
          updated = true;
          return {
            ...item,
            quantity: Number(quantity),
            printStatus: item.printStatus === 'printed' ? 'modified' : (item.printStatus || 'new'),
          };
        }
        return item;
      });

      // Update active orders if table is selected
      if (selectedTableId) {
        setActiveOrders(prev => {
          const newOrders = new Map(prev);
          newOrders.set(selectedTableId, [...newCart]);
          return newOrders;
        });
      }

      return newCart;
    });
  }, [selectedTableId, removeFromCart]);

  // Update cart item note
  const updateCartItemNote = useCallback((productId: string, note: string) => {
    setCart(prevCart => {
      const hasExactKeyMatch = prevCart.some(item => getLineItemKey(item) === productId);
      let updated = false;
      const newCart = prevCart.map(item => {
        const isMatch = hasExactKeyMatch ? getLineItemKey(item) === productId : item.id === productId;
        if (isMatch && !updated) {
          updated = true;
          return {
            ...item,
            note,
            printStatus: item.printStatus === 'printed' ? 'modified' : (item.printStatus || 'new'),
          };
        }
        return item;
      });

      // Update active orders if table is selected
      if (selectedTableId) {
        setActiveOrders(prev => {
          const newOrders = new Map(prev);
          newOrders.set(selectedTableId, [...newCart]);
          return newOrders;
        });
      }

      return newCart;
    });
  }, [selectedTableId]);

  // Clear cart
  const clearCart = useCallback(() => {
    setCart([]);

    // Update active orders if table is selected
    if (selectedTableId) {
      setActiveOrders(prev => {
        const newOrders = new Map(prev);
        newOrders.delete(selectedTableId);
        return newOrders;
      });
    }
  }, [selectedTableId]);

  // Clear all carts and orders
  const clearAllCarts = useCallback(() => {
    setCart([]);
    setActiveOrders(new Map());
    setSelectedTableId(null);
  }, []);

  // Get cart total
  const getCartTotal = useCallback(() => {
    return cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
  }, [cart]);

  // Get cart item count
  const getCartItemCount = useCallback(() => {
    return cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [cart]);

  // Get cart item by ID
  const getCartItem = useCallback((productId: string) => {
    return cart.find(item => item.id === productId);
  }, [cart]);

  // Check if product is in cart
  const isInCart = useCallback((productId: string) => {
    return cart.some(item => item.id === productId);
  }, [cart]);

  // Get number of active orders
  const getActiveOrdersCount = useCallback(() => {
    return activeOrders.size;
  }, [activeOrders]);

  // Update print status for cart items (Mục #6)
  const updateItemsPrintStatus = useCallback((itemIds: string[], status: 'printed' | 'new' | 'modified') => {
    setCart(prevCart => {
      const idSet = new Set(itemIds);
      const updated = prevCart.map(item => {
        if (idSet.has(item.id)) {
          return {
            ...item,
            printStatus: status,
            printedQuantity: status === 'printed' ? item.quantity : item.printedQuantity,
          };
        }
        return item;
      });

      if (selectedTableId) {
        setActiveOrders(prev => {
          const next = new Map(prev);
          next.set(selectedTableId, updated);
          return next;
        });
      }

      return updated;
    });
  }, [selectedTableId]);

  // Update kitchen status for cart items
  const updateItemsKitchenStatus = useCallback((itemIds?: string[], status: 'sent' | 'new' = 'sent') => {
    setCart(prevCart => {
      const idSet = itemIds ? new Set(itemIds) : null;
      const updated = prevCart.map(item => {
        if (!idSet || idSet.has(item.id)) {
          return {
            ...item,
            kitchenStatus: status,
            isSentToKitchen: status === 'sent',
          };
        }
        return item;
      });

      if (selectedTableId) {
        setActiveOrders(prev => {
          const next = new Map(prev);
          next.set(selectedTableId, updated);
          return next;
        });
      }

      return updated;
    });
  }, [selectedTableId]);

  // Get table orders (for specific table)
  const getTableOrders = useCallback((tableId: string) => {
    return activeOrders.get(tableId) || [];
  }, [activeOrders]);

  return {
    cart,
    activeOrders,
    selectedTableId,
    setCart,
    setActiveOrders,
    setSelectedTableId,
    addToCart,
    removeFromCart,
    adjustQuantity,
    updateQuantity,
    updateCartItemNote,
    updateItemsPrintStatus,
    updateItemsKitchenStatus,
    clearCart,
    clearAllCarts,
    getCartTotal,
    getCartItemCount,
    getCartItem,
    isInCart,
    getActiveOrdersCount,
    getTableOrders
  };
};
