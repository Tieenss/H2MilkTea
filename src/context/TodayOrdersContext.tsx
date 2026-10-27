'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authUtils from '@/utils/authUtils';

interface TodayOrdersContextType {
  todayOrdersCount: number;
  unreadOrdersCount: number;
  loading: boolean;
  refetch: () => void;
  markOrdersAsRead: () => void;
}

const TodayOrdersContext = createContext<TodayOrdersContextType | undefined>(undefined);

export const useTodayOrdersContext = () => {
  const context = useContext(TodayOrdersContext);
  if (context === undefined) {
    throw new Error('useTodayOrdersContext must be used within a TodayOrdersProvider');
  }
  return context;
};

interface TodayOrdersProviderProps {
  children: React.ReactNode;
}

const STORAGE_LAST_VIEWED_TIME = 'h2_orders_last_viewed_time_v1';
const STORAGE_VIEWED_ORDER_IDS = 'h2_orders_viewed_ids_v1';
const EVENT_ORDERS_VIEWED = 'h2_orders_marked_as_read';

export const TodayOrdersProvider: React.FC<TodayOrdersProviderProps> = ({ children }) => {
  const [todayOrdersCount, setTodayOrdersCount] = useState(0);
  const [unreadOrdersCount, setUnreadOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const getViewedOrderIds = (): Set<string> => {
    try {
      if (typeof window === 'undefined') return new Set();
      const raw = localStorage.getItem(STORAGE_VIEWED_ORDER_IDS);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr.map(String) : []);
    } catch {
      return new Set();
    }
  };

  const getLastViewedTime = (): number => {
    try {
      if (typeof window === 'undefined') return 0;
      const raw = localStorage.getItem(STORAGE_LAST_VIEWED_TIME);
      return raw ? parseInt(raw, 10) || 0 : 0;
    } catch {
      return 0;
    }
  };

  const fetchTodayOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authUtils.apiRequest('HOADON', 'getall', {});
      const invoiceList = Array.isArray(response) ? response : [];

      const now = new Date();
      const todayYear = now.getFullYear();
      const todayMonth = now.getMonth();
      const todayDate = now.getDate();

      const viewedIds = getViewedOrderIds();
      const lastViewedTime = getLastViewedTime();

      // Đếm số đơn hàng hôm nay
      const todayOrders: any[] = [];
      invoiceList.forEach((invoice) => {
        const d = authUtils.parseFlexibleDate(invoice['Ngày'] || invoice['Thời gian']);
        if (
          d &&
          d.getFullYear() === todayYear &&
          d.getMonth() === todayMonth &&
          d.getDate() === todayDate
        ) {
          todayOrders.push(invoice);
        }
      });

      setTodayOrdersCount(todayOrders.length);

      // Đơn mới chưa xem:
      // Là đơn tạo hôm nay mà ID chưa có trong viewedIds VÀ thời gian tạo > lastViewedTime
      // (Nếu lastViewedTime chưa có lần nào, coi các đơn hôm nay chưa có trong viewedIds là unread)
      let unread = 0;
      todayOrders.forEach((invoice) => {
        const id = String(invoice.IDHOADON || invoice.IDHD || '');
        if (!id) return;

        if (viewedIds.has(id)) {
          return; // Đã xem ID này rồi
        }

        const invDate = authUtils.parseFlexibleDate(invoice['Ngày'] || invoice['Thời gian']);
        const invTimestamp = invDate ? invDate.getTime() : 0;

        if (lastViewedTime > 0 && invTimestamp > 0 && invTimestamp <= lastViewedTime) {
          return; // Đơn tạo trước thời điểm xem lần cuối
        }

        unread++;
      });

      setUnreadOrdersCount(unread);
    } catch (error) {
      console.error('Error fetching today orders:', error);
      setTodayOrdersCount(0);
      setUnreadOrdersCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const markOrdersAsRead = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return;

      const now = Date.now();
      localStorage.setItem(STORAGE_LAST_VIEWED_TIME, String(now));

      // Lấy toàn bộ ID hóa đơn hiện tại để đánh dấu đã xem
      const response = await authUtils.apiRequest('HOADON', 'getall', {});
      const invoiceList = Array.isArray(response) ? response : [];
      const currentIds = invoiceList
        .map((inv: any) => String(inv.IDHOADON || inv.IDHD || ''))
        .filter(Boolean);

      const existingViewed = getViewedOrderIds();
      currentIds.forEach((id) => existingViewed.add(id));

      localStorage.setItem(
        STORAGE_VIEWED_ORDER_IDS,
        JSON.stringify(Array.from(existingViewed))
      );

      setUnreadOrdersCount(0);

      window.dispatchEvent(new CustomEvent(EVENT_ORDERS_VIEWED));
    } catch (e) {
      console.error('Error marking orders as read:', e);
      setUnreadOrdersCount(0);
    }
  }, []);

  useEffect(() => {
    fetchTodayOrders();

    const handleExternalViewed = () => {
      setUnreadOrdersCount(0);
    };

    window.addEventListener(EVENT_ORDERS_VIEWED, handleExternalViewed);
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_LAST_VIEWED_TIME || e.key === STORAGE_VIEWED_ORDER_IDS) {
        fetchTodayOrders();
      }
    });

    const interval = setInterval(fetchTodayOrders, 30000);

    return () => {
      window.removeEventListener(EVENT_ORDERS_VIEWED, handleExternalViewed);
      clearInterval(interval);
    };
  }, [fetchTodayOrders]);

  const value = {
    todayOrdersCount,
    unreadOrdersCount,
    loading,
    refetch: fetchTodayOrders,
    markOrdersAsRead,
  };

  return (
    <TodayOrdersContext.Provider value={value}>
      {children}
    </TodayOrdersContext.Provider>
  );
};
