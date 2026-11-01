'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import authUtils from '@/utils/authUtils';
import toast from 'react-hot-toast';
import {
  ChefHat,
  Coffee,
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  Flame,
  Volume2,
  VolumeX,
  PlusCircle,
  RefreshCw,
  CheckSquare,
  Square,
  Sparkles,
  Trash2,
  AlertTriangle,
  FlaskConical,
  ChevronDown,
} from 'lucide-react';

export interface KitchenOrderItem {
  id: string;
  name: string;
  quantity: number;
  note?: string;
  unit: string;
  category?: string;
  station?: 'bar' | 'kitchen';
}

export interface KitchenOrder {
  id: string;
  tableId: string;
  tableName: string;
  items: KitchenOrderItem[];
  orderTime: string;
  employee: string;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  priority: 'normal' | 'urgent';
  estimatedTime?: number;
  notes?: string;
  source?: 'POS_COUNTER' | 'QR_TABLE' | 'DEMO_TEST';
}

interface KitchenDisplayProps {
  stationId?: string;
  maxOrders?: number;
}

const LOCAL_KDS_ORDERS_KEY = 'h2_kds_local_orders_v1';
const LOCAL_KDS_STATUS_MAP_KEY = 'h2_kds_status_overrides_v1';
const LOCAL_KDS_COMPLETED_ITEMS_KEY = 'h2_kds_completed_items_v1';

const detectStation = (itemName: string, category?: string): 'bar' | 'kitchen' => {
  const text = `${itemName} ${category || ''}`.toLowerCase();
  if (
    text.includes('bánh') ||
    text.includes('bún') ||
    text.includes('mì') ||
    text.includes('cơm') ||
    text.includes('ăn vặt') ||
    text.includes('khoai') ||
    text.includes('gà') ||
    text.includes('xúc xích') ||
    text.includes('croissant') ||
    text.includes('tiramisu') ||
    text.includes('mousse') ||
    text.includes('flan')
  ) {
    return 'kitchen';
  }
  return 'bar';
};

const getDefaultSeedKitchenOrders = (): KitchenOrder[] => {
  const now = Date.now();
  return [
    {
      id: 'KDS-DEMO-101',
      tableId: 'T02',
      tableName: 'Bàn 02 - Tầng 1',
      employee: 'Thu ngân Minh Anh',
      orderTime: new Date(now - 4 * 60 * 1000).toISOString(),
      status: 'pending',
      priority: 'urgent',
      source: 'QR_TABLE',
      notes: 'Khách xin thêm khăn giấy, làm gấp giúp bàn 2',
      items: [
        {
          id: 'SP001',
          name: 'Trà sữa truyền thống trân châu đường đen',
          quantity: 2,
          unit: 'Ly',
          note: '50% đường, 70% đá',
          station: 'bar',
        },
        {
          id: 'SP005',
          name: 'Trà đào cam sả',
          quantity: 1,
          unit: 'Ly',
          note: 'Ít đá',
          station: 'bar',
        },
        {
          id: 'SP012',
          name: 'Bánh Tiramisu Cacao',
          quantity: 1,
          unit: 'Phần',
          note: 'Dùng tại bàn',
          station: 'kitchen',
        },
      ],
    },
    {
      id: 'KDS-DEMO-102',
      tableId: 'T05',
      tableName: 'Bàn 05 - Sân vườn',
      employee: 'Thu ngân Hoàng Nam',
      orderTime: new Date(now - 9 * 60 * 1000).toISOString(),
      status: 'preparing',
      priority: 'normal',
      source: 'POS_COUNTER',
      items: [
        {
          id: 'SP003',
          name: 'Matcha Latte Kem Cheese',
          quantity: 2,
          unit: 'Ly',
          note: 'Kem cheese để riêng',
          station: 'bar',
        },
        {
          id: 'SP015',
          name: 'Bánh Sừng Bò Croissant Bơ Tỏi',
          quantity: 2,
          unit: 'Cái',
          note: 'Hâm nóng giòn',
          station: 'kitchen',
        },
      ],
    },
    {
      id: 'KDS-DEMO-103',
      tableId: 'TAKEAWAY',
      tableName: 'Khách Mang Về #08',
      employee: 'POS Quầy Chính',
      orderTime: new Date(now - 2 * 60 * 1000).toISOString(),
      status: 'ready',
      priority: 'normal',
      source: 'POS_COUNTER',
      notes: 'Đóng túi đôi mang đi, kèm 3 ống hút lớn',
      items: [
        {
          id: 'SP008',
          name: 'Hồng trà macchiato',
          quantity: 3,
          unit: 'Ly',
          note: '100% đường, đá bình thường',
          station: 'bar',
        },
      ],
    },
  ];
};

export const KitchenDisplay: React.FC<KitchenDisplayProps> = ({
  stationId = 'main',
  maxOrders = 24,
}) => {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [stationFilter, setStationFilter] = useState<'all' | 'bar' | 'kitchen'>('all');
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [isClearingStale, setIsClearingStale] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'active' | 'pending' | 'preparing' | 'ready'>('active');
  const [completedItemsMap, setCompletedItemsMap] = useState<Record<string, boolean>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  const knownOrderIds = React.useRef(new Set<string>());
  const soundEnabledRef = React.useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Load completed item checkboxes from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_KDS_COMPLETED_ITEMS_KEY);
      if (saved) {
        setCompletedItemsMap(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading KDS completed items:', e);
    }
  }, []);

  const readStatusOverrides = (): Record<string, KitchenOrder['status']> => {
    try {
      const raw = localStorage.getItem(LOCAL_KDS_STATUS_MAP_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const writeStatusOverride = (orderId: string, status: KitchenOrder['status']) => {
    try {
      const current = readStatusOverrides();
      current[orderId] = status;
      localStorage.setItem(LOCAL_KDS_STATUS_MAP_KEY, JSON.stringify(current));
    } catch (e) {
      console.error('Error saving KDS status override:', e);
    }
  };

  const readLocalOrders = (): KitchenOrder[] => {
    try {
      const raw = localStorage.getItem(LOCAL_KDS_ORDERS_KEY);
      if (!raw) {
        // Mặc định màn hình bếp trống, chỉ hiển thị khi có đơn thực tế hoặc người dùng bấm Tạo đơn mẫu
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveLocalOrders = (nextOrders: KitchenOrder[]) => {
    try {
      localStorage.setItem(LOCAL_KDS_ORDERS_KEY, JSON.stringify(nextOrders));
    } catch (e) {
      console.error('Error saving local KDS orders:', e);
    }
  };

  const fetchOrders = useCallback(async (showToast = false) => {
    setIsSyncing(true);
    try {
      const statusOverrides = readStatusOverrides();
      let apiOrders: KitchenOrder[] = [];

      try {
        const response = await fetch('/api/kitchen/orders');
        if (response.ok) {
          const data = await response.json();
          apiOrders = (data.orders || []).map((o: KitchenOrder) => ({
            ...o,
            status: statusOverrides[o.id] || o.status,
            items: (o.items || []).map((item) => ({
              ...item,
              station: item.station || detectStation(item.name, item.category),
            })),
          }));
          setIsConnected(true);
        }
      } catch {
        // Fallback smoothly to local orders when offline or Supabase table is empty
      }

      const localOrders = readLocalOrders().map((o) => ({
        ...o,
        status: statusOverrides[o.id] || o.status,
        items: (o.items || []).map((item) => ({
          ...item,
          station: item.station || detectStation(item.name, item.category),
        })),
      }));

      // Merge without duplicates, excluding 'served' orders
      const mergedMap = new Map<string, KitchenOrder>();
      [...apiOrders, ...localOrders].forEach((order) => {
        if (order.status !== 'served') {
          mergedMap.set(order.id, order);
        }
      });

      const mergedList = Array.from(mergedMap.values())
        .sort((a, b) => new Date(a.orderTime).getTime() - new Date(b.orderTime).getTime())
        .slice(0, maxOrders);

      knownOrderIds.current = new Set(mergedList.map((order) => order.id));
      setOrders(mergedList);

      if (showToast) {
        toast.success(`Đã đồng bộ ${mergedList.length} đơn pha chế/nhà bếp!`);
      }
    } catch (error) {
      console.error('Error fetching KDS orders:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [maxOrders]);

  useEffect(() => {
    fetchOrders();
    const supabase = createClient();
    const channel = supabase
      .channel('staff-pos-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_orders' }, (payload) => {
        const row = payload.new as any;
        const id = String(row?.id || '');
        if (
          payload.eventType === 'INSERT' &&
          row.order_status === 'accepted' &&
          id &&
          !knownOrderIds.current.has(id) &&
          soundEnabledRef.current
        ) {
          playNotificationSound();
        }

        // Tự động dọn đơn khỏi màn hình bếp khi đơn đã thanh toán hoặc hoàn thành phục vụ
        if (
          payload.eventType === 'UPDATE' &&
          (row.kitchen_status === 'served' || row.order_status === 'completed' || row.payment_status === 'paid')
        ) {
          setOrders((prev) => prev.filter((o) => o.id !== id));
        }

        fetchOrders();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsConnected(true);
      });

    // Lắng nghe sự kiện thanh toán dọn bàn từ quầy POS
    const handleTableCleared = (event: any) => {
      const { tableId, tableName, orderIds } = event.detail || {};
      setOrders((prev) =>
        prev.filter((o) => {
          // Ngoại trừ đơn mẫu do bấm nút tạo mẫu
          if (o.id && (String(o.id).startsWith('KDS-') || String(o.id).startsWith('demo-kds-'))) return true;
          if (orderIds && Array.isArray(orderIds) && orderIds.includes(o.id)) return false;
          if (tableId && (o.tableId === tableId || o.tableName === tableName)) return false;
          return true;
        })
      );
      fetchOrders(false);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pos_table_cleared', handleTableCleared);
      window.addEventListener('pos_order_settled', handleTableCleared);
    }

    const interval = setInterval(() => fetchOrders(false), 15000);

    return () => {
      clearInterval(interval);
      void supabase.removeChannel(channel);
      if (typeof window !== 'undefined') {
        window.removeEventListener('pos_table_cleared', handleTableCleared);
        window.removeEventListener('pos_order_settled', handleTableCleared);
      }
    };
  }, [fetchOrders]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function playNotificationSound() {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 880;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }

  const toggleItemCompleted = (orderId: string, itemKey: string) => {
    const compositeKey = `${orderId}__${itemKey}`;
    setCompletedItemsMap((prev) => {
      const next = { ...prev, [compositeKey]: !prev[compositeKey] };
      try {
        localStorage.setItem(LOCAL_KDS_COMPLETED_ITEMS_KEY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const updateOrderStatus = async (orderId: string, status: KitchenOrder['status']) => {
    writeStatusOverride(orderId, status);

    // Update local orders storage as well
    const currentLocal = readLocalOrders();
    const updatedLocal = currentLocal
      .map((o) => (o.id === orderId ? { ...o, status } : o))
      .filter((o) => o.status !== 'served');
    saveLocalOrders(updatedLocal);

    // Update UI immediately
    setOrders((prev) =>
      prev
        .map((order) => (order.id === orderId ? { ...order, status } : order))
        .filter((order) => order.status !== 'served')
    );

    const statusLabel =
      status === 'preparing'
        ? 'Đang pha chế / chế biến'
        : status === 'ready'
        ? 'Đã hoàn thành - Chờ phục vụ'
        : 'Đã phục vụ xong';
    toast.success(`Đơn #${orderId.slice(-6)}: ${statusLabel}`);

    // Also attempt backend PATCH if it's a Supabase order
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, kitchenStatus: status === 'pending' ? 'queued' : status }),
      });
    } catch {
      // Ignore network error for local orders
    }
  };

  const handleGenerateSampleOrder = async () => {
    try {
      const products = await authUtils.apiRequest('DMHH', 'getall', {});
      const validProducts = Array.isArray(products) && products.length > 0 ? products : [];
      const sampleItems: KitchenOrderItem[] = [];

      if (validProducts.length >= 2) {
        const p1 = validProducts[Math.floor(Math.random() * validProducts.length)];
        const p2 = validProducts[Math.floor(Math.random() * validProducts.length)];
        sampleItems.push({
          id: String(p1.IDSP || 'SP01'),
          name: String(p1['Tên sản phẩm'] || 'Trà sữa đặc biệt H2'),
          quantity: Math.floor(Math.random() * 2) + 1,
          unit: String(p1['Đơn vị tính'] || 'Ly'),
          note: '70% đường, ít đá',
          station: detectStation(String(p1['Tên sản phẩm'] || ''), String(p1['Loại sản phẩm'] || '')),
        });
        if (p2.IDSP !== p1.IDSP) {
          sampleItems.push({
            id: String(p2.IDSP || 'SP02'),
            name: String(p2['Tên sản phẩm'] || 'Bánh Tiramisu'),
            quantity: 1,
            unit: String(p2['Đơn vị tính'] || 'Phần'),
            note: 'Làm mới ngay',
            station: detectStation(String(p2['Tên sản phẩm'] || ''), String(p2['Loại sản phẩm'] || '')),
          });
        }
      } else {
        sampleItems.push(
          {
            id: 'SP101',
            name: 'Trà Sữa Ô Long Nướng Trân Châu Hoàng Kim',
            quantity: 2,
            unit: 'Ly',
            note: '50% đường, 50% đá',
            station: 'bar',
          },
          {
            id: 'SP102',
            name: 'Bánh Croissant Trứng Muối Tan Chảy',
            quantity: 1,
            unit: 'Cái',
            note: 'Nướng nóng giòn',
            station: 'kitchen',
          }
        );
      }

      const tableNum = Math.floor(Math.random() * 12) + 1;
      const newOrder: KitchenOrder = {
        id: `KDS-${Date.now().toString().slice(-5)}`,
        tableId: `T${String(tableNum).padStart(2, '0')}`,
        tableName: `Bàn ${String(tableNum).padStart(2, '0')} - Khu Chính`,
        employee: 'POS Thu Ngân',
        orderTime: new Date().toISOString(),
        status: 'pending',
        priority: Math.random() > 0.65 ? 'urgent' : 'normal',
        source: Math.random() > 0.5 ? 'QR_TABLE' : 'POS_COUNTER',
        notes: 'Khách yêu cầu lên món cùng lúc',
        items: sampleItems,
      };

      const existingLocal = readLocalOrders();
      const updated = [newOrder, ...existingLocal];
      saveLocalOrders(updated);
      if (soundEnabled) playNotificationSound();
      await fetchOrders(false);
      toast.success(`Đã tạo đơn mẫu #${newOrder.id} cho ${newOrder.tableName}!`);
    } catch (error) {
      console.error('Error generating sample order:', error);
      toast.error('Không thể tạo đơn mẫu');
    }
  };

  const formatOrderAge = (orderTime: string, ageMinutes: number): string => {
    if (ageMinutes === 0) return 'Vừa xong';
    if (ageMinutes < 60) return `${ageMinutes} phút trước`;
    try {
      const d = new Date(orderTime);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      if (ageMinutes < 1440) {
        const hours = Math.floor(ageMinutes / 60);
        const mins = ageMinutes % 60;
        return `${hours}h ${mins}p (${hh}:${mm})`;
      }
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${month} ${hh}:${mm}`;
    } catch {
      return `${ageMinutes} phút trước`;
    }
  };

  const handleClearAllOrders = async () => {
    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn dọn sạch tất cả đơn tồn đọng trên màn hình bếp? Các đơn này sẽ được cập nhật trạng thái đã phục vụ trên cơ sở dữ liệu hệ thống.'
    );
    if (!confirmed) return;

    setIsClearingStale(true);
    try {
      const res = await fetch('/api/kitchen/clear-stale', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (data && data.success) {
        toast.success(data.message || `Đã dọn sạch ${data.clearedCount || 0} đơn bếp trên hệ thống!`);
      }
    } catch (err) {
      console.error('Lỗi khi gọi clear-stale:', err);
    } finally {
      localStorage.removeItem(LOCAL_KDS_ORDERS_KEY);
      localStorage.removeItem(LOCAL_KDS_STATUS_MAP_KEY);
      localStorage.removeItem(LOCAL_KDS_COMPLETED_ITEMS_KEY);
      setCompletedItemsMap({});
      setOrders([]);
      setIsClearingStale(false);
      await fetchOrders(false);
    }
  };

  const handleResetDemoOrders = () => {
    const defaults = getDefaultSeedKitchenOrders();
    saveLocalOrders(defaults);
    localStorage.removeItem(LOCAL_KDS_STATUS_MAP_KEY);
    localStorage.removeItem(LOCAL_KDS_COMPLETED_ITEMS_KEY);
    setCompletedItemsMap({});
    fetchOrders(true);
  };

  const getOrderAge = (orderTime: string): number => {
    return Math.max(0, Math.floor((currentTime.getTime() - new Date(orderTime).getTime()) / (1000 * 60)));
  };

  const getStatusColor = (status: KitchenOrder['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'preparing':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'ready':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'served':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: KitchenOrder['priority'], age: number, status: KitchenOrder['status']) => {
    if (status === 'ready') {
      return 'border-emerald-400 bg-emerald-50/40 shadow-sm';
    }
    if (priority === 'urgent' || age > 15) {
      return 'border-red-500 bg-red-50/60 shadow-red-100 shadow-md';
    }
    if (age > 10) {
      return 'border-amber-500 bg-amber-50/60 shadow-amber-100 shadow-md';
    }
    return 'border-gray-200 bg-white shadow-sm';
  };

  const getStatusText = (status: KitchenOrder['status']) => {
    switch (status) {
      case 'pending':
        return 'CHỜ LÀM';
      case 'preparing':
        return 'ĐANG PHA CHẾ';
      case 'ready':
        return 'CHỜ PHỤC VỤ';
      case 'served':
        return 'ĐÃ PHỤC VỤ';
      default:
        return String(status).toUpperCase();
    }
  };

  // Filtered orders based on station and status
  const filteredOrders = useMemo(() => {
    return orders
      .map((order) => {
        if (stationFilter === 'all') return order;
        const stationItems = order.items.filter(
          (item) => (item.station || detectStation(item.name, item.category)) === stationFilter
        );
        return { ...order, items: stationItems };
      })
      .filter((order) => {
        if (order.items.length === 0) return false;
        if (statusFilter === 'active') return order.status !== 'served';
        return order.status === statusFilter;
      });
  }, [orders, stationFilter, statusFilter]);

  const stats = useMemo(() => {
    const pendingCount = orders.filter((o) => o.status === 'pending').length;
    const preparingCount = orders.filter((o) => o.status === 'preparing').length;
    const readyCount = orders.filter((o) => o.status === 'ready').length;
    const urgentCount = orders.filter((o) => o.priority === 'urgent' || getOrderAge(o.orderTime) > 15).length;
    return { pendingCount, preparingCount, readyCount, urgentCount, total: orders.length };
  }, [orders, currentTime]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <div className="bg-white shadow-sm border-b border-slate-200 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-sm">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  Màn Hình Nhà Bếp & Quầy Pha Chế (KDS)
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                    TRẠM {stationId.toUpperCase()}
                  </Badge>
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-orange-500" />
                    {currentTime.toLocaleString('vi-VN')}
                  </span>
                  <span>•</span>
                  <span className={`inline-flex items-center gap-1.5 font-medium ${isConnected ? 'text-emerald-600' : 'text-amber-600'}`}>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    {isConnected ? 'Realtime KDS Đang hoạt động' : 'Chế độ Đồng bộ Nội bộ'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5 relative">
            <Button
              onClick={() => fetchOrders(true)}
              variant="outline"
              size="sm"
              disabled={isSyncing}
              className="border-slate-300 text-slate-700 font-medium"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Đồng bộ đơn
            </Button>

            <Button
              onClick={handleClearAllOrders}
              variant="outline"
              size="sm"
              disabled={isClearingStale}
              className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 font-medium"
              title="Dọn sạch các đơn tồn đọng để làm gọn màn hình bếp"
            >
              <Trash2 className="w-4 h-4 mr-1.5 text-red-600" />
              {isClearingStale ? 'Đang dọn dẹp...' : 'Làm sạch bếp'}
            </Button>

            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              variant={soundEnabled ? 'default' : 'outline'}
              size="sm"
              className={soundEnabled ? 'bg-slate-800 hover:bg-slate-900 text-white font-medium' : 'font-medium'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 mr-1.5" /> : <VolumeX className="w-4 h-4 mr-1.5" />}
              {soundEnabled ? 'Chuông báo: BẬT' : 'Chuông báo: TẮT'}
            </Button>

            {/* Menu công cụ thử nghiệm (Demo) ẩn tách biệt khỏi thao tác vận hành */}
            <div className="relative">
              <Button
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                variant="outline"
                size="sm"
                className="border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 text-xs"
                title="Các công cụ tạo đơn mẫu dùng để kiểm thử hệ thống"
              >
                <FlaskConical className="w-3.5 h-3.5 mr-1 text-amber-600" />
                Demo / Thử nghiệm
                <ChevronDown className="w-3 h-3 ml-1 text-slate-400" />
              </Button>

              {showDemoMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
                    Công cụ thử nghiệm KDS
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDemoMenu(false);
                      handleGenerateSampleOrder();
                    }}
                    className="w-full text-left px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-700 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-orange-500 shrink-0" />
                    + Tạo 1 đơn mẫu KDS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDemoMenu(false);
                      handleResetDemoOrders();
                    }}
                    className="w-full text-left px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                    Khôi phục 3 đơn mẫu chuẩn
                  </button>
                  <div className="text-[10px] text-slate-400 px-2 pt-1 border-t border-slate-100 italic">
                    * Chỉ dùng để test khi không có khách gọi món thực tế.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter & KPI Bar */}
        <div className="max-w-7xl mx-auto mt-4 pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Station Filter */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setStationFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                stationFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5 text-orange-500" />
              Tất cả khu vực ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setStationFilter('bar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                stationFilter === 'bar'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Coffee className="w-3.5 h-3.5 text-blue-600" />
              Quầy Pha Chế - Đồ uống
            </button>
            <button
              type="button"
              onClick={() => setStationFilter('kitchen')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                stationFilter === 'kitchen'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
              Bếp & Bánh Ngọt
            </button>
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                statusFilter === 'active'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Tất cả ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              Chờ làm ({stats.pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('preparing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                statusFilter === 'preparing'
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Đang pha chế ({stats.preparingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ready')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                statusFilter === 'ready'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Chờ phục vụ ({stats.readyCount})
            </button>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="max-w-7xl mx-auto p-6">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-xl mx-auto my-8 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-4">
              <ChefHat className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Hiện không có đơn hàng nào trong bộ lọc này</h3>
            <p className="text-slate-500 text-sm mt-2">
              Các đơn hàng từ màn hình Bán hàng (POS) hoặc khách quét mã QR tại bàn sẽ tự động xuất hiện tại đây. Bạn cũng có thể tạo đơn mẫu để kiểm thử quy trình bếp.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                onClick={handleGenerateSampleOrder}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Tạo đơn thử nghiệm ngay
              </Button>
              <Button onClick={handleResetDemoOrders} variant="outline">
                Khôi phục bộ đơn mẫu
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
            {filteredOrders.map((order) => {
              const age = getOrderAge(order.orderTime);
              const priorityColor = getPriorityColor(order.priority, age, order.status);
              const completedCount = order.items.filter(
                (item, idx) => completedItemsMap[`${order.id}__${item.id}-${idx}`]
              ).length;

              return (
                <Card
                  key={order.id}
                  className={`p-5 ${priorityColor} border-2 rounded-2xl transition-all duration-200 flex flex-col justify-between`}
                >
                  <div>
                    {/* Order Header */}
                    <div className="flex justify-between items-start gap-2 mb-3 pb-3 border-b border-slate-200/80">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-xl sm:text-2xl text-slate-950 tracking-tight">{order.tableName}</h3>
                          {(order.priority === 'urgent' || age > 15) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-600 text-white">
                              <AlertTriangle className="w-3 h-3" />
                              GẤP
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Mã: <span className="font-mono font-semibold text-slate-700">#{order.id.slice(-6)}</span> • {order.employee}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <Badge
                            className={`text-[11px] px-2 py-0.5 ${
                              order.source === 'QR_TABLE'
                                ? 'bg-purple-100 text-purple-800 border-purple-200'
                                : 'bg-blue-100 text-blue-800 border-blue-200'
                            }`}
                          >
                            {order.source === 'QR_TABLE' ? '📱 Khách quét QR' : '🖥️ Gọi tại quầy POS'}
                          </Badge>
                          <span className="text-[11px] text-slate-500 font-medium">
                            ({completedCount}/{order.items.length} món xong)
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <Badge className={`${getStatusColor(order.status)} mb-1.5 text-[11px] font-bold px-2.5 py-0.5`}>
                          {getStatusText(order.status)}
                        </Badge>
                        <div
                          className={`text-xs font-bold flex items-center justify-end gap-1 ${
                            age > 15 ? 'text-red-600' : age > 10 ? 'text-amber-600' : 'text-slate-600'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {formatOrderAge(order.orderTime, age)}
                        </div>
                      </div>
                    </div>

                    {/* Order Items with Click-to-Complete */}
                    <div className="space-y-2.5 mb-4">
                      {order.items.map((item, index) => {
                        const itemKey = `${item.id}-${index}`;
                        const isItemDone = !!completedItemsMap[`${order.id}__${itemKey}`];
                        const itemStation = item.station || detectStation(item.name, item.category);

                        return (
                          <div
                            key={itemKey}
                            onClick={() => toggleItemCompleted(order.id, itemKey)}
                            className={`flex justify-between items-start p-2.5 rounded-xl border cursor-pointer transition-all select-none ${
                              isItemDone
                                ? 'bg-emerald-50/70 border-emerald-200 opacity-75'
                                : 'bg-white border-slate-200 hover:border-orange-300 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 flex-1 pr-2">
                              <button
                                type="button"
                                className="mt-0.5 text-slate-400 hover:text-emerald-600"
                                aria-label="Đánh dấu hoàn thành món"
                              >
                                {isItemDone ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400" />
                                )}
                              </button>
                              <div className="flex-1">
                                <div
                                  className={`font-bold text-base sm:text-lg leading-snug tracking-tight break-words ${
                                    isItemDone ? 'line-through text-slate-500' : 'text-slate-800'
                                  }`}
                                >
                                  {item.name}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                      itemStation === 'kitchen'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-sky-100 text-sky-800'
                                    }`}
                                  >
                                    {itemStation === 'kitchen' ? '🍰 Bếp/Bánh' : '🧋 Pha chế'}
                                  </span>
                                  {item.note && (<span className="inline-flex items-center gap-1 bg-amber-100 text-amber-950 font-bold text-xs sm:text-sm px-2.5 py-1 rounded-md border border-amber-300 shadow-2xs break-words max-w-full"><span>⚡</span> {item.note}</span>)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span
                                className={`inline-block font-black text-lg sm:text-xl px-3 py-1 rounded-lg ${
                                  isItemDone
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-orange-100 text-orange-900'
                                }`}
                              >
                                x{item.quantity}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Order Notes */}
                    {order.notes && (
                      <div className="mb-4 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="text-xs font-bold text-amber-900">📋 Ghi chú đơn hàng:</div>
                        <div className="text-xs text-amber-800 mt-0.5 break-words leading-relaxed">{order.notes}</div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-2">
                    {order.status === 'pending' && (
                      <Button
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5"
                      >
                        <Flame className="w-4 h-4 mr-1.5" />
                        Bắt đầu pha chế / làm món
                      </Button>
                    )}

                    {order.status === 'preparing' && (
                      <Button
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        Hoàn thành • Báo phục vụ
                      </Button>
                    )}

                    {order.status === 'ready' && (
                      <Button
                        onClick={() => updateOrderStatus(order.id, 'served')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5"
                      >
                        🚀 Xác nhận Đã giao khách
                      </Button>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400">
                        Đặt lúc: {new Date(order.orderTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateOrderStatus(order.id, 'served')}
                        className="text-xs text-slate-400 hover:text-red-600 inline-flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Ẩn / Hoàn tất đơn
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
