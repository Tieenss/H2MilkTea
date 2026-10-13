import { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfQuarter, 
  endOfQuarter, 
  startOfYear, 
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
  isWithinInterval,
  format,
  parse,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInQuarters,
  differenceInYears,
  Interval
} from 'date-fns';
import { vi } from 'date-fns/locale';
import AuthUtils from '@/utils/authUtils';

// Types for data structures
interface HoaDon {
  IDHOADON: string;
  Ngày: string;
  'Tổng tiền': string;
  'Trạng thái': string;
  'Loại thanh toán': string;
  [key: string]: any;
}

interface HoaDonDetail {
  IDHOADON: string;
  IDSP: string;
  'Số lượng': string;
  'Thành tiền': string;
  [key: string]: any;
}

interface SanPham {
  IDSP: string;
  'Tên sản phẩm': string;
  'Loại sản phẩm': string;
  [key: string]: any;
}

export interface ReportData {
  current: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
    products: Array<{
      id: string;
      name: string;
      quantity: number;
      revenue: number;
      category: string;
    }>;
    categories: Array<{
      name: string;
      revenue: number;
      orders: number;
      percentage: number;
    }>;
    paymentMethods: Array<{
      method: string;
      count: number;
      revenue: number;
      percentage: number;
    }>;
    dailyData: Array<{
      date: string;
      revenue: number;
      orders: number;
    }>;
    hourlyData: Array<{
      hour: number;
      orders: number;
      revenue: number;
    }>;
  };
  previous: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
  };
  comparison: {
    revenueGrowth: number;
    ordersGrowth: number;
    averageOrderValueGrowth: number;
    isRevenuePositive: boolean;
    isOrdersPositive: boolean;
    isAverageOrderValuePositive: boolean;
  };
  timeRange: {
    current: {
      from: Date;
      to: Date;
    };
    previous: {
      from: Date;
      to: Date;
    };
    type: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  };
}

export interface ReportFilters {
  dateRange: DateRange | undefined;
  categories?: string[];
  paymentMethods?: string[];
  minAmount?: number;
  maxAmount?: number;
}

// Hàm parse ngày từ định dạng "MM/DD/YYYY HH:mm:ss"
const parseDateFromString = (dateString: string): Date => {
  try {
    // Định dạng: "06/23/2025 14:37:29"
    const [datePart, timePart] = dateString.split(' ');
    const [month, day, year] = datePart.split('/');
    const [hour, minute, second] = timePart ? timePart.split(':') : ['0', '0', '0'];
    
    return new Date(
      parseInt(year),
      parseInt(month) - 1, // Month is 0-indexed
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return new Date();
  }
};

const getTimeRangeType = (from: Date, to: Date): 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom' => {
  const daysDiff = differenceInDays(to, from);
  
  if (daysDiff === 0) return 'day';
  if (daysDiff <= 7) return 'week';
  if (daysDiff <= 31) return 'month';
  if (daysDiff <= 93) return 'quarter';
  if (daysDiff <= 366) return 'year';
  return 'custom';
};

const getPreviousTimeRange = (from: Date, to: Date, type: string) => {
  const duration = differenceInDays(to, from);
  
  switch (type) {
    case 'day':
      return {
        from: subDays(from, 1),
        to: subDays(to, 1)
      };
    case 'week':
      return {
        from: subWeeks(from, 1),
        to: subWeeks(to, 1)
      };
    case 'month':
      return {
        from: subMonths(from, 1),
        to: subMonths(to, 1)
      };
    case 'quarter':
      return {
        from: subQuarters(from, 1),
        to: subQuarters(to, 1)
      };
    case 'year':
      return {
        from: subYears(from, 1),
        to: subYears(to, 1)
      };
    default:
      return {
        from: subDays(from, duration),
        to: subDays(to, duration)
      };
  }
};

export const useReportData = (filters: ReportFilters) => {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const timeRange = useMemo(() => {
    if (!filters.dateRange?.from || !filters.dateRange?.to) {
      // Default to current month
      const now = new Date();
      const from = startOfMonth(now);
      const to = endOfMonth(now);
      const type = getTimeRangeType(from, to);
      const previous = getPreviousTimeRange(from, to, type);
      
      return {
        current: { from, to },
        previous,
        type
      };
    }

    const from = startOfDay(filters.dateRange.from);
    const to = endOfDay(filters.dateRange.to);
    const type = getTimeRangeType(from, to);
    const previous = getPreviousTimeRange(from, to, type);

    return {
      current: { from, to },
      previous,
      type
    };
  }, [filters.dateRange]);

  const processData = useMemo(() => {
    return async () => {
      try {
        setLoading(true);
        setError(null);

        const [hoaDonRes, hoaDonDetailRes, sanPhamRes] = await Promise.all([
          AuthUtils.getAllHoaDon(),
          AuthUtils.getAllHoaDonDetail(),
          AuthUtils.getAllSanPham()
        ]);

        const hoaDons: HoaDon[] = Array.isArray(hoaDonRes) ? hoaDonRes : hoaDonRes.data;
        const details: HoaDonDetail[] = Array.isArray(hoaDonDetailRes) ? hoaDonDetailRes : hoaDonDetailRes.data;
        const sanPhams: SanPham[] = Array.isArray(sanPhamRes) ? sanPhamRes : sanPhamRes.data;

        // Filter current period data
        const currentHoaDons = hoaDons.filter((hd: HoaDon) => {
          const hoaDonDate = parseDateFromString(hd['Ngày']);
          const interval: Interval = { start: timeRange.current.from, end: timeRange.current.to };
          return isWithinInterval(hoaDonDate, interval) && 
                 hd['Trạng thái'] === 'Đã thanh toán' &&
                 (!filters.minAmount || parseInt(hd['Tổng tiền']) >= filters.minAmount) &&
                 (!filters.maxAmount || parseInt(hd['Tổng tiền']) <= filters.maxAmount) &&
                 (!filters.paymentMethods?.length || filters.paymentMethods.includes(hd['Loại thanh toán']));
        });

        // Filter previous period data
        const previousHoaDons = hoaDons.filter((hd: HoaDon) => {
          const hoaDonDate = parseDateFromString(hd['Ngày']);
          const interval: Interval = { start: timeRange.previous.from, end: timeRange.previous.to };
          return isWithinInterval(hoaDonDate, interval) && 
                 hd['Trạng thái'] === 'Đã thanh toán';
        });

        // Process current period data
        const currentRevenue = currentHoaDons.reduce((sum: number, hd: HoaDon) => sum + parseInt(hd['Tổng tiền']), 0);
        const currentOrders = currentHoaDons.length;
        const currentAverageOrderValue = currentOrders > 0 ? currentRevenue / currentOrders : 0;

        // Process previous period data
        const previousRevenue = previousHoaDons.reduce((sum: number, hd: HoaDon) => sum + parseInt(hd['Tổng tiền']), 0);
        const previousOrders = previousHoaDons.length;
        const previousAverageOrderValue = previousOrders > 0 ? previousRevenue / previousOrders : 0;

        // Calculate growth rates
        const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
        const ordersGrowth = previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders) * 100 : 0;
        const averageOrderValueGrowth = previousAverageOrderValue > 0 ? 
          ((currentAverageOrderValue - previousAverageOrderValue) / previousAverageOrderValue) * 100 : 0;

        // Process products data
        const productStats = new Map();
        details.forEach((detail: HoaDonDetail) => {
          const hoaDon = currentHoaDons.find(hd => hd.IDHOADON === detail.IDHOADON);
          if (hoaDon) {
            const productId = detail.IDSP;
            const product = sanPhams.find(sp => sp.IDSP === productId);
            
            if (product && (!filters.categories?.length || filters.categories.includes(product['Loại sản phẩm']))) {
              const quantity = parseInt(detail['Số lượng']);
              const revenue = parseInt(detail['Thành tiền']);
              
              if (productStats.has(productId)) {
                const existing = productStats.get(productId);
                existing.quantity += quantity;
                existing.revenue += revenue;
              } else {
                productStats.set(productId, {
                  id: productId,
                  name: product['Tên sản phẩm'],
                  quantity,
                  revenue,
                  category: product['Loại sản phẩm']
                });
              }
            }
          }
        });

        // Process categories data
        const categoryStats = new Map();
        details.forEach((detail: HoaDonDetail) => {
          const hoaDon = currentHoaDons.find(hd => hd.IDHOADON === detail.IDHOADON);
          if (hoaDon) {
            const product = sanPhams.find(sp => sp.IDSP === detail.IDSP);
            if (product && (!filters.categories?.length || filters.categories.includes(product['Loại sản phẩm']))) {
              const category = product['Loại sản phẩm'];
              const revenue = parseInt(detail['Thành tiền']);
              
              if (categoryStats.has(category)) {
                const existing = categoryStats.get(category);
                existing.revenue += revenue;
                existing.orders += 1;
              } else {
                categoryStats.set(category, {
                  name: category,
                  revenue,
                  orders: 1,
                  percentage: 0
                });
              }
            }
          }
        });

        // Calculate category percentages
        categoryStats.forEach(category => {
          category.percentage = currentRevenue > 0 ? (category.revenue / currentRevenue) * 100 : 0;
        });

        // Process payment methods
        const paymentStats = new Map();
        currentHoaDons.forEach((hd: HoaDon) => {
          const method = hd['Loại thanh toán'];
          const revenue = parseInt(hd['Tổng tiền']);
          
          if (paymentStats.has(method)) {
            const existing = paymentStats.get(method);
            existing.count += 1;
            existing.revenue += revenue;
          } else {
            paymentStats.set(method, {
              method,
              count: 1,
              revenue,
              percentage: 0
            });
          }
        });

        // Calculate payment method percentages
        paymentStats.forEach(payment => {
          payment.percentage = currentOrders > 0 ? (payment.count / currentOrders) * 100 : 0;
        });

        // Process daily data
        const dailyStats = new Map();
        const daysDiff = differenceInDays(timeRange.current.to, timeRange.current.from);
        
        for (let i = 0; i <= daysDiff; i++) {
          const date = new Date(timeRange.current.from);
          date.setDate(date.getDate() + i);
          const dateKey = format(date, 'dd/MM/yyyy', { locale: vi });
          dailyStats.set(dateKey, { date: dateKey, revenue: 0, orders: 0 });
        }

        currentHoaDons.forEach((hd: HoaDon) => {
          const hoaDonDate = parseDateFromString(hd['Ngày']);
          const date = format(hoaDonDate, 'dd/MM/yyyy', { locale: vi });
          if (dailyStats.has(date)) {
            const existing = dailyStats.get(date);
            existing.revenue += parseInt(hd['Tổng tiền']);
            existing.orders += 1;
          }
        });

        // Process hourly data
        const hourlyStats = new Map();
        for (let i = 0; i < 24; i++) {
          hourlyStats.set(i, { hour: i, orders: 0, revenue: 0 });
        }

        currentHoaDons.forEach((hd: HoaDon) => {
          const hoaDonDate = parseDateFromString(hd['Ngày']);
          const hour = hoaDonDate.getHours();
          const existing = hourlyStats.get(hour);
          if (existing) {
            existing.orders += 1;
            existing.revenue += parseInt(hd['Tổng tiền']);
          }
        });

        const reportData: ReportData = {
          current: {
            revenue: currentRevenue,
            orders: currentOrders,
            averageOrderValue: currentAverageOrderValue,
            products: Array.from(productStats.values()).sort((a, b) => b.quantity - a.quantity),
            categories: Array.from(categoryStats.values()).sort((a, b) => b.revenue - a.revenue),
            paymentMethods: Array.from(paymentStats.values()).sort((a, b) => b.count - a.count),
            dailyData: Array.from(dailyStats.values()),
            hourlyData: Array.from(hourlyStats.values())
          },
          previous: {
            revenue: previousRevenue,
            orders: previousOrders,
            averageOrderValue: previousAverageOrderValue
          },
          comparison: {
            revenueGrowth,
            ordersGrowth,
            averageOrderValueGrowth,
            isRevenuePositive: revenueGrowth >= 0,
            isOrdersPositive: ordersGrowth >= 0,
            isAverageOrderValuePositive: averageOrderValueGrowth >= 0
          },
          timeRange
        };

        setData(reportData);
      } catch (err) {
        console.error('Error processing report data:', err);
        setError('Có lỗi xảy ra khi xử lý dữ liệu báo cáo');
      } finally {
        setLoading(false);
      }
    };
  }, [filters, timeRange]);

  useEffect(() => {
    processData();
  }, [processData]);

  return {
    data,
    loading,
    error,
    timeRange,
    refresh: processData
  };
}; 