'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Plus, X, Upload, Copy, Eye } from 'lucide-react';
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
import { useProducts } from './hooks/useProducts';
import { ProductStats } from './components/ProductStats';
import { DataTable } from './components/DataTable';
import { ProductForm } from './components/ProductForm';
import { getColumns } from './utils/columns';
import type { Product, ProductFormData } from './types/product';
import { INITIAL_PRODUCT_FORM_DATA } from './utils/constants';
import authUtils from '@/utils/authUtils';
import toast from 'react-hot-toast';

export default function ProductPage() {
  const router = useRouter();
  const { 
    products, 
    addProduct, 
    updateProduct, 
    copyProduct, 
    deleteProduct, 
    importFromExcel,
    generateProductId,
    loading 
  } = useProducts();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(INITIAL_PRODUCT_FORM_DATA);
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
    setFormData(INITIAL_PRODUCT_FORM_DATA);
    setEditingProduct(null);
    setIsDialogOpen(false);
  };

  const handleAddNew = () => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền thực hiện chức năng này!');
      return;
    }
    setEditingProduct(null);
    const newFormData = {
      ...INITIAL_PRODUCT_FORM_DATA,
      IDSP: generateProductId()
    };
    setFormData(newFormData);
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: ProductFormData) => {
    if (editingProduct) {
      updateProduct(editingProduct.IDSP, data);
    } else {
      addProduct(data);
    }
    resetForm();
  };

  const handleEdit = (product: Product) => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền thực hiện chức năng này!');
      return;
    }

    setEditingProduct(product);
    setFormData({
      IDSP: product.IDSP || '',
      'Tên sản phẩm': product['Tên sản phẩm'] || '',
      'Hình ảnh': product['Hình ảnh'] || '',
      'Loại sản phẩm': product['Loại sản phẩm'] || '',
      'Đơn vị tính': product['Đơn vị tính'] || 'Cái',
      'Giá vốn': product['Giá vốn'] || 0,
      'Đơn giá': product['Đơn giá'] || 0,
      'Mô tả': product['Mô tả'] || '',
      'Trạng thái': product['Trạng thái'] || 'Hoạt động'
    });
    setIsDialogOpen(true);
  };

  const handleView = (product: Product) => {
    setViewingProduct(product);
    setIsViewDialogOpen(true);
  };

  const handleCopy = (product: Product) => {
    copyProduct(product);
  };

  const handleDelete = (product: Product) => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền xóa sản phẩm!');
      return;
    }

    deleteProduct(product.IDSP);
  };

  const handleImportExcel = () => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền import dữ liệu!');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        importFromExcel(file);
      }
    };
    input.click();
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

  const categoriesList = useMemo(() =>
    Array.from(new Set(products.map(p => p['Loại sản phẩm']).filter(Boolean))),
    [products]
  );

  const unitsList = useMemo(() =>
    Array.from(new Set(products.map(p => p['Đơn vị tính']).filter(Boolean))),
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
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <Package className="mr-2 h-6 w-6 text-blue-600" />
          Quản lý sản phẩm
        </h1>
        <div className="flex items-center gap-2">
          {(isAdmin || isManager) && (
            <Button
              variant="outline"
              onClick={handleImportExcel}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Import Excel
            </Button>
          )}
          <Dialog
            open={isDialogOpen}
            onOpenChange={(isOpen) => {
              if (!isOpen) resetForm();
              setIsDialogOpen(isOpen);
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={handleAddNew}
              >
                <Plus className="h-4 w-4" />
                Thêm sản phẩm
              </Button>
            </DialogTrigger>
            <DialogContent className="w-screen h-screen max-w-none max-h-none m-0 p-0 rounded-none border-0 flex flex-col">
              <DialogHeader className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    <div>
                      <DialogTitle className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">
                        {editingProduct ? 'Cập nhật thông tin sản phẩm' : 'Thêm sản phẩm mới'}
                      </DialogTitle>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-hidden min-h-0">
                <ProductForm
                  product={editingProduct}
                  formData={formData}
                  onFormDataChange={setFormData}
                  onSubmit={handleSubmit}
                  onCancel={resetForm}
                  isAdmin={isAdmin}
                  isManager={isManager}
                  categories={categoriesList}
                  generateProductId={generateProductId}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <ProductStats products={products} />

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách sản phẩm</CardTitle>
          <CardDescription>
            Quản lý tất cả sản phẩm trong hệ thống của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={products}
            categories={categoriesList}
            units={unitsList}
            onAddNew={handleAddNew}
            onImportExcel={handleImportExcel}
            isAdmin={isAdmin}
            isManager={isManager}
          />
        </CardContent>
      </Card>

      {/* View Product Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Chi tiết sản phẩm
            </DialogTitle>
          </DialogHeader>
          {viewingProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Mã sản phẩm</label>
                    <p className="font-mono font-semibold text-blue-600">{viewingProduct.IDSP}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tên sản phẩm</label>
                    <p className="font-medium">{viewingProduct['Tên sản phẩm']}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Loại sản phẩm</label>
                    <p>{viewingProduct['Loại sản phẩm'] || 'Chưa phân loại'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Đơn vị tính</label>
                    <p>{viewingProduct['Đơn vị tính']}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Trạng thái</label>
                    <p className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      viewingProduct['Trạng thái'] === 'Hoạt động' ? 'bg-green-100 text-green-800' :
                      viewingProduct['Trạng thái'] === 'Hết hàng' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {viewingProduct['Trạng thái']}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Hình ảnh</label>
                    <div className="w-32 h-32 border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                      {viewingProduct['Hình ảnh'] ? (
                        <img
                          src={viewingProduct['Hình ảnh']}
                          alt={viewingProduct['Tên sản phẩm']}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="h-12 w-12 text-gray-300" />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Giá vốn</label>
                    <p className="font-medium text-orange-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(viewingProduct['Giá vốn'])}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Đơn giá</label>
                    <p className="font-semibold text-green-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(viewingProduct['Đơn giá'])}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Lợi nhuận</label>
                    <p className="font-medium text-blue-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                        viewingProduct['Đơn giá'] - viewingProduct['Giá vốn']
                      )}
                    </p>
                  </div>
                </div>
              </div>
              {viewingProduct['Mô tả'] && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Mô tả</label>
                  <p className="mt-1 text-gray-700 whitespace-pre-wrap">{viewingProduct['Mô tả']}</p>
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
                        handleCopy(viewingProduct);
                        setIsViewDialogOpen(false);
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Sao chép
                    </Button>
                    <Button
                      onClick={() => {
                        setIsViewDialogOpen(false);
                        handleEdit(viewingProduct);
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