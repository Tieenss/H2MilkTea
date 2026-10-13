import { useState, useEffect } from 'react';
import type { Supplier, SupplierFormData, SupplierStats } from '../types/supplier';
import { JsonFileManager } from '@/utils/jsonFileManager';

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SupplierStats>({
    tongNhaCungCap: 0,
    dangHopTac: 0,
    tamNgung: 0,
    ngungHopTac: 0,
    tongGiaTriDatHang: 0,
    trungBinhDanhGia: 0
  });

  // Fetch suppliers from JSON file
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await JsonFileManager.fetchDataFromJson<Supplier>('NHACUNGCAP');
      setSuppliers(data);
      calculateStats(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (suppliersData: Supplier[]) => {
    const stats = {
      tongNhaCungCap: suppliersData.length,
      dangHopTac: suppliersData.filter(s => s.TrangThai === 'Đang hợp tác').length,
      tamNgung: suppliersData.filter(s => s.TrangThai === 'Tạm ngưng').length,
      ngungHopTac: suppliersData.filter(s => s.TrangThai === 'Ngừng hợp tác').length,
      tongGiaTriDatHang: suppliersData.reduce((total, supplier) => {
        return total + supplier.LichSuDatHang.reduce((sum, order) => sum + order.TongTien, 0);
      }, 0),
      trungBinhDanhGia: suppliersData.length > 0 
        ? suppliersData.reduce((sum, supplier) => sum + supplier.DanhGia, 0) / suppliersData.length 
        : 0
    };
    setStats(stats);
  };

  // Add new supplier
  const addSupplier = async (formData: SupplierFormData) => {
    try {
      const newSupplier: Supplier = {
        IDNhaCungCap: `NCC${String(suppliers.length + 1).padStart(3, '0')}`,
        ...formData,
        LichSuDatHang: []
      };

      const updatedSuppliers = [...suppliers, newSupplier];
      setSuppliers(updatedSuppliers);
      calculateStats(updatedSuppliers);

      // Save to JSON file (in real app, this would be an API call)
      await saveSuppliersToFile(updatedSuppliers);
    } catch (error) {
      console.error('Error adding supplier:', error);
      throw error;
    }
  };

  // Update supplier
  const updateSupplier = async (supplierId: string, formData: SupplierFormData) => {
    try {
      const updatedSuppliers = suppliers.map(supplier => 
        supplier.IDNhaCungCap === supplierId 
          ? { ...supplier, ...formData }
          : supplier
      );
      
      setSuppliers(updatedSuppliers);
      calculateStats(updatedSuppliers);

      // Save to JSON file (in real app, this would be an API call)
      await saveSuppliersToFile(updatedSuppliers);
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  };

  // Delete supplier
  const deleteSupplier = async (supplierId: string) => {
    try {
      const updatedSuppliers = suppliers.filter(supplier => supplier.IDNhaCungCap !== supplierId);
      setSuppliers(updatedSuppliers);
      calculateStats(updatedSuppliers);

      // Save to JSON file (in real app, this would be an API call)
      await saveSuppliersToFile(updatedSuppliers);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  };

  // Save suppliers to file (simulated)
  const saveSuppliersToFile = async (suppliersData: Supplier[]) => {
    // In a real application, this would be an API call to save data
    // For now, we'll just simulate the save operation
    console.log('Saving suppliers to file:', suppliersData);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  // Load suppliers on component mount
  useEffect(() => {
    fetchSuppliers();
  }, []);

  return {
    suppliers,
    loading,
    stats,
    fetchSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier
  };
} 