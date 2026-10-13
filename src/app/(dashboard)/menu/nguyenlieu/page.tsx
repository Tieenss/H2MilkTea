'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Plus, X, Upload, Copy, Eye, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export default function MaterialPage() {
  const router = useRouter();
  const {
    materials,
    addMaterial,
    updateMaterial,
    copyMaterial,
    deleteMaterial,
    importFromExcel,
    addMultipleMaterials,
    generateMaterialId,
    loading
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

  // Check user permissions
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
      IDNguyenLieu: generateMaterialId()
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
    // Refresh inventory stats after material changes
    refreshStats();
    // Chỉ reset form sau khi thành công
    resetForm();
  } catch (error) {
    // Error đã được handle trong hook, không cần làm gì thêm
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
      'Số lượng cảnh báo': material['Số lượng cảnh báo'] || 0
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
      'Tên nguyên liệu': material['Tên nguyên liệu'] + ' (Copy)'
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
    // Refresh inventory stats after deletion
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
    const materialsData: MaterialFormData[] = data.map(row => ({
      IDNguyenLieu: '',
      'Tên nguyên liệu': row['Tên nguyên liệu'],
      'Đơn vị tính': row['Đơn vị tính'],
      'Đơn vị cơ sở': row['Đơn vị cơ sở'] || 'Gram',
      'Hệ số quy đổi': Number(row['Hệ số quy đổi']) || 1,
      'Ghi chú': row['Ghi chú'] || '',
      'Số lượng cảnh báo': Number(row['Số lượng cảnh báo']) || 0
    }));

    const success = await addMultipleMaterials(materialsData);
    if (success) {
      setIsImportModalOpen(false);
      // Refresh inventory stats after import
      refreshStats();
    }
  };

  const columns = useMemo(
    () => getColumns({
      onEdit: handleEdit,
      onDelete: handleDelete,
      onCopy: handleCopy,
      onView: handleView,
      isAdmin,
      isManager
    }),
    [handleEdit, handleDelete, handleCopy, handleView, isAdmin, isManager]
  );

  const unitsList = useMemo(() =>
   Array.from(new Set(materials.map(m => m['Đơn vị tính']).filter(Boolean))),
   [materials]
 );

 const baseUnitsList = useMemo(() =>
   Array.from(new Set(materials.map(m => m['Đơn vị cơ sở']).filter(Boolean))),
   [materials]
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
     <div className="flex justify-between items-center">
       <h3 className="text-3xl font-bold text-gray-800 flex items-center">
         <Package className="mr-2 h-6 w-6 text-green-600" />
         Quản lý nguyên vật liệu
       </h3>
       <div className="flex items-center gap-2">
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
                       {editingMaterial ? 'Cập nhật thông tin nguyên vật liệu' : 'Thêm nguyên vật liệu mới'}
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
                   <p className="font-mono font-semibold text-green-600">{viewingMaterial.IDNguyenLieu}</p>
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
                   <p className="font-medium">{viewingMaterial['Đơn vị cơ sở'] || 'Chưa cập nhật'}</p>
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
                     1 {viewingMaterial['Đơn vị tính']} = {formatNumber(viewingMaterial['Hệ số quy đổi'] || 1)} {viewingMaterial['Đơn vị cơ sở']}
                   </p>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-gray-500">Số lượng cảnh báo</label>
                   <p className="font-medium text-orange-600">
                     {formatNumber(viewingMaterial['Số lượng cảnh báo'])} {viewingMaterial['Đơn vị tính']}
                   </p>
                   <p className="text-xs text-gray-500 mt-1">
                     = {formatNumber((viewingMaterial['Số lượng cảnh báo'] || 0) * (viewingMaterial['Hệ số quy đổi'] || 1))} {viewingMaterial['Đơn vị cơ sở']}
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
                     {formatNumber(viewingMaterial['Hệ số quy đổi'] || 1)} {viewingMaterial['Đơn vị cơ sở']}
                   </span>
                 </div>
                 <div>
                   <span className="text-blue-700">1 {viewingMaterial['Đơn vị cơ sở']}</span>
                   <span className="mx-2 text-blue-500">=</span>
                   <span className="font-medium text-blue-800">
                     {formatNumber(1 / (viewingMaterial['Hệ số quy đổi'] || 1))} {viewingMaterial['Đơn vị tính']}
                   </span>
                 </div>
               </div>
             </div>

             {viewingMaterial['Ghi chú'] && (
               <div>
                 <label className="text-sm font-medium text-gray-500">Ghi chú</label>
                 <p className="mt-1 text-gray-700 whitespace-pre-wrap">{viewingMaterial['Ghi chú']}</p>
               </div>
             )}

             <div className="flex justify-end gap-2 pt-4 border-t">
               <Button
                 variant="outline"
                 onClick={() => setIsViewDialogOpen(false)}
               >
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