// hooks/useCustomers.ts
'use client';

import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { Customer, CustomerFormData, CustomerStats, CustomerTransaction } from '../types/customer';
import authUtils from '@/utils/authUtils';

// Helper function to parse Vietnamese date format (DD/MM/YYYY HH:mm:ss)
const parseVietnameseDate = (dateString: string): Date | null => {
  if (!dateString || dateString.trim() === '') return null;
  
  try {
    // Nếu đã là định dạng ISO hoặc có thể parse trực tiếp
    const directParse = new Date(dateString);
    if (!isNaN(directParse.getTime())) {
      return directParse;
    }
    
    // Xử lý định dạng DD/MM/YYYY hoặc DD/MM/YYYY HH:mm:ss
    const parts = dateString.trim().split(' ');
    const datePart = parts[0];
    const timePart = parts[1] || '00:00:00';
    
    const [day, month, year] = datePart.split('/').map(num => parseInt(num, 10));
    const [hour, minute, second] = timePart.split(':').map(num => parseInt(num, 10));
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return null;
    }
    
    const date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

// Helper function to format date to Vietnamese format (DD/MM/YYYY HH:mm:ss)
const formatToVietnameseDateTime = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  const second = date.getSeconds().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
};

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerTransactions, setCustomerTransactions] = useState<Map<string, CustomerTransaction[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    newCustomersThisMonth: 0,
    vipCustomers: 0,
    diamondCustomers: 0,
    activeCustomers: 0,
    totalLoyaltyPoints: 0,
    totalSpending: 0,
    averageSpending: 0
  });

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authUtils.apiRequest('KHACHHANG', 'getall', {});
      const customerList = Array.isArray(response) ? response : [];
      
      setCustomers(customerList);
      calculateStats(customerList);
      
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Lỗi khi tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch customer transactions
  const fetchCustomerTransactions = useCallback(async (customerId: string) => {
    try {
      if (customerTransactions.has(customerId)) {
        return customerTransactions.get(customerId)!;
      }

      // Get customer info to find related invoices
      const customer = customers.find(c => c.IDKHACHHANG === customerId);
      if (!customer || !customer['Hóa đơn liên quan']) {
        return [];
      }

      const invoiceIds = customer['Hóa đơn liên quan'].split(',').map(id => id.trim());
      const transactions: CustomerTransaction[] = [];

      // Fetch each invoice
      for (const invoiceId of invoiceIds) {
        if (invoiceId) {
          const invoiceResponse = await authUtils.apiRequest('HOADON', 'find', {
            filter: { IDHOADON: invoiceId }
          });
          
          if (Array.isArray(invoiceResponse) && invoiceResponse.length > 0) {
            const invoice = invoiceResponse[0];
            transactions.push({
              IDHOADON: invoice.IDHOADON,
              'Ngày': invoice['Ngày'],
              'Tổng tiền': Number(invoice['Tổng tiền']) + Number(invoice['VAT']) - Number(invoice['Giảm giá']),
              'Trạng thái': invoice['Trạng thái'],
              'Bàn': invoice.IDBAN
            });
          }
        }
      }

      // Sort by date descending
      transactions.sort((a, b) => {
        const dateA = parseVietnameseDate(b['Ngày']);
        const dateB = parseVietnameseDate(a['Ngày']);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      });
      
      setCustomerTransactions(prev => {
        const newMap = new Map(prev);
        newMap.set(customerId, transactions);
        return newMap;
      });
      
      return transactions;
    } catch (error) {
      console.error('Error fetching customer transactions:', error);
      toast.error('Lỗi khi tải lịch sử giao dịch');
      return [];
    }
  }, [customers, customerTransactions]);

  // Calculate statistics
  const calculateStats = useCallback((customerList: Customer[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const stats: CustomerStats = {
      totalCustomers: customerList.length,
      newCustomersThisMonth: customerList.filter(customer => {
        const createDate = parseVietnameseDate(customer['Ngày tạo']);
        if (!createDate) return false;
        return createDate.getMonth() === currentMonth && createDate.getFullYear() === currentYear;
      }).length,
      vipCustomers: customerList.filter(customer => customer['Loại khách hàng'] === 'Khách VIP').length,
      diamondCustomers: customerList.filter(customer => customer['Loại khách hàng'] === 'Khách kim cương').length,
      activeCustomers: customerList.filter(customer => customer['Trạng thái'] === 'Hoạt động').length,
      totalLoyaltyPoints: customerList.reduce((sum, customer) => sum + Number(customer['Điểm tích lũy']), 0),
      totalSpending: customerList.reduce((sum, customer) => sum + Number(customer['Tổng chi tiêu']), 0),
      averageSpending: customerList.length > 0 ? 
        customerList.reduce((sum, customer) => sum + Number(customer['Tổng chi tiêu']), 0) / customerList.length : 0
    };
    
    setStats(stats);
  }, []);

  // Add new customer
  const addCustomer = useCallback(async (formData: CustomerFormData) => {
    try {
      const customerId = `KH${Date.now()}`;
      const now = new Date();
      const customerData = {
        IDKHACHHANG: customerId,
        'Tổng chi tiêu': 0,
        'Lần mua cuối': '',
        'Ngày tạo': formatToVietnameseDateTime(now),
        'Ngày cập nhật': formatToVietnameseDateTime(now),
        'Hóa đơn liên quan': '',
        ...formData
      };

      const result = await authUtils.apiRequest('KHACHHANG', 'create', customerData);
      
      if (!Array.isArray(result) && result.success) {
        setCustomers(prev => [customerData as Customer, ...prev]);
        toast.success('Thêm khách hàng mới thành công!');
        return customerId;
      } else if (!Array.isArray(result)) {
        throw new Error(result.message || 'Lỗi khi thêm khách hàng');
      } else {
        throw new Error('Lỗi khi thêm khách hàng');
      }
    } catch (error: any) {
      console.error('Error adding customer:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi thêm khách hàng');
      throw error;
    }
  }, []);

  // Update customer
  const updateCustomer = useCallback(async (customerId: string, formData: Partial<CustomerFormData>) => {
    try {
      const customer = customers.find(c => c.IDKHACHHANG === customerId);
      if (!customer) {
        throw new Error('Không tìm thấy khách hàng');
      }

      const updatedCustomer = { 
        ...customer, 
        ...formData,
        'Ngày cập nhật': new Date().toLocaleString('vi-VN')
      };
      
      const result = await authUtils.apiRequest('KHACHHANG', 'update', { 
        ...updatedCustomer 
      });

      if (!Array.isArray(result) && result.success) {
        setCustomers(prev => prev.map(c => 
          c.IDKHACHHANG === customerId ? updatedCustomer : c
        ));
        toast.success('Cập nhật thông tin khách hàng thành công!');
      } else if (!Array.isArray(result)) {
        throw new Error(result.message || 'Lỗi khi cập nhật khách hàng');
      } else {
        throw new Error('Lỗi khi cập nhật khách hàng');
      }
    } catch (error: any) {
      console.error('Error updating customer:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi cập nhật khách hàng');
      throw error;
    }
  }, [customers]);

  // Delete customer
  const deleteCustomer = useCallback(async (customerId: string) => {
    const originalCustomers = customers;
    
    try {
      // Optimistic update
      setCustomers(prev => prev.filter(c => c.IDKHACHHANG !== customerId));
      setCustomerTransactions(prev => {
        const newMap = new Map(prev);
        newMap.delete(customerId);
        return newMap;
      });

      const toastId = toast.loading('Đang xóa khách hàng...');

      const result = await authUtils.apiRequest('KHACHHANG', 'delete', {
        IDKHACHHANG: customerId
      });

      if (!Array.isArray(result) && result.success) {
        toast.success('Xóa khách hàng thành công!', { id: toastId });
      } else {
        // Rollback on error
        setCustomers(originalCustomers);
        throw new Error((!Array.isArray(result) && result.message) || 'Lỗi khi xóa khách hàng');
      }
    } catch (error: any) {
      // Rollback on error
      setCustomers(originalCustomers);
      console.error('Error deleting customer:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi xóa khách hàng');
    }
  }, [customers]);

  // Update customer after purchase
  const updateCustomerAfterPurchase = useCallback(async (phoneNumber: string, invoiceTotal: number, invoiceId: string) => {
    try {
      const customerResponse = await authUtils.apiRequest('KHACHHANG', 'find', {
        filter: { 'Số điện thoại': phoneNumber }
      });

      if (Array.isArray(customerResponse) && customerResponse.length > 0) {
        const customer = customerResponse[0];
        const newPoints = Math.floor(invoiceTotal / 1000); // 1 point per 1000 VND
        const currentPoints = Number(customer['Điểm tích lũy']) || 0;
        const currentSpending = Number(customer['Tổng chi tiêu']) || 0;

        const updatedCustomer = {
          ...customer,
          'Điểm tích lũy': currentPoints + newPoints,
          'Tổng chi tiêu': currentSpending + invoiceTotal,
          'Lần mua cuối': formatToVietnameseDateTime(new Date()),
          'Ngày cập nhật': formatToVietnameseDateTime(new Date()),
          'Hóa đơn liên quan': customer['Hóa đơn liên quan'] ? 
            `${customer['Hóa đơn liên quan']}, ${invoiceId}` : invoiceId
        };

        await authUtils.apiRequest('KHACHHANG', 'update', updatedCustomer);
        
        // Update local state
        setCustomers(prev => prev.map(c => 
          c.IDKHACHHANG === customer.IDKHACHHANG ? updatedCustomer : c
        ));
      }
    } catch (error) {
      console.error('Error updating customer after purchase:', error);
    }
  }, []);

  // Initialize
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return {
    customers,
    customerTransactions,
    loading,
    stats,
    fetchCustomers,
    fetchCustomerTransactions,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    updateCustomerAfterPurchase
  };
};