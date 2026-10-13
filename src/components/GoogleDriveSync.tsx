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
  Trash2, 
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  User,
  Calendar,
  FileText
} from 'lucide-react';
import GoogleDriveUtils from '@/utils/googleDriveUtils';
import AuthUtils from '@/utils/authUtils';

interface GoogleDriveSyncProps {
  onSyncComplete?: (success: boolean, message: string) => void;
}

const GoogleDriveSync: React.FC<GoogleDriveSyncProps> = ({ onSyncComplete }) => {
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [backupFiles, setBackupFiles] = useState<any[]>([]);
  const [showBackupList, setShowBackupList] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    checkAuthStatus();
    loadBackupFiles();
    
    // Khởi động auto backup timer nếu đã enable
    const authInfo = GoogleDriveUtils.getAuthInfo();
    if (authInfo?.autoSyncEnabled) {
      GoogleDriveUtils.startAutoBackupTimer();
    }

    // Cleanup khi component unmount
    return () => {
      GoogleDriveUtils.stopAutoBackupTimer();
    };
  }, []);

  // Kiểm tra trạng thái đăng nhập
  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Checking Google Drive configuration...');
      
      // Validate configuration trước
      const configValidation = GoogleDriveUtils.validateConfiguration();
      if (!configValidation.isValid) {
        console.error('❌ Configuration validation failed:', configValidation);
        setMessage({ 
          type: 'error', 
          text: `Lỗi cấu hình: ${configValidation.errors.join(', ')}` 
        });
        return;
      }

      console.log('✅ Configuration validation passed');
      
      const initialized = await GoogleDriveUtils.initializeGoogleAPI();
      if (!initialized) {
        const initError = GoogleDriveUtils.getInitializationError();
        setMessage({ 
          type: 'error', 
          text: `Không thể khởi tạo Google API: ${initError || 'Unknown error'}` 
        });
        return;
      }

      // Thử khôi phục auth từ localStorage
      console.log('🔄 Checking for stored authentication...');
      const restored = await GoogleDriveUtils.restoreAuthFromStorage();
      
      if (restored) {
        console.log('✅ Authentication restored from storage');
        setSignedIn(true);
        const authInfo = GoogleDriveUtils.getAuthInfo();
        setUserInfo(authInfo?.user);
        setAutoSyncEnabled(authInfo?.autoSyncEnabled || false);
        
        // Khởi động auto backup nếu đã enable
        if (authInfo?.autoSyncEnabled) {
          GoogleDriveUtils.startAutoBackupTimer();
        }
      } else {
        console.log('ℹ️ No valid stored authentication found');
        setSignedIn(false);
        setUserInfo(null);
        setAutoSyncEnabled(false);
      }
    } catch (error) {
      console.error('❌ Error checking auth status:', error);
      setMessage({ 
        type: 'error', 
        text: `Lỗi kiểm tra trạng thái: ${(error as Error).message}` 
      });
    }
  };

  // Đăng nhập Google
  const handleSignIn = async () => {
    try {
      setLoading(true);
      setMessage({ type: 'info', text: 'Đang kết nối với Google Drive...' });
      
      console.log('🔑 Starting Google Drive sign in...');
      const result = await GoogleDriveUtils.signIn();
      
      console.log('📝 Sign in result:', result);
      
      if (result.success) {
        setSignedIn(true);
        setUserInfo(result.user);
        setMessage({ type: 'success', text: 'Đăng nhập Google Drive thành công!' });
        onSyncComplete?.(true, 'Đã kết nối Google Drive');
        
        // Load backup files sau khi đăng nhập thành công
        await loadBackupFiles();
      } else {
        console.error('❌ Sign in failed:', result.error);
        setMessage({ type: 'error', text: result.error || 'Đăng nhập thất bại' });
      }
    } catch (error) {
      console.error('❌ Sign in error:', error);
      setMessage({ type: 'error', text: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  // Đăng xuất
  const handleSignOut = async () => {
    try {
      setLoading(true);
      await GoogleDriveUtils.signOut();
      setSignedIn(false);
      setUserInfo(null);
      setAutoSyncEnabled(false);
      setBackupFiles([]);
      setMessage({ type: 'info', text: 'Đã đăng xuất Google Drive' });
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  // Backup thủ công
  const handleManualBackup = async () => {
    try {
      setLoading(true);
      const result = await AuthUtils.manualBackupToGoogleDrive();
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await loadBackupFiles(); // Reload danh sách
        onSyncComplete?.(true, result.message);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  // Tải danh sách backup
  const loadBackupFiles = async () => {
    if (!signedIn) {
      console.log('ℹ️ Not signed in, skipping backup files load');
      return;
    }
    
    try {
      console.log('📂 Loading backup files...');
      const result = await GoogleDriveUtils.listBackups();
      if (result.success) {
        console.log(`✅ Found ${result.files?.length || 0} backup files`);
        setBackupFiles(result.files || []);
      } else {
        console.error('❌ Failed to load backup files:', result.error);
        setMessage({ type: 'error', text: `Không thể tải danh sách backup: ${result.error}` });
      }
    } catch (error) {
      console.error('❌ Error loading backup files:', error);
      setMessage({ type: 'error', text: `Lỗi tải backup: ${(error as Error).message}` });
    }
  };

  // Khôi phục từ backup
  const handleRestore = async (fileId: string, fileName: string) => {
    try {
      setLoading(true);
      const result = await AuthUtils.restoreFromGoogleDrive(fileId);
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        onSyncComplete?.(true, `Đã khôi phục từ ${fileName}`);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  // Bật/tắt tự động sync
  const handleAutoSyncToggle = (enabled: boolean) => {
    GoogleDriveUtils.setAutoSync(enabled);
    setAutoSyncEnabled(enabled);
    
    if (enabled) {
      setMessage({ type: 'success', text: 'Đã bật tự động backup mỗi ngày' });
    } else {
      setMessage({ type: 'info', text: 'Đã tắt tự động backup' });
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  return (
    <div className="space-y-4">
      {/* Message Alert */}
      {message && (
        <Alert className={`border-l-4 ${
          message.type === 'success' ? 'border-l-green-500 bg-green-50' :
          message.type === 'error' ? 'border-l-red-500 bg-red-50' :
          'border-l-blue-500 bg-blue-50'
        }`}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Connection Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {signedIn ? (
                <Cloud className="h-5 w-5 text-blue-600" />
              ) : (
                <CloudOff className="h-5 w-5 text-gray-400" />
              )}
              <CardTitle>Google Drive Sync</CardTitle>
            </div>
            <Badge variant={signedIn ? "default" : "secondary"}>
              {signedIn ? "Đã kết nối" : "Chưa kết nối"}
            </Badge>
          </div>
          <CardDescription>
            Tự động đồng bộ dữ liệu lên Google Drive của bạn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!signedIn ? (
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                Kết nối với Google Drive để tự động backup dữ liệu mỗi ngày
              </p>
              <Button 
                onClick={handleSignIn} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Cloud className="h-4 w-4 mr-2" />
                {loading ? 'Đang kết nối...' : 'Kết nối Google Drive'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                {userInfo?.picture && (
                  <img 
                    src={userInfo.picture} 
                    alt="Avatar" 
                    className="h-10 w-10 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium">{userInfo?.name}</p>
                  <p className="text-sm text-gray-600">{userInfo?.email}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSignOut}
                  disabled={loading}
                >
                  Đăng xuất
                </Button>
              </div>

              {/* Auto Sync Setting */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Tự động backup</p>
                  <p className="text-sm text-gray-600">
                    Backup dữ liệu mỗi ngày
                    {autoSyncEnabled && (
                      <span className="ml-2 text-green-600">
                        • Đang hoạt động
                      </span>
                    )}
                  </p>
                </div>
                <Switch
                  checked={autoSyncEnabled}
                  onCheckedChange={handleAutoSyncToggle}
                  disabled={loading}
                />
              </div>

              {/* Last Sync Info */}
              {(() => {
                const authInfo = GoogleDriveUtils.getAuthInfo();
                const lastSync = authInfo?.lastSync;
                const shouldSync = GoogleDriveUtils.shouldAutoSync();
                
                return (
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="flex justify-between items-center">
                      <span>Lần backup cuối:</span>
                      <span className="font-medium">
                        {lastSync ? new Date(lastSync).toLocaleString('vi-VN') : 'Chưa có'}
                      </span>
                    </div>
                    {shouldSync && autoSyncEnabled && (
                      <div className="mt-1 text-orange-600">
                        ⏰ Cần backup (hơn 24 giờ)
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Manual Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={handleManualBackup} 
                  disabled={loading}
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Backup ngay
                </Button>
                <Button 
                  onClick={() => setShowBackupList(true)} 
                  disabled={loading}
                  variant="outline"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Xem backup ({backupFiles.length})
                </Button>
              </div>

              {/* Debug Actions */}
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  onClick={() => setShowDebugInfo(true)} 
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Debug Info
                </Button>
                <Button 
                  onClick={() => {
                    const validation = GoogleDriveUtils.validateConfiguration();
                    setMessage({ 
                      type: validation.isValid ? 'success' : 'error', 
                      text: validation.isValid ? 'Cấu hình hợp lệ' : `Lỗi: ${validation.errors.join(', ')}` 
                    });
                  }} 
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Test Config
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      setLoading(true);
                      await GoogleDriveUtils.forceReinitialize();
                      await checkAuthStatus();
                      setMessage({ type: 'success', text: 'Đã reinitialize thành công' });
                    } catch (error) {
                      setMessage({ type: 'error', text: `Lỗi reinitialize: ${(error as Error).message}` });
                    } finally {
                      setLoading(false);
                    }
                  }} 
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reinit
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup List Dialog */}
      <Dialog open={showBackupList} onOpenChange={setShowBackupList}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Danh sách Backup trên Google Drive
            </DialogTitle>
            <DialogDescription>
              {backupFiles.length} file backup được tìm thấy
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-auto max-h-[60vh]">
            {backupFiles.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên file</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead>Kích thước</TableHead>
                    <TableHead>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backupFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">{file.name}</TableCell>
                      <TableCell>{formatDate(file.modifiedTime)}</TableCell>
                      <TableCell>{formatFileSize(file.size)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(file.id, file.name)}
                          disabled={loading}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Khôi phục
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center h-32">
                <p className="text-gray-500">Chưa có file backup nào</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowBackupList(false)}
            >
              Đóng
            </Button>
            <Button 
              onClick={loadBackupFiles}
                 disabled={loading}
           >
             <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
             Làm mới
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>

     {/* Debug Info Dialog */}
     <Dialog open={showDebugInfo} onOpenChange={setShowDebugInfo}>
       <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <AlertTriangle className="h-5 w-5" />
             Debug Information
           </DialogTitle>
           <DialogDescription>
             Chi tiết cấu hình và trạng thái Google Drive
           </DialogDescription>
         </DialogHeader>
         
         <div className="overflow-auto max-h-[60vh] space-y-4">
           {/* Configuration Status */}
           <div className="p-4 bg-gray-50 rounded-lg">
             <h3 className="font-semibold mb-2">Configuration Status</h3>
             <pre className="text-sm overflow-x-auto">
               {JSON.stringify(GoogleDriveUtils.validateConfiguration(), null, 2)}
             </pre>
           </div>
           
           {/* Debug Info */}
           <div className="p-4 bg-blue-50 rounded-lg">
             <h3 className="font-semibold mb-2">Debug Info</h3>
             <pre className="text-sm overflow-x-auto">
               {JSON.stringify(GoogleDriveUtils.getDebugInfo(), null, 2)}
             </pre>
           </div>
           
           {/* Initialization Error */}
           {GoogleDriveUtils.getInitializationError() && (
             <div className="p-4 bg-red-50 rounded-lg">
               <h3 className="font-semibold mb-2 text-red-700">Initialization Error</h3>
               <p className="text-sm text-red-600">
                 {GoogleDriveUtils.getInitializationError()}
               </p>
             </div>
           )}
         </div>

         <DialogFooter>
           <Button 
             variant="outline" 
             onClick={() => setShowDebugInfo(false)}
           >
             Đóng
           </Button>
           <Button 
             onClick={async () => {
               const testResult = await GoogleDriveUtils.testConnection();
               setMessage({ 
                 type: testResult.success ? 'success' : 'error', 
                 text: testResult.message 
               });
             }}
             disabled={loading}
           >
             <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
             Test Connection
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   </div>
 );
};

export default GoogleDriveSync;