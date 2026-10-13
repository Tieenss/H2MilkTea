// page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Filter, Download, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useInvoices } from './hooks/useInvoices';
import { InvoiceStatsComponent } from './components/InvoiceStats';
import { InvoiceDataTable } from './components/InvoiceDataTable';
import { InvoiceDetailsModal } from './components/InvoiceDetailsModal';
import { printReceipt } from './utils/invoicePrint';
import { INVOICE_STATUS, PAYMENT_METHODS } from './utils/invoiceConstants';
import type { Invoice } from './types/invoice';
import authUtils from '@/utils/authUtils';
import toast from 'react-hot-toast';

export default function InvoiceManagementPage() {
  const router = useRouter();
  const {
    invoices,
    invoiceDetails,
    loading,
    stats,
    fetchInvoices,
    fetchInvoiceDetails,
    updateInvoiceStatus,
    deleteInvoice
  } = useInvoices();

  // User permissions
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateRange, setDateRange] = useState<any>(null);

  // Modal state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Filtered invoices
  const filteredInvoices = React.useMemo(() => {
    return invoices.filter(invoice => {
      const matchesSearch = !searchTerm || 
        invoice.IDHOADON.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice['Khách hàng'].toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice['Nhân viên'].toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.IDBAN.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || 
        invoice['Trạng thái'] === statusFilter;

      const matchesPayment = paymentFilter === 'all' || 
        invoice['Loại thanh toán'] === paymentFilter;

      const matchesDate = !dateRange || 
        (new Date(invoice['Ngày']) >= dateRange.from && 
         new Date(invoice['Ngày']) <= dateRange.to);

      return matchesSearch && matchesStatus && matchesPayment && matchesDate;
    });
  }, [invoices, searchTerm, statusFilter, paymentFilter, dateRange]);

  // Check user permissions
  useEffect(() => {
    const userData = authUtils.getUserData();
    if (!userData) {
      router.push('/login');
      return;
    }

    const isAdminUser = userData['Phân quyền'] === 'Admin';
    const isManagerUser = userData['Phân quyền'] === 'Quản lý';
    setIsAdmin(isAdminUser);
    setIsManager(isManagerUser);
  }, [router]);

  // Handle view details
  const handleViewDetails = async (invoice: Invoice) => {
    try {
      const details = await fetchInvoiceDetails(invoice.IDHOADON);
      setSelectedInvoice(invoice);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
    }
  };

  // Handle print invoice
  const handlePrintInvoice = async (invoice: Invoice) => {
    try {
      const details = await fetchInvoiceDetails(invoice.IDHOADON);
      await printReceipt(invoice, details);
      toast.success('In hóa đơn thành công!');
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast.error('Có lỗi xảy ra khi in hóa đơn');
    }
  };

  // Handle confirm payment
  const handleConfirmPayment = async (invoiceId: string) => {
    try {
      await updateInvoiceStatus(invoiceId, 'Đã thanh toán');
    } catch (error) {
      console.error('Error confirming payment:', error);
    }
  };

  // Handle cancel invoice
  const handleCancelInvoice = async (invoiceId: string) => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền hủy hóa đơn!');
      return;
    }

    try {
      await updateInvoiceStatus(invoiceId, 'Đã hủy');
    } catch (error) {
      console.error('Error cancelling invoice:', error);
    }
  };

  // Handle delete invoice
  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền xóa hóa đơn!');
      return;
    }

    try {
      await deleteInvoice(invoiceId);
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  };

  // Handle export data
  const handleExportData = () => {
    try {
      const csvContent = generateCSVContent(filteredInvoices);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `hoa-don-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Xuất dữ liệu thành công!');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Có lỗi xảy ra khi xuất dữ liệu');
    }
  };

  const generateCSVContent = (data: Invoice[]): string => {
    const headers = [
      'Mã hóa đơn', 'Ngày', 'Bàn', 'Khách hàng', 'Nhân viên',
      'Tổng tiền', 'VAT', 'Giảm giá', 'Thành tiền', 
      'Khách trả', 'Tiền thừa', 'Loại thanh toán', 'Trạng thái'
    ];

    const rows = data.map(invoice => [
      invoice.IDHOADON,
      new Date(invoice['Ngày']).toLocaleString('vi-VN'),
      invoice.IDBAN,
      invoice['Khách hàng'],
      invoice['Nhân viên'],
      invoice['Tổng tiền'],
      invoice['VAT'],
      invoice['Giảm giá'],
      invoice['Tổng tiền'] + invoice['VAT'] - invoice['Giảm giá'],
      invoice['Khách trả'],
      invoice['Tiền thừa'],
      invoice['Loại thanh toán'],
      invoice['Trạng thái']
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-4xl">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <FileText className="mr-2 h-6 w-6 text-blue-600" />
          Quản lý hóa đơn
        </h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => router.push('/receipt-settings')} 
            variant="outline"
            className="border-orange-200 text-orange-700 hover:bg-orange-50"
          >
            <Settings className="w-4 h-4 mr-2" />
            Cài đặt mẫu in
          </Button>
          <Button onClick={handleExportData} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Xuất dữ liệu
          </Button>
          <Button onClick={fetchInvoices} variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <InvoiceStatsComponent stats={stats} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
          <CardDescription>
            Tìm kiếm và lọc hóa đơn theo các tiêu chí
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Tìm kiếm hóa đơn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                {INVOICE_STATUS.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Loại thanh toán" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại thanh toán</SelectItem>
                {PAYMENT_METHODS.map(method => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DateRangePicker
              date={dateRange}
              onDateChange={setDateRange}
              placeholder="Chọn khoảng thời gian"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách hóa đơn ({filteredInvoices.length})</CardTitle>
          <CardDescription>
            Quản lý tất cả hóa đơn trong hệ thống của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceDataTable
            invoices={filteredInvoices}
            onViewDetails={handleViewDetails}
            onPrintInvoice={handlePrintInvoice}
            onConfirmPayment={handleConfirmPayment}
            onCancelInvoice={handleCancelInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            isAdmin={isAdmin}
            isManager={isManager}
          />
        </CardContent>
      </Card>

      {/* Details Modal */}
      <InvoiceDetailsModal
        invoice={selectedInvoice}
        details={selectedInvoice ? invoiceDetails.get(selectedInvoice.IDHOADON) || [] : []}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedInvoice(null);
        }}
        onPrint={() => selectedInvoice && handlePrintInvoice(selectedInvoice)}
      />
    </div>
  );
}