import { useState, useEffect } from 'react';
import type { ForecastData, ForecastStats, ForecastFilter } from '../types/forecast';
import { generateForecastData } from '../utils/formatters';
import { MATERIALS } from '../utils/constants';
import { JsonFileManager } from '@/utils/jsonFileManager';

export function useForecast() {
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ForecastStats>({
    tongDuBao: 0,
    duBaoChinhXac: 0,
    duBaoCanDieuChinh: 0,
    tyLeChinhXacTrungBinh: 0,
    tongGiaTriDuBao: 0,
    tongChenhLech: 0
  });

  // Fetch forecast data
  const fetchForecastData = async () => {
    try {
      setLoading(true);
      
      // Fetch materials and transactions data
      const [materialsData, transactionsData] = await Promise.all([
        JsonFileManager.fetchDataFromJson<any>('NGUYENLIEU'),
        JsonFileManager.fetchDataFromJson<any>('NHAPXUATKHO')
      ]);
      
      // Generate historical data from transactions
      const historicalData: { [key: string]: number[] } = {};
      
      // Group transactions by material and date
      const materialTransactions = transactionsData.reduce((acc: any, transaction: any) => {
        transaction.ChiTiet.forEach((detail: any) => {
          if (!acc[detail.IDNguyenLieu]) {
            acc[detail.IDNguyenLieu] = [];
          }
          acc[detail.IDNguyenLieu].push({
            date: transaction.NgayGiaoDich,
            quantity: detail.SoLuong,
            type: transaction.LoaiGiaoDich
          });
        });
        return acc;
      }, {});
      
      // Generate forecast data for each material
      const forecastData: ForecastData[] = [];
      
      materialsData.forEach((material: any) => {
        const materialId = material.IDNguyenLieu;
        const transactions = materialTransactions[materialId] || [];
        
        // Create historical data array (last 30 days)
        const historicalQuantities = Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          const dateStr = date.toLocaleDateString('vi-VN');
          
          const dayTransactions = transactions.filter((t: any) => 
            t.date.includes(dateStr)
          );
          
          return dayTransactions.reduce((sum: number, t: any) => {
            if (t.type === 'Nhập kho') return sum + t.quantity;
            if (t.type === 'Xuất kho') return sum - t.quantity;
            return sum;
          }, 0);
        });
        
        const forecasts = generateForecastData(
          materialId,
          material.TenNguyenLieu,
          historicalQuantities,
          30,
          'moving_average'
        );
        forecastData.push(...forecasts);
      });
      
      setForecastData(forecastData);
      calculateStats(forecastData);
    } catch (error) {
      console.error('Error fetching forecast data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (data: ForecastData[]) => {
    const stats = {
      tongDuBao: data.length,
      duBaoChinhXac: data.filter(item => item.TyLeChinhXac >= 85).length,
      duBaoCanDieuChinh: data.filter(item => item.TrangThai === 'Cần điều chỉnh').length,
      tyLeChinhXacTrungBinh: data.length > 0 
        ? data.reduce((sum, item) => sum + item.TyLeChinhXac, 0) / data.length 
        : 0,
      tongGiaTriDuBao: data.reduce((sum, item) => sum + item.GiaTriDuBao, 0),
      tongChenhLech: data.reduce((sum, item) => sum + Math.abs(item.ChenhLech), 0)
    };
    setStats(stats);
  };

  // Generate new forecast
  const generateForecast = async (filter: ForecastFilter) => {
    try {
      setLoading(true);
      
      // Fetch materials and transactions data
      const [materialsData, transactionsData] = await Promise.all([
        JsonFileManager.fetchDataFromJson<any>('NGUYENLIEU'),
        JsonFileManager.fetchDataFromJson<any>('NHAPXUATKHO')
      ]);
      
      // Group transactions by material and date
      const materialTransactions = transactionsData.reduce((acc: any, transaction: any) => {
        transaction.ChiTiet.forEach((detail: any) => {
          if (!acc[detail.IDNguyenLieu]) {
            acc[detail.IDNguyenLieu] = [];
          }
          acc[detail.IDNguyenLieu].push({
            date: transaction.NgayGiaoDich,
            quantity: detail.SoLuong,
            type: transaction.LoaiGiaoDich
          });
        });
        return acc;
      }, {});
      
      const newForecasts: ForecastData[] = [];
      
      materialsData.forEach((material: any) => {
        const materialId = material.IDNguyenLieu;
        const transactions = materialTransactions[materialId] || [];
        
        // Create historical data array (last 30 days)
        const historicalQuantities = Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          const dateStr = date.toLocaleDateString('vi-VN');
          
          const dayTransactions = transactions.filter((t: any) => 
            t.date.includes(dateStr)
          );
          
          return dayTransactions.reduce((sum: number, t: any) => {
            if (t.type === 'Nhập kho') return sum + t.quantity;
            if (t.type === 'Xuất kho') return sum - t.quantity;
            return sum;
          }, 0);
        });
        
        const forecasts = generateForecastData(
          materialId,
          material.TenNguyenLieu,
          historicalQuantities,
          filter.period,
          filter.method
        );
        newForecasts.push(...forecasts);
      });
      
      // Update existing forecasts with new ones
      const updatedData = [...forecastData.filter(item => item.TrangThai === 'Hoàn thành'), ...newForecasts];
      setForecastData(updatedData);
      calculateStats(updatedData);
      
    } catch (error) {
      console.error('Error generating forecast:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update forecast settings
  const updateForecastSettings = async (settings: any) => {
    try {
      // In a real application, this would update the forecast settings
      console.log('Updating forecast settings:', settings);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('Error updating forecast settings:', error);
      throw error;
    }
  };

  // Update actual values and recalculate accuracy
  const updateActualValues = async (forecastId: string, actualValue: number) => {
    try {
      const updatedData = forecastData.map(item => {
        if (item.IDDuBao === forecastId) {
          const chenhLech = actualValue - item.SoLuongDuBao;
          const tyLeChinhXac = Math.max(0, 100 - Math.abs(chenhLech / actualValue) * 100);
          const trangThai = tyLeChinhXac >= 85 ? 'Hoàn thành' : 'Cần điều chỉnh';
          
          return {
            ...item,
            SoLuongThucTe: actualValue,
            ChenhLech: chenhLech,
            TyLeChinhXac: tyLeChinhXac,
            TrangThai: trangThai
          };
        }
        return item;
      });
      
      setForecastData(updatedData);
      calculateStats(updatedData);
      
    } catch (error) {
      console.error('Error updating actual values:', error);
      throw error;
    }
  };

  // Load forecast data on component mount
  useEffect(() => {
    fetchForecastData();
  }, []);

  return {
    forecastData,
    loading,
    stats,
    fetchForecastData,
    generateForecast,
    updateForecastSettings,
    updateActualValues
  };
} 