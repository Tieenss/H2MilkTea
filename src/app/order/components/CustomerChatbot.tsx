'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  X,
  Send,
  Mic,
  Bot,
  Plus,
  Minus,
  Loader2,
  ShoppingCart,
  Check,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { getAppearanceSettings, applyAppearanceSettings } from '@/utils/appearanceSettings';
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
  sugar?: string;
  ice?: string;
  toppings?: string[];
  note?: string;
  isOrderMatch?: boolean;
}

export interface DisambiguationOption {
  id: string;
  name: string;
  price: number;
  category?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  intent?: 'ORDER_ADD' | 'RECOMMENDATION' | 'FAQ_GENERAL' | 'GENERAL';
  suggestedProducts?: SuggestedProduct[];
  disambiguation?: DisambiguationOption[];
}

export interface CustomerChatbotProps {
  onSelectProduct?: (product: Product) => void;
  catalogProducts?: Product[];
  tableName?: string;
  tableId?: string;
}

const CHAT_TTL_MS = 24 * 60 * 60 * 1000; // 24 giờ
const SUGAR_LEVELS = ['100% đường', '70% đường', '50% đường', '0% đường'];
const ICE_LEVELS = ['100% đá', '50% đá', '0% đá'];

export function CustomerChatbot({
  onSelectProduct,
  catalogProducts = [],
  tableName,
  tableId,
}: CustomerChatbotProps) {
  const router = useRouter();
  const { addItem, totalItems } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const storageKeyV2 = `h2_customer_chat_v2_${tableId || 'default'}`;
  const legacySessionKey = `h2_customer_chat_${tableId || 'default'}`;

  const defaultWelcomeMessage: ChatMessage = {
    role: 'assistant',
    content: tableName
      ? `Xin chào bạn tại ${tableName}! Mình là Trợ lý ảo H2 MilkTea. Bạn muốn gọi thêm món gì hay cần tư vấn menu không? 🧋`
      : 'Xin chào bạn! Mình là Trợ lý ảo H2 MilkTea. Bạn muốn tìm món gì hôm nay? (ít ngọt, thanh mát, cà phê, ăn vặt...) 🧋',
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedV2 = localStorage.getItem(storageKeyV2);
        if (savedV2) {
          const parsed = JSON.parse(savedV2);
          if (
            parsed &&
            Array.isArray(parsed.messages) &&
            parsed.messages.length > 0 &&
            (!parsed.savedAt || Date.now() - Number(parsed.savedAt) < CHAT_TTL_MS)
          ) {
            return parsed.messages;
          }
        }
        const savedLegacy = sessionStorage.getItem(legacySessionKey);
        if (savedLegacy) {
          const parsedLegacy = JSON.parse(savedLegacy);
          if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) return parsedLegacy;
        }
      } catch {}
    }
    return [defaultWelcomeMessage];
  });

  // Đồng bộ font chữ & cỡ chữ Chatbot từ AppearanceSettings ngay cả trên trang khách hàng (/order)
  useEffect(() => {
    try {
      applyAppearanceSettings(getAppearanceSettings());
    } catch {}
    const handleAppearanceUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        applyAppearanceSettings(customEvent.detail);
      } else {
        applyAppearanceSettings(getAppearanceSettings());
      }
    };
    window.addEventListener('h2_appearance_settings_updated', handleAppearanceUpdate);
    return () => window.removeEventListener('h2_appearance_settings_updated', handleAppearanceUpdate);
  }, []);

  const [isRecording, setIsRecording] = useState(false);
  const [fabPosition, setFabPosition] = useState<{ x: number; y: number } | null>(null);
  const isDraggingFabRef = useRef(false);
  const fabStartRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number }>({
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('h2_customer_chat_fab_pos');
      if (saved) {
        const p = JSON.parse(saved);
        if (typeof p.x === 'number' && typeof p.y === 'number') {
          const safeX = Math.max(10, Math.min(window.innerWidth - 130, p.x));
          const safeY = Math.max(10, Math.min(window.innerHeight - 60, p.y));
          setFabPosition({ x: safeX, y: safeY });
        }
      }
    } catch {}
  }, []);

  const handleFabStart = (clientX: number, clientY: number, target: HTMLElement) => {
    isDraggingFabRef.current = false;
    const rect = target.getBoundingClientRect();
    fabStartRef.current = {
      startX: clientX,
      startY: clientY,
      startLeft: rect.left,
      startTop: rect.top,
    };

    target.style.transition = 'none';
    target.style.willChange = 'left, top';

    let rafId: number | null = null;
    let latestX = rect.left;
    let latestY = rect.top;

    const applyDOM = () => {
      target.style.left = `${latestX}px`;
      target.style.top = `${latestY}px`;
      target.style.bottom = 'auto';
      target.style.right = 'auto';
      rafId = null;
    };

    const handleMove = (moveX: number, moveY: number) => {
      const deltaX = moveX - fabStartRef.current.startX;
      const deltaY = moveY - fabStartRef.current.startY;
      if (!isDraggingFabRef.current && Math.hypot(deltaX, deltaY) > 3) {
        isDraggingFabRef.current = true;
      }
      if (isDraggingFabRef.current) {
        latestX = Math.max(10, Math.min(window.innerWidth - 130, fabStartRef.current.startLeft + deltaX));
        latestY = Math.max(10, Math.min(window.innerHeight - 60, fabStartRef.current.startTop + deltaY));
        if (!rafId) {
          rafId = requestAnimationFrame(applyDOM);
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);

      if (rafId) {
        cancelAnimationFrame(rafId);
        applyDOM();
      }

      target.style.transition = '';
      target.style.willChange = '';

      if (isDraggingFabRef.current) {
        setFabPosition({ x: latestX, y: latestY });
        try {
          localStorage.setItem('h2_customer_chat_fab_pos', JSON.stringify({ x: latestX, y: latestY }));
        } catch {}
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
  };

  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, scrollToBottom]);

  // Tự động lưu phiên chat vào localStorage (tồn tại 24h qua cả khi đóng mở trình duyệt)
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        const trimmed = messages.slice(-25);
        localStorage.setItem(
          storageKeyV2,
          JSON.stringify({
            savedAt: Date.now(),
            messages: trimmed,
          })
        );
        if (messages.length > 1) {
          sessionStorage.setItem(legacySessionKey, JSON.stringify(trimmed));
        }
      } catch {}
    }
  }, [messages, storageKeyV2, legacySessionKey]);

  // Xóa lịch sử trò chuyện và làm mới hội thoại
  const handleClearChatHistory = () => {
    const freshMsg: ChatMessage = {
      role: 'assistant',
      content: tableName
        ? `Xin chào bạn tại ${tableName}! Mình là Trợ lý ảo H2 MilkTea. Bạn muốn gọi thêm món gì hay cần tư vấn menu không? 🧋`
        : 'Xin chào bạn! Mình là Trợ lý ảo H2 MilkTea. Bạn muốn tìm món gì hôm nay? (ít ngọt, thanh mát, cà phê, ăn vặt...) 🧋',
    };
    setMessages([freshMsg]);
    try {
      localStorage.removeItem(storageKeyV2);
      sessionStorage.removeItem(legacySessionKey);
    } catch {}
    toast.success('Đã xóa lịch sử trò chuyện!');
  };

  // Cập nhật tùy chỉnh nhanh (Size / Đường / Đá / Số lượng) ngay trên thẻ món đề xuất
  const handleUpdateSuggestedProduct = (
    msgIndex: number,
    prodId: string,
    patch: Partial<SuggestedProduct>
  ) => {
    setMessages((prev) =>
      prev.map((m, idx) => {
        if (idx !== msgIndex || !m.suggestedProducts) return m;
        return {
          ...m,
          suggestedProducts: m.suggestedProducts.map((p) =>
            p.id === prodId ? { ...p, ...patch } : p
          ),
        };
      })
    );
  };

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
            disambiguation: data.disambiguation,
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

  // Thêm nhanh trực tiếp vào giỏ hàng với đúng số lượng và tùy chỉnh đã chọn
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
      sugar: isFood ? '' : (suggested.sugar || '100% đường'),
      ice: isFood ? '' : (suggested.ice || '100% đá'),
      note: suggested.note || '',
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
        sugar: isFood ? '' : (suggested.sugar || '100% đường'),
        ice: isFood ? '' : (suggested.ice || '100% đá'),
        note: suggested.note || '',
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
      {/* Floating Trigger Button - Tự động né thanh giỏ hàng và banner phục vụ */}
      <button
        style={
          fabPosition
            ? { left: `${fabPosition.x}px`, top: `${fabPosition.y}px`, bottom: 'auto', right: 'auto' }
            : undefined
        }
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          handleFabStart(e.clientX, e.clientY, e.currentTarget);
        }}
        onTouchStart={(e) => {
          if (e.touches.length > 0) {
            handleFabStart(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
          }
        }}
        onClick={() => {
          if (isDraggingFabRef.current) return;
          setIsOpen(true);
        }}
        className={`fixed z-45 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/30 hover:scale-105 active:scale-95 transition-all select-none cursor-grab active:cursor-grabbing ${
          !fabPosition ? (totalItems > 0 ? 'right-4 bottom-36' : 'right-4 bottom-18') : ''
        }`}
        title="Nhấn giữ để kéo di chuyển nút Trợ lý AI"
        aria-label="Mở Trợ lý AI H2"
      >
        <Sparkles className="w-4 h-4 text-amber-200" />
        <span className="text-xs font-bold tracking-tight">Hỏi AI món ngon</span>
      </button>

      {/* Chatbot Dialog / Bottom Sheet */}
      {isOpen && (
        <div className="h2-chatbot-scope fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center backdrop-blur-xs">
          <div className="bg-white w-full sm:max-w-md h-[84vh] sm:h-[640px] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-in">
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
              <div className="flex items-center gap-1.5">
                {messages.length > 1 && (
                  <button
                    type="button"
                    onClick={handleClearChatHistory}
                    className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                    title="Làm mới / Xóa lịch sử trò chuyện"
                    aria-label="Xóa lịch sử trò chuyện"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
                  aria-label="Đóng trợ lý"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
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
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ fontSize: 'var(--h2-chatbot-font-size, 14px)' }}>
              {messages.map((msg, idx) => {
                const hasOrderMatch = msg.suggestedProducts?.some((p) => p.isOrderMatch || (p.quantity && p.quantity > 0));
                const totalOrderItems = msg.suggestedProducts?.reduce((sum, p) => sum + (Number(p.quantity) || 1), 0) || 0;

                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`h2-chatbot-bubble max-w-[88%] rounded-2xl px-3.5 py-2.5 break-words whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-orange-500 text-white rounded-br-xs'
                          : 'bg-slate-100 text-slate-800 rounded-bl-xs'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Disambiguation Chips (khi khách hỏi món chung chung) */}
                    {msg.disambiguation && msg.disambiguation.length > 0 && (
                      <div className="mt-2 w-full max-w-[95%] flex flex-wrap gap-1.5">
                        {msg.disambiguation.map((cand) => (
                          <button
                            key={cand.id}
                            type="button"
                            onClick={() => void handleSendMessage(`Cho mình 1 ${cand.name}`)}
                            className="px-2.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 text-xs font-semibold transition-all active:scale-95"
                          >
                            + Chọn: {cand.name} ({Number(cand.price || 0).toLocaleString('vi-VN')}đ)
                          </button>
                        ))}
                      </div>
                    )}

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
                          const qty = Number(prod.quantity) || 1;
                          const isFood = ['Ăn vặt', 'Bánh ngọt'].includes(prod.category || '');
                          const currentSize = prod.size || 'M';
                          const currentSugar = prod.sugar || '100% đường';
                          const currentIce = prod.ice || '100% đá';
                          const effectiveUnitPrice = Number(prod.price || 0) + (!isFood && currentSize === 'L' ? 5000 : 0);

                          return (
                            <div
                              key={prod.id}
                              className={`bg-white border rounded-xl p-2.5 flex flex-col gap-2 shadow-xs transition-all ${
                                prod.isOrderMatch
                                  ? 'border-orange-300 ring-1 ring-orange-200 bg-orange-50/20'
                                  : 'border-slate-200 hover:border-orange-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
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
                                      {!isFood && (
                                        <span className="text-[10px] px-1 py-0.2 bg-amber-100 text-amber-800 rounded font-semibold">
                                          Size {currentSize}
                                        </span>
                                      )}
                                    </h4>
                                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                      <p className="text-xs font-semibold text-orange-600">
                                        {effectiveUnitPrice.toLocaleString('vi-VN')}đ
                                        {qty > 1 && (
                                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                                            (Tổng: {(effectiveUnitPrice * qty).toLocaleString('vi-VN')}đ)
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDetail(prod)}
                                    className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500"
                                    title="Tùy chỉnh chi tiết đường/đá/topping"
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

                              {/* Inline Quick Customization Pills cho đồ uống */}
                              {!isFood && (
                                <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-slate-100 text-[10px]">
                                  {/* Số lượng [-] [+] */}
                                  <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1 py-0.5 mr-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateSuggestedProduct(idx, prod.id, {
                                          quantity: Math.max(1, qty - 1),
                                        })
                                      }
                                      className="p-0.5 text-slate-600 hover:text-orange-600"
                                      aria-label="Giảm số lượng"
                                    >
                                      <Minus className="w-2.5 h-2.5" />
                                    </button>
                                    <span className="px-1.5 font-bold text-slate-800">{qty}</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateSuggestedProduct(idx, prod.id, {
                                          quantity: qty + 1,
                                        })
                                      }
                                      className="p-0.5 text-slate-600 hover:text-orange-600"
                                      aria-label="Tăng số lượng"
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                    </button>
                                  </div>

                                  {/* Đổi nhanh Size M / L */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateSuggestedProduct(idx, prod.id, {
                                        size: currentSize === 'L' ? 'M' : 'L',
                                      })
                                    }
                                    className={`px-1.5 py-0.5 rounded-md border font-semibold transition-colors ${
                                      currentSize === 'L'
                                        ? 'bg-amber-100 border-amber-300 text-amber-900'
                                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-orange-300'
                                    }`}
                                    title="Chạm để đổi Size M / Size L (+5.000đ)"
                                  >
                                    Size {currentSize}
                                  </button>

                                  {/* Đổi nhanh % Đường */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const curIdx = SUGAR_LEVELS.indexOf(currentSugar);
                                      const nextSugar = SUGAR_LEVELS[(curIdx + 1) % SUGAR_LEVELS.length];
                                      handleUpdateSuggestedProduct(idx, prod.id, { sugar: nextSugar });
                                    }}
                                    className={`px-1.5 py-0.5 rounded-md border font-medium transition-colors ${
                                      currentSugar !== '100% đường'
                                        ? 'bg-teal-50 border-teal-300 text-teal-800 font-semibold'
                                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-orange-300'
                                    }`}
                                    title="Chạm để đổi mức đường (100% / 70% / 50% / 0%)"
                                  >
                                    🍬 {currentSugar}
                                  </button>

                                  {/* Đổi nhanh % Đá */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const curIdx = ICE_LEVELS.indexOf(currentIce);
                                      const nextIce = ICE_LEVELS[(curIdx + 1) % ICE_LEVELS.length];
                                      handleUpdateSuggestedProduct(idx, prod.id, { ice: nextIce });
                                    }}
                                    className={`px-1.5 py-0.5 rounded-md border font-medium transition-colors ${
                                      currentIce !== '100% đá'
                                        ? 'bg-sky-50 border-sky-300 text-sky-800 font-semibold'
                                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-orange-300'
                                    }`}
                                    title="Chạm để đổi mức đá (100% / 50% / 0%)"
                                  >
                                    🧊 {currentIce}
                                  </button>
                                </div>
                              )}
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
                className="h2-chatbot-input flex-1 px-3 py-2 bg-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-400 transition-all"
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
