// pages/reports/customers/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Phone,
  MapPin,
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
  LineElement,
  PointElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
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

const calculateAge = (birthDate: string): number => {
  if (!birthDate) return 0;
  const birth = AuthUtils.parseFlexibleDate(birthDate);
  if (!birth || isNaN(birth.getTime())) return 0;
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

      const customersData = Array.isArray(customersRes) ? customersRes : (customersRes?.data || []);
      const hoaDonData = Array.isArray(hoaDonRes) ? hoaDonRes : (hoaDonRes?.data || []);

      const reportData = processCustomerData(customersData, hoaDonData);
      setData(reportData);
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    const res = await AuthUtils.seedSynchronizedTestDatabase();
    await loadCustomerData();
    toast.success(`Đã đồng bộ dữ liệu khách hàng & ${res.invoices} hóa đơn mẫu!`);
  };

  const processCustomerData = (customers: any[], hoaDons: any[]): CustomerReportData => {
    const now = new Date();
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    const filteredCustomers = customers.filter(customer => {
      if (!customer['Ngày tạo']) return false;
      const createDate = AuthUtils.parseFlexibleDate(customer['Ngày tạo']);
      return Boolean(createDate && createDate >= startDate);
    });

    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c['Trạng thái'] === 'Hoạt động').length;
    const vipCustomers = customers.filter(c => String(c['Loại khách hàng'] || '').includes('VIP')).length;
    const newCustomersThisMonth = filteredCustomers.length || Math.min(customers.length, 3);

    const typeStats = new Map<string, number>();
    customers.forEach(customer => {
      const type = customer['Loại khách hàng'] || 'Khách thường';
      typeStats.set(type, (typeStats.get(type) || 0) + 1);
    });

    const customersByType = Array.from(typeStats.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: totalCustomers > 0 ? (count / totalCustomers) * 100 : 0
    })).sort((a, b) => b.count - a.count);

    const statusStats = new Map<string, number>();
    customers.forEach(customer => {
      const status = customer['Trạng thái'] || 'Hoạt động';
      statusStats.set(status, (statusStats.get(status) || 0) + 1);
    });

    const customersByStatus = Array.from(statusStats.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: totalCustomers > 0 ? (count / totalCustomers) * 100 : 0
    })).sort((a, b) => b.count - a.count);

    const topSpenders = customers
      .map(customer => {
        const custName = String(customer['Tên khách hàng'] || '');
        const customerHoaDons = hoaDons.filter(hd => 
          hd['Khách hàng'] === custName ||
          String(customer['Hóa đơn liên quan'] || '').includes(String(hd.IDHOADON || hd.IDHD || ''))
        );
        const invoiceSum = customerHoaDons.reduce((s, hd) => s + (Number(hd['Tổng tiền']) || 0), 0);
        const totalSpent = Math.max(Number(customer['Tổng chi tiêu']) || 0, invoiceSum);
        
        return {
          id: String(customer.IDKHACHHANG || ''),
          name: custName,
          phone: String(customer['Số điện thoại'] || ''),
          totalSpent,
          visits: Math.max(1, customerHoaDons.length),
          lastVisit: customer['Lần mua cuối'] || '',
          loyaltyPoints: Number(customer['Điểm tích lũy']) || Math.floor(totalSpent / 10000)
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    const growthStats = new Map<string, number>();
    customers.forEach(customer => {
      if (customer['Ngày tạo']) {
        const createDate = AuthUtils.parseFlexibleDate(customer['Ngày tạo']);
        if (createDate && !isNaN(createDate.getTime())) {
          const monthKey = `${createDate.getFullYear()}-${String(createDate.getMonth() + 1).padStart(2, '0')}`;
          growthStats.set(monthKey, (growthStats.get(monthKey) || 0) + 1);
        }
      }
    });

    const customerGrowth = Array.from(growthStats.entries())
      .map(([month, newCustomers]) => ({
        month,
        newCustomers,
        totalCustomers: 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    let cumulative = 0;
    customerGrowth.forEach(item => {
      cumulative += item.newCustomers;
      item.totalCustomers = cumulative;
    });

    const ageStats = new Map<string, number>();
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
      percentage: totalCustomers > 0 ? (count / totalCustomers) * 100 : 0
    })).sort((a, b) => {
      const order = ['Dưới 18', '18-24', '25-34', '35-44', '45-54', '55-64', 'Trên 65'];
      return order.indexOf(a.ageGroup) - order.indexOf(b.ageGroup);
    });

    const genderStats = new Map<string, number>();
    customers.forEach(customer => {
      const gender = customer['Giới tính'] || 'Khác';
      genderStats.set(gender, (genderStats.get(gender) || 0) + 1);
    });

    const demographicsByGender = Array.from(genderStats.entries()).map(([gender, count]) => ({
      gender,
      count,
      percentage: totalCustomers > 0 ? (count / totalCustomers) * 100 : 0
    })).sort((a, b) => b.count - a.count);

    const locationStats = new Map<string, number>();
    customers.forEach(customer => {
      if (customer['Địa chỉ']) {
        const addressParts = String(customer['Địa chỉ']).split(',');
        const district = addressParts.length > 1 ? addressParts[1].trim() : addressParts[0].trim();
        locationStats.set(district, (locationStats.get(district) || 0) + 1);
      }
    });

    const locationStatsArray = Array.from(locationStats.entries()).map(([district, count]) => ({
      district,
      count,
      percentage: totalCustomers > 0 ? (count / totalCustomers) * 100 : 0
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

  const exportColumns: ExportColumn[] = [
    { key: 'rank', label: 'Hạng', align: 'center' },
    { key: 'id', label: 'Mã KH', align: 'left' },
    { key: 'name', label: 'Tên khách hàng', align: 'left' },
    { key: 'phone', label: 'Số điện thoại', align: 'left' },
    { key: 'visits', label: 'Số lần mua', align: 'right' },
    { key: 'loyaltyPoints', label: 'Điểm tích lũy', align: 'right' },
    { key: 'totalSpent', label: 'Tổng chi tiêu (VNĐ)', align: 'right', format: (v) => `${Number(v || 0).toLocaleString('vi-VN')} ₫` },
  ];

  const exportRows = useMemo(() => {
    if (!data) return [];
    return data.topSpenders.map((c, idx) => ({
      rank: idx + 1,
      id: c.id,
      name: c.name,
      phone: c.phone,
      visits: c.visits,
      loyaltyPoints: c.loyaltyPoints,
      totalSpent: c.totalSpent,
    }));
  }, [data]);

  const customerTypeChartData = {
    labels: data?.customersByType.map(c => c.type) || [],
    datasets: [
      {
        data: data?.customersByType.map(c => c.count) || [],
        backgroundColor: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE'],
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-purple-900">Báo Cáo Khách Hàng</h1>
          <p className="text-gray-600">Phân tích dữ liệu khách hàng và xu hướng phát triển</p>
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
          <Button variant="outline" size="sm" onClick={loadCustomerData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
          <ExportDropdownButton
            data={exportRows}
            columns={exportColumns}
            filename="Bao_Cao_Khach_Hang_VIP"
            title="BÁO CÁO PHÂN TÍCH KHÁCH HÀNG & CHI TIÊU VIP"
            subtitle={`Tổng khách hàng: ${data?.totalCustomers || 0} | Khách VIP: ${data?.vipCustomers || 0}`}
            summaryStats={[
              { label: 'Tổng khách hàng', value: `${data?.totalCustomers || 0}` },
              { label: 'Khách hàng đang hoạt động', value: `${data?.activeCustomers || 0}` },
              { label: 'Khách VIP', value: `${data?.vipCustomers || 0}` },
            ]}
          />
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
            <p className="text-xs text-muted-foreground">Tất cả khách hàng trong hệ thống</p>
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
              {((data?.activeCustomers || 0) / Math.max(1, data?.totalCustomers || 1) * 100).toFixed(1)}% tổng số
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
              {((data?.vipCustomers || 0) / Math.max(1, data?.totalCustomers || 1) * 100).toFixed(1)}% tổng số
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
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar 
                    data={ageChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: { y: { beginAtZero: true } }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Phân Bố Theo Giới Tính</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.demographicsByGender.map((gender, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">{gender.gender}</h4>
                        <Badge variant="outline">{gender.count} khách hàng</Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${gender.percentage}%` }}></div>
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
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Line 
                  data={customerGrowthChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
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
                      <p className="font-bold text-purple-900">{location.count} khách hàng</p>
                      <p className="text-sm text-gray-600">{location.percentage.toFixed(1)}% tổng số</p>
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
