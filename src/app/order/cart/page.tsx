'use client';

import React, { useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTablePresence } from '@/hooks/useTablePresence';
import toast from 'react-hot-toast';

function CartPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    items, totalItems, totalAmount, tableId, tableName,
    updateQuantity, removeItem, clearCart, orderNote, setOrderNote
  } = useCart();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  const idempotencyKey = useRef<string | null>(null);

  const tableParam = searchParams.get('table') || tableId;

  // Realtime Presence: Khách đang mở giỏ hàng của bàn (Mục #7)
  useTablePresence({
    role: 'customer_qr',
    tableId: tableParam || null,
    itemCount: totalItems,
  });

  const handleSubmitOrder = async () => {
    if (items.length === 0) {
      toast.error('Giỏ hàng trống!');
      return;
    }

    setIsSubmitting(true);
    try {
      idempotencyKey.current ||= crypto.randomUUID();
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey.current },
        body: JSON.stringify({
          source: 'QR_TABLE',
          tableId: tableParam,
          items: items.map(item => ({
            productId: item.product.IDSP,
            productName: item.product['Tên sản phẩm'],
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            size: item.size,
            sugar: item.sugar,
            ice: item.ice,
            note: item.note,
            unit: item.product['Đơn vị tính'],
            image: item.product['Hình ảnh'] || undefined,
          })),
          totalAmount,
          note: orderNote,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setOrderId(data.orderId);
        setOrderSuccess(true);
        clearCart();
        toast.success('Đặt món thành công!');
        if (data.trackingToken) {
          if (typeof window !== 'undefined') {
            try {
              if (tableParam) {
                localStorage.setItem(`h2_table_order_token_${tableParam}`, data.trackingToken);
              }
              localStorage.setItem('h2_active_order_token', data.trackingToken);
            } catch {}
          }
          router.push(`/order/status?token=${encodeURIComponent(data.trackingToken)}`);
        }
      } else {
        toast.error(data.error || 'Có lỗi xảy ra, vui lòng thử lại');
      }
    } catch (error) {
      toast.error('Lỗi kết nối, vui lòng thử lại');
      console.error('Submit order error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Order Success State
  if (orderSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        {/* Decorative background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-green-100 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-orange-100 rounded-full blur-3xl opacity-60" />
        </div>

        <div className="relative z-10 text-center max-w-sm">
          {/* Success icon */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200/50 animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Đặt món thành công! 🎉</h1>
          <p className="text-sm text-gray-500 mb-6">Đơn hàng của bạn đã được gửi đến quán</p>

          {/* Order Info Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6 text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">Mã đơn hàng</span>
              <span className="text-sm font-bold text-gray-900 font-mono">{orderId}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">Bàn</span>
              <span className="text-sm font-semibold text-gray-800">{tableName}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">Tổng tiền</span>
              <span className="text-base font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                {totalAmount.toLocaleString('vi-VN')}đ
              </span>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-orange-600">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: '300ms' }} />
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: '600ms' }} />
                </div>
                <span className="text-xs font-medium">Đang chờ pha chế...</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/order/menu?table=${encodeURIComponent(tableParam || '')}`)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold
                         shadow-lg shadow-red-200/50 active:scale-[0.98] transition-transform"
            >
              Đặt thêm món 🍹
            </button>
          </div>

          <p className="mt-6 text-xs text-gray-400">
            Thanh toán tại quầy khi nhận món
          </p>
        </div>
      </div>
    );
  }

  // Empty Cart
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-orange-100 shadow-sm">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <h1 className="text-base font-bold text-gray-900">Giỏ hàng</h1>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8 text-gray-300" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Giỏ hàng trống</h2>
          <p className="text-sm text-gray-500 mb-6">Hãy thêm món từ menu nhé!</p>
          <button
            onClick={() => router.push(`/order/menu?table=${encodeURIComponent(tableParam || '')}`)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-medium text-sm
                       shadow-md shadow-red-200/50 active:scale-95 transition-transform"
          >
            Xem menu
          </button>
        </div>
      </div>
    );
  }

  // Cart with items
  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-orange-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900">Giỏ hàng</h1>
              <span className="text-xs text-gray-500">{totalItems} món · {tableName}</span>
            </div>
          </div>
          <button
            onClick={() => {
              if (confirm('Xóa tất cả món trong giỏ?')) clearCart();
            }}
            className="text-xs text-red-500 font-medium px-2 py-1 rounded-lg hover:bg-red-50 active:scale-95 transition-all"
          >
            Xóa hết
          </button>
        </div>
      </header>

      {/* Cart Items */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
          >
            <div className="flex gap-3">
              {/* Product Image */}
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden flex-shrink-0">
                {item.product['Hình ảnh'] && !item.product['Hình ảnh'].includes('placeholder') ? (
                  <img
                    src={item.product['Hình ảnh']}
                    alt={item.product['Tên sản phẩm']}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🥤</div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
                  {item.product['Tên sản phẩm']}
                </h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {!['Ăn vặt', 'Bánh ngọt'].includes(item.product['Loại sản phẩm']) && (
                    <>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-50 text-orange-700 font-medium">
                        Size {item.size}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 font-medium">
                        {item.sugar}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-50 text-cyan-700 font-medium">
                        {item.ice}
                      </span>
                    </>
                  )}
                </div>
                {item.note && (
                  <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">📝 {item.note}</p>
                )}

                {/* Price & Quantity */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold text-orange-600">
                    {(item.unitPrice * item.quantity).toLocaleString('vi-VN')}đ
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="w-3 h-3 text-red-500" />
                      ) : (
                        <Minus className="w-3 h-3 text-gray-600" />
                      )}
                    </button>
                    <span className="text-sm font-bold text-gray-900 w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white shadow-sm active:scale-90 transition-transform"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Order Note */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-gray-400" />
            <label className="text-sm font-semibold text-gray-800">Ghi chú cho quán</label>
          </div>
          <textarea
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
            placeholder="Ví dụ: Mang ra cùng lúc, thêm ống hút..."
            className="w-full px-3 py-2.5 rounded-xl bg-gray-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all placeholder:text-gray-400"
            rows={2}
          />
        </div>

        {/* Add more button */}
        <button
          onClick={() => router.push(`/order/menu?table=${encodeURIComponent(tableParam || '')}`)}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-500
                     active:scale-[0.98] transition-transform hover:border-orange-300 hover:text-orange-600"
        >
          + Thêm món khác
        </button>
      </div>

      {/* Fixed Bottom: Summary & Checkout */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50">
        <div className="max-w-lg mx-auto px-4 py-4">
          {/* Price Summary */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs text-gray-500">Tổng cộng ({totalItems} món)</span>
              <div className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                {totalAmount.toLocaleString('vi-VN')}đ
              </div>
            </div>
            <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
              Thanh toán tại quầy
            </span>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmitOrder}
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-base
                       shadow-lg shadow-red-200/50 active:scale-[0.98] transition-transform
                       disabled:opacity-60 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang gửi đơn...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Gửi đơn hàng</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Đang tải...</div>
      </div>
    }>
      <CartPageContent />
    </Suspense>
  );
}
