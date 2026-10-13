'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash, User, Gift, Plus, Minus, ChefHat, Info } from 'lucide-react';
import { formatCurrency, formatPoints } from '../utils/formatters';
import type { CartItem } from '../types/pos';
import { Customer } from '@/app/(dashboard)/khachhang/types/customer';
import { getCustomerTypeColor } from '@/app/(dashboard)/khachhang/utils/customerFormatters';

interface CartSidebarProps {
  cart: CartItem[];
  subtotal: number;
  vat: number;
  total: number;
  customerDiscount: number;
  selectedTableId: string | null;
  selectedCustomer: Customer | null;
  selectedTableName?: string; // Thêm prop này
  employee?: string; // Thêm prop này
  onRemoveFromCart: (productId: string) => void;
  onAdjustQuantity: (productId: string, amount: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  onShowTableModal: () => void;
  onShowCustomerModal: () => void;
  onShowNoteModal: (item: CartItem) => void;
  onSendToKitchen?: () => void; // Thêm prop này
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
  employee,
  onRemoveFromCart,
  onAdjustQuantity,
  onClearCart,
  onCheckout,
  onShowTableModal,
  onShowCustomerModal,
  onShowNoteModal,
  onSendToKitchen
}) => {
  return (
    <div className="w-full h-full bg-white rounded-lg shadow-lg flex flex-col lg:h-[calc(100vh-12rem)]">
      {/* Cart Header */}
      <div className="p-3 lg:p-4 border-b flex-shrink-0">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg lg:text-xl font-semibold text-gray-800">
            Giỏ hàng
            {cart.length > 0 && (
              <span className="ml-2 bg-blue-600 text-white text-sm px-2 py-1 rounded-full">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </h3>
          <button
            onClick={onClearCart}
            disabled={cart.length === 0}
            className={`px-2 lg:px-3 py-1.5 rounded-lg text-sm flex items-center transition-colors touch-target ${cart.length === 0
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : 'bg-red-500 text-white hover:bg-red-600'
              }`}
          >
            <Trash className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Xóa tất cả</span>
          </button>
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
            onSendToKitchen={onSendToKitchen}
          />
        </div>
      )}
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
}

const CartItemCard: React.FC<CartItemCardProps> = ({
  item,
  onRemove,
  onAdjustQuantity,
  onShowNoteModal
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
              
              <button
                onClick={() => onShowNoteModal(item)}
                className="w-6 h-6 flex items-center justify-center bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors ml-1"
                title="Ghi chú"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              <button
                onClick={() => onRemove(item.id)}
                className="w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
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
      <span>VAT (10%):</span>
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
  onSendToKitchen?: () => void;
}> = ({ cart, selectedTableId, onCheckout, onShowTableModal, onSendToKitchen }) => {
  const handleCheckoutClick = () => {
    if (cart.length === 0) {
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
      onSendToKitchen();
    }
  };

  const isDisabled = cart.length === 0;
  const needTable = !selectedTableId;

  return (
    <div className="space-y-3">
      {/* Send to Kitchen Button - Only show if handler is provided */}
      {onSendToKitchen && (
        <Button
          onClick={handleKitchenClick}
          disabled={isDisabled}
          className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors touch-target text-sm ${
            isDisabled
              ? 'bg-gray-300 cursor-not-allowed text-gray-500'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
        >
          <ChefHat className="w-4 h-4" />
          <span>{needTable ? 'Chọn bàn để gửi bếp' : 'Gửi đến bếp'}</span>
        </Button>
      )}

      {/* Checkout Button */}
      <Button
        onClick={handleCheckoutClick}
        disabled={isDisabled}
        className={`w-full py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors touch-target text-base ${
          isDisabled
            ? 'bg-blue-300 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span>{needTable ? 'Chọn bàn' : 'Thanh toán'}</span>
      </Button>
    </div>
  );
};