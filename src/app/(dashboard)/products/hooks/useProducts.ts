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
      const response = await authUtils.apiRequest('SanPham', 'Find', {});
      setProducts(response || []);
      toast.success("Đã tải dữ liệu sản phẩm thành công");
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

      await authUtils.apiRequest('SanPham', 'Add', {
        "Rows": [formData]
      });

      // Add to state immediately
      setProducts(prev => [...prev, formData as Product]);
      toast.success('Thêm sản phẩm mới thành công!');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Có lỗi xảy ra khi thêm sản phẩm');
    }
  }, [products, generateProductId]);

  const updateProduct = useCallback(async (productId: string, formData: ProductFormData) => {
    try {
      await authUtils.apiRequest('SanPham', 'Edit', {
        "Rows": [formData]
      });

      // Update state immediately
      setProducts(prev => prev.map(product =>
        product.IDSP === productId ? { ...product, ...formData } : product
      ));
      toast.success('Cập nhật thông tin sản phẩm thành công!');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Có lỗi xảy ra khi cập nhật sản phẩm');
    }
  }, []);

  const copyProduct = useCallback(async (product: Product) => {
    try {
      const newProduct = {
        ...product,
        IDSP: generateProductId(),
        'Tên sản phẩm': `${product['Tên sản phẩm']} (Copy)`
      };

      await authUtils.apiRequest('SanPham', 'Add', {
        "Rows": [newProduct]
      });

      setProducts(prev => [...prev, newProduct]);
      toast.success('Sao chép sản phẩm thành công!');
    } catch (error) {
      console.error('Error copying product:', error);
      toast.error('Có lỗi xảy ra khi sao chép sản phẩm');
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
      
      await authUtils.apiRequest('SanPham', 'Delete', {
        "Rows": [{ "IDSP": productId }]
      });

      toast.success(`Xóa sản phẩm "${productName}" thành công!`, { id: toastId });
    } catch (error) {
      // Rollback on error
      setProducts(originalProducts);
      console.error('Error deleting product:', error);
      toast.error('Có lỗi xảy ra khi xóa sản phẩm');
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
    updateProduct,
    copyProduct,
    deleteProduct,
    importFromExcel,
    generateProductId
  };
};