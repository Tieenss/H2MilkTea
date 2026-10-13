// pages/reports/customers/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  UserCheck, 
  Star, 
  TrendingUp,
  Calendar,
  Download,
  CreditCard,
  Phone,
  MapPin
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
  LineElement,
  PointElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import AuthUtils from '@/utils/authUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
);

interface CustomerReportData {
  totalCustomers: number;
  activeCustomers: number;
  vipCustomers: number;
  newCustomersThisMonth: number;
  customersByType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  customersByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  topSpenders: Array<{
    id: string;
    name: string;
    phone: string;
    totalSpent: number;
    visits: number;
    lastVisit: string;
    loyaltyPoints: number;
  }>;
  customerGrowth: Array<{
    month: string;
    newCustomers: number;
    totalCustomers: number;
  }>;
  demographicsByAge: Array<{
    ageGroup: string;
    count: number;
    percentage: number;
  }>;
  demographicsByGender: Array<{
    gender: string;
    count: number;
    percentage: number;
  }>;
  locationStats: Array<{
    district: string;
    count: number;
    percentage: number;
  }>;
}

const parseVietnameseDate = (dateString: string): Date | null => {
  if (!dateString || dateString.trim() === '') return null;
  
  try {
    const directParse = new Date(dateString);
    if (!isNaN(directParse.getTime())) {
      return directParse;
    }
    
    const parts = dateString.trim().split(' ');
    const datePart = parts[0];
    const timePart = parts[1] || '00:00:00';
    
    const [day, month, year] = datePart.split('/').map(num => parseInt(num, 10));
    const [hour, minute, second] = timePart.split(':').map(num => parseInt(num, 10));
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return null;
    }
    
    const date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const calculateAge = (birthDate: string): number => {
  const birth = parseVietnameseDate(birthDate);
  if (!birth) return 0;
  
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

const getAgeGroup = (age: number): string => {
  if (age < 18) return 'Dưới 18';
  if (age < 25) return '18-24';
  if (age < 35) return '25-34';
  if (age < 45) return '35-44';
  if (age < 55) return '45-54';
  if (age < 65) return '55-64';
  return 'Trên 65';
};

const CustomersReport = () => {
  const [data, setData] = useState<CustomerReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    loadCustomerData();
  }, [timeRange]);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      
      const [customersRes, hoaDonRes] = await Promise.all([
        AuthUtils.getAllKhachHang(),
        AuthUtils.getAllHoaDon()
      ]);

      const customersData = Array.isArray(customersRes) ? customersRes : customersRes.data;
      const hoaDonData = Array.isArray(hoaDonRes) ? hoaDonRes : hoaDonRes.data;

      const reportData = processCustomerData(customersData, hoaDonData);
      setData(reportData);
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processCustomerData = (customers: any[], hoaDons: any[]): CustomerReportData => {
    const now = new Date();
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Filter customers based on time range
    const filteredCustomers = customers.filter(customer => {
      const createDate = parseVietnameseDate(customer['Ngày tạo']);
      return createDate && createDate >= startDate;
    });

    // Basic stats
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c['Trạng thái'] === 'Hoạt động').length;
    const vipCustomers = customers.filter(c => c['Loại khách hàng'] === 'Khách VIP').length;
    const newCustomersThisMonth = filteredCustomers.length;

    // Customer types
    const typeStats = new Map();
    customers.forEach(customer => {
      const type = customer['Loại khách hàng'] || 'Khác';
      typeStats.set(type, (typeStats.get(type) || 0) + 1);
    });

    const customersByType = Array.from(typeStats.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: (count / totalCustomers) * 100
    })).sort((a, b) => b.count - a.count);

    // Customer status
    const statusStats = new Map();
    customers.forEach(customer => {
      const status = customer['Trạng thái'] || 'Khác';
      statusStats.set(status, (statusStats.get(status) || 0) + 1);
    });

    const customersByStatus = Array.from(statusStats.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: (count / totalCustomers) * 100
    })).sort((a, b) => b.count - a.count);

    // Top spenders
    const topSpenders = customers
      .map(customer => {
        const totalSpent = parseInt(customer['Tổng chi tiêu'] || '0');
        const customerHoaDons = hoaDons.filter(hd => 
          hd['Khách hàng'] === customer['Tên khách hàng'] ||
          customer['Hóa đơn liên quan']?.includes(hd.IDHOADON)
        );
        
        return {
          id: customer.IDKHACHHANG,
          name: customer['Tên khách hàng'],
          phone: customer['Số điện thoại'],
          totalSpent,
          visits: customerHoaDons.length,
          lastVisit: customer['Lần mua cuối'] || '',
          loyaltyPoints: parseInt(customer['Điểm tích lũy'] || '0')
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Customer growth by month
    const growthStats = new Map();
    customers.forEach(customer => {
      const createDate = parseVietnameseDate(customer['Ngày tạo']);
      if (createDate) {
        const monthKey = `${createDate.getFullYear()}-${createDate.getMonth() + 1}`;
        growthStats.set(monthKey, (growthStats.get(monthKey) || 0) + 1);
      }
    });

    const customerGrowth = Array.from(growthStats.entries())
      .map(([month, newCustomers]) => ({
        month,
        newCustomers,
        totalCustomers: 0 // Will be calculated cumulatively
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months

    // Calculate cumulative totals
    let cumulative = 0;
    customerGrowth.forEach(item => {
      cumulative += item.newCustomers;
      item.totalCustomers = cumulative;
    });

    // Demographics by age
    const ageStats = new Map();
    customers.forEach(customer => {
      if (customer['Ngày sinh']) {
        const age = calculateAge(customer['Ngày sinh']);
        const ageGroup = getAgeGroup(age);
        ageStats.set(ageGroup, (ageStats.get(ageGroup) || 0) + 1);
      }
    });

    const demographicsByAge = Array.from(ageStats.entries()).map(([ageGroup, count]) => ({
      ageGroup,
      count,
      percentage: (count / totalCustomers) * 100
    })).sort((a, b) => {
      const order = ['Dưới 18', '18-24', '25-34', '35-44', '45-54', '55-64', 'Trên 65'];
      return order.indexOf(a.ageGroup) - order.indexOf(b.ageGroup);
    });

    // Demographics by gender
    const genderStats = new Map();
    customers.forEach(customer => {
      const gender = customer['Giới tính'] || 'Khác';
      genderStats.set(gender, (genderStats.get(gender) || 0) + 1);
    });

    const demographicsByGender = Array.from(genderStats.entries()).map(([gender, count]) => ({
      gender,
      count,
      percentage: (count / totalCustomers) * 100
    })).sort((a, b) => b.count - a.count);

    // Location stats (by district)
    const locationStats = new Map();
    customers.forEach(customer => {
      if (customer['Địa chỉ']) {
        const addressParts = customer['Địa chỉ'].split(',');
        const district = addressParts.length > 1 ? addressParts[1].trim() : 'Khác';
        locationStats.set(district, (locationStats.get(district) || 0) + 1);
      }
    });

    const locationStatsArray = Array.from(locationStats.entries()).map(([district, count]) => ({
      district,
      count,
      percentage: (count / totalCustomers) * 100
    })).sort((a, b) => b.count - a.count).slice(0, 10);

    return {
      totalCustomers,
      activeCustomers,
      vipCustomers,
      newCustomersThisMonth,
      customersByType,
      customersByStatus,
      topSpenders,
      customerGrowth,
      demographicsByAge,
      demographicsByGender,
      locationStats: locationStatsArray
    };
  };

  const customerTypeChartData = {
    labels: data?.customersByType.map(c => c.type) || [],
    datasets: [
      {
        data: data?.customersByType.map(c => c.count) || [],
        backgroundColor: [
          '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE'
        ],
      },
    ],
  };

  const customerGrowthChartData = {
    labels: data?.customerGrowth.map(c => {
      const [year, month] = c.month.split('-');
      return `${month}/${year}`;
    }) || [],
    datasets: [
      {
        label: 'Khách hàng mới',
        data: data?.customerGrowth.map(c => c.newCustomers) || [],
        backgroundColor: '#8B5CF6',
        borderColor: '#7C3AED',
        tension: 0.4
      }
    ],
  };

  const ageChartData = {
    labels: data?.demographicsByAge.map(a => a.ageGroup) || [],
    datasets: [
      {
        label: 'Số lượng khách hàng',
        data: data?.demographicsByAge.map(a => a.count) || [],
        backgroundColor: '#8B5CF6',
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-purple-900">Báo Cáo Khách Hàng</h1>
          <p className="text-gray-600">Phân tích dữ liệu khách hàng và xu hướng phát triển</p>
        </div>
        <div className="flex gap-2">
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
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Xuất Excel
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-purple-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Khách Hàng</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {data?.totalCustomers.toLocaleString('vi-VN') || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Tất cả khách hàng trong hệ thống
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Khách Hàng Hoạt Động</CardTitle>
            <UserCheck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {data?.activeCustomers.toLocaleString('vi-VN') || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {((data?.activeCustomers || 0) / (data?.totalCustomers || 1) * 100).toFixed(1)}% tổng số
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Khách VIP</CardTitle>
            <Star className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {data?.vipCustomers.toLocaleString('vi-VN') || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {((data?.vipCustomers || 0) / (data?.totalCustomers || 1) * 100).toFixed(1)}% tổng số
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Khách Hàng Mới</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {data?.newCustomersThisMonth.toLocaleString('vi-VN') || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Trong {timeRange === '7d' ? '7 ngày' : timeRange === '30d' ? '30 ngày' : '90 ngày'} qua
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Tổng Quan</TabsTrigger>
          <TabsTrigger value="topspenders">Khách VIP</TabsTrigger>
          <TabsTrigger value="demographics">Nhân Khẩu</TabsTrigger>
          <TabsTrigger value="growth">Tăng Trưởng</TabsTrigger>
          <TabsTrigger value="location">Địa Lý</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Phân Loại Khách Hàng</CardTitle>
                <CardDescription>Phân bố theo loại khách hàng</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Doughnut 
                    data={customerTypeChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const total = data?.totalCustomers || 1;
                              const percentage = ((context.parsed / total) * 100).toFixed(1);
                              return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Thống Kê Trạng Thái</CardTitle>
                <CardDescription>Phân bố theo trạng thái hoạt động</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.customersByStatus.map((status, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">{status.status}</h4>
                        <Badge variant={status.status === 'Hoạt động' ? 'default' : 'outline'}>
                          {status.count} khách hàng
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Số lượng</p>
                          <p className="font-bold">{status.count.toLocaleString('vi-VN')}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Tỷ lệ</p>
                          <p className="font-bold">{status.percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${status.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="topspenders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-purple-900">Top 10 Khách Hàng VIP</CardTitle>
              <CardDescription>Khách hàng có tổng chi tiêu cao nhất</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.topSpenders.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border bg-purple-50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-lg">{customer.name}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {customer.visits} lần mua
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {customer.loyaltyPoints} điểm
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl text-purple-900">
                        {customer.totalSpent.toLocaleString('vi-VN')} ₫
                      </p>
                      <p className="text-sm text-gray-600">
                        Lần cuối: {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString('vi-VN') : 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Phân Bố Theo Tuổi</CardTitle>
                <CardDescription>Thống kê khách hàng theo nhóm tuổi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar 
                    data={ageChartData}
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
                <CardTitle className="text-purple-900">Phân Bố Theo Giới Tính</CardTitle>
                <CardDescription>Thống kê khách hàng theo giới tính</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.demographicsByGender.map((gender, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">{gender.gender}</h4>
                        <Badge variant="outline">
                          {gender.count} khách hàng
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Số lượng</p>
                          <p className="font-bold">{gender.count.toLocaleString('vi-VN')}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Tỷ lệ</p>
                          <p className="font-bold">{gender.percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${gender.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="growth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-purple-900">Xu Hướng Tăng Trưởng Khách Hàng</CardTitle>
              <CardDescription>Số lượng khách hàng mới theo tháng</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Line 
                  data={customerGrowthChartData}
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
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-purple-900">Phân Bố Theo Khu Vực</CardTitle>
              <CardDescription>Top 10 khu vực có nhiều khách hàng nhất</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.locationStats.map((location, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-sm">
                        {index + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-purple-600" />
                        <p className="font-medium">{location.district}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-900">
                        {location.count} khách hàng
                      </p>
                      <p className="text-sm text-gray-600">
                        {location.percentage.toFixed(1)}% tổng số
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomersReport;
