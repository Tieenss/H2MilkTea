'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  TrendingUp, 
  RefreshCw,
  AlertCircle,
  BarChart3,
  PieChart,
  Database
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
import { Bar, Doughnut } from 'react-chartjs-2';
import { DateRange } from 'react-day-picker';
import { useReportData, ReportFilters } from '@/hooks/useReportData';
import { ReportFilters as ReportFiltersComponent } from '@/components/ReportFilters';
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

const ProductsReport = () => {
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

  const { data, loading, error, refresh, reseedTestDatabase } = useReportData(filters);
  const [costMeta, setCostMeta] = useState<{
    productUnitCostMap: Map<string, number>;
    bomProductIds: Set<string>;
    bomEstimatedUnitCostMap: Map<string, number>;
  }>({
    productUnitCostMap: new Map(),
    bomProductIds: new Set(),
    bomEstimatedUnitCostMap: new Map(),
  });

  const loadCostMetadata = useCallback(async () => {
    try {
      const [sanPhamRes, cauHinhRes, nhapXuatRes] = await Promise.all([
        AuthUtils.getAllSanPham(),
        AuthUtils.getAllCauHinh(),
        AuthUtils.getAllNhapXuatKho(),
      ]);

      const sanPhams: any[] = Array.isArray(sanPhamRes) ? sanPhamRes : (sanPhamRes?.data || []);
      const cauHinhs: any[] = Array.isArray(cauHinhRes) ? cauHinhRes : (cauHinhRes?.data || []);
      const transactions: any[] = Array.isArray(nhapXuatRes) ? nhapXuatRes : (nhapXuatRes?.data || []);

      const productUnitCostMap = new Map<string, number>();
      for (const sp of sanPhams) {
        const id = String(sp?.IDSP || '').trim();
        const cost = Number(sp?.['Giá vốn']);
        if (id && Number.isFinite(cost) && cost > 0) {
          productUnitCostMap.set(id, cost);
        }
      }

      // Tính giá nhập gần nhất của từng nguyên liệu từ NHAPXUATKHO
      const ingredientPriceMap = new Map<string, number>();
      for (const tx of transactions) {
        if (tx?.LoaiGiaoDich !== 'Nhập kho' || !Array.isArray(tx?.ChiTiet)) continue;
        for (const line of tx.ChiTiet) {
          const matId = String(line?.IDNguyenLieu || '').trim();
          const unitPrice = Number(line?.DonGia);
          if (matId && Number.isFinite(unitPrice) && unitPrice > 0) {
            ingredientPriceMap.set(matId, unitPrice);
          }
        }
      }

      const bomProductIds = new Set<string>();
      const bomEstimatedUnitCostMap = new Map<string, number>();
      for (const cfg of cauHinhs) {
        if (cfg?.['Trạng thái'] && cfg['Trạng thái'] !== 'Hoạt động') continue;
        const spId = String(cfg?.IDSP || '').trim();
        const matId = String(cfg?.IDNguyenLieu || '').trim();
        if (!spId) continue;
        bomProductIds.add(spId);
        const qtyNeeded = Number(cfg?.['Số lượng quy đổi'] || cfg?.['Số lượng cần']) || 0;
        const matPrice = ingredientPriceMap.get(matId) || 0;
        if (qtyNeeded > 0 && matPrice > 0) {
          bomEstimatedUnitCostMap.set(
            spId,
            (bomEstimatedUnitCostMap.get(spId) || 0) + qtyNeeded * matPrice
          );
        }
      }

      setCostMeta({ productUnitCostMap, bomProductIds, bomEstimatedUnitCostMap });
    } catch (err) {
      console.warn('Không thể tải metadata giá vốn BOM:', err);
    }
  }, []);

  useEffect(() => {
    void loadCostMetadata();
  }, [loadCostMetadata]);

  const enrichedProducts = useMemo(() => {
    if (!data) return [];
    return data.current.products.map((product) => {
      const safeQty = Math.max(1, Number(product.quantity) || 0);
      const safeRevenue = Number.isFinite(product.revenue) ? product.revenue : 0;
      const declaredUnitCost = costMeta.productUnitCostMap.get(product.id) || 0;
      const bomUnitCost = costMeta.bomEstimatedUnitCostMap.get(product.id) || 0;
      const hasBomRecord = costMeta.bomProductIds.has(product.id);

      let cogs = 0;
      let cogsLabel = 'Chưa có BOM (0 ₫)';
      let isEstimated = false;

      if (declaredUnitCost > 0) {
        cogs = Math.round(declaredUnitCost * safeQty);
        cogsLabel = hasBomRecord ? 'BOM & Giá vốn SP' : 'Giá vốn SP';
      } else if (bomUnitCost > 0) {
        cogs = Math.round(bomUnitCost * safeQty);
        cogsLabel = 'Định mức BOM';
      } else if (safeRevenue > 0) {
        cogs = Math.round(safeRevenue * 0.35);
        cogsLabel = 'Ước tính 35% (Chưa có BOM)';
        isEstimated = true;
      }

      const grossProfit = safeRevenue - cogs;
      const rawMargin = safeRevenue > 0 ? (grossProfit / safeRevenue) * 100 : 0;
      const grossMarginPct = Number.isFinite(rawMargin) ? rawMargin : 0;

      return {
        ...product,
        avgPrice: Math.round(safeRevenue / safeQty),
        cogs,
        cogsLabel,
        isEstimated,
        grossProfit,
        grossMarginPct,
      };
    });
  }, [data, costMeta]);

  const totals = useMemo(() => {
    const totalRevenue = enrichedProducts.reduce((s, p) => s + p.revenue, 0);
    const totalCogs = enrichedProducts.reduce((s, p) => s + p.cogs, 0);
    const totalGrossProfit = totalRevenue - totalCogs;
    const rawMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
    return {
      totalQty: enrichedProducts.reduce((s, p) => s + p.quantity, 0),
      totalRevenue,
      totalCogs,
      totalGrossProfit,
      overallMarginPct: Number.isFinite(rawMargin) ? rawMargin : 0,
    };
  }, [enrichedProducts]);

  const chartData = useMemo(() => {
    if (!data) return null;

    const topProducts = data.current.products.slice(0, 10);
    const topCategories = data.current.categories.slice(0, 8);

    return {
      topProductsChart: {
        labels: topProducts.map(p => p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name),
        datasets: [
          {
            label: 'Số lượng bán',
            data: topProducts.map(p => p.quantity),
            backgroundColor: '#9932CC',
          },
        ],
      },
      topProductsRevenueChart: {
        labels: topProducts.map(p => p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name),
        datasets: [
          {
            label: 'Doanh thu (VNĐ)',
            data: topProducts.map(p => p.revenue),
            backgroundColor: '#BA55D3',
          },
        ],
      },
      categoryChart: {
        labels: topCategories.map(c => c.name),
        datasets: [
          {
            data: topCategories.map(c => c.revenue),
            backgroundColor: [
              '#800080', '#9932CC', '#BA55D3', '#DA70D6', '#DDA0DD', '#E6E6FA', '#9370DB', '#8A2BE2'
            ],
          },
        ],
      },
      categoryQuantityChart: {
        labels: topCategories.map(c => c.name),
        datasets: [
          {
            label: 'Số lượt món',
            data: topCategories.map(c => c.orders),
            backgroundColor: '#DA70D6',
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
    await loadCostMetadata();
    toast.success(`Đã đồng bộ ${res.invoices} hóa đơn & ${res.details} chi tiết sản phẩm!`);
  };

  const handleRefreshAll = async () => {
    await Promise.all([refresh(), loadCostMetadata()]);
  };

  const exportColumns: ExportColumn[] = [
    { key: 'stt', label: 'STT', align: 'center' },
    { key: 'id', label: 'Mã SP', align: 'left' },
    { key: 'name', label: 'Tên sản phẩm', align: 'left' },
    { key: 'category', label: 'Danh mục', align: 'left' },
    { key: 'quantity', label: 'Số lượng bán', align: 'right' },
    { key: 'avgPrice', label: 'Đơn giá TB', align: 'right', format: (v) => `${Number(v || 0).toLocaleString('vi-VN')} ₫` },
    { key: 'revenue', label: 'Doanh thu (VNĐ)', align: 'right', format: (v) => `${Number(v || 0).toLocaleString('vi-VN')} ₫` },
    { key: 'cogs', label: 'Giá Vốn (BOM COGS)', align: 'right', format: (v) => `${Number(v || 0).toLocaleString('vi-VN')} ₫` },
    { key: 'cogsLabel', label: 'Nguồn Giá Vốn', align: 'left' },
    { key: 'grossProfit', label: 'Lợi Nhuận Gộp', align: 'right', format: (v) => `${Number(v || 0).toLocaleString('vi-VN')} ₫` },
    { key: 'grossMarginPct', label: 'Biên LN (%)', align: 'right', format: (v) => `${Number(v || 0).toFixed(1)}%` },
  ];

  const exportRows = useMemo(() => {
    return enrichedProducts.map((p, idx) => ({
      stt: idx + 1,
      id: p.id,
      name: p.name,
      category: p.category,
      quantity: p.quantity,
      avgPrice: p.avgPrice,
      revenue: p.revenue,
      cogs: p.cogs,
      cogsLabel: p.cogsLabel,
      grossProfit: p.grossProfit,
      grossMarginPct: Number(p.grossMarginPct.toFixed(1)),
    }));
  }, [enrichedProducts]);

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
          <h1 className="text-3xl font-bold text-purple-900">Báo Cáo Sản Phẩm</h1>
          <p className="text-gray-600">Phân tích hiệu suất sản phẩm và danh mục</p>
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
            filename="Bao_Cao_Hieu_Suat_San_Pham"
            title="BÁO CÁO PHÂN TÍCH DOANH THU & LỢI NHUẬN GỘP THEO SẢN PHẨM"
            subtitle={`Số sản phẩm phát sinh doanh thu: ${data.current.products.length} món`}
            summaryStats={[
              { label: 'Tổng sản phẩm bán ra', value: `${data.current.products.length} món` },
              { label: 'Tổng doanh thu món', value: `${totals.totalRevenue.toLocaleString('vi-VN')} ₫` },
              { label: 'Tổng giá vốn (COGS)', value: `${totals.totalCogs.toLocaleString('vi-VN')} ₫` },
              { label: 'Lợi nhuận gộp / Biên LN', value: `${totals.totalGrossProfit.toLocaleString('vi-VN')} ₫ (${totals.overallMarginPct.toFixed(1)}%)` },
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-purple-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Sản Phẩm</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {data.current.products.length}
            </div>
            <p className="text-xs text-muted-foreground">Sản phẩm đã bán</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Danh Mục</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {data.current.categories.length}
            </div>
            <p className="text-xs text-muted-foreground">Danh mục hoạt động</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sản Phẩm Bán Chạy</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-purple-900">
              {data.current.products.length > 0 ? data.current.products[0].name : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.current.products.length > 0 ? `${data.current.products[0].quantity} ly đã bán` : 'Không có dữ liệu'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Danh Mục Tốt Nhất</CardTitle>
            <PieChart className="h-4 w-4 text-purple-300" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-purple-900">
              {data.current.categories.length > 0 ? data.current.categories[0].name : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.current.categories.length > 0 ? `${data.current.categories[0].revenue.toLocaleString('vi-VN')} ₫` : 'Không có dữ liệu'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Tổng Quan</TabsTrigger>
          <TabsTrigger value="products">Sản Phẩm</TabsTrigger>
          <TabsTrigger value="categories">Danh Mục</TabsTrigger>
          <TabsTrigger value="details">Chi Tiết</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Top 10 Sản Phẩm Bán Chạy</CardTitle>
                <CardDescription>Theo số lượng bán</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {data.current.products.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-4 text-center">
                      <Package className="h-10 w-10 mb-2 opacity-40 text-purple-600" />
                      <p className="text-sm font-medium">Chưa có dữ liệu sản phẩm trong kỳ này</p>
                      <p className="text-xs text-gray-500 mt-1">Vui lòng chọn khoảng thời gian khác hoặc đồng bộ dữ liệu mẫu</p>
                    </div>
                  ) : (
                    <Bar 
                      data={chartData?.topProductsChart || { labels: [], datasets: [] }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true } }
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Phân Bố Theo Danh Mục</CardTitle>
                <CardDescription>Theo doanh thu</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {data.current.categories.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-4 text-center">
                      <PieChart className="h-10 w-10 mb-2 opacity-40 text-purple-600" />
                      <p className="text-sm font-medium">Chưa có dữ liệu danh mục trong kỳ này</p>
                      <p className="text-xs text-gray-500 mt-1">Vui lòng chọn khoảng thời gian khác hoặc đồng bộ dữ liệu mẫu</p>
                    </div>
                  ) : (
                    <Doughnut 
                      data={chartData?.categoryChart || { labels: [], datasets: [] }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Top 10 Sản Phẩm Theo Doanh Thu</CardTitle>
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
                      data={chartData?.topProductsRevenueChart || { labels: [], datasets: [] }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true } }
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Chi Tiết Sản Phẩm Bán Chạy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {data.current.products.slice(0, 10).map((product, index) => (
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
                <CardTitle className="text-purple-900">Số Lượt Bán Theo Danh Mục</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {data.current.categories.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-4 text-center">
                      <BarChart3 className="h-10 w-10 mb-2 opacity-40 text-purple-600" />
                      <p className="text-sm font-medium">Chưa có dữ liệu danh mục trong kỳ này</p>
                    </div>
                  ) : (
                    <Bar 
                      data={chartData?.categoryQuantityChart || { labels: [], datasets: [] }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true } }
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Chi Tiết Theo Danh Mục</CardTitle>
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

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-purple-900">Bảng Dữ Liệu Sản Phẩm, Giá Vốn BOM & Biên Lợi Nhuận</CardTitle>
              <CardDescription>
                Hiển thị doanh thu, giá vốn theo khai báo sản phẩm / định mức BOM (hoặc ước tính chuẩn 35% với món mới chưa khai báo BOM) và biên lợi nhuận gộp.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-purple-50/60">
                      <th className="text-left p-2.5">STT</th>
                      <th className="text-left p-2.5">Tên Sản Phẩm</th>
                      <th className="text-left p-2.5">Danh Mục</th>
                      <th className="text-right p-2.5">Số Lượng</th>
                      <th className="text-right p-2.5">Doanh Thu</th>
                      <th className="text-right p-2.5">Giá TB/Ly</th>
                      <th className="text-right p-2.5">Giá Vốn (BOM COGS)</th>
                      <th className="text-right p-2.5">Lợi Nhuận Gộp / Biên LN (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrichedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-500">
                          Chưa có dữ liệu bán hàng sản phẩm trong kỳ này.
                        </td>
                      </tr>
                    ) : (
                      enrichedProducts.map((product, index) => (
                        <tr key={product.id || index} className="border-b hover:bg-gray-50">
                          <td className="p-2.5 font-medium">{index + 1}</td>
                          <td className="p-2.5 font-medium">{product.name}</td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-xs">{product.category}</Badge>
                          </td>
                          <td className="p-2.5 text-right font-bold">{product.quantity}</td>
                          <td className="p-2.5 text-right font-bold text-purple-900">
                            {product.revenue.toLocaleString('vi-VN')} ₫
                          </td>
                          <td className="p-2.5 text-right text-gray-600">
                            {product.avgPrice.toLocaleString('vi-VN')} ₫
                          </td>
                          <td className="p-2.5 text-right">
                            <div className="font-semibold text-amber-800">
                              {product.cogs.toLocaleString('vi-VN')} ₫
                            </div>
                            <span
                              className={`inline-block text-[10px] px-1.5 py-0.5 rounded mt-0.5 ${
                                product.isEstimated
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {product.cogsLabel}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            <div
                              className={`font-bold ${
                                product.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
                              }`}
                            >
                              {product.grossProfit.toLocaleString('vi-VN')} ₫
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[11px] mt-0.5 ${
                                product.grossMarginPct >= 50
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : product.grossMarginPct >= 30
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {product.grossMarginPct.toFixed(1)}%
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {enrichedProducts.length > 0 && (
                    <tfoot>
                      <tr className="bg-purple-50/80 font-bold border-t-2 border-purple-200">
                        <td colSpan={3} className="p-2.5 text-purple-900">Tổng cộng ({enrichedProducts.length} món)</td>
                        <td className="p-2.5 text-right">{totals.totalQty}</td>
                        <td className="p-2.5 text-right text-purple-900">{totals.totalRevenue.toLocaleString('vi-VN')} ₫</td>
                        <td className="p-2.5 text-right text-gray-500">—</td>
                        <td className="p-2.5 text-right text-amber-800">{totals.totalCogs.toLocaleString('vi-VN')} ₫</td>
                        <td className="p-2.5 text-right text-emerald-700">
                          {totals.totalGrossProfit.toLocaleString('vi-VN')} ₫ ({totals.overallMarginPct.toFixed(1)}%)
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductsReport;
