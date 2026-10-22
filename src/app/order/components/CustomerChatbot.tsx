'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, X, Send, Mic, Bot, Plus, Loader2, ShoppingCart, Check, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import type { Product } from '../types/customer-order';
import { useCart } from '../context/CartContext';

export interface SuggestedProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  quantity?: number;
  size?: 'M' | 'L';
  isOrderMatch?: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  intent?: 'ORDER_ADD' | 'RECOMMENDATION' | 'FAQ_GENERAL' | 'GENERAL';
  suggestedProducts?: SuggestedProduct[];
}

export interface CustomerChatbotProps {
  onSelectProduct?: (product: Product) => void;
  catalogProducts?: Product[];
  tableName?: string;
  tableId?: string;
}

export function CustomerChatbot({
  onSelectProduct,
  catalogProducts = [],
  tableName,
  tableId,
}: CustomerChatbotProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: tableName
        ? `Xin chào bạn tại ${tableName}! Mình là Trợ lý ảo H2 MilkTea. Bạn muốn gọi thêm món gì hay cần tư vấn menu không? 🧋`
        : 'Xin chào bạn! Mình là Trợ lý ảo H2 MilkTea. Bạn muốn tìm món gì hôm nay? (ít ngọt, thanh mát, cà phê, ăn vặt...) 🧋',
    },
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    setInputMessage('');
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/customer-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: newMessages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.message,
            intent: data.intent,
            suggestedProducts: data.suggestedProducts,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.error || 'Trợ lý đang bận một chút, bạn thử lại nhé!',
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Không thể kết nối đến trợ lý ảo lúc này. Bạn vui lòng thử lại sau nhé!',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickChip = (chipText: string) => {
    void handleSendMessage(chipText);
  };

  // Mở modal cấu hình đường đá size chi tiết của món
  const handleOpenDetail = (suggested: SuggestedProduct) => {
    setIsOpen(false);
    if (onSelectProduct) {
      const fullProd = catalogProducts.find((p) => p.IDSP === suggested.id) || {
        IDSP: suggested.id,
        'Tên sản phẩm': suggested.name,
        'Đơn giá': String(suggested.price),
        'Loại sản phẩm': suggested.category || 'Trà sữa',
        'Đơn vị tính': 'Ly',
        'Hình ảnh': suggested.image || '',
        'Trạng thái': 'Hoạt động',
      };
      onSelectProduct(fullProd as Product);
    } else {
      router.push(`/order/menu${tableId ? `?table=${encodeURIComponent(tableId)}` : ''}`);
    }
  };

  // Thêm nhanh trực tiếp vào giỏ hàng với đúng số lượng đã yêu cầu
  const handleDirectAddToCart = (suggested: SuggestedProduct) => {
    const fullProd = catalogProducts.find((p) => p.IDSP === suggested.id) || {
      IDSP: suggested.id,
      'Tên sản phẩm': suggested.name,
      'Đơn giá': String(suggested.price),
      'Loại sản phẩm': suggested.category || 'Trà sữa',
      'Đơn vị tính': 'Ly',
      'Hình ảnh': suggested.image || '',
      'Trạng thái': 'Hoạt động',
    };

    const isFood = ['Ăn vặt', 'Bánh ngọt'].includes(fullProd['Loại sản phẩm']);
    const qty = suggested.quantity && suggested.quantity > 0 ? suggested.quantity : 1;

    addItem(fullProd as Product, {
      size: isFood ? 'M' : (suggested.size || 'M'),
      sugar: '100% đường',
      ice: '100% đá',
      note: '',
      quantity: qty,
    });

    setAddedItemIds((prev) => ({ ...prev, [suggested.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [suggested.id]: false }));
    }, 2500);

    toast.success(`Đã thêm ${qty}x ${suggested.name} vào giỏ hàng!`, {
      icon: '🛒',
      duration: 2500,
    });
  };

  // Thêm tất cả các món được đề xuất vào giỏ hàng
  const handleAddAllToCart = (prods: SuggestedProduct[]) => {
    let totalAdded = 0;
    for (const suggested of prods) {
      const fullProd = catalogProducts.find((p) => p.IDSP === suggested.id) || {
        IDSP: suggested.id,
        'Tên sản phẩm': suggested.name,
        'Đơn giá': String(suggested.price),
        'Loại sản phẩm': suggested.category || 'Trà sữa',
        'Đơn vị tính': 'Ly',
        'Hình ảnh': suggested.image || '',
        'Trạng thái': 'Hoạt động',
      };

      const isFood = ['Ăn vặt', 'Bánh ngọt'].includes(fullProd['Loại sản phẩm']);
      const qty = suggested.quantity && suggested.quantity > 0 ? suggested.quantity : 1;

      addItem(fullProd as Product, {
        size: isFood ? 'M' : (suggested.size || 'M'),
        sugar: '100% đường',
        ice: '100% đá',
        note: '',
        quantity: qty,
      });
      totalAdded += qty;
    }

    toast.success(`Đã thêm thành công ${totalAdded} món vào giỏ hàng!`, {
      icon: '🎉',
      duration: 3000,
    });
  };

  const startVoice = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói.');
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        void handleSendMessage(transcript);
      }
    };

    recognition.start();
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all"
        title="Trợ lý AI tư vấn gọi món"
        aria-label="Mở Trợ lý AI H2"
      >
        <Sparkles className="w-4 h-4 animate-spin text-amber-200" style={{ animationDuration: '3s' }} />
        <span className="text-xs font-bold tracking-tight">Hỏi AI món ngon</span>
      </button>

      {/* Chatbot Dialog / Bottom Sheet */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center backdrop-blur-xs">
          <div className="bg-white w-full sm:max-w-md h-[82vh] sm:h-[620px] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-in">
            {/* Header */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">Trợ lý H2 MilkTea</h3>
                  <p className="text-[10px] text-orange-100">Gọi món thông minh & giải đáp thắc mắc</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
                aria-label="Đóng trợ lý"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="px-3 py-2 bg-orange-50/70 border-b border-orange-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-xs">
              <button
                onClick={() => handleQuickChip('Gợi ý cho mình các món bán chạy nhất quán')}
                className="px-2.5 py-1 rounded-full bg-white text-orange-700 font-medium border border-orange-200 whitespace-nowrap active:scale-95 transition-transform"
              >
                🔥 Món bán chạy
              </button>
              <button
                onClick={() => handleQuickChip('Có món nào thanh mát, ít ngọt không?')}
                className="px-2.5 py-1 rounded-full bg-white text-emerald-700 font-medium border border-emerald-200 whitespace-nowrap active:scale-95 transition-transform"
              >
                🍃 Ít ngọt, thanh mát
              </button>
              <button
                onClick={() => handleQuickChip('Gợi ý món cà phê ngon')}
                className="px-2.5 py-1 rounded-full bg-white text-amber-800 font-medium border border-amber-200 whitespace-nowrap active:scale-95 transition-transform"
              >
                ☕ Cà phê
              </button>
              <button
                onClick={() => handleQuickChip('Cho mình xin mật khẩu wifi quán')}
                className="px-2.5 py-1 rounded-full bg-white text-blue-700 font-medium border border-blue-200 whitespace-nowrap active:scale-95 transition-transform"
              >
                📶 Pass Wifi
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, idx) => {
                const hasOrderMatch = msg.suggestedProducts?.some((p) => p.isOrderMatch || (p.quantity && p.quantity > 0));
                const totalOrderItems = msg.suggestedProducts?.reduce((sum, p) => sum + (p.quantity || 1), 0) || 0;

                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed break-words whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-orange-500 text-white rounded-br-xs'
                          : 'bg-slate-100 text-slate-800 rounded-bl-xs'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Suggested Products Cards in Chat */}
                    {msg.suggestedProducts && msg.suggestedProducts.length > 0 && (
                      <div className="mt-2 w-full max-w-[95%] space-y-2">
                        <div className="flex items-center justify-between">
                          <p className={`text-[10px] font-extrabold uppercase tracking-wider ${
                            hasOrderMatch ? 'text-orange-600 flex items-center gap-1' : 'text-slate-400'
                          }`}>
                            {hasOrderMatch ? '✨ Món bạn yêu cầu đặt:' : 'Món phù hợp gợi ý cho bạn:'}
                          </p>
                          {hasOrderMatch && msg.suggestedProducts.length > 1 && (
                            <button
                              onClick={() => handleAddAllToCart(msg.suggestedProducts!)}
                              className="text-[10px] font-bold text-orange-600 hover:text-orange-700 underline flex items-center gap-0.5"
                            >
                              Thêm tất cả ({totalOrderItems})
                            </button>
                          )}
                        </div>

                        {msg.suggestedProducts.map((prod) => {
                          const isAdded = addedItemIds[prod.id];
                          const qty = prod.quantity || 1;

                          return (
                            <div
                              key={prod.id}
                              className={`bg-white border rounded-xl p-2.5 flex items-center justify-between shadow-xs transition-all ${
                                prod.isOrderMatch
                                  ? 'border-orange-300 ring-1 ring-orange-200 bg-orange-50/20'
                                  : 'border-slate-200 hover:border-orange-300'
                              }`}
                            >
                              <div
                                onClick={() => handleOpenDetail(prod)}
                                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                              >
                                <div className="relative shrink-0">
                                  {prod.image ? (
                                    <img
                                      src={prod.image}
                                      alt={prod.name}
                                      className="w-11 h-11 rounded-lg object-cover bg-orange-50"
                                    />
                                  ) : (
                                    <span className="w-11 h-11 rounded-lg bg-orange-100 flex items-center justify-center text-xl">
                                      🧋
                                    </span>
                                  )}
                                  {qty > 1 && (
                                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                                      x{qty}
                                    </span>
                                  )}
                                </div>
                                <div className="truncate flex-1">
                                  <h4 className="text-xs font-bold text-slate-800 truncate flex items-center gap-1">
                                    {prod.name}
                                    {prod.size && prod.size !== 'M' && (
                                      <span className="text-[10px] px-1 py-0.2 bg-amber-100 text-amber-800 rounded font-normal">
                                        Size {prod.size}
                                      </span>
                                    )}
                                  </h4>
                                  <p className="text-xs font-semibold text-orange-600 mt-0.5">
                                    {prod.price.toLocaleString('vi-VN')}đ
                                    {qty > 1 && (
                                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                                        (Tổng: {(prod.price * qty).toLocaleString('vi-VN')}đ)
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(prod)}
                                  className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500"
                                  title="Tùy chỉnh đường/đá/size"
                                >
                                  <SlidersHorizontal className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDirectAddToCart(prod)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-xs ${
                                    isAdded
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white'
                                  }`}
                                >
                                  {isAdded ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Đã thêm</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>{qty > 1 ? `Thêm x${qty}` : 'Thêm'}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Nút thêm tất cả các món tiện lợi */}
                        {hasOrderMatch && msg.suggestedProducts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleAddAllToCart(msg.suggestedProducts!)}
                            className="w-full mt-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Thêm tất cả {totalOrderItems} món vào giỏ hàng ngay</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                  <span>Trợ lý đang suy nghĩ...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-slate-100 bg-white flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSendMessage();
                }}
                placeholder={isRecording ? 'Đang lắng nghe bạn nói...' : 'Nhập câu hỏi hoặc yêu cầu món...'}
                className="flex-1 px-3 py-2 text-xs bg-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-400 transition-all"
                disabled={isLoading}
              />
              <button
                onClick={startVoice}
                disabled={isLoading}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="Nói câu hỏi của bạn"
                aria-label="Nhập giọng nói"
              >
                <Mic className="w-4 h-4" />
              </button>
              <Button
                onClick={() => void handleSendMessage()}
                disabled={isLoading || !inputMessage.trim()}
                size="sm"
                className="h-8 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
                aria-label="Gửi tin nhắn"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
