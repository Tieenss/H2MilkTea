'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Filter, Settings, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useInvoices } from './hooks/useInvoices';
import { InvoiceStatsComponent } from './components/InvoiceStats';
import { InvoiceDataTable } from './components/InvoiceDataTable';
import { InvoiceDetailsModal } from './components/InvoiceDetailsModal';
import { CancelInvoiceModal } from './components/CancelInvoiceModal';
import { printReceipt } from './utils/invoicePrint';
import { INVOICE_STATUS, PAYMENT_METHODS } from './utils/invoiceConstants';
import type { Invoice } from './types/invoice';
import authUtils from '@/utils/authUtils';
import toast from 'react-hot-toast';
import { ExportDropdownButton } from '@/components/ExportDropdownButton';
import { useTodayOrdersContext } from '@/context/TodayOrdersContext';

export default function InvoiceManagementPage() {
  const router = useRouter();
  const { markOrdersAsRead, unreadOrdersCount } = useTodayOrdersContext();
  const {
    invoices,
    invoiceDetails,
    loading,
    stats,
    fetchInvoices,
    fetchInvoiceDetails,
    updateInvoiceStatus,
    settleInvoiceDebt,
    deleteInvoice,
  } = useInvoices();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateRange, setDateRange] = useState<any>(null);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [cancelModalInvoice, setCancelModalInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const id = String(invoice.IDHOADON || (invoice as any).IDHD || '').toLowerCase();
      const customer = String(invoice['Khách hàng'] || '').toLowerCase();
      const staff = String(invoice['Nhân viên'] || (invoice as any)['Thu ngân'] || '').toLowerCase();
      const table = String(invoice.IDBAN || (invoice as any)['Bàn'] || '').toLowerCase();
      const q = searchTerm.toLowerCase();

      const matchesSearch =
        !searchTerm ||
        id.includes(q) ||
        customer.includes(q) ||
        staff.includes(q) ||
        table.includes(q);

      const matchesStatus = statusFilter === 'all' || invoice['Trạng thái'] === statusFilter;
      const matchesPayment =
        paymentFilter === 'all' || invoice['Loại thanh toán'] === paymentFilter;

      const matchesDate =
        !dateRange ||
        (() => {
          const d = authUtils.parseFlexibleDate(invoice['Ngày'] || (invoice as any)['Thời gian']);
          if (!d) return true;
          return d >= dateRange.from && d <= dateRange.to;
        })();

      return matchesSearch && matchesStatus && matchesPayment && matchesDate;
    });
  }, [invoices, searchTerm, statusFilter, paymentFilter, dateRange]);

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

    // Khi người dùng vào trang Đơn hàng, tự động đánh dấu đã xem tất cả đơn hiện tại
    markOrdersAsRead();
  }, [router, markOrdersAsRead]);

  // Đánh dấu đã xem khi danh sách hóa đơn hoàn tất tải
  useEffect(() => {
    if (invoices.length > 0) {
      markOrdersAsRead();
    }
  }, [invoices.length, markOrdersAsRead]);

  const handleViewDetails = async (invoice: Invoice) => {
    try {
      await fetchInvoiceDetails(invoice.IDHOADON);
      setSelectedInvoice(invoice);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
    }
  };

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

  const handleConfirmPayment = async (invoiceId: string) => {
    try {
      await updateInvoiceStatus(invoiceId, 'Đã thanh toán');
    } catch (error) {
      console.error('Error confirming payment:', error);
    }
  };

  const handleRequestCancel = (invoice: Invoice) => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền hủy hoặc xóa hóa đơn!');
      return;
    }
    setCancelModalInvoice(invoice);
  };

  const handleConfirmCancel = async (invoiceId: string, reason: string, staffName: string) => {
    try {
      await deleteInvoice(invoiceId, reason, staffName);
      setCancelModalInvoice(null);
    } catch (error) {
      console.error('Error cancelling invoice:', error);
    }
  };

  const exportRows = useMemo(() => {
    return filteredInvoices.map((inv) => {
      const total = Number(inv['Tổng tiền']) || 0;
      const vat = Number(inv['VAT']) || 0;
      const discount = Number(inv['Giảm giá']) || 0;
      const net = Math.max(0, total + vat - discount);
      const parsedDate = authUtils.parseFlexibleDate(inv['Ngày']);
      return {
        IDHOADON: inv.IDHOADON,
        Ngay: parsedDate ? parsedDate.toLocaleString('vi-VN') : inv['Ngày'],
        IDBAN: inv.IDBAN || 'Khách mua về',
        KhachHang: inv['Khách hàng'] || 'Khách lẻ',
        NhanVien: inv['Nhân viên'] || 'Thu ngân',
        TongTien: total,
        GiamGia: discount,
        ThanhTien: net,
        LoaiThanhToan: inv['Loại thanh toán'] || 'Tiền mặt',
        TrangThai: inv['Trạng thái'] || 'Đã thanh toán',
      };
    });
  }, [filteredInvoices]);

  const exportColumns = useMemo(
    () => [
      { key: 'IDHOADON', label: 'Mã hóa đơn', align: 'center' as const },
      { key: 'Ngay', label: 'Ngày giờ', align: 'center' as const },
      { key: 'IDBAN', label: 'Bàn', align: 'center' as const },
      { key: 'KhachHang', label: 'Khách hàng', align: 'left' as const },
      { key: 'NhanVien', label: 'Nhân viên', align: 'left' as const },
      { key: 'TongTien', label: 'Tổng tiền (VNĐ)', align: 'right' as const },
      { key: 'GiamGia', label: 'Giảm giá (VNĐ)', align: 'right' as const },
      { key: 'ThanhTien', label: 'Thực thu (VNĐ)', align: 'right' as const },
      { key: 'LoaiThanhToan', label: 'Thanh toán', align: 'center' as const },
      { key: 'TrangThai', label: 'Trạng thái', align: 'center' as const },
    ],
    []
  );

  const totalNetRevenue = useMemo(
    () => exportRows.reduce((sum, r) => sum + r.ThanhTien, 0),
    [exportRows]
  );

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
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <FileText className="mr-2 h-6 w-6 text-blue-600" />
          Quản lý hóa đơn
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => router.push('/receipt-settings')}
            variant="outline"
            size="sm"
            className="border-orange-200 text-orange-700 hover:bg-orange-50"
          >
            <Settings className="w-4 h-4 mr-2" />
            Cài đặt mẫu in
          </Button>

          <ExportDropdownButton
            label="Xuất hóa đơn / In"
            title="BẢNG KÊ CHI TIẾT HÓA ĐƠN BÁN HÀNG"
            subtitle={`Tổng số hóa đơn: ${filteredInvoices.length}`}
            filename="Bang_Ke_Hoa_Don_H2MilkTea"
            columns={exportColumns}
            data={exportRows}
            summaryRows={[
              { label: 'Tổng số hóa đơn', value: `${filteredInvoices.length} đơn` },
              {
                label: 'Tổng doanh thu thực thu',
                value: `${totalNetRevenue.toLocaleString('vi-VN')} ₫`,
              },
            ]}
          />

          <Button
            onClick={() => {
              markOrdersAsRead();
              toast.success('Đã đánh dấu đã xem tất cả đơn hàng!');
            }}
            variant="outline"
            size="sm"
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Đã xem tất cả
          </Button>

          <Button onClick={fetchInvoices} variant="outline" size="sm">
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
          <CardDescription>Tìm kiếm và lọc hóa đơn theo các tiêu chí</CardDescription>
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
                {INVOICE_STATUS.map((status) => (
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
                {PAYMENT_METHODS.map((method) => (
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
            onCancelInvoice={handleRequestCancel}
            onDeleteInvoice={handleRequestCancel}
            isAdmin={isAdmin}
            isManager={isManager}
          />
        </CardContent>
      </Card>

      {/* Cancel / Anti-loss Audit Modal */}
      <CancelInvoiceModal
        isOpen={!!cancelModalInvoice}
        invoice={cancelModalInvoice}
        onClose={() => setCancelModalInvoice(null)}
        onConfirm={handleConfirmCancel}
        currentStaffName={authUtils.getUserData()?.['Họ và Tên'] || authUtils.getUserData()?.username || 'Quản lý'}
      />

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
        onSettleInvoiceDebt={async (inv) => {
          await settleInvoiceDebt(inv.IDHOADON);
          setShowDetailsModal(false);
          setSelectedInvoice(null);
        }}
      />
    </div>
  );
}
