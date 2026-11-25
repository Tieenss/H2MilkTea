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
  FileSpreadsheet,
  File,
  Eraser,
  FileText,
  Settings,
  Zap,
  ChevronDown,
  ChevronUp,
  Cloud,
  ShieldCheck,
  Search,
  Wrench,
  Sparkles,
  CheckSquare,
  Square,
  Truck,
  ClipboardCheck,
  ArrowLeftRight,
  UserCheck,
  Bot,
} from 'lucide-react';
import AuthUtils, { DataActivityLogItem } from '@/utils/authUtils';
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
  hasRootAdminFallback?: boolean;
}

interface BusinessHealthDetails {
  productsWithoutBOMCount: number;
  productsWithoutBOMNames: string[];
  orphanConfigsCount: number;
  orphanDetailsCount: number;
  busyTablesCount: number;
  hasTakeawayTable: boolean;
  staffCount: number;
  hasRootAdminFallback: boolean;
}

interface HealthCheck {
  healthy: boolean;
  status: string;
  issues: string[];
  warnings: string[];
  details: DataStatus;
  businessDetails?: BusinessHealthDetails;
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

interface ClearTargetOption {
  id: string;
  label: string;
  description: string;
  tables: string[];
  group: 'transactions' | 'catalog' | 'inventory';
  badgeColor: string;
  dangerous?: boolean;
}

const ALL_CORE_TABLES = [
  'DSNV',
  'DSBAN',
  'DMHH',
  'NGUYENLIEU',
  'CAUHINH',
  'KHACHHANG',
  'NHACUNGCAP',
  'NHAPXUATKHO',
  'KIEMKEKHO',
  'HOADON',
  'HOADONDETAIL',
];

const CLEAR_TARGET_OPTIONS: ClearTargetOption[] = [
  {
    id: 'orders_invoices',
    label: 'Đơn hàng & Hóa đơn bán hàng',
    description: 'Xóa toàn bộ hóa đơn (HOADON) và chi tiết món đã bán (HOADONDETAIL)',
    tables: ['HOADON', 'HOADONDETAIL'],
    group: 'transactions',
    badgeColor: 'bg-rose-100 text-rose-700 border-rose-200',
  },
  {
    id: 'pos_live_orders',
    label: 'Đơn QR, Bếp KDS & Giỏ hàng tạm tại bàn',
    description: 'Xóa đơn chờ bếp/QR (pos_orders), giỏ hàng đang mở (pos_cart_drafts) và hàng đợi lệnh in',
    tables: ['pos_orders', 'pos_cart_drafts'],
    group: 'transactions',
    badgeColor: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  {
    id: 'customers',
    label: 'Khách hàng & Điểm tích lũy',
    description: 'Xóa danh sách khách hàng thử nghiệm và lịch sử công nợ/tích điểm (KHACHHANG)',
    tables: ['KHACHHANG'],
    group: 'transactions',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  {
    id: 'ai_logs',
    label: 'Lịch sử Chatbot AI & Nhật ký hội thoại',
    description: 'Dọn sạch log kiểm toán và hội thoại thử nghiệm của trợ lý AI (ai_audit_logs)',
    tables: ['ai_audit_logs'],
    group: 'transactions',
    badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  {
    id: 'products',
    label: 'Sản phẩm / Menu đã nhập',
    description: 'Xóa danh mục đồ uống, topping và món ăn trong thực đơn (DMHH)',
    tables: ['DMHH'],
    group: 'catalog',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  {
    id: 'bom_recipes',
    label: 'Định mức công thức pha chế (BOM)',
    description: 'Xóa bảng cấu hình định lượng nguyên liệu cho từng sản phẩm (CAUHINH)',
    tables: ['CAUHINH'],
    group: 'catalog',
    badgeColor: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  },
  {
    id: 'tables',
    label: 'Danh sách Bàn & Khu vực',
    description: 'Xóa tất cả các bàn đã tạo (DSBAN - tự động giữ lại mục mặc định "Khách mua về")',
    tables: ['DSBAN'],
    group: 'catalog',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  {
    id: 'inventory_tx',
    label: 'Phiếu Nhập / Xuất kho',
    description: 'Xóa lịch sử giao dịch nhập hàng và xuất kho tự động (NHAPXUATKHO)',
    tables: ['NHAPXUATKHO'],
    group: 'inventory',
    badgeColor: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  },
  {
    id: 'stocktake',
    label: 'Phiếu Kiểm kê kho',
    description: 'Xóa lịch sử các đợt kiểm kê kho định kỳ/đột xuất (KIEMKEKHO)',
    tables: ['KIEMKEKHO'],
    group: 'inventory',
    badgeColor: 'bg-teal-100 text-teal-700 border-teal-200',
  },
  {
    id: 'materials',
    label: 'Danh mục Nguyên liệu kho',
    description: 'Xóa toàn bộ nguyên vật liệu đã khai báo trong kho (NGUYENLIEU)',
    tables: ['NGUYENLIEU'],
    group: 'inventory',
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  {
    id: 'suppliers',
    label: 'Danh sách Nhà cung cấp',
    description: 'Xóa danh bạ đối tác và nhà cung cấp nguyên vật liệu (NHACUNGCAP)',
    tables: ['NHACUNGCAP'],
    group: 'inventory',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  {
    id: 'staff',
    label: 'Tài khoản Nhân viên (Giữ lại Admin gốc)',
    description: 'Xóa các nhân viên phụ, luôn bảo vệ tài khoản Admin đang đăng nhập & Admin gốc dự phòng',
    tables: ['DSNV'],
    group: 'inventory',
    badgeColor: 'bg-red-100 text-red-700 border-red-300',
    dangerous: true,
  },
];

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
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTableForCSV, setSelectedTableForCSV] = useState<string>('DMHH');
  const [activityLogs, setActivityLogs] = useState<DataActivityLogItem[]>([]);

  // Selective Clear Modal State
  const [selectiveClearOpen, setSelectiveClearOpen] = useState(false);
  const [selectedClearIds, setSelectedClearIds] = useState<string[]>([
    'orders_invoices',
    'pos_live_orders',
    'inventory_tx',
    'stocktake',
    'customers',
    'ai_logs',
  ]);
  const [resetTableStatusOpt, setResetTableStatusOpt] = useState(true);
  const [resetMaterialStockOpt, setResetMaterialStockOpt] = useState(false);
  const [autoBackupBeforeClear, setAutoBackupBeforeClear] = useState(true);

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
    needsSync: false,
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
    action: () => {},
  });

  const [expandedSections, setExpandedSections] = useState<{
    issues: boolean;
    warnings: boolean;
    recommendations: boolean;
  }>({
    issues: true,
    warnings: true,
    recommendations: true,
  });

  useEffect(() => {
    if (!AuthUtils.isAuthenticated()) {
      router.push('/');
      return;
    }
    AuthUtils.purgeLegacyLocalStorageData();
    AuthUtils.ensureRootAdminFallback(AuthUtils.getUserData());
    loadData();
  }, []);

  useEffect(() => {
    const updateGoogleDriveStatus = () => {
      const authInfo = GoogleDriveUtils.getAuthInfo();
      const isConnected = GoogleDriveUtils.isSignedIn();
      const needsSync = GoogleDriveUtils.shouldAutoSync();

      setGoogleDriveStatus({
        connected: isConnected,
        autoBackup: authInfo?.autoSyncEnabled || false,
        lastSync: authInfo?.lastSync || null,
        needsSync: Boolean(needsSync && authInfo?.autoSyncEnabled),
      });
    };

    updateGoogleDriveStatus();
    const interval = setInterval(updateGoogleDriveStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncComplete = (success: boolean, msg: string) => {
    setMessage({
      type: success ? 'success' : 'error',
      text: msg,
    });

    if (success) {
      loadData();
    }
  };

  // Tải đồng thời toàn bộ 11 bảng từ Supabase Cloud
  const loadData = async () => {
    try {
      setLoading(true);
      AuthUtils.purgeLegacyLocalStorageData();

      const tableDataMap: { [key: string]: any[] } = {};
      await Promise.all(
        ALL_CORE_TABLES.map(async (table) => {
          try {
            const data = await AuthUtils.apiRequest(table, 'getall', {});
            tableDataMap[table] = Array.isArray(data) ? data : data?.data || [];
          } catch (error) {
            console.error(`Error loading ${table}:`, error);
            tableDataMap[table] = [];
          }
        })
      );

      setTableData(tableDataMap);

      const status = AuthUtils.getDataStatus();
      setDataStatus(status);

      const health = AuthUtils.healthCheck();
      setHealthCheck(health);

      const perf = AuthUtils.getPerformanceMetrics();
      setPerformance(perf);

      setActivityLogs(AuthUtils.getDataActivityLogs());
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Lỗi tải dữ liệu: ' + (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  // Áp dụng các Preset chọn nhanh trong Modal Dọn dẹp dữ liệu
  const applyClearPreset = (preset: 'golive' | 'transactions_only' | 'catalog_inventory' | 'all_except_staff') => {
    if (preset === 'golive') {
      // Chuẩn bị vận hành thực tế tại quán H2MilkTea: xóa đơn rác, phiếu kho test, khách test; giữ Menu, BOM, Bàn, Nhân viên, NCC
      setSelectedClearIds(['orders_invoices', 'pos_live_orders', 'inventory_tx', 'stocktake', 'customers', 'ai_logs']);
      setResetTableStatusOpt(true);
      setResetMaterialStockOpt(true);
    } else if (preset === 'transactions_only') {
      setSelectedClearIds(['orders_invoices', 'pos_live_orders']);
      setResetTableStatusOpt(true);
      setResetMaterialStockOpt(false);
    } else if (preset === 'catalog_inventory') {
      setSelectedClearIds(['products', 'bom_recipes', 'materials', 'inventory_tx', 'stocktake', 'suppliers']);
      setResetTableStatusOpt(false);
      setResetMaterialStockOpt(false);
    } else if (preset === 'all_except_staff') {
      setSelectedClearIds(
        CLEAR_TARGET_OPTIONS.filter((opt) => opt.id !== 'staff').map((opt) => opt.id)
      );
      setResetTableStatusOpt(true);
      setResetMaterialStockOpt(false);
    }
  };

  const toggleClearOption = (id: string) => {
    setSelectedClearIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getOptionRecordCount = (opt: ClearTargetOption): number => {
    return opt.tables.reduce((sum, t) => sum + (Array.isArray(tableData[t]) ? tableData[t].length : 0), 0);
  };

  // Thực thi xóa các phần đã tick chọn trên Supabase Cloud
  const handleExecuteSelectiveClear = async () => {
    try {
      setLoading(true);

      if (autoBackupBeforeClear) {
        AuthUtils.exportData();
      }

      const tablesToClear = Array.from(
        new Set(
          CLEAR_TARGET_OPTIONS.filter((opt) => selectedClearIds.includes(opt.id)).flatMap((opt) => opt.tables)
        )
      );

      const result = await AuthUtils.clearSelectedData(tablesToClear, {
        resetTableStatus: resetTableStatusOpt,
        resetMaterialStock: resetMaterialStockOpt,
        clearPrintQueue: selectedClearIds.includes('pos_live_orders') || selectedClearIds.includes('orders_invoices'),
      });

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        toast.success(result.message);
        setSelectiveClearOpen(false);
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.message });
        toast.error(result.message);
      }
    } catch (error) {
      const errMsg = 'Lỗi dọn dẹp dữ liệu: ' + (error as Error).message;
      setMessage({ type: 'error', text: errMsg });
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Xóa nhanh 1 bảng cụ thể từ tab Dữ Liệu Bảng
  const handleClearSingleTable = async (tableName: string) => {
    try {
      setLoading(true);
      const result = await AuthUtils.clearSelectedData([tableName], {
        resetTableStatus: tableName === 'HOADON',
      });
      if (result.success) {
        toast.success(`Đã làm trống bảng ${getTableDisplayName(tableName)} trên Cloud!`);
        setMessage({ type: 'success', text: `Đã làm trống bảng ${getTableDisplayName(tableName)}!` });
        await loadData();
      } else {
        toast.error(result.message);
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      toast.error('Lỗi khi xóa bảng: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Xóa trực tiếp 1 bản ghi rác trong Modal Xem Chi Tiết Bảng
  const handleDeleteSingleRecord = async (tableName: string, row: any) => {
    const pkMap: Record<string, string> = {
      DSNV: 'username',
      DSBAN: 'IDBAN',
      HOADON: 'IDHOADON',
      HOADONDETAIL: 'IDHOADONDETAIL',
      DMHH: 'IDSP',
      NGUYENLIEU: 'IDNguyenLieu',
      CAUHINH: 'IDCauHinh',
      KHACHHANG: 'IDKHACHHANG',
      KIEMKEKHO: 'IDKiemKe',
      NHAPXUATKHO: 'IDGiaoDich',
      NHACUNGCAP: 'IDNhaCungCap',
    };
    const pk = pkMap[tableName] || 'id';
    const targetId = row[pk] || row.IDHD || row.IDKH;
    if (!targetId) {
      toast.error('Không xác định được mã bản ghi để xóa');
      return;
    }

    if (tableName === 'DSNV' && String(targetId).toLowerCase() === 'admin') {
      toast.error('Không thể xóa tài khoản Admin gốc của hệ thống!');
      return;
    }

    try {
      setLoading(true);
      const res = await AuthUtils.apiRequest(tableName, 'delete', {
        [pk]: targetId,
        forceHardDelete: true,
      });
      if (res && res.success === false) {
        toast.error(res.message || 'Không thể xóa bản ghi');
      } else {
        toast.success(`Đã xóa bản ghi ${targetId}!`);
        await loadData();
      }
    } catch (err) {
      toast.error('Lỗi xóa bản ghi: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Tự động sửa lỗi sức khỏe dữ liệu 1-Click
  const handleAutoFixHealth = async () => {
    try {
      setLoading(true);
      const res = await AuthUtils.autoFixHealthIssues();
      if (res.success) {
        toast.success(res.message);
        setMessage({ type: 'success', text: res.message });
        await loadData();
      } else {
        toast.error(res.message);
        setMessage({ type: 'error', text: res.message });
      }
    } catch (err) {
      toast.error('Lỗi sửa dữ liệu: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Tải file Excel mẫu chuẩn cho quán H2MilkTea
  const handleDownloadTemplate = () => {
    const res = AuthUtils.downloadExcelTemplate();
    if (res.success) {
      toast.success(res.message);
      setMessage({ type: 'success', text: res.message });
      setActivityLogs(AuthUtils.getDataActivityLogs());
    } else {
      toast.error(res.message);
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    try {
      setLoading(true);
      const result = AuthUtils.exportToExcel();
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        toast.success(result.message);
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
        toast.success(result.message);
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
        toast.success(result.message);
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.message });
        toast.error(result.message);
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
        toast.success(result.message);
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.message });
        toast.error(result.message);
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

  const getAvailableTablesForCSV = () => {
    return ALL_CORE_TABLES.map((tableName) => ({
      value: tableName,
      label: `${getTableDisplayName(tableName)} (${tableName})`,
    }));
  };

  // Export JSON
  const handleExport = async () => {
    try {
      setLoading(true);
      const result = AuthUtils.exportData();
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        toast.success(result.message);
        setActivityLogs(AuthUtils.getDataActivityLogs());
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi export: ' + (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  // Import JSON
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const result = await AuthUtils.importData(file);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        toast.success(result.message);
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.message });
        toast.error(result.message);
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
      const result = await AuthUtils.resetDemoData();
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        toast.success(result.message);
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

  // Clear local cache (keep root admin fallback)
  const handleClearCache = async () => {
    try {
      setLoading(true);
      const result = AuthUtils.clearCache();
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        toast.success(result.message);
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

  // Seed 60-day synchronized test database
  const handleSeedSynchronizedData = async () => {
    try {
      setLoading(true);
      const result = await AuthUtils.seedSynchronizedTestDatabase();
      if (result?.success) {
        setMessage({ type: 'success', text: result.message });
        toast.success(result.message);
        await loadData();
      } else {
        const errMsg = result?.message || 'Không thể đồng bộ dữ liệu mẫu 60 ngày';
        setMessage({ type: 'error', text: errMsg });
        toast.error(errMsg);
      }
    } catch (error) {
      const errMsg = 'Lỗi đồng bộ dữ liệu mẫu: ' + (error as Error).message;
      setMessage({ type: 'error', text: errMsg });
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Force reload from Cloud
  const handleForceReload = async () => {
    try {
      setLoading(true);
      const result = AuthUtils.forceReload();
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        toast.success(result.message);
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

  const handleViewTable = (tableName: string) => {
    setSelectedTable(tableName);
    setTableSearchQuery('');
    setViewDialogOpen(true);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTableIcon = (tableName: string) => {
    const icons: { [key: string]: JSX.Element } = {
      DSNV: <Users className="h-4 w-4 text-purple-600" />,
      DSBAN: <Package className="h-4 w-4 text-blue-600" />,
      HOADON: <ShoppingCart className="h-4 w-4 text-rose-600" />,
      HOADONDETAIL: <FileText className="h-4 w-4 text-orange-600" />,
      DMHH: <Package className="h-4 w-4 text-indigo-600" />,
      NGUYENLIEU: <Package className="h-4 w-4 text-emerald-600" />,
      CAUHINH: <Settings className="h-4 w-4 text-fuchsia-600" />,
      KHACHHANG: <UserCheck className="h-4 w-4 text-amber-600" />,
      NHACUNGCAP: <Truck className="h-4 w-4 text-slate-600" />,
      NHAPXUATKHO: <ArrowLeftRight className="h-4 w-4 text-cyan-600" />,
      KIEMKEKHO: <ClipboardCheck className="h-4 w-4 text-teal-600" />,
    };
    return icons[tableName] || <Database className="h-4 w-4 text-purple-600" />;
  };

  const getTableDisplayName = (tableName: string) => {
    const names: { [key: string]: string } = {
      DSNV: 'Nhân Viên',
      DSBAN: 'Bàn & Khu Vực',
      HOADON: 'Hóa Đơn',
      HOADONDETAIL: 'Chi Tiết Hóa Đơn',
      DMHH: 'Sản Phẩm (Menu)',
      NGUYENLIEU: 'Nguyên Liệu Kho',
      CAUHINH: 'Định Mức Công Thức (BOM)',
      KHACHHANG: 'Khách Hàng',
      NHACUNGCAP: 'Nhà Cung Cấp',
      NHAPXUATKHO: 'Phiếu Nhập Xuất Kho',
      KIEMKEKHO: 'Phiếu Kiểm Kê Kho',
    };
    return names[tableName] || tableName;
  };

  const filteredSelectedTableRows = React.useMemo(() => {
    const rows = tableData[selectedTable] || [];
    if (!tableSearchQuery.trim()) return rows;
    const q = tableSearchQuery.toLowerCase().trim();
    return rows.filter((r) =>
      Object.values(r).some((val) => String(val ?? '').toLowerCase().includes(q))
    );
  }, [tableData, selectedTable, tableSearchQuery]);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-bold text-purple-900 dark:text-purple-200">Trung Tâm Quản Trị Dữ Liệu</h1>
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Cloud className="h-3 w-3 mr-1" />
              Supabase Cloud
            </Badge>
          </div>
          <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">
            Đồng bộ thời gian thực 100% trên Cloud • Không lưu dữ liệu bảng ở LocalStorage (chỉ giữ 1 Admin gốc dự phòng)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setSelectiveClearOpen(true)}
            disabled={loading}
            variant="destructive"
            className="bg-rose-600 hover:bg-rose-700 shadow-sm"
          >
            <Eraser className="h-4 w-4 mr-2" />
            Dọn Dữ Liệu Tùy Chọn (Go-Live)
          </Button>
          <Button onClick={loadData} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Làm mới từ Cloud
          </Button>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <Alert
          className={`border-l-4 ${
            message.type === 'success'
              ? 'border-l-green-500 bg-green-50 text-green-900'
              : message.type === 'error'
              ? 'border-l-red-500 bg-red-50 text-red-900'
              : message.type === 'warning'
              ? 'border-l-yellow-500 bg-yellow-50 text-yellow-900'
              : 'border-l-blue-500 bg-blue-50 text-blue-900'
          }`}
        >
          <AlertDescription className="font-medium">{message.text}</AlertDescription>
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
                <span className="text-red-600">Cần chú ý</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs mt-1">
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
            <CardTitle className="text-sm font-medium">Tổng Bản Ghi Cloud (11 Bảng)</CardTitle>
            <Database className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-200">
              {dataStatus?.totalRecords || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Đồng bộ trực tiếp từ Supabase DB
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chế Độ Lưu Trữ & Dự Phòng</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
              Cloud-Only (0 MB Local DB)
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Admin gốc dự phòng: {dataStatus?.hasRootAdminFallback ? 'Đã bảo vệ (admin)' : 'Đang khởi tạo'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lần Đồng Bộ Cuối</CardTitle>
            <Clock className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-purple-900 dark:text-purple-200">
              {dataStatus?.lastSaved ? new Date(dataStatus.lastSaved).toLocaleString('vi-VN') : 'Vừa đồng bộ'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Dung lượng RAM phiên: {performance?.memoryUsage.mb.toFixed(2)} MB
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="management" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto p-1.5 gap-1.5 bg-gray-100 dark:bg-slate-800 rounded-xl">
          <TabsTrigger value="overview">Tổng Quan (11 Bảng)</TabsTrigger>
          <TabsTrigger value="tables">Dữ Liệu Bảng</TabsTrigger>
          <TabsTrigger value="management">Quản Lý & Dọn Dẹp</TabsTrigger>
          <TabsTrigger value="cloud">Google Drive</TabsTrigger>
          <TabsTrigger value="sync">Đồng Bộ & Nhật Ký</TabsTrigger>
          <TabsTrigger value="health">Sức Khỏe Dữ Liệu</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900 dark:text-purple-200">Thống Kê Đầy Đủ 11 Bảng Nghiệp Vụ</CardTitle>
                <CardDescription>
                  Phân bố dữ liệu trực tiếp trên Supabase Cloud theo từng phân hệ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ALL_CORE_TABLES.map((tableName) => {
                    const count = tableData[tableName]?.length ?? performance?.recordCounts?.[tableName] ?? 0;
                    return (
                      <div
                        key={tableName}
                        onClick={() => handleViewTable(tableName)}
                        className="cursor-pointer flex items-center justify-between p-3 rounded-lg bg-purple-50/80 hover:bg-purple-100/80 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {getTableIcon(tableName)}
                          <div className="truncate">
                            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {getTableDisplayName(tableName)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">{tableName}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 pl-2">
                          <p className="font-bold text-purple-900 dark:text-purple-300">{count}</p>
                          <p className="text-[11px] text-gray-500">bản ghi</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900 dark:text-purple-200">Kiến Trúc Lưu Trữ & An Toàn Hệ Thống</CardTitle>
                <CardDescription>
                  Trạng thái vận hành thực tế chuẩn bị cho quán H2MilkTea
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    Đã loại bỏ lưu trữ dữ liệu bảng trong LocalStorage
                  </div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                    Mọi thao tác thêm/sửa/xóa hoặc dọn dẹp dữ liệu đều thực thi trực tiếp trên <strong>Supabase Cloud Database</strong>.
                    Dữ liệu rác cũ không bao giờ tự khôi phục lại từ trình duyệt.
                  </p>
                  <div className="pt-1 flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-300 text-xs">
                      Phao cứu sinh: Tài khoản Admin gốc (`admin`) luôn được bảo vệ
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Bộ nhớ đệm RAM phiên hiện tại</span>
                    <span>{formatFileSize(performance?.memoryUsage.bytes || 0)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${Math.min(((performance?.memoryUsage.mb || 0) / 5) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <Button
                    variant="outline"
                    className="w-full border-purple-200 text-purple-800 hover:bg-purple-50"
                    onClick={handleDownloadTemplate}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                    Tải Excel Mẫu Nhập Quán
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full bg-rose-600 hover:bg-rose-700"
                    onClick={() => setSelectiveClearOpen(true)}
                  >
                    <Eraser className="h-4 w-4 mr-2" />
                    Chọn Mục Để Xóa
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Google Drive Tab */}
        <TabsContent value="cloud" className="space-y-4">
          <GoogleDriveSync onSyncComplete={handleSyncComplete} />
        </TabsContent>

        {/* Sync & Activity History Tab */}
        <TabsContent value="sync" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Cấu Hình Đồng Bộ Cloud & Google Drive
                </CardTitle>
                <CardDescription>
                  Thiết lập tự động sao lưu dữ liệu Cloud lên Google Drive cá nhân
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Tự động sao lưu Google Drive</Label>
                      <p className="text-xs text-gray-500">Tự động xuất toàn bộ 11 bảng từ Supabase lên Google Drive theo lịch</p>
                    </div>
                    <Switch
                      checked={googleDriveStatus.autoBackup}
                      onCheckedChange={(checked) => {
                        GoogleDriveUtils.setAutoSync(checked);
                        setGoogleDriveStatus((prev) => ({ ...prev, autoBackup: checked }));
                      }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2.5">
                  <Button
                    type="button"
                    onClick={handleSeedSynchronizedData}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    🔄 Đồng bộ dữ liệu mẫu 60 ngày lên Cloud
                  </Button>

                  <Button
                    onClick={async () => {
                      try {
                        setLoading(true);
                        const success = await GoogleDriveUtils.syncLatestData();
                        if (success) {
                          AuthUtils.recordDataActivity('Đồng bộ từ Google Drive', 'Đã khôi phục bản sao lưu mới nhất từ Drive vào Supabase Cloud', 'success');
                          setMessage({ type: 'success', text: 'Đã đồng bộ dữ liệu mới nhất từ Google Drive vào Supabase Cloud!' });
                          await loadData();
                        } else {
                          setMessage({ type: 'error', text: 'Không thể đồng bộ dữ liệu từ Google Drive' });
                        }
                      } catch {
                        setMessage({ type: 'error', text: 'Có lỗi xảy ra khi đồng bộ dữ liệu' });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading || !googleDriveStatus.connected}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {loading ? 'Đang đồng bộ...' : 'Đồng bộ bản mới nhất từ Google Drive'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <SyncStatusCard
              onSyncComplete={(success) => {
                if (success) {
                  loadData();
                }
              }}
            />
          </div>

          {/* Real Data Activity Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-900 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Nhật Ký Thao Tác Dữ Liệu Thực Tế
              </CardTitle>
              <CardDescription>
                Ghi nhận các thao tác dọn dẹp dữ liệu, import, export và đồng bộ trong phiên làm việc
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLogs.length > 0 ? (
                <div className="space-y-2.5">
                  {activityLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        log.status === 'success'
                          ? 'bg-green-50/70 border-green-200'
                          : log.status === 'warning'
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-red-50/70 border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2
                          className={`h-4 w-4 shrink-0 ${
                            log.status === 'success'
                              ? 'text-green-600'
                              : log.status === 'warning'
                              ? 'text-amber-600'
                              : 'text-red-600'
                          }`}
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{log.action}</p>
                          <p className="text-xs text-gray-600">{log.detail}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-3">
                        <p className="text-xs font-medium text-gray-600">
                          {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-gray-500">
                  Chưa có thao tác thay đổi dữ liệu nào trong phiên này.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Management Tab */}
        <TabsContent value="management" className="space-y-4">
          {/* Quick Banner: Selective Go-Live Cleaner & 60-day Demo Seeder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-rose-200 bg-gradient-to-r from-rose-50/90 to-orange-50/90">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-rose-950">Dọn Dẹp Dữ Liệu Rác Chuẩn Bị Vận Hành Quán (Go-Live)</h3>
                    <Badge className="bg-rose-600 text-white text-[10px]">Mới</Badge>
                  </div>
                  <p className="text-xs text-rose-800 mt-0.5">
                    Tick chọn từng phần muốn xóa (Đơn hàng, Bàn, Sản phẩm đã nhập, Kho...) và xóa triệt để trên Supabase Cloud.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setSelectiveClearOpen(true)}
                  disabled={loading}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold shrink-0"
                >
                  <Eraser className="h-4 w-4 mr-2" />
                  Chọn Mục Để Xóa...
                </Button>
              </CardContent>
            </Card>

            <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/90 to-purple-50/90">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-indigo-950">Khởi tạo & Đồng bộ dữ liệu mẫu kiểm thử (60 ngày)</h3>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Tạo đầy đủ hóa đơn, chi tiết bán hàng, BOM nguyên liệu và dữ liệu kho đồng bộ lên Cloud trong 60 ngày gần nhất.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleSeedSynchronizedData}
                  disabled={loading}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shrink-0"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  🔄 Đồng bộ mẫu 60 ngày
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Import/Export JSON */}
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Import/Export JSON (Toàn Hệ Thống)</CardTitle>
                <CardDescription>
                  Sao lưu và khôi phục trọn bộ 11 bảng dữ liệu dạng file JSON chuẩn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="import-file">Khôi phục dữ liệu từ file JSON (Đồng bộ lên Cloud)</Label>
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
                  Export Toàn Bộ JSON
                </Button>
              </CardContent>
            </Card>

            {/* Import/Export Excel */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-purple-900">Import/Export Excel (.xlsx)</CardTitle>
                    <CardDescription>
                      Nhập nhanh Menu Sản phẩm, Nguyên liệu, BOM, Bàn từ file Excel
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Tải File Mẫu Quán
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="import-excel">Import từ file Excel (Đồng bộ thẳng lên Cloud)</Label>
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
                  Export Toàn Bộ Ra Excel (11 Sheet)
                </Button>
              </CardContent>
            </Card>

            {/* Import/Export CSV */}
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Import/Export CSV Theo Từng Bảng</CardTitle>
                <CardDescription>
                  Nhập hoặc xuất từng bảng dữ liệu riêng lẻ định dạng CSV (UTF-8)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-table-select">Chọn bảng dữ liệu làm việc</Label>
                  <select
                    id="csv-table-select"
                    value={selectedTableForCSV}
                    onChange={(e) => setSelectedTableForCSV(e.target.value)}
                    className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-white dark:bg-slate-900 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {getAvailableTablesForCSV().map((table) => (
                      <option key={table.value} value={table.value}>
                        {table.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="import-csv">Import từ file CSV vào bảng đã chọn</Label>
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
                    Export Tất Cả CSV
                  </Button>
                  <Button
                    onClick={() => selectedTableForCSV && handleExportCSV(selectedTableForCSV)}
                    disabled={loading || !selectedTableForCSV}
                    variant="outline"
                  >
                    Export Bảng Này
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* System Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-900">Thao Tác Hệ Thống & Làm Sạch</CardTitle>
                <CardDescription>
                  Quản trị dữ liệu Cloud, dọn dẹp theo danh mục và khôi phục mặc định
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleForceReload}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <Zap className="h-4 w-4 mr-2 text-amber-500" />
                  Tải Lại Dữ Liệu Trực Tiếp Từ Cloud (Force Reload)
                </Button>

                <Button
                  onClick={handleClearCache}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2 text-blue-600" />
                  Dọn Sạch LocalStorage Tạm (Giữ Admin Gốc Dự Phòng)
                </Button>

                <Button
                  onClick={() => setSelectiveClearOpen(true)}
                  disabled={loading}
                  variant="destructive"
                  className="w-full bg-rose-600 hover:bg-rose-700"
                >
                  <Eraser className="h-4 w-4 mr-2" />
                  Clear Data Tùy Chọn (Tick Chọn Mục Cần Xóa / Giữ Nhân Viên)
                </Button>

                <Button
                  onClick={() =>
                    setConfirmDialog({
                      open: true,
                      title: 'Khôi Phục Bộ Dữ Liệu Mẫu Mặc Định Lên Cloud',
                      content:
                        'Thao tác này sẽ nạp lại bộ dữ liệu mẫu mặc định ban đầu cho toàn bộ 11 bảng lên Supabase Cloud. Bạn có chắc chắn muốn thực hiện?',
                      action: handleReset,
                    })
                  }
                  disabled={loading}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset Về Dữ Liệu Mẫu Ban Đầu
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tables Tab */}
        <TabsContent value="tables" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {ALL_CORE_TABLES.map((tableName) => {
              const data = tableData[tableName] || [];
              return (
                <Card key={tableName}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getTableIcon(tableName)}
                        <CardTitle className="text-purple-900 dark:text-purple-200 text-lg">
                          {getTableDisplayName(tableName)}
                        </CardTitle>
                        <Badge variant="outline" className="font-semibold">
                          {data.length} bản ghi
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportCSV(tableName)}
                          disabled={loading || data.length === 0}
                        >
                          <File className="h-3.5 w-3.5 mr-1.5" />
                          Xuất CSV
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewTable(tableName)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          Xem & Xóa Dòng Lẻ
                        </Button>
                        {tableName !== 'DSNV' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-rose-600 border-rose-200 hover:bg-rose-50"
                            disabled={loading || data.length === 0}
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                title: `Làm trống bảng ${getTableDisplayName(tableName)}`,
                                content: `Bạn có chắc chắn muốn xóa toàn bộ ${data.length} bản ghi trong bảng ${getTableDisplayName(tableName)} (${tableName}) trên Supabase Cloud?`,
                                action: () => handleClearSingleTable(tableName),
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Làm trống bảng
                          </Button>
                        )}
                      </div>
                    </div>
                    <CardDescription>
                      Mã bảng Cloud: <code>{tableName}</code>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-gray-600 dark:text-slate-400">
                      {data.length > 0 ? (
                        <p className="truncate">
                          <strong>Các cột dữ liệu:</strong> {Object.keys(data[0]).join(', ')}
                        </p>
                      ) : (
                        <p className="text-amber-600 font-medium">Bảng hiện đang trống (0 bản ghi)</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-purple-900 dark:text-purple-200">
                    Kiểm Tra Sức Khỏe & Tính Toàn Vẹn Nghiệp Vụ
                  </CardTitle>
                  <CardDescription>
                    Rà soát dữ liệu mồ côi, bàn bị kẹt trạng thái và định mức công thức pha chế BOM
                  </CardDescription>
                </div>
                <Button
                  onClick={handleAutoFixHealth}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Tự Động Sửa Lỗi & Dọn Dữ Liệu Mồ Côi (1-Click)
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Status */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100">
                {healthCheck?.healthy ? (
                  <CheckCircle2 className="h-9 w-9 text-green-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-9 w-9 text-red-600 shrink-0" />
                )}
                <div>
                  <h3 className="font-bold text-lg">
                    Trạng thái tổng thể: {healthCheck?.healthy ? 'Tốt - Sẵn sàng vận hành' : 'Phát hiện vấn đề cần xử lý'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {healthCheck?.issues.length || 0} lỗi nghiêm trọng • {healthCheck?.warnings.length || 0} cảnh báo nghiệp vụ
                  </p>
                </div>
              </div>

              {/* Business Health Metrics Grid */}
              {healthCheck?.businessDetails && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3.5 rounded-lg border bg-white dark:bg-slate-900">
                    <p className="text-xs text-gray-500">Sản phẩm thiếu công thức BOM</p>
                    <p className="text-xl font-bold text-purple-900 mt-1">
                      {healthCheck.businessDetails.productsWithoutBOMCount} món
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg border bg-white dark:bg-slate-900">
                    <p className="text-xs text-gray-500">Cấu hình BOM / Chi tiết đơn mồ côi</p>
                    <p className="text-xl font-bold text-amber-600 mt-1">
                      {healthCheck.businessDetails.orphanConfigsCount + healthCheck.businessDetails.orphanDetailsCount} dòng
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg border bg-white dark:bg-slate-900">
                    <p className="text-xs text-gray-500">Bàn đang ở trạng thái Đang sử dụng</p>
                    <p className="text-xl font-bold text-blue-600 mt-1">
                      {healthCheck.businessDetails.busyTablesCount} bàn
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg border bg-white dark:bg-slate-900">
                    <p className="text-xs text-gray-500">Tài khoản Admin gốc dự phòng</p>
                    <p className="text-xl font-bold text-emerald-600 mt-1">
                      {healthCheck.businessDetails.hasRootAdminFallback ? 'An toàn' : 'Chưa có'}
                    </p>
                  </div>
                </div>
              )}

              {/* Issues */}
              {healthCheck?.issues && healthCheck.issues.length > 0 && (
                <div className="border rounded-lg">
                  <button
                    className="w-full flex items-center justify-between p-4 text-red-600 hover:bg-red-50"
                    onClick={() => toggleSection('issues')}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4" />
                      Lỗi Nghiêm Trọng ({healthCheck.issues.length})
                    </div>
                    {expandedSections.issues ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedSections.issues && (
                    <div className="p-4 space-y-2">
                      {healthCheck.issues.map((issue, index) => (
                        <div key={index} className="flex items-center gap-2 p-2.5 bg-red-50 rounded text-sm">
                          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
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
                    className="w-full flex items-center justify-between p-4 text-amber-700 hover:bg-amber-50"
                    onClick={() => toggleSection('warnings')}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4" />
                      Cảnh Báo Nghiệp Vụ ({healthCheck.warnings.length})
                    </div>
                    {expandedSections.warnings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedSections.warnings && (
                    <div className="p-4 space-y-2">
                      {healthCheck.warnings.map((warning, index) => (
                        <div key={index} className="flex items-center gap-2 p-2.5 bg-amber-50 rounded text-sm text-amber-900">
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
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
                    className="w-full flex items-center justify-between p-4 text-blue-700 hover:bg-blue-50"
                    onClick={() => toggleSection('recommendations')}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      <Info className="h-4 w-4" />
                      Khuyến Nghị Vận Hành ({healthCheck.recommendations.length})
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
                        <div key={index} className="flex items-center gap-2 p-2.5 bg-blue-50 rounded text-sm text-blue-900">
                          <Info className="h-4 w-4 text-blue-600 shrink-0" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============================================================================
          MODAL DỌN DẸP DỮ LIỆU TÙY CHỌN (SELECTIVE DATA CLEANER / GO-LIVE WIZARD)
         ============================================================================ */}
      <Dialog open={selectiveClearOpen} onOpenChange={setSelectiveClearOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-rose-700">
              <Eraser className="h-6 w-6" />
              Dọn Dẹp Dữ Liệu Tùy Chọn (Chuẩn Bị Dữ Liệu Chuẩn Cho Quán H2MilkTea)
            </DialogTitle>
            <DialogDescription>
              Tick chọn chính xác các phần dữ liệu rác cần xóa. Thao tác này sẽ xóa trực tiếp trên{' '}
              <strong>Supabase Cloud Database</strong> và dọn sạch bộ nhớ trình duyệt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Quick Presets */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                1. Chọn Nhanh Kịch Bản Dọn Dẹp (Presets)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => applyClearPreset('golive')}
                  className="text-left p-3 rounded-xl border-2 border-emerald-500 bg-emerald-50/70 hover:bg-emerald-100/70 transition-all"
                >
                  <div className="font-bold text-xs text-emerald-900 flex items-center justify-between">
                    <span>🎯 Chuẩn bị mở quán (Go-Live)</span>
                    <Badge className="bg-emerald-600 text-white text-[10px]">Khuyên dùng</Badge>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-1">
                    Xóa đơn hàng, lịch sử kho, khách test. Giữ lại Menu, BOM, Bàn (reset Trống) & Nhân viên.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => applyClearPreset('transactions_only')}
                  className="text-left p-3 rounded-xl border border-gray-200 hover:border-purple-400 hover:bg-purple-50/50 transition-all"
                >
                  <div className="font-bold text-xs text-gray-900">🧾 Chỉ xóa Đơn hàng & Doanh thu</div>
                  <p className="text-[11px] text-gray-600 mt-1">
                    Chỉ xóa Hóa đơn, Chi tiết bán hàng, Đơn QR/KDS và trả tất cả bàn về Trống.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => applyClearPreset('catalog_inventory')}
                  className="text-left p-3 rounded-xl border border-gray-200 hover:border-purple-400 hover:bg-purple-50/50 transition-all"
                >
                  <div className="font-bold text-xs text-gray-900">📦 Làm mới Menu & Kho</div>
                  <p className="text-[11px] text-gray-600 mt-1">
                    Xóa Sản phẩm đã nhập, Công thức BOM, Nguyên liệu, Phiếu kho & Nhà cung cấp để nhập lại.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => applyClearPreset('all_except_staff')}
                  className="text-left p-3 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-100/50 transition-all"
                >
                  <div className="font-bold text-xs text-rose-900">🗑️ Xóa tất cả (Giữ Nhân Viên)</div>
                  <p className="text-[11px] text-rose-700 mt-1">
                    Xóa trắng mọi bảng dữ liệu trên Cloud, chỉ giữ lại danh sách Nhân viên.
                  </p>
                </button>
              </div>
            </div>

            {/* Detailed Checkboxes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  2. Tick Chọn Chi Tiết Các Phần Muốn Xóa ({selectedClearIds.length} mục đã chọn)
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setSelectedClearIds(CLEAR_TARGET_OPTIONS.filter((o) => !o.dangerous).map((o) => o.id))
                    }
                  >
                    Chọn tất cả (Trừ Nhân viên)
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-gray-500"
                    onClick={() => setSelectedClearIds([])}
                  >
                    Bỏ chọn hết
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {CLEAR_TARGET_OPTIONS.map((opt) => {
                  const isChecked = selectedClearIds.includes(opt.id);
                  const count = getOptionRecordCount(opt);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => toggleClearOption(opt.id)}
                      className={`cursor-pointer p-3 rounded-xl border transition-all flex items-start gap-3 ${
                        isChecked
                          ? opt.dangerous
                            ? 'border-red-500 bg-red-50/70'
                            : 'border-rose-500 bg-rose-50/50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="mt-0.5 text-rose-600 shrink-0">
                        {isChecked ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-gray-900">{opt.label}</span>
                          <Badge variant="outline" className={`text-[11px] shrink-0 ${opt.badgeColor}`}>
                            {opt.tables.includes('pos_orders') || opt.tables.includes('ai_audit_logs')
                              ? 'Cloud'
                              : `${count} bản ghi`}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{opt.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Smart Sub-Options & Safety Net */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                3. Tùy Chọn Chuẩn Hóa & Bảo Toàn An Toàn
              </Label>

              <div className="space-y-2.5 text-sm">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetTableStatusOpt}
                    onChange={(e) => setResetTableStatusOpt(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-purple-600"
                  />
                  <span>
                    <strong>Đặt lại trạng thái toàn bộ Bàn về &quot;Trống&quot;</strong> (nếu bạn không xóa danh sách Bàn)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetMaterialStockOpt}
                    onChange={(e) => setResetMaterialStockOpt(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-purple-600"
                  />
                  <span>
                    <strong>Đưa tồn kho Nguyên liệu về 0</strong> (giữ danh mục nguyên liệu để quán kiểm kho đầu kỳ mới)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-emerald-800 font-medium">
                  <input
                    type="checkbox"
                    checked={autoBackupBeforeClear}
                    onChange={(e) => setAutoBackupBeforeClear(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                  />
                  <span>
                    📦 <strong>Tự động tải 1 bản Backup (.json) về máy trước khi xóa</strong> (khuyên dùng để khôi phục nếu cần)
                  </span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectiveClearOpen(false)} disabled={loading}>
              Hủy bỏ
            </Button>
            <Button
              variant="destructive"
              onClick={handleExecuteSelectiveClear}
              disabled={
                loading ||
                (selectedClearIds.length === 0 && !resetTableStatusOpt && !resetMaterialStockOpt)
              }
              className="bg-rose-600 hover:bg-rose-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Đang xóa trên Cloud...
                </>
              ) : (
                <>
                  <Eraser className="h-4 w-4 mr-2" />
                  Xác Nhận Dọn Dẹp ({selectedClearIds.length} hạng mục)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Table Dialog (With Search & Single Row Delete) */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  {getTableIcon(selectedTable)}
                  Chi tiết bảng: {getTableDisplayName(selectedTable)} ({selectedTable})
                </DialogTitle>
                <DialogDescription>
                  Tổng cộng {tableData[selectedTable]?.length || 0} bản ghi trên Supabase Cloud
                </DialogDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm nhanh trong bảng..."
                  value={tableSearchQuery}
                  onChange={(e) => setTableSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-auto flex-1 max-h-[60vh] border rounded-lg">
            {filteredSelectedTableRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">Xóa</TableHead>
                    {Object.keys(tableData[selectedTable][0]).map((key) => (
                      <TableHead key={key} className="whitespace-nowrap">
                        {key}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSelectedTableRows.slice(0, 100).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                          disabled={loading}
                          onClick={() => handleDeleteSingleRecord(selectedTable, row)}
                          title="Xóa bản ghi này trên Cloud"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                      {Object.values(row).map((value, cellIndex) => (
                        <TableCell key={cellIndex} className="max-w-xs truncate text-xs">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center h-32">
                <p className="text-gray-500">Không tìm thấy dữ liệu phù hợp</p>
              </div>
            )}
          </div>

          {filteredSelectedTableRows.length > 100 && (
            <div className="text-xs text-gray-500 text-center">
              Hiển thị 100/{filteredSelectedTableRows.length} bản ghi phù hợp
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
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              {confirmDialog.title}
            </DialogTitle>
            <DialogDescription>{confirmDialog.content}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                confirmDialog.action();
                setConfirmDialog((prev) => ({ ...prev, open: false }));
              }}
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingDataPage;
