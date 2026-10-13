'use client';

import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { Material, MaterialFormData } from '../types/material';
import authUtils from '@/utils/authUtils';

export const useMaterials = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch materials on mount
  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true);
      // Sử dụng getAllNguyenLieu hoặc apiRequest với table NGUYENLIEU
      const response = await authUtils.apiRequest('NGUYENLIEU', 'getall', {});
      if (Array.isArray(response)) {
        setMaterials(response);
      } else if (response && response.success && Array.isArray(response.data)) {
        setMaterials(response.data);
      } else {
        setMaterials([]);
      }
    } catch (error) {
      console.error('Error fetching material list:', error);
      toast.error('Lỗi khi tải danh sách nguyên vật liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateMaterialId = useCallback(() => {
    const existingIds = materials.map(m => m.IDNguyenLieu);
    let newId = 'NVL001';
    let counter = 1;
    
    while (existingIds.includes(newId)) {
      counter++;
      newId = `NVL${counter.toString().padStart(3, '0')}`;
    }
    
    return newId;
  }, [materials]);

  const generateMultipleMaterialIds = useCallback((count: number) => {
    const existingIds = materials.map(m => m.IDNguyenLieu);
    const newIds: string[] = [];
    let counter = 1;
    
    while (newIds.length < count) {
      const newId = `NVL${counter.toString().padStart(3, '0')}`;
      if (!existingIds.includes(newId) && !newIds.includes(newId)) {
        newIds.push(newId);
      }
      counter++;
    }
    
    return newIds;
  }, [materials]);

  const addMaterial = useCallback(async (formData: MaterialFormData) => {
    try {
      // Generate ID if not provided
      if (!formData.IDNguyenLieu) {
        formData.IDNguyenLieu = generateMaterialId();
      }

      // Check for existing material ID
      const exists = materials.some(material =>
        material.IDNguyenLieu.toLowerCase() === formData.IDNguyenLieu.toLowerCase()
      );

      if (exists) {
        toast.error('Mã nguyên vật liệu này đã tồn tại!');
        return;
      }

      const result = await authUtils.apiRequest('NGUYENLIEU', 'create', formData);
      
      if (!Array.isArray(result) && result.success) {
        // Add to state immediately
        setMaterials(prev => [...prev, formData as Material]);
        toast.success('Thêm nguyên vật liệu mới thành công!');
      } else if (!Array.isArray(result)) {
        throw new Error(result.message || 'Lỗi khi thêm nguyên vật liệu');
      } else {
        throw new Error('Lỗi khi thêm nguyên vật liệu');
      }
    } catch (error: any) {
      console.error('Error adding material:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi thêm nguyên vật liệu');
    }
  }, [materials, generateMaterialId]);

  const addMultipleMaterials = useCallback(async (materialsData: MaterialFormData[]) => {
    try {
      const toastId = toast.loading(`Đang thêm ${materialsData.length} nguyên vật liệu...`);
      
      const newIds = generateMultipleMaterialIds(materialsData.filter(m => !m.IDNguyenLieu).length);
      let idIndex = 0;
      
      const processedData = materialsData.map(material => {
        if (!material.IDNguyenLieu) {
          material.IDNguyenLieu = newIds[idIndex++];
        }
        return material;
      });

      const existingIds = materials.map(m => m.IDNguyenLieu);
      const duplicateIds = processedData.filter(material => 
        existingIds.includes(material.IDNguyenLieu)
      );

      if (duplicateIds.length > 0) {
        toast.error(`Các mã nguyên vật liệu sau đã tồn tại: ${duplicateIds.map(m => m.IDNguyenLieu).join(', ')}`, { id: toastId });
        return false;
      }

      // Add materials one by one
      for (const materialData of processedData) {
        const result = await authUtils.apiRequest('NGUYENLIEU', 'create', materialData);
        if (!Array.isArray(result) && !result.success) {
          throw new Error(`Lỗi khi thêm nguyên vật liệu ${materialData.IDNguyenLieu}: ${result.message}`);
        } else if (Array.isArray(result)) {
          throw new Error(`Lỗi khi thêm nguyên vật liệu ${materialData.IDNguyenLieu}: Kết quả trả về không hợp lệ`);
        }
      }

      setMaterials(prev => [...prev, ...processedData as Material[]]);
      toast.success(`Đã thêm thành công ${materialsData.length} nguyên vật liệu!`, { id: toastId });
      
      return true;
    } catch (error: any) {
      console.error('Error adding multiple materials:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi thêm nguyên vật liệu');
      return false;
    }
  }, [materials, generateMultipleMaterialIds]);

  const updateMaterial = useCallback(async (materialId: string, formData: MaterialFormData) => {
    try {
      const result = await authUtils.apiRequest('NGUYENLIEU', 'update', { ...formData, IDNguyenLieu: materialId });
      
      if (!Array.isArray(result) && result.success) {
        setMaterials(prev => prev.map(material =>
          material.IDNguyenLieu === materialId ? { ...material, ...formData } : material
        ));
        toast.success('Cập nhật thông tin nguyên vật liệu thành công!');
      } else if (!Array.isArray(result)) {
        throw new Error(result.message || 'Lỗi khi cập nhật nguyên vật liệu');
      } else {
        throw new Error('Lỗi khi cập nhật nguyên vật liệu');
      }
    } catch (error: any) {
      console.error('Error updating material:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi cập nhật nguyên vật liệu');
    }
  }, []);

  const copyMaterial = useCallback(async (material: Material) => {
    try {
      const newMaterial = {
        ...material,
        IDNguyenLieu: generateMaterialId(),
        'Tên nguyên liệu': `${material['Tên nguyên liệu']} (Copy)`
      };

      const result = await authUtils.apiRequest('NGUYENLIEU', 'create', newMaterial);
      
      if (!Array.isArray(result) && result.success) {
        setMaterials(prev => [...prev, newMaterial]);
        toast.success('Sao chép nguyên vật liệu thành công!');
      } else if (!Array.isArray(result)) {
        throw new Error(result.message || 'Lỗi khi sao chép nguyên vật liệu');
      } else {
        throw new Error('Lỗi khi sao chép nguyên vật liệu');
      }
    } catch (error: any) {
      console.error('Error copying material:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi sao chép nguyên vật liệu');
    }
  }, [generateMaterialId]);

  const deleteMaterial = useCallback(async (materialId: string) => {
    const originalMaterials = materials;
    const materialName = materials.find(material => material.IDNguyenLieu === materialId)?.['Tên nguyên liệu'] || '';

    try {
      // Optimistic update
      setMaterials(prev => prev.filter(material => material.IDNguyenLieu !== materialId));
      
      const toastId = toast.loading('Đang xóa nguyên vật liệu...');
      
      const result = await authUtils.apiRequest('NGUYENLIEU', 'delete', { IDNguyenLieu: materialId });
      
      if (!Array.isArray(result) && result.success) {
        toast.success(`Xóa nguyên vật liệu "${materialName}" thành công!`, { id: toastId });
      } else {
        // Rollback on error
        setMaterials(originalMaterials);
        throw new Error((!Array.isArray(result) && result.message) || 'Lỗi khi xóa nguyên vật liệu');
      }
    } catch (error: any) {
      // Rollback on error
      setMaterials(originalMaterials);
      console.error('Error deleting material:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi xóa nguyên vật liệu');
    }
  }, [materials]);

  const deleteMultipleMaterials = useCallback(async (materialIds: string[]) => {
    const originalMaterials = materials;
    
    try {
      // Optimistic update
      setMaterials(prev => prev.filter(material => !materialIds.includes(material.IDNguyenLieu)));
      
      const toastId = toast.loading(`Đang xóa ${materialIds.length} nguyên vật liệu...`);
      
      // Delete multiple materials using bulk delete
      await authUtils.apiRequest('NGUYENLIEU', 'Delete', {
        "Rows": materialIds.map(id => ({ "IDNguyenLieu": id }))
      });

      toast.success(`Đã xóa thành công ${materialIds.length} nguyên vật liệu!`, { id: toastId });
      return true;
    } catch (error) {
      // Rollback on error
      setMaterials(originalMaterials);
      console.error('Error deleting multiple materials:', error);
      toast.error('Có lỗi xảy ra khi xóa nguyên vật liệu');
      return false;
    }
  }, [materials]);

  const importFromExcel = useCallback(async (file: File) => {
    try {
      const toastId = toast.loading('Đang import dữ liệu...');
      
      toast.success('Import dữ liệu thành công!', { id: toastId });
      fetchMaterials();
    } catch (error) {
      console.error('Error importing from Excel:', error);
      toast.error('Có lỗi xảy ra khi import dữ liệu');
    }
  }, [fetchMaterials]);

  return {
    materials,
    loading,
    addMaterial,
    addMultipleMaterials,
    updateMaterial,
    copyMaterial,
    deleteMaterial,
    deleteMultipleMaterials,
    importFromExcel,
    generateMaterialId,
    generateMultipleMaterialIds
  };
};