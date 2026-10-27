import { useState, useEffect, useMemo, useCallback } from 'react';
import { DateRange } from 'react-day-picker';
import { 
  startOfDay, 
  endOfDay, 
  startOfMonth, 
  endOfMonth, 
  subDays,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
  isWithinInterval,
  format,
  differenceInDays,
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

export const parseDateFromString = (dateString: string): Date => {
  return AuthUtils.parseFlexibleDate(dateString);
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
  const duration = Math.max(1, differenceInDays(to, from));
  
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

const isPaidStatus = (statusRaw: any): boolean => {
  const s = String(statusRaw || '').trim();
  return s === 'Đã thanh toán' || s === 'Đã hoàn thành' || s === 'Hoàn thành';
};

export const useReportData = (filters: ReportFilters) => {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const timeRange = useMemo(() => {
    if (!filters.dateRange?.from || !filters.dateRange?.to) {
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

  const processData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [hoaDonRes, hoaDonDetailRes, sanPhamRes] = await Promise.all([
        AuthUtils.getAllHoaDon(),
        AuthUtils.getAllHoaDonDetail(),
        AuthUtils.getAllSanPham()
      ]);

      const hoaDons: HoaDon[] = Array.isArray(hoaDonRes) ? hoaDonRes : (hoaDonRes?.data || []);
      const details: HoaDonDetail[] = Array.isArray(hoaDonDetailRes) ? hoaDonDetailRes : (hoaDonDetailRes?.data || []);
      const sanPhams: SanPham[] = Array.isArray(sanPhamRes) ? sanPhamRes : (sanPhamRes?.data || []);

      const productMap = new Map<string, SanPham>();
      sanPhams.forEach((sp) => {
        if (sp?.IDSP) productMap.set(String(sp.IDSP), sp);
      });

      // Filter current period data
      const currentHoaDons = hoaDons.filter((hd: HoaDon) => {
        const rawDate = hd['Ngày'] || hd['Thời gian'];
        if (!rawDate) return false;
        const hoaDonDate = parseDateFromString(String(rawDate));
        const interval: Interval = { start: timeRange.current.from, end: timeRange.current.to };
        const totalAmount = Number(hd['Tổng tiền']) || 0;
        const payMethod = String(hd['Loại thanh toán'] || hd['Hình thức thanh toán'] || 'Tiền mặt');

        return isWithinInterval(hoaDonDate, interval) && 
               isPaidStatus(hd['Trạng thái']) &&
               (!filters.minAmount || totalAmount >= filters.minAmount) &&
               (!filters.maxAmount || totalAmount <= filters.maxAmount) &&
               (!filters.paymentMethods?.length || filters.paymentMethods.includes(payMethod));
      });

      // Filter previous period data
      const previousHoaDons = hoaDons.filter((hd: HoaDon) => {
        const rawDate = hd['Ngày'] || hd['Thời gian'];
        if (!rawDate) return false;
        const hoaDonDate = parseDateFromString(String(rawDate));
        const interval: Interval = { start: timeRange.previous.from, end: timeRange.previous.to };
        return isWithinInterval(hoaDonDate, interval) && 
               isPaidStatus(hd['Trạng thái']);
      });

      // Process current period data
      const currentRevenue = currentHoaDons.reduce((sum: number, hd: HoaDon) => sum + (Number(hd['Tổng tiền']) || 0), 0);
      const currentOrders = currentHoaDons.length;
      const currentAverageOrderValue = currentOrders > 0 ? currentRevenue / currentOrders : 0;

      // Process previous period data
      const previousRevenue = previousHoaDons.reduce((sum: number, hd: HoaDon) => sum + (Number(hd['Tổng tiền']) || 0), 0);
      const previousOrders = previousHoaDons.length;
      const previousAverageOrderValue = previousOrders > 0 ? previousRevenue / previousOrders : 0;

      // Calculate growth rates
      const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : (currentRevenue > 0 ? 100 : 0);
      const ordersGrowth = previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders) * 100 : (currentOrders > 0 ? 100 : 0);
      const averageOrderValueGrowth = previousAverageOrderValue > 0 ? 
        ((currentAverageOrderValue - previousAverageOrderValue) / previousAverageOrderValue) * 100 : 0;

      const currentInvoiceIds = new Set(
        currentHoaDons.map((hd) => String(hd.IDHOADON || hd.IDHD || ''))
      );

      // Process products & categories data
      const productStats = new Map<string, { id: string; name: string; quantity: number; revenue: number; category: string }>();
      const categoryStats = new Map<string, { name: string; revenue: number; orders: number; percentage: number }>();

      details.forEach((detail: HoaDonDetail) => {
        const invoiceId = String(detail.IDHOADON || detail.IDHD || '');
        if (!currentInvoiceIds.has(invoiceId)) return;

        const productId = String(detail.IDSP || '');
        const product = productMap.get(productId);
        const category = String(product?.['Loại sản phẩm'] || detail['Loại sản phẩm'] || 'Đồ uống');
        const productName = String(product?.['Tên sản phẩm'] || detail['Tên sản phẩm'] || `Sản phẩm ${productId}`);

        if (filters.categories?.length && !filters.categories.includes(category)) {
          return;
        }

        const quantity = Math.max(1, Number(detail['Số lượng']) || 1);
        const unitPrice = Number(detail['Đơn giá']) || Number(product?.['Đơn giá']) || 25000;
        const revenue = Number(detail['Thành tiền']) || quantity * unitPrice;

        if (productStats.has(productId)) {
          const existing = productStats.get(productId)!;
          existing.quantity += quantity;
          existing.revenue += revenue;
        } else {
          productStats.set(productId, {
            id: productId,
            name: productName,
            quantity,
            revenue,
            category
          });
        }

        if (categoryStats.has(category)) {
          const existingCat = categoryStats.get(category)!;
          existingCat.revenue += revenue;
          existingCat.orders += 1;
        } else {
          categoryStats.set(category, {
            name: category,
            revenue,
            orders: 1,
            percentage: 0
          });
        }
      });

      const totalCategoryRevenue = Array.from(categoryStats.values()).reduce((s, c) => s + c.revenue, 0) || currentRevenue;
      categoryStats.forEach(category => {
        category.percentage = totalCategoryRevenue > 0 ? (category.revenue / totalCategoryRevenue) * 100 : 0;
      });

      // Process payment methods
      const paymentStats = new Map<string, { method: string; count: number; revenue: number; percentage: number }>();
      currentHoaDons.forEach((hd: HoaDon) => {
        const method = String(hd['Loại thanh toán'] || hd['Hình thức thanh toán'] || 'Tiền mặt');
        const revenue = Number(hd['Tổng tiền']) || 0;
        
        if (paymentStats.has(method)) {
          const existing = paymentStats.get(method)!;
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

      paymentStats.forEach(payment => {
        payment.percentage = currentOrders > 0 ? (payment.count / currentOrders) * 100 : 0;
      });

      // Process daily data
      const dailyStats = new Map<string, { date: string; revenue: number; orders: number }>();
      const daysDiff = Math.min(366, Math.max(0, differenceInDays(timeRange.current.to, timeRange.current.from)));
      
      for (let i = 0; i <= daysDiff; i++) {
        const date = new Date(timeRange.current.from);
        date.setDate(date.getDate() + i);
        const dateKey = format(date, 'dd/MM/yyyy', { locale: vi });
        dailyStats.set(dateKey, { date: dateKey, revenue: 0, orders: 0 });
      }

      currentHoaDons.forEach((hd: HoaDon) => {
        const hoaDonDate = parseDateFromString(String(hd['Ngày'] || hd['Thời gian']));
        const date = format(hoaDonDate, 'dd/MM/yyyy', { locale: vi });
        if (dailyStats.has(date)) {
          const existing = dailyStats.get(date)!;
          existing.revenue += Number(hd['Tổng tiền']) || 0;
          existing.orders += 1;
        }
      });

      // Process hourly data
      const hourlyStats = new Map<number, { hour: number; orders: number; revenue: number }>();
      for (let i = 0; i < 24; i++) {
        hourlyStats.set(i, { hour: i, orders: 0, revenue: 0 });
      }

      currentHoaDons.forEach((hd: HoaDon) => {
        const hoaDonDate = parseDateFromString(String(hd['Ngày'] || hd['Thời gian']));
        const hour = hoaDonDate.getHours();
        const existing = hourlyStats.get(hour);
        if (existing) {
          existing.orders += 1;
          existing.revenue += Number(hd['Tổng tiền']) || 0;
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
  }, [filters, timeRange]);

  const reseedTestDatabase = useCallback(async () => {
    const result = await AuthUtils.seedSynchronizedTestDatabase();
    await processData();
    return result;
  }, [processData]);

  useEffect(() => {
    processData();
  }, [processData]);

  return {
    data,
    loading,
    error,
    timeRange,
    refresh: processData,
    reseedTestDatabase
  };
};
