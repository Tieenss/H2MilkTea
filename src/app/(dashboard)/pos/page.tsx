'use client';

import React, { useMemo, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Search, RefreshCw, Users, Filter, X, GalleryVertical, QrCode, ChefHat, ArrowRightLeft, ShoppingBag } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from './utils/formatters';

import { usePOS } from './hooks/usePOS';
import { BarcodeScanner } from './components/BarcodeScanner';
import { ProductGrid } from './components/ProductGrid';
import { CartSidebar } from './components/CartSidebar';
import { TableModal } from './components/TableModal';
import { CheckoutModal } from './components/CheckoutModal';
import { TransferModal } from './components/TransferModal';
import { NoteModal } from './components/NoteModal';
import { ReceiptSettings } from './components/ReceiptSettings';
import { TableQRModal } from './components/TableQRModal';
import './styles/pos.css';
import { CustomerSelectModal } from '@/app/(dashboard)/pos/components/CustomerSelectModal';
import { QROrderInbox } from './components/QROrderInbox';
import type { Customer } from '@/app/(dashboard)/khachhang/types/customer';
// POSAssistant moved to GlobalAssistant across all dashboard pages (Mục #16)
import { CartConflictModal } from './components/CartConflictModal';
import { getPendingOfflineCount, syncPendingCheckouts } from '@/lib/offline/offlineSyncQueue';
import { useFeatureFlags } from '@/lib/settings/useFeatureFlags';

export default function POSPage() {
  const {
    // ... existing props
    filteredProducts,
    products,
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
    selectedCustomer,
    showCustomerModal,
    setShowCustomerModal,
    handleSelectCustomer,
    showTableModal,
    showCheckoutModal,
    showTransferModal,
    showNoteModal,
    showClearConfirmation,
    showTableQRModal,
    setShowTableQRModal,
    selectedItemForNote,
    noteInput,
    setShowTableModal,
    setShowCheckoutModal,
    setShowTransferModal,
    setShowNoteModal,
    setShowClearConfirmation,
    setSearchTerm,
    setCategoryFilter,
    setPriceFilter,
    setNoteInput,
    setSelectedItemForNote,
    updateCartItemNote,
    addToCart,
    removeFromCart,
    adjustQuantity,
    clearCart,
    updateItemsPrintStatus,
    updateItemsKitchenStatus,
    selectTable,
    transferTable,
    processPayment,
    sendToKitchen,
    settleQrOrder,
    acceptQrOrder,
    syncData,
    resetFilters,
    subtotal,
    vat,
    total,
    customerDiscount,
    selectedTableName,
    sharedCartStatus,
    realtimeStatus,
    lastSyncAt,
    conflictData,
    resolveConflict,
    canCheckout,
    presenceByTable,
    nhanvien,
  } = usePOS();

  const { isFeatureEnabled } = useFeatureFlags();
  const canUseBarcodeScanner = isFeatureEnabled('pos_barcode_scanner');
  const canUseToppingModal = isFeatureEnabled('pos_topping_modal');
  const canUseTransferTable = isFeatureEnabled('pos_transfer_table');
  const canUseQrInbox = isFeatureEnabled('pos_qr_inbox');
  const canUseKitchenPrint = isFeatureEnabled('pos_kitchen_print');
  // Mobile state for showing/hiding cart
  const [showMobileCart, setShowMobileCart] = React.useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = React.useState(false);

  // Lắng nghe sự kiện duyệt đơn từ Trợ lý AI (GlobalAssistant)
  React.useEffect(() => {
    const handleAiApply = (e: any) => {
      const detail = e.detail;
      if (!detail) return;

      const { action, targetTable, items } = detail;

      // 1. Chuyển sang bàn mục tiêu nếu có
      if (targetTable?.id) {
        selectTable(targetTable.id);
      }

      // 2. Thêm hoặc bớt món
      if (action === 'add' && Array.isArray(items) && items.length > 0) {
        items.forEach((item: any) => {
          const qty = Math.max(1, Number(item.quantity) || 1);
          for (let i = 0; i < qty; i++) {
            addToCart(item.productId, {
              size: item.size,
              sugar: item.sugar,
              ice: item.ice,
              toppings: item.toppings,
              note: item.note,
            });
          }
        });
        toast.success(`Đã nạp ${items.length} món từ Trợ lý AI vào ${targetTable?.name || 'bàn'}!`);
      } else if (action === 'remove' && Array.isArray(items) && items.length > 0) {
        items.forEach((item: any) => {
          const qty = Math.max(1, Number(item.quantity) || 1);
          adjustQuantity(item.productId, -qty);
        });
        toast.success(`Đã bớt món theo lệnh của Trợ lý AI!`);
      } else if (action === 'select_table') {
        toast.success(`Đã chuyển sang ${targetTable?.name || 'bàn'}!`);
      } else if (action === 'send_kitchen') {
        if (!selectedTableId) {
          toast.error('Vui lòng chọn một bàn trước khi gửi bếp!');
          return;
        }
        if (cart.length === 0) {
          toast.error('Giỏ hàng đang trống, chưa có món để gửi bếp!');
          return;
        }
        void sendToKitchen({
          tableId: selectedTableId,
          tableName: selectedTableName,
          items: cart,
          employee: nhanvien || 'Thu ngân',
        });
      } else if (action === 'checkout') {
        if (cart.length === 0) {
          toast.error('Giỏ hàng đang trống, không thể thanh toán!');
          return;
        }
        setShowCheckoutModal(true);
      } else if (action === 'clear_cart') {
        clearCart();
        toast.success('Đã dọn sạch giỏ hàng theo lệnh AI!');
      } else if (action === 'print_labels') {
        window.dispatchEvent(new CustomEvent('h2_pos_trigger_print_labels'));
      } else if (action === 'print_receipt') {
        window.dispatchEvent(new CustomEvent('h2_pos_trigger_print_receipt'));
      }
    };

    window.addEventListener('h2_pos_ai_apply', handleAiApply);

    // Kiểm tra pending AI order nếu được duyệt từ một trang khác chuyển sang
    try {
      const pendingStr = localStorage.getItem('h2_pending_ai_pos_order');
      if (pendingStr) {
        localStorage.removeItem('h2_pending_ai_pos_order');
        const pending = JSON.parse(pendingStr);
        if (pending) {
          setTimeout(() => {
            handleAiApply(new CustomEvent('h2_pos_ai_apply', { detail: pending }));
          }, 350);
        }
      }
    } catch (err) {
      console.warn('Lỗi xử lý pending AI order:', err);
    }

    return () => {
      window.removeEventListener('h2_pos_ai_apply', handleAiApply);
    };
  }, [selectTable, addToCart, adjustQuantity]);

  // Quản lý hàng đợi hóa đơn ngoại tuyến (Local-First Offline Resilience)
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

  useEffect(() => {
    setPendingOfflineCount(getPendingOfflineCount());
    const handler = (e: any) => {
      setPendingOfflineCount(e.detail?.count ?? getPendingOfflineCount());
    };
    window.addEventListener('h2_offline_queue_changed', handler);
    return () => window.removeEventListener('h2_offline_queue_changed', handler);
  }, []);

  const handleManualSyncOffline = async () => {
    if (isSyncingOffline) return;
    setIsSyncingOffline(true);
    toast.loading('Đang đồng bộ đơn ngoại tuyến lên máy chủ...', { id: 'offline-sync' });
    try {
      const { successCount, remainingCount } = await syncPendingCheckouts();
      if (successCount > 0) {
        toast.success(`Đã đồng bộ thành công ${successCount} đơn hàng!`, { id: 'offline-sync' });
      } else if (remainingCount > 0) {
        toast.error(`Chưa thể đồng bộ ${remainingCount} đơn (mạng chưa ổn định).`, { id: 'offline-sync' });
      } else {
        toast.success('Hàng đợi ngoại tuyến đã được đồng bộ sạch!', { id: 'offline-sync' });
      }
    } catch {
      toast.error('Lỗi khi đồng bộ đơn ngoại tuyến!', { id: 'offline-sync' });
    } finally {
      setIsSyncingOffline(false);
    }
  };

  const sharedCartLabel =
    sharedCartStatus === 'connected'
      ? `Đồng bộ giỏ hàng (${realtimeStatus})`
      : sharedCartStatus === 'syncing'
        ? `Đang đồng bộ giỏ hàng (${realtimeStatus})...`
        : sharedCartStatus === 'loading'
          ? 'Đang tải giỏ hàng bàn...'
          : sharedCartStatus === 'conflict'
            ? 'Xung đột giỏ hàng — cần xử lý'
            : sharedCartStatus === 'offline'
              ? 'Giỏ hàng ngoại tuyến'
              : `Đồng bộ giỏ hàng (${realtimeStatus})`;

  const sharedCartToneClass =
    sharedCartStatus === 'conflict'
      ? 'text-rose-700 bg-rose-50/70 border-b border-rose-100'
      : sharedCartStatus === 'offline'
        ? 'text-amber-700 bg-amber-50/70 border-b border-amber-100'
        : sharedCartStatus === 'syncing' || sharedCartStatus === 'loading'
          ? 'text-blue-700 bg-blue-50/40 border-b border-slate-100'
          : 'text-emerald-700 bg-emerald-50/40 border-b border-slate-100';

  // Đếm số lượng bàn đang có đơn hàng chưa thanh toán (chỉ tính các bàn đang thực sự tồn tại trong quán)
  const unpaidTablesCount = useMemo(() => {
    let count = 0;
    const countedTableIds = new Set<string>();

    tables.forEach(table => {
      const byId = activeOrders.get(table.IDBAN);
      const byName = activeOrders.get(table['Tên bàn']);
      const items = (byId && byId.length > 0) ? byId : ((byName && byName.length > 0) ? byName : []);
      
      if (items.length > 0) {
        countedTableIds.add(table.IDBAN);
        count++;
      }
    });

    if (selectedTableId && cart.length > 0 && !countedTableIds.has(selectedTableId)) {
      const isExistingTable = tables.some(t => t.IDBAN === selectedTableId || t['Tên bàn'] === selectedTableId);
      if (isExistingTable) {
        count++;
      }
    }

    return count;
  }, [tables, activeOrders, selectedTableId, cart]);

  const currentTablePresence = selectedTableId ? presenceByTable?.get(selectedTableId) : undefined;
  const totalCartItemsCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  return (
    <div className="bg-background h-full flex flex-col min-h-0 overflow-hidden relative">
      {/* Status Bar - Khóa chiều cao cố định h-8, cuộn ngang mượt trên màn hình nhỏ */}
      <div
        className={`h-8 px-2.5 flex items-center justify-between gap-2 text-xs shrink-0 overflow-x-auto no-scrollbar transition-colors duration-200 select-none ${sharedCartToneClass}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-1.5 min-w-0 shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              sharedCartStatus === 'conflict'
                ? 'bg-rose-500 animate-ping'
                : sharedCartStatus === 'offline'
                  ? 'bg-amber-500'
                  : sharedCartStatus === 'syncing' || sharedCartStatus === 'loading'
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-emerald-500'
            }`}
          />
          <span className="font-medium whitespace-nowrap">{sharedCartLabel}</span>
          {lastSyncAt && (
            <span className="text-slate-500 hidden md:inline whitespace-nowrap">
              · Cập nhật lúc {lastSyncAt.toLocaleTimeString('vi-VN')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {pendingOfflineCount > 0 && (
            <button
              type="button"
              onClick={handleManualSyncOffline}
              disabled={isSyncingOffline}
              className="h-6 px-2 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all animate-pulse whitespace-nowrap shrink-0"
              title="Đang có hóa đơn được lưu ngoại tuyến khi mất mạng. Nhấn để đồng bộ lên máy chủ ngay."
            >
              <span>⚡ {pendingOfflineCount} đơn chờ đồng bộ</span>
            </button>
          )}
          {currentTablePresence && currentTablePresence.customerCount > 0 && (
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 animate-pulse hidden sm:inline-flex items-center gap-1 whitespace-nowrap shrink-0">
              <span>📱</span>
              <span>{currentTablePresence.customerCount} khách đang xem</span>
            </span>
          )}
          {selectedTableName && (
            <button
              type="button"
              onClick={() => setShowTableModal(true)}
              className="shrink-0 inline-flex items-center gap-1.5 h-6 px-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-md shadow-2xs transition-all transform active:scale-95 group cursor-pointer whitespace-nowrap"
              title="Nhấn để đổi bàn đang phục vụ"
            >
              <span className="text-[11px] font-black tracking-tight text-white flex items-center gap-1">
                <span>🪑</span>
                <span>{selectedTableName}</span>
              </span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded text-white font-bold group-hover:bg-white/30 transition-colors">
                Đổi
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile & Tablet Portrait Header (< 1024px) - Khóa kích thước nút & Cuộn ngang mượt 100% không khuất tính năng */}
      <div className="block lg:hidden shrink-0">
        <Card className="p-2 border-b rounded-none shadow-2xs space-y-1.5">
          {/* Hàng 1: Thanh cuộn ngang chứa toàn bộ nút công cụ POS với kích thước khóa cứng h-9 px-2.5 text-xs whitespace-nowrap shrink-0 */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-nowrap">
            <Button
              type="button"
              onClick={() => setShowTableModal(true)}
              variant="outline"
              size="sm"
              className="h-9 px-2.5 text-xs whitespace-nowrap shrink-0 border-purple-200 text-purple-700 hover:bg-purple-50 font-semibold flex items-center gap-1"
              title={unpaidTablesCount > 0 ? `Đang có ${unpaidTablesCount} bàn có đơn chưa thanh toán` : 'Chọn bàn'}
            >
              <GalleryVertical className="w-3.5 h-3.5 shrink-0" />
              <span>{selectedTableName || 'Chọn bàn'}</span>
              {unpaidTablesCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-bold text-white bg-amber-500 rounded-full shadow-2xs">
                  {unpaidTablesCount}
                </span>
              )}
            </Button>

            {canUseQrInbox && selectedTableId && selectedTableName !== 'Khách mua về' && (
              <Button
                type="button"
                onClick={() => setShowTableQRModal(true)}
                variant="outline"
                size="sm"
                className="h-9 px-2.5 text-xs whitespace-nowrap shrink-0 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold flex items-center gap-1"
                title="Mở mã QR đặt món của bàn này"
              >
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <span>QR Bàn</span>
              </Button>
            )}

            {canUseTransferTable && selectedTableId && (
              <Button
                type="button"
                onClick={() => setShowTransferModal(true)}
                variant="outline"
                size="sm"
                className="h-9 px-2.5 text-xs whitespace-nowrap shrink-0 border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold flex items-center gap-1"
                title="Chuyển hoặc gộp bàn"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
                <span>Chuyển bàn</span>
              </Button>
            )}

            <Button
              type="button"
              onClick={() => setShowCustomerModal(true)}
              variant="outline"
              size="sm"
              className="h-9 px-2.5 text-xs whitespace-nowrap shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="max-w-[100px] truncate">
                {selectedCustomer ? selectedCustomer['Tên khách hàng'] : 'Khách lẻ'}
              </span>
            </Button>

            <Button
              type="button"
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              variant={isSearchExpanded || searchTerm || categoryFilter !== 'all' || priceFilter !== 'all' ? 'default' : 'outline'}
              size="sm"
              className={`h-9 px-2.5 text-xs whitespace-nowrap shrink-0 flex items-center gap-1 ${
                isSearchExpanded || searchTerm || categoryFilter !== 'all' || priceFilter !== 'all'
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'border-gray-200 text-gray-700'
              }`}
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span>Tìm & Lọc</span>
            </Button>

            <div className="shrink-0">
              <ReceiptSettings />
            </div>

            <Button
              type="button"
              onClick={syncData}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="h-9 px-2.5 text-xs whitespace-nowrap shrink-0 border-green-200 text-green-700 hover:bg-green-50 flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Đồng bộ</span>
            </Button>
          </div>

          {/* Hàng 2: Thanh chọn nhanh Danh mục cuộn ngang mượt trên Điện thoại & Tablet */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-nowrap pt-0.5">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`h-7 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Tất cả ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setCategoryFilter(cat.name)}
                className={`h-7 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  categoryFilter === cat.name
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>

          {/* Expandable Search & Price Filter */}
          {isSearchExpanded && (
            <div className="flex flex-col sm:flex-row gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 animate-slide-in">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                <Input
                  type="text"
                  placeholder="Tìm tên món, viết tắt (vd: tstcdd)..."
                  className="pl-8 pr-7 h-9 text-xs sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue placeholder="Mức giá" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả giá</SelectItem>
                    <SelectItem value="0-20000">0đ - 20k</SelectItem>
                    <SelectItem value="20000-50000">20k - 50k</SelectItem>
                    <SelectItem value="50000+">Trên 50k</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  onClick={resetFilters}
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-700 h-9 px-2.5 text-xs whitespace-nowrap shrink-0"
                  title="Xóa bộ lọc tìm kiếm"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  <span>Xóa lọc</span>
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Tablet Landscape & Desktop Header (>= 1024px) - Khóa chiều cao nút h-9, cuộn ngang mượt không ép chữ */}
      <div className="hidden lg:block shrink-0">
        <Card className="p-2.5 border-b">
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar flex-nowrap">
            {/* Control Buttons */}
            <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
              <Button
                type="button"
                onClick={syncData}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="h-9 px-2.5 border-green-200 text-green-700 hover:bg-green-50 text-xs whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? loadingText : 'Đồng bộ'}</span>
              </Button>

              <Button
                type="button"
                onClick={() => setShowTableModal(true)}
                variant="outline"
                size="sm"
                className="h-9 px-2.5 border-purple-200 text-purple-700 hover:bg-purple-50 text-xs flex items-center whitespace-nowrap shrink-0"
                title={unpaidTablesCount > 0 ? `Đang có ${unpaidTablesCount} bàn có đơn chưa thanh toán` : 'Chọn bàn phục vụ'}
              >
                <GalleryVertical className="w-3.5 h-3.5 mr-1 shrink-0" />
                {selectedTableName ? (
                  <Badge variant="secondary" className="text-xs whitespace-nowrap">
                    {selectedTableName}
                  </Badge>
                ) : (
                  <span>Chọn bàn</span>
                )}
                {unpaidTablesCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1.5 px-1.5 py-0 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-sm flex items-center gap-1 whitespace-nowrap"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                    <span>{unpaidTablesCount} có đơn</span>
                  </Badge>
                )}
              </Button>

              {/* Nút hiển thị mã QR Bàn (Mục #11) */}
              {canUseQrInbox && selectedTableId && selectedTableName !== 'Khách mua về' && (
                <Button
                  type="button"
                  onClick={() => setShowTableQRModal(true)}
                  variant="outline"
                  size="sm"
                  className="h-9 px-2.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs whitespace-nowrap shrink-0"
                  title="Hiện mã QR đặt món của bàn này"
                >
                  <QrCode className="w-3.5 h-3.5 mr-1 shrink-0" />
                  <span>QR Bàn</span>
                </Button>
              )}

              {canUseTransferTable && selectedTableId && (
                <Button
                  type="button"
                  onClick={() => setShowTransferModal(true)}
                  variant="outline"
                  size="sm"
                  className="h-9 px-2.5 border-amber-200 text-amber-700 hover:bg-amber-50 text-xs whitespace-nowrap shrink-0"
                  title="Chuyển hoặc gộp bàn"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1 shrink-0" />
                  <span>Chuyển bàn</span>
                </Button>
              )}

              <Button
                type="button"
                onClick={() => setShowCustomerModal(true)}
                variant="outline"
                size="sm"
                className="h-9 px-2.5 border-blue-200 text-blue-700 hover:bg-blue-50 text-xs whitespace-nowrap shrink-0"
              >
                <Users className="w-3.5 h-3.5 mr-1 shrink-0" />
                {selectedCustomer ? (
                  <Badge variant="secondary" className="ml-1 text-xs max-w-[120px] truncate">
                    {selectedCustomer['Tên khách hàng']}
                  </Badge>
                ) : (
                  <span>Khách lẻ</span>
                )}
              </Button>

              {/* Receipt Settings */}
              <div className="shrink-0">
                <ReceiptSettings />
              </div>
            </div>

            {/* Barcode Scanner (Ẩn/hiện theo công tắc Admin tại /settings/features) */}
            {canUseBarcodeScanner && (
              <div className="shrink-0">
                <BarcodeScanner onBarcodeScanned={addToCart} />
              </div>
            )}

            {/* Search and Filters */}
            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm món..."
                  className="pl-8 w-36 xl:w-48 h-9 text-xs xl:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-36 xl:w-44 h-9 text-xs shrink-0">
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả danh mục</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.name} value={cat.name}>
                      <div className="flex items-center justify-between w-full">
                        <span>{cat.name}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {cat.count}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger className="w-28 xl:w-32 h-9 text-xs shrink-0">
                  <SelectValue placeholder="Chọn giá" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả giá</SelectItem>
                  <SelectItem value="0-20000">0đ - 20,000đ</SelectItem>
                  <SelectItem value="20000-50000">20,000đ - 50,000đ</SelectItem>
                  <SelectItem value="50000+">Trên 50,000đ</SelectItem>
                </SelectContent>
              </Select>

              <Button
                type="button"
                onClick={resetFilters}
                variant="outline"
                size="sm"
                className="border-red-200 text-red-700 hover:bg-red-50 h-9 px-2.5 shrink-0"
                title="Đặt lại bộ lọc"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {canUseQrInbox && <QROrderInbox onSettle={settleQrOrder} onAccept={acceptQrOrder} activeOrders={activeOrders} />}
      {/* Trợ lý AI GlobalAssistant đã được gắn ở DashboardLayout (Mục #16) */}

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2 sm:gap-2.5 overflow-hidden">
        {/* Product Grid - Full width on mobile & tablet portrait */}
        <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden">
          <ProductGrid
            products={filteredProducts}
            enableOptionModal={canUseToppingModal}
            onAddToCart={addToCart}
          />
        </div>

        {/* Tablet Landscape (1024px-1279px) & Desktop Cart Sidebar - Khóa độ rộng w-[340px] xl:w-[380px] shrink-0 */}
        <div className="hidden lg:flex lg:flex-col lg:w-[340px] xl:w-[380px] 2xl:w-[420px] h-full min-h-0 shrink-0">
          <CartSidebar
            cart={cart}
            subtotal={subtotal}
            vat={vat}
            total={total}
            customerDiscount={customerDiscount}
            selectedTableId={selectedTableId}
            selectedCustomer={selectedCustomer}
            selectedTableName={selectedTableName}
            employee={nhanvien}
            showClearConfirmation={showClearConfirmation}
            onOpenClearConfirmation={setShowClearConfirmation}
            activeCashiersOnTable={selectedTableId ? presenceByTable.get(selectedTableId)?.cashiers : undefined}
            posViewersCount={selectedTableId ? presenceByTable.get(selectedTableId)?.posCount : undefined}
            onRemoveFromCart={removeFromCart}
            onAdjustQuantity={adjustQuantity}
            onClearCart={clearCart}
            onCheckout={() => setShowCheckoutModal(true)}
            onSendToKitchen={() => sendToKitchen({
              tableId: selectedTableId || '', tableName: selectedTableName,
              items: cart, employee: nhanvien || 'Thu ngân',
            })}
            onShowTableModal={() => setShowTableModal(true)}
            onShowCustomerModal={() => setShowCustomerModal(true)}
            onShowQRModal={() => setShowTableQRModal(true)}
            onUpdateCartItemPrintStatus={updateItemsPrintStatus}
            onUpdateCartItemKitchenStatus={updateItemsKitchenStatus}
            onShowNoteModal={(item) => {
              setSelectedItemForNote(item);
              setNoteInput(item.note || '');
              setShowNoteModal(true);
            }}
            canCheckout={canCheckout}
            canUseKitchenPrint={canUseKitchenPrint}
            sharedCartStatus={sharedCartStatus}
          />
        </div>
      </div>

      {/* FLOATING BOTTOM CART BAR trên Điện thoại & Máy tính bảng dọc (< 1024px) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-8px_20px_-4px_rgba(0,0,0,0.12)] px-2.5 pt-2 safe-bottom-bar">
        <div className="flex items-center justify-between gap-2 max-w-3xl mx-auto">
          {/* Thông tin Số lượng món, Bàn đang chọn & Tổng tiền (Bấm để mở Drawer Giỏ hàng) */}
          <button
            type="button"
            onClick={() => setShowMobileCart(true)}
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left py-1 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <div className="relative w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                {totalCartItemsCount}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                <span className="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold truncate max-w-[110px]">
                  {selectedTableName || 'Chưa chọn bàn'}
                </span>
                <span>•</span>
                <span className="text-blue-600 dark:text-blue-400 underline whitespace-nowrap">Xem giỏ</span>
              </div>
              <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                {formatCurrency(total)}
              </div>
            </div>
          </button>

          {/* Cụm nút hành động nhanh trên Floating Bottom Bar: Gửi bếp & Thanh toán */}
          <div className="flex items-center gap-1.5 shrink-0">
            {canUseKitchenPrint && cart.length > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (!selectedTableId) {
                    setShowTableModal(true);
                    return;
                  }
                  void sendToKitchen({
                    tableId: selectedTableId,
                    tableName: selectedTableName,
                    items: cart,
                    employee: nhanvien || 'Thu ngân',
                  });
                }}
                className="h-10 px-2.5 sm:px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs whitespace-nowrap shrink-0 flex items-center gap-1 shadow-xs"
              >
                <ChefHat className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline">Gửi bếp</span>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (cart.length === 0) {
                  setShowMobileCart(true);
                  return;
                }
                if (!selectedTableId) {
                  setShowTableModal(true);
                  return;
                }
                setShowCheckoutModal(true);
              }}
              className="h-10 px-3 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm whitespace-nowrap shrink-0 shadow-sm"
            >
              {cart.length === 0
                ? 'Mở giỏ hàng'
                : !selectedTableId
                  ? 'Chọn bàn'
                  : 'Thanh toán'}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Drawer/Sheet Giỏ hàng - Khóa bố cục 3 phần cố định (Header + Danh sách cuộn + Tổng tiền & Thanh toán ở đáy) */}
      {showMobileCart && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 lg:hidden flex flex-col justify-end"
          onClick={() => setShowMobileCart(false)}
        >
          <div
            className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-t-2xl h-[86dvh] max-h-[86dvh] flex flex-col overflow-hidden shadow-2xl animate-slide-in-bottom safe-bottom-bar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Thanh kéo & Tiêu đề Sheet cố định ở đỉnh */}
            <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0 bg-slate-50/80 dark:bg-slate-900">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                  Chi tiết giỏ hàng ({totalCartItemsCount} món)
                </span>
                {selectedTableName && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {selectedTableName}
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                onClick={() => setShowMobileCart(false)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-800 shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Nội dung CartSidebar bên trong được khóa flex-1 min-h-0 để danh sách món cuộn ở giữa và nút Thanh toán luôn dính chặt ở đáy */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <CartSidebar
                cart={cart}
                subtotal={subtotal}
                vat={vat}
                total={total}
                customerDiscount={customerDiscount}
                selectedTableId={selectedTableId}
                selectedCustomer={selectedCustomer}
                showClearConfirmation={showClearConfirmation}
                onOpenClearConfirmation={setShowClearConfirmation}
                activeCashiersOnTable={selectedTableId ? presenceByTable.get(selectedTableId)?.cashiers : undefined}
                posViewersCount={selectedTableId ? presenceByTable.get(selectedTableId)?.posCount : undefined}
                onRemoveFromCart={removeFromCart}
                onAdjustQuantity={adjustQuantity}
                onClearCart={() => {
                  clearCart();
                  setShowMobileCart(false);
                }}
                onCheckout={() => {
                  setShowMobileCart(false);
                  setShowCheckoutModal(true);
                }}
                selectedTableName={selectedTableName}
                employee={nhanvien}
                onUpdateCartItemPrintStatus={updateItemsPrintStatus}
                onUpdateCartItemKitchenStatus={updateItemsKitchenStatus}
                onSendToKitchen={() => sendToKitchen({
                  tableId: selectedTableId || '', tableName: selectedTableName,
                  items: cart, employee: nhanvien || 'Thu ngân',
                })}
                onShowTableModal={() => {
                  setShowMobileCart(false);
                  setShowTableModal(true);
                }}
                onShowCustomerModal={() => {
                  setShowMobileCart(false);
                  setShowCustomerModal(true);
                }}
                onShowQRModal={() => {
                  setShowMobileCart(false);
                  setShowTableQRModal(true);
                }}
                onShowNoteModal={(item) => {
                  setSelectedItemForNote(item);
                  setNoteInput(item.note || '');
                  setShowMobileCart(false);
                  setShowNoteModal(true);
                }}
                canCheckout={canCheckout}
                canUseKitchenPrint={canUseKitchenPrint}
                sharedCartStatus={sharedCartStatus}
              />
            </div>
          </div>
        </div>
      )}

      {/* Existing Modals */}
      <CustomerSelectModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={handleSelectCustomer}
      />

      {showTableModal && (
        <TableModal
          tables={tables}
          activeOrders={activeOrders}
          selectedTableId={selectedTableId}
          onSelectTable={selectTable}
          onClose={() => setShowTableModal(false)}
          onShowTransfer={() => {
            if (!canUseTransferTable) {
              toast.error('Chức năng chuyển bàn đang được tắt bởi Quản trị viên.');
              return;
            }
            setShowTransferModal(true);
          }}
          presenceByTable={presenceByTable}
        />
      )}

      {showTableQRModal && (
        <TableQRModal
          isOpen={showTableQRModal}
          onClose={() => setShowTableQRModal(false)}
          tableId={selectedTableId}
          tableName={selectedTableName}
        />
      )}

      {showTransferModal && (
        <TransferModal
          tables={tables}
          selectedTableId={selectedTableId}
          activeOrders={activeOrders}
          cart={cart}
          subtotal={subtotal}
          onTransfer={transferTable}
          onClose={() => setShowTransferModal(false)}
        />
      )}

      {showCheckoutModal && (
        <CheckoutModal
          cart={cart}
          subtotal={subtotal}
          vat={vat}
          total={total}
          customerDiscount={customerDiscount}
          selectedTableName={selectedTableName}
          employee={nhanvien}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={() => setShowCustomerModal(true)}
          onProcessPayment={processPayment}
          onClose={() => setShowCheckoutModal(false)}
        />
      )}

      {showNoteModal && selectedItemForNote && (
        <NoteModal
          item={selectedItemForNote}
          note={noteInput}
          onNoteChange={setNoteInput}
          onSave={(note) => {
            updateCartItemNote(selectedItemForNote.id, note);
            setShowNoteModal(false);
            setSelectedItemForNote(null);
            setNoteInput('');
          }}
          onClose={() => {
            setShowNoteModal(false);
            setSelectedItemForNote(null);
            setNoteInput('');
          }}
        />
      )}

      {/* Cart Conflict Modal */}
      <CartConflictModal
        open={!!conflictData}
        tableName={selectedTableName}
        conflictingItems={conflictData?.conflictingItems || []}
        onResolve={resolveConflict}
      />
    </div>
  );
}
