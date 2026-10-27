'use client';

import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { Product, ProductFormData } from '../types/product';
import authUtils from '@/utils/authUtils';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authUtils.getAllSanPham();
      if (Array.isArray(response)) {
        setProducts(response.map((p: any) => ({ ...p })));
      } else if (response && response.success && Array.isArray(response.data)) {
        setProducts(response.data.map((p: any) => ({ ...p })));
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

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const generateProductId = useCallback(() => {
    const existingIds = new Set(products.map((p) => String(p.IDSP || '').toUpperCase()));
    let counter = 1;
    let newId = 'SP001';

    while (existingIds.has(newId.toUpperCase())) {
      counter++;
      newId = `SP${counter.toString().padStart(3, '0')}`;
    }

    return newId;
  }, [products]);

  const generateMultipleProductIds = useCallback(
    (count: number) => {
      const existingIds = new Set(products.map((p) => String(p.IDSP || '').toUpperCase()));
      const newIds: string[] = [];
      let counter = 1;

      while (newIds.length < count) {
        const newId = `SP${counter.toString().padStart(3, '0')}`;
        if (!existingIds.has(newId.toUpperCase()) && !newIds.includes(newId)) {
          newIds.push(newId);
        }
        counter++;
      }

      return newIds;
    },
    [products]
  );

  const addProduct = useCallback(
    async (formData: ProductFormData): Promise<boolean> => {
      try {
        const cleanData = { ...formData };
        if (!cleanData.IDSP) {
          cleanData.IDSP = generateProductId();
        }

        // Kiểm tra trùng mã sản phẩm
        const idExists = products.some(
          (product) => String(product.IDSP || '').toLowerCase() === String(cleanData.IDSP).toLowerCase()
        );

        if (idExists) {
          toast.error(`Mã sản phẩm "${cleanData.IDSP}" đã tồn tại! Hệ thống sẽ yêu cầu mã khác.`);
          return false;
        }

        // Kiểm tra trùng tên sản phẩm
        const normName = String(cleanData['Tên sản phẩm'] || '').trim().toLowerCase();
        const duplicateNameProduct = products.find(
          (product) => String(product['Tên sản phẩm'] || '').trim().toLowerCase() === normName
        );

        if (duplicateNameProduct) {
          toast.error(
            `Sản phẩm "${cleanData['Tên sản phẩm']}" đã tồn tại với mã ${duplicateNameProduct.IDSP}! Vui lòng kiểm tra lại tránh thêm trùng.`
          );
          return false;
        }

        const result = await authUtils.addSanPham(cleanData);
        if (!Array.isArray(result) && result.success) {
          const savedProduct = (result.data || cleanData) as Product;
          setProducts((prev) => {
            // Đảm bảo không bao giờ đẩy bản ghi trùng tham chiếu hoặc trùng IDSP vào state
            const filtered = prev.filter((p) => p.IDSP !== savedProduct.IDSP);
            return [...filtered, { ...savedProduct }];
          });
          toast.success(`Đã thêm sản phẩm "${savedProduct['Tên sản phẩm']}" (${savedProduct.IDSP}) thành công!`);
          return true;
        } else if (!Array.isArray(result)) {
          throw new Error(result.message || 'Lỗi khi thêm sản phẩm');
        } else {
          throw new Error('Lỗi khi thêm sản phẩm');
        }
      } catch (error: any) {
        console.error('Error adding product:', error);
        toast.error(error.message || 'Có lỗi xảy ra khi thêm sản phẩm');
        return false;
      }
    },
    [products, generateProductId]
  );

  const addMultipleProducts = useCallback(
    async (productsData: ProductFormData[]) => {
      try {
        const toastId = toast.loading(`Đang thêm ${productsData.length} sản phẩm...`);

        const newIds = generateMultipleProductIds(productsData.filter((p) => !p.IDSP).length);
        let idIndex = 0;

        const processedData = productsData.map((product) => {
          const clone = { ...product };
          if (!clone.IDSP) {
            clone.IDSP = newIds[idIndex++];
          }
          return clone;
        });

        const existingIds = new Set(products.map((p) => String(p.IDSP || '').toUpperCase()));
        const duplicateIds = processedData.filter((product) =>
          existingIds.has(String(product.IDSP || '').toUpperCase())
        );

        if (duplicateIds.length > 0) {
          toast.error(
            `Các mã sản phẩm sau đã tồn tại: ${duplicateIds.map((p) => p.IDSP).join(', ')}`,
            { id: toastId }
          );
          return false;
        }

        const savedList: Product[] = [];
        for (const productData of processedData) {
          const result = await authUtils.addSanPham(productData);
          if (!Array.isArray(result) && result.success) {
            savedList.push((result.data || productData) as Product);
          } else {
            throw new Error(`Lỗi khi thêm sản phẩm ${productData.IDSP}`);
          }
        }

        setProducts((prev) => {
          const addedIds = new Set(savedList.map((s) => s.IDSP));
          const remaining = prev.filter((p) => !addedIds.has(p.IDSP));
          return [...remaining, ...savedList];
        });

        toast.success(`Đã thêm thành công ${savedList.length} sản phẩm!`, { id: toastId });
        return true;
      } catch (error: any) {
        console.error('Error adding multiple products:', error);
        toast.error(error.message || 'Có lỗi xảy ra khi thêm sản phẩm');
        return false;
      }
    },
    [products, generateMultipleProductIds]
  );

  const updateProduct = useCallback(async (productId: string, formData: ProductFormData) => {
    try {
      const result = await authUtils.updateSanPham(productId, formData);

      if (!Array.isArray(result) && result.success) {
        setProducts((prev) =>
          prev.map((product) => (product.IDSP === productId ? { ...product, ...formData } : product))
        );
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

  const copyProduct = useCallback(
    async (product: Product) => {
      try {
        const newProduct = {
          ...product,
          IDSP: generateProductId(),
          'Tên sản phẩm': `${product['Tên sản phẩm']} (Copy)`,
        };

        const result = await authUtils.addSanPham(newProduct);

        if (!Array.isArray(result) && result.success) {
          const saved = (result.data || newProduct) as Product;
          setProducts((prev) => [...prev.filter((p) => p.IDSP !== saved.IDSP), saved]);
          toast.success('Sao chép sản phẩm thành công!');
        } else {
          throw new Error('Lỗi khi sao chép sản phẩm');
        }
      } catch (error: any) {
        console.error('Error copying product:', error);
        toast.error(error.message || 'Có lỗi xảy ra khi sao chép sản phẩm');
      }
    },
    [generateProductId]
  );

  const deleteProduct = useCallback(
    async (productId: string) => {
      const originalProducts = products;
      const productName = products.find((product) => product.IDSP === productId)?.['Tên sản phẩm'] || '';

      try {
        setProducts((prev) => prev.filter((product) => product.IDSP !== productId));
        const toastId = toast.loading('Đang xóa sản phẩm...');
        const result = await authUtils.deleteSanPham(productId);

        if (!Array.isArray(result) && result.success) {
          toast.success(`Xóa sản phẩm "${productName}" thành công!`, { id: toastId });
        } else {
          setProducts(originalProducts);
          throw new Error((!Array.isArray(result) && result.message) || 'Lỗi khi xóa sản phẩm');
        }
      } catch (error: any) {
        setProducts(originalProducts);
        console.error('Error deleting product:', error);
        toast.error(error.message || 'Có lỗi xảy ra khi xóa sản phẩm');
      }
    },
    [products]
  );

  const deleteMultipleProducts = useCallback(
    async (productIds: string[]) => {
      const originalProducts = products;

      try {
        setProducts((prev) => prev.filter((product) => !productIds.includes(product.IDSP)));
        const toastId = toast.loading(`Đang xóa ${productIds.length} sản phẩm...`);

        for (const id of productIds) {
          await authUtils.deleteSanPham(id);
        }

        toast.success(`Đã xóa thành công ${productIds.length} sản phẩm!`, { id: toastId });
        return true;
      } catch (error) {
        setProducts(originalProducts);
        console.error('Error deleting multiple products:', error);
        toast.error('Có lỗi xảy ra khi xóa sản phẩm');
        return false;
      }
    },
    [products]
  );

  // Xóa theo vị trí index (dùng cho công cụ dọn dẹp trùng lặp kể cả khi 2 dòng bị trùng cùng mã IDSP)
  const removeDuplicateIndices = useCallback(
    async (indicesToRemove: number[]) => {
      if (indicesToRemove.length === 0) return false;
      try {
        const removeSet = new Set(indicesToRemove);
        const cleanedList = products.filter((_, idx) => !removeSet.has(idx));

        // Cập nhật trực tiếp vào demoData['DMHH'] của authUtils và lưu localStorage
        (authUtils as any).demoData['DMHH'] = cleanedList.map((item, idx) => ({
          ...item,
          _RowNumber: String(idx + 2),
        }));
        (authUtils as any).saveDemoData?.();

        setProducts(cleanedList);
        toast.success(`Đã dọn dẹp ${indicesToRemove.length} sản phẩm trùng lặp!`);
        return true;
      } catch (err) {
        console.error('Error cleaning duplicate products:', err);
        toast.error('Lỗi khi dọn dẹp sản phẩm trùng lặp');
        return false;
      }
    },
    [products]
  );

  const importFromExcel = useCallback(
    async (file: File) => {
      try {
        const toastId = toast.loading('Đang import dữ liệu...');
        const res = await authUtils.importFromExcel(file);
        if (res.success) {
          toast.success('Import dữ liệu thành công!', { id: toastId });
          fetchProducts();
        } else {
          toast.error(res.message || 'Lỗi khi import', { id: toastId });
        }
      } catch (error) {
        console.error('Error importing from Excel:', error);
        toast.error('Có lỗi xảy ra khi import dữ liệu');
      }
    },
    [fetchProducts]
  );

  return {
    products,
    loading,
    addProduct,
    addMultipleProducts,
    updateProduct,
    copyProduct,
    deleteProduct,
    deleteMultipleProducts,
    removeDuplicateIndices,
    importFromExcel,
    generateProductId,
    generateMultipleProductIds,
    refreshProducts: fetchProducts,
  };
};
