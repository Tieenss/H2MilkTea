'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Sliders,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Save,
  CheckCircle2,
  XCircle,
  Users,
  Sparkles,
  ScanBarcode,
  Layers,
  ArrowLeftRight,
  QrCode,
  Bot,
  WifiOff,
  Printer,
  UserPlus,
  CheckSquare,
  Lock,
  Unlock,
  Loader2,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import authUtils from '@/utils/authUtils';
import dsnvFallback from '@/data/DSNV.json';
import {
  SYSTEM_FEATURE_DEFINITIONS,
  CONFIGURABLE_ROLES,
  createDefaultFeatureConfig,
  isFeatureEnabledForUser,
  useFeatureFlags,
  type SystemFeatureKey,
  type FeatureCategory,
  type SystemFeaturesPayload,
} from '@/lib/settings/featureFlags';

interface StaffMember {
  username: string;
  fullName: string;
  role: string;
  department?: string;
  email?: string;
}

const FEATURE_ICONS: Record<SystemFeatureKey, React.ElementType> = {
  pos_barcode_scanner: ScanBarcode,
  pos_topping_modal: Layers,
  pos_transfer_table: ArrowLeftRight,
  pos_qr_inbox: QrCode,
  pos_ai_assistant: Bot,
  pos_offline_queue: WifiOff,
  pos_kitchen_print: Printer,
  pos_customer_Create: UserPlus,
};

const CATEGORIES: FeatureCategory[] = ['POS & Bán hàng', 'Bếp & QR', 'Hệ thống & AI'];

export default function SystemFeaturesSettingsPage() {
  const { config, updateConfig, isLoading, isSaving } = useFeatureFlags();
  const [draftConfig, setDraftConfig] = useState<SystemFeaturesPayload>(config);
  const [activeTab, setActiveTab] = useState<'global' | 'staff'>('global');
  const [isAdmin, setIsAdmin] = useState<boolean>(true);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const [loadingStaff, setLoadingStaff] = useState<boolean>(true);

  // Đồng bộ draftConfig khi config tải xong từ localStorage / API
  useEffect(() => {
    setDraftConfig(config);
  }, [config]);

  // Kiểm tra quyền Admin của người dùng hiện tại và tải danh sách nhân viên
  useEffect(() => {
    try {
      const currentUser = authUtils.getUserData();
      if (currentUser) {
        const role = String(currentUser['Phân quyền'] || currentUser.role || '').toLowerCase();
        const uname = String(currentUser.username || '').toLowerCase();
        setIsAdmin(role === 'admin' || role === 'quản trị viên' || uname === 'admin');
      }
    } catch {
      // Bỏ qua lỗi đọc user
    }

    async function loadEmployees() {
      setLoadingStaff(true);
      try {
        let rawList: any[] = [];
        if (typeof (authUtils as any).getAllNhanVien === 'function') {
          const res = await (authUtils as any).getAllNhanVien();
          if (Array.isArray(res)) rawList = res;
          else if (res && Array.isArray(res.data)) rawList = res.data;
        }

        if (rawList.length === 0) {
          const res = await fetch('/api/db?table=DSNV');
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json?.data)) rawList = json.data;
          }
        }

        if (rawList.length === 0) {
          rawList = dsnvFallback as any[];
        }

        const normalizedStaff: StaffMember[] = rawList
          .filter((item) => item && item.username)
          .map((item) => ({
            username: String(item.username).trim(),
            fullName: String(item['Họ và Tên'] || item.username).trim(),
            role: String(item['Phân quyền'] || 'Nhân viên').trim(),
            department: String(item['Phòng'] || item['Chức vụ'] || '').trim(),
            email: String(item.Email || '').trim(),
          }));

        setStaffList(normalizedStaff);
        if (normalizedStaff.length > 0) {
          const nonAdmin = normalizedStaff.find(
            (s) => s.role.toLowerCase() !== 'admin' && s.username.toLowerCase() !== 'admin'
          );
          setSelectedUsername((nonAdmin || normalizedStaff[0]).username);
        }
      } catch {
        const fallbackList: StaffMember[] = (dsnvFallback as any[]).map((item) => ({
          username: String(item.username).trim(),
          fullName: String(item['Họ và Tên'] || item.username).trim(),
          role: String(item['Phân quyền'] || 'Nhân viên').trim(),
          department: String(item['Phòng'] || '').trim(),
          email: String(item.Email || '').trim(),
        }));
        setStaffList(fallbackList);
        if (fallbackList.length > 0) setSelectedUsername(fallbackList[0].username);
      } finally {
        setLoadingStaff(false);
      }
    }

    loadEmployees();
  }, []);

  // Bật / Tắt công tắc tổng của 1 tính năng
  const handleToggleGlobalFlag = (key: SystemFeatureKey, checked: boolean) => {
    if (!isAdmin) {
      toast.error('Chỉ Quản trị viên (Admin) mới được phép bật/tắt tính năng hệ thống.');
      return;
    }
    setDraftConfig((prev) => ({
      ...prev,
      flags: {
        ...prev.flags,
        [key]: checked,
      },
    }));
  };

  // Bật / Tắt quyền mặc định theo Vai trò (Role)
  const handleToggleRolePermission = (
    key: SystemFeatureKey,
    roleGroup: (typeof CONFIGURABLE_ROLES)[number]
  ) => {
    if (!isAdmin) return;
    setDraftConfig((prev) => {
      const currentRoles = prev.rolePermissions[key] || [];
      const hasRole = roleGroup.aliases.some((alias) =>
        currentRoles.some((r) => r.toLowerCase() === alias.toLowerCase())
      );

      let nextRoles: string[];
      if (hasRole) {
        nextRoles = currentRoles.filter(
          (r) => !roleGroup.aliases.some((alias) => alias.toLowerCase() === r.toLowerCase())
        );
      } else {
        nextRoles = Array.from(new Set([...currentRoles, ...roleGroup.aliases]));
      }

      return {
        ...prev,
        rolePermissions: {
          ...prev.rolePermissions,
          [key]: nextRoles,
        },
      };
    });
  };

  // Bật tất cả tính năng toàn hệ thống
  const handleEnableAllGlobal = () => {
    if (!isAdmin) return;
    const allEnabledFlags = {} as Record<SystemFeatureKey, boolean>;
    for (const item of SYSTEM_FEATURE_DEFINITIONS) {
      allEnabledFlags[item.key] = true;
    }
    setDraftConfig((prev) => ({
      ...prev,
      flags: allEnabledFlags,
    }));
    toast.success('Đã bật tất cả công tắc tính năng trên bản nháp. Nhấn "Lưu cấu hình" để áp dụng!');
  };

  // Khôi phục mặc định
  const handleResetDefault = () => {
    if (!isAdmin) return;
    const defaults = createDefaultFeatureConfig();
    setDraftConfig(defaults);
    toast.success('Đã đặt lại về cấu hình mặc định (Máy quét mã vạch: Tắt, các tính năng POS khác: Bật).');
  };

  // Lưu cấu hình lên Supabase & LocalStorage
  const handleSaveConfig = async () => {
    if (!isAdmin) {
      toast.error('Bạn không có quyền lưu cài đặt hệ thống!');
      return;
    }
    const toastId = toast.loading('Đang lưu cấu hình tính năng hệ thống...');
    const res = await updateConfig(draftConfig);
    if (res.success) {
      toast.success(
        'Đã lưu cấu hình chức năng! Mọi tài khoản cấp dưới sẽ áp dụng ngay khi tải lại trang.',
        { id: toastId, duration: 4000 }
      );
    } else {
      toast.error(res.error || 'Đã lưu cục bộ nhưng có lỗi khi đồng bộ máy chủ.', {
        id: toastId,
      });
    }
  };

  // Xử lý phân quyền mở rộng theo từng nhân viên (Extra Grant / Revoke / Default)
  const selectedStaff = useMemo(
    () => staffList.find((s) => s.username.toLowerCase() === selectedUsername.toLowerCase()) || null,
    [staffList, selectedUsername]
  );

  const getStaffOverrideState = (
    username: string,
    featureKey: SystemFeatureKey
  ): 'default' | 'granted' | 'revoked' => {
    const key = username.toLowerCase().trim();
    const entry = draftConfig.staffOverrides[key];
    if (!entry) return 'default';
    if (entry.revoked?.includes(featureKey)) return 'revoked';
    if (entry.granted?.includes(featureKey)) return 'granted';
    return 'default';
  };

  const handleSetStaffOverride = (
    username: string,
    featureKey: SystemFeatureKey,
    mode: 'default' | 'granted' | 'revoked'
  ) => {
    if (!isAdmin) return;
    const key = username.toLowerCase().trim();
    setDraftConfig((prev) => {
      const existing = prev.staffOverrides[key] || { granted: [], revoked: [] };
      const nextGranted = existing.granted.filter((k) => k !== featureKey);
      const nextRevoked = existing.revoked.filter((k) => k !== featureKey);

      if (mode === 'granted') nextGranted.push(featureKey);
      if (mode === 'revoked') nextRevoked.push(featureKey);

      return {
        ...prev,
        staffOverrides: {
          ...prev.staffOverrides,
          [key]: {
            granted: nextGranted,
            revoked: nextRevoked,
          },
        },
      };
    });
  };

  const handleGrantAllForStaff = (username: string) => {
    if (!isAdmin || !username) return;
    const key = username.toLowerCase().trim();
    const allKeys = SYSTEM_FEATURE_DEFINITIONS.map((f) => f.key);
    setDraftConfig((prev) => ({
      ...prev,
      staffOverrides: {
        ...prev.staffOverrides,
        [key]: {
          granted: allKeys,
          revoked: [],
        },
      },
    }));
    toast.success(`Đã cấp đặc cách toàn bộ chức năng cho nhân viên @${username}`);
  };

  const handleResetStaffToRoleDefault = (username: string) => {
    if (!isAdmin || !username) return;
    const key = username.toLowerCase().trim();
    setDraftConfig((prev) => {
      const nextOverrides = { ...prev.staffOverrides };
      delete nextOverrides[key];
      return {
        ...prev,
        staffOverrides: nextOverrides,
      };
    });
    toast.success(`Đã đặt lại quyền của @${username} theo vai trò mặc định`);
  };

  const enabledCount = useMemo(
    () =>
      SYSTEM_FEATURE_DEFINITIONS.filter((item) => draftConfig.flags[item.key] !== false).length,
    [draftConfig.flags]
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-14">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-medium">
            <Sliders className="h-3.5 w-3.5" />
            Trung tâm Điều khiển Tính năng & Phân quyền POS
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5">
            Cài Đặt Chức Năng Hệ Thống
          </h1>
          <p className="text-sm text-emerald-100/85 max-w-2xl">
            Khi Admin tắt một tính năng tại đây, chức năng đó sẽ tự động bị vô hiệu hóa và ẩn đi trên
            màn hình POS của mọi tài khoản cấp dưới sau khi tải lại trang.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Badge className="bg-white/15 hover:bg-white/20 text-white border-white/20 px-3 py-1.5 text-xs">
            Đang bật: {enabledCount}/{SYSTEM_FEATURE_DEFINITIONS.length} tính năng
          </Badge>
          <Button
            onClick={handleSaveConfig}
            disabled={!isAdmin || isSaving || isLoading}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-md"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Lưu cấu hình
          </Button>
        </div>
      </div>

      {/* Cảnh báo nếu không phải Admin */}
      {!isAdmin && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3 text-sm">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            Tài khoản của bạn không phải <strong>Quản trị viên (Admin)</strong> nên đang ở chế độ{' '}
            <strong>Chỉ xem</strong>. Vui lòng đăng nhập tài khoản Admin để bật/tắt công tắc tính năng
            hoặc cấp quyền mở rộng cho nhân viên.
          </div>
        </div>
      )}

      {/* Thanh chuyển đổi Khu vực & Nút thao tác nhanh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'global' ? 'default' : 'outline'}
            onClick={() => setActiveTab('global')}
            className={
              activeTab === 'global'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'text-slate-700'
            }
          >
            <Sliders className="h-4 w-4 mr-2" />
            1. Công tắc Tính năng Toàn Hệ thống
          </Button>
          <Button
            variant={activeTab === 'staff' ? 'default' : 'outline'}
            onClick={() => setActiveTab('staff')}
            className={
              activeTab === 'staff'
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'text-slate-700'
            }
          >
            <Users className="h-4 w-4 mr-2" />
            2. Phân quyền Mở rộng theo Nhân viên
          </Button>
        </div>

        {activeTab === 'global' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnableAllGlobal}
              disabled={!isAdmin}
              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              <CheckSquare className="h-4 w-4 mr-1.5" />
              Bật tất cả
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefault}
              disabled={!isAdmin}
              className="text-slate-600 hover:bg-slate-100"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Khôi phục mặc định
            </Button>
          </div>
        )}
      </div>

      {/* KHU VỰC 1: CÔNG TẮC BẬT / TẮT TÍNH NĂNG TOÀN HỆ THỐNG */}
      {activeTab === 'global' && (
        <div className="space-y-8">
          {CATEGORIES.map((category) => {
            const items = SYSTEM_FEATURE_DEFINITIONS.filter((f) => f.category === category);
            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                    Nhóm: {category}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {items.filter((i) => draftConfig.flags[i.key] !== false).length}/{items.length}{' '}
                    đang bật
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((feature) => {
                    const IconComponent = FEATURE_ICONS[feature.key] || Sliders;
                    const isEnabled = draftConfig.flags[feature.key] !== false;
                    const currentAllowedRoles = draftConfig.rolePermissions[feature.key] || [];

                    return (
                      <Card
                        key={feature.key}
                        className={`transition-all border ${
                          isEnabled
                            ? 'border-emerald-200/80 bg-white dark:bg-slate-900 shadow-sm'
                            : 'border-slate-200 bg-slate-50/70 dark:bg-slate-900/40 opacity-85'
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div
                                className={`p-2.5 rounded-xl shrink-0 ${
                                  isEnabled
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                <IconComponent className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <CardTitle className="text-base font-semibold">
                                    {feature.name}
                                  </CardTitle>
                                  <Badge
                                    variant="outline"
                                    className={
                                      isEnabled
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs'
                                        : 'bg-slate-100 text-slate-600 border-slate-300 text-xs'
                                    }
                                  >
                                    {isEnabled ? (
                                      <span className="flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> Đang bật
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1">
                                        <XCircle className="h-3 w-3" /> Đã tắt (Ẩn trên POS)
                                      </span>
                                    )}
                                  </Badge>
                                </div>
                                <CardDescription className="text-xs mt-1.5 leading-relaxed">
                                  {feature.description}
                                </CardDescription>
                              </div>
                            </div>

                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) =>
                                handleToggleGlobalFlag(feature.key, checked)
                              }
                              disabled={!isAdmin}
                              aria-label={`Bật hoặc tắt ${feature.name}`}
                            />
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                              Vai trò mặc định được phép sử dụng khi tính năng đang bật:
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                Admin (Luôn có quyền)
                              </span>

                              {CONFIGURABLE_ROLES.map((roleGroup) => {
                                const checked = roleGroup.aliases.some((alias) =>
                                  currentAllowedRoles.some(
                                    (r) => r.toLowerCase() === alias.toLowerCase()
                                  )
                                );
                                return (
                                  <label
                                    key={roleGroup.id}
                                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border cursor-pointer select-none transition-colors ${
                                      !isEnabled
                                        ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200'
                                        : checked
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-medium'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                                      checked={checked}
                                      disabled={!isAdmin || !isEnabled}
                                      onChange={() =>
                                        handleToggleRolePermission(feature.key, roleGroup)
                                      }
                                    />
                                    {roleGroup.label}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* KHU VỰC 2: PHÂN QUYỀN CHỨC NĂNG MỞ RỘNG THEO TỪNG NHÂN VIÊN */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Danh sách nhân viên */}
          <Card className="lg:col-span-4 border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                Danh sách Tài khoản Nhân viên
              </CardTitle>
              <CardDescription className="text-xs">
                Chọn một nhân viên để cấp thêm chức năng vượt ngoài vai trò mặc định hoặc khóa chức
                năng riêng biệt.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[540px] overflow-y-auto">
              {loadingStaff ? (
                <div className="py-8 flex items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang tải danh sách nhân viên...
                </div>
              ) : staffList.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Chưa có dữ liệu nhân viên.
                </p>
              ) : (
                staffList.map((staff) => {
                  const isSelected =
                    staff.username.toLowerCase() === selectedUsername.toLowerCase();
                  const overrideEntry =
                    draftConfig.staffOverrides[staff.username.toLowerCase().trim()];
                  const customCount =
                    (overrideEntry?.granted?.length || 0) + (overrideEntry?.revoked?.length || 0);

                  return (
                    <button
                      key={staff.username}
                      type="button"
                      onClick={() => setSelectedUsername(staff.username)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-indigo-50/90 border-indigo-400 shadow-sm'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-900 truncate">
                          {staff.fullName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          @{staff.username} • <span className="font-medium">{staff.role}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge
                          variant="outline"
                          className={
                            staff.role.toLowerCase() === 'admin'
                              ? 'bg-purple-50 text-purple-700 border-purple-200 text-[11px]'
                              : 'bg-slate-100 text-slate-700 border-slate-200 text-[11px]'
                          }
                        >
                          {staff.role}
                        </Badge>
                        {customCount > 0 && (
                          <span className="text-[11px] text-indigo-600 font-medium">
                            {customCount} tùy chỉnh riêng
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Cột phải: Bảng cấu hình quyền mở rộng cho nhân viên đang chọn */}
          <Card className="lg:col-span-8 border-slate-200">
            {selectedStaff ? (
              <>
                <CardHeader className="pb-4 border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        Phân quyền chức năng cho: {selectedStaff.fullName}
                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
                          @{selectedStaff.username}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Vai trò gốc: <strong>{selectedStaff.role}</strong>. Bạn có thể cấp thêm quyền
                        (Extra Grant) để nhân viên này dùng được nhiều chức năng hơn vai trò mặc
                        định, hoặc khóa bớt chức năng.
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!isAdmin}
                        onClick={() => handleGrantAllForStaff(selectedStaff.username)}
                        className="text-indigo-700 border-indigo-200 hover:bg-indigo-50 text-xs"
                      >
                        <Unlock className="h-3.5 w-3.5 mr-1.5" />
                        Chọn tất cả chức năng cho nhân viên này
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!isAdmin}
                        onClick={() => handleResetStaffToRoleDefault(selectedStaff.username)}
                        className="text-slate-600 text-xs"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        Đặt lại theo vai trò mặc định
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-3">
                  {selectedStaff.role.toLowerCase() === 'admin' ||
                  selectedStaff.username.toLowerCase() === 'admin' ? (
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center gap-2">
                      <Info className="h-4 w-4 text-purple-600 shrink-0" />
                      <span>
                        Tài khoản <strong>@{selectedStaff.username}</strong> thuộc nhóm{' '}
                        <strong>Admin</strong> nên luôn có toàn quyền với các tính năng đang được bật
                        toàn hệ thống.
                      </span>
                    </div>
                  ) : null}

                  <div className="divide-y divide-slate-100">
                    {SYSTEM_FEATURE_DEFINITIONS.map((feature) => {
                      const overrideState = getStaffOverrideState(
                        selectedStaff.username,
                        feature.key
                      );
                      const isGloballyOn = draftConfig.flags[feature.key] !== false;
                      const effectiveAllowed = isFeatureEnabledForUser(
                        feature.key,
                        {
                          username: selectedStaff.username,
                          'Phân quyền': selectedStaff.role,
                        },
                        draftConfig
                      );

                      return (
                        <div
                          key={feature.key}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1 pr-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-sm text-slate-900">
                                {feature.name}
                              </span>
                              {!isGloballyOn ? (
                                <Badge
                                  variant="outline"
                                  className="bg-slate-100 text-slate-600 border-slate-300 text-[11px]"
                                >
                                  Đã tắt ở Công tắc tổng
                                </Badge>
                              ) : effectiveAllowed ? (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]"
                                >
                                  Được phép dùng
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-rose-50 text-rose-700 border-rose-200 text-[11px]"
                                >
                                  Đã bị khóa / Ẩn
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">{feature.description}</p>
                          </div>

                          {/* 3 nút chế độ: Mặc định theo Role | Cấp thêm quyền (Extra Grant) | Khóa quyền (Revoke) */}
                          <div className="inline-flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 shrink-0 self-start sm:self-center">
                            <button
                              type="button"
                              disabled={!isAdmin}
                              onClick={() =>
                                handleSetStaffOverride(
                                  selectedStaff.username,
                                  feature.key,
                                  'default'
                                )
                              }
                              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                overrideState === 'default'
                                  ? 'bg-white text-slate-800 shadow-sm'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              Mặc định Role
                            </button>
                            <button
                              type="button"
                              disabled={!isAdmin}
                              onClick={() =>
                                handleSetStaffOverride(
                                  selectedStaff.username,
                                  feature.key,
                                  'granted'
                                )
                              }
                              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                                overrideState === 'granted'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-slate-500 hover:text-emerald-700'
                              }`}
                            >
                              <Unlock className="h-3 w-3" />
                              Cấp thêm
                            </button>
                            <button
                              type="button"
                              disabled={!isAdmin}
                              onClick={() =>
                                handleSetStaffOverride(
                                  selectedStaff.username,
                                  feature.key,
                                  'revoked'
                                )
                              }
                              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                                overrideState === 'revoked'
                                  ? 'bg-rose-600 text-white shadow-sm'
                                  : 'text-slate-500 hover:text-rose-700'
                              }`}
                            >
                              <Lock className="h-3 w-3" />
                              Khóa quyền
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Vui lòng chọn một nhân viên ở danh sách bên trái để thiết lập quyền chức năng.
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {/* Thanh Lưu cấu hình cố định ở cuối trang */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 text-white shadow-md">
        <div className="text-xs sm:text-sm text-slate-300">
          Sau khi thay đổi công tắc tính năng hoặc phân quyền nhân viên, hãy nhấn{' '}
          <strong className="text-white">Lưu cấu hình</strong> để đồng bộ toàn hệ thống.
        </div>
        <Button
          onClick={handleSaveConfig}
          disabled={!isAdmin || isSaving || isLoading}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shrink-0"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Lưu cấu hình
        </Button>
      </div>
    </div>
  );
}
