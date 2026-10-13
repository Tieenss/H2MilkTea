// pages/reports/bestsellers/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Package, 
  Star, 
  Award,
  Target,
  Download
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

const BestsellersReport = () => {
  const [data, setData] = useState<BestsellerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [sortBy, setSortBy] = useState('quantity'); // quantity, revenue, efficiency

  useEffect(() => {
    loadBestsellerData();
  }, [timeRange]);

  const loadBestsellerData = async () => {
    try {
      setLoading(true);
      
      const [hoaDonRes, hoaDonDetailRes, sanPhamRes] = await Promise.all([
        AuthUtils.getAllHoaDon(),
        AuthUtils.getAllHoaDonDetail(),
        AuthUtils.getAllSanPham()
      ]);

      const hoaDonData = Array.isArray(hoaDonRes) ? hoaDonRes : hoaDonRes.data;
      const hoaDonDetailData = Array.isArray(hoaDonDetailRes) ? hoaDonDetailRes : hoaDonDetailRes.data;
      const sanPhamData = Array.isArray(sanPhamRes) ? sanPhamRes : sanPhamRes.data;

      const bestsellerData = processBestsellerData(hoaDonData, hoaDonDetailData, sanPhamData);
      setData(bestsellerData);
    } catch (error) {
      console.error('Error loading bestseller data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processBestsellerData = (hoaDons: any[], details: any[], sanPhams: any[]): BestsellerData => {
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

    // Thống kê sản phẩm hiện tại
    const productStats = new Map();
    details.forEach(detail => {
      const hoaDon = validHoaDons.find(hd => hd.IDHOADON === detail.IDHOADON);
      if (hoaDon) {
        const productId = detail.IDSP;
        const quantity = parseInt(detail['Số lượng']);
        const revenue = parseInt(detail['Thành tiền']);
        
        if (productStats.has(productId)) {
          const existing = productStats.get(productId);
          existing.quantity += quantity;
          existing.revenue += revenue;
        } else {
          const product = sanPhams.find(sp => sp.IDSP === productId);
          productStats.set(productId, {
            id: productId,
            name: product?.['Tên sản phẩm'] || 'Unknown',
            category: product?.['Loại sản phẩm'] || 'Khác',
            quantity,
            revenue,
            image: product?.['Hình ảnh'] || null
          });
        }
      }
    });

    // Thống kê sản phẩm kỳ trước
    const previousProductStats = new Map();
    details.forEach(detail => {
      const hoaDon = previousHoaDons.find(hd => hd.IDHOADON === detail.IDHOADON);
      if (hoaDon) {
        const productId = detail.IDSP;
        const quantity = parseInt(detail['Số lượng']);
        
        if (previousProductStats.has(productId)) {
          previousProductStats.set(productId, previousProductStats.get(productId) + quantity);
        } else {
          previousProductStats.set(productId, quantity);
        }
      }
    });

    // Tính toán top products với growth rate
    const topProducts = Array.from(productStats.values()).map(product => {
      const previousQuantity = previousProductStats.get(product.id) || 0;
      const growth = previousQuantity > 0 ? 
        ((product.quantity - previousQuantity) / previousQuantity) * 100 : 
        product.quantity > 0 ? 100 : 0;
      
      return {
        ...product,
        avgPrice: product.revenue / product.quantity,
        growth
      };
    }).sort((a, b) => {
      if (sortBy === 'quantity') return b.quantity - a.quantity;
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      return (b.revenue / b.quantity) - (a.revenue / a.quantity); // efficiency
    });

    // Thống kê theo danh mục
    const categoryStats = new Map();
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
     percentage: (cat.totalQuantity / totalQuantity) * 100
   })).sort((a, b) => b.totalQuantity - a.totalQuantity);

   // Phân tích hiệu quả (doanh thu/số lượng)
   const revenueVsQuantity = Array.from(productStats.values()).map(product => ({
     id: product.id,
     name: product.name,
     quantity: product.quantity,
     revenue: product.revenue,
     efficiency: product.revenue / product.quantity
   })).sort((a, b) => b.efficiency - a.efficiency);

   // So sánh với kỳ trước
   const timeComparison = {
     current: Array.from(productStats.values())
       .sort((a, b) => b.quantity - a.quantity)
       .slice(0, 10)
       .map(p => ({ name: p.name, quantity: p.quantity })),
     previous: Array.from(previousProductStats.entries())
       .map(([id, quantity]) => {
         const product = sanPhams.find(sp => sp.IDSP === id);
         return { name: product?.['Tên sản phẩm'] || 'Unknown', quantity };
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
     <div className="flex justify-between items-center">
       <div>
         <h1 className="text-3xl font-bold text-purple-900">Báo Cáo Món Bán Chạy</h1>
         <p className="text-gray-600">Phân tích sản phẩm có hiệu suất cao nhất</p>
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
               <CardTitle className="text-purple-900">Chi Tiết Top 10</CardTitle>
               <CardDescription>Thông tin chi tiết từng sản phẩm</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="space-y-3 max-h-80 overflow-y-auto">
                 {data?.topProducts.slice(0, 10).map((product, index) => (
                   <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-purple-50">
                     {product.image && (
                       <img 
                         src={product.image} 
                         alt={product.name}
                         className="w-12 h-12 rounded-lg object-cover"
                       />
                     )}
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
                     plugins: {
                       tooltip: {
                         callbacks: {
                           label: function(context) {
                             const total = data?.categoryPerformance.reduce((sum, c) => sum + c.totalQuantity, 0) || 1;
                             const percentage = ((context.parsed / total) * 100).toFixed(1);
                             return context.label + ': ' + context.parsed + ' ly (' + percentage + '%)';
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
                       <div>
                         <p className="text-gray-600">Tỷ lệ</p>
                         <p className="font-bold">{category.percentage.toFixed(1)}%</p>
                       </div>
                       <div>
                         <p className="text-gray-600">TB/sản phẩm</p>
                         <p className="font-bold">{Math.round(category.totalQuantity / category.productCount)} ly</p>
                       </div>
                     </div>
                     <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                       <div 
                         className="bg-purple-600 h-2 rounded-full" 
                         style={{ width: `${category.percentage}%` }}
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
                     <p className="text-sm text-gray-600">per ly</p>
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