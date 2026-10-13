'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Plus, Filter, Download, Search, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { useInventoryTransactions } from './hooks/useInventoryTransactions';
import { InventoryStatsComponent } from '@/app/(dashboard)/inventory/transactions/components/InventoryStats';
import { InventoryOverviewStats } from '@/app/(dashboard)/inventory/transactions/components/InventoryOverviewStats';
import { InventoryDataTable } from '@/app/(dashboard)/inventory/transactions/components/InventoryDataTable';
import { InventoryFormModal } from '@/app/(dashboard)/inventory/transactions/components/InventoryFormModal';
import { InventoryDetailsModal } from '@/app/(dashboard)/inventory/transactions/components/InventoryDetailsModal';
import { INVENTORY_TYPES, INVENTORY_STATUS } from '@/app/(dashboard)/inventory/transactions/utils/constants';
import { exportInventoryData } from '@/app/(dashboard)/inventory/transactions/utils/formatters';
import type { InventoryTransaction, InventoryTransactionFormData } from './types/inventory';
import authUtils from '@/utils/authUtils';
import toast from 'react-hot-toast';

export default function InventoryTransactionsPage() {
  const router = useRouter();
  const {
    transactions,
    loading,
    stats,
    fetchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction
  } = useInventoryTransactions();

  // User permissions
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [dateRange, setDateRange] = useState<any>(null);

  // Modal states
  const [selectedTransaction, setSelectedTransaction] = useState<InventoryTransaction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Filtered transactions
  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(transaction => {
      const matchesSearch = !searchTerm || 
        transaction.IDGiaoDich.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.NhaCungCap.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.NhanVienThucHien.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.GhiChu.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' || 
        transaction.LoaiGiaoDich === typeFilter;

      const matchesStatus = statusFilter === 'all' || 
        transaction.TrangThai === statusFilter;

      const matchesSupplier = supplierFilter === 'all' || 
        transaction.NhaCungCap === supplierFilter;

      const matchesDate = !dateRange || (() => {
        const transactionDate = new Date(transaction.NgayGiaoDich);
        return transactionDate >= dateRange.from && transactionDate <= dateRange.to;
      })();

      return matchesSearch && matchesType && matchesStatus && matchesSupplier && matchesDate;
    });
  }, [transactions, searchTerm, typeFilter, statusFilter, supplierFilter, dateRange]);

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

  // Handle view transaction details
  const handleViewDetails = (transaction: InventoryTransaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  // Handle edit transaction
  const handleEditTransaction = (transaction: InventoryTransaction) => {
    setSelectedTransaction(transaction);
    setIsEditing(true);
    setShowFormModal(true);
  };

  // Handle add new transaction
  const handleAddTransaction = () => {
    setSelectedTransaction(null);
    setIsEditing(false);
    setShowFormModal(true);
  };

  // Handle delete transaction
  const handleDeleteTransaction = async (transactionId: string) => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền xóa giao dịch kho!');
      return;
    }

    try {
      await deleteTransaction(transactionId);
      toast.success('Xóa giao dịch thành công!');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Có lỗi xảy ra khi xóa giao dịch');
    }
  };

  // Handle form submit
  const handleFormSubmit = async (formData: InventoryTransactionFormData) => {
    try {
      if (isEditing && selectedTransaction) {
        await updateTransaction(selectedTransaction.IDGiaoDich, formData);
        toast.success('Cập nhật giao dịch thành công!');
      } else {
        await addTransaction(formData);
        toast.success('Thêm giao dịch thành công!');
      }
      fetchTransactions(); // Refresh data
    } catch (error) {
      console.error('Error submitting transaction form:', error);
      toast.error('Có lỗi xảy ra khi lưu giao dịch');
      throw error;
    }
  };

  // Handle export data
  const handleExportData = () => {
    try {
      const exportData = exportInventoryData(filteredTransactions);
      const csvContent = generateCSVContent(exportData);
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `nhap-xuat-kho-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Xuất dữ liệu thành công!');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Có lỗi xảy ra khi xuất dữ liệu');
    }
  };

  const generateCSVContent = (data: any[]): string => {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const rows = data.map(row => {
      return headers.map(header => {
        let value = row[header];
        if (value === null || value === undefined) value = '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
      }).join(',');
    });

    return [csvHeaders, ...rows].join('\n');
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
          <Truck className="mr-2 h-6 w-6 text-green-600" />
          Quản lý nhập/xuất kho
        </h1>
        <div className="flex gap-2">
          <Button onClick={handleExportData} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Xuất dữ liệu
          </Button>
          <Button onClick={fetchTransactions} variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Làm mới
          </Button>
          <Button onClick={handleAddTransaction} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Thêm giao dịch
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <InventoryStatsComponent stats={stats} />

      {/* Overview Statistics */}
      <InventoryOverviewStats stats={stats} loading={loading} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
          <CardDescription>
            Tìm kiếm và lọc giao dịch kho theo các tiêu chí
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              placeholder="Tìm kiếm giao dịch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Loại giao dịch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                {INVENTORY_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                {INVENTORY_STATUS.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Nhà cung cấp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả nhà cung cấp</SelectItem>
                {/* Add supplier options here */}
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
          <CardTitle>Danh sách giao dịch kho ({filteredTransactions.length})</CardTitle>
          <CardDescription>
            Quản lý tất cả giao dịch nhập/xuất kho trong hệ thống.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InventoryDataTable
            transactions={filteredTransactions}
            onViewDetails={handleViewDetails}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            isAdmin={isAdmin}
            isManager={isManager}
          />
        </CardContent>
      </Card>

      {/* Details Modal */}
      <InventoryDetailsModal
        transaction={selectedTransaction}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedTransaction(null);
        }}
        onEdit={() => {
          setShowDetailsModal(false);
          setIsEditing(true);
          setShowFormModal(true);
        }}
      />

      {/* Form Modal */}
      <InventoryFormModal
        transaction={selectedTransaction}
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setSelectedTransaction(null);
          setIsEditing(false);
        }}
        onSubmit={handleFormSubmit}
        isEditing={isEditing}
      />
    </div>
  );
} 