'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bot,
  X,
  Send,
  Mic,
  Loader2,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Sparkles,
  Compass,
  ArrowRight,
  Monitor,
  ChefHat,
  Package,
  Utensils,
  Receipt,
  Users,
  Settings,
  BarChart,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  source?: 'rule' | 'llm' | 'fallback';
  action?: 'add' | 'remove' | 'select_table' | 'qa' | 'none';
  targetTable?: { id: string; name: string } | null;
  items?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    size?: string;
    sugar?: string;
    ice?: string;
    toppings?: string[];
    note?: string;
  }>;
  approvalStatus?: 'pending' | 'confirmed' | 'rejected';
  approvalTimestamp?: string;
}

interface PageContextInfo {
  name: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  suggestedChips: string[];
}

// Bảng ánh xạ ngữ cảnh các trang trong hệ thống (Mục #16)
const PAGE_CONTEXT_MAP: Record<string, PageContextInfo> = {
  '/pos': {
    name: 'Máy Bán Hàng POS',
    category: 'Bán hàng',
    description: 'Order đồ uống, chọn bàn, tính tiền, in tem nhãn ly',
    icon: <Monitor className="h-4 w-4 text-indigo-500" />,
    suggestedChips: [
      '3 trà sữa nướng vào bàn 3',
      'Đổi sang bàn 2',
      'In tem dán ly cà phê',
      'Gửi đến bếp pha chế',
    ],
  },
  '/kitchen': {
    name: 'Màn hình Bếp KDS',
    category: 'Pha chế',
    description: 'Theo dõi đơn chờ làm, thời gian pha chế và hoàn thành món',
    icon: <ChefHat className="h-4 w-4 text-orange-500" />,
    suggestedChips: [
      'Đơn nào đang chờ lâu nhất?',
      'Quy trình ra món như thế nào?',
      'Đến máy bán hàng POS',
      'Cài đặt chuông báo bếp',
    ],
  },
  '/orders': {
    name: 'Quản Lý Đơn Hàng',
    category: 'Doanh thu',
    description: 'Tra cứu lịch sử hóa đơn, in lại bill và đối soát ca',
    icon: <Receipt className="h-4 w-4 text-blue-500" />,
    suggestedChips: [
      'Cách in lại hóa đơn?',
      'Hôm nay bán được bao nhiêu đơn?',
      'Đến màn hình POS bán hàng',
    ],
  },
  '/menu/products': {
    name: 'Quản Lý Thực Đơn',
    category: 'Danh mục',
    description: 'Thêm/sửa món, cập nhật giá bán, phân loại trà sữa & cà phê',
    icon: <Utensils className="h-4 w-4 text-emerald-500" />,
    suggestedChips: [
      'Làm thế nào để thêm món mới?',
      'Quy định size M và size L?',
      'Món nào đang có giá cao nhất?',
      'Đến trang bán hàng POS',
    ],
  },
  '/inventory': {
    name: 'Quản Lý Kho Hàng',
    category: 'Kho vận',
    description: 'Kiểm kê kho, theo dõi tồn kho nguyên liệu và cảnh báo hết hạn',
    icon: <Package className="h-4 w-4 text-amber-500" />,
    suggestedChips: [
      'Nguyên liệu nào sắp hết hàng?',
      'Cách tạo phiếu kiểm kê?',
      'Dự báo nguyên liệu tuần tới',
      'Đến trang cài đặt',
    ],
  },
  '/khachhang': {
    name: 'Khách Hàng & Hội Viên',
    category: 'CRM',
    description: 'Quản lý thông tin khách, tích điểm và phân hạng VIP/Kim cương',
    icon: <Users className="h-4 w-4 text-purple-500" />,
    suggestedChips: [
      'Khách VIP được giảm bao nhiêu %?',
      'Chính sách tích điểm hội viên?',
      'Cách thêm khách hàng mới',
    ],
  },
  '/receipt-settings': {
    name: 'Cài Đặt Mẫu In & VAT',
    category: 'Hệ thống',
    description: 'Cấu hình mẫu hóa đơn, in tem dán ly, thuế VAT và khu bếp',
    icon: <Settings className="h-4 w-4 text-slate-500" />,
    suggestedChips: [
      'Cách cấu hình thuế VAT 8% hoặc 10%?',
      'Cài đặt máy in tem nhãn ly 50x30',
      'Bật âm thanh chuông báo khu bếp',
      'Mở màn hình bếp /kitchen',
    ],
  },
  '/reports': {
    name: 'Báo Cáo Thống Kê',
    category: 'Báo cáo',
    description: 'Biểu đồ doanh thu, món bán chạy và hiệu suất kinh doanh',
    icon: <BarChart className="h-4 w-4 text-rose-500" />,
    suggestedChips: [
      'Doanh thu hôm nay thế nào?',
      'Top món bán chạy nhất quán?',
      'Đến trang quản lý đơn hàng',
    ],
  },
};

export function GlobalAssistant() {
  const pathname = usePathname() || '/';
  const router = useRouter();

  // Xác định ngữ cảnh trang hiện tại
  const pageContext = PAGE_CONTEXT_MAP[pathname] || {
    name: 'H2 MilkTea Dashboard',
    category: 'Hệ thống',
    description: 'Phần mềm quản trị & vận hành quán trà sữa H2',
    icon: <Sparkles className="h-4 w-4 text-indigo-500" />,
    suggestedChips: [
      'Đi đến máy bán hàng POS',
      'Mở màn hình bếp pha chế',
      'Xem danh mục thực đơn',
      'Cài đặt mẫu in & VAT',
    ],
  };

  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 420,
    height: 560,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const [isResizing, setIsResizing] = useState(false);

  // 1. Khôi phục kích thước và lịch sử chat từ localStorage
  useEffect(() => {
    try {
      const savedDim = localStorage.getItem('h2_global_assistant_size');
      if (savedDim) {
        const parsed = JSON.parse(savedDim);
        if (parsed.width && parsed.height) {
          setDimensions(parsed);
        }
      }

      const savedChat = localStorage.getItem('h2_global_assistant_messages');
      if (savedChat) {
        setMessages(JSON.parse(savedChat));
      } else {
        setMessages([
          {
            role: 'assistant',
            content: `Xin chào! Mình là Trợ lý AI H2 MilkTea. Hiện bạn đang ở **${pageContext.name}**. Bạn cần hỗ trợ gì hôm nay? 🧋`,
          },
        ]);
      }
    } catch {
      // Bỏ qua lỗi truy cập storage
    }
  }, []);

  // Lưu lịch sử chat
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem('h2_global_assistant_messages', JSON.stringify(messages.slice(-25)));
      } catch {}
    }
  }, [messages]);

  // 2. TỰ ĐỘNG CUỘN XUỐNG TIN NHẮN MỚI NHẤT (Mục #3)
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(true);
    }
  }, [messages, isLoading, isOpen, scrollToBottom]);

  // 3. XỬ LÝ KÉO MỞ RỘNG / THU HẸP KHUNG CHAT 60FPS SMOOTH (Mục #10)
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = dimensions.width;
    const startHeight = dimensions.height;
    let currentW = startWidth;
    let currentH = startHeight;
    let rafId: number | null = null;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaX = startX - moveEvent.clientX;
      const deltaY = startY - moveEvent.clientY;

      const newWidth = Math.min(Math.max(startWidth + deltaX, 360), Math.min(window.innerWidth - 32, 850));
      const newHeight = Math.min(Math.max(startHeight + deltaY, 400), Math.min(window.innerHeight - 80, 800));

      currentW = newWidth;
      currentH = newHeight;

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (chatWindowRef.current) {
          chatWindowRef.current.style.width = `${currentW}px`;
          chatWindowRef.current.style.height = `${currentH}px`;
        }
      });
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      setIsResizing(false);
      if (rafId) cancelAnimationFrame(rafId);
      const updated = { width: currentW, height: currentH };
      setDimensions(updated);
      try {
        localStorage.setItem('h2_global_assistant_size', JSON.stringify(updated));
      } catch {}
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const toggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  // 4. MỞ KHÓA BÔI ĐEN & NÚT SAO CHÉP TIN NHẮN (Mục #3)
  const handleCopyMessage = (text: string, index: number) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success('Đã sao chép nội dung vào bộ nhớ tạm!');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error('Không thể sao chép văn bản.');
    }
  };

  // 5. GỬI TIN NHẮN & XỬ LÝ NGỮ CẢNH (Mục #16)
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          pathname,
          pageContext: pageContext.name,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const hasActionableItems = Boolean(
          (data.items && data.items.length > 0) ||
          (data.action === 'select_table' && data.targetTable)
        );
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: data.message || 'Đã xử lý yêu cầu của bạn.',
          source: data.source,
          action: data.action,
          targetTable: data.targetTable,
          items: data.items,
          approvalStatus: hasActionableItems ? 'pending' : undefined,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.message || data.error || 'Có lỗi khi xử lý câu hỏi. Vui lòng thử lại.',
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Không thể kết nối đến máy chủ AI. Vui lòng kiểm tra lại đường truyền mạng.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Xác nhận duyệt đơn bằng tay
  const handleApproveOrder = (index: number) => {
    const msg = messages[index];
    if (!msg || !msg.action) return;

    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) =>
      prev.map((m, idx) =>
        idx === index
          ? {
              ...m,
              approvalStatus: 'confirmed',
              approvalTimestamp: timeStr,
            }
          : m
      )
    );

    const payload = {
      action: msg.action,
      items: msg.items || [],
      targetTable: msg.targetTable,
    };

    if (pathname === '/pos') {
      window.dispatchEvent(new CustomEvent('h2_pos_ai_apply', { detail: payload }));
      toast.success(`Đã duyệt đơn và nạp vào ${msg.targetTable?.name || 'bàn'}!`);
    } else {
      try {
        localStorage.setItem('h2_pending_ai_pos_order', JSON.stringify(payload));
      } catch (err) {
        console.warn('Lỗi lưu pending AI order:', err);
      }
      toast.success(`Đã duyệt đơn! Đang chuyển sang màn hình POS...`);
      router.push('/pos');
    }
  };

  // Hủy bỏ / từ chối duyệt
  const handleRejectOrder = (index: number) => {
    setMessages((prev) =>
      prev.map((m, idx) =>
        idx === index
          ? {
              ...m,
              approvalStatus: 'rejected',
              approvalTimestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            }
          : m
      )
    );
    toast('Đã hủy bỏ thao tác gọi món của AI.', { icon: 'ℹ️' });
  };

  // 6. NHẬN DIỆN GIỌNG NÓI
  const startVoiceInput = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.error('Trình duyệt chưa hỗ trợ nhận diện giọng nói.');
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

  // 7. XỬ LÝ LINK ĐIỀU HƯỚNG TRONG TIN NHẮN (Ví dụ [Mở Bếp](/kitchen))
  const renderMessageContent = (content: string) => {
    // Regex tìm link Markdown [Title](path)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      const title = match[1];
      const url = match[2];

      parts.push(
        <button
          key={`${title}-${match.index}`}
          onClick={() => {
            if (url.startsWith('/')) {
              router.push(url);
              setIsOpen(false);
              toast.success(`Đang chuyển đến ${title}...`);
            } else {
              window.open(url, '_blank');
            }
          }}
          className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 font-bold hover:bg-indigo-200 active:scale-95 transition-all text-xs underline underline-offset-2"
        >
          <span>{title}</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  return (
    <>
      {/* Cửa sổ Chatbot khi mở */}
      {isOpen && (
        <div
          ref={chatWindowRef}
          style={
            isMaximized
              ? { width: 'calc(100vw - 32px)', height: 'calc(100vh - 40px)', bottom: '20px', right: '16px' }
              : { width: `${dimensions.width}px`, height: `${dimensions.height}px`, bottom: '80px', right: '16px' }
          }
          className={`fixed z-50 flex flex-col rounded-3xl border border-indigo-200/80 bg-white shadow-2xl overflow-hidden ${isResizing ? "transition-none select-none" : "transition-all duration-150"} animate-in fade-in slide-in-from-bottom-4`}
        >
          {/* Resize Handle ở góc trên bên trái (Mục #2) */}
          {!isMaximized && (
            <div
              onMouseDown={handleMouseDownResize}
              title="Kéo để mở rộng hoặc thu nhỏ khung chat"
              className="absolute top-0 left-0 h-6 w-6 cursor-nwse-resize z-50 flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <div className="h-2 w-2 border-t-2 border-l-2 border-current rounded-tl-sm" />
            </div>
          )}

          {/* Header Chatbot */}
          <div className="flex items-center justify-between border-b border-indigo-100 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-4 py-3 text-white select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-inner">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm truncate">Trợ Lý AI H2 MilkTea</h3>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                </div>
                {/* Huy hiệu nhận diện ngữ cảnh trang hiện tại (Mục #16) */}
                <div className="flex items-center gap-1 text-[11px] text-indigo-100 font-medium truncate">
                  <span className="opacity-75">📍 Đang ở:</span>
                  <span className="font-bold underline decoration-indigo-300">{pageContext.name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-2">
              {/* Nút Mở rộng / Thu nhỏ (Mục #2) */}
              <button
                type="button"
                onClick={toggleMaximize}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white"
                title={isMaximized ? 'Thu nhỏ lại kích thước chuẩn' : 'Mở rộng khung chat tối đa'}
              >
                {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>

              {/* Nút Đóng */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white"
                title="Đóng trợ lý"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Context Chips Bar (Mục #16) */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-gray-100 bg-gray-50/80 px-3 py-2 text-xs no-scrollbar">
            <span className="text-[10px] font-bold text-gray-500 shrink-0">💡 Gợi ý nhanh:</span>
            {pageContext.suggestedChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => void handleSendMessage(chip)}
                className="shrink-0 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 transition-all"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Danh Sách Tin Nhắn (Mục #3: Mở khóa bôi đen select-text) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 select-text cursor-text" style={{ fontSize: "var(--h2-chatbot-font-size, 14px)" }}>
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-gray-400 font-semibold px-1">
                    <span>{isUser ? 'Bạn' : 'Trợ lý H2 MilkTea'}</span>
                    {!isUser && (
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.content, index)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-indigo-600 rounded"
                        title="Sao chép câu trả lời"
                      >
                        {copiedIndex === index ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Bong bóng tin nhắn cho phép bôi đen copy mượt mà */}
                  <div
                    className={`relative rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed max-w-[85%] whitespace-pre-wrap select-text selection:bg-indigo-200 selection:text-indigo-900 ${
                      isUser
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm font-medium'
                        : 'bg-gray-100 text-gray-800 border border-gray-200/60 shadow-xs'
                    }`}
                  >
                    {renderMessageContent(msg.content)}
                  </div>

                  {/* Thẻ Duyệt Đơn Bằng Tay (Manual Approval Card) */}
                  {!isUser && ((msg.items && msg.items.length > 0) || (msg.action === 'select_table' && msg.targetTable)) && (
                    <div className="mt-2.5 w-full max-w-[95%] rounded-xl border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 shadow-md p-3 text-xs space-y-2.5">
                      {/* Tiêu đề thẻ & Bàn mục tiêu */}
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
                          <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                          <span>Phiếu xem trước lệnh gọi món</span>
                        </div>
                        {msg.targetTable && (
                          <Badge className="bg-indigo-600 text-white text-[11px] font-bold px-2 py-0.5">
                            📍 {msg.targetTable.name}
                          </Badge>
                        )}
                      </div>

                      {/* Thông tin chi tiết món nếu có */}
                      {msg.items && msg.items.length > 0 ? (
                        <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {msg.action === 'remove' ? 'Món yêu cầu bớt:' : 'Món yêu cầu thêm:'}
                          </div>
                          {msg.items.map((it, iIdx) => (
                            <div key={iIdx} className="flex flex-col gap-0.5 border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5 last:border-b-0 last:pb-0">
                              <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                                <span>{it.quantity}x {it.productName}</span>
                                {it.size && <span className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-1.5 py-0.2 rounded font-semibold">Size {it.size}</span>}
                              </div>
                              <div className="flex flex-wrap gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                {it.sugar && it.sugar !== '100%' && <span>{it.sugar} đường</span>}
                                {it.ice && it.ice !== '100% đá' && <span>· {it.ice}</span>}
                                {it.toppings && it.toppings.length > 0 && <span>· +{it.toppings.join(', ')}</span>}
                                {it.note && <span className="italic">({it.note})</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                          Chuyển đến làm việc với bàn: <strong>{msg.targetTable?.name}</strong> (chưa có món)
                        </div>
                      )}

                      {/* Ghi chú nhắc nhở duyệt */}
                      <div className="text-[10.5px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200/60 flex items-start gap-1.5 leading-snug">
                        <span className="font-bold shrink-0">⚠️ Duyệt bằng tay:</span>
                        <span>Vui lòng kiểm tra lại xem AI đã nhận diện đúng bàn và món bạn cần chưa trước khi áp dụng vào giỏ hàng.</span>
                      </div>

                      {/* Nút hành động Duyệt / Hủy */}
                      <div className="pt-1 flex items-center justify-end gap-2">
                        {msg.approvalStatus === 'confirmed' ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-300">
                            <Check className="h-4 w-4" />
                            <span>Đã duyệt & áp dụng vào {msg.targetTable?.name || 'bàn'}{msg.approvalTimestamp ? ` (${msg.approvalTimestamp})` : ''}</span>
                          </div>
                        ) : msg.approvalStatus === 'rejected' ? (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                            <X className="h-4 w-4" />
                            <span>Đã hủy bỏ thao tác này</span>
                          </div>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectOrder(index)}
                              className="h-8 px-2.5 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 border-gray-300 font-medium"
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Hủy bỏ
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleApproveOrder(index)}
                              className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm flex items-center gap-1"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Xác nhận duyệt thêm vào bàn
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex flex-col items-start gap-1.5 py-1">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-semibold px-1">
                  <span>Trợ lý H2 MilkTea</span>
                </div>
                <div className="rounded-2xl px-4 py-3 bg-gradient-to-r from-indigo-50/80 via-purple-50/80 to-pink-50/80 border border-indigo-100 shadow-xs flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" />
                  </div>
                  <span className="text-xs font-medium text-indigo-900/80 animate-pulse">
                    Đang suy nghĩ câu trả lời phù hợp nhất...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="border-t border-gray-100 bg-white p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSendMessage();
                }}
                disabled={isLoading}
                placeholder={isRecording ? 'Đang lắng nghe giọng nói của bạn...' : `Hỏi bất kỳ điều gì về ${pageContext.name}...`}
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 select-text"
              />

              {/* Nút Giọng nói */}
              <Button
                type="button"
                size="sm"
                variant={isRecording ? 'destructive' : 'outline'}
                onClick={startVoiceInput}
                disabled={isLoading}
                className="h-9 w-9 p-0 rounded-xl shrink-0"
                title="Nhập bằng giọng nói"
              >
                <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse text-white' : 'text-gray-600'}`} />
              </Button>

              {/* Nút Gửi */}
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSendMessage()}
                disabled={isLoading || !inputValue.trim()}
                className="h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shrink-0 shadow-sm"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Nút FAB nổi góc màn hình để mở Chatbot bất kỳ lúc nào */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-xl shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all"
        title="Mở Trợ lý AI H2 MilkTea"
        aria-label="Trợ lý AI H2"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <Bot className="h-7 w-7" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>
        )}
      </button>
    </>
  );
}
