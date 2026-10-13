'use client';

import { useState, useCallback } from 'react';
import type { CartItem, Product } from '../types/pos';

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeOrders, setActiveOrders] = useState<Map<string, CartItem[]>>(new Map());
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // Add product to cart
  const addToCart = useCallback((product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.IDSP);
      let newCart: CartItem[];

      if (existingItem) {
        newCart = prevCart.map(item =>
          item.id === product.IDSP 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      } else {
        const newItem: CartItem = {
          id: product.IDSP,
          name: product['Tên sản phẩm'],
          note: '',
          image: product['Hình ảnh'] || '',
          price: Number(product['Đơn giá']) || 0,
          quantity: 1,
          unit: product['Đơn vị tính'] || 'Cái'
        };
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
          return newQuantity <= 0 ? null : { ...item, quantity: newQuantity };
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
        item.id === productId ? { ...item, quantity } : item
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
        item.id === productId ? { ...item, note } : item
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