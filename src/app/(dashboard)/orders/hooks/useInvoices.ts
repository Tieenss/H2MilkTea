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
      cancelledInvoices: invoiceList.filter(inv => inv['Trạng thái'] === 'Đã hủy').length,
      cancelledLossRevenue: invoiceList.reduce((sum, inv) =>
        inv['Trạng thái'] === 'Đã hủy'
          ? sum + (Number(inv['Tổng tiền'] || 0) + Number(inv['VAT'] || 0) - Number(inv['Giảm giá'] || 0))
          : sum,
        0
      )
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

  // Update invoice status (hỗ trợ cả các đơn có bàn đã bị xóa và lưu vết kiểm toán khi hủy)
  const updateInvoiceStatus = useCallback(async (invoiceId: string, status: string, reason?: string, staffName?: string) => {
    try {
      const invoice = invoices.find(inv => inv.IDHOADON === invoiceId);
      const auditNote = status === 'Đã hủy' && reason
        ? `[ĐÃ HỦY] ${reason} (Bởi: ${staffName || 'Quản lý'} lúc ${new Date().toLocaleString('vi-VN')})`
        : invoice?.['Ghi chú'];

      const updatedInvoice = invoice
        ? { ...invoice, 'Trạng thái': status, ...(auditNote ? { 'Ghi chú': auditNote } : {}) }
        : { IDHOADON: invoiceId, 'Trạng thái': status, ...(auditNote ? { 'Ghi chú': auditNote } : {}) };
      
      const result = await authUtils.apiRequest('HOADON', 'update', { 
        ...updatedInvoice 
      });

      if (!Array.isArray(result) && result.success) {
        setInvoices(prev => {
          const next = prev.map(inv => 
            inv.IDHOADON === invoiceId ? { ...inv, 'Trạng thái': status, ...(auditNote ? { 'Ghi chú': auditNote } : {}) } : inv
          );
          calculateStats(next);
          return next;
        });

        const statusMessages = {
          'Đã xác nhận': 'Xác nhận hóa đơn thành công!',
          'Đã thanh toán': 'Xác nhận thanh toán thành công!',
          'Đã hủy': 'Hủy hóa đơn và lưu vết kiểm toán thành công!'
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
  }, [invoices, calculateStats]);

  // Settle invoice debt
  const settleInvoiceDebt = useCallback(async (invoiceId: string) => {
    try {
      const invoice = invoices.find(inv => inv.IDHOADON === invoiceId);
      if (!invoice) {
        throw new Error('Không tìm thấy hóa đơn');
      }

      const finalTotal = Number(invoice['Tổng tiền']) + Number(invoice['VAT'] || 0) - Number(invoice['Giảm giá'] || 0);
      const remainingDebt = Number(invoice['Tiền nợ']) || Math.max(0, finalTotal - (Number(invoice['Khách trả']) || 0));

      const updatedInvoice = {
        ...invoice,
        'Trạng thái': 'Đã thanh toán',
        'Tiền nợ': 0,
        'Khách trả': finalTotal,
        'Đã thanh toán': finalTotal
      };

      const result = await authUtils.apiRequest('HOADON', 'update', {
        ...updatedInvoice
      });

      if (!Array.isArray(result) && result.success) {
        setInvoices(prev => prev.map(inv =>
          inv.IDHOADON === invoiceId ? updatedInvoice : inv
        ));

        // Giảm công nợ của khách hàng tương ứng nếu có
        const custName = invoice['Khách hàng'];
        if (custName && custName !== 'Khách lẻ') {
          try {
            const customers = await authUtils.apiRequest('KHACHHANG', 'getall', {});
            if (Array.isArray(customers)) {
              const cust = customers.find(c => c['Tên khách hàng'] === custName || c.IDKHACHHANG === invoice['Mã khách hàng'] || c.IDKH === invoice['Mã khách hàng']);
              if (cust) {
                const currentCustDebt = Number(cust['Công nợ']) || 0;
                const newCustDebt = Math.max(0, currentCustDebt - remainingDebt);
                await authUtils.apiRequest('KHACHHANG', 'update', {
                  IDKHACHHANG: cust.IDKHACHHANG || cust.IDKH,
                  IDKH: cust.IDKH || cust.IDKHACHHANG,
                  'Công nợ': newCustDebt
                });
              }
            }
          } catch (e) {
            console.warn('Lỗi cập nhật công nợ khách hàng:', e);
          }
        }

        toast.success(`Thu nợ hóa đơn ${invoiceId} thành công!`);
      } else {
        throw new Error('Lỗi khi thu nợ hóa đơn');
      }
    } catch (error: any) {
      console.error('Error settling invoice debt:', error);
      toast.error(error.message || 'Lỗi khi thu nợ hóa đơn');
    }
  }, [invoices]);

  // Delete invoice -> Chuyển thành Soft Delete có lưu vết kiểm toán chống thất thoát
  const deleteInvoice = useCallback(async (invoiceId: string, reason?: string, staffName?: string) => {
    try {
      const toastId = toast.loading('Đang chuyển trạng thái hóa đơn sang Đã hủy...');
      const cancelReason = reason || 'Quản lý yêu cầu xóa/hủy';
      const cancelledBy = staffName || 'Quản lý';

      const result = await authUtils.apiRequest('HOADON', 'delete', {
        IDHOADON: invoiceId,
        cancel_reason: cancelReason,
        cancelled_by: cancelledBy
      });

      if (!Array.isArray(result) && result.success) {
        const auditNote = `[ĐÃ HỦY] ${cancelReason} (Bởi: ${cancelledBy} lúc ${new Date().toLocaleString('vi-VN')})`;
        setInvoices(prev => {
          const next = prev.map(inv =>
            inv.IDHOADON === invoiceId ? { ...inv, 'Trạng thái': 'Đã hủy', 'Ghi chú': auditNote } : inv
          );
          calculateStats(next);
          return next;
        });
        toast.success('Hóa đơn đã được chuyển sang Đã hủy (Lưu vết kiểm toán chống thất thoát)', { id: toastId });
      } else {
        throw new Error((!Array.isArray(result) && result.message) || 'Lỗi khi hủy hóa đơn');
      }
    } catch (error: any) {
      console.error('Error soft-deleting invoice:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi hủy hóa đơn');
    }
  }, [calculateStats]);

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
    settleInvoiceDebt,
    deleteInvoice
  };
};