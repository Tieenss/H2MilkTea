'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Monitor,
  Smartphone,
  Tablet,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  RefreshCw,
  Clock,
  Globe,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Search,
  Loader2,
  Laptop,
  History,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { useFeatureFlags } from '@/lib/settings/useFeatureFlags';

export interface SessionHistoryRecord {
  sessionId: string;
  userId: string;
  username?: string;
  deviceName: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  userAgent: string;
  ipAddress: string;
  loginAt: number;
  lastActiveAt: number;
  status: 'active' | 'logged_out' | 'revoked_by_new_login' | 'revoked_by_admin';
  revokedAt?: number;
  revokedReason?: string;
}

export interface AccountSessionSummary {
  userId: string;
  email: string;
  username: string;
  fullName: string;
  role: string;
  activeSessionsCount: number;
  activeDevice: string | null;
  lastLoginAt: number | null;
  sessionHistory: SessionHistoryRecord[];
}

interface SessionManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUsername?: string | null;
  employees?: Array<{
    username: string;
    'Họ và Tên'?: string;
    'Phân quyền'?: string;
    Email?: string;
  }>;
  isAdmin?: boolean;
}

function formatDateTimeVN(ts?: number | null): string {
  if (!ts) return 'Chưa ghi nhận';
  try {
    return new Date(ts).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return 'Không xác định';
  }
}

export const SessionManagerModal: React.FC<SessionManagerModalProps> = ({
  open,
  onOpenChange,
  initialUsername = null,
  employees = [],
  isAdmin = true,
}) => {
  const { config, updateConfig, isSaving: isSavingFlag } = useFeatureFlags();
  const [accounts, setAccounts] = useState<AccountSessionSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedUsername, setSelectedUsername] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [revokingKey, setRevokingKey] = useState<string | null>(null);
  const [currentBrowserSessionId, setCurrentBrowserSessionId] = useState<string | null>(null);

  const enforceSingleDevice = config.flags.enforce_single_device_session !== false;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentBrowserSessionId(window.localStorage.getItem('h2_session_id'));
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setSelectedUsername(initialUsername ? initialUsername : 'ALL');
    }
  }, [open, initialUsername]);

  const fetchSessionAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/session?action=list', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data?.success && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
      } else {
        toast.error(data?.error || 'Không thể tải danh sách phiên đăng nhập');
      }
    } catch (err) {
      console.error('Lỗi tải lịch sử phiên đăng nhập:', err);
      toast.error('Lỗi kết nối khi tải lịch sử thiết bị đăng nhập');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void fetchSessionAccounts();
    }
  }, [open, fetchSessionAccounts]);

  // Kết hợp thông tin từ danh sách nhân viên DSNV và tài khoản Supabase Auth
  const mergedAccounts = useMemo<AccountSessionSummary[]>(() => {
    const map = new Map<string, AccountSessionSummary>();

    for (const acc of accounts) {
      const key = acc.username.toLowerCase().trim();
      map.set(key, { ...acc });
    }

    for (const emp of employees) {
      if (!emp.username) continue;
      const key = emp.username.toLowerCase().trim();
      const existing = map.get(key);
      if (existing) {
        existing.fullName = emp['Họ và Tên'] || existing.fullName || emp.username;
        existing.role = emp['Phân quyền'] || existing.role || 'Nhân viên';
      } else {
        map.set(key, {
          userId: '',
          email: emp.Email || `${emp.username}@h2.com`,
          username: emp.username,
          fullName: emp['Họ và Tên'] || emp.username,
          role: emp['Phân quyền'] || 'Nhân viên',
          activeSessionsCount: 0,
          activeDevice: null,
          lastLoginAt: null,
          sessionHistory: [],
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.activeSessionsCount !== a.activeSessionsCount) {
        return b.activeSessionsCount - a.activeSessionsCount;
      }
      return (b.lastLoginAt || 0) - (a.lastLoginAt || 0);
    });
  }, [accounts, employees]);

  const filteredSidebarAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mergedAccounts;
    return mergedAccounts.filter(
      (acc) =>
        acc.username.toLowerCase().includes(q) ||
        acc.fullName.toLowerCase().includes(q) ||
        acc.role.toLowerCase().includes(q)
    );
  }, [mergedAccounts, searchQuery]);

  const displayedAccounts = useMemo(() => {
    if (selectedUsername === 'ALL') {
      return filteredSidebarAccounts;
    }
    return mergedAccounts.filter(
      (acc) => acc.username.toLowerCase() === selectedUsername.toLowerCase()
    );
  }, [selectedUsername, filteredSidebarAccounts, mergedAccounts]);

  const totalActiveSessions = useMemo(
    () => mergedAccounts.reduce((sum, acc) => sum + acc.activeSessionsCount, 0),
    [mergedAccounts]
  );

  const handleToggleSingleDeviceMode = async (checked: boolean) => {
    if (!isAdmin) {
      toast.error('Chỉ Quản trị viên (Admin) mới có quyền thay đổi chế độ bảo mật thiết bị.');
      return;
    }
    const toastId = toast.loading('Đang cập nhật chế độ giới hạn thiết bị đăng nhập...');
    const nextConfig = {
      ...config,
      flags: {
        ...config.flags,
        enforce_single_device_session: checked,
      },
    };
    const res = await updateConfig(nextConfig);
    if (res.success) {
      toast.success(
        checked
          ? 'Đã BẬT giới hạn 1 thiết bị: Khi đăng nhập máy mới sẽ tự động đăng xuất máy cũ!'
          : 'Đã TẮT giới hạn 1 thiết bị: Cho phép 1 tài khoản đăng nhập trên nhiều máy cùng lúc!',
        { id: toastId, duration: 4000 }
      );
    } else {
      toast.error(res.error || 'Lỗi khi lưu cài đặt lên máy chủ', { id: toastId });
    }
  };

  const handleRevokeSession = async (
    account: AccountSessionSummary,
    targetSessionId?: string,
    revokeAll = false
  ) => {
    if (!isAdmin) {
      toast.error('Chỉ Quản trị viên (Admin) mới được phép đăng xuất thiết bị từ xa.');
      return;
    }

    const actionKey = revokeAll
      ? `all_${account.username}`
      : `sess_${targetSessionId}`;
    setRevokingKey(actionKey);
    const toastId = toast.loading(
      revokeAll
        ? `Đang đăng xuất tất cả thiết bị của @${account.username}...`
        : `Đang đăng xuất thiết bị khỏi tài khoản @${account.username}...`
    );

    try {
      const res = await fetch('/api/auth/session', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: account.userId || undefined,
          username: account.username,
          targetSessionId,
          revokeAll,
          revokedByAdmin: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        toast.error(data?.error || 'Không thể đăng xuất thiết bị này', { id: toastId });
        return;
      }

      toast.success(
        revokeAll
          ? `Đã đăng xuất toàn bộ thiết bị của @${account.username}!`
          : `Đã đăng xuất thiết bị thành công!`,
        { id: toastId }
      );

      await fetchSessionAccounts();
    } catch (err) {
      console.error('Lỗi khi thu hồi phiên:', err);
      toast.error('Lỗi kết nối máy chủ khi đăng xuất thiết bị', { id: toastId });
    } finally {
      setRevokingKey(null);
    }
  };

  const renderDeviceIcon = (deviceType?: 'Desktop' | 'Mobile' | 'Tablet') => {
    if (deviceType === 'Mobile') return <Smartphone className="h-5 w-5 text-indigo-600" />;
    if (deviceType === 'Tablet') return <Tablet className="h-5 w-5 text-purple-600" />;
    return <Monitor className="h-5 w-5 text-blue-600" />;
  };

  const renderStatusBadge = (status: SessionHistoryRecord['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 flex items-center gap-1 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Đang đăng nhập (Online)
          </Badge>
        );
      case 'logged_out':
        return (
          <Badge
            variant="outline"
            className="bg-slate-100 text-slate-700 border-slate-300 flex items-center gap-1 text-xs"
          >
            <CheckCircle2 className="h-3 w-3 text-slate-500" />
            Đã tự đăng xuất
          </Badge>
        );
      case 'revoked_by_new_login':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1 text-xs"
          >
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            Bị đăng xuất do đăng nhập máy khác
          </Badge>
        );
      case 'revoked_by_admin':
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-800 border-rose-300 flex items-center gap-1 text-xs"
          >
            <XCircle className="h-3 w-3 text-rose-600" />
            Bị Admin đăng xuất thủ công
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-white">
                <Laptop className="h-5 w-5 text-emerald-400" />
                Quản Lý Phiên Đăng Nhập & Lịch Sử Thiết Bị
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-slate-300 mt-1">
                Theo dõi các thiết bị đã và đang đăng nhập vào hệ thống POS, bật/tắt giới hạn 1 máy và đăng xuất từ xa.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 px-2.5 py-1 text-xs">
                Đang online: {totalActiveSessions} thiết bị
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchSessionAccounts}
                disabled={loading}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-8 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Thanh Công tắc Admin bật/tắt Tự động đăng xuất máy khác */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                enforceSingleDevice
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {enforceSingleDevice ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <ShieldAlert className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm text-slate-900">
                  Tự động đăng xuất thiết bị cũ khi đăng nhập trên máy mới
                </span>
                <Badge
                  variant="outline"
                  className={
                    enforceSingleDevice
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 text-xs'
                      : 'bg-amber-50 text-amber-800 border-amber-300 text-xs'
                  }
                >
                  {enforceSingleDevice
                    ? 'Đang BẬT (Giới hạn 1 thiết bị / tài khoản)'
                    : 'Đang TẮT (Cho phép đăng nhập nhiều máy)'}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {enforceSingleDevice
                  ? 'Khi một tài khoản đăng nhập ở máy mới, các máy cũ đang mở tài khoản đó sẽ tự động bị đăng xuất ngay lập tức.'
                  : 'Nhiều thiết bị có thể đăng nhập và sử dụng cùng một tài khoản đồng thời. Admin vẫn có thể đăng xuất thủ công từng máy bên dưới.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <span className="text-xs font-medium text-slate-700">
              {enforceSingleDevice ? 'Bật' : 'Tắt'}
            </span>
            <Switch
              checked={enforceSingleDevice}
              onCheckedChange={handleToggleSingleDeviceMode}
              disabled={!isAdmin || isSavingFlag}
              aria-label="Bật hoặc tắt giới hạn 1 thiết bị"
            />
          </div>
        </div>

        {/* Nội dung chính: Cột trái chọn nhân viên + Cột phải danh sách phiên & lịch sử thiết bị */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Cột trái: Danh sách tài khoản */}
          <div className="md:col-span-4 border-r border-slate-200 flex flex-col bg-white overflow-hidden">
            <div className="p-3 border-b border-slate-100 space-y-2">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tài khoản, tên nhân viên..."
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => setSelectedUsername('ALL')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                  selectedUsername === 'ALL'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Xem tất cả tài khoản ({mergedAccounts.length})</span>
                <Badge
                  variant="secondary"
                  className={
                    selectedUsername === 'ALL'
                      ? 'bg-white/20 text-white text-[11px]'
                      : 'bg-white text-slate-700 text-[11px]'
                  }
                >
                  {totalActiveSessions} online
                </Badge>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[300px] md:max-h-none">
              {filteredSidebarAccounts.map((acc) => {
                const isSelected =
                  selectedUsername.toLowerCase() === acc.username.toLowerCase();
                return (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => setSelectedUsername(acc.username)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-400 shadow-sm'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs sm:text-sm text-slate-900 truncate flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{acc.fullName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        @{acc.username} • {acc.role}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {acc.activeSessionsCount > 0 ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] px-1.5 py-0">
                          {acc.activeSessionsCount} máy online
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-slate-400">Offline</span>
                      )}
                      {acc.sessionHistory.length > 0 && (
                        <span className="text-[10px] text-slate-400">
                          {acc.sessionHistory.length} lịch sử
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cột phải: Chi tiết các thiết bị đã & đang đăng nhập */}
          <div className="md:col-span-8 min-h-0 flex flex-col bg-slate-50/60 overflow-y-auto p-4 space-y-4">
            {loading && accounts.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-500 text-sm">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-600 mb-2" />
                Đang tải danh sách thiết bị và lịch sử phiên đăng nhập...
              </div>
            ) : displayedAccounts.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">
                Không tìm thấy tài khoản nhân viên phù hợp.
              </div>
            ) : (
              displayedAccounts.map((acc) => (
                <div
                  key={acc.username}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0"
                >
                  {/* Header của từng Tài khoản */}
                  <div className="px-4 py-3 bg-slate-100/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900">
                          {acc.fullName}
                        </h3>
                        <Badge variant="outline" className="bg-white text-slate-700 text-xs">
                          @{acc.username}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs"
                        >
                          {acc.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Đang đăng nhập: <strong>{acc.activeSessionsCount}</strong> thiết bị • Tổng
                        lịch sử: <strong>{acc.sessionHistory.length}</strong> phiên gần nhất
                      </p>
                    </div>

                    {isAdmin && acc.activeSessionsCount > 0 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={revokingKey === `all_${acc.username}`}
                        onClick={() => handleRevokeSession(acc, undefined, true)}
                        className="h-8 text-xs shrink-0"
                      >
                        {revokingKey === `all_${acc.username}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                          <LogOut className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Đăng xuất khỏi tất cả thiết bị ({acc.activeSessionsCount})
                      </Button>
                    )}
                  </div>

                  {/* Danh sách các thiết bị trong lịch sử của tài khoản này */}
                  {acc.sessionHistory.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 flex flex-col items-center gap-1.5">
                      <History className="h-6 w-6 text-slate-300" />
                      <span>
                        Tài khoản <strong>@{acc.username}</strong> chưa có lịch sử đăng nhập nào được
                        ghi nhận.
                      </span>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {acc.sessionHistory.map((sess) => {
                        const isCurrentBrowser =
                          currentBrowserSessionId && sess.sessionId === currentBrowserSessionId;
                        const isRevokingThis = revokingKey === `sess_${sess.sessionId}`;

                        return (
                          <div
                            key={sess.sessionId}
                            className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                              sess.status === 'active'
                                ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                                : 'bg-white hover:bg-slate-50/80'
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div
                                className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
                                  sess.status === 'active'
                                    ? 'bg-white border-emerald-200 shadow-xs'
                                    : 'bg-slate-50 border-slate-200 opacity-75'
                                }`}
                              >
                                {renderDeviceIcon(sess.deviceType)}
                              </div>

                              <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-sm text-slate-900">
                                    {sess.deviceName || 'Thiết bị không xác định'}
                                  </span>
                                  {renderStatusBadge(sess.status)}
                                  {isCurrentBrowser && (
                                    <Badge className="bg-blue-600 text-white text-[10px] px-2 py-0">
                                      Thiết bị hiện tại của bạn
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                  <span className="inline-flex items-center gap-1">
                                    <Globe className="h-3.5 w-3.5 text-slate-400" />
                                    IP: <strong className="text-slate-700">{sess.ipAddress || '127.0.0.1'}</strong>
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                    Đăng nhập: <strong className="text-slate-700">{formatDateTimeVN(sess.loginAt)}</strong>
                                  </span>
                                  <span>
                                    Hoạt động cuối: <strong className="text-slate-700">{formatDateTimeVN(sess.lastActiveAt)}</strong>
                                  </span>
                                </div>

                                {sess.status !== 'active' && (sess.revokedReason || sess.revokedAt) && (
                                  <p className="text-[11px] text-slate-500 italic">
                                    Kết thúc lúc {formatDateTimeVN(sess.revokedAt)}
                                    {sess.revokedReason ? ` — Lý do: ${sess.revokedReason}` : ''}
                                  </p>
                                )}

                                <p className="text-[10px] text-slate-400 font-mono truncate max-w-xl">
                                  Mã phiên: {sess.sessionId}
                                </p>
                              </div>
                            </div>

                            {isAdmin && sess.status === 'active' && (
                              <div className="shrink-0 self-end sm:self-center">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={Boolean(isRevokingThis)}
                                  onClick={() =>
                                    handleRevokeSession(acc, sess.sessionId, false)
                                  }
                                  className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 h-8 text-xs"
                                >
                                  {isRevokingThis ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                  ) : (
                                    <LogOut className="h-3.5 w-3.5 mr-1.5" />
                                  )}
                                  Đăng xuất thiết bị này
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
