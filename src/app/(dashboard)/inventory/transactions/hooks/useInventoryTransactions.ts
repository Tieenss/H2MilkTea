import { useState, useEffect, useCallback } from 'react';
import { InventoryTransaction, InventoryTransactionFormData, InventoryStats } from '../types/inventory';
import { generateTransactionId, calculateTotalAmount } from '../utils/formatters';
import authUtils from '@/utils/authUtils';
import { JsonFileManager } from '@/utils/jsonFileManager';

export const useInventoryTransactions = () => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<InventoryStats>({
    tongNhap: 0,
    tongXuat: 0,
    tonKho: 0,
    giaTriTonKho: 0,
    soGiaoDichThang: 0,
    soGiaoDichNgay: 0
  });

  // Fetch transactions from JSON file
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await JsonFileManager.fetchDataFromJson<InventoryTransaction>('NHAPXUATKHO');
      setTransactions(data);
      calculateStats(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate statistics
  const calculateStats = useCallback((data: InventoryTransaction[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();

    const monthlyTransactions = data.filter(t => {
      const transactionDate = new Date(t.NgayGiaoDich);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });

    const dailyTransactions = data.filter(t => {
      const transactionDate = new Date(t.NgayGiaoDich);
      return transactionDate.getDate() === currentDay &&
             transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });

    const tongNhap = data
      .filter(t => t.LoaiGiaoDich === 'Nhập kho')
      .reduce((sum, t) => sum + t.TongTien, 0);

    const tongXuat = data
      .filter(t => t.LoaiGiaoDich === 'Xuất kho')
      .reduce((sum, t) => sum + t.TongTien, 0);

    setStats({
      tongNhap,
      tongXuat,
      tonKho: tongNhap - tongXuat,
      giaTriTonKho: tongNhap - tongXuat,
      soGiaoDichThang: monthlyTransactions.length,
      soGiaoDichNgay: dailyTransactions.length
    });
  }, []);

  // Add new transaction
  const addTransaction = useCallback(async (formData: InventoryTransactionFormData) => {
    try {
      const userData = authUtils.getUserData();
      if (!userData) {
        throw new Error('User not authenticated');
      }

      const newTransaction: InventoryTransaction = {
        IDGiaoDich: generateTransactionId(),
        LoaiGiaoDich: formData.LoaiGiaoDich,
        NgayGiaoDich: new Date().toLocaleString('vi-VN'),
        NhaCungCap: formData.NhaCungCap,
        NhanVienThucHien: userData['Họ và Tên'] || userData.username,
        GhiChu: formData.GhiChu,
        TongTien: calculateTotalAmount(formData.ChiTiet),
        TrangThai: 'Hoàn thành',
        ChiTiet: formData.ChiTiet.map(detail => ({
          ...detail,
          ThanhTien: detail.SoLuong * detail.DonGia
        }))
      };

      // In a real app, you would save to backend here
      // For now, we'll just add to local state
      setTransactions(prev => {
        const updated = [newTransaction, ...prev];
        calculateStats(updated);
        return updated;
      });

      return newTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  }, []);

  // Update transaction
  const updateTransaction = useCallback(async (transactionId: string, formData: InventoryTransactionFormData) => {
    try {
      setTransactions(prev => {
        const updated = prev.map(t => 
          t.IDGiaoDich === transactionId 
            ? {
                ...t,
                LoaiGiaoDich: formData.LoaiGiaoDich,
                NhaCungCap: formData.NhaCungCap,
                GhiChu: formData.GhiChu,
                TongTien: calculateTotalAmount(formData.ChiTiet),
                ChiTiet: formData.ChiTiet.map(detail => ({
                  ...detail,
                  ThanhTien: detail.SoLuong * detail.DonGia
                }))
              }
            : t
        );
        calculateStats(updated);
        return updated;
      });
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }, []);

  // Delete transaction
  const deleteTransaction = useCallback(async (transactionId: string) => {
    try {
      setTransactions(prev => {
        const updated = prev.filter(t => t.IDGiaoDich !== transactionId);
        calculateStats(updated);
        return updated;
      });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }, []);

  // Load initial data
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    stats,
    fetchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction
  };
}; 