'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { CartItem, Product, ToppingOption } from '../types/customer-order';
import {
  SIZE_OPTIONS,
  normalizeToppings,
  extractToppingsFromNote,
  calculateToppingsPrice,
} from '../types/customer-order';

interface AddItemOptions {
  size: 'S' | 'M' | 'L';
  sugar: string;
  ice: string;
  note: string;
  quantity: number;
  toppings?: Array<string | ToppingOption>;
  toppingsAdjust?: number;
}

interface CartContextType {
  items: CartItem[];
  tableId: string;
  tableName: string;
  setTableInfo: (id: string, name: string) => void;
  addItem: (product: Product, options: AddItemOptions) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
  orderNote: string;
  setOrderNote: (note: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'h2_customer_cart';
const TABLE_STORAGE_KEY = 'h2_customer_table';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [tableId, setTableId] = useState('');
  const [tableName, setTableName] = useState('');
  const [orderNote, setOrderNote] = useState('');

  // Load cart from localStorage on mount & normalize size pricing (M = +0, L = +5000)
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      const savedTable = localStorage.getItem(TABLE_STORAGE_KEY);
      if (savedCart) {
        const parsed: CartItem[] = JSON.parse(savedCart);
        const normalized = parsed.map((item) => {
          const isFood = ['Ăn vặt', 'Bánh ngọt'].includes(item.product?.['Loại sản phẩm'] || '');
          const normalizedSize: 'M' | 'L' = item.size === 'L' ? 'L' : 'M';
          const sizeAdjust = isFood ? 0 : (normalizedSize === 'L' ? 5000 : 0);
          const toppingsList = isFood
            ? []
            : Array.isArray(item.toppings) && item.toppings.length > 0
              ? normalizeToppings(item.toppings)
              : extractToppingsFromNote(item.note);
          const toppingsAdjust = isFood
            ? 0
            : typeof item.toppingsAdjust === 'number' && Number.isFinite(item.toppingsAdjust)
              ? Math.max(0, item.toppingsAdjust)
              : calculateToppingsPrice(toppingsList);
          const basePrice = parseInt(item.product?.['Đơn giá'] || '0', 10) || 0;
          return {
            ...item,
            size: normalizedSize,
            toppings: toppingsList,
            toppingsAdjust,
            unitPrice: basePrice + sizeAdjust + toppingsAdjust,
          };
        });
        setItems(normalized);
      }
      if (savedTable) {
        const table = JSON.parse(savedTable);
        setTableId(table.id || '');
        setTableName(table.name || '');
      }
    } catch (e) {
      console.error('Error loading cart from storage:', e);
    }
  }, []);

  // Save cart to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Error saving cart to storage:', e);
    }
  }, [items]);

  const setTableInfo = useCallback((id: string, name: string) => {
    setTableId(id);
    setTableName(name);
    try {
      localStorage.setItem(TABLE_STORAGE_KEY, JSON.stringify({ id, name }));
    } catch (e) {
      console.error('Error saving table to storage:', e);
    }
  }, []);

  const addItem = useCallback((
    product: Product,
    options: AddItemOptions
  ) => {
    const isFood = ['Ăn vặt', 'Bánh ngọt'].includes(product['Loại sản phẩm']);
    const normalizedSize: 'M' | 'L' = options.size === 'L' ? 'L' : 'M';
    const sizeAdjust = isFood ? 0 : SIZE_OPTIONS.find(s => s.value === normalizedSize)?.priceAdjust || 0;
    const normalizedToppings = isFood
      ? []
      : Array.isArray(options.toppings) && options.toppings.length > 0
        ? normalizeToppings(options.toppings)
        : extractToppingsFromNote(options.note);
    const toppingsAdjust = isFood
      ? 0
      : typeof options.toppingsAdjust === 'number' && Number.isFinite(options.toppingsAdjust)
        ? Math.max(0, options.toppingsAdjust)
        : calculateToppingsPrice(normalizedToppings);
    const basePrice = parseInt(String(product['Đơn giá'] || '0'), 10) || 0;
    const unitPrice = basePrice + sizeAdjust + toppingsAdjust;

    // Generate unique id based on product + options + toppings + note để không gộp nhầm món khác topping
    const toppingKey = normalizedToppings.map(t => t.name).sort().join(',');
    const noteKey = (options.note || '').trim();
    const optionKey = `${product.IDSP}_${normalizedSize}_${options.sugar}_${options.ice}_${toppingKey}_${noteKey}`;

    setItems(prev => {
      const existingIndex = prev.findIndex(item => item.id === optionKey);
      if (existingIndex >= 0) {
        // Update quantity of existing item
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + options.quantity,
          note: options.note || updated[existingIndex].note,
          toppings: normalizedToppings,
          toppingsAdjust,
          unitPrice,
        };
        return updated;
      }
      // Add new item
      return [...prev, {
        id: optionKey,
        product,
        quantity: options.quantity,
        size: normalizedSize,
        sugar: options.sugar,
        ice: options.ice,
        note: options.note,
        toppings: normalizedToppings,
        toppingsAdjust,
        unitPrice,
      }];
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.id !== itemId));
      return;
    }
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, quantity: Math.min(quantity, 20) } : item
    ));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setOrderNote('');
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing cart from storage:', e);
    }
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  return (
    <CartContext.Provider value={{
      items,
      tableId,
      tableName,
      setTableInfo,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      totalAmount,
      orderNote,
      setOrderNote,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
