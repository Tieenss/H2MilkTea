// page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Settings, Plus, Eye, Calculator, Package,
    Beaker, ListChecks, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProductMaterials } from './hooks/useProductMaterials';
import { useProductMaterialInventory } from './hooks/useProductMaterialInventory';
import { DataTable } from './components/DataTable';
import { ProductMaterialForm } from './components/ProductMaterialForm';
import { MaterialCalculator } from './components/MaterialCalculator';
import { ProductMaterialInventoryStats } from './components/ProductMaterialInventoryStats';
import { getColumns } from './utils/columns';
import type { ProductMaterial, ProductMaterialFormData } from './types/productMaterial';
import { INITIAL_PRODUCT_MATERIAL_FORM_DATA } from './utils/constants';
import authUtils from '@/utils/authUtils';
import toast from 'react-hot-toast';
import { formatNumber } from './utils/formatters';

export default function ProductMaterialConfigPage() {
    const router = useRouter();
    const {
        productMaterials,
        products,
        materials,
        addProductMaterial,
        updateProductMaterial,
        deleteProductMaterial,
        generateConfigId,
        loading
    } = useProductMaterials();

    const { inventoryStats, loading: inventoryLoading, refreshStats } = useProductMaterialInventory();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<ProductMaterial | null>(null);
    const [viewingConfig, setViewingConfig] = useState<ProductMaterial | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<string>('ALL');

    const [formData, setFormData] = useState<ProductMaterialFormData>(INITIAL_PRODUCT_MATERIAL_FORM_DATA);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isManager, setIsManager] = useState(false);

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
        setFormData(INITIAL_PRODUCT_MATERIAL_FORM_DATA);
        setEditingConfig(null);
        setIsDialogOpen(false);
    };

    const handleAddNew = () => {
        if (!isAdmin && !isManager) {
            toast.error('Bạn không có quyền thực hiện chức năng này!');
            return;
        }
        setEditingConfig(null);
        const newFormData = {
            ...INITIAL_PRODUCT_MATERIAL_FORM_DATA,
            IDCauHinh: generateConfigId()
        };
        setFormData(newFormData);
        setIsDialogOpen(true);
    };

const handleSubmit = async (data: ProductMaterialFormData) => {
  try {
    if (editingConfig) {
      await updateProductMaterial(editingConfig.IDCauHinh, data);
    } else {
      await addProductMaterial(data);
    }
    // Refresh inventory stats after changes
    refreshStats();
    // Chỉ reset form sau khi thành công
    resetForm();
  } catch (error) {
    // Error đã được handle trong hook, không cần làm gì thêm
    console.error('Submit error:', error);
  }
};

    const handleEdit = (config: ProductMaterial) => {
        if (!isAdmin && !isManager) {
            toast.error('Bạn không có quyền thực hiện chức năng này!');
            return;
        }

        setEditingConfig(config);
        setFormData({
            IDCauHinh: config.IDCauHinh,
            IDSP: config.IDSP,
            IDNguyenLieu: config.IDNguyenLieu,
            'Số lượng cần': config['Số lượng cần'],
            'Đơn vị sử dụng': config['Đơn vị sử dụng'],
            'Ghi chú': config['Ghi chú'] || '',
            'Trạng thái': config['Trạng thái']
        });
        setIsDialogOpen(true);
    };

    const handleView = (config: ProductMaterial) => {
        setViewingConfig(config);
        setIsViewDialogOpen(true);
    };

    const handleDelete = (config: ProductMaterial) => {
        if (!isAdmin && !isManager) {
            toast.error('Bạn không có quyền xóa cấu hình!');
            return;
        }
        deleteProductMaterial(config.IDCauHinh);
        // Refresh inventory stats after deletion
        refreshStats();
    };

    const columns = useMemo(
        () => getColumns({
            onEdit: handleEdit,
            onDelete: handleDelete,
            onView: handleView,
            isAdmin,
            isManager
        }),
        [handleEdit, handleDelete, handleView, isAdmin, isManager]
    );

    // Filter data based on selected product
  const filteredData = useMemo(() => {
  if (selectedProduct === 'ALL') return productMaterials;
  return productMaterials.filter(config => config.IDSP === selectedProduct);
}, [productMaterials, selectedProduct]);

    const productOptions = useMemo(() =>
        products.map(p => ({ label: p['Tên sản phẩm'], value: p.IDSP })),
        [products]
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
                    <Settings className="mr-2 h-6 w-6 text-purple-600" />
                    Cấu hình nguyên vật liệu sản phẩm
                </h3>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setIsCalculatorOpen(true)}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <Calculator className="h-4 w-4" />
                        Máy tính định mức
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
                                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                                onClick={handleAddNew}
                            >
                                <Plus className="h-4 w-4" />
                                Thêm cấu hình
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="w-screen h-screen max-w-none max-h-none m-0 p-0 rounded-none border-0 flex flex-col">
                            <DialogHeader className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-gray-200 bg-white shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                                        <div>
                                            <DialogTitle className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">
                                                {editingConfig ? 'Cập nhật cấu hình nguyên vật liệu' : 'Thêm cấu hình mới'}
                                            </DialogTitle>
                                        </div>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="flex-1 overflow-hidden min-h-0">
                                <ProductMaterialForm
                                    config={editingConfig}
                                    formData={formData}
                                    onFormDataChange={setFormData}
                                    onSubmit={handleSubmit}
                                    onCancel={resetForm}
                                    isAdmin={isAdmin}
                                    isManager={isManager}
                                    products={products}
                                    materials={materials}
                                    generateConfigId={generateConfigId}
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

       
            {/* Inventory Stats */}
            <ProductMaterialInventoryStats stats={inventoryStats} loading={inventoryLoading} />

            {/* Data Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Danh sách cấu hình nguyên vật liệu</CardTitle>
                    <CardDescription>
                        Quản lý định mức nguyên vật liệu cho từng sản phẩm.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={filteredData}
                        products={productOptions}
                        onAddNew={handleAddNew}
                        selectedProduct={selectedProduct}
                        onProductChange={setSelectedProduct}
                        isAdmin={isAdmin}
                        isManager={isManager}
                    />
                </CardContent>
            </Card>

            {/* Material Calculator Modal */}
            <MaterialCalculator
                isOpen={isCalculatorOpen}
                onClose={() => setIsCalculatorOpen(false)}
                products={products}
                materials={materials}
                productMaterials={productMaterials}
            />

            {/* View Config Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5 text-purple-600" />
                            Chi tiết cấu hình nguyên vật liệu
                        </DialogTitle>
                    </DialogHeader>
                    {viewingConfig && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Mã cấu hình</label>
                                        <p className="font-mono font-semibold text-purple-600">{viewingConfig.IDCauHinh}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Sản phẩm</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Package className="h-4 w-4 text-blue-500" />
                                            <span className="font-medium">{viewingConfig['Tên sản phẩm']}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">Mã: {viewingConfig.IDSP}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Nguyên vật liệu</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Beaker className="h-4 w-4 text-green-500" />
                                            <span className="font-medium">{viewingConfig['Tên nguyên liệu']}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">Mã: {viewingConfig.IDNguyenLieu}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Trạng thái</label>
                                        <div className="mt-1">
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${viewingConfig['Trạng thái'] === 'Hoạt động'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {viewingConfig['Trạng thái']}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Số lượng cần</label>
                                        <p className="font-semibold text-lg text-blue-600">
                                            {formatNumber(viewingConfig['Số lượng cần'])} {viewingConfig['Đơn vị sử dụng']}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Quy đổi ra đơn vị gốc</label>
                                        <p className="font-medium text-orange-600">
                                            {formatNumber(viewingConfig['Số lượng quy đổi'])} {viewingConfig['Đơn vị gốc']}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Hệ số: {formatNumber(viewingConfig['Hệ số quy đổi'])}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Ngày tạo</label>
                                        <p>{new Date(viewingConfig['Ngày tạo']).toLocaleDateString('vi-VN')}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Cập nhật lần cuối</label>
                                        <p>{new Date(viewingConfig['Ngày cập nhật']).toLocaleDateString('vi-VN')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Conversion Info */}
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <Calculator className="h-5 w-5 text-blue-600" />
                                    <h4 className="font-medium text-blue-800">Công thức tính toán</h4>
                                </div>
                                <div className="text-sm text-blue-700">
                                    <p className="mb-2">
                                        <strong>Để sản xuất 1 {viewingConfig['Tên sản phẩm']}:</strong>
                                    </p>
                                    <p className="font-mono bg-white p-2 rounded border">
                                        Cần {formatNumber(viewingConfig['Số lượng cần'])} {viewingConfig['Đơn vị sử dụng']}
                                        = {formatNumber(viewingConfig['Số lượng quy đổi'])} {viewingConfig['Đơn vị gốc']}
                                        của {viewingConfig['Tên nguyên liệu']}
                                    </p>
                                </div>
                            </div>

                            {viewingConfig['Ghi chú'] && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Ghi chú</label>
                                    <p className="mt-1 text-gray-700 whitespace-pre-wrap">{viewingConfig['Ghi chú']}</p>
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
                                    <Button
                                        onClick={() => {
                                            setIsViewDialogOpen(false);
                                            handleEdit(viewingConfig);
                                        }}
                                    >
                                        Chỉnh sửa
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}