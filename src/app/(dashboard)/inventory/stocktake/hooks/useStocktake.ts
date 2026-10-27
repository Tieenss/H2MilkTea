'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Stocktake, StocktakeFormData, StocktakeStats, StocktakeAlert } from '../types/stocktake';
import { generateStocktakeId, calculateTotalValue } from '../utils/formatters';
import { JsonFileManager } from '@/utils/jsonFileManager';
import authUtils from '@/utils/authUtils';
import toast from 'react-hot-toast';

const READ_ALERTS_KEY = 'h2_stocktake_read_alerts';
const DISMISSED_ALERTS_KEY = 'h2_stocktake_dismissed_alerts';

function getStoredSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveStoredSet(key: string, set: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore storage error
  }
}

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
    SoMatHangChenhLech: 0,
  });

  const fetchStocktakes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await JsonFileManager.fetchDataFromJson<any>('KIEMKEKHO');

      const transformedData: Stocktake[] = data.map((item: any) => ({
        IDKiemKe: item.IDKiemKe,
        NgayKiemKe: item.NgayKiemKe,
        LoaiKiemKe: item.LoaiKiemKe,
        NhanVienThucHien: item.NhanVienThucHien,
        TrangThai: item.TrangThai,
        GhiChu: item.GhiChu || '',
        TongMatHang: Number(item.TongMatHang) || (Array.isArray(item.ChiTiet) ? item.ChiTiet.length : 0),
        TongGiaTri: Number(item.TongGiaTri) || 0,
        ChiTiet: Array.isArray(item.ChiTiet) ? item.ChiTiet : [],
      }));

      setStocktakes(transformedData);

      const readSet = getStoredSet(READ_ALERTS_KEY);
      const dismissedSet = getStoredSet(DISMISSED_ALERTS_KEY);
      const generatedAlerts: StocktakeAlert[] = [];
      const today = new Date();
      const todayIso = today.toISOString();

      // 1. Cảnh báo kiểm kê quá hạn (> 30 ngày)
      const overdueStocktakes = transformedData.filter((s) => {
        if (!s.NgayKiemKe) return false;
        const stocktakeDate = authUtils.parseFlexibleDate(s.NgayKiemKe);
        if (!stocktakeDate) return false;
        const daysDiff = Math.floor(
          (today.getTime() - stocktakeDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysDiff > 30 && s.TrangThai === 'Hoàn thành';
      });

      if (overdueStocktakes.length > 0 && !dismissedSet.has('CB001')) {
        const isRead = readSet.has('CB001');
        const msg = `Có ${overdueStocktakes.length} đợt kiểm kê định kỳ đã quá 30 ngày cần thực hiện lại (${overdueStocktakes
          .map((s) => s.IDKiemKe)
          .join(', ')}).`;
        generatedAlerts.push({
          id: 'CB001',
          IDCanhBao: 'CB001',
          type: 'overdue',
          LoaiCanhBao: 'overdue',
          title: 'Nhắc lịch kiểm kê định kỳ',
          TieuDe: 'Nhắc lịch kiểm kê định kỳ',
          message: msg,
          NoiDung: msg,
          date: todayIso,
          NgayTao: todayIso,
          isRead,
          DaDoc: isRead,
        });
      }

      // 2. Cảnh báo chênh lệch kiểm kê
      const stocktakesWithDiscrepancy = transformedData.filter((s) =>
        s.ChiTiet.some((item) => Number(item.ChenhLech) !== 0)
      );

      if (stocktakesWithDiscrepancy.length > 0 && !dismissedSet.has('CB002')) {
        const isRead = readSet.has('CB002');
        const msg = `Phát hiện ${stocktakesWithDiscrepancy.length} phiếu kiểm kê có chênh lệch số lượng thực tế so với sổ sách (${stocktakesWithDiscrepancy
          .map((s) => s.IDKiemKe)
          .join(', ')}).`;
        generatedAlerts.push({
          id: 'CB002',
          IDCanhBao: 'CB002',
          type: 'discrepancy',
          LoaiCanhBao: 'discrepancy',
          title: 'Cảnh báo chênh lệch tồn kho',
          TieuDe: 'Cảnh báo chênh lệch tồn kho',
          message: msg,
          NoiDung: msg,
          date: todayIso,
          NgayTao: todayIso,
          isRead,
          DaDoc: isRead,
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

  const calculateStats = useCallback((data: Stocktake[]) => {
    const TongKiemKe = data.length;
    const HoanThanh = data.filter((s) => s.TrangThai === 'Hoàn thành').length;
    const DangThucHien = data.filter((s) => s.TrangThai === 'Đang thực hiện').length;
    const ChoThucHien = data.filter((s) => s.TrangThai === 'Chờ thực hiện').length;

    const TongGiaTriChenhLech = data.reduce(
      (sum, s) =>
        sum +
        (s.ChiTiet || []).reduce(
          (itemSum, item) => itemSum + (Number(item.GiaTriChenhLech) || 0),
          0
        ),
      0
    );

    const SoMatHangChenhLech = data.reduce(
      (sum, s) =>
        sum + (s.ChiTiet || []).filter((item) => Number(item.ChenhLech) !== 0).length,
      0
    );

    const CoChenhLech = data.filter((s) =>
      (s.ChiTiet || []).some((item) => Number(item.ChenhLech) !== 0)
    ).length;
    const TyLeChinhXac =
      TongKiemKe > 0 ? Math.round(((TongKiemKe - CoChenhLech) / TongKiemKe) * 100) : 100;
    const GiaTriTonKho = data.reduce((sum, s) => sum + (Number(s.TongGiaTri) || 0), 0);

    setStats({
      TongKiemKe,
      HoanThanh,
      DangThucHien,
      ChoThucHien,
      CoChenhLech,
      TyLeChinhXac,
      GiaTriTonKho,
      TongGiaTriChenhLech,
      SoMatHangChenhLech,
    });
  }, []);

  const addStocktake = useCallback(async (formData: StocktakeFormData) => {
    setLoading(true);
    try {
      const userData = authUtils.getUserData();
      const staffName =
        formData.NhanVienThucHien ||
        userData?.['Họ và Tên'] ||
        userData?.username ||
        'Quản lý kho';

      const newStocktake: Stocktake = {
        IDKiemKe: generateStocktakeId(),
        NgayKiemKe: formData.NgayKiemKe || authUtils.formatVNDateOnly(new Date()),
        LoaiKiemKe: (formData.LoaiKiemKe as any) || 'Định kỳ',
        NhanVienThucHien: staffName,
        TrangThai: (formData.TrangThai as any) || 'Hoàn thành',
        GhiChu: formData.GhiChu || '',
        TongMatHang: formData.ChiTiet.length,
        TongGiaTri: calculateTotalValue({
          ...formData,
          IDKiemKe: '',
          NgayKiemKe: '',
          LoaiKiemKe: formData.LoaiKiemKe as any,
          NhanVienThucHien: staffName,
          TrangThai: 'Hoàn thành',
          TongMatHang: 0,
          TongGiaTri: 0,
          ChiTiet: formData.ChiTiet,
        } as Stocktake),
        ChiTiet: formData.ChiTiet,
      };

      await authUtils.addKiemKeKho(newStocktake);
      setStocktakes((prev) => [newStocktake, ...prev]);
      return newStocktake;
    } catch (error) {
      console.error('Error adding stocktake:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStocktake = useCallback(
    async (stocktakeId: string, formData: StocktakeFormData) => {
      setLoading(true);
      try {
        const userData = authUtils.getUserData();
        const staffName =
          formData.NhanVienThucHien ||
          userData?.['Họ và Tên'] ||
          userData?.username ||
          'Quản lý kho';

        const updatedStocktake: Stocktake = {
          IDKiemKe: stocktakeId,
          NgayKiemKe: formData.NgayKiemKe || authUtils.formatVNDateOnly(new Date()),
          LoaiKiemKe: (formData.LoaiKiemKe as any) || 'Định kỳ',
          NhanVienThucHien: staffName,
          TrangThai: (formData.TrangThai as any) || 'Đang thực hiện',
          GhiChu: formData.GhiChu || '',
          TongMatHang: formData.ChiTiet.length,
          TongGiaTri: calculateTotalValue({
            ...formData,
            IDKiemKe: stocktakeId,
            NgayKiemKe: '',
            LoaiKiemKe: formData.LoaiKiemKe as any,
            NhanVienThucHien: staffName,
            TrangThai: 'Đang thực hiện',
            TongMatHang: 0,
            TongGiaTri: 0,
            ChiTiet: formData.ChiTiet,
          } as Stocktake),
          ChiTiet: formData.ChiTiet,
        };

        await authUtils.updateKiemKeKho(stocktakeId, updatedStocktake);
        setStocktakes((prev) =>
          prev.map((s) => (s.IDKiemKe === stocktakeId ? updatedStocktake : s))
        );
        return updatedStocktake;
      } catch (error) {
        console.error('Error updating stocktake:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteStocktake = useCallback(async (stocktakeId: string) => {
    setLoading(true);
    try {
      await authUtils.deleteKiemKeKho(stocktakeId);
      setStocktakes((prev) => prev.filter((s) => s.IDKiemKe !== stocktakeId));
    } catch (error) {
      console.error('Error deleting stocktake:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Đánh dấu cảnh báo đã đọc và lưu bền vững vào localStorage
  const markAlertAsRead = useCallback((alertId: string) => {
    try {
      const readSet = getStoredSet(READ_ALERTS_KEY);
      readSet.add(alertId);
      saveStoredSet(READ_ALERTS_KEY, readSet);

      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId || alert.IDCanhBao === alertId
            ? { ...alert, isRead: true, DaDoc: true }
            : alert
        )
      );
      toast.success('Đã đánh dấu cảnh báo là đã đọc!');
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  }, []);

  // Xóa/Ẩn cảnh báo và lưu bền vững vào localStorage
  const dismissAlert = useCallback((alertId: string) => {
    try {
      const dismissedSet = getStoredSet(DISMISSED_ALERTS_KEY);
      dismissedSet.add(alertId);
      saveStoredSet(DISMISSED_ALERTS_KEY, dismissedSet);

      setAlerts((prev) =>
        prev.filter((alert) => alert.id !== alertId && alert.IDCanhBao !== alertId)
      );
      toast.success('Đã bỏ qua thông báo cảnh báo!');
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  }, []);

  const dismissAllAlerts = useCallback(() => {
    try {
      const dismissedSet = getStoredSet(DISMISSED_ALERTS_KEY);
      alerts.forEach((a) => {
        dismissedSet.add(a.id || a.IDCanhBao);
      });
      saveStoredSet(DISMISSED_ALERTS_KEY, dismissedSet);
      setAlerts([]);
      toast.success('Đã ẩn toàn bộ cảnh báo kiểm kê!');
    } catch (error) {
      console.error('Error dismissing all alerts:', error);
    }
  }, [alerts]);

  useEffect(() => {
    fetchStocktakes();
  }, [fetchStocktakes]);

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
    dismissAlert,
    dismissAllAlerts,
  };
}
