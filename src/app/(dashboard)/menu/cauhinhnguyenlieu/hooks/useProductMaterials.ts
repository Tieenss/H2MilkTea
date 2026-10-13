'use client';

import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { ProductMaterial, ProductMaterialFormData, Product, Material } from '../types/productMaterial';
import authUtils from '@/utils/authUtils';

export const useProductMaterials = () => {
  const [productMaterials, setProductMaterials] = useState<ProductMaterial[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all data concurrently using the correct API methods
      const [configsResponse, productsResponse, materialsResponse] = await Promise.all([
        authUtils.apiRequest('CAUHINH', 'getall', {}),
        authUtils.apiRequest('DMHH', 'getall', {}), // Sửa từ 'Sản phẩm' thành 'DMHH'
        authUtils.apiRequest('NGUYENLIEU', 'getall', {})
      ]);

      // Process responses
      const configs = Array.isArray(configsResponse) ? configsResponse : [];
      const productsData = Array.isArray(productsResponse) ? productsResponse : [];
      const materialsData = Array.isArray(materialsResponse) ? materialsResponse : [];

      // Combine data with additional info
      const enrichedConfigs = configs.map((config: any) => {
        const product = productsData.find((p: any) => p.IDSP === config.IDSP);
        const material = materialsData.find((m: any) => m.IDNguyenLieu === config.IDNguyenLieu);
        
        // Check if this is a self-config (product as material)
        const isSelfConfig = config.IDSP === config.IDNguyenLieu;
        const materialInfo = isSelfConfig ? product : material;
        
        return {
          ...config,
          'Tên sản phẩm': product?.['Tên sản phẩm'] || 'Không tìm thấy',
          'Tên nguyên liệu': isSelfConfig 
            ? product?.['Tên sản phẩm'] || 'Không tìm thấy'
            : material?.['Tên nguyên liệu'] || 'Không tìm thấy',
          'Đơn vị gốc': materialInfo?.['Đơn vị cơ sở'] || materialInfo?.['Đơn vị tính'] || 'Sản phẩm',
          'Hệ số quy đổi': materialInfo?.['Hệ số quy đổi'] || 1,
          'Số lượng quy đổi': (config['Số lượng cần'] || 0) * (materialInfo?.['Hệ số quy đổi'] || 1),
          'Loại cấu hình': isSelfConfig ? 'Tự động' : 'Thông thường'
        };
      });

      setProductMaterials(enrichedConfigs);
      setProducts(productsData);
      setMaterials(materialsData);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateConfigId = useCallback(() => {
    const existingIds = productMaterials.map(config => config.IDCauHinh);
    let newId = 'CFG001';
    let counter = 1;
    
    while (existingIds.includes(newId)) {
      counter++;
      newId = `CFG${counter.toString().padStart(3, '0')}`;
    }
    
    return newId;
  }, [productMaterials]);

  const addProductMaterial = useCallback(async (formData: ProductMaterialFormData) => {
    try {
      if (!formData.IDCauHinh) {
        formData.IDCauHinh = generateConfigId();
      }

      // Check for existing configuration
      const exists = productMaterials.some(config =>
        config.IDSP === formData.IDSP && config.IDNguyenLieu === formData.IDNguyenLieu
      );

      if (exists) {
        toast.error('Cấu hình này đã tồn tại cho sản phẩm và nguyên vật liệu này!');
        return;
      }

      // Determine config type
      const isSelfConfig = formData.IDSP === formData.IDNguyenLieu;
      
      const configData = {
        ...formData,
        'Loại cấu hình': isSelfConfig ? 'Tự động' : 'Thông thường',
        'Ngày tạo': new Date().toISOString(),
        'Ngày cập nhật': new Date().toISOString()
      };

      const result = await authUtils.apiRequest('CAUHINH', 'create', configData);
      
      if (!Array.isArray(result) && result.success) {
        // Refresh data to get enriched info
        fetchAllData();
        
        const successMessage = isSelfConfig 
          ? 'Thêm cấu hình tự động thành công!'
          : 'Thêm cấu hình nguyên vật liệu thành công!';
        toast.success(successMessage);
      } else if (!Array.isArray(result)) {
        throw new Error(result.message || 'Lỗi khi thêm cấu hình');
      } else {
        throw new Error('Lỗi khi thêm cấu hình');
      }
    } catch (error: any) {
      console.error('Error adding config:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi thêm cấu hình');
    }
  }, [productMaterials, generateConfigId, fetchAllData]);

  const updateProductMaterial = useCallback(async (configId: string, formData: ProductMaterialFormData) => {
    try {
      const isSelfConfig = formData.IDSP === formData.IDNguyenLieu;
      
      const updateData = {
        ...formData,
        IDCauHinh: configId,
        'Loại cấu hình': isSelfConfig ? 'Tự động' : 'Thông thường',
        'Ngày cập nhật': new Date().toISOString()
      };

      const result = await authUtils.apiRequest('CAUHINH', 'update', updateData);
      
      if (!Array.isArray(result) && result.success) {
        fetchAllData();
        toast.success('Cập nhật cấu hình thành công!');
      } else if (!Array.isArray(result)) {
        throw new Error(result.message || 'Lỗi khi cập nhật cấu hình');
      } else {
        throw new Error('Lỗi khi cập nhật cấu hình');
      }
    } catch (error: any) {
      console.error('Error updating config:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi cập nhật cấu hình');
    }
  }, [fetchAllData]);

  const deleteProductMaterial = useCallback(async (configId: string) => {
    const originalConfigs = productMaterials;
    const config = productMaterials.find(c => c.IDCauHinh === configId);
    const configName = config ? `${config['Tên sản phẩm']} - ${config['Tên nguyên liệu']}` : '';
    const isSelfConfig = config?.IDSP === config?.IDNguyenLieu;

    try {
      // Optimistic update
      setProductMaterials(prev => prev.filter(config => config.IDCauHinh !== configId));
      
      const toastId = toast.loading('Đang xóa cấu hình...');
      
      const result = await authUtils.apiRequest('CAUHINH', 'delete', { IDCauHinh: configId });
      
      if (!Array.isArray(result) && result.success) {
        const successMessage = isSelfConfig 
          ? `Xóa cấu hình tự động "${configName}" thành công!`
          : `Xóa cấu hình "${configName}" thành công!`;
        toast.success(successMessage, { id: toastId });
      } else {
        // Rollback on error
        setProductMaterials(originalConfigs);
        throw new Error((!Array.isArray(result) && result.message) || 'Lỗi khi xóa cấu hình');
      }
    } catch (error: any) {
      // Rollback on error
      setProductMaterials(originalConfigs);
      console.error('Error deleting config:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi xóa cấu hình');
    }
  }, [productMaterials]);

  // Helper function to get available materials for a product (including self-config)
  const getAvailableMaterialsForProduct = useCallback((productId: string) => {
    const existingConfigs = productMaterials.filter(config => config.IDSP === productId);
    const usedMaterialIds = existingConfigs.map(config => config.IDNguyenLieu);
    
    // Available regular materials
    const availableMaterials = materials.filter(material => 
      !usedMaterialIds.includes(material.IDNguyenLieu)
    );
    
    // Check if self-config is available
    const selfConfigAvailable = !usedMaterialIds.includes(productId);
    const product = products.find(p => p.IDSP === productId);
    
    const result = {
      materials: availableMaterials,
      selfConfigAvailable,
      product
    };
    
    return result;
  }, [productMaterials, materials, products]);

  // Get statistics for self-config vs regular configs
  const getConfigStats = useCallback(() => {
    const totalConfigs = productMaterials.length;
    const selfConfigs = productMaterials.filter(config => config.IDSP === config.IDNguyenLieu).length;
    const regularConfigs = totalConfigs - selfConfigs;
    
    return {
      total: totalConfigs,
      selfConfig: selfConfigs,
      regular: regularConfigs,
      selfConfigPercentage: totalConfigs > 0 ? (selfConfigs / totalConfigs) * 100 : 0
    };
  }, [productMaterials]);

  return {
    productMaterials,
    products,
    materials,
    loading,
    addProductMaterial,
    updateProductMaterial,
    deleteProductMaterial,
    generateConfigId,
    fetchAllData,
    getAvailableMaterialsForProduct,
    getConfigStats
  };
};