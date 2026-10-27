// pages/reports/sales/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw,
  AlertCircle,
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
  LineElement,
  PointElement,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { DateRange } from 'react-day-picker';
import { useReportData, ReportFilters } from '@/hooks/useReportData';
import { ReportFilters as ReportFiltersComponent } from '@/components/ReportFilters';
import { ReportKPICards } from '@/components/ReportKPICards';
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
  LineElement,
  PointElement
);

const SalesReport = () => {
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

  const handleSeedDemo = async () => {
    const res = await reseedTestDatabase();
    toast.success(`Đã đồng bộ ${res.invoices} hóa đơn mẫu thành công!`);
  };

  const exportColumns: ExportColumn[] = [
    { key: 'date', label: 'Ngày', align: 'center' },
    { key: 'orders', label: 'Số đơn hàng', align: 'right' },
    { key: 'revenue', label: 'Doanh thu (VNĐ)', align: 'right', format: (v) => `${Number(v || 0).toLocaleString('vi-VN')} ₫` },
    { key: 'avgOrder', label: 'Trung bình/đơn (VNĐ)', align: 'right', format: (v) => `${Number(v || 0).toLocaleString('vi-VN')} ₫` },
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
          <h1 className="text-3xl font-bold text-purple-900">Báo Cáo Bán Hàng</h1>
          <p className="text-gray-600">Phân tích chi tiết doanh số và xu hướng bán hàng</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleSeedDemo} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
            <Database className="h-4 w-4 mr-2" />
            Đồng bộ DB Mẫu (Test)
          </Button>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
          <ExportDropdownButton
            data={exportRows}
            columns={exportColumns}
            filename="Bao_Cao_Doanh_So_Ban_Hang"
            title="BÁO CÁO DOANH SỐ BÁN HÀNG THEO NGÀY"
            subtitle={`Tổng doanh thu: ${data.current.revenue.toLocaleString('vi-VN')} ₫ | Tổng đơn: ${data.current.orders}`}
            summaryStats={[
              { label: 'Doanh thu kỳ này', value: `${data.current.revenue.toLocaleString('vi-VN')} ₫` },
              { label: 'Doanh thu kỳ trước', value: `${data.previous.revenue.toLocaleString('vi-VN')} ₫` },
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
                  <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-purple-900">Doanh Thu</h4>
                      <Badge variant={data.comparison.isRevenuePositive ? "default" : "destructive"} className="text-xs">
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

                  <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-green-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-green-900">Đơn Hàng</h4>
                      <Badge variant={data.comparison.isOrdersPositive ? "default" : "destructive"} className="text-xs">
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

                  <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-blue-900">Giá Trị TB/Đơn</h4>
                      <Badge variant={data.comparison.isAverageOrderValuePositive ? "default" : "destructive"} className="text-xs">
                        {data.comparison.averageOrderValueGrowth >= 0 ? '+' : ''}{data.comparison.averageOrderValueGrowth.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Kỳ này</p>
                        <p className="font-bold text-lg">{Math.round(data.current.averageOrderValue).toLocaleString('vi-VN')} ₫</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Kỳ trước</p>
                        <p className="font-bold text-lg">{Math.round(data.previous.averageOrderValue).toLocaleString('vi-VN')} ₫</p>
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
                      }
                    }} 
                  />
                </div>
              </CardContent>
            </Card>
          </div>

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
                          {day.orders > 0 ? Math.round(day.revenue / day.orders).toLocaleString('vi-VN') : 0} ₫
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
                            style={{ width: `${Math.min(100, category.percentage)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-purple-900">{category.revenue.toLocaleString('vi-VN')} ₫</p>
                        <p className="text-sm text-gray-600">{category.orders} lượt món</p>
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
                          <p className="font-bold">{Math.round(method.revenue / Math.max(1, method.count)).toLocaleString('vi-VN')} ₫</p>
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
