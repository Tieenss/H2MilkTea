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
  MoreVertical,
  Layers,
  LayoutGrid,
  Check,
  X,
  ListTodo,
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
  maxOrders = 30,
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
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'batch'>('cards');

  const knownOrderIds = React.useRef(new Set<string>());
  const soundEnabledRef = React.useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Responsive mobile screen detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
        ? 'Đang pha chế'
        : status === 'ready'
        ? 'Chờ phục vụ'
        : 'Đã hoàn tất';
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

  // Aggregated Batch Prep Items (Gom món tổng hợp)
  const batchItems = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        station: 'bar' | 'kitchen';
        unit: string;
        totalQuantity: number;
        completedQuantity: number;
        orderBreakdowns: {
          orderId: string;
          tableName: string;
          quantity: number;
          note?: string;
          itemKey: string;
          isCompleted: boolean;
          orderAge: number;
        }[];
      }
    >();

    filteredOrders.forEach((order) => {
      order.items.forEach((item, index) => {
        const itemKey = `${item.id}-${index}`;
        const isDone = !!completedItemsMap[`${order.id}__${itemKey}`];
        const station = item.station || detectStation(item.name, item.category);
        const groupKey = `${item.name.trim().toLowerCase()}__${station}`;

        if (!map.has(groupKey)) {
          map.set(groupKey, {
            name: item.name,
            station,
            unit: item.unit || 'Ly',
            totalQuantity: 0,
            completedQuantity: 0,
            orderBreakdowns: [],
          });
        }

        const group = map.get(groupKey)!;
        const qty = Number(item.quantity) || 1;
        group.totalQuantity += qty;
        if (isDone) {
          group.completedQuantity += qty;
        }

        group.orderBreakdowns.push({
          orderId: order.id,
          tableName: order.tableName,
          quantity: qty,
          note: item.note,
          itemKey,
          isCompleted: isDone,
          orderAge: getOrderAge(order.orderTime),
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      const aRemaining = a.totalQuantity - a.completedQuantity;
      const bRemaining = b.totalQuantity - b.completedQuantity;
      if (aRemaining !== bRemaining) return bRemaining - aRemaining;
      return b.totalQuantity - a.totalQuantity;
    });
  }, [filteredOrders, completedItemsMap, currentTime]);

  const totalUnfinishedBatchItems = useMemo(() => {
    return batchItems.reduce((acc, curr) => acc + Math.max(0, curr.totalQuantity - curr.completedQuantity), 0);
  }, [batchItems]);

  const markAllBatchItemDone = (groupName: string, station: string) => {
    const groupKey = `${groupName.trim().toLowerCase()}__${station}`;
    const targetGroup = batchItems.find((g) => `${g.name.trim().toLowerCase()}__${g.station}` === groupKey);
    if (!targetGroup) return;

    setCompletedItemsMap((prev) => {
      const next = { ...prev };
      targetGroup.orderBreakdowns.forEach((b) => {
        next[`${b.orderId}__${b.itemKey}`] = true;
      });
      try {
        localStorage.setItem(LOCAL_KDS_COMPLETED_ITEMS_KEY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
    toast.success(`Đã đánh dấu xong tất cả: ${groupName}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 md:pb-10">
      {/* ============================================================ */}
      {/* 1. MOBILE COMPACT BARISTA TOPBAR (Screens < 768px, ~48px height) */}
      {/* ============================================================ */}
      <div className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-2 shadow-xs">
        <div className="flex items-center justify-between">
          {/* Left: Chef icon + Brand + Live Clock */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <ChefHat className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-black text-sm text-slate-900 tracking-tight">KDS Bếp</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 leading-none">
                  {stationId.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 font-medium">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="font-mono text-slate-700">
                  {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Sound, Sync, More Dropdown */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                toast(next ? '🔔 Đã bật chuông báo món mới' : '🔕 Đã tắt chuông báo', { icon: next ? '🔔' : '🔕' });
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                soundEnabled ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'
              }`}
              title={soundEnabled ? 'Tắt âm báo' : 'Bật âm báo'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => fetchOrders(true)}
              disabled={isSyncing}
              className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors"
              title="Đồng bộ lại đơn hàng"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-orange-600' : ''}`} />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMobileMoreMenu(!showMobileMoreMenu)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  showMobileMoreMenu ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title="Tùy chọn khác"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMobileMoreMenu && (
                <div
                  className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs"
                  onClick={() => setShowMobileMoreMenu(false)}
                >
                  <div
                    className="absolute right-3 top-12 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2.5 space-y-1.5 animate-in fade-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 px-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cài đặt màn hình</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {isConnected ? 'Realtime Online' : 'Nội bộ'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileMoreMenu(false);
                        handleClearAllOrders();
                      }}
                      disabled={isClearingStale}
                      className="w-full text-left px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      Làm sạch bếp (Dọn đơn tồn)
                    </button>

                    <div className="pt-1 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 py-0.5">
                        Thử nghiệm / Demo KDS
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMobileMoreMenu(false);
                          handleGenerateSampleOrder();
                        }}
                        className="w-full text-left px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-700 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4 text-orange-500 shrink-0" />
                        + Tạo 1 đơn mẫu KDS
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMobileMoreMenu(false);
                          handleResetDemoOrders();
                        }}
                        className="w-full text-left px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                        Khôi phục 3 đơn mẫu chuẩn
                      </button>
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowMobileMoreMenu(false)}
                        className="w-full py-1.5 text-center text-xs font-medium text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                      >
                        Đóng menu
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. DESKTOP FULL HEADER (Screens >= 768px)                     */}
      {/* ============================================================ */}
      <div className="hidden md:block bg-white shadow-xs border-b border-slate-200 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-sm">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
                Màn Hình Nhà Bếp & Quầy Pha Chế (KDS)
                <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                  TRẠM {stationId.toUpperCase()}
                </Badge>
              </h1>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
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

          {/* Action Controls */}
          <div className="flex items-center gap-2 relative">
            <Button
              onClick={() => fetchOrders(true)}
              variant="outline"
              size="sm"
              disabled={isSyncing}
              className="border-slate-300 text-slate-700 font-medium"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Đồng bộ
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
              {isClearingStale ? 'Đang dọn...' : 'Làm sạch bếp'}
            </Button>

            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              variant={soundEnabled ? 'default' : 'outline'}
              size="sm"
              className={soundEnabled ? 'bg-slate-800 hover:bg-slate-900 text-white font-medium' : 'font-medium'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 mr-1.5" /> : <VolumeX className="w-4 h-4 mr-1.5" />}
              {soundEnabled ? 'Chuông: BẬT' : 'Chuông: TẮT'}
            </Button>

            {/* Menu công cụ thử nghiệm (Demo) */}
            <div className="relative">
              <Button
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                variant="outline"
                size="sm"
                className="border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 text-xs"
                title="Các công cụ tạo đơn mẫu"
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
                    * Dùng để test khi không có khách gọi món thực tế.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. ULTRA-COMPACT 1-ROW FILTER PILLS (Mobile & Desktop)        */}
      {/* Saves ~350px vertical height so orders are visible immediately! */}
      {/* ============================================================ */}
      <div className="sticky top-[48px] md:top-[73px] z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs px-2.5 sm:px-6 py-1.5">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5">
          {/* Status Filters */}
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
              statusFilter === 'active'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({stats.total})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
              statusFilter === 'pending'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/60'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
            🔥 Chờ làm ({stats.pendingCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('preparing')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
              statusFilter === 'preparing'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <Flame className="w-3.5 h-3.5 shrink-0" />
            ⚡ Đang pha ({stats.preparingCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ready')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
              statusFilter === 'ready'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            ✅ Chờ phục vụ ({stats.readyCount})
          </button>

          {/* Separator */}
          <div className="h-4 w-px bg-slate-300 shrink-0 mx-0.5" />

          {/* Station Filters */}
          <button
            type="button"
            onClick={() => setStationFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
              stationFilter === 'all'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả trạm
          </button>

          <button
            type="button"
            onClick={() => setStationFilter('bar')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
              stationFilter === 'bar'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
            }`}
          >
            <Coffee className="w-3.5 h-3.5 shrink-0" />
            🧋 Pha chế
          </button>

          <button
            type="button"
            onClick={() => setStationFilter('kitchen')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
              stationFilter === 'kitchen'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5 shrink-0" />
            🥐 Bếp bánh
          </button>

          {/* Separator */}
          <div className="h-4 w-px bg-slate-300 shrink-0 mx-0.5" />

          {/* View Mode Toggle: Order Cards vs Batch Items */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'cards' ? 'batch' : 'cards')}
            className={`px-3 py-1 rounded-lg text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'batch'
                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-300'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-300'
            }`}
            title="Gom tất cả các món từ nhiều đơn thành danh sách tổng để pha chế hàng loạt"
          >
            {viewMode === 'batch' ? (
              <>
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                <span>🎴 Xem theo thẻ bàn</span>
              </>
            ) : (
              <>
                <ListTodo className="w-3.5 h-3.5 shrink-0" />
                <span>📋 Gom món tổng hợp ({totalUnfinishedBatchItems})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. MAIN CONTENT AREA                                         */}
      {/* ============================================================ */}
      <div className="max-w-7xl mx-auto w-full p-3 sm:p-6 flex-1">
        {/* VIEW 1: BATCH PREP / GROUPED ITEMS VIEW ("GOM MÓN TỔNG HỢP") */}
        {viewMode === 'batch' ? (
          <div className="space-y-4">
            {/* Batch View Summary Banner */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    📋
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      Danh Sách Gom Món Pha Chế Hàng Loạt (Batch Prep)
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Tổng hợp <strong className="text-purple-700 font-bold">{totalUnfinishedBatchItems} ly/món</strong> đang chờ làm trên {filteredOrders.length} đơn bàn.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setViewMode('cards')}
                className="border-purple-300 text-purple-800 hover:bg-purple-100 font-bold self-start sm:self-auto cursor-pointer"
              >
                <LayoutGrid className="w-4 h-4 mr-1.5" />
                Quay lại xem theo bàn
              </Button>
            </div>

            {batchItems.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-md mx-auto my-6 shadow-xs">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-800">Không có món nào cần pha chế</h3>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">
                  Tất cả các món trong bộ lọc hiện tại đã được hoàn thành hoặc chưa có đơn hàng mới.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {batchItems.map((group) => {
                  const isAllDone = group.completedQuantity >= group.totalQuantity;
                  const percent = Math.min(
                    100,
                    group.totalQuantity > 0 ? Math.round((group.completedQuantity / group.totalQuantity) * 100) : 0
                  );

                  return (
                    <Card
                      key={`${group.name}__${group.station}`}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                        isAllDone
                          ? 'bg-emerald-50/50 border-emerald-300 opacity-80'
                          : 'bg-white border-slate-200 hover:border-purple-300 shadow-xs'
                      }`}
                    >
                      <div>
                        {/* Group Header */}
                        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Badge
                                className={`text-[10px] px-1.5 py-0 font-bold ${
                                  group.station === 'kitchen'
                                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                                    : 'bg-blue-100 text-blue-800 border-blue-200'
                                }`}
                              >
                                {group.station === 'kitchen' ? '🥐 Bếp bánh' : '🧋 Pha chế'}
                              </Badge>
                              {isAllDone && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  ✓ Đã xong hết
                                </span>
                              )}
                            </div>
                            <h3 className={`font-black text-base sm:text-lg leading-snug ${isAllDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                              {group.name}
                            </h3>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="inline-block font-black text-xl sm:text-2xl px-2.5 py-1 rounded-xl bg-purple-100 text-purple-950">
                              {group.totalQuantity} <span className="text-xs font-semibold">{group.unit}</span>
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-2.5 mb-3">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                            <span>Tiến độ pha:</span>
                            <span className={isAllDone ? 'text-emerald-700 font-bold' : 'text-purple-700 font-bold'}>
                              {group.completedQuantity}/{group.totalQuantity} ({percent}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${isAllDone ? 'bg-emerald-500' : 'bg-purple-600'}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>

                        {/* Order breakdown list */}
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {group.orderBreakdowns.map((b) => (
                            <div
                              key={`${b.orderId}__${b.itemKey}`}
                              onClick={() => toggleItemCompleted(b.orderId, b.itemKey)}
                              className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors select-none active:scale-[0.99] ${
                                b.isCompleted
                                  ? 'bg-emerald-50/80 border-emerald-200 text-slate-400 line-through'
                                  : 'bg-slate-50 hover:bg-purple-50/60 border-slate-200 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className={b.isCompleted ? 'text-emerald-600 shrink-0' : 'text-slate-400 shrink-0'}>
                                  {b.isCompleted ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                </span>
                                <div className="truncate">
                                  <span className="font-bold text-slate-900">{b.tableName}</span>
                                  {b.note && (
                                    <span className="ml-1 text-[11px] text-amber-800 font-medium bg-amber-100 px-1.5 py-0.2 rounded">
                                      {b.note}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="font-black text-sm px-1.5 py-0.5 rounded bg-white border border-slate-200 shrink-0">
                                x{b.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Footer Quick Action */}
                      {!isAllDone && (
                        <div className="mt-3 pt-2 border-t border-slate-100">
                          <Button
                            size="sm"
                            onClick={() => markAllBatchItemDone(group.name, group.station)}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2 rounded-xl cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Xong tất cả ({group.totalQuantity} {group.unit})
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* VIEW 2: ORDER CARDS VIEW (DEFAULT - 1-tap touch cards) */
          <>
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-md mx-auto my-6 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-3">
                  <ChefHat className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Hiện không có đơn nào</h3>
                <p className="text-slate-500 text-xs sm:text-sm mt-1 leading-relaxed">
                  Đơn từ quầy POS hoặc mã QR tại bàn sẽ tự động đồng bộ tức thì lên màn hình.
                </p>
                <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <Button
                    onClick={handleGenerateSampleOrder}
                    className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 mr-1.5" />
                    Tạo 1 đơn mẫu
                  </Button>
                  <Button
                    onClick={handleResetDemoOrders}
                    variant="outline"
                    className="w-full sm:w-auto cursor-pointer"
                  >
                    Khôi phục 3 đơn mẫu
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {filteredOrders.map((order) => {
                  const age = getOrderAge(order.orderTime);
                  const priorityColor = getPriorityColor(order.priority, age, order.status);
                  const completedCount = order.items.filter(
                    (item, idx) => completedItemsMap[`${order.id}__${item.id}-${idx}`]
                  ).length;
                  const isAllItemsCompleted = completedCount === order.items.length && order.items.length > 0;

                  return (
                    <Card
                      key={order.id}
                      className={`p-3.5 sm:p-4 ${priorityColor} border-2 rounded-2xl transition-all flex flex-col justify-between`}
                    >
                      <div>
                        {/* Order Header: Table Name, Urgent Alert, Status */}
                        <div className="flex justify-between items-start gap-2 mb-2.5 pb-2.5 border-b border-slate-200/80">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-black text-lg sm:text-xl text-slate-950 tracking-tight truncate">
                                {order.tableName}
                              </h3>
                              {(order.priority === 'urgent' || age > 15) && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white animate-pulse">
                                  <AlertTriangle className="w-3 h-3" />
                                  GẤP
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 flex-wrap">
                              <span className="font-mono font-semibold text-slate-700">#{order.id.slice(-6)}</span>
                              <span>•</span>
                              <Badge
                                className={`text-[10px] px-1.5 py-0 ${
                                  order.source === 'QR_TABLE'
                                    ? 'bg-purple-100 text-purple-800 border-purple-200'
                                    : 'bg-blue-100 text-blue-800 border-blue-200'
                                }`}
                              >
                                {order.source === 'QR_TABLE' ? '📱 QR Bàn' : '🖥️ POS'}
                              </Badge>
                              <span>•</span>
                              <span className={`font-semibold ${isAllItemsCompleted ? 'text-emerald-700' : 'text-slate-600'}`}>
                                ({completedCount}/{order.items.length} xong)
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <Badge className={`${getStatusColor(order.status)} mb-1 text-[10px] font-bold px-2 py-0.5`}>
                              {getStatusText(order.status)}
                            </Badge>
                            <div
                              className={`text-[11px] font-bold flex items-center justify-end gap-1 ${
                                age > 15 ? 'text-red-600' : age > 10 ? 'text-amber-600' : 'text-slate-500'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              {formatOrderAge(order.orderTime, age)}
                            </div>
                          </div>
                        </div>

                        {/* Order Items with Large Touch-Friendly Row & 1-Tap Checkbox */}
                        <div className="space-y-1.5 mb-3">
                          {order.items.map((item, index) => {
                            const itemKey = `${item.id}-${index}`;
                            const isItemDone = !!completedItemsMap[`${order.id}__${itemKey}`];
                            const itemStation = item.station || detectStation(item.name, item.category);

                            return (
                              <div
                                key={itemKey}
                                onClick={() => toggleItemCompleted(order.id, itemKey)}
                                className={`flex justify-between items-center p-2.5 rounded-xl border cursor-pointer transition-all select-none active:scale-[0.99] min-h-[46px] ${
                                  isItemDone
                                    ? 'bg-emerald-50/70 border-emerald-300 opacity-70'
                                    : 'bg-white border-slate-200 hover:border-orange-300 shadow-2xs'
                                }`}
                                title="Chạm để đánh dấu xong món"
                              >
                                <div className="flex items-center gap-2.5 flex-1 pr-2 min-w-0">
                                  <button
                                    type="button"
                                    className="shrink-0 text-slate-400 hover:text-emerald-600"
                                    aria-label="Đánh dấu hoàn thành món"
                                  >
                                    {isItemDone ? (
                                      <CheckSquare className="w-5 h-5 text-emerald-600" />
                                    ) : (
                                      <Square className="w-5 h-5 text-slate-300" />
                                    )}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <div
                                      className={`font-bold text-sm sm:text-base leading-snug break-words ${
                                        isItemDone ? 'line-through text-slate-400' : 'text-slate-900'
                                      }`}
                                    >
                                      {item.name}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                      <span
                                        className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                                          itemStation === 'kitchen'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-sky-100 text-sky-800'
                                        }`}
                                      >
                                        {itemStation === 'kitchen' ? '🍰 Bếp' : '🧋 Pha'}
                                      </span>
                                      {item.note && (
                                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-950 font-bold text-[11px] px-1.5 py-0.2 rounded border border-amber-300">
                                          <span>⚡</span> {item.note}
                                        </span>
                                      )}
                                      {isItemDone && (
                                        <span className="text-[10px] text-emerald-700 font-bold ml-1">
                                          ✓ Xong
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span
                                    className={`inline-block font-black text-base sm:text-lg px-2.5 py-0.5 rounded-lg ${
                                      isItemDone
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-orange-100 text-orange-950'
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
                          <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-xl">
                            <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                              <span>📋 Ghi chú đơn:</span>
                            </div>
                            <div className="text-xs text-amber-800 mt-0.5 break-words leading-relaxed">
                              {order.notes}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Prominent One-Tap Action Button */}
                      <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                        {order.status === 'pending' && (
                          <Button
                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                            className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-sm py-2.5 rounded-xl shadow-xs cursor-pointer"
                          >
                            <Flame className="w-4 h-4 mr-1.5" />
                            ▶ Bắt đầu pha chế
                          </Button>
                        )}

                        {order.status === 'preparing' && (
                          <Button
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm py-2.5 rounded-xl shadow-xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            ✓ Hoàn thành (Báo phục vụ)
                          </Button>
                        )}

                        {order.status === 'ready' && (
                          <Button
                            onClick={() => updateOrderStatus(order.id, 'served')}
                            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm py-2.5 rounded-xl shadow-xs cursor-pointer"
                          >
                            🚀 Đã phục vụ khách (Xong)
                          </Button>
                        )}

                        <div className="flex items-center justify-between pt-0.5 px-0.5 text-[11px] text-slate-400">
                          <span>
                            Lúc: {new Date(order.orderTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(order.id, 'served')}
                            className="hover:text-red-600 inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Ẩn đơn
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
