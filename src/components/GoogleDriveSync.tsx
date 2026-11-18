// components/GoogleDriveSync.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Cloud,
  CloudOff,
  Upload,
  Download,
  RefreshCw,
  User,
  FileText,
  KeyRound,
  ShieldCheck,
  Copy,
  Check,
  DatabaseBackup,
} from 'lucide-react';
import GoogleDriveUtils, { GoogleDriveFile } from '@/utils/googleDriveUtils';
import { GOOGLE_DRIVE_CONFIG } from '@/config/googleDrive';
import AuthUtils from '@/utils/authUtils';
import { toast } from 'react-hot-toast';

interface GoogleDriveSyncProps {
  onSyncComplete?: (success: boolean, message: string) => void;
}

export const GoogleDriveSync: React.FC<GoogleDriveSyncProps> = ({ onSyncComplete }) => {
  const [loading, setLoading] = useState(false);
  const [restoringSample, setRestoringSample] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [backupFiles, setBackupFiles] = useState<GoogleDriveFile[]>([]);
  const [showBackupList, setShowBackupList] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customClientId, setCustomClientId] = useState('');
  const [currentOrigin, setCurrentOrigin] = useState('https://h2milktea.vercel.app');
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCustomClientId(localStorage.getItem('h2_custom_google_client_id') || '');
      setCurrentOrigin(window.location.origin);
    }
    checkAuthStatus();
    loadBackupFiles();

    const authInfo = GoogleDriveUtils.getAuthInfo();
    if (authInfo?.autoSyncEnabled) {
      GoogleDriveUtils.startAutoBackupTimer();
    }

    return () => {
      GoogleDriveUtils.stopAutoBackupTimer();
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const configValidation = GoogleDriveUtils.validateConfiguration();
      if (!configValidation.isValid) {
        return;
      }

      await GoogleDriveUtils.initializeGoogleAPI();
      const restored = await GoogleDriveUtils.restoreAuthFromStorage();

      if (restored) {
        setSignedIn(true);
        const authInfo = GoogleDriveUtils.getAuthInfo();
        setUserInfo({
          email: authInfo?.userEmail,
          name: authInfo?.userName,
          picture: authInfo?.userPicture,
        });
        setAutoSyncEnabled(authInfo?.autoSyncEnabled || false);
      } else {
        setSignedIn(false);
        setUserInfo(null);
      }
    } catch (err: any) {
      console.error('Check auth status error:', err);
    }
  };

  const handleCopyOrigin = async (originValue: string = currentOrigin) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(originValue);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = originValue;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedOrigin(true);
      toast.success(`Đã sao chép Authorized JavaScript origin: ${originValue}`);
      setTimeout(() => setCopiedOrigin(false), 2000);
    } catch {
      toast.error('Không thể tự động sao chép. Vui lòng copy thủ công!');
    }
  };

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const configValidation = GoogleDriveUtils.validateConfiguration();
      if (!configValidation.isValid) {
        setShowConfigModal(true);
        setMessage({
          type: 'error',
          text: 'Vui lòng nhập Google Client ID hợp lệ trước khi kết nối Google Drive!',
        });
        setLoading(false);
        return;
      }

      const result = await GoogleDriveUtils.signIn();
      if (result.success) {
        setSignedIn(true);
        setUserInfo(result.user);
        setAutoSyncEnabled(true);
        setMessage({ type: 'success', text: 'Đã kết nối tài khoản Google Drive thành công!' });
        toast.success('Kết nối Google Drive thành công!');
        await loadBackupFiles();
      } else {
        setMessage({ type: 'error', text: result.error || 'Đăng nhập Google thất bại' });
        toast.error(result.error || 'Đăng nhập Google thất bại');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await GoogleDriveUtils.signOut();
      setSignedIn(false);
      setUserInfo(null);
      setAutoSyncEnabled(false);
      setBackupFiles([]);
      setMessage({ type: 'info', text: 'Đã ngắt kết nối với Google Drive' });
      toast.success('Đã đăng xuất Google Drive');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleManualBackup = async () => {
    try {
      setLoading(true);
      setMessage({ type: 'info', text: 'Đang trích xuất toàn bộ dữ liệu Supabase...' });

      // 1. Gọi server API để lấy full dữ liệu hệ thống
      const exportRes = await fetch('/api/backup/export');
      const exportData = await exportRes.json();

      if (!exportRes.ok || !exportData.success || !exportData.backup) {
        throw new Error(exportData.message || 'Không thể trích xuất dữ liệu hệ thống');
      }

      setMessage({ type: 'info', text: 'Đang tải file sao lưu lên Google Drive...' });

      // 2. Upload file backup lên Google Drive
      const uploadResult = await GoogleDriveUtils.uploadBackup(exportData.backup);
      if (uploadResult.success) {
        await GoogleDriveUtils.deleteOldBackups(10);
        setMessage({
          type: 'success',
          text: `Sao lưu thành công lên Google Drive! (${Object.entries(exportData.backup.summary || {})
            .map(([tbl, count]) => `${tbl}: ${count}`)
            .join(', ')})`,
        });
        toast.success('Sao lưu dữ liệu lên Google Drive thành công!');
        onSyncComplete?.(true, 'Sao lưu thành công');
        await loadBackupFiles();
      } else {
        throw new Error(uploadResult.error || 'Lỗi khi đẩy file lên Drive');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
      toast.error(error.message);
      onSyncComplete?.(false, error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreSampleToCloud = async () => {
    try {
      setRestoringSample(true);
      setMessage({ type: 'info', text: 'Đang khởi tạo và đồng bộ dữ liệu mẫu 60 ngày từ kho backup JSON...' });

      const seedResult = AuthUtils.seedSynchronizedTestDatabase();

      // Thu thập các bảng cốt lõi đã chuẩn hóa để đẩy lên Cloud DB qua /api/backup/restore
      const cloudTables = ['DMHH', 'DSBAN', 'DSNV', 'HOADON', 'HOADONDETAIL'];
      const payloadTables: Record<string, any[]> = {};

      await Promise.all(
        cloudTables.map(async (tableName) => {
          try {
            const rows = await AuthUtils.apiRequest(tableName, 'getall', {});
            if (Array.isArray(rows) && rows.length > 0) {
              payloadTables[tableName] = rows;
            }
          } catch {
            // Bỏ qua bảng nếu lỗi tạm thời
          }
        })
      );

      let cloudRestored = false;
      try {
        const restoreRes = await fetch('/api/backup/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: payloadTables }),
        });
        const restoreJson = await restoreRes.json().catch(() => ({}));
        cloudRestored = Boolean(restoreRes.ok && restoreJson?.success);
      } catch {
        cloudRestored = false;
      }

      const finalMsg = cloudRestored
        ? `Khôi phục dữ liệu mẫu gốc lên Cloud DB thành công! (${seedResult.invoices} hóa đơn, ${seedResult.details} chi tiết món)`
        : `${seedResult.message} (Đã lưu đồng bộ dữ liệu cục bộ; sẵn sàng khi kết nối Cloud DB).`;

      setMessage({ type: 'success', text: finalMsg });
      toast.success(cloudRestored ? 'Đã khôi phục dữ liệu mẫu gốc lên Cloud DB!' : 'Đã đồng bộ dữ liệu mẫu 60 ngày!');
      onSyncComplete?.(true, finalMsg);
    } catch (error: any) {
      const errMsg = error?.message || 'Lỗi khi khôi phục dữ liệu mẫu gốc';
      setMessage({ type: 'error', text: errMsg });
      toast.error(errMsg);
      onSyncComplete?.(false, errMsg);
    } finally {
      setRestoringSample(false);
    }
  };

  const loadBackupFiles = async () => {
    if (!GoogleDriveUtils.isSignedIn()) return;
    try {
      const result = await GoogleDriveUtils.listBackups();
      if (result.success && result.files) {
        setBackupFiles(result.files);
      }
    } catch (error) {
      console.error('Error loading backup files:', error);
    }
  };

  const handleRestore = async (fileId: string, fileName: string) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn khôi phục dữ liệu từ bản sao lưu:\n"${fileName}"?\nDữ liệu hiện tại trên hệ thống sẽ được hợp nhất cập nhật từ file này.`
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      setMessage({ type: 'info', text: `Đang tải ${fileName} từ Google Drive...` });

      const downloadResult = await GoogleDriveUtils.downloadBackup(fileId);
      if (!downloadResult.success || !downloadResult.data) {
        throw new Error(downloadResult.error || 'Không thể tải file backup');
      }

      setMessage({ type: 'info', text: 'Đang khôi phục dữ liệu vào cơ sở dữ liệu Supabase...' });

      const restoreRes = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(downloadResult.data),
      });

      const restoreResult = await restoreRes.json();
      if (restoreResult.success) {
        setMessage({
          type: 'success',
          text: `Khôi phục thành công từ ${fileName}! Vui lòng làm mới trang để thấy dữ liệu mới nhất.`,
        });
        toast.success('Khôi phục dữ liệu thành công!');
        onSyncComplete?.(true, `Khôi phục từ ${fileName}`);
      } else {
        throw new Error(restoreResult.message || 'Lỗi khôi phục vào Supabase');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSyncToggle = (enabled: boolean) => {
    GoogleDriveUtils.setAutoSync(enabled);
    setAutoSyncEnabled(enabled);
    if (enabled) {
      setMessage({ type: 'success', text: 'Đã bật tự động sao lưu dữ liệu mỗi 24 giờ' });
      toast.success('Đã kích hoạt tự động sao lưu');
    } else {
      setMessage({ type: 'info', text: 'Đã tắt chế độ tự động sao lưu' });
    }
  };

  const handleSaveCustomClientId = async () => {
    if (!customClientId.trim()) {
      GOOGLE_DRIVE_CONFIG.clearCustomClientId();
      toast.success('Đã xóa Client ID tùy chỉnh');
    } else {
      GOOGLE_DRIVE_CONFIG.setCustomClientId(customClientId);
      toast.success('Đã lưu Google Client ID mới!');
    }
    GoogleDriveUtils.resetClient();
    setShowConfigModal(false);
    await checkAuthStatus();
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return 'N/A';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return 'N/A';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <Card className="w-full border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div
                className={`p-2.5 rounded-xl ${
                  signedIn ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {signedIn ? <Cloud className="h-6 w-6" /> : <CloudOff className="h-6 w-6" />}
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-gray-900">
                  Sao Lưu & Đồng Bộ Google Drive
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Lưu trữ tự động dữ liệu nhà hàng lên đám mây Google Drive an toàn
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfigModal(true)}
                className="text-xs gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                Cấu hình Client ID
              </Button>
              <Badge
                variant={signedIn ? 'default' : 'secondary'}
                className={signedIn ? 'bg-emerald-600 hover:bg-emerald-600' : ''}
              >
                {signedIn ? 'Đã liên kết' : 'Chưa liên kết'}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {message && (
            <Alert
              className={`text-xs ${
                message.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : message.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-blue-200 bg-blue-50 text-blue-800'
              }`}
            >
              <AlertDescription className="flex items-center justify-between">
                <span>{message.text}</span>
                <button
                  type="button"
                  onClick={() => setMessage(null)}
                  className="font-bold ml-2 text-gray-500 hover:text-gray-800"
                >
                  ✕
                </button>
              </AlertDescription>
            </Alert>
          )}

          {/* User Info Bar */}
          {signedIn && userInfo && (
            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
              <div className="flex items-center space-x-3">
                {userInfo.picture ? (
                  <img
                    src={userInfo.picture}
                    alt={userInfo.name || 'User'}
                    className="w-8 h-8 rounded-full border border-gray-300"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-900">{userInfo.name || 'Tài khoản Google'}</div>
                  <div className="text-gray-500 text-[11px]">{userInfo.email}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                disabled={loading}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Đăng xuất
              </Button>
            </div>
          )}

          {/* Hộp hướng dẫn Authorized JavaScript origin 1-chạm */}
          <div className="p-3.5 bg-amber-50/90 rounded-xl border border-amber-200 text-amber-950 text-xs space-y-2">
            <div className="font-semibold flex items-center gap-1.5 text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              Hướng dẫn liên kết nhanh Google OAuth 2.0
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Trên <strong>Google Cloud Console</strong> → <em>Credentials → OAuth 2.0 Client IDs</em>, dán địa chỉ <strong>Authorized JavaScript origin</strong> hiện tại bên dưới:
            </p>
            <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-amber-300/80">
              <code className="font-mono text-[11px] font-semibold text-slate-800 truncate">
                {currentOrigin}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleCopyOrigin(currentOrigin)}
                className="h-7 px-2.5 text-[11px] font-semibold border-amber-300 bg-amber-100/70 hover:bg-amber-200 text-amber-900 shrink-0 gap-1"
              >
                {copiedOrigin ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedOrigin ? 'Đã copy' : 'Copy Origin'}
              </Button>
            </div>
          </div>

          {/* Actions & Auto-sync */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3.5 border border-gray-200 rounded-xl bg-white">
              <div>
                <div className="text-sm font-semibold text-gray-900">Tự động sao lưu</div>
                <div className="text-xs text-gray-500">Tự động lưu bản backup mới mỗi 24h</div>
              </div>
              <Switch
                checked={autoSyncEnabled}
                onCheckedChange={handleAutoSyncToggle}
                disabled={!signedIn || loading}
              />
            </div>

            <div className="flex items-center gap-2">
              {!signedIn ? (
                <Button
                  onClick={handleSignIn}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs gap-2 py-5"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Cloud className="h-4 w-4" />
                  )}
                  Đăng nhập & Kết nối Google Drive
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleManualBackup}
                    disabled={loading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Sao lưu ngay
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowBackupList(true);
                      loadBackupFiles();
                    }}
                    disabled={loading}
                    className="flex-1 text-xs gap-1.5"
                  >
                    <Download className="h-4 w-4 text-indigo-600" />
                    Xem bản sao lưu ({backupFiles.length})
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Khôi phục dữ liệu mẫu gốc không phụ thuộc Google Drive */}
          <div className="pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={handleRestoreSampleToCloud}
              disabled={restoringSample || loading}
              className="w-full border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 font-semibold text-xs py-5 gap-2"
            >
              {restoringSample ? (
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-700" />
              ) : (
                <DatabaseBackup className="h-4 w-4 text-emerald-700" />
              )}
              📦 Khôi phục Dữ liệu Mẫu Gốc lên Cloud DB (Từ Kho Backup JSON)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup Files Modal */}
      <Dialog open={showBackupList} onOpenChange={setShowBackupList}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Danh sách bản sao lưu trên Google Drive
            </DialogTitle>
            <DialogDescription className="text-xs">
              Thư mục lưu trữ: <strong>H2MilkTea_Backups</strong> (giữ lại tối đa 10 bản gần nhất)
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2">
            {backupFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                Chưa có bản sao lưu nào trên Google Drive. Hãy nhấn "Sao lưu ngay" để tạo bản đầu tiên!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên file</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Dung lượng</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backupFiles.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs font-medium text-gray-900">
                        {f.name}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {new Date(f.createdTime).toLocaleString('vi-VN')}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {formatFileSize(f.size)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(f.id, f.name)}
                          disabled={loading}
                          className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        >
                          Khôi phục
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBackupList(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Google Client ID Modal */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="max-w-md bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600">
              <KeyRound className="w-5 h-5" />
              Cấu hình Google OAuth Client ID
            </DialogTitle>
            <DialogDescription className="text-xs">
              Nhập Web Client ID tạo từ <strong>Google Cloud Console</strong> để liên kết ứng dụng với tài khoản Google.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Google Client ID (*.apps.googleusercontent.com)
              </label>
              <input
                type="text"
                value={customClientId}
                onChange={(e) => setCustomClientId(e.target.value)}
                placeholder="vd: 123456789-abcdef.apps.googleusercontent.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-2">
              <div className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                Lưu ý cấu hình Google Cloud Console:
              </div>
              <p>Thêm địa chỉ sau vào mục <strong>Authorized JavaScript origins</strong>:</p>
              <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-amber-300">
                <span className="font-mono text-[11px] truncate">{currentOrigin}</span>
                <button
                  type="button"
                  onClick={() => handleCopyOrigin(currentOrigin)}
                  className="px-2 py-0.5 bg-amber-600 text-white rounded font-sans text-[10px] font-bold hover:bg-amber-700 shrink-0"
                >
                  Copy Origin
                </button>
              </div>
              {currentOrigin !== 'https://h2milktea.vercel.app' && (
                <div className="flex items-center justify-between gap-2 font-mono text-[11px] pt-1">
                  <span>https://h2milktea.vercel.app</span>
                  <button
                    type="button"
                    onClick={() => handleCopyOrigin('https://h2milktea.vercel.app')}
                    className="px-2 py-0.5 bg-amber-600 text-white rounded font-sans text-[10px] font-bold hover:bg-amber-700 shrink-0"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowConfigModal(false)}>
              Hủy
            </Button>
            <Button size="sm" onClick={handleSaveCustomClientId} className="bg-indigo-600 text-white hover:bg-indigo-700">
              Lưu cấu hình
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GoogleDriveSync;
