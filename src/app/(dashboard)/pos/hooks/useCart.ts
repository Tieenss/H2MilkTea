'use client';

import { useState, useCallback } from 'react';
import type { CartItem, Product } from '../types/pos';
import { getLineItemKey } from '@/lib/cart/mergeCart';

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeOrders, setActiveOrders] = useState<Map<string, CartItem[]>>(new Map());
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // Add product to cart with options support (Size gốc M = +0đ, Size L = +5000đ)
  const addToCart = useCallback((
    product: Product,
    options?: { size?: string; sugar?: string; ice?: string; toppings?: string[]; note?: string }
  ) => {
    setCart(prevCart => {
      const category = product['Loại sản phẩm'] || '';
      const isFood = ['Ăn vặt', 'Bánh ngọt'].includes(category);
      const normalizedSize = isFood
        ? undefined
        : (options?.size ? (options.size.toUpperCase() === 'L' ? 'L' : 'M') : 'M');
      const sizeAdjust = !isFood && normalizedSize === 'L' ? 5000 : 0;
      const basePrice = Number(product['Đơn giá']) || 0;

      const newItem: CartItem = {
        id: product.IDSP,
        name: product['Tên sản phẩm'],
        note: options?.note || '',
        image: product['Hình ảnh'] || '',
        price: basePrice + sizeAdjust,
        quantity: 1,
        unit: product['Đơn vị tính'] || 'Cái',
        category,
        size: normalizedSize,
        sugar: options?.sugar,
        ice: options?.ice,
        toppings: options?.toppings,
        printStatus: 'new',
      };

      const newKey = getLineItemKey(newItem);
      const existingIndex = prevCart.findIndex(item => getLineItemKey(item) === newKey);
      let newCart: CartItem[];

      if (existingIndex >= 0) {
        newCart = prevCart.map((item, idx) =>
          idx === existingIndex 
            ? {
                ...item,
                quantity: item.quantity + 1,
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
      const newCart = prevCart.filter(item => item.id !== productId);

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
      const updatedCart = prevCart.map(item => {
        if (item.id === productId) {
          const newQuantity = item.quantity + amount;
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
      const newCart = prevCart.map(item =>
        item.id === productId
          ? {
              ...item,
              quantity,
              printStatus: item.printStatus === 'printed' ? 'modified' : (item.printStatus || 'new'),
            }
          : item
      );

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
      const newCart = prevCart.map(item =>
        item.id === productId
          ? {
              ...item,
              note,
              printStatus: item.printStatus === 'printed' ? 'modified' : (item.printStatus || 'new'),
            }
          : item
      );

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
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  // Get cart item count
  const getCartItemCount = useCallback(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
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
