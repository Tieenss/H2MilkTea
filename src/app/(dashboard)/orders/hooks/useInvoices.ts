'use client';

import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { Invoice, InvoiceDetail, InvoiceFormData, InvoiceStats } from '../types/invoice';
import authUtils from '@/utils/authUtils';

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceDetails, setInvoiceDetails] = useState<Map<string, InvoiceDetail[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<InvoiceStats>({
    totalInvoices: 0,
    totalRevenue: 0,
    pendingInvoices: 0,
    completedInvoices: 0,
    cancelledInvoices: 0
  });

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authUtils.apiRequest('HOADON', 'getall', {});
      const invoiceList = Array.isArray(response) ? response : [];
      
      setInvoices(invoiceList);
      calculateStats(invoiceList);
      
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Lỗi khi tải danh sách hóa đơn');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch invoice details
  const fetchInvoiceDetails = useCallback(async (invoiceId: string) => {
    try {
      if (invoiceDetails.has(invoiceId)) {
        return invoiceDetails.get(invoiceId)!;
      }

      const response = await authUtils.apiRequest('HOADONDETAIL', 'find', {
        filter: { IDHOADON: invoiceId }
      });
      
      const details = Array.isArray(response) ? response : [];
      
      setInvoiceDetails(prev => {
        const newMap = new Map(prev);
        newMap.set(invoiceId, details);
        return newMap;
      });
      
      return details;
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      toast.error('Lỗi khi tải chi tiết hóa đơn');
      return [];
    }
  }, [invoiceDetails]);

  // Calculate statistics
  const calculateStats = useCallback((invoiceList: Invoice[]) => {
    const stats: InvoiceStats = {
      totalInvoices: invoiceList.length,
      totalRevenue: invoiceList.reduce((sum, inv) => 
        inv['Trạng thái'] === 'Đã thanh toán' ? 
        sum + Number(inv['Tổng tiền']) + Number(inv['VAT']) - Number(inv['Giảm giá']) : sum, 0
      ),
      pendingInvoices: invoiceList.filter(inv => inv['Trạng thái'] === 'Chờ xác nhận').length,
      completedInvoices: invoiceList.filter(inv => inv['Trạng thái'] === 'Đã thanh toán').length,
      cancelledInvoices: invoiceList.filter(inv => inv['Trạng thái'] === 'Đã hủy').length
    };
    
    setStats(stats);
  }, []);

  // Add new invoice
  const addInvoice = useCallback(async (formData: InvoiceFormData, details: InvoiceDetail[]) => {
    try {
      const invoiceId = `INV${Date.now()}`;
      const invoiceData = {
        IDHOADON: invoiceId,
        'Ngày': new Date().toISOString(),
        ...formData
      };

      const invoiceDetailsData = details.map(detail => ({
        ...detail,
        IDHOADON: invoiceId,
        IDHOADONDETAIL: `${invoiceId}_${detail.IDSP}`
      }));

      // Add invoice
      const invoiceResult = await authUtils.apiRequest('HOADON', 'create', invoiceData);
      
      if (!Array.isArray(invoiceResult) && invoiceResult.success) {
        // Add details
        for (const detail of invoiceDetailsData) {
          await authUtils.apiRequest('HOADONDETAIL', 'create', detail);
        }

        setInvoices(prev => [invoiceData as Invoice, ...prev]);
        setInvoiceDetails(prev => {
          const newMap = new Map(prev);
          newMap.set(invoiceId, invoiceDetailsData);
          return newMap;
        });

        toast.success('Thêm hóa đơn mới thành công!');
        return invoiceId;
      } else if (!Array.isArray(invoiceResult)) {
        throw new Error(invoiceResult.message || 'Lỗi khi thêm hóa đơn');
      } else {
        throw new Error('Lỗi khi thêm hóa đơn');
      }
    } catch (error: any) {
      console.error('Error adding invoice:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi thêm hóa đơn');
      throw error;
    }
  }, []);

  // Update invoice status
  const updateInvoiceStatus = useCallback(async (invoiceId: string, status: string) => {
    try {
      const invoice = invoices.find(inv => inv.IDHOADON === invoiceId);
      if (!invoice) {
        throw new Error('Không tìm thấy hóa đơn');
      }

      const updatedInvoice = { ...invoice, 'Trạng thái': status };
      
      const result = await authUtils.apiRequest('HOADON', 'update', { 
        ...updatedInvoice 
      });

      if (!Array.isArray(result) && result.success) {
        setInvoices(prev => prev.map(inv => 
          inv.IDHOADON === invoiceId ? updatedInvoice : inv
        ));

        const statusMessages = {
          'Đã xác nhận': 'Xác nhận hóa đơn thành công!',
          'Đã thanh toán': 'Xác nhận thanh toán thành công!',
          'Đã hủy': 'Hủy hóa đơn thành công!'
        };

        toast.success(statusMessages[status as keyof typeof statusMessages] || 'Cập nhật trạng thái thành công!');
      } else if (!Array.isArray(result)) {
        throw new Error(result.message || 'Lỗi khi cập nhật trạng thái');
      } else {
        throw new Error('Lỗi khi cập nhật trạng thái');
      }
    } catch (error: any) {
      console.error('Error updating invoice status:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi cập nhật trạng thái');
      throw error;
    }
  }, [invoices]);

  // Delete invoice
  const deleteInvoice = useCallback(async (invoiceId: string) => {
    const originalInvoices = invoices;
    
    try {
      // Optimistic update
      setInvoices(prev => prev.filter(inv => inv.IDHOADON !== invoiceId));
      setInvoiceDetails(prev => {
        const newMap = new Map(prev);
        newMap.delete(invoiceId);
        return newMap;
      });

      const toastId = toast.loading('Đang xóa hóa đơn...');

      // Delete details first
      const detailsToDelete = invoiceDetails.get(invoiceId) || [];
      for (const detail of detailsToDelete) {
        await authUtils.apiRequest('HOADONDETAIL', 'delete', { 
          IDHOADONDETAIL: detail.IDHOADONDETAIL 
        });
      }

      // Then delete invoice
      const result = await authUtils.apiRequest('HOADON', 'delete', {
        IDHOADON: invoiceId
      });

      if (!Array.isArray(result) && result.success) {
        toast.success('Xóa hóa đơn thành công!', { id: toastId });
      } else {
        // Rollback on error
        setInvoices(originalInvoices);
        throw new Error((!Array.isArray(result) && result.message) || 'Lỗi khi xóa hóa đơn');
      }
    } catch (error: any) {
      // Rollback on error
      setInvoices(originalInvoices);
      console.error('Error deleting invoice:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi xóa hóa đơn');
    }
  }, [invoices, invoiceDetails]);

  // Initialize
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return {
    invoices,
    invoiceDetails,
    loading,
    stats,
    fetchInvoices,
    fetchInvoiceDetails,
    addInvoice,
    updateInvoiceStatus,
    deleteInvoice
  };
};