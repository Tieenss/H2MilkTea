'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, X, Send, Mic, Bot, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Product } from '../types/customer-order';

interface SuggestedProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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

  const handlePickSuggested = (suggested: SuggestedProduct) => {
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
          <div className="bg-white w-full sm:max-w-md h-[80vh] sm:h-[600px] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-in">
            {/* Header */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">Trợ lý H2 MilkTea</h3>
                  <p className="text-[10px] text-orange-100">Gợi ý đồ uống & giải đáp thắc mắc</p>
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
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-orange-500 text-white rounded-br-xs'
                        : 'bg-slate-100 text-slate-800 rounded-bl-xs'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Suggested Products Cards in Chat */}
                  {msg.suggestedProducts && msg.suggestedProducts.length > 0 && (
                    <div className="mt-2 w-full max-w-[90%] space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Món phù hợp gợi ý cho bạn:
                      </p>
                      {msg.suggestedProducts.map((prod) => (
                        <div
                          key={prod.id}
                          className="bg-white border border-orange-200 rounded-xl p-2 flex items-center justify-between shadow-xs hover:border-orange-400 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {prod.image ? (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-10 h-10 rounded-lg object-cover bg-orange-50 shrink-0"
                              />
                            ) : (
                              <span className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-lg shrink-0">
                                🧋
                              </span>
                            )}
                            <div className="truncate">
                              <h4 className="text-xs font-bold text-slate-800 truncate">{prod.name}</h4>
                              <p className="text-xs font-semibold text-orange-600">
                                {prod.price.toLocaleString('vi-VN')}đ
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handlePickSuggested(prod)}
                            className="ml-2 px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold shrink-0 flex items-center gap-1 active:scale-95 transition-transform"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Chọn</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

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
