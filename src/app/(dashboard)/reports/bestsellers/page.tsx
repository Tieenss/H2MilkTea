// pages/reports/bestsellers/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Star, 
  Award,
  Target,
  Database,
  RefreshCw
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
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import AuthUtils from '@/utils/authUtils';
import { ExportDropdownButton } from '@/components/ExportDropdownButton';
import { ExportColumn } from '@/utils/exportUtils';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface BestsellerData {
  topProducts: Array<{
    id: string;
    name: string;
    category: string;
    quantity: number;
    revenue: number;
    avgPrice: number;
    growth: number;
    image?: string;
  }>;
  categoryPerformance: Array<{
    category: string;
    totalQuantity: number;
    totalRevenue: number;
    productCount: number;
    percentage: number;
  }>;
  revenueVsQuantity: Array<{
    id: string;
    name: string;
    quantity: number;
    revenue: number;
    efficiency: number;
  }>;
  timeComparison: {
    current: Array<{ name: string; quantity: number }>;
    previous: Array<{ name: string; quantity: number }>;
  };
}

const isPaidStatus = (status: any): boolean => {
  const s = String(status || '').trim();
  return s === 'Đã thanh toán' || s === 'Đã hoàn thành' || s === 'Hoàn thành' || s === 'Ghi nợ' || s === 'Nợ một phần';
};

const BestsellersReport = () => {
  const [data, setData] = useState<BestsellerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [sortBy, setSortBy] = useState('quantity');

  useEffect(() => {
    loadBestsellerData();
  }, [timeRange, sortBy]);

  const loadBestsellerData = async () => {
    try {
      setLoading(true);
      
      const [hoaDonRes, hoaDonDetailRes, sanPhamRes] = await Promise.all([
        AuthUtils.getAllHoaDon(),
        AuthUtils.getAllHoaDonDetail(),
        AuthUtils.getAllSanPham()
      ]);

      const hoaDonData = Array.isArray(hoaDonRes) ? hoaDonRes : (hoaDonRes?.data || []);
      const hoaDonDetailData = Array.isArray(hoaDonDetailRes) ? hoaDonDetailRes : (hoaDonDetailRes?.data || []);
      const sanPhamData = Array.isArray(sanPhamRes) ? sanPhamRes : (sanPhamRes?.data || []);

      const bestsellerData = processBestsellerData(hoaDonData, hoaDonDetailData, sanPhamData);
      setData(bestsellerData);
    } catch (error) {
      console.error('Error loading bestseller data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    const res = await AuthUtils.seedSynchronizedTestDatabase();
    await loadBestsellerData();
    toast.success(`Đã đồng bộ ${res.invoices} hóa đơn & ${res.details} chi tiết món thành công!`);
  };

  const processBestsellerData = (hoaDons: any[], details: any[], sanPhams: any[]): BestsellerData => {
    const now = new Date();
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const previousStartDate = new Date(startDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    
    const validHoaDons = hoaDons.filter(hd => {
      const hoaDonDate = AuthUtils.parseFlexibleDate(hd['Ngày'] || hd['Thời gian']);
      return Boolean(hoaDonDate && hoaDonDate >= startDate && isPaidStatus(hd['Trạng thái']));
    });

    const previousHoaDons = hoaDons.filter(hd => {
      const hoaDonDate = AuthUtils.parseFlexibleDate(hd['Ngày'] || hd['Thời gian']);
      return Boolean(hoaDonDate && hoaDonDate >= previousStartDate && hoaDonDate < startDate && isPaidStatus(hd['Trạng thái']));
    });

    const validIds = new Set(validHoaDons.map(hd => String(hd.IDHOADON || hd.IDHD || '')));
    const prevIds = new Set(previousHoaDons.map(hd => String(hd.IDHOADON || hd.IDHD || '')));

    const productMap = new Map<string, any>();
    sanPhams.forEach(sp => {
      if (sp?.IDSP) productMap.set(String(sp.IDSP), sp);
    });

    // Thống kê sản phẩm hiện tại
    const productStats = new Map<string, any>();
    details.forEach(detail => {
      const invId = String(detail.IDHOADON || detail.IDHD || '');
      if (validIds.has(invId)) {
        const productId = String(detail.IDSP || '');
        const product = productMap.get(productId);
        const quantity = Math.max(1, Number(detail['Số lượng']) || 1);
        const unitPrice = Number(detail['Đơn giá']) || Number(product?.['Đơn giá']) || 25000;
        const revenue = Number(detail['Thành tiền']) || quantity * unitPrice;
        
        if (productStats.has(productId)) {
          const existing = productStats.get(productId);
          existing.quantity += quantity;
          existing.revenue += revenue;
        } else {
          productStats.set(productId, {
            id: productId,
            name: String(product?.['Tên sản phẩm'] || detail['Tên sản phẩm'] || `Món ${productId}`),
            category: String(product?.['Loại sản phẩm'] || detail['Loại sản phẩm'] || 'Đồ uống'),
            quantity,
            revenue,
            image: product?.['Hình ảnh'] || null
          });
        }
      }
    });

    // Thống kê sản phẩm kỳ trước
    const previousProductStats = new Map<string, number>();
    details.forEach(detail => {
      const invId = String(detail.IDHOADON || detail.IDHD || '');
      if (prevIds.has(invId)) {
        const productId = String(detail.IDSP || '');
        const quantity = Math.max(1, Number(detail['Số lượng']) || 1);
        previousProductStats.set(productId, (previousProductStats.get(productId) || 0) + quantity);
      }
    });

    const topProducts = Array.from(productStats.values()).map(product => {
      const previousQuantity = previousProductStats.get(product.id) || 0;
      const growth = previousQuantity > 0 ? 
        ((product.quantity - previousQuantity) / previousQuantity) * 100 : 
        product.quantity > 0 ? 100 : 0;
      
      return {
        ...product,
        avgPrice: Math.round(product.revenue / Math.max(1, product.quantity)),
        growth
      };
    }).sort((a, b) => {
      if (sortBy === 'quantity') return b.quantity - a.quantity;
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      return b.avgPrice - a.avgPrice;
    });

    const categoryStats = new Map<string, any>();
    productStats.forEach(product => {
      const category = product.category;
      if (categoryStats.has(category)) {
        const existing = categoryStats.get(category);
        existing.totalQuantity += product.quantity;
        existing.totalRevenue += product.revenue;
        existing.productCount += 1;
      } else {
        categoryStats.set(category, {
          category,
          totalQuantity: product.quantity,
          totalRevenue: product.revenue,
          productCount: 1
        });
      }
    });

    const totalQuantity = Array.from(productStats.values()).reduce((sum, p) => sum + p.quantity, 0);
    
    const categoryPerformance = Array.from(categoryStats.values()).map(cat => ({
      ...cat,
      percentage: totalQuantity > 0 ? (cat.totalQuantity / totalQuantity) * 100 : 0
    })).sort((a, b) => b.totalQuantity - a.totalQuantity);

    const revenueVsQuantity = Array.from(productStats.values()).map(product => ({
      id: product.id,
      name: product.name,
      quantity: product.quantity,
      revenue: product.revenue,
      efficiency: Math.round(product.revenue / Math.max(1, product.quantity))
    })).sort((a, b) => b.efficiency - a.efficiency);

    const timeComparison = {
      current: Array.from(productStats.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)
        .map(p => ({ name: p.name, quantity: p.quantity })),
      previous: Array.from(previousProductStats.entries())
        .map(([id, quantity]) => {
          const product = productMap.get(id);
          return { name: String(product?.['Tên sản phẩm'] || `Món ${id}`), quantity };
        })
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)
    };

    return {
      topProducts: topProducts.slice(0, 20),
      categoryPerformance,
      revenueVsQuantity: revenueVsQuantity.slice(0, 15),
      timeComparison
    };
  };

  const exportColumns: ExportColumn[] = [
    { key: 'rank', label: 'Hạng', align: 'center' },
    { key: 'id', label: 'Mã SP', align: 'left' },
    { key: 'name', label: 'Tên sản phẩm', align: 'left' },
    { key: 'category', label: 'Danh mục', align: 'left' },
    { key: 'quantity', label: 'Số lượng bán', align: 'right' },
    { key: 'avgPrice', label: 'Đơn giá TB', align: 'right', format: (v) => `${Number(v || 0).toLocaleString('vi-VN')} ₫` },
    { key: 'revenue', label: 'Tổng doanh thu', align: 'right', format: (v) => `${Number(v || 0).toLocaleString('vi-VN')} ₫` },
    { key: 'growth', label: 'Tăng trưởng (%)', align: 'right', format: (v) => `${Number(v || 0).toFixed(1)}%` },
  ];

  const exportRows = useMemo(() => {
    if (!data) return [];
    return data.topProducts.map((p, idx) => ({
      rank: idx + 1,
      id: p.id,
      name: p.name,
      category: p.category,
      quantity: p.quantity,
      avgPrice: p.avgPrice,
      revenue: p.revenue,
      growth: p.growth,
    }));
  }, [data]);

  const topProductsChartData = {
    labels: data?.topProducts.slice(0, 10).map(p => 
      p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name
    ) || [],
    datasets: [
      {
        label: sortBy === 'quantity' ? 'Số lượng bán' : 
               sortBy === 'revenue' ? 'Doanh thu (VNĐ)' : 'Hiệu quả (VNĐ/sản phẩm)',
        data: data?.topProducts.slice(0, 10).map(p => {
          if (sortBy === 'quantity') return p.quantity;
          if (sortBy === 'revenue') return p.revenue;
          return p.avgPrice;
        }) || [],
        backgroundColor: '#9932CC',
      },
    ],
  };

  const categoryChartData = {
    labels: data?.categoryPerformance.map(c => c.category) || [],
    datasets: [
      {
        data: data?.categoryPerformance.map(c => c.totalQuantity) || [],
        backgroundColor: [
          '#9932CC', '#BA55D3', '#DA70D6', '#DDA0DD', '#E6E6FA', '#F0E6FF'
        ],
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-purple-900">Báo Cáo Món Bán Chạy</h1>
          <p className="text-gray-600">Phân tích sản phẩm có hiệu suất cao nhất</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={timeRange === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('7d')}
            className={timeRange === '7d' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            7 ngày
          </Button>
          <Button
            variant={timeRange === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('30d')}
            className={timeRange === '30d' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            30 ngày
          </Button>
          <Button
            variant={timeRange === '90d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('90d')}
            className={timeRange === '90d' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            90 ngày
          </Button>
          <Button variant="outline" size="sm" onClick={handleSeedDemo} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
            <Database className="h-4 w-4 mr-2" />
            Đồng bộ DB Mẫu
          </Button>
          <Button variant="outline" size="sm" onClick={loadBestsellerData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
          <ExportDropdownButton
            data={exportRows}
            columns={exportColumns}
            filename={`Bao_Cao_Mon_Ban_Chay_${timeRange}`}
            title="BÁO CÁO XẾP HẠNG SẢN PHẨM BÁN CHẠY"
            subtitle={`Kỳ thống kê: ${timeRange === '7d' ? '7 ngày qua' : timeRange === '30d' ? '30 ngày qua' : '90 ngày qua'}`}
            summaryStats={[
              { label: 'Món bán chạy #1', value: data?.topProducts[0]?.name || 'N/A' },
              { label: 'Tổng số ly bán', value: `${data?.topProducts.reduce((s, p) => s + p.quantity, 0) || 0} ly` },
            ]}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-purple-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sản Phẩm Bán Chạy #1</CardTitle>
            <Award className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-purple-900">
              {data?.topProducts[0]?.name || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.topProducts[0]?.quantity || 0} ly đã bán
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Sản Phẩm Bán</CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {data?.topProducts.reduce((sum, p) => sum + p.quantity, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Tất cả sản phẩm</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Danh Mục Hàng Đầu</CardTitle>
            <Star className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-purple-900">
              {data?.categoryPerformance[0]?.category || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.categoryPerformance[0]?.percentage.toFixed(1) || 0}% tổng số bán
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hiệu Quả Cao Nhất</CardTitle>
            <Target className="h-4 w-4 text-purple-300" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-purple-900">
              {data?.revenueVsQuantity[0]?.efficiency.toLocaleString('vi-VN') || 0} ₫
            </div>
            <p className="text-xs text-muted-foreground">Doanh thu/sản phẩm</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ranking" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ranking">Bảng Xếp Hạng</TabsTrigger>
          <TabsTrigger value="category">Theo Danh Mục</TabsTrigger>
          <TabsTrigger value="efficiency">Hiệu Quả</TabsTrigger>
          <TabsTrigger value="comparison">So Sánh</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900 flex items-center gap-2">
                  Top 10 Sản Phẩm Bán Chạy
                  <div className="flex gap-1">
                    <Button
                      variant={sortBy === 'quantity' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSortBy('quantity')}
                      className="text-xs"
                    >
                      Số lượng
                    </Button>
                    <Button
                      variant={sortBy === 'revenue' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSortBy('revenue')}
                      className="text-xs"
                    >
                      Doanh thu
                    </Button>
                    <Button
                      variant={sortBy === 'efficiency' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSortBy('efficiency')}
                      className="text-xs"
                    >
                      Hiệu quả
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  Sắp xếp theo {sortBy === 'quantity' ? 'số lượng bán' : 
                                   sortBy === 'revenue' ? 'doanh thu' : 'hiệu quả'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar 
                    data={topProductsChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true
                        }
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Chi Tiết Top 10</CardTitle>
                <CardDescription>Thông tin chi tiết từng sản phẩm</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {data?.topProducts.slice(0, 10).map((product, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-purple-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-xs">
                            {index + 1}
                          </div>
                          <p className="font-medium">{product.name}</p>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span>{product.quantity} ly</span>
                          <span>{product.revenue.toLocaleString('vi-VN')} ₫</span>
                          <Badge 
                            variant={product.growth >= 0 ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {product.growth >= 0 ? '+' : ''}{product.growth.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="category" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Phân Bố Theo Danh Mục</CardTitle>
                <CardDescription>Tỷ lệ bán hàng của từng danh mục sản phẩm</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Doughnut 
                    data={categoryChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Thống Kê Danh Mục</CardTitle>
                <CardDescription>Hiệu suất chi tiết từng danh mục</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.categoryPerformance.map((category, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">{category.category}</h4>
                        <Badge variant="outline">
                          {category.productCount} sản phẩm
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Tổng số lượng</p>
                          <p className="font-bold">{category.totalQuantity} ly</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Doanh thu</p>
                          <p className="font-bold">{category.totalRevenue.toLocaleString('vi-VN')} ₫</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, category.percentage)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-purple-900">Hiệu Quả Doanh Thu</CardTitle>
              <CardDescription>Sản phẩm có tỷ lệ doanh thu/số lượng cao nhất</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.revenueVsQuantity.slice(0, 15).map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-600">
                          {product.quantity} ly • {product.revenue.toLocaleString('vi-VN')} ₫
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-900">
                        {product.efficiency.toLocaleString('vi-VN')} ₫
                      </p>
                      <p className="text-sm text-gray-600">mỗi ly</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Kỳ Hiện Tại</CardTitle>
                <CardDescription>Top 10 sản phẩm bán chạy nhất</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.timeComparison.current.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-purple-50">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-xs">
                          {index + 1}
                        </div>
                        <p className="font-medium">{product.name}</p>
                      </div>
                      <Badge variant="default">{product.quantity} ly</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Kỳ Trước</CardTitle>
                <CardDescription>Top 10 sản phẩm cùng kỳ trước đó</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.timeComparison.previous.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center font-bold text-white text-xs">
                          {index + 1}
                        </div>
                        <p className="font-medium">{product.name}</p>
                      </div>
                      <Badge variant="outline">{product.quantity} ly</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BestsellersReport;
