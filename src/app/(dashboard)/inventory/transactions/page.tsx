'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Plus, Filter, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useInventoryTransactions } from './hooks/useInventoryTransactions';
import { InventoryStatsComponent } from '@/app/(dashboard)/inventory/transactions/components/InventoryStats';
import { InventoryOverviewStats } from '@/app/(dashboard)/inventory/transactions/components/InventoryOverviewStats';
import { InventoryDataTable } from '@/app/(dashboard)/inventory/transactions/components/InventoryDataTable';
import { InventoryFormModal } from '@/app/(dashboard)/inventory/transactions/components/InventoryFormModal';
import { InventoryDetailsModal } from '@/app/(dashboard)/inventory/transactions/components/InventoryDetailsModal';
import { INVENTORY_TYPES, INVENTORY_STATUS } from '@/app/(dashboard)/inventory/transactions/utils/constants';
import type { InventoryTransaction, InventoryTransactionFormData } from './types/inventory';
import authUtils from '@/utils/authUtils';
import toast from 'react-hot-toast';
import { AIInventoryQuickModal } from '@/app/(dashboard)/menu/nguyenlieu/components/AIInventoryQuickModal';
import { ExportDropdownButton } from '@/components/ExportDropdownButton';

export default function InventoryTransactionsPage() {
  const router = useRouter();
  const {
    transactions,
    loading,
    stats,
    fetchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useInventoryTransactions();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [dateRange, setDateRange] = useState<any>(null);

  const [selectedTransaction, setSelectedTransaction] = useState<InventoryTransaction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAIQuickModalOpen, setIsAIQuickModalOpen] = useState(false);
  const [currentMaterials, setCurrentMaterials] = useState<any[]>([]);

  useEffect(() => {
    authUtils.getAllNguyenLieu().then((res) => {
      if (Array.isArray(res)) setCurrentMaterials(res);
    });
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch =
        !searchTerm ||
        transaction.IDGiaoDich.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.NhaCungCap || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.NhanVienThucHien || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.GhiChu || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' || transaction.LoaiGiaoDich === typeFilter;
      const matchesStatus = statusFilter === 'all' || transaction.TrangThai === statusFilter;
      const matchesSupplier = supplierFilter === 'all' || transaction.NhaCungCap === supplierFilter;

      const matchesDate =
        !dateRange ||
        (() => {
          const transactionDate = authUtils.parseFlexibleDate(transaction.NgayGiaoDich);
          if (!transactionDate) return true;
          return transactionDate >= dateRange.from && transactionDate <= dateRange.to;
        })();

      return matchesSearch && matchesType && matchesStatus && matchesSupplier && matchesDate;
    });
  }, [transactions, searchTerm, typeFilter, statusFilter, supplierFilter, dateRange]);

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

  const handleViewDetails = (transaction: InventoryTransaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  const handleEditTransaction = (transaction: InventoryTransaction) => {
    setSelectedTransaction(transaction);
    setIsEditing(true);
    setShowFormModal(true);
  };

  const handleAddTransaction = () => {
    setSelectedTransaction(null);
    setIsEditing(false);
    setShowFormModal(true);
  };

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

  const handleFormSubmit = async (formData: InventoryTransactionFormData) => {
    try {
      if (isEditing && selectedTransaction) {
        await updateTransaction(selectedTransaction.IDGiaoDich, formData);
        toast.success('Cập nhật giao dịch thành công!');
      } else {
        await addTransaction(formData);
        toast.success('Thêm giao dịch thành công!');
      }
      fetchTransactions();
    } catch (error) {
      console.error('Error submitting transaction form:', error);
      toast.error('Có lỗi xảy ra khi lưu giao dịch');
      throw error;
    }
  };

  const exportRows = useMemo(() => {
    return filteredTransactions.map((tx) => ({
      IDGiaoDich: tx.IDGiaoDich,
      LoaiGiaoDich: tx.LoaiGiaoDich,
      NgayGiaoDich: tx.NgayGiaoDich,
      NhaCungCap: tx.NhaCungCap || 'Nội bộ',
      NhanVienThucHien: tx.NhanVienThucHien,
      SoMatHang: Array.isArray(tx.ChiTiet) ? tx.ChiTiet.length : 0,
      ChiTietHang: Array.isArray(tx.ChiTiet)
        ? tx.ChiTiet.map((c) => `${c.TenNguyenLieu} (${c.SoLuong} ${c.DonViTinh})`).join(', ')
        : '',
      TongTien: Number(tx.TongTien) || 0,
      TrangThai: tx.TrangThai,
    }));
  }, [filteredTransactions]);

  const exportColumns = useMemo(
    () => [
      { key: 'IDGiaoDich', label: 'Mã phiếu', align: 'center' as const },
      { key: 'LoaiGiaoDich', label: 'Loại phiếu', align: 'center' as const },
      { key: 'NgayGiaoDich', label: 'Ngày giao dịch', align: 'center' as const },
      { key: 'NhaCungCap', label: 'Nhà cung cấp', align: 'left' as const },
      { key: 'NhanVienThucHien', label: 'Người thực hiện', align: 'left' as const },
      { key: 'ChiTietHang', label: 'Chi tiết mặt hàng', align: 'left' as const },
      { key: 'TongTien', label: 'Tổng tiền (VNĐ)', align: 'right' as const },
      { key: 'TrangThai', label: 'Trạng thái', align: 'center' as const },
    ],
    []
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
          <Truck className="mr-2 h-6 w-6 text-green-600" />
          Quản lý nhập/xuất kho
        </h1>
        <div className="flex flex-wrap gap-2">
          <ExportDropdownButton
            label="Xuất phiếu kho / In"
            title="BÁO CÁO GIAO DỊCH NHẬP - XUẤT KHO"
            subtitle={`Tổng số giao dịch: ${filteredTransactions.length} phiếu`}
            filename="Bao_Cao_Nhap_Xuat_Kho_H2MilkTea"
            columns={exportColumns}
            data={exportRows}
            summaryRows={[
              { label: 'Tổng giá trị nhập kho', value: `${stats.tongNhap.toLocaleString('vi-VN')} ₫` },
              { label: 'Tổng giá trị xuất kho', value: `${stats.tongXuat.toLocaleString('vi-VN')} ₫` },
            ]}
          />

          <Button onClick={fetchTransactions} variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Làm mới
          </Button>

          <Button
            type="button"
            onClick={() => setIsAIQuickModalOpen(true)}
            className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white font-semibold"
          >
            <Sparkles className="w-4 h-4 mr-1.5 text-yellow-300 animate-pulse" />
            Nhập/Xuất nhanh bằng AI ✨
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
          <CardDescription>Tìm kiếm và lọc giao dịch kho theo các tiêu chí</CardDescription>
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
                {INVENTORY_TYPES.map((type) => (
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
                {INVENTORY_STATUS.map((status) => (
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

      <AIInventoryQuickModal
        isOpen={isAIQuickModalOpen}
        onClose={() => setIsAIQuickModalOpen(false)}
        currentMaterials={currentMaterials}
        onSuccess={() => {
          fetchTransactions();
        }}
      />
    </div>
  );
}
