'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Target,
  RefreshCw,
  AlertCircle,
  BarChart3,
  PieChart
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
            label: 'Số đơn hàng',
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

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export products data:', data);
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
          <h1 className="text-3xl font-bold text-purple-900">Báo Cáo Sản Phẩm</h1>
          <p className="text-gray-600">Phân tích hiệu suất sản phẩm và danh mục</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Package className="h-4 w-4 mr-2" />
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-purple-600 transform transition-all duration-200 hover:scale-105">
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

        <Card className="border-l-4 border-l-purple-500 transform transition-all duration-200 hover:scale-105">
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

        <Card className="border-l-4 border-l-purple-400 transform transition-all duration-200 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sản Phẩm Bán Chạy</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {data.current.products.length > 0 ? data.current.products[0].name : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.current.products.length > 0 ? `${data.current.products[0].quantity} ly đã bán` : 'Không có dữ liệu'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-300 transform transition-all duration-200 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Danh Mục Tốt Nhất</CardTitle>
            <PieChart className="h-4 w-4 text-purple-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
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
            <Card className="transform transition-all duration-200 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-purple-900">Top 10 Sản Phẩm Bán Chạy</CardTitle>
                <CardDescription>Theo số lượng bán</CardDescription>
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
                <CardTitle className="text-purple-900">Phân Bố Theo Danh Mục</CardTitle>
                <CardDescription>Theo doanh thu</CardDescription>
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
                <CardTitle className="text-purple-900">Top 10 Sản Phẩm Theo Doanh Thu</CardTitle>
                <CardDescription>Sản phẩm có doanh thu cao nhất</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar 
                    data={chartData?.topProductsRevenueChart || { labels: [], datasets: [] }}
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
                <CardTitle className="text-purple-900">Chi Tiết Sản Phẩm Bán Chạy</CardTitle>
                <CardDescription>Thông tin chi tiết từng sản phẩm</CardDescription>
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
                          <p className="text-sm text-gray-600">{product.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-900">{product.quantity} ly</p>
                        <p className="text-sm text-gray-600">{product.revenue.toLocaleString('vi-VN')} ₫</p>
                        <p className="text-xs text-purple-600">
                          {(product.revenue / product.quantity).toLocaleString('vi-VN')} ₫/ly
                        </p>
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
                <CardTitle className="text-purple-900">Số Đơn Hàng Theo Danh Mục</CardTitle>
                <CardDescription>Phân tích số lượng đơn hàng</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar 
                    data={chartData?.categoryQuantityChart || { labels: [], datasets: [] }}
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
                <CardTitle className="text-purple-900">Chi Tiết Theo Danh Mục</CardTitle>
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

        <TabsContent value="details" className="space-y-4">
          {/* Products Table */}
          <Card className="transform transition-all duration-200 hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-purple-900">Bảng Dữ Liệu Sản Phẩm</CardTitle>
              <CardDescription>Thông tin chi tiết tất cả sản phẩm</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">STT</th>
                      <th className="text-left p-2">Tên Sản Phẩm</th>
                      <th className="text-left p-2">Danh Mục</th>
                      <th className="text-right p-2">Số Lượng</th>
                      <th className="text-right p-2">Doanh Thu</th>
                      <th className="text-right p-2">Giá TB/Ly</th>
                      <th className="text-right p-2">Tỷ Lệ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.current.products.map((product, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{index + 1}</td>
                        <td className="p-2 font-medium">{product.name}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                        </td>
                        <td className="p-2 text-right font-bold">{product.quantity}</td>
                        <td className="p-2 text-right font-bold text-purple-900">
                          {product.revenue.toLocaleString('vi-VN')} ₫
                        </td>
                        <td className="p-2 text-right text-gray-600">
                          {(product.revenue / product.quantity).toLocaleString('vi-VN')} ₫
                        </td>
                        <td className="p-2 text-right">
                          <Badge variant="outline" className="text-xs">
                            {((product.revenue / data.current.revenue) * 100).toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Categories Table */}
          <Card className="transform transition-all duration-200 hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-purple-900">Bảng Dữ Liệu Danh Mục</CardTitle>
              <CardDescription>Thông tin chi tiết tất cả danh mục</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">STT</th>
                      <th className="text-left p-2">Tên Danh Mục</th>
                      <th className="text-right p-2">Số Đơn Hàng</th>
                      <th className="text-right p-2">Doanh Thu</th>
                      <th className="text-right p-2">Tỷ Lệ</th>
                      <th className="text-right p-2">Hiệu Suất</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.current.categories.map((category, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{index + 1}</td>
                        <td className="p-2 font-medium">{category.name}</td>
                        <td className="p-2 text-right font-bold">{category.orders}</td>
                        <td className="p-2 text-right font-bold text-purple-900">
                          {category.revenue.toLocaleString('vi-VN')} ₫
                        </td>
                        <td className="p-2 text-right">
                          <Badge variant="outline" className="text-xs">
                            {category.percentage.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="p-2 text-right text-gray-600">
                          {(category.revenue / category.orders).toLocaleString('vi-VN')} ₫/đơn
                        </td>
                      </tr>
                    ))}
                  </tbody>
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