'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellRing,
  CheckCircle,
  AlertCircle,
  Clock,
  Package,
  Trash2,
  CheckCheck,
  RotateCcw,
  Search,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import {
  getStoredNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
  resetDefaultNotifications,
  saveNotifications,
  type AppNotification,
} from '@/utils/notificationStore';

function isStaffCallNotification(n: AppNotification): boolean {
  const cat = String((n as any).category || '').toLowerCase();
  const title = String(n.title || '').toLowerCase();
  const msg = String(n.message || '').toLowerCase();
  return (
    cat === 'staff_call' ||
    cat === 'service_call' ||
    cat === 'service' ||
    title.includes('gọi phục vụ') ||
    title.includes('staff call') ||
    title.includes('hỗ trợ tại bàn') ||
    msg.includes('gọi phục vụ') ||
    msg.includes('hỗ trợ tại bàn') ||
    msg.includes('gọi nhân viên')
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const refresh = () => {
    setNotifications(getStoredNotifications());
  };

  useEffect(() => {
    refresh();
    const handleUpdate = () => refresh();
    window.addEventListener('h2_notifications_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Lắng nghe Realtime yêu cầu Gọi phục vụ từ khách tại bàn khi đang mở Trung tâm Thông báo
    let client: ReturnType<typeof createClient> | null = null;
    let serviceChannel: any = null;
    try {
      client = createClient();
      if (client) {
        serviceChannel = client
          .channel('staff-service-calls-notifications')
          .on('broadcast', { event: 'service-call' }, ({ payload }) => {
            const tableName = payload?.tableName || `Bàn ${payload?.tableId || ''}`.trim();
            const reqType = payload?.requestType || 'Hỗ trợ tại bàn';
            const newItem: AppNotification = {
              id: `staff-call-${Date.now()}`,
              title: `Gọi phục vụ - ${tableName}`,
              message: `${tableName} yêu cầu hỗ trợ tại bàn: ${reqType}`,
              time: 'Vừa xong',
              createdAt: payload?.timestamp || new Date().toISOString(),
              type: 'warning',
              unread: true,
              route: '/pos',
              actionLabel: 'Mở POS hỗ trợ bàn',
              category: 'staff_call' as any,
            };
            const next = [newItem, ...getStoredNotifications()];
            saveNotifications(next);
            setNotifications(next);
          })
          .subscribe();
      }
    } catch {
      // Bỏ qua nếu chưa cấu hình Supabase Realtime
    }

    return () => {
      window.removeEventListener('h2_notifications_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      if (client && serviceChannel) {
        void client.removeChannel(serviceChannel);
      }
    };
  }, []);

  const handleMarkAsRead = (id: string | number) => {
    const updated = markAsRead(id);
    setNotifications(updated);
  };

  const handleMarkAllRead = () => {
    const updated = markAllAsRead();
    setNotifications(updated);
    toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
  };

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn dọn sạch toàn bộ thông báo không?')) {
      const updated = clearAllNotifications();
      setNotifications(updated);
      toast.success('Đã dọn dẹp danh sách thông báo');
    }
  };

  const handleResetDefaults = () => {
    const updated = resetDefaultNotifications();
    setNotifications(updated);
    toast.success('Đã khôi phục các thông báo hệ thống');
  };

  const handleDeleteOne = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notifications.filter((n) => n.id !== id);
    saveNotifications(updated);
    setNotifications(updated);
    toast.success('Đã xóa thông báo');
  };

  const handleNavigate = (item: AppNotification) => {
    handleMarkAsRead(item.id);
    if (item.route) {
      router.push(item.route);
    }
  };

  // Lọc thông báo
  const filteredNotifications = notifications.filter((n) => {
    // Lọc theo type hoặc category
    if (filterType === 'unread' && !n.unread) return false;
    if (filterType === 'warning' && n.category !== 'inventory' && n.type !== 'warning') return false;
    if (filterType === 'order' && n.category !== 'order' && n.category !== 'kitchen') return false;
    if (filterType === 'staff_call' && !isStaffCallNotification(n)) return false;
    if (filterType === 'inventory' && n.category !== 'inventory') return false;

    // Lọc tìm kiếm
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => n.unread).length;
  const warningCount = notifications.filter((n) => n.category === 'inventory' || n.type === 'warning').length;
  const orderCount = notifications.filter((n) => n.category === 'order' || n.category === 'kitchen').length;
  const staffCallCount = notifications.filter((n) => isStaffCallNotification(n)).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-md">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Trung tâm thông báo
              {unreadCount > 0 && (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 text-xs">
                  {unreadCount} chưa đọc
                </Badge>
              )}
            </h1>
            <p className="text-sm text-gray-500">
              Quản lý các cảnh báo đơn hàng, tồn kho, bếp KDS và hệ thống
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="text-xs flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            Đã đọc tất cả
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            disabled={notifications.length === 0}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            Dọn thông báo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs text-gray-600 hover:bg-gray-100 flex items-center gap-1.5"
            title="Khôi phục thông báo mặc định"
          >
            <RotateCcw className="w-4 h-4" />
            Khôi phục mẫu
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
            className="text-xs rounded-xl"
          >
            Tất cả ({notifications.length})
          </Button>
          <Button
            variant={filterType === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('unread')}
            className="text-xs rounded-xl"
          >
            Chưa đọc ({unreadCount})
          </Button>
          <Button
            variant={filterType === 'warning' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('warning')}
            className="text-xs rounded-xl"
          >
            Cảnh báo kho ({warningCount})
          </Button>
          <Button
            variant={filterType === 'order' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('order')}
            className="text-xs rounded-xl"
          >
            Đơn & Bếp ({orderCount})
          </Button>
          <Button
            variant={filterType === 'staff_call' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('staff_call')}
            className="text-xs rounded-xl flex items-center gap-1.5"
          >
            <BellRing className="w-3.5 h-3.5" />
            Gọi phục vụ ({staffCallCount})
          </Button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm thông báo..."
            className="pl-9 pr-4 py-2 text-xs bg-white rounded-xl border-gray-200"
          />
        </div>
      </div>

      {/* Notifications Cards */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-sm">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3 stroke-[1.5]" />
            <p className="text-gray-600 font-medium">
              {filterType === 'unread'
                ? 'Bạn đã xem hết tất cả thông báo'
                : filterType === 'staff_call'
                ? 'Hiện chưa có yêu cầu gọi phục vụ tại bàn nào'
                : 'Không tìm thấy thông báo nào'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {filterType === 'staff_call'
                ? 'Khi khách tại bàn bấm nút Gọi phục vụ từ menu QR, yêu cầu sẽ hiển thị ngay tại đây.'
                : 'Bạn đã xử lý hết mọi thông báo hoặc bộ lọc không có dữ liệu trùng khớp.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const isStaffCall = isStaffCallNotification(item);
            const isWarning = item.type === 'warning';
            const isSuccess = item.type === 'success';

            return (
              <div
                key={item.id}
                onClick={() => handleNavigate(item)}
                className={`group relative bg-white p-5 rounded-2xl border transition-all duration-200 cursor-pointer hover:shadow-md flex items-start gap-4 ${
                  item.unread
                    ? isStaffCall
                      ? 'border-orange-200 bg-orange-50/25 shadow-sm'
                      : 'border-emerald-200 bg-emerald-50/20 shadow-sm'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isStaffCall
                      ? 'bg-orange-100 text-orange-700'
                      : isWarning
                      ? 'bg-amber-100 text-amber-700'
                      : isSuccess
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {isStaffCall ? (
                    <BellRing className="w-5 h-5" />
                  ) : isWarning ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : isSuccess ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Package className="w-5 h-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center flex-wrap gap-2">
                      <h3 className="font-bold text-gray-900 text-sm">{item.title}</h3>
                      {isStaffCall && (
                        <Badge variant="outline" className="text-[11px] bg-orange-50 text-orange-700 border-orange-200">
                          Gọi phục vụ
                        </Badge>
                      )}
                      {item.unread && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Mới
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {item.time}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{item.message}</p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                    <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700 flex items-center gap-1">
                      {item.actionLabel || 'Đi đến tính năng xử lý'}
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </span>

                    <div className="flex items-center gap-1">
                      {item.unread && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(item.id);
                            toast.success(isStaffCall ? 'Đã xác nhận hỗ trợ bàn' : 'Đã đánh dấu đã đọc');
                          }}
                          className="text-xs text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                          title={isStaffCall ? 'Xác nhận đã hỗ trợ' : 'Đánh dấu đã đọc'}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isStaffCall ? 'Đã hỗ trợ' : 'Đã đọc'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteOne(item.id, e)}
                        className="text-xs text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Xóa thông báo này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
