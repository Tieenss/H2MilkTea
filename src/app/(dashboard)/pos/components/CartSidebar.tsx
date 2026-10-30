'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash, User, Gift, Plus, Minus, ChefHat, Tag, QrCode, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatPoints } from '../utils/formatters';
import type { CartItem } from '../types/pos';
import { Customer } from '@/app/(dashboard)/khachhang/types/customer';
import { getCustomerTypeColor } from '@/app/(dashboard)/khachhang/utils/customerFormatters';
import { getLabelSettings } from '@/utils/labelSettings';
import { printOrderLabels } from '@/utils/labelPrint';
import { PrintSelectionModal, PrintActionType } from './PrintSelectionModal';
import { printReceiptWithSettings } from '../utils/receiptPrint';
import toast from 'react-hot-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CartSidebarProps {
  cart: CartItem[];
  subtotal: number;
  vat: number;
  total: number;
  customerDiscount: number;
  selectedTableId: string | null;
  selectedCustomer: Customer | null;
  selectedTableName?: string;
  employee?: string;
  sharedCartStatus?: string;
  canCheckout?: boolean;
  showClearConfirmation?: boolean;
  activeCashiersOnTable?: string[];
  posViewersCount?: number;
  onOpenClearConfirmation?: (show: boolean) => void;
  onRemoveFromCart: (productId: string) => void;
  onAdjustQuantity: (productId: string, amount: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  onShowTableModal: () => void;
  onShowCustomerModal: () => void;
  onShowQRModal?: () => void;
  onShowNoteModal: (item: CartItem) => void;
  onSendToKitchen?: () => Promise<void> | void;
  onUpdateCartItemPrintStatus?: (itemIds: string[], status: 'printed' | 'new' | 'modified') => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
  cart,
  subtotal,
  vat,
  total,
  customerDiscount,
  selectedTableId,
  selectedCustomer,
  selectedTableName,
  employee = 'Admin',
  sharedCartStatus = 'connected',
  canCheckout = true,
  showClearConfirmation: controlledShowClearConfirmation,
  activeCashiersOnTable = [],
  posViewersCount = 0,
  onOpenClearConfirmation,
  onRemoveFromCart,
  onAdjustQuantity,
  onClearCart,
  onCheckout,
  onShowTableModal,
  onShowCustomerModal,
  onShowQRModal,
  onShowNoteModal,
  onSendToKitchen,
  onUpdateCartItemPrintStatus
}) => {
  const [isSendingKitchen, setIsSendingKitchen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPrintingModal, setIsPrintingModal] = useState(false);
  const [internalShowClearConfirmation, setInternalShowClearConfirmation] = useState(false);
  const isClearConfirmationOpen = controlledShowClearConfirmation !== undefined
    ? controlledShowClearConfirmation
    : internalShowClearConfirmation;
  const setClearConfirmationOpen = useCallback((show: boolean) => {
    if (onOpenClearConfirmation) {
      onOpenClearConfirmation(show);
    } else {
      setInternalShowClearConfirmation(show);
    }
  }, [onOpenClearConfirmation]);

  const [sentKitchenSignature, setSentKitchenSignature] = useState<string | null>(null);
  const cartSignature = JSON.stringify(cart.map((item) => [item.id, item.quantity, item.note]));
  const previousCartSignature = useRef(cartSignature);

  useEffect(() => {
    if (previousCartSignature.current !== cartSignature) {
      previousCartSignature.current = cartSignature;
      setSentKitchenSignature(null);
    }
  }, [cartSignature]);

  // Mở popup lựa chọn các món cần in tem / in hóa đơn (Mục #6)
  const handlePrintAllLabels = () => {
    if (cart.length === 0) return;
    setIsPrintModalOpen(true);
  };

  // Xử lý in từ Modal lựa chọn (Chỉ in tem, Chỉ in hóa đơn, hoặc In cả hai)
  const handleConfirmPrintFromModal = async (action: PrintActionType, selectedItems: CartItem[]) => {
    setIsPrintingModal(true);
    try {
      const orderInfo = {
        tableName: selectedTableName || 'Khách mang về',
        cashierName: employee,
        createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      // 1. In tem nhãn dán ly cho các món được tích chọn
      if (action === 'labels' || action === 'both') {
        const res = await printOrderLabels(selectedItems, orderInfo, { forceAll: true });
        if (res.success) {
          toast.success(res.message);
          onUpdateCartItemPrintStatus?.(selectedItems.map((i) => i.id), 'printed');
        } else {
          toast.error(res.message);
        }
      }

      // 2. In hóa đơn bán hàng
      if (action === 'receipt' || action === 'both') {
        try {
          const receiptData = {
            receiptNumber: `H2-${Date.now().toString().slice(-6)}`,
            date: new Date(),
            cashier: employee || 'Thu ngân',
            customer: selectedCustomer ? selectedCustomer['Tên khách hàng'] : 'Khách lẻ',
            table: selectedTableName || 'Mang về',
            items: cart.map((i) => ({
              name: `${i.name}${i.size ? ` (${i.size})` : ''}`,
              quantity: i.quantity,
              price: i.price,
              total: i.price * i.quantity,
              notes: i.note,
            })),
            subtotal,
            discount: customerDiscount,
            total,
            paid: total,
            change: 0,
            notes: selectedCustomer ? `SĐT: ${selectedCustomer['Số điện thoại']}` : undefined,
          };
          await printReceiptWithSettings(receiptData, 'pos');
          toast.success('Đã gửi lệnh in hóa đơn thành công.');
        } catch (receiptErr) {
          console.error('Lỗi in hóa đơn từ popup:', receiptErr);
          toast.error('Không thể in hóa đơn.');
        }
      }

      setIsPrintModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi thực hiện in');
    } finally {
      setIsPrintingModal(false);
    }
  };

  // In riêng 1 con tem khi bấm vào icon Tag trên dòng sản phẩm (Mục #6)
  const handlePrintSingleItemLabel = async (item: CartItem) => {
    try {
      const res = await printOrderLabels(
        [item],
        {
          tableName: selectedTableName || 'Khách mang về',
          cashierName: employee,
          createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
        { forceAll: true }
      );
      if (res.success) {
        toast.success(res.message);
        onUpdateCartItemPrintStatus?.([item.id], 'printed');
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi in tem');
    }
  };

  // Gửi order sang khu bếp / quầy pha chế (Mục #1)
  const handleSendKitchen = async () => {
    if (!onSendToKitchen) return;
    setIsSendingKitchen(true);
    try {
      await onSendToKitchen();
      setSentKitchenSignature(cartSignature);
      toast.success(`Đã gửi ${cart.length} món bàn ${selectedTableName || ''} đến quầy pha chế!`);

      // Tự động in tem nhãn nếu cấu hình autoPrintOnKitchenSend đang bật
      const labelSettings = getLabelSettings();
      if (labelSettings.enabled && labelSettings.autoPrintOnKitchenSend && cart.length > 0) {
        void printOrderLabels(
          cart,
          {
            tableName: selectedTableName || 'Bàn',
            cashierName: employee,
            createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          },
          { customSettings: labelSettings, forceAll: false }
        ).then((res) => {
          if (res.success) {
            onUpdateCartItemPrintStatus?.(cart.map((i) => i.id), 'printed');
          }
        });
      }
    } catch {
      // The POS hook already displays the server error to the cashier.
    } finally {
      setIsSendingKitchen(false);
    }
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    setClearConfirmationOpen(true);
  };

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-lg flex flex-col lg:h-[calc(100vh-12rem)]">
      {/* Cart Header */}
      <div className="p-3 lg:p-4 border-b flex-shrink-0">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg lg:text-xl font-semibold text-gray-800 flex items-center">
              Giỏ hàng
              {cart.length > 0 && (
                <span className="ml-2 bg-blue-600 text-white text-sm px-2 py-0.5 rounded-full">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </h3>

            {/* Chỉ báo trạng thái kết nối realtime cố định kích thước chống nhảy layout */}
            <span
              className={`inline-flex items-center justify-center gap-1 min-w-[88px] text-[11px] font-medium px-2 py-0.5 rounded-full border transition-colors duration-200 ${
                sharedCartStatus === 'conflict'
                  ? 'text-rose-700 bg-rose-50 border-rose-300'
                  : sharedCartStatus === 'offline'
                    ? 'text-gray-600 bg-gray-100 border-gray-300'
                    : sharedCartStatus === 'syncing' || sharedCartStatus === 'loading'
                      ? 'text-blue-700 bg-blue-50 border-blue-200'
                      : 'text-emerald-700 bg-emerald-50 border-emerald-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  sharedCartStatus === 'conflict'
                    ? 'bg-rose-600 animate-ping'
                    : sharedCartStatus === 'offline'
                      ? 'bg-gray-400'
                      : sharedCartStatus === 'syncing' || sharedCartStatus === 'loading'
                        ? 'bg-blue-500 animate-pulse'
                        : 'bg-emerald-500'
                }`}
              />
              <span>
                {sharedCartStatus === 'conflict'
                  ? 'Xung đột'
                  : sharedCartStatus === 'offline'
                    ? 'Ngoại tuyến'
                    : sharedCartStatus === 'syncing'
                      ? 'Đang lưu...'
                      : sharedCartStatus === 'loading'
                        ? 'Đang tải...'
                        : 'Trực tuyến'}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Nút xem mã QR của bàn (Mục #11) */}
            {selectedTableId && selectedTableName !== 'Khách mua về' && onShowQRModal && (
              <button
                onClick={onShowQRModal}
                className="px-2 lg:px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center transition-colors touch-target bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-sm"
                title="Xem và in mã QR bàn này"
              >
                <QrCode className="w-3.5 h-3.5 mr-1" />
                <span>QR</span>
              </button>
            )}

            <button
              onClick={handlePrintAllLabels}
              disabled={cart.length === 0}
              className={`px-2 lg:px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center transition-colors touch-target ${
                cart.length === 0
                  ? 'bg-gray-200 cursor-not-allowed text-gray-400'
                  : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
              }`}
              title="In tem nhãn dán ly cho tất cả món"
            >
              <Tag className="w-3.5 h-3.5 mr-1" />
              <span>In tem</span>
            </button>

            <div className="ml-2 pl-2 border-l border-gray-200"><button onClick={handleClearCart} disabled={cart.length === 0} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center transition-colors touch-target ${cart.length === 0 ? "text-gray-300 cursor-not-allowed" : "text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 active:scale-95"}`} title="Xóa toàn bộ món trong giỏ hàng"><Trash className="w-3.5 h-3.5 mr-1" /><span>Xóa hết</span></button></div>
          </div>
        </div>

        {/* Customer Section - Compact for mobile */}
        <div className="border-t pt-2">
          {selectedCustomer ? (
            <div className="bg-blue-50 rounded-lg p-2 text-xs">
              <div className="flex items-center justify-between mb-1">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-blue-800 truncate text-xs">
                    {selectedCustomer['Tên khách hàng']}
                  </div>
                  <div className="text-blue-600 text-xs flex items-center gap-1">
                    <span>{selectedCustomer['Số điện thoại']}</span>
                    <span>•</span>
                    <span>{formatPoints(selectedCustomer['Điểm tích lũy'])}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge className={`${getCustomerTypeColor(selectedCustomer['Loại khách hàng'])} text-xs px-1 py-0`}>
                    {selectedCustomer['Loại khách hàng'] === 'Khách VIP' ? 'VIP' : 'Thường'}
                  </Badge>
                  <Button
                    onClick={onShowCustomerModal}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
                  >
                    <User className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              {/* Compact discount display */}
              {customerDiscount > 0 && (
                <div className="flex items-center gap-1 p-1 bg-green-100 rounded text-xs text-green-700">
                  <Gift className="w-3 h-3 text-green-600" />
                  <span>Giảm {((customerDiscount / subtotal) * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
              <span className="text-sm text-gray-500">Khách lẻ</span>
              <Button
                onClick={onShowCustomerModal}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-blue-600 hover:bg-blue-100"
              >
                <User className="w-3 h-3 mr-1" />
                Chọn
              </Button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={isClearConfirmationOpen} onOpenChange={setClearConfirmationOpen}>
        <AlertDialogContent>
          {(() => {
            const otherCashiers = activeCashiersOnTable.filter((name) => !employee || name !== employee);
            const hasOtherViewers = otherCashiers.length > 0 || posViewersCount > 1;

            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Trash className="w-5 h-5 text-red-600" />
                    <span>Xóa toàn bộ giỏ hàng?</span>
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>
                      Bạn có chắc chắn muốn xóa {cart.reduce((sum, item) => sum + item.quantity, 0)} món
                      {selectedTableName ? ` của ${selectedTableName}` : ''}? Thao tác này sẽ đồng bộ và cập nhật tất cả thiết bị đang mở bàn.
                    </p>
                    {hasOtherViewers && (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs flex items-start gap-2.5 text-left">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-950">Cảnh báo: Có thiết bị khác đang cùng mở bàn này!</p>
                          <p className="mt-1 text-amber-800">
                            {otherCashiers.length > 0
                              ? `Thu ngân đang cùng mở: ${otherCashiers.join(', ')}.`
                              : `Có ${posViewersCount} thiết bị POS đang cùng kết nối vào bàn này.`}
                            <br />
                            Nếu bạn xác nhận xóa, giỏ hàng của thiết bị còn lại cũng sẽ lập tức được dọn sạch về 0.
                          </p>
                        </div>
                      </div>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      onClearCart();
                      setClearConfirmationOpen(false);
                    }}
                  >
                    Xóa tất cả
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 hide-scrollbar">
        {cart.length === 0 ? (
          <EmptyCart onShowTableModal={onShowTableModal} />
        ) : (
          cart.map((item) => (
            <CartItemCard
              key={item.id}
              item={item}
              onRemove={onRemoveFromCart}
              onAdjustQuantity={onAdjustQuantity}
              onShowNoteModal={onShowNoteModal}
              onPrintLabel={handlePrintSingleItemLabel}
            />
          ))
        )}
      </div>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="border-t bg-gray-50 p-2 space-y-2 flex-shrink-0">
          <CartSummary 
            subtotal={subtotal} 
            vat={vat} 
            total={total} 
            customerDiscount={customerDiscount}
          />

          <ActionButtons
            cart={cart}
            selectedTableId={selectedTableId}
            onCheckout={onCheckout}
            onShowTableModal={onShowTableModal}
            onSendToKitchen={handleSendKitchen}
            isSendingKitchen={isSendingKitchen}
            isKitchenSent={sentKitchenSignature === cartSignature}
            canCheckout={canCheckout}
            sharedCartStatus={sharedCartStatus}
          />
        </div>
      )}

      {/* Modal Xác nhận in tem & hóa đơn trước khi thực hiện (Mục #6) */}
      <PrintSelectionModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        cart={cart}
        tableName={selectedTableName}
        isPrinting={isPrintingModal}
        onConfirmPrint={handleConfirmPrintFromModal}
      />
    </div>
  );
};

const EmptyCart: React.FC<{ onShowTableModal: () => void }> = ({ onShowTableModal }) => (
  <div className="text-center py-8 lg:py-10">
    <div className="text-gray-400 mb-4">
      <svg className="w-12 h-12 lg:w-16 lg:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    </div>
    <p className="text-gray-500 mb-4 text-sm lg:text-base">Giỏ hàng đang trống</p>
    <Button
      onClick={onShowTableModal}
      variant="outline"
      className="text-sm touch-target"
    >
      Chọn bàn để bắt đầu
    </Button>
  </div>
);

interface CartItemCardProps {
  item: CartItem;
  onRemove: (productId: string) => void;
  onAdjustQuantity: (productId: string, amount: number) => void;
  onShowNoteModal: (item: CartItem) => void;
  onPrintLabel?: (item: CartItem) => void;
}

const CartItemCard: React.FC<CartItemCardProps> = ({
  item,
  onRemove,
  onAdjustQuantity,
  onShowNoteModal,
  onPrintLabel
}) => {
  const [localQuantity, setLocalQuantity] = React.useState(item.quantity);

  React.useEffect(() => {
    setLocalQuantity(item.quantity);
  }, [item.quantity]);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value) || 1;
    setLocalQuantity(newQuantity);
  };

  const handleQuantityBlur = () => {
    if (localQuantity !== item.quantity) {
      const diff = localQuantity - item.quantity;
      onAdjustQuantity(item.id, diff);
    }
  };

  return (
    <div className="bg-white p-2 rounded-lg border mobile-cart-item">
      <div className="flex items-center gap-2 flex-1">
        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img
            src={item.image || "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop&crop=center"}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop&crop=center";
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium text-gray-800 text-xs line-clamp-1 flex-1">
              {item.name}
            </h3>
            <span className="text-xs font-semibold text-blue-600 ml-2">
              {formatCurrency(item.price * item.quantity)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              {formatCurrency(item.price)} × {item.quantity}
            </div>
            
            {/* Inline quantity controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => onAdjustQuantity(item.id, -1)}
                className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>

              <input
                type="number"
                value={localQuantity}
                onChange={handleQuantityChange}
                onBlur={handleQuantityBlur}
                className="w-8 h-6 text-center text-xs text-gray-800 bg-transparent border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                min="1"
              />

              <button
                onClick={() => onAdjustQuantity(item.id, 1)}
                className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
              
              {onPrintLabel && (
                <button
                  onClick={() => onPrintLabel(item)}
                  className="w-8 h-8 flex items-center justify-center bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors active:scale-95 ml-0.5"
                  title="In tem món này"
                >
                  <Tag className="w-3 h-3" />
                </button>
              )}

              <button
                onClick={() => onShowNoteModal(item)}
                className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors active:scale-95"
                title="Ghi chú"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              <button
                onClick={() => onRemove(item.id)}
                className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors active:scale-95"
                title="Xóa"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {item.note && (
            <p className="text-xs text-blue-600 italic mt-1 line-clamp-1">
              {item.note}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const CartSummary: React.FC<{
  subtotal: number;
  vat: number;
  total: number;
  customerDiscount: number;
}> = ({ subtotal, vat, total, customerDiscount }) => (
  <>
    {/* Subtotal */}
    <div className="flex justify-between items-center text-gray-600 text-sm">
      <span>Tạm tính:</span>
      <span className="font-medium">{formatCurrency(subtotal)}</span>
    </div>

    {/* VAT */}
    <div className="flex justify-between items-center text-gray-600 text-sm">
      <span>VAT ({subtotal > 0 ? Math.round((vat / subtotal) * 100) : 10}%):</span>
      <span className="font-medium">{formatCurrency(vat)}</span>
    </div>

    {/* Customer Discount */}
    {customerDiscount > 0 && (
      <div className="flex justify-between items-center text-green-600 text-sm bg-green-50 p-2 rounded border border-green-200">
        <div className="flex items-center">
          <Gift className="w-3 h-3 mr-1" />
          <span className="font-medium">Ưu đãi khách hàng:</span>
        </div>
        <div className="text-right">
          <div className="font-bold">-{formatCurrency(customerDiscount)}</div>
          <div className="text-xs">({((customerDiscount / subtotal) * 100).toFixed(0)}% giảm)</div>
        </div>
      </div>
    )}

    {/* Divider */}
    <div className="border-t border-gray-200 my-2"></div>

    {/* Total */}
    <div className="flex justify-between items-center">
      <span className="font-semibold text-base lg:text-lg text-gray-800">Tổng tiền:</span>
      <span className="font-bold text-lg lg:text-xl text-blue-600">{formatCurrency(total)}</span>
    </div>
  </>
);

// Component mới cho Action Buttons
const ActionButtons: React.FC<{
  cart: CartItem[];
  selectedTableId: string | null;
  onCheckout: () => void;
  onShowTableModal: () => void;
  onSendToKitchen?: () => Promise<void>;
  isSendingKitchen: boolean;
  isKitchenSent: boolean;
  canCheckout?: boolean;
  sharedCartStatus?: string;
}> = ({
  cart,
  selectedTableId,
  onCheckout,
  onShowTableModal,
  onSendToKitchen,
  isSendingKitchen,
  isKitchenSent,
  canCheckout = true,
  sharedCartStatus = 'synced',
}) => {
  const handleCheckoutClick = () => {
    if (cart.length === 0 || !canCheckout) {
      return;
    } else if (!selectedTableId) {
      onShowTableModal();
    } else {
      onCheckout();
    }
  };

  const handleKitchenClick = () => {
    if (cart.length === 0) {
      return;
    } else if (!selectedTableId) {
      onShowTableModal();
    } else if (onSendToKitchen) {
      void onSendToKitchen();
    }
  };

  const isDisabled = cart.length === 0;
  const isCheckoutDisabled = isDisabled || !canCheckout;
  const needTable = !selectedTableId;

  const checkoutText = !canCheckout
    ? sharedCartStatus === 'conflict'
      ? 'Đang giải quyết xung đột...'
      : 'Đang mất kết nối...'
    : needTable
    ? 'Chọn bàn'
    : 'Thanh toán';

  return (
    <div className="space-y-3">
      {/* Send to Kitchen Button - Only show if handler is provided */}
      {onSendToKitchen && (
        <div className="space-y-1">
          <Button
            onClick={handleKitchenClick}
            disabled={isDisabled || isSendingKitchen || isKitchenSent}
            className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors touch-target text-sm font-bold ${
              isDisabled
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : isKitchenSent
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>
              {needTable
                ? 'Chọn bàn để gửi bếp'
                : isSendingKitchen
                ? 'Đang chuyển xuống bếp...'
                : isKitchenSent
                ? '✓ Đã chuyển bếp pha chế'
                : 'Gửi đến bếp pha chế'}
            </span>
          </Button>
          {!needTable && !isDisabled && (
            <p className="text-[10px] text-gray-500 text-center">
              Chuyển danh sách món xuống quầy bếp & tự động in tem ly
            </p>
          )}
        </div>
      )}

      {/* Checkout Button */}
      <Button
        onClick={handleCheckoutClick}
        disabled={isCheckoutDisabled}
        title={!canCheckout ? 'Không thể thanh toán khi giỏ hàng chưa đồng bộ hoặc đang xung đột' : undefined}
        className={`w-full py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors touch-target text-base ${
          isCheckoutDisabled
            ? 'bg-blue-300 cursor-not-allowed text-gray-100'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span>{checkoutText}</span>
      </Button>
    </div>
  );
};
