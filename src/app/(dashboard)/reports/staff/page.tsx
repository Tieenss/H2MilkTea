// pages/reports/staff/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Award, 
  TrendingUp, 
  Clock,
  Target,
  Download,
  Star
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
import AuthUtils from '@/utils/authUtils';

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

interface StaffData {
  staffPerformance: Array<{
    name: string;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    efficiency: number;
    growth: number;
    workingDays: number;
    image?: string;
  }>;
  dailyPerformance: Array<{
    date: string;
    staffData: Array<{
      name: string;
      orders: number;
      revenue: number;
    }>;
  }>;
  timeAnalysis: Array<{
    hour: number;
    totalOrders: number;
    staffBreakdown: Array<{
      name: string;
      orders: number;
    }>;
  }>;
  teamMetrics: {
    totalStaff: number;
    activeStaff: number;
    topPerformer: string;
    teamRevenue: number;
    averageEfficiency: number;
  };
}

const StaffReport = () => {
  const [data, setData] = useState<StaffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [sortBy, setSortBy] = useState('revenue'); // revenue, orders, efficiency

  useEffect(() => {
    loadStaffData();
  }, [timeRange]);

  const loadStaffData = async () => {
    try {
      setLoading(true);
      
      const [hoaDonRes, nhanVienRes] = await Promise.all([
        AuthUtils.getAllHoaDon(),
        AuthUtils.getAllNhanVien()
      ]);

      const hoaDonData = Array.isArray(hoaDonRes) ? hoaDonRes : hoaDonRes.data;
      const nhanVienData = Array.isArray(nhanVienRes) ? nhanVienRes : nhanVienRes.data;

      const staffData = processStaffData(hoaDonData, nhanVienData);
      setData(staffData);
    } catch (error) {
      console.error('Error loading staff data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processStaffData = (hoaDons: any[], nhanViens: any[]): StaffData => {
    const now = new Date();
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const previousStartDate = new Date(startDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    
    const validHoaDons = hoaDons.filter(hd => {
      const hoaDonDate = new Date(hd['Ngày']);
      return hoaDonDate >= startDate && hd['Trạng thái'] === 'Đã thanh toán';
    });

    const previousHoaDons = hoaDons.filter(hd => {
      const hoaDonDate = new Date(hd['Ngày']);
      return hoaDonDate >= previousStartDate && hoaDonDate < startDate && hd['Trạng thái'] === 'Đã thanh toán';
    });

    // Thống kê hiệu suất nhân viên
    const staffStats = new Map();
    const previousStaffStats = new Map();

    // Thống kê kỳ hiện tại
    validHoaDons.forEach(hd => {
      const staffName = hd['Nhân viên'];
      const revenue = parseInt(hd['Tổng tiền']);
      
      if (staffStats.has(staffName)) {
        const existing = staffStats.get(staffName);
        existing.totalOrders += 1;
        existing.totalRevenue += revenue;
        existing.workingDays.add(new Date(hd['Ngày']).toDateString());
      } else {
        staffStats.set(staffName, {
          name: staffName,
          totalOrders: 1,
          totalRevenue: revenue,
          workingDays: new Set([new Date(hd['Ngày']).toDateString()])
        });
      }
    });

    // Thống kê kỳ trước
    previousHoaDons.forEach(hd => {
      const staffName = hd['Nhân viên'];
      const revenue = parseInt(hd['Tổng tiền']);
      
      if (previousStaffStats.has(staffName)) {
        const existing = previousStaffStats.get(staffName);
        existing.totalRevenue += revenue;
      } else {
        previousStaffStats.set(staffName, {
          totalRevenue: revenue
        });
      }
    });

    // Tính toán hiệu suất và tăng trưởng
    const staffPerformance = Array.from(staffStats.values()).map(staff => {
      const nhanVien = nhanViens.find(nv => nv['Họ và Tên'] === staff.name);
      const previousRevenue = previousStaffStats.get(staff.name)?.totalRevenue || 0;
      const growth = previousRevenue > 0 ? 
        ((staff.totalRevenue - previousRevenue) / previousRevenue) * 100 : 
        staff.totalRevenue > 0 ? 100 : 0;

      return {
        name: staff.name,
        totalOrders: staff.totalOrders,
        totalRevenue: staff.totalRevenue,
        averageOrderValue: staff.totalRevenue / staff.totalOrders,
        efficiency: staff.totalRevenue / staff.workingDays.size, // doanh thu per ngày làm việc
        growth,
        workingDays: staff.workingDays.size,
        image: nhanVien?.Image
      };
    }).sort((a, b) => {
      if (sortBy === 'revenue') return b.totalRevenue - a.totalRevenue;
      if (sortBy === 'orders') return b.totalOrders - a.totalOrders;
      return b.efficiency - a.efficiency;
    });

    // Phân tích theo ngày
    const dailyStats = new Map();
    for (let i = 6; i >= 0; i--) { // 7 ngày gần nhất
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toLocaleDateString('vi-VN');
      dailyStats.set(dateKey, {
        date: dateKey,
        staffData: new Map()
      });
    }

    validHoaDons.forEach(hd => {
      const date = new Date(hd['Ngày']).toLocaleDateString('vi-VN');
      const staffName = hd['Nhân viên'];
      const revenue = parseInt(hd['Tổng tiền']);
      
      if (dailyStats.has(date)) {
        const dayData = dailyStats.get(date);
        if (dayData.staffData.has(staffName)) {
          const existing = dayData.staffData.get(staffName);
          existing.orders += 1;
          existing.revenue += revenue;
        } else {
          dayData.staffData.set(staffName, {
            name: staffName,
            orders: 1,
            revenue
          });
        }
      }
    });

    const dailyPerformance = Array.from(dailyStats.values()).map(day => ({
      date: day.date,
      staffData: Array.from(day.staffData.values()) as { name: string; orders: number; revenue: number; }[]
    }));

    // Phân tích theo giờ
    const hourlyStats = new Map();
    for (let i = 0; i < 24; i++) {
      hourlyStats.set(i, {
        hour: i,
        totalOrders: 0,
        staffBreakdown: new Map()
      });
    }

    validHoaDons.forEach(hd => {
      const hour = new Date(hd['Ngày']).getHours();
      const staffName = hd['Nhân viên'];
      
      const hourData = hourlyStats.get(hour);
      if (hourData) {
        hourData.totalOrders += 1;
        if (hourData.staffBreakdown.has(staffName)) {
          hourData.staffBreakdown.set(staffName, hourData.staffBreakdown.get(staffName) + 1);
        } else {
          hourData.staffBreakdown.set(staffName, 1);
        }
      }
    });

    const timeAnalysis = Array.from(hourlyStats.values()).map(hour => ({
      hour: hour.hour,
      totalOrders: hour.totalOrders,
     staffBreakdown: Array.from(hour.staffBreakdown.entries() as [string, number][]).map(([name, orders]) => ({
  name,
  orders
}))
   }));

   // Tính toán team metrics
   const totalStaff = nhanViens.length;
   const activeStaff = staffStats.size;
   const topPerformer = staffPerformance[0]?.name || 'N/A';
   const teamRevenue = staffPerformance.reduce((sum, staff) => sum + staff.totalRevenue, 0);
   const averageEfficiency = staffPerformance.reduce((sum, staff) => sum + staff.efficiency, 0) / staffPerformance.length;

   return {
     staffPerformance,
     dailyPerformance,
     timeAnalysis,
     teamMetrics: {
       totalStaff,
       activeStaff,
       topPerformer,
       teamRevenue,
       averageEfficiency: averageEfficiency || 0
     }
   };
 };

 const staffPerformanceChartData = {
   labels: data?.staffPerformance.slice(0, 8).map(s => s.name) || [],
   datasets: [
     {
       label: sortBy === 'revenue' ? 'Doanh thu (VNĐ)' : 
              sortBy === 'orders' ? 'Số đơn hàng' : 'Hiệu quả (VNĐ/ngày)',
       data: data?.staffPerformance.slice(0, 8).map(s => {
         if (sortBy === 'revenue') return s.totalRevenue;
         if (sortBy === 'orders') return s.totalOrders;
         return s.efficiency;
       }) || [],
       backgroundColor: '#9932CC',
     },
   ],
 };

 const dailyTrendChartData = {
   labels: data?.dailyPerformance.map(d => d.date) || [],
   datasets: data?.staffPerformance.slice(0, 5).map((staff, index) => ({
     label: staff.name,
     data: data?.dailyPerformance.map(day => {
       const staffData = day.staffData.find(s => s.name === staff.name);
       return staffData?.revenue || 0;
     }) || [],
     borderColor: `hsl(${280 + index * 30}, 70%, ${50 + index * 10}%)`,
     backgroundColor: `hsla(${280 + index * 30}, 70%, ${50 + index * 10}%, 0.1)`,
     tension: 0.1,
   })) || []
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
         <h1 className="text-3xl font-bold text-purple-900">Báo Cáo Hiệu Suất Nhân Viên</h1>
         <p className="text-gray-600">Phân tích và đánh giá hiệu quả làm việc của đội ngũ</p>
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
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
       <Card className="border-l-4 border-l-purple-600">
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <CardTitle className="text-sm font-medium">Tổng Nhân Viên</CardTitle>
           <Users className="h-4 w-4 text-purple-600" />
         </CardHeader>
         <CardContent>
           <div className="text-2xl font-bold text-purple-900">
             {data?.teamMetrics.totalStaff}
           </div>
           <p className="text-xs text-muted-foreground">
             Trong hệ thống
           </p>
         </CardContent>
       </Card>

       <Card className="border-l-4 border-l-purple-500">
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <CardTitle className="text-sm font-medium">Đang Hoạt Động</CardTitle>
           <Target className="h-4 w-4 text-purple-500" />
         </CardHeader>
         <CardContent>
           <div className="text-2xl font-bold text-purple-900">
             {data?.teamMetrics.activeStaff}
           </div>
           <p className="text-xs text-muted-foreground">
             Có bán hàng trong kỳ
           </p>
         </CardContent>
       </Card>

       <Card className="border-l-4 border-l-purple-400">
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <CardTitle className="text-sm font-medium">Nhân Viên Xuất Sắc</CardTitle>
           <Award className="h-4 w-4 text-purple-400" />
         </CardHeader>
         <CardContent>
           <div className="text-lg font-bold text-purple-900">
             {data?.teamMetrics.topPerformer}
           </div>
           <p className="text-xs text-muted-foreground">
             Hiệu suất cao nhất
           </p>
         </CardContent>
       </Card>

       <Card className="border-l-4 border-l-purple-300">
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <CardTitle className="text-sm font-medium">Doanh Thu Team</CardTitle>
           <TrendingUp className="h-4 w-4 text-purple-300" />
         </CardHeader>
         <CardContent>
           <div className="text-lg font-bold text-purple-900">
             {data?.teamMetrics.teamRevenue.toLocaleString('vi-VN')} ₫
           </div>
           <p className="text-xs text-muted-foreground">
             Tổng cộng
           </p>
         </CardContent>
       </Card>

       <Card className="border-l-4 border-l-purple-200">
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <CardTitle className="text-sm font-medium">Hiệu Quả TB</CardTitle>
           <Star className="h-4 w-4 text-purple-200" />
         </CardHeader>
         <CardContent>
           <div className="text-lg font-bold text-purple-900">
             {data?.teamMetrics.averageEfficiency.toLocaleString('vi-VN')} ₫
           </div>
           <p className="text-xs text-muted-foreground">
             Per ngày/nhân viên
           </p>
         </CardContent>
       </Card>
     </div>

     <Tabs defaultValue="performance" className="space-y-4">
       <TabsList className="grid w-full grid-cols-4">
         <TabsTrigger value="performance">Hiệu Suất</TabsTrigger>
         <TabsTrigger value="daily">Theo Ngày</TabsTrigger>
         <TabsTrigger value="timeline">Phân Ca</TabsTrigger>
         <TabsTrigger value="detailed">Chi Tiết</TabsTrigger>
       </TabsList>

       <TabsContent value="performance" className="space-y-4">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card>
             <CardHeader>
               <CardTitle className="text-purple-900 flex items-center gap-2">
                 Bảng Xếp Hạng Nhân Viên
                 <div className="flex gap-1">
                   <Button
                     variant={sortBy === 'revenue' ? 'default' : 'outline'}
                     size="sm"
                     onClick={() => setSortBy('revenue')}
                     className="text-xs"
                   >
                     Doanh thu
                   </Button>
                   <Button
                     variant={sortBy === 'orders' ? 'default' : 'outline'}
                     size="sm"
                     onClick={() => setSortBy('orders')}
                     className="text-xs"
                   >
                     Đơn hàng
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
                 Sắp xếp theo {sortBy === 'revenue' ? 'doanh thu' : 
                                 sortBy === 'orders' ? 'số đơn hàng' : 'hiệu quả'}
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="h-80">
                 <Bar 
                   data={staffPerformanceChartData}
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
                         beginAtZero: true,
                         ticks: {
                           callback: function(value) {
                             if (sortBy === 'revenue' || sortBy === 'efficiency') {
                               return value.toLocaleString('vi-VN') + ' ₫';
                             }
                             return value;
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
               <CardTitle className="text-purple-900">Top Performers</CardTitle>
               <CardDescription>Chi tiết hiệu suất của nhân viên xuất sắc</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="space-y-4 max-h-80 overflow-y-auto">
                 {data?.staffPerformance.slice(0, 8).map((staff, index) => (
                   <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                     <div className="flex items-center gap-3">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                         index === 0 ? 'bg-yellow-500' : 
                         index === 1 ? 'bg-gray-400' : 
                         index === 2 ? 'bg-orange-400' : 'bg-purple-600'
                       }`}>
                         {index + 1}
                       </div>
                       {staff.image && (
                         <img 
                           src={staff.image} 
                           alt={staff.name}
                           className="w-10 h-10 rounded-full object-cover"
                         />
                       )}
                       <div>
                         <p className="font-medium">{staff.name}</p>
                         <div className="flex items-center gap-2 text-sm text-gray-600">
                           <span>{staff.totalOrders} đơn</span>
                           <span>•</span>
                           <span>{staff.workingDays} ngày</span>
                         </div>
                       </div>
                     </div>
                     <div className="flex-1"></div>
                     <div className="text-right">
                       <p className="font-bold text-purple-900">
                         {staff.totalRevenue.toLocaleString('vi-VN')} ₫
                       </p>
                       <div className="flex items-center gap-1 text-xs">
                         <Badge 
                           variant={staff.growth >= 0 ? 'default' : 'destructive'}
                           className="text-xs"
                         >
                           {staff.growth >= 0 ? '+' : ''}{staff.growth.toFixed(1)}%
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

       <TabsContent value="daily" className="space-y-4">
         <Card>
           <CardHeader>
             <CardTitle className="text-purple-900">Xu Hướng Hiệu Suất 7 Ngày</CardTitle>
             <CardDescription>So sánh doanh thu hàng ngày của top 5 nhân viên</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="h-80">
               <Line 
                 data={dailyTrendChartData}
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
                           return context.dataset.label + ': ' + context.parsed.y.toLocaleString('vi-VN') + ' ₫';
                         }
                       }
                     }
                   }
                 }}
               />
             </div>
           </CardContent>
         </Card>
       </TabsContent>

       <TabsContent value="timeline" className="space-y-4">
         <Card>
           <CardHeader>
             <CardTitle className="text-purple-900">Phân Tích Theo Giờ Làm Việc</CardTitle>
             <CardDescription>Số lượng đơn hàng theo từng khung giờ trong ngày</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="space-y-4">
               {data?.timeAnalysis
                 .filter(hour => hour.totalOrders > 0)
                 .sort((a, b) => b.totalOrders - a.totalOrders)
                 .slice(0, 12)
                 .map((hour, index) => (
                 <div key={index} className="p-4 border rounded-lg">
                   <div className="flex justify-between items-center mb-3">
                     <div>
                       <h4 className="font-medium">
                         {hour.hour.toString().padStart(2, '0')}:00 - {(hour.hour + 1).toString().padStart(2, '0')}:00
                       </h4>
                       <p className="text-sm text-gray-600">{hour.totalOrders} đơn hàng</p>
                     </div>
                     <Badge variant="outline">
                       {hour.staffBreakdown.length} nhân viên
                     </Badge>
                   </div>
                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                     {hour.staffBreakdown
                       .sort((a, b) => b.orders - a.orders)
                       .map((staff, staffIndex) => (
                       <div key={staffIndex} className="text-sm p-2 bg-purple-50 rounded">
                         <p className="font-medium">{staff.name}</p>
                         <p className="text-gray-600">{staff.orders} đơn</p>
                       </div>
                     ))}
                   </div>
                 </div>
               ))}
             </div>
           </CardContent>
         </Card>
       </TabsContent>

       <TabsContent value="detailed" className="space-y-4">
         <Card>
           <CardHeader>
             <CardTitle className="text-purple-900">Báo Cáo Chi Tiết Nhân Viên</CardTitle>
             <CardDescription>Thông tin đầy đủ về hiệu suất từng nhân viên</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="space-y-4">
               {data?.staffPerformance.map((staff, index) => (
                 <div key={index} className="p-4 border rounded-lg">
                   <div className="flex items-center gap-4 mb-4">
                     {staff.image && (
                       <img 
                         src={staff.image} 
                         alt={staff.name}
                         className="w-16 h-16 rounded-full object-cover"
                       />
                     )}
                     <div className="flex-1">
                       <h3 className="text-lg font-semibold">{staff.name}</h3>
                       <div className="flex items-center gap-2 mt-1">
                         <Badge variant="outline">Hạng #{index + 1}</Badge>
                         <Badge 
                           variant={staff.growth >= 0 ? 'default' : 'destructive'}
                         >
                           {staff.growth >= 0 ? '↗' : '↘'} {Math.abs(staff.growth).toFixed(1)}%
                         </Badge>
                       </div>
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div className="text-center p-3 bg-purple-50 rounded-lg">
                       <p className="text-sm text-gray-600">Tổng Đơn Hàng</p>
                       <p className="text-xl font-bold text-purple-900">{staff.totalOrders}</p>
                     </div>
                     <div className="text-center p-3 bg-purple-50 rounded-lg">
                       <p className="text-sm text-gray-600">Doanh Thu</p>
                       <p className="text-lg font-bold text-purple-900">
                         {staff.totalRevenue.toLocaleString('vi-VN')} ₫
                       </p>
                     </div>
                     <div className="text-center p-3 bg-purple-50 rounded-lg">
                       <p className="text-sm text-gray-600">TB/Đơn Hàng</p>
                       <p className="text-lg font-bold text-purple-900">
                         {staff.averageOrderValue.toLocaleString('vi-VN')} ₫
                       </p>
                     </div>
                     <div className="text-center p-3 bg-purple-50 rounded-lg">
                       <p className="text-sm text-gray-600">Hiệu Quả/Ngày</p>
                       <p className="text-lg font-bold text-purple-900">
                         {staff.efficiency.toLocaleString('vi-VN')} ₫
                       </p>
                     </div>
                   </div>

                   <div className="mt-4 pt-4 border-t">
                     <div className="flex justify-between text-sm text-gray-600">
                       <span>Số ngày làm việc: {staff.workingDays}</span>
                       <span>Trung bình {(staff.totalOrders / staff.workingDays).toFixed(1)} đơn/ngày</span>
                     </div>
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

export default StaffReport;