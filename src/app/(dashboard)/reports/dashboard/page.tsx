// pages/reports/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Calendar,
  FileText,
  Download,
  RefreshCw,
  AlertCircle
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
import { useReportData, ReportFilters } from '@/hooks/useReportData';
import { ReportFilters as ReportFiltersComponent } from '@/components/ReportFilters';
import { ReportKPICards } from '@/components/ReportKPICards';

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

const LoadingSkeleton = () => (
  <div className="space-y-6">
    {/* Header Skeleton */}
    <div className="flex justify-between items-center">
      <div>
        <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
        ))}
      </div>
    </div>

    {/* KPI Cards Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="border rounded-lg p-6">
          <div className="h-4 bg-gray-200 rounded w-24 mb-4 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
          <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>
      ))}
    </div>

    {/* Charts Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2].map(i => (
        <div key={i} className="border rounded-lg p-6">
          <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
          <div className="h-80 bg-gray-100 rounded animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
);

const ReportsDashboard = () => {
  // Filter states
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [categories, setCategories] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [minAmount, setMinAmount] = useState<number | undefined>(undefined);
  const [maxAmount, setMaxAmount] = useState<number | undefined>(undefined);

  // Create filters object
  const filters: ReportFilters = useMemo(() => ({
    dateRange,
    categories: categories.length > 0 ? categories : undefined,
    paymentMethods: paymentMethods.length > 0 ? paymentMethods : undefined,
    minAmount,
    maxAmount
  }), [dateRange, categories, paymentMethods, minAmount, maxAmount]);

  // Use the report data hook
  const { data, loading, error, refresh } = useReportData(filters);

  // Chart data
  const chartData = useMemo(() => {
    if (!data) return null;

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
      categoryChart: {
        labels: data.current.categories.map(c => c.name),
        datasets: [
          {
            data: data.current.categories.map(c => c.revenue),
            backgroundColor: [
              '#800080', '#9932CC', '#BA55D3', '#DA70D6', '#DDA0DD', '#E6E6FA'
            ],
          },
        ],
      },
      topProductsChart: {
        labels: data.current.products.slice(0, 10).map(p => 
          p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name
        ),
        datasets: [
          {
            label: 'Số lượng bán',
            data: data.current.products.slice(0, 10).map(p => p.quantity),
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

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export data:', data);
  };

  // Loading states
  if (loading) {
    return <LoadingSkeleton />;
  }

  // Error state
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
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Đang xử lý dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-purple-900">Dashboard Tổng Quan</h1>
          <p className="text-gray-600">Tổng quan kinh doanh và các chỉ số quan trọng</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Xuất Excel
          </Button>
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

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Tổng Quan</TabsTrigger>
          <TabsTrigger value="products">Sản Phẩm</TabsTrigger>
          <TabsTrigger value="categories">Danh Mục</TabsTrigger>
          <TabsTrigger value="payment">Thanh Toán</TabsTrigger>
          <TabsTrigger value="hourly">Theo Giờ</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="transform transition-all duration-200 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-purple-900">Xu Hướng Doanh Thu</CardTitle>
                <CardDescription>Theo dõi doanh thu theo thời gian</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Line 
                    data={chartData?.revenueChart || { labels: [], datasets: [] }} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: {
                        intersect: false,
                        mode: 'index',
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return value.toLocaleString('vi-VN') + ' ₫';
                            }
                          }
                        }
                      },
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return 'Doanh thu: ' + context.parsed.y.toLocaleString('vi-VN') + ' ₫';
                            }
                          }
                        }
                      }
                    }} 
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="transform transition-all duration-200 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-purple-900">Phân Bố Theo Danh Mục</CardTitle>
                <CardDescription>Doanh thu theo từng loại sản phẩm</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Doughnut 
                    data={chartData?.categoryChart || { labels: [], datasets: [] }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const percentage = ((context.parsed / data.current.revenue) * 100).toFixed(1);
                              return context.label + ': ' + context.parsed.toLocaleString('vi-VN') + ' ₫ (' + percentage + '%)';
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="transform transition-all duration-200 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-purple-900">Top 10 Sản Phẩm Bán Chạy</CardTitle>
                <CardDescription>Sản phẩm có số lượng bán cao nhất</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar 
                    data={chartData?.topProductsChart || { labels: [], datasets: [] }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
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

            <Card className="transform transition-all duration-200 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-purple-900">Chi Tiết Sản Phẩm Bán Chạy</CardTitle>
                <CardDescription>Thông tin chi tiết về hiệu suất bán hàng</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {data.current.products.slice(0, 10).map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-purple-50 transform transition-all duration-200 hover:bg-purple-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-600">Đã bán: {product.quantity} ly</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-900">{product.revenue.toLocaleString('vi-VN')} ₫</p>
                        <p className="text-sm text-gray-600">
                          {(product.revenue / product.quantity).toLocaleString('vi-VN')} ₫/ly
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {product.category}
                        </Badge>
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
            <Card className="transform transition-all duration-200 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-purple-900">Doanh Thu Theo Danh Mục</CardTitle>
                <CardDescription>Phân bố doanh thu theo từng loại sản phẩm</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Doughnut 
                    data={chartData?.categoryChart || { labels: [], datasets: [] }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const percentage = ((context.parsed / data.current.revenue) * 100).toFixed(1);
                              return context.label + ': ' + context.parsed.toLocaleString('vi-VN') + ' ₫ (' + percentage + '%)';
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="transform transition-all duration-200 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-purple-900">Chi Tiết Theo Danh Mục</CardTitle>
                <CardDescription>Thông tin chi tiết từng danh mục sản phẩm</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {data.current.categories.map((category, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-purple-50 transform transition-all duration-200 hover:bg-purple-100">
                      <div className="flex-1">
                        <p className="font-medium">{category.name}</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full transition-all duration-500 ease-out" 
                            style={{ width: `${category.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-purple-900">{category.revenue.toLocaleString('vi-VN')} ₫</p>
                        <p className="text-sm text-gray-600">{category.orders} đơn hàng</p>
                        <Badge variant="outline" className="border-purple-300 text-purple-700">
                          {category.percentage.toFixed(1)}%
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
            <Card className="transform transition-all duration-200 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-purple-900">Phương Thức Thanh Toán</CardTitle>
                <CardDescription>Thống kê các hình thức thanh toán</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.current.paymentMethods.map((method, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-purple-50 transform transition-all duration-200 hover:bg-purple-100">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-purple-600" />
                        <div className="flex-1">
                          <p className="font-medium">{method.method}</p>
                          <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all duration-500 ease-out" 
                              style={{ width: `${method.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-900">{method.count} đơn</p>
                        <p className="text-sm text-gray-600">{method.revenue.toLocaleString('vi-VN')} ₫</p>
                        <Badge variant="outline" className="border-purple-300 text-purple-700">
                          {method.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="transform transition-all duration-200 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-purple-900">Thống Kê Thanh Toán</CardTitle>
                <CardDescription>Tổng quan về các phương thức thanh toán</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                    <p className="text-sm text-gray-600">Tổng số giao dịch</p>
                    <p className="text-3xl font-bold text-purple-900">{data.current.orders}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {data.current.paymentMethods.map((method, index) => (
                      <div key={index} className="text-center p-3 bg-purple-50 rounded-lg transform transition-all duration-200 hover:bg-purple-100 hover:scale-105">
                        <p className="text-sm text-gray-600 truncate">{method.method}</p>
                        <p className="text-xl font-bold text-purple-900">{method.count}</p>
                        <p className="text-xs text-purple-600">{method.percentage.toFixed(1)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="hourly" className="space-y-4">
          <Card className="transform transition-all duration-200 hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-purple-900">Phân Bố Đơn Hàng Theo Giờ</CardTitle>
              <CardDescription>Xem giờ nào có nhiều khách hàng nhất</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Bar 
                  data={chartData?.hourlyChart || { labels: [], datasets: [] }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsDashboard;