'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Download,
  Upload,
  Activity
} from 'lucide-react';
import GoogleDriveUtils from '@/utils/googleDriveUtils';
import { toast } from 'react-hot-toast';

interface SyncStatusCardProps {
  onSyncComplete?: (success: boolean) => void;
}

interface SyncStatus {
  connected: boolean;
  autoBackup: boolean;
  lastSync: string | null;
  needsSync: boolean;
  syncProgress: number;
  isSyncing: boolean;
  lastBackupSize: string;
  totalBackups: number;
}

const SyncStatusCard: React.FC<SyncStatusCardProps> = ({ onSyncComplete }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    connected: false,
    autoBackup: false,
    lastSync: null,
    needsSync: false,
    syncProgress: 0,
    isSyncing: false,
    lastBackupSize: '0 KB',
    totalBackups: 0
  });

  useEffect(() => {
    updateSyncStatus();
    const interval = setInterval(updateSyncStatus, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const updateSyncStatus = async () => {
    try {
      const authInfo = GoogleDriveUtils.getAuthInfo();
      const isConnected = GoogleDriveUtils.isSignedIn();
      const needsSync = GoogleDriveUtils.shouldAutoSync();
      
      // Get backup files info
      let totalBackups = 0;
      let lastBackupSize = '0 KB';
      
      if (isConnected) {
        const backupsResult = await GoogleDriveUtils.listBackups();
        if (backupsResult.success && backupsResult.files) {
          totalBackups = backupsResult.files.length;
          if (backupsResult.files.length > 0) {
            const latestBackup = backupsResult.files[0];
            lastBackupSize = formatFileSize(parseInt(latestBackup.size || '0'));
          }
        }
      }

      setSyncStatus({
        connected: isConnected,
        autoBackup: authInfo?.autoSyncEnabled || false,
        lastSync: authInfo?.lastSync || null,
        needsSync: needsSync && authInfo?.autoSyncEnabled,
        syncProgress: 0,
        isSyncing: false,
        lastBackupSize,
        totalBackups
      });
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Vừa xong';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} giờ trước`;
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true, syncProgress: 0 }));
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setSyncStatus(prev => ({
          ...prev,
          syncProgress: Math.min(prev.syncProgress + 10, 90)
        }));
      }, 200);

      const success = await GoogleDriveUtils.syncLatestData();
      
      clearInterval(progressInterval);
      
      setSyncStatus(prev => ({ 
        ...prev, 
        isSyncing: false, 
        syncProgress: success ? 100 : 0 
      }));

      if (success) {
        toast.success('Đồng bộ dữ liệu thành công!');
        onSyncComplete?.(true);
        updateSyncStatus(); // Refresh status
      } else {
        toast.error('Không thể đồng bộ dữ liệu');
        onSyncComplete?.(false);
      }
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, isSyncing: false, syncProgress: 0 }));
      toast.error('Có lỗi xảy ra khi đồng bộ');
      onSyncComplete?.(false);
    }
  };

  const getStatusColor = () => {
    if (!syncStatus.connected) return 'text-gray-500';
    if (syncStatus.needsSync) return 'text-orange-500';
    if (syncStatus.autoBackup) return 'text-green-500';
    return 'text-blue-500';
  };

  const getStatusIcon = () => {
    if (!syncStatus.connected) return <CloudOff className="h-4 w-4" />;
    if (syncStatus.isSyncing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (syncStatus.needsSync) return <AlertTriangle className="h-4 w-4" />;
    if (syncStatus.autoBackup) return <CheckCircle2 className="h-4 w-4" />;
    return <Cloud className="h-4 w-4" />;
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Trạng Thái Đồng Bộ
        </CardTitle>
        <CardDescription>
          Theo dõi trạng thái kết nối và đồng bộ với Google Drive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <p className="font-medium text-sm">Kết nối Google Drive</p>
              <p className="text-xs text-gray-500">
                {syncStatus.connected ? 'Đã kết nối và sẵn sàng' : 'Chưa kết nối'}
              </p>
            </div>
          </div>
          <Badge variant={syncStatus.connected ? "default" : "secondary"}>
            {syncStatus.connected ? 'Hoạt động' : 'Ngắt kết nối'}
          </Badge>
        </div>

        {/* Auto Backup Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
          <div className="flex items-center gap-3">
            <RefreshCw className={`h-4 w-4 ${syncStatus.autoBackup ? 'text-green-500' : 'text-gray-400'}`} />
            <div>
              <p className="font-medium text-sm">Tự động đồng bộ</p>
              <p className="text-xs text-gray-500">
                {syncStatus.autoBackup ? 'Đang hoạt động' : 'Đã tắt'}
              </p>
            </div>
          </div>
          <Badge variant={syncStatus.autoBackup ? "default" : "secondary"}>
            {syncStatus.autoBackup ? 'Đã bật' : 'Đã tắt'}
          </Badge>
        </div>

        {/* Last Sync Info */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-blue-500" />
            <div>
              <p className="font-medium text-sm">Lần đồng bộ cuối</p>
              <p className="text-xs text-gray-500">
                {syncStatus.lastSync ? formatDate(syncStatus.lastSync) : 'Chưa có'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">{syncStatus.lastBackupSize}</p>
            <p className="text-xs text-gray-500">{syncStatus.totalBackups} backup</p>
          </div>
        </div>

        {/* Sync Progress */}
        {syncStatus.isSyncing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Đang đồng bộ...</span>
              <span>{syncStatus.syncProgress}%</span>
            </div>
            <Progress value={syncStatus.syncProgress} className="h-2" />
          </div>
        )}

        {/* Warning for needs sync */}
        {syncStatus.needsSync && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 border border-orange-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-700">Cần đồng bộ</span>
            </div>
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              Cần backup
            </Badge>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleManualSync}
            disabled={!syncStatus.connected || syncStatus.isSyncing}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            {syncStatus.isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
          </Button>
          
          <Button
            onClick={updateSyncStatus}
            disabled={syncStatus.isSyncing}
            variant="outline"
            size="icon"
          >
            <RefreshCw className={`h-4 w-4 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SyncStatusCard; 