import { useState, useEffect } from 'react';
import type { Supplier, SupplierFormData, SupplierStats } from '../types/supplier';
import { JsonFileManager } from '@/utils/jsonFileManager';
import authUtils from '@/utils/authUtils';

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

  // Fetch suppliers from database/JSON
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await JsonFileManager.fetchDataFromJson<Supplier>('NHACUNGCAP');
      const list = Array.isArray(data) ? data : [];
      setSuppliers(list);
      calculateStats(list);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (suppliersData: Supplier[]) => {
    const list = Array.isArray(suppliersData) ? suppliersData : [];
    const nextStats = {
      tongNhaCungCap: list.length,
      dangHopTac: list.filter(s => s?.TrangThai === 'Đang hợp tác').length,
      tamNgung: list.filter(s => s?.TrangThai === 'Tạm ngưng').length,
      ngungHopTac: list.filter(s => s?.TrangThai === 'Ngừng hợp tác').length,
      tongGiaTriDatHang: list.reduce((total, supplier) => {
        const history = Array.isArray(supplier?.LichSuDatHang) ? supplier.LichSuDatHang : [];
        return total + history.reduce((sum, order) => sum + (Number(order?.TongTien) || 0), 0);
      }, 0),
      trungBinhDanhGia: list.length > 0
        ? list.reduce((sum, supplier) => sum + (Number(supplier?.DanhGia) || 5), 0) / list.length
        : 5.0
    };
    setStats(nextStats);
  };

  // Add new supplier
  const addSupplier = async (formData: SupplierFormData) => {
    try {
      const existingIds = new Set(suppliers.map(s => s.IDNhaCungCap));
      let counter = suppliers.length + 1;
      let nextId = `NCC${String(counter).padStart(3, '0')}`;
      while (existingIds.has(nextId)) {
        counter++;
        nextId = `NCC${String(counter).padStart(3, '0')}`;
      }

      const newSupplier: Supplier = {
        IDNhaCungCap: nextId,
        ...formData,
        LichSuDatHang: []
      };

      await authUtils.apiRequest('NHACUNGCAP', 'create', newSupplier).catch(() => null);

      const updatedSuppliers = [...suppliers, newSupplier];
      setSuppliers(updatedSuppliers);
      calculateStats(updatedSuppliers);
    } catch (error) {
      console.error('Error adding supplier:', error);
      throw error;
    }
  };

  // Update supplier
  const updateSupplier = async (supplierId: string, formData: SupplierFormData) => {
    try {
      await authUtils
        .apiRequest('NHACUNGCAP', 'update', { IDNhaCungCap: supplierId, ...formData })
        .catch(() => null);

      const updatedSuppliers = suppliers.map(supplier =>
        supplier.IDNhaCungCap === supplierId
          ? { ...supplier, ...formData }
          : supplier
      );

      setSuppliers(updatedSuppliers);
      calculateStats(updatedSuppliers);
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  };

  // Delete supplier
  const deleteSupplier = async (supplierId: string) => {
    try {
      await authUtils
        .apiRequest('NHACUNGCAP', 'delete', { IDNhaCungCap: supplierId })
        .catch(() => null);

      const updatedSuppliers = suppliers.filter(supplier => supplier.IDNhaCungCap !== supplierId);
      setSuppliers(updatedSuppliers);
      calculateStats(updatedSuppliers);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
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
