'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  RefreshCw,
  AlertCircle,
  Activity,
  Database,
  PieChart,
  Package,
  BarChart3,
  CreditCard,
  Warehouse,
  Users,
  UserCheck,
  Award,
  AlertTriangle
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { DateRange } from 'react-day-picker';
import { isWithinInterval } from 'date-fns';
import { useReportData, ReportFilters } from '@/hooks/useReportData';
import { ReportFilters as ReportFiltersComponent } from '@/components/ReportFilters';
import { ReportKPICards } from '@/components/ReportKPICards';
import { ExportDropdownButton } from '@/components/ExportDropdownButton';
import { ExportColumn } from '@/utils/exportUtils';
import AuthUtils from '@/utils/authUtils';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const ComprehensiveReport = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [categories, setCategories] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [minAmount, setMinAmount] = useState<number | undefined>(undefined);
  const [maxAmount, setMaxAmount] = useState<number | undefined>(undefined);

  const filters: ReportFilters = useMemo(() => ({
    dateRange,
    categories: categories.length > 0 ? categories : undefined,
    paymentMethods: paymentMethods.length > 0 ? paymentMethods : undefined,
    minAmount,
    maxAmount
  }), [dateRange, categories, paymentMethods, minAmount, maxAmount]);

  const { data, loading, error, refresh, reseedTestDatabase, timeRange } = useReportData(filters);

  const [rawOpsData, setRawOpsData] = useState<{
    materials: any[];
    inventoryTx: any[];
    stocktakes: any[];
    employees: any[];
    invoices: any[];
    customers: any[];
  }>({
    materials: [],
    inventoryTx: [],
    stocktakes: [],
    employees: [],
    invoices: [],
    customers: [],
  });

  const loadCrossModuleData = useCallback(async () => {
    try {
      const [matRes, txRes, stRes, empRes, invRes, custRes] = await Promise.all([
        AuthUtils.getAllNguyenLieu(),
        AuthUtils.getAllNhapXuatKho(),
        AuthUtils.getAllKiemKeKho(),
        AuthUtils.getAllNhanVien(),
        AuthUtils.getAllHoaDon(),
        AuthUtils.getAllKhachHang(),
      ]);

      setRawOpsData({
        materials: Array.isArray(matRes) ? matRes : (matRes?.data || []),
        inventoryTx: Array.isArray(txRes) ? txRes : (txRes?.data || []),
        stocktakes: Array.isArray(stRes) ? stRes : (stRes?.data || []),
        employees: Array.isArray(empRes) ? empRes : (empRes?.data || []),
        invoices: Array.isArray(invRes) ? invRes : (invRes?.data || []),
        customers: Array.isArray(custRes) ? custRes : (custRes?.data || []),
      });
    } catch (err) {
      console.warn('Không thể tải dữ liệu Kho / Nhân sự / Khách hàng:', err);
    }
  }, []);

  useEffect(() => {
    void loadCrossModuleData();
  }, [loadCrossModuleData]);

  // 1. Tổng hợp Kho & Nguyên vật liệu (Inventory)
  const inventorySummary = useMemo(() => {
    const netQtyMap = new Map<string, number>();
    let totalImportValue = 0;
    let totalExportValue = 0;

    for (const tx of rawOpsData.inventoryTx) {
      const type = String(tx?.LoaiGiaoDich || '');
      const amount = Number(tx?.TongTien) || 0;
      if (type === 'Nhập kho') totalImportValue += amount;
      if (type === 'Xuất kho') totalExportValue += amount;

      const sign = type === 'Nhập kho' ? 1 : type === 'Xuất kho' ? -1 : 0;
      if (!sign || !Array.isArray(tx?.ChiTiet)) continue;
      for (const line of tx.ChiTiet) {
        const matId = String(line?.IDNguyenLieu || '').trim();
        const qty = Number(line?.SoLuong) || 0;
        if (matId) {
          netQtyMap.set(matId, (netQtyMap.get(matId) || 0) + sign * qty);
        }
      }
    }

    const items = rawOpsData.materials.map((m) => {
      const id = String(m?.IDNguyenLieu || '');
      const name = String(m?.['Tên nguyên liệu'] || id);
      const unit = String(m?.['Đơn vị tính'] || '');
      const warnThreshold = Number(m?.['Số lượng cảnh báo']) || 5;
      const hasExplicit = m?.['Số lượng tồn'] !== undefined || m?.['Tồn kho'] !== undefined;
      const currentStock = hasExplicit
        ? Number(m?.['Số lượng tồn'] ?? m?.['Tồn kho'] ?? 0)
        : (netQtyMap.get(id) ?? 0);
      const isLow = currentStock <= warnThreshold;

      return {
        id,
        name,
        unit,
        warnThreshold,
        currentStock,
        isLow,
      };
    });

    const lowStockCount = items.filter((i) => i.isLow).length;

    return {
      totalMaterials: items.length,
      lowStockCount,
      totalImportValue,
      totalExportValue,
      totalTransactions: rawOpsData.inventoryTx.length,
      totalStocktakes: rawOpsData.stocktakes.length,
      items: items.sort((a, b) => Number(b.isLow) - Number(a.isLow)),
    };
  }, [rawOpsData.materials, rawOpsData.inventoryTx, rawOpsData.stocktakes]);

  // 2. Tổng hợp Hiệu suất Nhân viên (Staff)
  const staffSummary = useMemo(() => {
    const isPaid = (statusRaw: any) => {
      const s = String(statusRaw || '').trim();
      return s === 'Đã thanh toán' || s === 'Đã hoàn thành' || s === 'Hoàn thành' || s === 'Ghi nợ' || s === 'Nợ một phần';
    };

    const empMap = new Map<string, any>();
    for (const emp of rawOpsData.employees) {
      const name = String(emp?.['Họ và Tên'] || emp?.username || '').trim();
      if (name) empMap.set(name.toLowerCase(), emp);
      if (emp?.username) empMap.set(String(emp.username).trim().toLowerCase(), emp);
    }

    const perfMap = new Map<string, { name: string; role: string; orders: number; revenue: number }>();

    for (const emp of rawOpsData.employees) {
      const name = String(emp?.['Họ và Tên'] || emp?.username || '').trim();
      if (!name) continue;
      perfMap.set(name, {
        name,
        role: String(emp?.['Chức vụ'] || emp?.['Phân quyền'] || 'Nhân viên'),
        orders: 0,
        revenue: 0,
      });
    }

    for (const inv of rawOpsData.invoices) {
      if (!isPaid(inv?.['Trạng thái'])) continue;
      const rawDate = inv?.['Ngày'] || inv?.['Thời gian'];
      const invDate = rawDate ? AuthUtils.parseFlexibleDate(rawDate) : null;
      if (invDate && !isNaN(invDate.getTime())) {
        if (!isWithinInterval(invDate, { start: timeRange.current.from, end: timeRange.current.to })) {
          continue;
        }
      }

      const rawStaff = String(inv?.['Nhân viên'] || 'Thu ngân').trim();
      const empObj = empMap.get(rawStaff.toLowerCase());
      const displayName = empObj ? String(empObj['Họ và Tên'] || rawStaff) : rawStaff;
      const role = empObj ? String(empObj['Chức vụ'] || empObj['Phân quyền'] || 'Nhân viên') : 'Thu ngân';
      const amount = Number(inv?.['Tổng tiền']) || 0;

      const cur = perfMap.get(displayName) || { name: displayName, role, orders: 0, revenue: 0 };
      cur.orders += 1;
      cur.revenue += amount;
      perfMap.set(displayName, cur);
    }

    const list = Array.from(perfMap.values()).sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);
    const totalStaffRevenue = list.reduce((s, r) => s + r.revenue, 0);
    const activeStaff = list.filter((r) => r.orders > 0).length;

    return {
      totalStaff: rawOpsData.employees.length || list.length,
      activeStaff,
      totalStaffRevenue,
      topPerformer: list[0]?.orders > 0 ? list[0] : null,
      list: list.map((item) => ({
        ...item,
        avgOrder: item.orders > 0 ? Math.round(item.revenue / item.orders) : 0,
        sharePct: totalStaffRevenue > 0 ? (item.revenue / totalStaffRevenue) * 100 : 0,
      })),
    };
  }, [rawOpsData.employees, rawOpsData.invoices, timeRange]);

  // 3. Tổng hợp Khách hàng Thân thiết (Customers)
  const customerSummary = useMemo(() => {
    const tierCounts = new Map<string, number>();
    let totalSpentAll = 0;
    let totalPoints = 0;
    let vipAndDiamondCount = 0;

    const enriched = rawOpsData.customers.map((c) => {
      const tier = String(c?.['Loại khách hàng'] || 'Khách thường').trim();
      const spent = Number(c?.['Tổng chi tiêu']) || 0;
      const points = Number(c?.['Điểm tích lũy']) || 0;

      tierCounts.set(tier, (tierCounts.get(tier) || 0) + 1);
      totalSpentAll += spent;
      totalPoints += points;
      if (tier.toLowerCase().includes('vip') || tier.toLowerCase().includes('kim cương')) {
        vipAndDiamondCount += 1;
      }

      return {
        id: String(c?.IDKHACHHANG || ''),
        name: String(c?.['Tên khách hàng'] || 'Khách lẻ'),
        phone: String(c?.['Số điện thoại'] || '—'),
        tier,
        spent,
        points,
        lastPurchase: String(c?.['Lần mua cuối'] || '—'),
      };
    });

    const topCustomers = [...enriched].sort((a, b) => b.spent - a.spent || b.points - a.points);
    const totalCustomers = enriched.length;
    const avgPoints = totalCustomers > 0 ? Math.round(totalPoints / totalCustomers) : 0;

    const tiers = Array.from(tierCounts.entries()).map(([tier, count]) => ({
      tier,
      count,
      percentage: totalCustomers > 0 ? (count / totalCustomers) * 100 : 0,
    }));

    return {
      totalCustomers,
      vipAndDiamondCount,
      totalSpentAll,
      avgPoints,
      tiers,
      topCustomers,
    };
  }, [rawOpsData.customers]);

  const chartData = useMemo(() => {
    if (!data) return null;

    const topProducts = data.current.products.slice(0, 8);
    const topCategories = data.current.categories.slice(0, 6);

    return {
      revenueChart: {
        labels: data.current.dailyData.map(d => d.date),
        datasets: [
          {
            label: 'Doanh thu (VNĐ)',
            data: data.current.dailyData.map(d => d.revenue),
            borderColor: '#800080',
            backgroundColor: 'rgba(128, 0, 128, 0.1)',
            tension: 0.1,
          },
        ],
      },
      combinedChart: {
        labels: data.current.dailyData.map(d => d.date),
        datasets: [
          {
            label: 'Doanh thu (VNĐ)',
            data: data.current.dailyData.map(d => d.revenue),
            borderColor: '#9932CC',
            backgroundColor: 'rgba(153, 50, 204, 0.1)',
            yAxisID: 'y',
            tension: 0.1,
          },
          {
            label: 'Số đơn hàng',
            data: data.current.dailyData.map(d => d.orders),
            borderColor: '#BA55D3',
            backgroundColor: 'rgba(186, 85, 211, 0.1)',
            yAxisID: 'y1',
            tension: 0.1,
          },
        ],
      },
      categoryChart: {
        labels: topCategories.map(c => c.name),
        datasets: [
          {
            data: topCategories.map(c => c.revenue),
            backgroundColor: [
              '#800080', '#9932CC', '#BA55D3', '#DA70D6', '#DDA0DD', '#E6E6FA'
            ],
          },
        ],
      },
      topProductsChart: {
        labels: topProducts.map(p => p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name),
        datasets: [
          {
            label: 'Số lượng bán',
            data: topProducts.map(p => p.quantity),
            backgroundColor: '#9932CC',
          },
        ],
      },
      hourlyChart: {
        labels: data.current.hourlyData.map(h => `${h.hour}:00`),
        datasets: [
          {
            label: 'Số đơn hàng',
            data: data.current.hourlyData.map(h => h.orders),
            backgroundColor: '#BA55D3',
          },
        ],
      },
      paymentChart: {
        labels: data.current.paymentMethods.map(p => p.method),
        datasets: [
          {
            data: data.current.paymentMethods.map(p => p.count),
            backgroundColor: [
              '#800080', '#9932CC', '#BA55D3', '#DA70D6', '#DDA0DD'
            ],
          },
        ],
      }
    };
  }, [data]);

  const handleReset = () => {
    setDateRange(undefined);
    setCategories([]);
    setPaymentMethods([]);
    setMinAmount(undefined);
    setMaxAmount(undefined);
  };

  const handleSeedDemo = async () => {
    const res = await reseedTestDatabase();
    await loadCrossModuleData();
    toast.success(`Đã đồng bộ ${res.invoices} hóa đơn & dữ liệu báo cáo tổng hợp!`);
  };

  const handleRefreshAll = async () => {
    await Promise.all([refresh(), loadCrossModuleData()]);
  };

  const exportColumns: ExportColumn[] = [
    { key: 'date', label: 'Ngày', align: 'center' },
    { key: 'orders', label: 'Số đơn hàng', align: 'right' },
    { key: 'revenue', label: 'Doanh thu (VNĐ)', align: 'right', format: (v) => `${Number(v || 0).toLocaleString('vi-VN')} ₫` },
    { key: 'avgOrder', label: 'Giá trị TB/đơn', align: 'right', format: (v) => `${Number(v || 0).toLocaleString('vi-VN')} ₫` },
  ];

  const exportRows = useMemo(() => {
    if (!data) return [];
    return data.current.dailyData.map((d) => ({
      date: d.date,
      orders: d.orders,
      revenue: d.revenue,
      avgOrder: d.orders > 0 ? Math.round(d.revenue / d.orders) : 0,
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Có lỗi xảy ra</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={refresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-purple-900">Báo Cáo Tổng Hợp</h1>
          <p className="text-gray-600">Phân tích toàn diện kết quả kinh doanh</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleSeedDemo} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
            <Database className="h-4 w-4 mr-2" />
            Đồng bộ DB Mẫu (Test)
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
          <ExportDropdownButton
            data={exportRows}
            columns={exportColumns}
            filename="Bao_Cao_Tong_Hop_Kinh_Doanh"
            title="BÁO CÁO TỔNG HỢP KẾT QUẢ HOẠT ĐỘNG KINH DOANH"
            subtitle={`Doanh thu kỳ này: ${data.current.revenue.toLocaleString('vi-VN')} ₫ | Tăng trưởng: ${data.comparison.revenueGrowth.toFixed(1)}%`}
            summaryStats={[
              { label: 'Tổng doanh thu kỳ này', value: `${data.current.revenue.toLocaleString('vi-VN')} ₫` },
              { label: 'Tổng đơn hàng', value: `${data.current.orders} đơn` },
              { label: 'Tăng trưởng doanh thu', value: `${data.comparison.revenueGrowth >= 0 ? '+' : ''}${data.comparison.revenueGrowth.toFixed(1)}%` },
            ]}
          />
        </div>
      </div>

      {/* Filters */}
      <ReportFiltersComponent
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        categories={categories}
        onCategoriesChange={setCategories}
        paymentMethods={paymentMethods}
        onPaymentMethodsChange={setPaymentMethods}
        minAmount={minAmount}
        onMinAmountChange={setMinAmount}
        maxAmount={maxAmount}
        onMaxAmountChange={setMaxAmount}
        onReset={handleReset}
      />

      {/* KPI Cards */}
      <ReportKPICards data={data} />

      {/* Executive Summary */}
      <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
        <CardHeader>
          <CardTitle className="text-purple-900 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Tóm Tắt Điều Hành
          </CardTitle>
          <CardDescription>
            Tổng quan hiệu suất kinh doanh trong khoảng thời gian đã chọn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-white rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">Tăng Trưởng Doanh Thu</h4>
              <div className="text-2xl font-bold text-purple-900">
                {data.comparison.revenueGrowth >= 0 ? '+' : ''}{data.comparison.revenueGrowth.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600 mt-1">
                So với kỳ trước ({data.previous.revenue.toLocaleString('vi-VN')} ₫)
              </p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">Tăng Trưởng Đơn Hàng</h4>
              <div className="text-2xl font-bold text-purple-900">
                {data.comparison.ordersGrowth >= 0 ? '+' : ''}{data.comparison.ordersGrowth.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600 mt-1">
                So với kỳ trước ({data.previous.orders} đơn)
              </p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">Tăng Trưởng Giá Trị TB</h4>
              <div className="text-2xl font-bold text-purple-900">
                {(data.comparison.averageOrderValueGrowth || 0) >= 0 ? '+' : ''}{(data.comparison.averageOrderValueGrowth || 0).toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600 mt-1">
                So với kỳ trước ({Math.round(data.previous.averageOrderValue).toLocaleString('vi-VN')} ₫)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tổng quan 5 mảng nghiệp vụ trên cùng màn hình: Bán hàng - Sản phẩm - Kho - Nhân sự - Khách hàng */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-purple-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-gray-500 flex items-center justify-between">
              <span>1. Bán hàng</span>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-purple-900">{data.current.revenue.toLocaleString('vi-VN')} ₫</div>
            <p className="text-xs text-gray-500 mt-0.5">{data.current.orders} hóa đơn thành công</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-gray-500 flex items-center justify-between">
              <span>2. Sản phẩm</span>
              <Package className="h-4 w-4 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-indigo-900">{data.current.products.length} món bán ra</div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              Top: {data.current.products[0]?.name || 'Chưa có'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-gray-500 flex items-center justify-between">
              <span>3. Kho & NVL</span>
              <Warehouse className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-amber-900">{inventorySummary.totalMaterials} nguyên liệu</div>
            <p className="text-xs text-gray-500 mt-0.5">
              {inventorySummary.lowStockCount} mặt hàng chạm ngưỡng
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-gray-500 flex items-center justify-between">
              <span>4. Nhân sự</span>
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-emerald-900">{staffSummary.totalStaff} nhân viên</div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              Top: {staffSummary.topPerformer?.name || `${staffSummary.activeStaff} có đơn`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-pink-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-gray-500 flex items-center justify-between">
              <span>5. Khách hàng</span>
              <Users className="h-4 w-4 text-pink-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-pink-900">{customerSummary.totalCustomers} hội viên</div>
            <p className="text-xs text-gray-500 mt-0.5">
              {customerSummary.vipAndDiamondCount} VIP / Kim cương
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 h-auto gap-1">
          <TabsTrigger value="overview">Tổng Quan</TabsTrigger>
          <TabsTrigger value="trends">Xu Hướng</TabsTrigger>
          <TabsTrigger value="products">Sản Phẩm</TabsTrigger>
          <TabsTrigger value="categories">Danh Mục</TabsTrigger>
          <TabsTrigger value="payment">Thanh Toán</TabsTrigger>
          <TabsTrigger value="hourly">Theo Giờ</TabsTrigger>
          <TabsTrigger value="inventory">Kho & NVL</TabsTrigger>
          <TabsTrigger value="staff">Nhân Sự</TabsTrigger>
          <TabsTrigger value="customers">Khách Hàng</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Xu Hướng Doanh Thu & Đơn Hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {data.current.dailyData.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-4 text-center">
                      <Activity className="h-10 w-10 mb-2 opacity-40 text-purple-600" />
                      <p className="text-sm font-medium">Chưa có dữ liệu xu hướng trong kỳ này</p>
                    </div>
                  ) : (
                    <Line 
                      data={chartData?.combinedChart || { labels: [], datasets: [] }} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { intersect: false, mode: 'index' },
                        scales: {
                          y: { type: 'linear', display: true, position: 'left' as const, beginAtZero: true },
                          y1: { type: 'linear', display: true, position: 'right' as const, beginAtZero: true, grid: { drawOnChartArea: false } },
                        },
                      }} 
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Phân Bố Theo Danh Mục</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {data.current.categories.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-4 text-center">
                      <PieChart className="h-10 w-10 mb-2 opacity-40 text-purple-600" />
                      <p className="text-sm font-medium">Chưa có dữ liệu danh mục trong kỳ này</p>
                    </div>
                  ) : (
                    <Doughnut 
                      data={chartData?.categoryChart || { labels: [], datasets: [] }}
                      options={{ responsive: true, maintainAspectRatio: false }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Xu Hướng Doanh Thu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {data.current.dailyData.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-4 text-center">
                      <Activity className="h-10 w-10 mb-2 opacity-40 text-purple-600" />
                      <p className="text-sm font-medium">Chưa có dữ liệu xu hướng doanh thu trong kỳ này</p>
                    </div>
                  ) : (
                    <Line 
                      data={chartData?.revenueChart || { labels: [], datasets: [] }} 
                      options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} 
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Phân Tích Hiệu Suất</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-green-900">Hiệu Suất Tốt Nhất</h4>
                      <Badge variant="default" className="bg-green-600">Tích cực</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Doanh thu cao nhất/ngày</p>
                        <p className="font-bold text-lg">
                          {Math.max(0, ...data.current.dailyData.map(d => d.revenue)).toLocaleString('vi-VN')} ₫
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Đơn hàng cao nhất/ngày</p>
                        <p className="font-bold text-lg">
                          {Math.max(0, ...data.current.dailyData.map(d => d.orders))} đơn
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-blue-900">Thống Kê Trung Bình</h4>
                      <Badge variant="outline">Trung bình</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Doanh thu TB/ngày</p>
                        <p className="font-bold text-lg">
                          {Math.round(data.current.revenue / Math.max(1, data.current.dailyData.length)).toLocaleString('vi-VN')} ₫
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Đơn hàng TB/ngày</p>
                        <p className="font-bold text-lg">
                          {(data.current.orders / Math.max(1, data.current.dailyData.length)).toFixed(1)} đơn
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Top 8 Sản Phẩm Bán Chạy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {data.current.products.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-4 text-center">
                      <Package className="h-10 w-10 mb-2 opacity-40 text-purple-600" />
                      <p className="text-sm font-medium">Chưa có dữ liệu sản phẩm trong kỳ này</p>
                    </div>
                  ) : (
                    <Bar 
                      data={chartData?.topProductsChart || { labels: [], datasets: [] }}
                      options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Chi Tiết Sản Phẩm</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {data.current.products.slice(0, 8).map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-purple-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-600">{product.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-900">{product.quantity} ly</p>
                        <p className="text-sm text-gray-600">{product.revenue.toLocaleString('vi-VN')} ₫</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Phân Bố Theo Danh Mục</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {data.current.categories.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-4 text-center">
                      <PieChart className="h-10 w-10 mb-2 opacity-40 text-purple-600" />
                      <p className="text-sm font-medium">Chưa có dữ liệu danh mục trong kỳ này</p>
                    </div>
                  ) : (
                    <Doughnut 
                      data={chartData?.categoryChart || { labels: [], datasets: [] }}
                      options={{ responsive: true, maintainAspectRatio: false }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Chi Tiết Danh Mục</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {data.current.categories.map((category, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-purple-50">
                      <div className="flex-1">
                        <p className="font-medium">{category.name}</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(100, Math.max(0, category.percentage || 0))}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-purple-900">{category.revenue.toLocaleString('vi-VN')} ₫</p>
                        <Badge variant="outline" className="border-purple-300 text-purple-700">
                          {(category.percentage || 0).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Phương Thức Thanh Toán</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {data.current.paymentMethods.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-4 text-center">
                      <CreditCard className="h-10 w-10 mb-2 opacity-40 text-purple-600" />
                      <p className="text-sm font-medium">Chưa có dữ liệu phương thức thanh toán trong kỳ này</p>
                    </div>
                  ) : (
                    <Doughnut 
                      data={chartData?.paymentChart || { labels: [], datasets: [] }}
                      options={{ responsive: true, maintainAspectRatio: false }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Chi Tiết Thanh Toán</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.current.paymentMethods.map((method, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-purple-50">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium">{method.method}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-900">{method.count} đơn</p>
                        <p className="text-sm text-gray-600">{method.revenue.toLocaleString('vi-VN')} ₫</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="hourly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-purple-900">Phân Bố Đơn Hàng Theo Giờ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {data.current.hourlyData.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-4 text-center">
                    <BarChart3 className="h-10 w-10 mb-2 opacity-40 text-purple-600" />
                    <p className="text-sm font-medium">Chưa có dữ liệu theo giờ trong kỳ này</p>
                  </div>
                ) : (
                  <Bar 
                    data={chartData?.hourlyChart || { labels: [], datasets: [] }}
                    options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 7: Kho & Nguyên vật liệu (Inventory) */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Tổng danh mục NVL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900">{inventorySummary.totalMaterials}</div>
                <p className="text-xs text-muted-foreground">{inventorySummary.totalStocktakes} phiếu kiểm kê</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Mặt hàng cảnh báo tồn thấp</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600 flex items-center gap-2">
                  {inventorySummary.lowStockCount}
                  {inventorySummary.lowStockCount > 0 && <AlertTriangle className="h-5 w-5" />}
                </div>
                <p className="text-xs text-muted-foreground">Cần kiểm tra nhập hàng</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Tổng giá trị Nhập kho</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">{inventorySummary.totalImportValue.toLocaleString('vi-VN')} ₫</div>
                <p className="text-xs text-muted-foreground">Từ {inventorySummary.totalTransactions} phiếu kho</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Tổng giá trị Xuất kho</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-600">{inventorySummary.totalExportValue.toLocaleString('vi-VN')} ₫</div>
                <p className="text-xs text-muted-foreground">Tiêu hao & xuất pha chế</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-purple-900 flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                Tình Trạng Tồn Kho Nguyên Vật Liệu
              </CardTitle>
              <CardDescription>Theo dõi số lượng tồn ước tính so với ngưỡng cảnh báo an toàn</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-purple-50/60">
                      <th className="text-left p-2.5">Mã NVL</th>
                      <th className="text-left p-2.5">Tên Nguyên Liệu</th>
                      <th className="text-left p-2.5">ĐVT</th>
                      <th className="text-right p-2.5">Tồn Hiện Tại</th>
                      <th className="text-right p-2.5">Ngưỡng Cảnh Báo</th>
                      <th className="text-center p-2.5">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventorySummary.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-gray-500">Chưa có dữ liệu nguyên vật liệu.</td>
                      </tr>
                    ) : (
                      inventorySummary.items.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="p-2.5 font-mono text-xs text-gray-600">{item.id}</td>
                          <td className="p-2.5 font-medium">{item.name}</td>
                          <td className="p-2.5">{item.unit}</td>
                          <td className="p-2.5 text-right font-bold">{item.currentStock}</td>
                          <td className="p-2.5 text-right text-gray-600">{item.warnThreshold}</td>
                          <td className="p-2.5 text-center">
                            <Badge variant={item.isLow ? 'destructive' : 'outline'} className={!item.isLow ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}>
                              {item.isLow ? 'Sắp hết / Cần nhập' : 'Đủ hàng'}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 8: Hiệu suất Nhân viên (Staff) */}
        <TabsContent value="staff" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Tổng Nhân Sự</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900">{staffSummary.totalStaff}</div>
                <p className="text-xs text-muted-foreground">{staffSummary.activeStaff} nhân sự phát sinh đơn</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Nhân Viên Xuất Sắc</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-emerald-700 flex items-center gap-1.5">
                  <Award className="h-5 w-5 text-amber-500 shrink-0" />
                  <span className="truncate">{staffSummary.topPerformer?.name || 'Chưa có'}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {staffSummary.topPerformer ? `${staffSummary.topPerformer.orders} đơn` : 'Không có dữ liệu'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Tổng Doanh Thu Theo Ca/NV</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900">{staffSummary.totalStaffRevenue.toLocaleString('vi-VN')} ₫</div>
                <p className="text-xs text-muted-foreground">Trong khoảng thời gian đã lọc</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Doanh Thu TB / Nhân Sự</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-700">
                  {Math.round(staffSummary.totalStaffRevenue / Math.max(1, staffSummary.activeStaff)).toLocaleString('vi-VN')} ₫
                </div>
                <p className="text-xs text-muted-foreground">Tính trên nhân sự có giao dịch</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-purple-900 flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Bảng Xếp Hạng Hiệu Suất Nhân Viên
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-purple-50/60">
                      <th className="text-left p-2.5">Hạng</th>
                      <th className="text-left p-2.5">Nhân Viên</th>
                      <th className="text-left p-2.5">Vai Trò</th>
                      <th className="text-right p-2.5">Số Đơn</th>
                      <th className="text-right p-2.5">Doanh Thu</th>
                      <th className="text-right p-2.5">TB/Đơn</th>
                      <th className="text-right p-2.5">Tỷ Trọng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffSummary.list.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-gray-500">Chưa có dữ liệu nhân viên trong kỳ này.</td>
                      </tr>
                    ) : (
                      staffSummary.list.map((st, idx) => (
                        <tr key={st.name} className="border-b hover:bg-gray-50">
                          <td className="p-2.5 font-bold text-purple-700">#{idx + 1}</td>
                          <td className="p-2.5 font-medium">{st.name}</td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-xs">{st.role}</Badge>
                          </td>
                          <td className="p-2.5 text-right font-semibold">{st.orders}</td>
                          <td className="p-2.5 text-right font-bold text-purple-900">{st.revenue.toLocaleString('vi-VN')} ₫</td>
                          <td className="p-2.5 text-right text-gray-600">{st.avgOrder.toLocaleString('vi-VN')} ₫</td>
                          <td className="p-2.5 text-right">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              {st.sharePct.toFixed(1)}%
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 9: Khách hàng Thân thiết (Customers) */}
        <TabsContent value="customers" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Tổng Khách Hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900">{customerSummary.totalCustomers}</div>
                <p className="text-xs text-muted-foreground">Hồ sơ khách hàng trên CRM</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Khách VIP & Kim Cương</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{customerSummary.vipAndDiamondCount}</div>
                <p className="text-xs text-muted-foreground">Nhóm khách hưởng ưu đãi 10% - 20%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Tổng Chi Tiêu Tích Lũy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">{customerSummary.totalSpentAll.toLocaleString('vi-VN')} ₫</div>
                <p className="text-xs text-muted-foreground">Doanh số từ khách thành viên</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Điểm Tích Lũy TB</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-pink-700">{customerSummary.avgPoints.toLocaleString('vi-VN')} điểm</div>
                <p className="text-xs text-muted-foreground">Trung bình mỗi hội viên</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Phân Bố Hạng Thành Viên</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customerSummary.tiers.length === 0 ? (
                  <p className="text-sm text-gray-500">Chưa có dữ liệu hạng khách hàng.</p>
                ) : (
                  customerSummary.tiers.map((t) => (
                    <div key={t.tier} className="p-3 rounded-lg bg-purple-50 space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{t.tier}</span>
                        <span className="font-bold text-purple-900">{t.count} ({t.percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min(100, t.percentage)}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-purple-900 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Top Khách Hàng Thân Thiết
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-purple-50/60">
                        <th className="text-left p-2.5">Khách Hàng</th>
                        <th className="text-left p-2.5">SĐT</th>
                        <th className="text-left p-2.5">Hạng</th>
                        <th className="text-right p-2.5">Điểm</th>
                        <th className="text-right p-2.5">Tổng Chi Tiêu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerSummary.topCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-gray-500">Chưa có dữ liệu khách hàng.</td>
                        </tr>
                      ) : (
                        customerSummary.topCustomers.slice(0, 15).map((c) => (
                          <tr key={c.id || c.name} className="border-b hover:bg-gray-50">
                            <td className="p-2.5 font-medium">{c.name}</td>
                            <td className="p-2.5 text-gray-600">{c.phone}</td>
                            <td className="p-2.5">
                              <Badge variant="outline" className="text-xs">{c.tier}</Badge>
                            </td>
                            <td className="p-2.5 text-right font-semibold text-amber-700">{c.points.toLocaleString('vi-VN')}</td>
                            <td className="p-2.5 text-right font-bold text-purple-900">{c.spent.toLocaleString('vi-VN')} ₫</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComprehensiveReport;
