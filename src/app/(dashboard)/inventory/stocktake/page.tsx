'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Plus, Filter, Download, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { useStocktake } from './hooks/useStocktake';
import { StocktakeStatsComponent } from './components/StocktakeStats';
import { StocktakeDataTable } from './components/StocktakeDataTable';
import { StocktakeFormModal } from './components/StocktakeFormModal';
import { StocktakeDetailsModal } from './components/StocktakeDetailsModal';
import { StocktakeAlerts } from './components/StocktakeAlerts';
import { STOCKTAKE_TYPES, STOCKTAKE_STATUS } from './utils/constants';
import { exportStocktakeData } from './utils/formatters';
import type { Stocktake, StocktakeFormData } from './types/stocktake';
import authUtils from '@/utils/authUtils';
import toast from 'react-hot-toast';

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
    markAlertAsRead
  } = useStocktake();

  // User permissions
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<any>(null);

  // Modal states
  const [selectedStocktake, setSelectedStocktake] = useState<Stocktake | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Filtered stocktakes
  const filteredStocktakes = React.useMemo(() => {
    return stocktakes.filter(stocktake => {
      const matchesSearch = !searchTerm || 
        stocktake.IDKiemKe.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stocktake.NhanVienThucHien.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stocktake.GhiChu.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' || 
        stocktake.LoaiKiemKe === typeFilter;

      const matchesStatus = statusFilter === 'all' || 
        stocktake.TrangThai === statusFilter;

      const matchesDate = !dateRange || (() => {
        const stocktakeDate = new Date(stocktake.NgayKiemKe);
        return stocktakeDate >= dateRange.from && stocktakeDate <= dateRange.to;
      })();

      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });
  }, [stocktakes, searchTerm, typeFilter, statusFilter, dateRange]);

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

  // Handle view stocktake details
  const handleViewDetails = (stocktake: Stocktake) => {
    setSelectedStocktake(stocktake);
    setShowDetailsModal(true);
  };

  // Handle edit stocktake
  const handleEditStocktake = (stocktake: Stocktake) => {
    setSelectedStocktake(stocktake);
    setIsEditing(true);
    setShowFormModal(true);
  };

  // Handle add new stocktake
  const handleAddStocktake = () => {
    setSelectedStocktake(null);
    setIsEditing(false);
    setShowFormModal(true);
  };

  // Handle delete stocktake
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

  // Handle form submit
  const handleFormSubmit = async (formData: StocktakeFormData) => {
    try {
      if (isEditing && selectedStocktake) {
        await updateStocktake(selectedStocktake.IDKiemKe, formData);
        toast.success('Cập nhật kiểm kê thành công!');
      } else {
        await addStocktake(formData);
        toast.success('Thêm kiểm kê thành công!');
      }
      fetchStocktakes(); // Refresh data
    } catch (error) {
      console.error('Error submitting stocktake form:', error);
      toast.error('Có lỗi xảy ra khi lưu kiểm kê');
      throw error;
    }
  };

  // Handle export data
  const handleExportData = () => {
    try {
      const exportData = exportStocktakeData(filteredStocktakes);
      const csvContent = generateCSVContent(exportData);
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `kiem-ke-kho-${new Date().toISOString().split('T')[0]}.csv`);
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
          <ClipboardList className="mr-2 h-6 w-6 text-orange-600" />
          Quản lý kiểm kê kho
        </h1>
        <div className="flex gap-2">
          <Button onClick={handleExportData} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Xuất dữ liệu
          </Button>
          <Button onClick={fetchStocktakes} variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Làm mới
          </Button>
          <Button onClick={handleAddStocktake} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" />
            Thêm kiểm kê
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <StocktakeAlerts alerts={alerts} onMarkAsRead={markAlertAsRead} />
      )}

      {/* Statistics */}
      <StocktakeStatsComponent stats={stats} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
          <CardDescription>
            Tìm kiếm và lọc kiểm kê kho theo các tiêu chí
          </CardDescription>
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
                {STOCKTAKE_TYPES.map(type => (
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
                {STOCKTAKE_STATUS.map(status => (
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
          <CardDescription>
            Quản lý tất cả đợt kiểm kê kho trong hệ thống.
          </CardDescription>
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

      {/* Details Modal */}
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

      {/* Form Modal */}
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