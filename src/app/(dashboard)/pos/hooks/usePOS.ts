
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

import type { Product, Table, CartItem, Category, POSState, ModalState } from '../types/pos';
import { useProducts } from './useProducts';
import { useTables } from './useTables';
import { useCart } from './useCart';
import { formatCurrency, generateId, formatDate } from '../utils/formatters';
import { printReceipt } from '../utils/receipt';
import authUtils from '@/utils/authUtils';
import { Customer } from '@/app/(dashboard)/khachhang/types/customer';

function playPosChimeSound() {
  try {
    const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // Nốt 1 (880Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Nốt 2 (1320Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.frequency.setValueAtTime(1320, now + 0.12);
    gain2.gain.setValueAtTime(0.18, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch {}
}
import { calculatePointsFromSpending } from '@/app/(dashboard)/khachhang/utils/customerFormatters';
import { useSharedCartDraft, type CartDraft } from './useSharedCartDraft';
import { useTablePresence } from '@/hooks/useTablePresence';
import { createClient } from '@/lib/supabase/client';
import { getVatSettings } from '@/utils/vatSettings';

// Helper function to format date to Vietnamese format (DD/MM/YYYY HH:mm:ss)
const formatToVietnameseDateTime = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  const second = date.getSeconds().toString().padStart(2, '0');

  return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
};

function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = window.localStorage.getItem('pos_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).slice(2, 10);
      window.localStorage.setItem('pos_device_id', id);
    }
    return id;
  } catch {
    return 'dev_unknown';
  }
}

function isMatchingTable(tableA?: string | null, tableB?: string | null): boolean {
  if (!tableA || !tableB) return false;
  if (tableA === tableB) return true;
  const normA = String(tableA).trim().toLowerCase();
  const normB = String(tableB).trim().toLowerCase();
  if (normA === normB) return true;
  const numA = normA.replace(/\D/g, '');
  const numB = normB.replace(/\D/g, '');
  return Boolean(numA && numB && numA === numB);
}

function subtractItemsFromCart(currentCart: CartItem[], itemsToRemove: any[]): CartItem[] {
  if (!Array.isArray(currentCart) || currentCart.length === 0) return [];
  if (!Array.isArray(itemsToRemove) || itemsToRemove.length === 0) return [...currentCart];

  let remaining = [...currentCart];
  for (const toRemove of itemsToRemove) {
    const removeId = toRemove.productId || toRemove.id;
    const removeName = toRemove.productName || toRemove.name;
    let qtyToRemove = Number(toRemove.quantity || 1);

    remaining = remaining.map((item) => {
      if (qtyToRemove <= 0) return item;
      const isMatch = (removeId && (item.id === removeId || (item as any).productId === removeId)) ||
                      (removeName && (item.name === removeName || (item as any).productName === removeName));
      if (isMatch) {
        const itemQty = Number(item.quantity || 1);
        const take = Math.min(itemQty, qtyToRemove);
        qtyToRemove -= take;
        const newQty = itemQty - take;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[];
  }
  return remaining;
}

// Import customer types và utils
export const usePOS = () => {
  // Get user data
  const userData = authUtils.getUserData();
  const nhanvien = userData?.['Họ và Tên'] || userData?.username || 'Thu ngân';

  // Customer state & per-table customer map
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showTableQRModal, setShowTableQRModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const tableCustomersRef = useRef<Map<string, Customer | null>>(new Map());
  const globalChannelRef = useRef<any>(null);

  const broadcastTableStatus = useCallback((tblId: string, tblCart: CartItem[], tblVersion: number) => {
    try {
      void globalChannelRef.current?.send({
        type: 'broadcast',
        event: 'table_status_sync',
        payload: {
          tableId: tblId,
          cart: tblCart,
          version: tblVersion,
          deviceId: getDeviceId(),
        },
      });
    } catch {
      // Bỏ qua lỗi gửi broadcast
    }
  }, []);

  const broadcastTableCleared = useCallback((tblId: string) => {
    try {
      void globalChannelRef.current?.send({
        type: 'broadcast',
        event: 'table_cleared',
        payload: {
          tableId: tblId,
          deviceId: getDeviceId(),
        },
      });
    } catch {
      // Bỏ qua lỗi gửi broadcast
    }
  }, []);

  // Custom hooks
  const {
    products,
    filteredProducts,
    categories,
    searchTerm,
    categoryFilter,
    priceFilter,
    isLoading: productsLoading,
    setSearchTerm,
    setCategoryFilter,
    setPriceFilter,
    fetchProducts,
    filterProducts,
    resetFilters
  } = useProducts();

  const {
    tables,
    isLoading: tablesLoading,
    fetchTables,
    updateTableStatus,
    updateTableStatusInDB
  } = useTables();

  const {
    cart,
    activeOrders,
    selectedTableId,
    addToCart: addItemToCart,
    removeFromCart,
    adjustQuantity,
    clearCart: clearLocalCart,
    setCart,
    setActiveOrders,
    setSelectedTableId,
    updateCartItemNote,
    updateItemsPrintStatus
  } = useCart();

  const selectedTableName = selectedTableId
    ? tables.find(t => t.IDBAN === selectedTableId)?.['Tên bàn'] || 'Đang chọn bàn...'
    : 'Chưa chọn';

  const applyRemoteCart = useCallback((tableId: string, nextCart: CartItem[]) => {
    setActiveOrders((current) => {
      const next = new Map(current);
      if (nextCart.length === 0) next.delete(tableId);
      else next.set(tableId, nextCart);
      return next;
    });
  }, [setActiveOrders]);

  const handleRemoteCustomer = useCallback((tblId: string, cust: Customer | null) => {
    tableCustomersRef.current.set(tblId, cust);
    if (tblId === selectedTableId) {
      setSelectedCustomer(cust);
    }
  }, [selectedTableId]);

  const {
    status: sharedCartStatus,
    realtimeStatus,
    lastSyncAt,
    conflictData,
    resolveConflict,
    canCheckout,
    clearDraft: clearSharedCartDraft,
    cancelPendingAutosave,
  } = useSharedCartDraft({
    tableId: selectedTableId,
    cart,
    setCart,
    selectedCustomer,
    onRemoteCart: applyRemoteCart,
    onRemoteCustomer: handleRemoteCustomer,
    onBroadcastTableStatus: broadcastTableStatus,
    onBroadcastTableCleared: broadcastTableCleared,
  });

  // Realtime Presence: Theo dõi ai đang xem/chọn món ở từng bàn
  const { presenceByTable } = useTablePresence({
    role: 'pos',
    tableId: selectedTableId,
    actorName: nhanvien,
    itemCount: cart.length,
  });

  const clearCart = useCallback(() => {
    cancelPendingAutosave();
    clearLocalCart();
    if (selectedTableId) {
      tableCustomersRef.current.delete(selectedTableId);
      updateTableStatus(selectedTableId, 'Trống');
      setActiveOrders((prev) => {
        const next = new Map(prev);
        next.delete(selectedTableId);
        return next;
      });
    }
    setSelectedCustomer(null);
    void clearSharedCartDraft().catch((error) => {
      console.error('Không thể xóa giỏ hàng dùng chung:', error);
    });
  }, [cancelPendingAutosave, clearLocalCart, clearSharedCartDraft, selectedTableId, updateTableStatus, setActiveOrders]);

  // Lắng nghe sự kiện hủy đơn QR từ quầy POS để trừ món hoặc làm sạch giỏ hàng bàn lập tức
  useEffect(() => {
    const handleOrderCancelled = (e: any) => {
      const cancelledTableId = e.detail?.tableId;
      const cancelledItems = e.detail?.items || [];
      const cancelledOrderId = e.detail?.orderId;
      if (!cancelledTableId) return;

      // Cập nhật activeOrders cho bàn tương ứng
      setActiveOrders((prev) => {
        const next = new Map(prev);
        let targetKey = cancelledTableId;
        for (const k of next.keys()) {
          if (isMatchingTable(k, cancelledTableId)) {
            targetKey = k;
            break;
          }
        }
        const currentTableCart = next.get(targetKey) || [];
        const newTableCart = subtractItemsFromCart(currentTableCart, cancelledItems);
        if (newTableCart.length === 0) {
          next.delete(targetKey);
          updateTableStatus(targetKey, 'Trống');
          tableCustomersRef.current.delete(targetKey);
        } else {
          next.set(targetKey, newTableCart);
        }
        return next;
      });

      // Nếu quầy POS hiện tại đang mở bàn này: Trừ trực tiếp trong giỏ hàng hiển thị
      if (selectedTableId && isMatchingTable(selectedTableId, cancelledTableId)) {
        setCart((currentCart) => {
          const newCart = subtractItemsFromCart(currentCart, cancelledItems);
          if (newCart.length === 0) {
            clearLocalCart();
            cancelPendingAutosave();
            setActivePOSOrderIds([]);
            updateTableStatus(selectedTableId, 'Trống');
            tableCustomersRef.current.delete(selectedTableId);
            return [];
          }
          if (cancelledOrderId) {
            setActivePOSOrderIds((prev) => prev.filter((id) => id !== cancelledOrderId));
          }
          return newCart;
        });
      }
    };

    window.addEventListener('pos_order_cancelled', handleOrderCancelled);
    return () => {
      window.removeEventListener('pos_order_cancelled', handleOrderCancelled);
    };
  }, [selectedTableId, clearLocalCart, cancelPendingAutosave, setActiveOrders, updateTableStatus, setCart]);

  // Modal state
  const [modalState, setModalState] = useState<ModalState>({
    showTableModal: false,
    showCheckoutModal: false,
    showTransferModal: false,
    showNoteModal: false,
    showClearConfirmation: false,
    selectedItemForNote: null,
    noteInput: ''
  });

  // Loading state
  const [loadingText, setLoadingText] = useState('Đang tải dữ liệu...');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [activePOSOrderIds, setActivePOSOrderIds] = useState<string[]>([]);

  // Customer display reference
  const customerDisplayWindow = useRef<Window | null>(null);

  // Constants
  const CONFIG = {
    timeouts: {
      notification: 2000,
      barcodeBuffer: 100
    },
    customerDisplayUrl: 'customer-display.html'
  };

  // Loading states
  const isLoading = productsLoading || tablesLoading;

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    if (type === 'success') {
      toast.success(message, {
        position: "bottom-left",
        duration: CONFIG.timeouts.notification,
      });
    } else if (type === 'error') {
      toast.error(message, {
        position: "bottom-left",
        duration: CONFIG.timeouts.notification,
      });
    } else if (type === 'warning') {
      toast(message, {
        icon: '⚠️',
        position: "bottom-left",
        duration: CONFIG.timeouts.notification,
        style: { background: '#fffbe6', color: '#ad8b00' }
      });
    }
  }, []);

  const showLoading = useCallback((message = 'Đang tải dữ liệu...') => {
    setLoadingText(message);
  }, []);

  // Nạp toàn bộ giỏ hàng nháp của tất cả các bàn ngay khi vào POS (Mục #18)
  const fetchAllCartDrafts = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/cart-draft', { cache: 'no-store' });
      const result = await res.json();
      if (res.ok && result.success && Array.isArray(result.drafts)) {
        const validTableIds = new Set(tables.map(t => String(t.IDBAN || '')));
        const validTableNames = new Set(tables.map(t => String(t['Tên bàn'] || '')));

        setActiveOrders((current) => {
          const next = new Map(current);
          result.drafts.forEach((draft: CartDraft) => {
            const tableExists = validTableIds.size === 0 || validTableIds.has(draft.table_id) || validTableNames.has(draft.table_id);
            if (!tableExists) {
              // Bàn không còn tồn tại: Tự động dọn dẹp khỏi activeOrders và xóa nháp mồ côi trên Cloud
              next.delete(draft.table_id);
              fetch(`/api/pos/cart-draft?tableId=${encodeURIComponent(draft.table_id)}`, { method: 'DELETE' }).catch(() => {});
              return;
            }

            if (Array.isArray(draft.cart) && draft.cart.length > 0) {
              next.set(draft.table_id, draft.cart);
              updateTableStatus(draft.table_id, 'Đang sử dụng');
            }
            if (draft.selected_customer) {
              tableCustomersRef.current.set(draft.table_id, draft.selected_customer);
            }
          });
          return next;
        });
        return result.drafts;
      }
      return [];
    } catch (err) {
      console.error('Lỗi tải toàn bộ giỏ hàng nháp các bàn:', err);
      return [];
    }
  }, [tables, setActiveOrders, updateTableStatus]);

  // Tự động dọn dẹp đơn nháp mồ côi khỏi activeOrders mỗi khi danh sách bàn thay đổi
  useEffect(() => {
    if (!tables || tables.length === 0) return;
    const validTableIds = new Set(tables.map(t => String(t.IDBAN || '')));
    const validTableNames = new Set(tables.map(t => String(t['Tên bàn'] || '')));

    setActiveOrders((current) => {
      let changed = false;
      const next = new Map(current);
      for (const [tblKey] of next.entries()) {
        if (!validTableIds.has(tblKey) && !validTableNames.has(tblKey)) {
          next.delete(tblKey);
          changed = true;
          fetch(`/api/pos/cart-draft?tableId=${encodeURIComponent(tblKey)}`, { method: 'DELETE' }).catch(() => {});
        }
      }
      return changed ? next : current;
    });
  }, [tables, setActiveOrders]);

  // Lắng nghe Realtime toàn bảng pos_cart_drafts để cập nhật trạng thái mọi bàn tức thời
  useEffect(() => {
    let client: ReturnType<typeof createClient>;
    try {
      client = createClient();
    } catch {
      return;
    }

    let active = true;
    let channel: any = null;
    let serviceChannel: any = null;

    try {
      // Dọn dẹp an toàn channel cũ nếu có trước khi đăng ký
      const existingChannels = client.getChannels();
      for (const ch of existingChannels) {
        if (ch.topic === 'realtime:pos-all-cart-drafts-global' || ch.topic === 'pos-all-cart-drafts-global') {
          void client.removeChannel(ch);
        }
        if (ch.topic === 'realtime:staff-service-calls' || ch.topic === 'staff-service-calls') {
          void client.removeChannel(ch);
        }
      }

      channel = client
        .channel('pos-all-cart-drafts-global', {
          config: { broadcast: { self: false } },
        })
        .on('broadcast', { event: 'table_status_sync' }, (payload) => {
          if (!active) return;
          const data = payload.payload;
          if (!data || !data.tableId) return;
          const myDeviceId = getDeviceId();
          if (data.deviceId && data.deviceId === myDeviceId) return;

          setActiveOrders((current) => {
            const next = new Map(current);
            if (Array.isArray(data.cart) && data.cart.length > 0) {
              next.set(data.tableId, data.cart);
              updateTableStatus(data.tableId, 'Đang sử dụng');
            } else {
              next.delete(data.tableId);
              updateTableStatus(data.tableId, 'Trống');
            }
            return next;
          });

          if (Array.isArray(data.cart) && data.cart.length > 0) {
            playPosChimeSound();
          }
        })
        .on('broadcast', { event: 'table_cleared' }, (payload) => {
          if (!active) return;
          const tblId = payload.payload?.tableId;
          const myDeviceId = getDeviceId();
          if (tblId && payload.payload?.deviceId !== myDeviceId) {
            setActiveOrders((current) => {
              const next = new Map(current);
              next.delete(tblId);
              return next;
            });
            tableCustomersRef.current.delete(tblId);
            updateTableStatus(tblId, 'Trống');
          }
        })
        .subscribe();

      globalChannelRef.current = channel;

      // Lắng nghe Realtime yêu cầu Gọi phục vụ từ khách tại bàn
      serviceChannel = client
        .channel('staff-service-calls')
        .on('broadcast', { event: 'service-call' }, ({ payload }) => {
          if (!active) return;
          playPosChimeSound();
          toast(`🔔 ${payload.tableName || 'Bàn ' + payload.tableId} gọi phục vụ: ${payload.requestType}!`, {
            duration: 9000,
            icon: '🛎️',
            style: {
              background: '#fff7ed',
              color: '#c2410c',
              fontWeight: 'bold',
              border: '2px solid #f97316',
            },
          });
        })
        .subscribe();
    } catch (err) {
      console.error('Lỗi khởi tạo Realtime POS global:', err);
    }

    return () => {
      active = false;
      globalChannelRef.current = null;
      if (channel) void client.removeChannel(channel);
      if (serviceChannel) void client.removeChannel(serviceChannel);
    };
  }, [setActiveOrders, updateTableStatus]);

  const sendToKitchen = useCallback(async (orderData: {
    tableId: string;
    tableName: string;
    items: CartItem[];
    employee: string;
    notes?: string;
  }) => {
    try {
      const idempotencyKey = crypto.randomUUID();
      const kitchenOrder = {
        source: 'POS_COUNTER',
        tableId: orderData.tableId,
        tableName: orderData.tableName,
        items: orderData.items.map(item => ({
          productId: item.id,
          productName: item.name,
          unitPrice: item.price,
          quantity: item.quantity,
          note: item.note,
          unit: item.unit
        })),
        employee: orderData.employee,
        note: orderData.notes,
        idempotencyKey,
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kitchenOrder)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Không lưu được đơn bếp.');
      setActivePOSOrderIds((current) => current.includes(result.orderId) ? current : [...current, result.orderId]);

      showNotification(`Đã gửi đơn ${String(result.orderId).slice(-6)} đến bếp!`);

      // Print kitchen receipt
      try {
        const { printReceiptWithSettings } = await import('../utils/receiptPrint');

        const kitchenReceiptData = {
          receiptNumber: result.orderId,
          date: new Date(),
          cashier: orderData.employee,
          customer: 'Đơn bếp',
          table: orderData.tableName,
          items: orderData.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
            notes: item.note
          })),
          subtotal: 0,
          discount: 0,
          total: 0,
          paid: 0,
          change: 0,
          notes: orderData.notes
        };

        await printReceiptWithSettings(kitchenReceiptData, 'kitchen');
      } catch (printError) {
        console.error('Error printing kitchen receipt:', printError);
      }
    } catch (error: any) {
      console.error('Error sending to kitchen:', error);
      showNotification(error?.message || 'Lỗi gửi đơn hàng đến bếp!', 'error');
      throw error;
    }
  }, [showNotification]);

  const settleQrOrder = useCallback((order: {
    id: string;
    table_id: string;
    table_name?: string;
    items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number; note?: string; size?: string; sugar?: string; ice?: string; unit?: string; image?: string }>;
  }) => {
    setSelectedTableId(order.table_id);
    setCart(order.items.map((item) => {
      // Tìm ảnh sản phẩm thật từ danh mục quán
      const foundProduct = products.find(p => p.IDSP === item.productId || p['Tên sản phẩm'] === item.productName);
      const realImage = item.image || foundProduct?.['Hình ảnh'] || undefined;

      return {
        id: item.productId,
        name: item.productName,
        price: Number(item.unitPrice),
        quantity: Number(item.quantity),
        unit: item.unit || foundProduct?.['Đơn vị tính'] || 'Ly',
        image: realImage,
        note: [item.size && `Size ${item.size}`, item.sugar && `Đường ${item.sugar}`, item.ice && `Đá ${item.ice}`, item.note].filter(Boolean).join(' · '),
      };
    }));
    setActivePOSOrderIds([order.id]);
    setSelectedCustomer(null);
    setShowCheckoutModal(true);
  }, [setSelectedTableId, setCart, products]);

  // Nhận đơn QR và nạp món vào giỏ hàng của bàn
  const acceptQrOrder = useCallback((order: {
    id: string;
    table_id: string;
    table_name?: string;
    items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number; note?: string; size?: string; sugar?: string; ice?: string; unit?: string; image?: string }>;
  }) => {
    setSelectedTableId(order.table_id);
    const convertedItems: CartItem[] = order.items.map((item) => {
      const foundProduct = products.find(p => p.IDSP === item.productId || p['Tên sản phẩm'] === item.productName);
      const realImage = item.image || foundProduct?.['Hình ảnh'] || undefined;

      return {
        id: item.productId,
        name: item.productName,
        price: Number(item.unitPrice),
        quantity: Number(item.quantity),
        unit: item.unit || foundProduct?.['Đơn vị tính'] || 'Ly',
        image: realImage,
        note: [item.size && `Size ${item.size}`, item.sugar && `Đường ${item.sugar}`, item.ice && `Đá ${item.ice}`, item.note].filter(Boolean).join(' · '),
      };
    });

    setCart(convertedItems);
    setActiveOrders((prev) => new Map(prev).set(order.table_id, convertedItems));
    void fetch('/api/pos/cart-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: order.table_id,
        cart: convertedItems,
        selectedCustomer: null,
      }),
    }).catch((err) => console.warn('Lỗi lưu draft đơn QR:', err));

    setActivePOSOrderIds((prev) => prev.includes(order.id) ? prev : [...prev, order.id]);
    updateTableStatus(order.table_id, 'Đang sử dụng');
    showNotification(`Đã nhận đơn và nạp các món vào ${order.table_name || 'bàn'}!`);
  }, [setSelectedTableId, setCart, setActiveOrders, products, updateTableStatus, showNotification]);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    try {
      const response = await authUtils.apiRequest('KHACHHANG', 'getall', {});
      const customerList = Array.isArray(response) ? response : [];
      const activeCustomers = customerList.filter(customer =>
        customer['Trạng thái'] === 'Hoạt động'
      );
      setCustomers(activeCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }, []);

  // Modal handlers
  const updateModalState = useCallback((updates: Partial<ModalState>) => {
    setModalState(prev => ({ ...prev, ...updates }));
  }, []);

  const setShowTableModal = useCallback((show: boolean) => {
    updateModalState({ showTableModal: show });
  }, [updateModalState]);

  const setShowCheckoutModal = useCallback((show: boolean) => {
    updateModalState({ showCheckoutModal: show });
  }, [updateModalState]);

  const setShowTransferModal = useCallback((show: boolean) => {
    updateModalState({ showTransferModal: show });
  }, [updateModalState]);

  const setShowNoteModal = useCallback((show: boolean) => {
    updateModalState({ showNoteModal: show });
  }, [updateModalState]);

  const setShowClearConfirmation = useCallback((show: boolean) => {
    updateModalState({ showClearConfirmation: show });
  }, [updateModalState]);

  const setSelectedItemForNote = useCallback((item: CartItem | null) => {
    updateModalState({ selectedItemForNote: item });
  }, [updateModalState]);

  const setNoteInput = useCallback((note: string) => {
    updateModalState({ noteInput: note });
  }, [updateModalState]);

  // Customer handlers (Mục #10: Đồng bộ khách hàng theo bàn)
  const handleSelectCustomer = useCallback((customer: Customer | null) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(false);
    if (selectedTableId) {
      tableCustomersRef.current.set(selectedTableId, customer);
    }
    if (customer) {
      showNotification(`Đã chọn khách hàng: ${customer['Tên khách hàng']}`);
    } else {
      showNotification('Đã chọn khách lẻ');
    }
  }, [selectedTableId, showNotification]);

  const updateCustomerDisplay = useCallback((cartData = cart, tableInfo: Table | null = null) => {
    if (!customerDisplayWindow.current || customerDisplayWindow.current.closed) return;

    try {
      const total = cartData.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const currentTable = tableInfo || tables.find(t => t.IDBAN === selectedTableId);
      const tableData = currentTable ? {
        id: currentTable.IDBAN,
        name: currentTable['Tên bàn'],
        capacity: currentTable['Sức chứa tối đa'],
        status: currentTable['Trạng thái']
      } : null;

      customerDisplayWindow.current.postMessage({
        type: 'updateCart',
        cart: cartData,
        totals: {
          subtotal: total,
          vat: total * 0.1,
          discount: 0,
          total: total * 1.1
        },
        tableInfo: tableData,
        customer: selectedCustomer
      }, window.location.origin);
    } catch (error) {
      console.error('Lỗi khi cập nhật màn hình phụ:', error);
    }
  }, [cart, tables, selectedTableId, selectedCustomer]);

  // Cart operations
  const addToCart = useCallback((
    productId: string,
    options?: { size?: string; sugar?: string; ice?: string; toppings?: string[]; note?: string }
  ) => {
    if (!selectedTableId) {
      showNotification('Vui lòng chọn bàn trước khi gọi món!', 'error');
      setShowTableModal(true);
      return;
    }

    const product = products.find(p => p.IDSP === productId);
    if (!product) {
      showNotification('Không tìm thấy sản phẩm!', 'error');
      return;
    }

    addItemToCart(product, options);
    updateCustomerDisplay();
  }, [selectedTableId, products, addItemToCart, showNotification, setShowTableModal, updateCustomerDisplay]);

  // Table operations
  const selectTable = useCallback((tableId: string) => {
    const table = tables.find(t => t.IDBAN === tableId);
    if (!table) return;

    // Save current cart & customer if exists
    if (selectedTableId) {
      if (cart.length > 0) {
        const newActiveOrders = new Map(activeOrders);
        newActiveOrders.set(selectedTableId, [...cart]);
        setActiveOrders(newActiveOrders);
      }
      tableCustomersRef.current.set(selectedTableId, selectedCustomer);
    }

    // Update selected table
    setSelectedTableId(tableId);

    // Load cart for this table
    const tableCart = activeOrders.get(tableId) || [];
    setCart(tableCart);

    // Khôi phục khách hàng đã chọn của bàn này (Mục #10)
    const existingCustomer = tableCustomersRef.current.get(tableId) || null;
    setSelectedCustomer(existingCustomer);

    // Update table status if needed (chỉ cập nhật Đang sử dụng nếu bàn thực sự có món)
    if (table['Tên bàn'] !== 'Khách mua về' && tableCart.length > 0 && table['Trạng thái sử dụng'] !== 'Đang sử dụng') {
      updateTableStatus(tableId, 'Đang sử dụng');
    }

    // Update customer display
    updateCustomerDisplay(tableCart, table);

    showNotification(`Đã chuyển sang ${table['Tên bàn']}`);
    setShowTableModal(false);
  }, [tables, selectedTableId, cart, activeOrders, selectedCustomer, setActiveOrders, setSelectedTableId, setCart, updateTableStatus, updateCustomerDisplay, showNotification, setShowTableModal]);

  // Transfer table
  const transferTable = useCallback(async (targetTableId: string) => {
    try {
      showLoading('Đang chuyển bàn...');
      cancelPendingAutosave();

      const sourceTableId = selectedTableId;
      if (!sourceTableId || !targetTableId) {
        throw new Error('Vui lòng chọn bàn nguồn và bàn đích hợp lệ!');
      }

      const sourceTable = tables.find(t => t.IDBAN === sourceTableId);
      const targetTable = tables.find(t => t.IDBAN === targetTableId);

      const res = await fetch('/api/pos/transfer-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTableId,
          targetTableId,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Có lỗi xảy ra khi chuyển bàn trên máy chủ!');
      }

      // Update in-memory orders & customer
      const newActiveOrders = new Map(activeOrders);
      newActiveOrders.set(targetTableId, [...cart]);
      newActiveOrders.delete(sourceTableId);
      setActiveOrders(newActiveOrders);

      const currentCust = tableCustomersRef.current.get(sourceTableId) || selectedCustomer;
      tableCustomersRef.current.set(targetTableId, currentCust);
      tableCustomersRef.current.delete(sourceTableId);

      // Cập nhật trạng thái hiển thị bàn
      if (sourceTable && sourceTable['Tên bàn'] !== 'Khách mua về') {
        updateTableStatus(sourceTableId, 'Trống');
      }
      if (targetTable && targetTable['Tên bàn'] !== 'Khách mua về') {
        updateTableStatus(targetTableId, 'Đang sử dụng');
      }

      // Update selected table
      setSelectedTableId(targetTableId);

      // Update customer display
      updateCustomerDisplay(cart, targetTable);

      showNotification(`Đã chuyển từ ${sourceTable?.['Tên bàn']} sang ${targetTable?.['Tên bàn']}`);
      setShowTransferModal(false);

    } catch (error: any) {
      console.error('Lỗi chuyển bàn:', error);
      showNotification(error.message || 'Có lỗi xảy ra khi chuyển bàn!', 'error');
    }
  }, [selectedTableId, tables, cart, activeOrders, selectedCustomer, setActiveOrders, setSelectedTableId, updateTableStatus, cancelPendingAutosave, updateCustomerDisplay, showNotification, setShowTransferModal, showLoading]);

  // Payment operations with customer integration
  const saveInvoice = useCallback(async (invoice: any, details: any[]) => {
    try {
      const invoiceResult = await authUtils.addHoaDon(invoice);
      if (Array.isArray(invoiceResult) || !invoiceResult.success) {
        const msg = !Array.isArray(invoiceResult) ? invoiceResult.message : 'Unknown error';
        throw new Error('Không thể lưu hóa đơn: ' + (msg || 'Unknown error'));
      }

      const detailPromises = details.map(async (detail, index) => {
        try {
          const detailResult = await authUtils.addHoaDonDetail(detail);
          if (Array.isArray(detailResult) || !detailResult.success) {
            const msg = !Array.isArray(detailResult) ? detailResult.message : 'Unknown error';
            throw new Error(`Lỗi lưu chi tiết ${index + 1}: ${msg || 'Unknown error'}`);
          }
          return detailResult;
        } catch (error) {
          console.error(`Error saving detail ${index}:`, error);
          throw error;
        }
      });

      await Promise.all(detailPromises);
      return { success: true };
    } catch (error) {
      console.error('Lỗi lưu hóa đơn:', error);
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Lỗi lưu dữ liệu: ${msg}`);
    }
  }, []);

  // Update customer after purchase
  const updateCustomerAfterPurchase = useCallback(async (customer: Customer, invoiceTotal: number, invoiceId: string, debtAmount: number = 0) => {
    try {
      const newPoints = calculatePointsFromSpending(invoiceTotal, customer['Loại khách hàng']);
      const currentPoints = Number(customer['Điểm tích lũy']) || 0;
      const currentSpending = Number(customer['Tổng chi tiêu']) || 0;
      const currentDebt = Number(customer['Công nợ']) || 0;
      const newTotalSpending = currentSpending + invoiceTotal;
      const newTotalDebt = Math.max(0, currentDebt + (Number(debtAmount) || 0));
      let newCustomerType = customer['Loại khách hàng'];

      if (newTotalSpending >= 50000000 && newCustomerType !== 'Khách kim cương') {
        newCustomerType = 'Khách kim cương';
        showNotification(`Khách hàng ${customer['Tên khách hàng']} đã được nâng cấp lên Khách kim cương!`, 'success');
      } else if (newTotalSpending >= 20000000 && newCustomerType === 'Khách thường') {
        newCustomerType = 'Khách VIP';
        showNotification(`Khách hàng ${customer['Tên khách hàng']} đã được nâng cấp lên Khách VIP!`, 'success');
      }

      const customerId = customer.IDKHACHHANG || customer.IDKH || customer.id;
      const updatedHistory = customer['Lịch sử mua hàng']
        ? `${customer['Lịch sử mua hàng']}, ${invoiceId}`
        : invoiceId;

      await authUtils.apiRequest('KHACHHANG', 'update', {
        IDKHACHHANG: customerId,
        IDKH: customerId,
        'Điểm tích lũy': currentPoints + newPoints,
        'Tổng chi tiêu': newTotalSpending,
        'Công nợ': newTotalDebt,
        'Loại khách hàng': newCustomerType,
        'Lịch sử mua hàng': updatedHistory,
        'Lần mua cuối': formatToVietnameseDateTime(new Date())
      });

      if (debtAmount > 0) {
        showNotification(`Đã ghi nợ ${new Intl.NumberFormat('vi-VN').format(debtAmount)}đ cho khách ${customer['Tên khách hàng']}. Tổng nợ: ${new Intl.NumberFormat('vi-VN').format(newTotalDebt)}đ`, 'success');
      } else if (newPoints > 0) {
        showNotification(`Khách hàng được tích lũy thêm ${newPoints} điểm!`);
      }
    } catch (error) {
      console.error('Lỗi cập nhật thông tin khách hàng:', error);
    }
  }, [showNotification]);

  // Process payment
  const processPayment = useCallback(async (paymentData: any) => {
    try {
      setIsProcessingPayment(true);
      showLoading('Đang xử lý thanh toán...');
      cancelPendingAutosave();

      const invoiceId = paymentData.id || generateId('INV');
      const payType = paymentData.paymentType || paymentData.paymentMethod || 'Tiền mặt';
      const isDebt = payType === 'Ghi nợ' || (paymentData.debtAmount && paymentData.debtAmount > 0);
      const paidAmount = isDebt ? (Number(paymentData.paidAmount) || 0) : (Number(paymentData.paidAmount) || paymentData.total);
      const debtAmount = isDebt ? Math.max(0, paymentData.total - paidAmount) : 0;
      const invoiceStatus = isDebt ? (debtAmount >= paymentData.total ? 'Ghi nợ' : 'Nợ một phần') : 'Đã hoàn thành';

      const invoice = {
        IDHD: invoiceId,
        IDHOADON: invoiceId,
        'Thời gian': formatToVietnameseDateTime(new Date()),
        'Tổng số lượng': cart.reduce((sum, item) => sum + item.quantity, 0),
        'Tổng tiền': paymentData.total,
        'Ghi chú': paymentData.note || '',
        'Mã bàn': selectedTableId || 'Khách mua về',
        'Thu ngân': nhanvien,
        'Trạng thái': invoiceStatus,
        'Hình thức thanh toán': payType,
        'Loại thanh toán': payType,
        'Mã khách hàng': selectedCustomer ? (selectedCustomer.IDKHACHHANG || selectedCustomer.IDKH || '') : '',
        'Tên khách hàng': selectedCustomer ? selectedCustomer['Tên khách hàng'] : 'Khách lẻ',
        'Số điện thoại': selectedCustomer ? selectedCustomer['Số điện thoại'] : '',
        'Ưu đãi': paymentData.customerDiscount || 0,
        'Tiền khách đưa': paidAmount,
        'Khách trả': paidAmount,
        'Tiền thối': isDebt ? 0 : (paymentData.change || 0),
        'Tiền thừa': isDebt ? 0 : (paymentData.change || 0),
        'Tiền nợ': debtAmount,
        'Đã thanh toán': paidAmount
      };

      const details = cart.map(item => ({
        IDHD: invoiceId,
        IDSP: item.id,
        'Số lượng': item.quantity,
        'Đơn giá': item.price,
        'Thành tiền': item.price * item.quantity,
        'Ghi chú': item.note || ''
      }));

      // Chuyển toàn bộ đơn POS/QR liên quan sang đã thanh toán
      const checkoutRes = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: activePOSOrderIds,
          linkedOrderIds: activePOSOrderIds,
          tableId: selectedTableId,
          tableName: selectedTableName,
          items: cart,
          totalAmount: paymentData.total,
          employee: nhanvien,
        }),
      });

      if (!checkoutRes.ok) {
        console.warn('Lỗi ghi nhận checkout trạng thái pos_orders');
      }

      await saveInvoice(invoice, details);

      if (selectedCustomer) {
        await updateCustomerAfterPurchase(selectedCustomer, paymentData.total, invoiceId, debtAmount);
      }

      try {
        const receiptData = {
          receiptNumber: invoiceId,
          date: new Date(),
          cashier: nhanvien,
          customer: selectedCustomer ? selectedCustomer['Tên khách hàng'] : 'Khách lẻ',
          customerInfo: selectedCustomer ? {
            name: selectedCustomer['Tên khách hàng'],
            phone: selectedCustomer['Số điện thoại'],
            type: selectedCustomer['Loại khách hàng'],
            points: Number(selectedCustomer['Điểm tích lũy']) || 0
          } : null,
          table: selectedTableName,
          items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
            notes: item.note
          })),
          subtotal: paymentData.subtotal,
          vat: paymentData.vat,
          discount: paymentData.customerDiscount || 0,
          total: paymentData.total,
          paid: paymentData.paidAmount,
          change: paymentData.change,
          paymentMethod: paymentData.paymentMethod || 'Tiền mặt',
          notes: paymentData.note
        };

        const { printReceiptWithSettings } = await import('../utils/receiptPrint');
        await printReceiptWithSettings(receiptData, 'pos');
      } catch (printError) {
        console.error('Error printing receipt:', printError);
      }

      // Xóa draft sau khi thanh toán thành công
      await clearSharedCartDraft();

      if (selectedTableId && selectedTableName !== 'Khách mua về') {
        const newActiveOrders = new Map(activeOrders);
        newActiveOrders.delete(selectedTableId);
        setActiveOrders(newActiveOrders);
        tableCustomersRef.current.delete(selectedTableId);
        updateTableStatus(selectedTableId, 'Trống');
      }

      clearLocalCart();
      setActivePOSOrderIds([]);
      setSelectedCustomer(null);
      setShowCheckoutModal(false);

      // Phát event để QROrderInbox xóa đơn tức thì
      if (typeof window !== 'undefined' && activePOSOrderIds.length > 0) {
        window.dispatchEvent(new CustomEvent('pos_order_settled', { detail: { orderIds: activePOSOrderIds } }));
      }
      showNotification(isDebt ? `Ghi nợ đơn hàng thành công! (Nợ: ${new Intl.NumberFormat('vi-VN').format(debtAmount)}đ)` : 'Thanh toán thành công!');
    } catch (error: any) {
      console.error('Lỗi thanh toán:', error);
      showNotification(error.message || 'Lỗi khi xử lý thanh toán!', 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  }, [cart, selectedTableId, selectedTableName, nhanvien, selectedCustomer, activePOSOrderIds, saveInvoice, updateCustomerAfterPurchase, clearSharedCartDraft, activeOrders, setActiveOrders, updateTableStatus, clearLocalCart, showNotification, showLoading, cancelPendingAutosave]);

  // Data synchronization (Mục #18 & Tối ưu thông báo số lượng chi tiết)
  const syncData = useCallback(async () => {
    const startTime = performance.now();
    try {
      showLoading('Đang đồng bộ dữ liệu...');
      const [prods, tbls, custs, drafts] = await Promise.all([
        fetchProducts(),
        fetchTables(),
        fetchCustomers(),
        fetchAllCartDrafts(),
      ]);
      const elapsed = Math.round(performance.now() - startTime);

      const prodCount = Array.isArray(prods) ? prods.length : (products?.length || 0);
      const tblCount = Array.isArray(tbls) ? tbls.length : (tables?.length || 0);
      const custCount = Array.isArray(custs) ? custs.length : (customers?.length || 0);
      const draftList = Array.isArray(drafts) ? drafts : [];
      const draftCount = draftList.filter((d: any) => Array.isArray(d?.cart) && d.cart.length > 0).length;

      const summaryMsg = `Đã đồng bộ (${elapsed}ms): ${prodCount} món · ${tblCount} bàn · ${draftCount} bàn có giỏ · ${custCount} khách hàng`;
      showNotification(summaryMsg);
    } catch (error) {
      console.error('Lỗi đồng bộ:', error);
      showNotification('Lỗi đồng bộ dữ liệu. Vui lòng thử lại!', 'error');
    }
  }, [fetchProducts, fetchTables, fetchCustomers, fetchAllCartDrafts, products, tables, customers, showLoading, showNotification]);

  // Keyboard shortcuts
  const handleKeyboardShortcuts = useCallback((e: KeyboardEvent) => {
    switch (true) {
      case e.key === 'F4':
        e.preventDefault();
        if (cart.length > 0 && selectedTableId) {
          setShowCheckoutModal(true);
        } else if (cart.length === 0) {
          showNotification('Giỏ hàng trống!', 'error');
        } else if (!selectedTableId) {
          showNotification('Vui lòng chọn bàn trước khi thanh toán!', 'error');
        }
        break;

      case e.key === 'Escape':
        e.preventDefault();
        if (cart.length > 0) {
          setShowClearConfirmation(true);
        }
        break;

      case e.key === 'F1':
        e.preventDefault();
        resetFilters();
        break;

      case e.key === 'F5':
        e.preventDefault();
        syncData();
        break;

      case e.key === 'F3':
        e.preventDefault();
        setShowCustomerModal(true);
        break;
    }
  }, [cart.length, selectedTableId, setShowCheckoutModal, showNotification, setShowClearConfirmation, resetFilters, syncData]);

  // Initialize app (Mục #18)
  useEffect(() => {
    const initializeApp = async () => {
      try {
        showLoading('Đang tải...');

        // Restore saved state if exists
        const savedState = localStorage.getItem('posState');
        if (savedState) {
          try {
            const state = JSON.parse(savedState);
            setActiveOrders(new Map(state.activeOrders));
            setSelectedTableId(state.selectedTableId);
          } catch (parseError) {
            console.error('Lỗi khôi phục trạng thái:', parseError);
          }
        }

        // Fetch initial data & all cart drafts
        await Promise.all([
          fetchProducts(),
          fetchTables(),
          fetchCustomers(),
          fetchAllCartDrafts(),
        ]);

        showNotification('Khởi tạo POS thành công!');
      } catch (error) {
        console.error('Lỗi khởi tạo:', error);
        showNotification('Không thể khởi tạo POS. Vui lòng thử lại!', 'error');
      }
    };

    initializeApp();

    window.addEventListener('keydown', handleKeyboardShortcuts);

    const handleBeforeUnload = () => {
      const state = {
        activeOrders: Array.from(activeOrders.entries()),
        selectedTableId,
      };
      localStorage.setItem('posState', JSON.stringify(state));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcuts);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (customerDisplayWindow.current && !customerDisplayWindow.current.closed) {
        customerDisplayWindow.current.close();
      }
    };
  }, []);

  // Calculate totals (Tính VAT động theo cấu hình hệ thống - Mục #4)
  const vatSettings = getVatSettings();
  const vatRate = vatSettings.enabled ? (vatSettings.ratePercent / 100) : 0;
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const vat = subtotal * vatRate;
  let total = subtotal + vat;

  let customerDiscount = 0;
  if (selectedCustomer) {
    const customerType = selectedCustomer['Loại khách hàng'];
    if (customerType === 'Khách kim cương') {
      customerDiscount = subtotal * 0.2;
    } else if (customerType === 'Khách VIP') {
      customerDiscount = subtotal * 0.1;
    }
  }

  const finalTotal = total - customerDiscount;

  return {
    // State
    products,
    filteredProducts,
    tables,
    cart,
    selectedTableId,
    activeOrders,
    isLoading,
    loadingText,
    categories,
    searchTerm,
    categoryFilter,
    priceFilter,
    isProcessingPayment,
    sharedCartStatus,
    realtimeStatus,
    lastSyncAt,
    conflictData,
    resolveConflict,
    canCheckout,
    presenceByTable,

    // Customer state
    customers,
    selectedCustomer,
    showCustomerModal,
    setShowCustomerModal,
    handleSelectCustomer,

    // Modal state
    ...modalState,
    showTableQRModal,
    setShowTableQRModal,

    // Modal setters
    setShowTableModal,
    setShowCheckoutModal,
    setShowTransferModal,
    setShowNoteModal,
    setShowClearConfirmation,
    setSelectedItemForNote,
    setNoteInput,

    // Filter setters
    setSearchTerm,
    setCategoryFilter,
    setPriceFilter,

    // Operations
    addToCart,
    removeFromCart,
    adjustQuantity,
    clearCart,
    selectTable,
    transferTable,
    processPayment,
    syncData,
    resetFilters,
    updateCartItemNote,
    updateItemsPrintStatus,
    sendToKitchen,
    settleQrOrder,
    acceptQrOrder,

    // Calculations
    subtotal,
    vat,
    total: finalTotal,
    customerDiscount,
    selectedTableName,

    // Utilities
    showNotification
  };
};
