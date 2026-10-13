// hooks/useProducts.ts
'use client';

import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { Product, ProductFormData } from '../types/product';
import authUtils from '@/utils/authUtils';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

const fetchProducts = useCallback(async () => {
  try {
    setLoading(true);
    // Sửa từ 'Sản phẩm' thành 'DMHH'
    const response = await authUtils.getAllSanPham();
    if (Array.isArray(response)) {
      setProducts(response);
    } else if (response && response.success && Array.isArray(response.data)) {
      setProducts(response.data);
    } else {
      setProducts([]);
    }
  } catch (error) {
    console.error('Error fetching product list:', error);
    toast.error('Lỗi khi tải danh sách sản phẩm');
  } finally {
    setLoading(false);
  }
}, []);

  const generateProductId = useCallback(() => {
    const existingIds = products.map(p => p.IDSP);
    let newId = 'SP001';
    let counter = 1;
    
    while (existingIds.includes(newId)) {
      counter++;
      newId = `SP${counter.toString().padStart(3, '0')}`;
    }
    
    return newId;
  }, [products]);

  // Tạo nhiều ID sản phẩm cùng lúc
  const generateMultipleProductIds = useCallback((count: number) => {
    const existingIds = products.map(p => p.IDSP);
    const newIds: string[] = [];
    let counter = 1;
    
    while (newIds.length < count) {
      const newId = `SP${counter.toString().padStart(3, '0')}`;
      if (!existingIds.includes(newId) && !newIds.includes(newId)) {
        newIds.push(newId);
      }
      counter++;
    }
    
    return newIds;
  }, [products]);

 const addProduct = useCallback(async (formData: ProductFormData) => {
  try {
    // Generate ID if not provided
    if (!formData.IDSP) {
      formData.IDSP = generateProductId();
    }

    // Check for existing product ID
    const exists = products.some(product =>
      product.IDSP.toLowerCase() === formData.IDSP.toLowerCase()
    );

    if (exists) {
      toast.error('Mã sản phẩm này đã tồn tại!');
      return;
    }

    const result = await authUtils.addSanPham(formData);
    if (!Array.isArray(result) && result.success) {
      // Add to state immediately
      setProducts(prev => [...prev, formData as Product]);
      toast.success('Thêm sản phẩm mới thành công!');
    } else if (!Array.isArray(result)) {
      throw new Error(result.message || 'Lỗi khi thêm sản phẩm');
    } else {
      throw new Error('Lỗi khi thêm sản phẩm');
    }
  } catch (error: any) {
    console.error('Error adding product:', error);
    toast.error(error.message || 'Có lỗi xảy ra khi thêm sản phẩm');
  }
}, [products, generateProductId]);

  // Thêm nhiều sản phẩm cùng lúc
const addMultipleProducts = useCallback(async (productsData: ProductFormData[]) => {
  try {
    const toastId = toast.loading(`Đang thêm ${productsData.length} sản phẩm...`);
    
    // Tạo ID cho các sản phẩm chưa có ID
    const newIds = generateMultipleProductIds(productsData.filter(p => !p.IDSP).length);
    let idIndex = 0;
    
    const processedData = productsData.map(product => {
      if (!product.IDSP) {
        product.IDSP = newIds[idIndex++];
      }
      return product;
    });

    // Kiểm tra trùng lặp ID
    const existingIds = products.map(p => p.IDSP);
    const duplicateIds = processedData.filter(product => 
      existingIds.includes(product.IDSP)
    );

    if (duplicateIds.length > 0) {
      toast.error(`Các mã sản phẩm sau đã tồn tại: ${duplicateIds.map(p => p.IDSP).join(', ')}`, { id: toastId });
      return false;
    }

    // Thêm từng sản phẩm
    for (const productData of processedData) {
      const result = await authUtils.addSanPham(productData);
      if (!Array.isArray(result) && !result.success) {
        throw new Error(`Lỗi khi thêm sản phẩm ${productData.IDSP}: ${result.message}`);
      } else if (Array.isArray(result)) {
        throw new Error(`Lỗi khi thêm sản phẩm ${productData.IDSP}: Kết quả trả về không hợp lệ`);
      }
    }

    // Cập nhật state
    setProducts(prev => [...prev, ...processedData as Product[]]);
    toast.success(`Đã thêm thành công ${productsData.length} sản phẩm!`, { id: toastId });
    
    return true;
  } catch (error: any) {
    console.error('Error adding multiple products:', error);
    toast.error(error.message || 'Có lỗi xảy ra khi thêm sản phẩm');
    return false;
  }
}, [products, generateMultipleProductIds]);

const updateProduct = useCallback(async (productId: string, formData: ProductFormData) => {
  try {
    const result = await authUtils.updateSanPham(productId, formData);
    
    if (!Array.isArray(result) && result.success) {
      // Update state immediately
      setProducts(prev => prev.map(product =>
        product.IDSP === productId ? { ...product, ...formData } : product
      ));
      toast.success('Cập nhật thông tin sản phẩm thành công!');
    } else if (!Array.isArray(result)) {
      throw new Error(result.message || 'Lỗi khi cập nhật sản phẩm');
    } else {
      throw new Error('Lỗi khi cập nhật sản phẩm');
    }
  } catch (error: any) {
    console.error('Error updating product:', error);
    toast.error(error.message || 'Có lỗi xảy ra khi cập nhật sản phẩm');
  }
}, []);

  const copyProduct = useCallback(async (product: Product) => {
  try {
    const newProduct = {
      ...product,
      IDSP: generateProductId(),
      'Tên sản phẩm': `${product['Tên sản phẩm']} (Copy)`
    };

    const result = await authUtils.addSanPham(newProduct);
    
    if (!Array.isArray(result) && result.success) {
      setProducts(prev => [...prev, newProduct]);
      toast.success('Sao chép sản phẩm thành công!');
    } else if (!Array.isArray(result)) {
      throw new Error(result.message || 'Lỗi khi sao chép sản phẩm');
    } else {
      throw new Error('Lỗi khi sao chép sản phẩm');
    }
  } catch (error: any) {
    console.error('Error copying product:', error);
    toast.error(error.message || 'Có lỗi xảy ra khi sao chép sản phẩm');
  }
}, [generateProductId]);
  const deleteProduct = useCallback(async (productId: string) => {
  // Store original state for potential rollback
  const originalProducts = products;
  const productName = products.find(product => product.IDSP === productId)?.['Tên sản phẩm'] || '';

  try {
    // Optimistic update
    setProducts(prev => prev.filter(product => product.IDSP !== productId));
    
    const toastId = toast.loading('Đang xóa sản phẩm...');
    
    const result = await authUtils.deleteSanPham(productId);
    
    if (!Array.isArray(result) && result.success) {
      toast.success(`Xóa sản phẩm "${productName}" thành công!`, { id: toastId });
    } else {
      // Rollback on error
      setProducts(originalProducts);
      throw new Error((!Array.isArray(result) && result.message) || 'Lỗi khi xóa sản phẩm');
    }
  } catch (error: any) {
    // Rollback on error
    setProducts(originalProducts);
    console.error('Error deleting product:', error);
    toast.error(error.message || 'Có lỗi xảy ra khi xóa sản phẩm');
  }
}, [products]);

  // Xóa nhiều sản phẩm cùng lúc
  const deleteMultipleProducts = useCallback(async (productIds: string[]) => {
    const originalProducts = products;
    const productsToDelete = products.filter(product => productIds.includes(product.IDSP));
    
    try {
      // Optimistic update
      setProducts(prev => prev.filter(product => !productIds.includes(product.IDSP)));
      
      const toastId = toast.loading(`Đang xóa ${productIds.length} sản phẩm...`);
      
      // Gọi API để xóa nhiều sản phẩm
      await authUtils.apiRequest('Sản phẩm', 'Delete', {
        "Rows": productIds.map(id => ({ "IDSP": id }))
      });

      toast.success(`Đã xóa thành công ${productIds.length} sản phẩm!`, { id: toastId });
      return true;
    } catch (error) {
      // Rollback on error
      setProducts(originalProducts);
      console.error('Error deleting multiple products:', error);
      toast.error('Có lỗi xảy ra khi xóa sản phẩm');
      return false;
    }
  }, [products]);

  const importFromExcel = useCallback(async (file: File) => {
    try {
      const toastId = toast.loading('Đang import dữ liệu...');
      
      // Here you would implement Excel import logic
      // For now, just simulate the process
      
      toast.success('Import dữ liệu thành công!', { id: toastId });
      fetchProducts(); // Reload data after import
    } catch (error) {
      console.error('Error importing from Excel:', error);
      toast.error('Có lỗi xảy ra khi import dữ liệu');
    }
  }, [fetchProducts]);

  return {
    products,
    loading,
    addProduct,
    addMultipleProducts,
    updateProduct,
    copyProduct,
    deleteProduct,
    deleteMultipleProducts,
    importFromExcel,
    generateProductId,
    generateMultipleProductIds
  };
};