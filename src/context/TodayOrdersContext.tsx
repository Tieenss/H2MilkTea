'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import authUtils from '@/utils/authUtils';

interface TodayOrdersContextType {
  todayOrdersCount: number;
  loading: boolean;
  refetch: () => void;
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

export const TodayOrdersProvider: React.FC<TodayOrdersProviderProps> = ({ children }) => {
  const [todayOrdersCount, setTodayOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchTodayOrders = async () => {
    try {
      setLoading(true);
      const response = await authUtils.apiRequest('HOADON', 'getall', {});
      const invoiceList = Array.isArray(response) ? response : [];
      
      // Lấy ngày hôm nay
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      // Đếm số đơn hàng trong ngày hôm đó
      const todayOrders = invoiceList.filter(invoice => {
        const invoiceDate = new Date(invoice['Ngày']);
        const invoiceDateString = invoiceDate.toISOString().split('T')[0];
        return invoiceDateString === todayString;
      });
      
      setTodayOrdersCount(todayOrders.length);
    } catch (error) {
      console.error('Error fetching today orders:', error);
      setTodayOrdersCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayOrders();
    
    // Cập nhật mỗi phút để đảm bảo số liệu luôn mới
    const interval = setInterval(fetchTodayOrders, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const value = {
    todayOrdersCount,
    loading,
    refetch: fetchTodayOrders
  };

  return (
    <TodayOrdersContext.Provider value={value}>
      {children}
    </TodayOrdersContext.Provider>
  );
}; 