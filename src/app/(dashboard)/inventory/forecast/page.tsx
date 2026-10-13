'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Calendar, BarChart3, PieChart, Download, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { useForecast } from './hooks/useForecast';
import { ForecastStatsComponent } from './components/ForecastStats';
import { DemandChart } from './components/DemandChart';
import { SeasonalAnalysis } from './components/SeasonalAnalysis';
import { ForecastTable } from './components/ForecastTable';
import { FORECAST_PERIODS, FORECAST_METHODS } from './utils/constants';
import { exportForecastData } from './utils/formatters';
import type { ForecastData, ForecastFilter } from './types/forecast';
import authUtils from '@/utils/authUtils';
import toast from 'react-hot-toast';

export default function ForecastPage() {
  const router = useRouter();
  const {
    forecastData,
    loading,
    stats,
    fetchForecastData,
    generateForecast,
    updateForecastSettings
  } = useForecast();

  // User permissions
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);

  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedMethod, setSelectedMethod] = useState('moving_average');
  const [dateRange, setDateRange] = useState<any>(null);
  const [selectedMaterial, setSelectedMaterial] = useState('all');

  // Check user permissions
  useEffect(() => {
    const userData = authUtils.getUserData();
    if (!userData) {
      router.push('/login');
      return;
    }

    const isAdminUser = userData['Phân quyền'] === 'Admin';
    const isManagerUser = userData['Phân quyền'] === 'Quản lý';
    setIsAdmin(isAdminUser);
    setIsManager(isManagerUser);
  }, [router]);

  // Filtered forecast data
  const filteredForecastData = React.useMemo(() => {
    return forecastData.filter(item => {
      const matchesMaterial = selectedMaterial === 'all' || 
        item.IDNguyenLieu === selectedMaterial;

      const matchesDate = !dateRange || (() => {
        const itemDate = new Date(item.NgayDuBao);
        return itemDate >= dateRange.from && itemDate <= dateRange.to;
      })();

      return matchesMaterial && matchesDate;
    });
  }, [forecastData, selectedMaterial, dateRange]);

  // Handle generate forecast
  const handleGenerateForecast = async () => {
    try {
      await generateForecast({
        period: parseInt(selectedPeriod),
        method: selectedMethod
      });
      toast.success('Tạo dự báo thành công');
    } catch (error) {
      toast.error('Lỗi khi tạo dự báo');
    }
  };

  // Handle export data
  const handleExportData = () => {
    try {
      exportForecastData(filteredForecastData);
      toast.success('Xuất dữ liệu thành công');
    } catch (error) {
      toast.error('Lỗi khi xuất dữ liệu');
    }
  };

  // Handle refresh data
  const handleRefreshData = async () => {
    try {
      await fetchForecastData();
      toast.success('Làm mới dữ liệu thành công');
    } catch (error) {
      toast.error('Lỗi khi làm mới dữ liệu');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dự báo Nhu cầu</h1>
          <p className="text-muted-foreground">
            Phân tích và dự báo nhu cầu nguyên liệu dựa trên dữ liệu lịch sử
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefreshData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
          <Button onClick={handleExportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Xuất dữ liệu
          </Button>
          {(isAdmin || isManager) && (
            <Button onClick={handleGenerateForecast}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Tạo dự báo
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <ForecastStatsComponent stats={stats} />

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Bộ lọc và Cài đặt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Chu kỳ dự báo</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORECAST_PERIODS.map(period => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phương pháp</label>
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORECAST_METHODS.map(method => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nguyên liệu</label>
              <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả nguyên liệu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả nguyên liệu</SelectItem>
                  <SelectItem value="NVL001">Cà phê hạt Robusta</SelectItem>
                  <SelectItem value="NVL002">Sữa tươi không đường</SelectItem>
                  <SelectItem value="NVL004">Syrup Caramel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Khoảng thời gian</label>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder="Chọn khoảng thời gian"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demand Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Biểu đồ Nhu cầu
            </CardTitle>
            <CardDescription>
              Xu hướng nhu cầu nguyên liệu theo thời gian
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DemandChart data={filteredForecastData} />
          </CardContent>
        </Card>

        {/* Seasonal Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Phân tích Theo mùa
            </CardTitle>
            <CardDescription>
              Phân tích nhu cầu theo mùa và ngày trong tuần
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SeasonalAnalysis data={filteredForecastData} />
          </CardContent>
        </Card>
      </div>

      {/* Forecast Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Bảng Dự báo Chi tiết
          </CardTitle>
          <CardDescription>
            Dữ liệu dự báo chi tiết cho từng nguyên liệu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForecastTable
            data={filteredForecastData}
            loading={loading}
            canEdit={isAdmin || isManager}
          />
        </CardContent>
      </Card>

      {/* Forecast Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Nhận định và Khuyến nghị</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Nguyên liệu cần tăng dự trữ</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Cà phê hạt Robusta: +15%</li>
                <li>• Syrup Caramel: +8%</li>
              </ul>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Nguyên liệu ổn định</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Sữa tươi không đường</li>
                <li>• Bột Matcha</li>
              </ul>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Cần theo dõi</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Đường cát trắng</li>
                <li>• Kem tươi</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 