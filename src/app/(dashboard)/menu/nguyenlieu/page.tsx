'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Plus, Copy, Eye, Calculator, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMaterials } from './hooks/useMaterials';
import { useMaterialInventory } from './hooks/useMaterialInventory';
import { MaterialStats } from './components/MaterialStats';
import { MaterialInventoryStats } from './components/MaterialInventoryStats';
import { DataTable } from './components/DataTable';
import { MaterialForm } from './components/MaterialForm';
import { getColumns } from './utils/columns';
import type { Material, MaterialFormData } from './types/material';
import { INITIAL_MATERIAL_FORM_DATA } from './utils/constants';
import authUtils from '@/utils/authUtils';
import toast from 'react-hot-toast';
import { ImportModal } from './components/ImportModal';
import { formatNumber } from './utils/formatters';
import { AIInventoryQuickModal } from './components/AIInventoryQuickModal';
import { ExportDropdownButton } from '@/components/ExportDropdownButton';

export default function MaterialPage() {
  const router = useRouter();
  const {
    materials,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addMultipleMaterials,
    generateMaterialId,
    refreshMaterials,
    loading,
  } = useMaterials();

  const { inventoryStats, loading: inventoryLoading, refreshStats } = useMaterialInventory();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState<MaterialFormData>(INITIAL_MATERIAL_FORM_DATA);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAIQuickModalOpen, setIsAIQuickModalOpen] = useState(false);

  React.useEffect(() => {
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

  const resetForm = () => {
    setFormData(INITIAL_MATERIAL_FORM_DATA);
    setEditingMaterial(null);
    setIsDialogOpen(false);
  };

  const handleAddNew = () => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền thực hiện chức năng này!');
      return;
    }
    setEditingMaterial(null);
    const newFormData = {
      ...INITIAL_MATERIAL_FORM_DATA,
      IDNguyenLieu: generateMaterialId(),
    };
    setFormData(newFormData);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: MaterialFormData) => {
    try {
      if (editingMaterial) {
        await updateMaterial(editingMaterial.IDNguyenLieu, data);
      } else {
        await addMaterial(data);
      }
      refreshStats();
      resetForm();
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const handleEdit = (material: Material) => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền thực hiện chức năng này!');
      return;
    }

    setEditingMaterial(material);
    setFormData({
      IDNguyenLieu: material.IDNguyenLieu || '',
      'Tên nguyên liệu': material['Tên nguyên liệu'] || '',
      'Đơn vị tính': material['Đơn vị tính'] || 'Kg',
      'Đơn vị cơ sở': material['Đơn vị cơ sở'] || 'Gram',
      'Hệ số quy đổi': material['Hệ số quy đổi'] || 1000,
      'Ghi chú': material['Ghi chú'] || '',
      'Số lượng cảnh báo': material['Số lượng cảnh báo'] || 0,
    });
    setIsDialogOpen(true);
  };

  const handleView = (material: Material) => {
    setViewingMaterial(material);
    setIsViewDialogOpen(true);
  };

  const handleCopy = (material: Material) => {
    const newFormData = {
      ...material,
      IDNguyenLieu: generateMaterialId(),
      'Tên nguyên liệu': material['Tên nguyên liệu'] + ' (Copy)',
    };
    setEditingMaterial(null);
    setFormData(newFormData);
    setIsDialogOpen(true);
    setIsViewDialogOpen(false);
  };

  const handleDelete = (material: Material) => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền xóa nguyên vật liệu!');
      return;
    }

    deleteMaterial(material.IDNguyenLieu);
    refreshStats();
  };

  const handleImportExcel = () => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền import dữ liệu!');
      return;
    }

    setIsImportModalOpen(true);
  };

  const handleImportConfirm = async (data: any[]) => {
    const materialsData: MaterialFormData[] = data.map((row) => ({
      IDNguyenLieu: '',
      'Tên nguyên liệu': row['Tên nguyên liệu'],
      'Đơn vị tính': row['Đơn vị tính'],
      'Đơn vị cơ sở': row['Đơn vị cơ sở'] || 'Gram',
      'Hệ số quy đổi': Number(row['Hệ số quy đổi']) || 1,
      'Ghi chú': row['Ghi chú'] || '',
      'Số lượng cảnh báo': Number(row['Số lượng cảnh báo']) || 0,
    }));

    const success = await addMultipleMaterials(materialsData);
    if (success) {
      setIsImportModalOpen(false);
      refreshStats();
    }
  };

  const columns = useMemo(
    () =>
      getColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        onCopy: handleCopy,
        onView: handleView,
        isAdmin,
        isManager,
      }),
    [handleEdit, handleDelete, handleCopy, handleView, isAdmin, isManager]
  );

  const unitsList = useMemo(
    () => Array.from(new Set(materials.map((m) => m['Đơn vị tính']).filter(Boolean))),
    [materials]
  );

  // Dữ liệu xuất hợp nhất cả danh mục và tồn kho thực tế
  const exportData = useMemo(() => {
    const invMap = new Map(inventoryStats.map((s) => [s.IDNguyenLieu, s]));
    return materials.map((m) => {
      const st = invMap.get(m.IDNguyenLieu);
      return {
        IDNguyenLieu: m.IDNguyenLieu,
        'Tên nguyên liệu': m['Tên nguyên liệu'],
        'Đơn vị tính': m['Đơn vị tính'],
        'Số lượng nhập': st?.['Số lượng nhập'] ?? 0,
        'Số lượng bán': st?.['Số lượng bán'] ?? 0,
        'Số lượng tồn': st?.['Số lượng tồn'] ?? 0,
        'Số lượng cảnh báo': Number(m['Số lượng cảnh báo']) || 0,
        'Đơn vị cơ sở': m['Đơn vị cơ sở'] || '',
        'Hệ số quy đổi': Number(m['Hệ số quy đổi']) || 1,
      };
    });
  }, [materials, inventoryStats]);

  const exportColumns = useMemo(
    () => [
      { key: 'IDNguyenLieu', label: 'Mã NVL', align: 'center' as const },
      { key: 'Tên nguyên liệu', label: 'Tên nguyên vật liệu', align: 'left' as const },
      { key: 'Đơn vị tính', label: 'ĐVT', align: 'center' as const },
      { key: 'Số lượng nhập', label: 'Tổng nhập', align: 'right' as const },
      { key: 'Số lượng bán', label: 'Đã xuất/bán', align: 'right' as const },
      { key: 'Số lượng tồn', label: 'Tồn hiện tại', align: 'right' as const },
      { key: 'Số lượng cảnh báo', label: 'Mức cảnh báo', align: 'right' as const },
      { key: 'Đơn vị cơ sở', label: 'ĐV cơ sở', align: 'center' as const },
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
        <h3 className="text-3xl font-bold text-gray-800 flex items-center">
          <Package className="mr-2 h-6 w-6 text-green-600" />
          Quản lý nguyên vật liệu
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <ExportDropdownButton
            label="Xuất tồn kho / In"
            title="DANH MỤC & TỒN KHO NGUYÊN VẬT LIỆU"
            subtitle={`Tổng số mặt hàng nguyên liệu: ${materials.length}`}
            filename="Ton_Kho_Nguyen_Vat_Lieu_H2MilkTea"
            columns={exportColumns}
            data={exportData}
            summaryRows={[
              { label: 'Tổng mặt hàng nguyên vật liệu', value: `${materials.length} mặt hàng` },
            ]}
          />

          <Button
            type="button"
            onClick={() => setIsAIQuickModalOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white font-semibold shadow-sm"
          >
            <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" />
            Nhập số lượng nhanh bằng AI ✨
          </Button>

          <Dialog
            open={isDialogOpen}
            onOpenChange={(isOpen) => {
              if (!isOpen) resetForm();
              setIsDialogOpen(isOpen);
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                onClick={handleAddNew}
              >
                <Plus className="h-4 w-4" />
                Thêm nguyên vật liệu
              </Button>
            </DialogTrigger>
            <DialogContent className="w-screen h-screen max-w-none max-h-none m-0 p-0 rounded-none border-0 flex flex-col">
              <DialogHeader className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                    <div>
                      <DialogTitle className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">
                        {editingMaterial
                          ? 'Cập nhật thông tin nguyên vật liệu'
                          : 'Thêm nguyên vật liệu mới'}
                      </DialogTitle>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-hidden min-h-0">
                <MaterialForm
                  material={editingMaterial}
                  formData={formData}
                  onFormDataChange={setFormData}
                  onSubmit={handleSubmit}
                  onCancel={resetForm}
                  isAdmin={isAdmin}
                  isManager={isManager}
                  generateMaterialId={generateMaterialId}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <MaterialStats materials={materials} />

      {/* Inventory Stats */}
      <MaterialInventoryStats stats={inventoryStats} loading={inventoryLoading} />

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách nguyên vật liệu</CardTitle>
          <CardDescription>
            Quản lý tất cả nguyên vật liệu trong hệ thống của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={materials}
            units={unitsList}
            onAddNew={handleAddNew}
            onImportExcel={handleImportExcel}
            isAdmin={isAdmin}
            isManager={isManager}
          />
        </CardContent>
      </Card>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onConfirm={handleImportConfirm}
      />

      <AIInventoryQuickModal
        isOpen={isAIQuickModalOpen}
        onClose={() => setIsAIQuickModalOpen(false)}
        currentMaterials={materials}
        onSuccess={() => {
          refreshMaterials();
          refreshStats();
        }}
      />

      {/* View Material Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-600" />
              Chi tiết nguyên vật liệu
            </DialogTitle>
          </DialogHeader>
          {viewingMaterial && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Mã nguyên vật liệu</label>
                    <p className="font-mono font-semibold text-green-600">
                      {viewingMaterial.IDNguyenLieu}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tên nguyên vật liệu</label>
                    <p className="font-medium">{viewingMaterial['Tên nguyên liệu']}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Đơn vị tính</label>
                    <p>{viewingMaterial['Đơn vị tính']}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Đơn vị cơ sở</label>
                    <p className="font-medium">
                      {viewingMaterial['Đơn vị cơ sở'] || 'Chưa cập nhật'}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Hệ số quy đổi</label>
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-blue-500" />
                      <p className="font-medium text-blue-600">
                        {formatNumber(viewingMaterial['Hệ số quy đổi'] || 1)}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      1 {viewingMaterial['Đơn vị tính']} ={' '}
                      {formatNumber(viewingMaterial['Hệ số quy đổi'] || 1)}{' '}
                      {viewingMaterial['Đơn vị cơ sở']}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Số lượng cảnh báo</label>
                    <p className="font-medium text-orange-600">
                      {formatNumber(viewingMaterial['Số lượng cảnh báo'])}{' '}
                      {viewingMaterial['Đơn vị tính']}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ={' '}
                      {formatNumber(
                        (viewingMaterial['Số lượng cảnh báo'] || 0) *
                          (viewingMaterial['Hệ số quy đổi'] || 1)
                      )}{' '}
                      {viewingMaterial['Đơn vị cơ sở']}
                    </p>
                  </div>
                </div>
              </div>

              {/* Conversion Calculator */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  <h4 className="font-medium text-blue-800">Công cụ quy đổi</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">1 {viewingMaterial['Đơn vị tính']}</span>
                    <span className="mx-2 text-blue-500">=</span>
                    <span className="font-medium text-blue-800">
                      {formatNumber(viewingMaterial['Hệ số quy đổi'] || 1)}{' '}
                      {viewingMaterial['Đơn vị cơ sở']}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">1 {viewingMaterial['Đơn vị cơ sở']}</span>
                    <span className="mx-2 text-blue-500">=</span>
                    <span className="font-medium text-blue-800">
                      {formatNumber(1 / (viewingMaterial['Hệ số quy đổi'] || 1))}{' '}
                      {viewingMaterial['Đơn vị tính']}
                    </span>
                  </div>
                </div>
              </div>

              {viewingMaterial['Ghi chú'] && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Ghi chú</label>
                  <p className="mt-1 text-gray-700 whitespace-pre-wrap">
                    {viewingMaterial['Ghi chú']}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Đóng
                </Button>
                {(isAdmin || isManager) && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleCopy(viewingMaterial);
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Sao chép
                    </Button>
                    <Button
                      onClick={() => {
                        setIsViewDialogOpen(false);
                        handleEdit(viewingMaterial);
                      }}
                    >
                      Chỉnh sửa
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
