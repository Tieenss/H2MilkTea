'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Filter, Download, Search, Star, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useSuppliers } from './hooks/useSuppliers';
import { SupplierStatsComponent } from './components/SupplierStats';
import { SupplierDataTable } from './components/SupplierDataTable';
import { SupplierFormModal } from './components/SupplierFormModal';
import { SupplierDetailsModal } from './components/SupplierDetailsModal';
import { SUPPLIER_STATUS, SUPPLIER_RATINGS } from './utils/constants';
import { exportSupplierData } from './utils/formatters';
import type { Supplier, SupplierFormData } from './types/supplier';
import authUtils from '@/utils/authUtils';
import toast from 'react-hot-toast';

export default function SuppliersPage() {
  const router = useRouter();
  const {
    suppliers,
    loading,
    stats,
    fetchSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier
  } = useSuppliers();

  // User permissions
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');

  // Modal states
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Filtered suppliers
  const filteredSuppliers = React.useMemo(() => {
    return suppliers.filter(supplier => {
      const matchesSearch = !searchTerm || 
        supplier.TenNhaCungCap.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.MaSoThue.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.NguoiDaiDien.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.Email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || 
        supplier.TrangThai === statusFilter;

      const matchesRating = ratingFilter === 'all' || (() => {
        const rating = parseFloat(ratingFilter);
        return supplier.DanhGia >= rating && supplier.DanhGia < rating + 1;
      })();

      return matchesSearch && matchesStatus && matchesRating;
    });
  }, [suppliers, searchTerm, statusFilter, ratingFilter]);

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

  // Handle view supplier details
  const handleViewDetails = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailsModal(true);
  };

  // Handle edit supplier
  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsEditing(true);
    setShowFormModal(true);
  };

  // Handle add supplier
  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setIsEditing(false);
    setShowFormModal(true);
  };

  // Handle delete supplier
  const handleDeleteSupplier = async (supplierId: string) => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền xóa nhà cung cấp');
      return;
    }

    if (confirm('Bạn có chắc chắn muốn xóa nhà cung cấp này?')) {
      try {
        await deleteSupplier(supplierId);
        toast.success('Xóa nhà cung cấp thành công');
      } catch (error) {
        toast.error('Lỗi khi xóa nhà cung cấp');
      }
    }
  };

  // Handle form submit
  const handleFormSubmit = async (formData: SupplierFormData) => {
    try {
      if (isEditing && selectedSupplier) {
        await updateSupplier(selectedSupplier.IDNhaCungCap, formData);
        toast.success('Cập nhật nhà cung cấp thành công');
      } else {
        await addSupplier(formData);
        toast.success('Thêm nhà cung cấp thành công');
      }
      setShowFormModal(false);
    } catch (error) {
      toast.error('Lỗi khi lưu nhà cung cấp');
    }
  };

  // Handle export data
  const handleExportData = () => {
    try {
      exportSupplierData(filteredSuppliers);
      toast.success('Xuất dữ liệu thành công');
    } catch (error) {
      toast.error('Lỗi khi xuất dữ liệu');
    }
  };

  // Generate CSV content
  const generateCSVContent = (data: any[]): string => {
    const headers = [
      'ID Nhà cung cấp',
      'Tên nhà cung cấp',
      'Mã số thuế',
      'Địa chỉ',
      'Số điện thoại',
      'Email',
      'Người đại diện',
      'SĐT liên hệ',
      'Email liên hệ',
      'Ngày hợp tác',
      'Trạng thái',
      'Đánh giá',
      'Thời gian giao hàng',
      'Phương thức thanh toán',
      'Ghi chú'
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(supplier => [
        supplier.IDNhaCungCap,
        `"${supplier.TenNhaCungCap}"`,
        supplier.MaSoThue,
        `"${supplier.DiaChi}"`,
        supplier.SoDienThoai,
        supplier.Email,
        `"${supplier.NguoiDaiDien}"`,
        supplier.SoDienThoaiLienHe,
        supplier.EmailLienHe,
        supplier.NgayHopTac,
        supplier.TrangThai,
        supplier.DanhGia,
        supplier.ThoiGianGiaoHang,
        supplier.PhuongThucThanhToan,
        `"${supplier.GhiChu}"`
      ].join(','))
    ].join('\n');

    return csvContent;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý Nhà cung cấp</h1>
          <p className="text-muted-foreground">
            Quản lý thông tin nhà cung cấp và lịch sử đặt hàng
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Xuất dữ liệu
          </Button>
          {(isAdmin || isManager) && (
            <Button onClick={handleAddSupplier}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm nhà cung cấp
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <SupplierStatsComponent stats={stats} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Bộ lọc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên, MST, người đại diện..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trạng thái</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {SUPPLIER_STATUS.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Đánh giá</label>
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả đánh giá" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả đánh giá</SelectItem>
                  {SUPPLIER_RATINGS.map(rating => (
                    <SelectItem key={rating.value} value={rating.value}>
                      {rating.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kết quả</label>
              <div className="text-sm text-muted-foreground">
                {filteredSuppliers.length} nhà cung cấp
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách Nhà cung cấp</CardTitle>
          <CardDescription>
            Quản lý thông tin chi tiết của các nhà cung cấp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupplierDataTable
            suppliers={filteredSuppliers}
            loading={loading}
            onViewDetails={handleViewDetails}
            onEdit={handleEditSupplier}
            onDelete={handleDeleteSupplier}
            canEdit={isAdmin || isManager}
            canDelete={isAdmin || isManager}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      {showFormModal && (
        <SupplierFormModal
          supplier={selectedSupplier}
          isOpen={showFormModal}
          onClose={() => setShowFormModal(false)}
          onSubmit={handleFormSubmit}
          isEditing={isEditing}
        />
      )}

      {showDetailsModal && selectedSupplier && (
        <SupplierDetailsModal
          supplier={selectedSupplier}
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          onEdit={() => {
            setShowDetailsModal(false);
            handleEditSupplier(selectedSupplier);
          }}
          canEdit={isAdmin || isManager}
        />
      )}
    </div>
  );
} 