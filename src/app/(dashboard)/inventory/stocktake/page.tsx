'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useStocktake } from './hooks/useStocktake';
import { StocktakeStatsComponent } from './components/StocktakeStats';
import { StocktakeDataTable } from './components/StocktakeDataTable';
import { StocktakeFormModal } from './components/StocktakeFormModal';
import { StocktakeDetailsModal } from './components/StocktakeDetailsModal';
import { StocktakeAlerts } from './components/StocktakeAlerts';
import { STOCKTAKE_TYPES, STOCKTAKE_STATUS } from './utils/constants';
import type { Stocktake, StocktakeFormData } from './types/stocktake';
import authUtils from '@/utils/authUtils';
import toast from 'react-hot-toast';
import { ExportDropdownButton } from '@/components/ExportDropdownButton';

export default function StocktakePage() {
  const router = useRouter();
  const {
    stocktakes,
    alerts,
    loading,
    stats,
    fetchStocktakes,
    addStocktake,
    updateStocktake,
    deleteStocktake,
    markAlertAsRead,
    dismissAlert,
    dismissAllAlerts,
  } = useStocktake();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<any>(null);

  const [selectedStocktake, setSelectedStocktake] = useState<Stocktake | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const filteredStocktakes = useMemo(() => {
    return stocktakes.filter((stocktake) => {
      const matchesSearch =
        !searchTerm ||
        stocktake.IDKiemKe.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stocktake.NhanVienThucHien.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (stocktake.GhiChu || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' || stocktake.LoaiKiemKe === typeFilter;
      const matchesStatus = statusFilter === 'all' || stocktake.TrangThai === statusFilter;

      const matchesDate =
        !dateRange ||
        (() => {
          const stocktakeDate = authUtils.parseFlexibleDate(stocktake.NgayKiemKe);
          if (!stocktakeDate) return true;
          return stocktakeDate >= dateRange.from && stocktakeDate <= dateRange.to;
        })();

      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });
  }, [stocktakes, searchTerm, typeFilter, statusFilter, dateRange]);

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

  const handleViewDetails = (stocktake: Stocktake) => {
    setSelectedStocktake(stocktake);
    setShowDetailsModal(true);
  };

  const handleEditStocktake = (stocktake: Stocktake) => {
    setSelectedStocktake(stocktake);
    setIsEditing(true);
    setShowFormModal(true);
  };

  const handleAddStocktake = () => {
    setSelectedStocktake(null);
    setIsEditing(false);
    setShowFormModal(true);
  };

  const handleDeleteStocktake = async (stocktakeId: string) => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền xóa kiểm kê!');
      return;
    }

    try {
      await deleteStocktake(stocktakeId);
      toast.success('Xóa kiểm kê thành công!');
    } catch (error) {
      console.error('Error deleting stocktake:', error);
      toast.error('Có lỗi xảy ra khi xóa kiểm kê');
    }
  };

  const handleFormSubmit = async (formData: StocktakeFormData) => {
    try {
      if (isEditing && selectedStocktake) {
        await updateStocktake(selectedStocktake.IDKiemKe, formData);
        toast.success('Cập nhật kiểm kê thành công!');
      } else {
        await addStocktake(formData);
        toast.success('Thêm kiểm kê thành công!');
      }
      fetchStocktakes();
    } catch (error) {
      console.error('Error submitting stocktake form:', error);
      toast.error('Có lỗi xảy ra khi lưu kiểm kê');
      throw error;
    }
  };

  const exportRows = useMemo(() => {
    return filteredStocktakes.map((st) => ({
      IDKiemKe: st.IDKiemKe,
      NgayKiemKe: st.NgayKiemKe,
      LoaiKiemKe: st.LoaiKiemKe,
      NhanVienThucHien: st.NhanVienThucHien,
      TongMatHang: st.TongMatHang,
      TongGiaTri: Number(st.TongGiaTri) || 0,
      ChenhLech: (st.ChiTiet || []).reduce(
        (sum, c) => sum + (Number(c.GiaTriChenhLech) || 0),
        0
      ),
      TrangThai: st.TrangThai,
      GhiChu: st.GhiChu || '',
    }));
  }, [filteredStocktakes]);

  const exportColumns = useMemo(
    () => [
      { key: 'IDKiemKe', label: 'Mã phiếu KK', align: 'center' as const },
      { key: 'NgayKiemKe', label: 'Ngày kiểm kê', align: 'center' as const },
      { key: 'LoaiKiemKe', label: 'Loại kiểm kê', align: 'center' as const },
      { key: 'NhanVienThucHien', label: 'Nhân viên thực hiện', align: 'left' as const },
      { key: 'TongMatHang', label: 'Số mặt hàng', align: 'center' as const },
      { key: 'TongGiaTri', label: 'Tổng giá trị (VNĐ)', align: 'right' as const },
      { key: 'ChenhLech', label: 'Giá trị chênh lệch (VNĐ)', align: 'right' as const },
      { key: 'TrangThai', label: 'Trạng thái', align: 'center' as const },
      { key: 'GhiChu', label: 'Ghi chú', align: 'left' as const },
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
          <ClipboardList className="mr-2 h-6 w-6 text-orange-600" />
          Quản lý kiểm kê kho
        </h1>
        <div className="flex flex-wrap gap-2">
          <ExportDropdownButton
            label="Xuất phiếu kiểm kê / In"
            title="BIÊN BẢN TỔNG HỢP KIỂM KÊ KHO NGUYÊN VẬT LIỆU"
            subtitle={`Tổng số đợt kiểm kê: ${filteredStocktakes.length}`}
            filename="Bien_Ban_Kiem_Ke_Kho_H2MilkTea"
            columns={exportColumns}
            data={exportRows}
            summaryRows={[
              { label: 'Tổng đợt kiểm kê', value: `${stats.TongKiemKe} đợt` },
              { label: 'Tỷ lệ chính xác kho', value: `${stats.TyLeChinhXac}%` },
              {
                label: 'Tổng giá trị tồn kho kiểm kê',
                value: `${stats.GiaTriTonKho.toLocaleString('vi-VN')} ₫`,
              },
            ]}
          />

          <Button onClick={fetchStocktakes} variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Làm mới
          </Button>
          <Button onClick={handleAddStocktake} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" />
            Thêm kiểm kê
          </Button>
        </div>
      </div>

      {/* Alerts (Fixed 1.g) */}
      {alerts.length > 0 && (
        <StocktakeAlerts
          alerts={alerts}
          onMarkAsRead={markAlertAsRead}
          onDismiss={dismissAlert}
          onDismissAll={dismissAllAlerts}
        />
      )}

      {/* Statistics */}
      <StocktakeStatsComponent stats={stats} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
          <CardDescription>Tìm kiếm và lọc kiểm kê kho theo các tiêu chí</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Tìm kiếm kiểm kê..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Loại kiểm kê" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                {STOCKTAKE_TYPES.map((type) => (
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
                {STOCKTAKE_STATUS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
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
          <CardTitle>Danh sách kiểm kê kho ({filteredStocktakes.length})</CardTitle>
          <CardDescription>Quản lý tất cả đợt kiểm kê kho trong hệ thống.</CardDescription>
        </CardHeader>
        <CardContent>
          <StocktakeDataTable
            stocktakes={filteredStocktakes}
            onViewDetails={handleViewDetails}
            onEditStocktake={handleEditStocktake}
            onDeleteStocktake={handleDeleteStocktake}
            isAdmin={isAdmin}
            isManager={isManager}
          />
        </CardContent>
      </Card>

      <StocktakeDetailsModal
        stocktake={selectedStocktake}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedStocktake(null);
        }}
        onEdit={() => {
          setShowDetailsModal(false);
          setIsEditing(true);
          setShowFormModal(true);
        }}
      />

      <StocktakeFormModal
        stocktake={selectedStocktake}
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setSelectedStocktake(null);
          setIsEditing(false);
        }}
        onSubmit={handleFormSubmit}
        isEditing={isEditing}
      />
    </div>
  );
}
