'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Stocktake, StocktakeFormData, StocktakeStats, StocktakeAlert } from '../types/stocktake';
import { generateStocktakeId, calculateTotalValue, calculateDiscrepancyValue } from '../utils/formatters';
import { JsonFileManager } from '@/utils/jsonFileManager';

export function useStocktake() {
  const [stocktakes, setStocktakes] = useState<Stocktake[]>([]);
  const [alerts, setAlerts] = useState<StocktakeAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StocktakeStats>({
    TongKiemKe: 0,
    HoanThanh: 0,
    DangThucHien: 0,
    ChoThucHien: 0,
    CoChenhLech: 0,
    TyLeChinhXac: 0,
    GiaTriTonKho: 0,
    TongGiaTriChenhLech: 0,
    SoMatHangChenhLech: 0
  });

  // Fetch stocktakes from JSON file
  const fetchStocktakes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await JsonFileManager.fetchDataFromJson<any>('KIEMKEKHO');
      
      // Transform data to match Stocktake interface
      const transformedData: Stocktake[] = data.map((item: any) => ({
        IDKiemKe: item.IDKiemKe,
        NgayKiemKe: item.NgayKiemKe,
        LoaiKiemKe: item.LoaiKiemKe,
        NhanVienThucHien: item.NhanVienThucHien,
        TrangThai: item.TrangThai,
        GhiChu: item.GhiChu,
        TongMatHang: item.TongMatHang,
        TongGiaTri: item.TongGiaTri,
        ChiTiet: item.ChiTiet
      }));
      
      setStocktakes(transformedData);
      
      // Generate alerts based on data
      const generatedAlerts: StocktakeAlert[] = [];
      
      // Check for overdue stocktakes
      const today = new Date();
      const overdueStocktakes = transformedData.filter(s => {
        if (!s.NgayKiemKe) return false;
        try {
          const stocktakeDate = new Date(s.NgayKiemKe.split('/').reverse().join('-'));
          const daysDiff = Math.floor((today.getTime() - stocktakeDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysDiff > 30 && s.TrangThai === 'Hoàn thành';
        } catch (error) {
          console.warn('Invalid date format for stocktake:', s.IDKiemKe, s.NgayKiemKe);
          return false;
        }
      });
      
      if (overdueStocktakes.length > 0) {
        generatedAlerts.push({
          id: 'CB001',
          type: 'warning',
          message: `Có ${overdueStocktakes.length} kiểm kê cần thực hiện trong tuần tới`,
          date: today.toISOString().split('T')[0],
          isRead: false
        });
      }
      
      // Check for discrepancies
      const stocktakesWithDiscrepancy = transformedData.filter(s => 
        s.ChiTiet.some(item => item.ChenhLech !== 0)
      );
      
      if (stocktakesWithDiscrepancy.length > 0) {
        generatedAlerts.push({
          id: 'CB002',
          type: 'error',
          message: `Có ${stocktakesWithDiscrepancy.length} kiểm kê có chênh lệch, cần kiểm tra lại`,
          date: today.toISOString().split('T')[0],
          isRead: false
        });
      }
      
      setAlerts(generatedAlerts);
    } catch (error) {
      console.error('Error fetching stocktakes:', error);
      setStocktakes([]);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate stats
  const calculateStats = useCallback((data: Stocktake[]) => {
    const TongKiemKe = data.length;
    const HoanThanh = data.filter(s => s.TrangThai === 'Hoàn thành').length;
    const DangThucHien = data.filter(s => s.TrangThai === 'Đang thực hiện').length;
    const ChoThucHien = data.filter(s => s.TrangThai === 'Chờ thực hiện').length;
    
    const TongGiaTriChenhLech = data.reduce((sum, s) => 
      sum + s.ChiTiet.reduce((itemSum, item) => itemSum + item.GiaTriChenhLech, 0), 0
    );
    
    const SoMatHangChenhLech = data.reduce((sum, s) => 
      sum + s.ChiTiet.filter(item => item.ChenhLech !== 0).length, 0
    );

    // Calculate additional stats
    const CoChenhLech = data.filter(s => s.ChiTiet.some(item => item.ChenhLech !== 0)).length;
    const TyLeChinhXac = TongKiemKe > 0 ? Math.round(((TongKiemKe - CoChenhLech) / TongKiemKe) * 100) : 0;
    const GiaTriTonKho = data.reduce((sum, s) => sum + s.TongGiaTri, 0);

    setStats({
      TongKiemKe,
      HoanThanh,
      DangThucHien,
      ChoThucHien,
      CoChenhLech,
      TyLeChinhXac,
      GiaTriTonKho,
      TongGiaTriChenhLech,
      SoMatHangChenhLech
    });
  }, []);

  // Add new stocktake
  const addStocktake = useCallback(async (formData: StocktakeFormData) => {
    setLoading(true);
    try {
      const newStocktake: Stocktake = {
        IDKiemKe: generateStocktakeId(),
        NgayKiemKe: new Date().toLocaleDateString('vi-VN'),
        LoaiKiemKe: formData.LoaiKiemKe as any,
        NhanVienThucHien: 'Người dùng hiện tại', // TODO: Get from auth
        TrangThai: 'Chờ thực hiện',
        GhiChu: formData.GhiChu,
        TongMatHang: formData.ChiTiet.length,
        TongGiaTri: calculateTotalValue({
          ...formData,
          IDKiemKe: '',
          NgayKiemKe: '',
          LoaiKiemKe: formData.LoaiKiemKe as any,
          NhanVienThucHien: '',
          TrangThai: 'Chờ thực hiện',
          TongMatHang: 0,
          TongGiaTri: 0,
          ChiTiet: formData.ChiTiet
        } as Stocktake),
        ChiTiet: formData.ChiTiet
      };

      setStocktakes(prev => [newStocktake, ...prev]);
      return newStocktake;
    } catch (error) {
      console.error('Error adding stocktake:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update stocktake
  const updateStocktake = useCallback(async (stocktakeId: string, formData: StocktakeFormData) => {
    setLoading(true);
    try {
      const updatedStocktake: Stocktake = {
        IDKiemKe: stocktakeId,
        NgayKiemKe: new Date().toLocaleDateString('vi-VN'),
        LoaiKiemKe: formData.LoaiKiemKe as any,
        NhanVienThucHien: 'Người dùng hiện tại', // TODO: Get from auth
        TrangThai: 'Đang thực hiện',
        GhiChu: formData.GhiChu,
        TongMatHang: formData.ChiTiet.length,
        TongGiaTri: calculateTotalValue({
          ...formData,
          IDKiemKe: stocktakeId,
          NgayKiemKe: '',
          LoaiKiemKe: formData.LoaiKiemKe as any,
          NhanVienThucHien: '',
          TrangThai: 'Đang thực hiện',
          TongMatHang: 0,
          TongGiaTri: 0,
          ChiTiet: formData.ChiTiet
        } as Stocktake),
        ChiTiet: formData.ChiTiet
      };

      setStocktakes(prev => 
        prev.map(s => s.IDKiemKe === stocktakeId ? updatedStocktake : s)
      );
      return updatedStocktake;
    } catch (error) {
      console.error('Error updating stocktake:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete stocktake
  const deleteStocktake = useCallback(async (stocktakeId: string) => {
    setLoading(true);
    try {
      setStocktakes(prev => prev.filter(s => s.IDKiemKe !== stocktakeId));
    } catch (error) {
      console.error('Error deleting stocktake:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark alert as read
  const markAlertAsRead = useCallback(async (alertId: string) => {
    try {
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, isRead: true }
            : alert
        )
      );
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  }, []);

  // Dismiss alert
  const dismissAlert = useCallback(async (alertId: string) => {
    try {
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchStocktakes();
  }, [fetchStocktakes]);

  // Recalculate stats when stocktakes change
  useEffect(() => {
    calculateStats(stocktakes);
  }, [stocktakes, calculateStats]);

  return {
    stocktakes,
    alerts,
    loading,
    stats,
    fetchStocktakes,
    addStocktake,
    updateStocktake,
    deleteStocktake,
    markAlertAsRead,
    dismissAlert
  };
} 