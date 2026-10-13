'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef, JSX } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Database, 
  Upload, 
  Download, 
  RefreshCw, 
  Trash2, 
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Info,
  Eye,
  HardDrive,
  Activity,
  Clock,
  Users,
  Package,
  ShoppingCart,
    FileSpreadsheet, // New icon for Excel
  File, // New icon for CSV
  Eraser,
  FileText,
  Settings,
  Zap,
  ChevronDown,
  ChevronUp,
  Cloud
} from 'lucide-react';
import AuthUtils from '@/utils/authUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@radix-ui/react-select';
import GoogleDriveSync from '@/components/GoogleDriveSync';
import SyncStatusCard from '@/components/SyncStatusCard';
import { Switch } from '@/components/ui/switch';
import GoogleDriveUtils from '@/utils/googleDriveUtils';
import { toast } from 'react-hot-toast';

interface DataStatus {
  isInitialized: boolean;
  hasLocalStorage: boolean;
  dataIntegrity: boolean;
  lastSaved: string | null;
  totalRecords: number;
}

interface HealthCheck {
  healthy: boolean;
  status: string;
  issues: string[];
  warnings: string[];
  details: DataStatus;
  recommendations: string[];
}

interface PerformanceMetrics {
  memoryUsage: {
    bytes: number;
    kb: number;
    mb: number;
  };
  recordCounts: { [key: string]: number };
  cacheSize: {
    bytes: number;
    kb: number;
    mb: number;
  };
  lastOperationTime: string | null;
}

const SettingDataPage = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  // States
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null);
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);
  const [healthCheck, setHealthCheck] = useState<HealthCheck | null>(null);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [tableData, setTableData] = useState<{ [key: string]: any[] }>({});
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [selectedTableForCSV, setSelectedTableForCSV] = useState<string>('');
  
  // Google Drive status state
  const [googleDriveStatus, setGoogleDriveStatus] = useState<{
    connected: boolean;
    autoBackup: boolean;
    lastSync: string | null;
    needsSync: boolean;
  }>({
    connected: false,
    autoBackup: false,
    lastSync: null,
    needsSync: false
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    content: string;
    action: () => void;
  }>({
    open: false,
    title: '',
    content: '',
    action: () => {}
  });
  // State for expandable sections
  const [expandedSections, setExpandedSections] = useState<{
    issues: boolean;
    warnings: boolean;
    recommendations: boolean;
  }>({
    issues: false,
    warnings: false,
    recommendations: false
  });

  // Check authentication
  useEffect(() => {
    if (!AuthUtils.isAuthenticated()) {
      router.push('/');
      return;
    }
    loadData();
  }, []);

  // Update Google Drive status
  useEffect(() => {
    const updateGoogleDriveStatus = () => {
      const authInfo = GoogleDriveUtils.getAuthInfo();
      const isConnected = GoogleDriveUtils.isSignedIn();
      const needsSync = GoogleDriveUtils.shouldAutoSync();
      
      setGoogleDriveStatus({
        connected: isConnected,
        autoBackup: authInfo?.autoSyncEnabled || false,
        lastSync: authInfo?.lastSync || null,
        needsSync: needsSync && authInfo?.autoSyncEnabled
      });
    };

    // Update immediately
    updateGoogleDriveStatus();

    // Update every 30 seconds
    const interval = setInterval(updateGoogleDriveStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSyncComplete = (success: boolean, message: string) => {
    setMessage({ 
      type: success ? 'success' : 'error', 
      text: message 
    });
    
    if (success) {
      loadData(); // Reload data after sync
    }
  };
  // Load all data
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get status
      const status = AuthUtils.getDataStatus();
      setDataStatus(status);

      // Get health check
      const health = AuthUtils.healthCheck();
      setHealthCheck(health);

      // Get performance metrics
      const perf = AuthUtils.getPerformanceMetrics();
      setPerformance(perf);

      // Load all table data
      const tables = ['DSNV', 'DSBAN', 'HOADON', 'HOADONDETAIL', 'DMHH', 'NGUYENLIEU', 'CAUHINH'];
      const tableDataMap: { [key: string]: any[] } = {};

      for (const table of tables) {
        try {
          const data = await AuthUtils.apiRequest(table, 'getall', {});
          tableDataMap[table] = Array.isArray(data) ? data : data?.data || [];
        } catch (error) {
          console.error(`Error loading ${table}:`, error);
          tableDataMap[table] = [];
        }
      }

      setTableData(tableDataMap);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Lỗi tải dữ liệu: ' + (error as Error).message });
    } finally {
      setLoading(false);
    }
  };
 const handleClearDataExceptDSNV = async () => {
    try {
      setLoading(true);
      const result = AuthUtils.clearDataExceptDSNV();
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi clear data: ' + (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    try {
      setLoading(true);
      const result = AuthUtils.exportToExcel();
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi export Excel: ' + (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  // Export CSV
  const handleExportCSV = async (tableName?: string) => {
    try {
      setLoading(true);
      const result = AuthUtils.exportToCSV(tableName);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi export CSV: ' + (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  // Import Excel
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const result = await AuthUtils.importFromExcel(file);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi import Excel: ' + (error as Error).message });
    } finally {
      setLoading(false);
      if (excelInputRef.current) {
        excelInputRef.current.value = '';
      }
    }
  };

  // Import CSV
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTableForCSV) return;

    try {
      setLoading(true);
      const result = await AuthUtils.importFromCSV(file, selectedTableForCSV);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi import CSV: ' + (error as Error).message });
    } finally {
      setLoading(false);
      if (csvInputRef.current) {
        csvInputRef.current.value = '';
      }
    }
  };

  // ... existing helper functions ...

  // Get available tables for CSV import
  const getAvailableTablesForCSV = () => {
    return Object.keys(tableData).map(tableName => ({
      value: tableName,
      label: getTableDisplayName(tableName)
    }));
  };

  // Export data
  const handleExport = async () => {
    try {
      setLoading(true);
      const result = AuthUtils.exportData();
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi export: ' + (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  // Import data
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const result = await AuthUtils.importData(file);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await loadData(); // Reload data after import
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi import: ' + (error as Error).message });
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Reset data
  const handleReset = async () => {
    try {
      setLoading(true);
      const result = AuthUtils.resetDemoData();
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi reset: ' + (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  // Clear cache
  const handleClearCache = async () => {
    try {
      setLoading(true);
      const result = AuthUtils.clearCache();
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi xóa cache: ' + (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  // Force reload
  const handleForceReload = async () => {
    try {
      setLoading(true);
      const result = AuthUtils.forceReload();
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi reload: ' + (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  // View table data
  const handleViewTable = (tableName: string) => {
    setSelectedTable(tableName);
    setViewDialogOpen(true);
  };

  // Toggle expandable section
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get table icon
  const getTableIcon = (tableName: string) => {
    const icons: { [key: string]: JSX.Element } = {
      'DSNV': <Users className="h-4 w-4" />,
      'DSBAN': <Package className="h-4 w-4" />,
      'HOADON': <ShoppingCart className="h-4 w-4" />,
      'HOADONDETAIL': <FileText className="h-4 w-4" />,
      'DMHH': <Package className="h-4 w-4" />,
      'NGUYENLIEU': <Package className="h-4 w-4" />,
      'CAUHINH': <Settings className="h-4 w-4" />
    };
    return icons[tableName] || <Database className="h-4 w-4" />;
  };

  // Get table display name
  const getTableDisplayName = (tableName: string) => {
    const names: { [key: string]: string } = {
      'DSNV': 'Nhân Viên',
      'DSBAN': 'Bàn',
      'HOADON': 'Hóa Đơn',
      'HOADONDETAIL': 'Chi Tiết Hóa Đơn',
      'DMHH': 'Sản Phẩm',
      'NGUYENLIEU': 'Nguyên Liệu',
      'CAUHINH': 'Cấu Hình'
    };
    return names[tableName] || tableName;
  };

  if (loading && !dataStatus) {
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
          <h1 className="text-3xl font-bold text-purple-900">Quản Lý Dữ Liệu</h1>
          <p className="text-gray-600">Quản lý và theo dõi dữ liệu hệ thống</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={loadData} 
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <Alert className={`border-l-4 ${
          message.type === 'success' ? 'border-l-green-500 bg-green-50' :
          message.type === 'error' ? 'border-l-red-500 bg-red-50' :
          message.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50' :
          'border-l-blue-500 bg-blue-50'
        }`}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-purple-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trạng Thái Hệ Thống</CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthCheck?.healthy ? (
                <span className="text-green-600">Tốt</span>
              ) : (
                <span className="text-red-600">Lỗi</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {healthCheck?.healthy ? (
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-red-600" />
              )}
              <span className="text-muted-foreground">
                {healthCheck?.issues.length || 0} lỗi, {healthCheck?.warnings.length || 0} cảnh báo
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Bản Ghi</CardTitle>
            <Database className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {dataStatus?.totalRecords || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Dữ liệu trong hệ thống
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bộ Nhớ Sử Dụng</CardTitle>
            <HardDrive className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {performance?.memoryUsage.mb.toFixed(2)} MB
            </div>
            <p className="text-xs text-muted-foreground">
              Cache: {performance?.cacheSize.mb.toFixed(2)} MB
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lần Cập Nhật Cuối</CardTitle>
            <Clock className="h-4 w-4 text-purple-300" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-purple-900">
              {dataStatus?.lastSaved ? new Date(dataStatus.lastSaved).toLocaleString('vi-VN') : 'Chưa có'}
            </div>
            <p className="text-xs text-muted-foreground">
              LocalStorage: {dataStatus?.hasLocalStorage ? 'Có' : 'Không'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Tổng Quan</TabsTrigger>
          <TabsTrigger value="tables">Dữ Liệu Bảng</TabsTrigger>
          <TabsTrigger value="management">Quản Lý</TabsTrigger>
          <TabsTrigger value="cloud">Google Drive</TabsTrigger>
          <TabsTrigger value="sync">Đồng Bộ</TabsTrigger>
          <TabsTrigger value="health">Sức Khỏe</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Thống Kê Dữ Liệu</CardTitle>
                <CardDescription>
                  Phân bố dữ liệu theo từng bảng
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(performance?.recordCounts || {}).map(([tableName, count]) => (
                    <div key={tableName} className="flex items-center justify-between p-3 rounded-lg bg-purple-50">
                      <div className="flex items-center gap-3">
                        {getTableIcon(tableName)}
                        <div>
                          <p className="font-medium">{getTableDisplayName(tableName)}</p>
                          <p className="text-sm text-gray-600">{tableName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-900">{count}</p>
                        <p className="text-sm text-gray-600">bản ghi</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Hiệu Suất Hệ Thống</CardTitle>
                <CardDescription>
                  Thông tin chi tiết về hiệu suất
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Bộ nhớ sử dụng</span>
                      <span className="text-sm">{formatFileSize(performance?.memoryUsage.bytes || 0)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${Math.min((performance?.memoryUsage.mb || 0) / 10 * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Cache size</span>
                      <span className="text-sm">{formatFileSize(performance?.cacheSize.bytes || 0)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{ width: `${Math.min((performance?.cacheSize.mb || 0) / 10 * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Khởi tạo</p>
                      <Badge variant={dataStatus?.isInitialized ? "default" : "destructive"}>
                        {dataStatus?.isInitialized ? "Hoàn tất" : "Chưa xong"}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Tính toàn vẹn</p>
                      <Badge variant={dataStatus?.dataIntegrity ? "default" : "destructive"}>
                        {dataStatus?.dataIntegrity ? "Tốt" : "Lỗi"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
  <TabsContent value="cloud" className="space-y-4">
          <GoogleDriveSync onSyncComplete={handleSyncComplete} />
        </TabsContent>

        {/* Sync Configuration Tab */}
        <TabsContent value="sync" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sync Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Cấu Hình Đồng Bộ
                </CardTitle>
                <CardDescription>
                  Thiết lập tần suất và cách thức đồng bộ dữ liệu với Google Drive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Tự động đồng bộ</Label>
                      <p className="text-xs text-gray-500">Tự động backup dữ liệu theo lịch trình</p>
                    </div>
                    <Switch 
                      checked={googleDriveStatus.autoBackup} 
                      onCheckedChange={(checked) => {
                        GoogleDriveUtils.setAutoSync(checked);
                        setGoogleDriveStatus(prev => ({ ...prev, autoBackup: checked }));
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Đồng bộ khi có thay đổi</Label>
                      <p className="text-xs text-gray-500">Tự động sync khi dữ liệu được cập nhật</p>
                    </div>
                                         <Switch 
                       checked={false} 
                       onCheckedChange={() => {
                         toast('Tính năng đang được phát triển');
                       }}
                     />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Thông báo đồng bộ</Label>
                      <p className="text-xs text-gray-500">Hiển thị thông báo khi đồng bộ hoàn tất</p>
                    </div>
                                         <Switch 
                       checked={true} 
                       onCheckedChange={() => {
                         toast('Tính năng đang được phát triển');
                       }}
                     />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    onClick={async () => {
                      try {
                        setLoading(true);
                        const success = await GoogleDriveUtils.syncLatestData();
                        if (success) {
                          setMessage({ type: 'success', text: 'Đã đồng bộ dữ liệu mới nhất từ Google Drive!' });
                          loadData(); // Reload data để cập nhật UI
                        } else {
                          setMessage({ type: 'error', text: 'Không thể đồng bộ dữ liệu từ Google Drive' });
                        }
                      } catch (error) {
                        setMessage({ type: 'error', text: 'Có lỗi xảy ra khi đồng bộ dữ liệu' });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading || !googleDriveStatus.connected}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {loading ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu mới nhất'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sync Status Card */}
            <SyncStatusCard onSyncComplete={(success) => {
              if (success) {
                loadData(); // Reload data after successful sync
              }
            }} />
          </div>

          {/* Sync History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-900 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lịch Sử Đồng Bộ
              </CardTitle>
              <CardDescription>
                Theo dõi các lần đồng bộ gần đây
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-green-700">Đồng bộ thành công</p>
                      <p className="text-xs text-green-600">Backup dữ liệu hệ thống</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-600">Hôm nay, 14:30</p>
                    <p className="text-xs text-green-500">2.5 MB</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <Download className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-blue-700">Khôi phục dữ liệu</p>
                      <p className="text-xs text-blue-600">Tải dữ liệu từ Google Drive</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-600">Hôm qua, 09:15</p>
                    <p className="text-xs text-blue-500">2.3 MB</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Đồng bộ tự động</p>
                      <p className="text-xs text-gray-600">Backup theo lịch trình</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">2 ngày trước, 00:00</p>
                    <p className="text-xs text-gray-500">2.1 MB</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
         {/* Updated Management Tab */}
        <TabsContent value="management" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Import/Export JSON */}
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Import/Export JSON</CardTitle>
                <CardDescription>
                  Sao lưu và khôi phục dữ liệu hệ thống dạng JSON
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="import-file">Import dữ liệu từ file JSON</Label>
                  <div className="flex gap-2">
                    <Input
                      id="import-file"
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      disabled={loading}
                    />
                    <Button 
                      onClick={() => fileInputRef.current?.click()} 
                      disabled={loading}
                      variant="outline"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Chọn file
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={handleExport} 
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
              </CardContent>
            </Card>

            {/* Import/Export Excel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Import/Export Excel</CardTitle>
                <CardDescription>
                  Làm việc với file Excel (.xlsx)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="import-excel">Import từ file Excel</Label>
                  <div className="flex gap-2">
                    <Input
                      id="import-excel"
                      ref={excelInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleImportExcel}
                      disabled={loading}
                    />
                    <Button 
                      onClick={() => excelInputRef.current?.click()} 
                      disabled={loading}
                      variant="outline"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Chọn Excel
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={handleExportExcel} 
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </CardContent>
            </Card>

            {/* Import/Export CSV */}
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Import/Export CSV</CardTitle>
                <CardDescription>
                  Làm việc với file CSV
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Chọn bảng cho CSV Import</Label>
                  <Select value={selectedTableForCSV} onValueChange={setSelectedTableForCSV}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn bảng..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableTablesForCSV().map((table) => (
                        <SelectItem key={table.value} value={table.value}>
                          {table.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="import-csv">Import từ file CSV</Label>
                  <div className="flex gap-2">
                    <Input
                      id="import-csv"
                      ref={csvInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleImportCSV}
                      disabled={loading || !selectedTableForCSV}
                    />
                    <Button 
                      onClick={() => csvInputRef.current?.click()} 
                      disabled={loading || !selectedTableForCSV}
                      variant="outline"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Import CSV
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleExportCSV()} 
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <File className="h-4 w-4 mr-2" />
                    Export All CSV
                  </Button>
                  <Button 
                    onClick={() => selectedTableForCSV && handleExportCSV(selectedTableForCSV)} 
                    disabled={loading || !selectedTableForCSV}
                    variant="outline"
                  >
                    Export Selected
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* System Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Thao Tác Hệ Thống</CardTitle>
                <CardDescription>
                  Các thao tác quản lý dữ liệu và cache
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleForceReload} 
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Force Reload
                </Button>

                <Button 
                  onClick={handleClearCache} 
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Xóa Cache
                </Button>

                <Button 
                  onClick={() => setConfirmDialog({
                    open: true,
                    title: 'Xóa Dữ Liệu Hệ Thống',
                    content: 'Bạn có chắc chắn muốn xóa tất cả dữ liệu hệ thống (giữ nguyên danh sách nhân viên)? Thao tác này sẽ xóa hết hóa đơn, chi tiết hóa đơn và reset các bảng khác về trạng thái ban đầu.',
                    action: handleClearDataExceptDSNV
                  })}
                  disabled={loading}
                  variant="destructive"
                  className="w-full"
                >
                  <Eraser className="h-4 w-4 mr-2" />
                  Clear Data (Giữ Nhân Viên)
                </Button>

                <Button 
                  onClick={() => setConfirmDialog({
                    open: true,
                    title: 'Reset Tất Cả Dữ Liệu',
                    content: 'Bạn có chắc chắn muốn reset tất cả dữ liệu về trạng thái ban đầu? Thao tác này không thể hoàn tác.',
                    action: handleReset
                  })}
                  disabled={loading}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset Tất Cả
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      
       <TabsContent value="tables" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {Object.entries(tableData).map(([tableName, data]) => (
              <Card key={tableName}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTableIcon(tableName)}
                      <CardTitle className="text-purple-900">{getTableDisplayName(tableName)}</CardTitle>
                      <Badge variant="outline">{data.length} bản ghi</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleExportCSV(tableName)}
                        disabled={loading}
                      >
                        <File className="h-4 w-4 mr-2" />
                        CSV
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewTable(tableName)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Xem chi tiết
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Bảng {tableName} - {getTableDisplayName(tableName)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600">
                    {data.length > 0 ? (
                      <p>Dữ liệu mẫu: {Object.keys(data[0]).join(', ')}</p>
                    ) : (
                      <p className="text-red-500">Không có dữ liệu</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Kiểm Tra  Hệ Thống</CardTitle>
                <CardDescription>
                  Tình trạng chi tiết của hệ thống và các khuyến nghị
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Overall Status */}
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-purple-50">
                    {healthCheck?.healthy ? (
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    )}
                    <div>
                      <h3 className="font-bold text-lg">
                        Trạng thái: {healthCheck?.healthy ? 'Tốt' : 'Có vấn đề'}
                      </h3>
                      <p className="text-gray-600">
                        {healthCheck?.issues.length || 0} lỗi nghiêm trọng, {healthCheck?.warnings.length || 0} cảnh báo
                      </p>
                    </div>
                  </div>

                  {/* Issues */}
                  {healthCheck?.issues && healthCheck.issues.length > 0 && (
                    <div className="border rounded-lg">
                      <button
                        className="w-full flex items-center justify-between p-4 text-red-600 hover:bg-red-50"
                        onClick={() => toggleSection('issues')}
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Lỗi Nghiêm Trọng ({healthCheck.issues.length})
                        </div>
                        {expandedSections.issues ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      {expandedSections.issues && (
                        <div className="p-4 space-y-2">
                          {healthCheck.issues.map((issue, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Warnings */}
                  {healthCheck?.warnings && healthCheck.warnings.length > 0 && (
                    <div className="border rounded-lg">
                      <button
                        className="w-full flex items-center justify-between p-4 text-yellow-600 hover:bg-yellow-50"
                        onClick={() => toggleSection('warnings')}
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Cảnh Báo ({healthCheck.warnings.length})
                        </div>
                        {expandedSections.warnings ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      {expandedSections.warnings && (
                        <div className="p-4 space-y-2">
                          {healthCheck.warnings.map((warning, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              <span>{warning}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recommendations */}
                  {healthCheck?.recommendations && healthCheck.recommendations.length > 0 && (
                    <div className="border rounded-lg">
                      <button
                        className="w-full flex items-center justify-between p-4 text-blue-600 hover:bg-blue-50"
                        onClick={() => toggleSection('recommendations')}
                      >
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          Khuyến Nghị ({healthCheck.recommendations.length})
                        </div>
                        {expandedSections.recommendations ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      {expandedSections.recommendations && (
                        <div className="p-4 space-y-2">
                          {healthCheck.recommendations.map((rec, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                              <Info className="h-4 w-4 text-blue-600" />
                              <span>{rec}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* View Table Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getTableIcon(selectedTable)}
              Chi tiết bảng: {getTableDisplayName(selectedTable)}
            </DialogTitle>
            <DialogDescription>
              Bảng {selectedTable} có {tableData[selectedTable]?.length || 0} bản ghi
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-auto max-h-[60vh]">
            {tableData[selectedTable] && tableData[selectedTable].length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(tableData[selectedTable][0]).map((key) => (
                      <TableHead key={key} className="whitespace-nowrap">
                        {key}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData[selectedTable].slice(0, 50).map((row, index) => (
                    <TableRow key={index}>
                      {Object.values(row).map((value, cellIndex) => (
                        <TableCell key={cellIndex} className="max-w-xs truncate">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center h-32">
                <p className="text-gray-500">Không có dữ liệu</p>
              </div>
            )}
          </div>

          {tableData[selectedTable] && tableData[selectedTable].length > 50 && (
            <div className="text-sm text-gray-500 text-center">
              Hiển thị 50/{tableData[selectedTable].length} bản ghi đầu tiên
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              {confirmDialog.title}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.content}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                confirmDialog.action();
                setConfirmDialog(prev => ({ ...prev, open: false }));
              }}
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
};

export default SettingDataPage;