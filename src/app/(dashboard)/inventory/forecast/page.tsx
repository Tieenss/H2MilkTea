'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Calendar,
  BarChart3,
  PieChart,
  Download,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useForecast } from './hooks/useForecast';
import { ForecastStatsComponent } from './components/ForecastStats';
import { DemandChart } from './components/DemandChart';
import { SeasonalAnalysis } from './components/SeasonalAnalysis';
import { ForecastTable } from './components/ForecastTable';
import { FORECAST_PERIODS, FORECAST_METHODS } from './utils/constants';
import { exportForecastData } from './utils/formatters';
import authUtils from '@/utils/authUtils';
import toast from 'react-hot-toast';

const PAGE_SIZE = 30;

export default function ForecastPage() {
  const router = useRouter();
  const {
    forecastData,
    loading,
    stats,
    fetchForecastData,
    generateForecast,
  } = useForecast();

  // User permissions
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);

  // Filters & Pagination
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedMethod, setSelectedMethod] = useState('moving_average');
  const [dateRange, setDateRange] = useState<any>(null);
  const [selectedMaterial, setSelectedMaterial] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

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

  // Unique materials extracted dynamically from forecastData
  const materialOptions = useMemo(() => {
    const map = new Map<string, string>();
    forecastData.forEach((item) => {
      if (item.IDNguyenLieu && !map.has(item.IDNguyenLieu)) {
        map.set(item.IDNguyenLieu, item.TenNguyenLieu || item.IDNguyenLieu);
      }
    });
    if (map.size === 0) {
      return [
        { id: 'NVL001', name: 'Cà phê hạt Robusta' },
        { id: 'NVL002', name: 'Sữa tươi không đường' },
        { id: 'NVL004', name: 'Syrup Caramel' },
      ];
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [forecastData]);

  // Filtered forecast data
  const filteredForecastData = useMemo(() => {
    return forecastData.filter((item) => {
      const matchesMaterial =
        selectedMaterial === 'all' || item.IDNguyenLieu === selectedMaterial;

      const matchesDate =
        !dateRange ||
        (() => {
          const itemDate = authUtils.parseFlexibleDate(item.NgayDuBao);
          if (!itemDate) return true;
          if (dateRange.from && itemDate < dateRange.from) return false;
          if (dateRange.to && itemDate > dateRange.to) return false;
          return true;
        })();

      return matchesMaterial && matchesDate;
    });
  }, [forecastData, selectedMaterial, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filteredForecastData.length / PAGE_SIZE));

  // Reset về trang 1 khi thay đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMaterial, dateRange, selectedPeriod, selectedMethod]);

  // Đảm bảo currentPage không vượt quá totalPages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedForecastData = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredForecastData.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredForecastData, currentPage]);

  const startRow = filteredForecastData.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(currentPage * PAGE_SIZE, filteredForecastData.length);

  // Tự động tính toán lại dự báo ngay khi đổi dropdown chu kỳ dự báo (7 / 14 / 30 / 60 / 90 ngày)
  const handlePeriodChange = async (newPeriod: string) => {
    setSelectedPeriod(newPeriod);
    setCurrentPage(1);
    try {
      await generateForecast({
        period: parseInt(newPeriod, 10),
        method: selectedMethod,
      });
      toast.success(`Đã cập nhật dự báo chu kỳ ${newPeriod} ngày`);
    } catch {
      toast.error('Lỗi khi tính toán lại dự báo');
    }
  };

  // Tự động tính toán lại dự báo khi đổi phương pháp dự báo
  const handleMethodChange = async (newMethod: string) => {
    setSelectedMethod(newMethod);
    setCurrentPage(1);
    try {
      await generateForecast({
        period: parseInt(selectedPeriod, 10),
        method: newMethod,
      });
    } catch {
      toast.error('Lỗi khi cập nhật phương pháp dự báo');
    }
  };

  // Handle generate forecast
  const handleGenerateForecast = async () => {
    try {
      await generateForecast({
        period: parseInt(selectedPeriod, 10),
        method: selectedMethod,
      });
      setCurrentPage(1);
      toast.success('Tạo dự báo thành công');
    } catch {
      toast.error('Lỗi khi tạo dự báo');
    }
  };

  // Handle export data
  const handleExportData = () => {
    try {
      exportForecastData(filteredForecastData);
      toast.success('Xuất dữ liệu thành công');
    } catch {
      toast.error('Lỗi khi xuất dữ liệu');
    }
  };

  // Handle refresh data
  const handleRefreshData = async () => {
    try {
      await fetchForecastData();
      setCurrentPage(1);
      toast.success('Làm mới dữ liệu thành công');
    } catch {
      toast.error('Lỗi khi làm mới dữ liệu');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dự báo Nhu cầu</h1>
          <p className="text-muted-foreground">
            Phân tích và dự báo nhu cầu nguyên liệu dựa trên dữ liệu lịch sử
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleRefreshData} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <Button onClick={handleExportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Xuất dữ liệu
          </Button>
          {(isAdmin || isManager) && (
            <Button onClick={handleGenerateForecast} disabled={loading}>
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
              <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORECAST_PERIODS.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phương pháp</label>
              <Select value={selectedMethod} onValueChange={handleMethodChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORECAST_METHODS.map((method) => (
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
                  {materialOptions.map((mat) => (
                    <SelectItem key={mat.id} value={mat.id}>
                      {mat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Khoảng thời gian</label>
              <DateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
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

      {/* Forecast Table with Pagination (30 rows/page) */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Bảng Dự báo Chi tiết ({filteredForecastData.length} dòng)
            </CardTitle>
            <CardDescription>
              Hiển thị {PAGE_SIZE} dòng / trang giúp tối ưu tốc độ thao tác và theo dõi từng nguyên liệu
            </CardDescription>
          </div>
          {filteredForecastData.length > 0 && (
            <div className="text-xs font-medium text-muted-foreground">
              Hiển thị {startRow}–{endRow} / {filteredForecastData.length} dòng • Trang {currentPage}/{totalPages}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <ForecastTable
              data={paginatedForecastData}
              loading={loading}
              canEdit={isAdmin || isManager}
            />
          </div>

          {filteredForecastData.length > PAGE_SIZE && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                Đang hiển thị dòng <strong>{startRow}</strong> đến <strong>{endRow}</strong> trong tổng số{' '}
                <strong>{filteredForecastData.length}</strong> dòng dự báo
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Trang trước
                </Button>
                <span className="text-xs font-semibold px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-800">
                  Trang {currentPage} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Trang sau
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
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
