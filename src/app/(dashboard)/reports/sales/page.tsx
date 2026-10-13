// pages/reports/sales/page.tsx
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
  AlertCircle,
  TrendingDown
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
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
  LineElement,
  PointElement
);

const SalesReport = () => {
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
            borderColor: '#9932CC',
            backgroundColor: 'rgba(153, 50, 204, 0.1)',
            tension: 0.1,
          },
        ],
      },
      ordersChart: {
        labels: data.current.dailyData.map(d => d.date),
        datasets: [
          {
            label: 'Số đơn hàng',
            data: data.current.dailyData.map(d => d.orders),
            borderColor: '#BA55D3',
            backgroundColor: 'rgba(186, 85, 211, 0.1)',
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
      hourlyChart: {
        labels: data.current.hourlyData.map(h => `${h.hour}:00`),
        datasets: [
          {
            label: 'Số đơn hàng',
            data: data.current.hourlyData.map(h => h.orders),
            backgroundColor: '#9932CC',
          },
        ],
      },
      categoryChart: {
        labels: data.current.categories.map(c => c.name),
        datasets: [
          {
            label: 'Doanh thu (VNĐ)',
            data: data.current.categories.map(c => c.revenue),
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
    console.log('Export sales data:', data);
  };

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
          <h1 className="text-3xl font-bold text-purple-900">Báo Cáo Bán Hàng</h1>
          <p className="text-gray-600">Phân tích chi tiết doanh số và xu hướng bán hàng</p>
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
          <TabsTrigger value="daily">Theo Ngày</TabsTrigger>
          <TabsTrigger value="hourly">Theo Giờ</TabsTrigger>
          <TabsTrigger value="categories">Danh Mục</TabsTrigger>
          <TabsTrigger value="payment">Thanh Toán</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="transform transition-all duration-200 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-purple-900">Xu Hướng Doanh Thu & Đơn Hàng</CardTitle>
                <CardDescription>Theo dõi doanh thu và số đơn hàng theo thời gian</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Line 
                    data={chartData?.combinedChart || { labels: [], datasets: [] }} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: {
                        intersect: false,
                        mode: 'index',
                      },
                      scales: {
                        y: {
                          type: 'linear',
                          display: true,
                          position: 'left',
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return value.toLocaleString('vi-VN') + ' ₫';
                            }
                          }
                        },
                        y1: {
                          type: 'linear',
                          display: true,
                          position: 'right',
                          beginAtZero: true,
                          grid: {
                            drawOnChartArea: false,
                          },
                        },
                      },
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              if (context.dataset.label === 'Doanh thu (VNĐ)') {
                                return 'Doanh thu: ' + context.parsed.y.toLocaleString('vi-VN') + ' ₫';
                              }
                              return context.dataset.label + ': ' + context.parsed.y;
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
                <CardTitle className="text-purple-900">Thống Kê So Sánh</CardTitle>
                <CardDescription>So sánh hiệu suất với kỳ trước</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Revenue Comparison */}
                  <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-purple-900">Doanh Thu</h4>
                      <Badge 
                        variant={data.comparison.isRevenuePositive ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {data.comparison.revenueGrowth >= 0 ? '+' : ''}{data.comparison.revenueGrowth.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Kỳ này</p>
                        <p className="font-bold text-lg">{data.current.revenue.toLocaleString('vi-VN')} ₫</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Kỳ trước</p>
                        <p className="font-bold text-lg">{data.previous.revenue.toLocaleString('vi-VN')} ₫</p>
                      </div>
                    </div>
                  </div>

                  {/* Orders Comparison */}
                  <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-green-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-green-900">Đơn Hàng</h4>
                      <Badge 
                        variant={data.comparison.isOrdersPositive ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {data.comparison.ordersGrowth >= 0 ? '+' : ''}{data.comparison.ordersGrowth.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Kỳ này</p>
                        <p className="font-bold text-lg">{data.current.orders.toLocaleString('vi-VN')}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Kỳ trước</p>
                        <p className="font-bold text-lg">{data.previous.orders.toLocaleString('vi-VN')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Average Order Value Comparison */}
                  <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-blue-900">Giá Trị TB/Đơn</h4>
                      <Badge 
                        variant={data.comparison.isAverageOrderValuePositive ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {data.comparison.averageOrderValueGrowth >= 0 ? '+' : ''}{data.comparison.averageOrderValueGrowth.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Kỳ này</p>
                        <p className="font-bold text-lg">{data.current.averageOrderValue.toLocaleString('vi-VN')} ₫</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Kỳ trước</p>
                        <p className="font-bold text-lg">{data.previous.averageOrderValue.toLocaleString('vi-VN')} ₫</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="daily" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="transform transition-all duration-200 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-purple-900">Xu Hướng Doanh Thu Hàng Ngày</CardTitle>
                <CardDescription>Theo dõi doanh thu từng ngày trong khoảng thời gian đã chọn</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Line 
                    data={chartData?.revenueChart || { labels: [], datasets: [] }} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
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
                <CardTitle className="text-purple-900">Xu Hướng Đơn Hàng Hàng Ngày</CardTitle>
                <CardDescription>Theo dõi số lượng đơn hàng từng ngày</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Line 
                    data={chartData?.ordersChart || { labels: [], datasets: [] }} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true
                        }
                      },
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return 'Số đơn hàng: ' + context.parsed.y;
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

          {/* Daily Data Table */}
          <Card className="transform transition-all duration-200 hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-purple-900">Chi Tiết Theo Ngày</CardTitle>
              <CardDescription>Bảng dữ liệu chi tiết từng ngày</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Ngày</th>
                      <th className="text-right p-2">Doanh Thu</th>
                      <th className="text-right p-2">Số Đơn Hàng</th>
                      <th className="text-right p-2">Giá Trị TB/Đơn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.current.dailyData.map((day, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{day.date}</td>
                        <td className="p-2 text-right font-bold text-purple-900">
                          {day.revenue.toLocaleString('vi-VN')} ₫
                        </td>
                        <td className="p-2 text-right">{day.orders}</td>
                        <td className="p-2 text-right text-gray-600">
                          {day.orders > 0 ? (day.revenue / day.orders).toLocaleString('vi-VN') : 0} ₫
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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

          {/* Hourly Data Table */}
          <Card className="transform transition-all duration-200 hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-purple-900">Chi Tiết Theo Giờ</CardTitle>
              <CardDescription>Bảng dữ liệu chi tiết từng giờ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {data.current.hourlyData.map((hour, index) => (
                  <div key={index} className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="font-bold text-purple-900">{hour.hour}:00</p>
                    <p className="text-sm text-gray-600">{hour.orders} đơn</p>
                    <p className="text-xs text-purple-600">
                      {hour.revenue.toLocaleString('vi-VN')} ₫
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="transform transition-all duration-200 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-purple-900">Doanh Thu Theo Danh Mục</CardTitle>
                <CardDescription>Phân tích doanh thu theo từng danh mục sản phẩm</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar 
                    data={chartData?.categoryChart || { labels: [], datasets: [] }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return value.toLocaleString('vi-VN') + ' ₫';
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
                <CardTitle className="text-purple-900">Chi Tiết Danh Mục</CardTitle>
                <CardDescription>Thông tin chi tiết từng danh mục</CardDescription>
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
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-purple-50">
                      <div>
                        <p className="font-medium">{method.method}</p>
                        <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-purple-600 h-2 rounded-full" 
                            style={{ width: `${method.percentage}%` }}
                          ></div>
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
                <CardTitle className="text-purple-900">Tổng Quan Thanh Toán</CardTitle>
                <CardDescription>Phân tích hiệu quả từng phương thức</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.current.paymentMethods.map((method, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">{method.method}</h4>
                        <Badge variant="outline">{method.count} đơn</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Tổng doanh thu</p>
                          <p className="font-bold">{method.revenue.toLocaleString('vi-VN')} ₫</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Trung bình/đơn</p>
                          <p className="font-bold">{(method.revenue / method.count).toLocaleString('vi-VN')} ₫</p>
                        </div>
                      </div>
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

export default SalesReport;