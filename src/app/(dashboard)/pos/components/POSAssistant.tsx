'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Check, Loader2, Mic, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  onstart: () => void;
  onend: () => void;
  onerror: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  start: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface AssistantItem {
  productId: string;
  productName: string;
  quantity: number;
  note?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface POSAssistantProps {
  onAddToCart: (productId: string) => void;
  onAdjustQuantity: (productId: string, amount: number) => void;
  cart: Array<{ id: string; name: string; quantity: number }>;
  selectedTableName: string;
}

export function POSAssistant({ onAddToCart, onAdjustQuantity, cart, selectedTableName }: POSAssistantProps) {
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<AssistantItem[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<'add' | 'remove' | 'none'>('none');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [recording, setRecording] = useState(false);
  const storageKey = `h2-pos-ai-chat:${selectedTableName}`;
  const loadedStorageKeyRef = useRef<string | null>(null);

  useEffect(() => {
    fetch('/api/ai/settings')
      .then(async (response) => {
        const result = await response.json();
        if (response.ok && result.success) setEnabled(result.enabled);
      })
      .catch((error) => console.error('Không thể tải trạng thái chatbot:', error));
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      setMessages(saved ? JSON.parse(saved) as ChatMessage[] : []);
      loadedStorageKeyRef.current = storageKey;
    } catch (error) {
      console.error('Không thể tải lịch sử chat POS:', error);
      setMessages([]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (loadedStorageKeyRef.current !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-20)));
    } catch (error) {
      console.error('Không thể lưu lịch sử chat POS:', error);
    }
  }, [messages, storageKey]);

  async function analyzeOrder() {
    if (!message.trim() || loading) return;
    setLoading(true);
    setReply('');
    setItems([]);
    const userMessage = message.trim();
    setMessages((current) => [...current, { role: 'user', content: userMessage }]);

    if (/^(xin chào(\s+(bạn|bot|em|shop|ad))?|chào(\s+(bạn|bot|em|shop|ad|buổi sáng|buổi trưa|buổi chiều|buổi tối))?|hello(\s+(bạn|bot))?|hi(\s+(bạn|bot))?|alo(\s+(bạn|bot))?|hey)[!. ]*$/i.test(userMessage)) {
      const greeting = 'Xin chào! Tôi có thể giúp thêm hoặc bớt món trong giỏ của bàn hiện tại.';
      setReply(greeting);
      setMessages((current) => [...current, { role: 'assistant', content: greeting }]);
      setMessage('');
      setLoading(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 30000);
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: userMessage,
          history: messages,
          table: selectedTableName,
          cart,
        }),
      });
      window.clearTimeout(timeout);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Không thể xử lý câu lệnh.');
      setItems(result.items || []);
      setReply(result.message || '');
      setAction(result.action || 'none');
      setMessages((current) => [...current, { role: 'assistant', content: result.message || '' }]);
    } catch (error) {
      const rawMessage = error instanceof DOMException && error.name === 'AbortError'
        ? 'Gemini phản hồi quá lâu. Vui lòng thử lại.'
        : error instanceof Error ? error.message : 'Không thể xử lý câu lệnh.';
      const errorMessage = /high demand|overloaded|spikes in demand|quá tải|503/i.test(rawMessage)
        ? 'Hệ thống AI hiện đang bận hoặc quá tải. Vui lòng thử lại sau giây lát.'
        : rawMessage;
      setReply(errorMessage);
      setMessages((current) => [...current, { role: 'assistant', content: errorMessage }]);
    } finally {
      setLoading(false);
    }
  }

  function confirmItems() {
    items.forEach((item) => {
      if (action === 'remove') onAdjustQuantity(item.productId, -item.quantity);
      else if (action === 'add') {
        for (let index = 0; index < item.quantity; index += 1) onAddToCart(item.productId);
      }
    });
    setReply(action === 'remove' ? 'Đã bớt món khỏi giỏ hàng.' : 'Đã thêm món vào giỏ hàng.');
    setItems([]);
    setMessage('');
    setAction('none');
  }

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setReply('Trình duyệt này chưa hỗ trợ nhập giọng nói.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.onstart = () => setRecording(true);
    recognition.onend = () => setRecording(false);
    recognition.onerror = () => {
      setRecording(false);
      setReply('Không nhận diện được giọng nói. Vui lòng thử lại.');
    };
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      setMessage(event.results[0][0].transcript);
    };
    recognition.start();
  }

  if (!enabled) return null;

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-[420px] flex-col gap-3 rounded-xl border border-indigo-200 bg-white p-4 shadow-2xl">
          <div className="flex items-center justify-between text-sm font-semibold text-indigo-700">
            <span className="flex items-center gap-2"><Bot className="h-4 w-4" /> Trợ lý POS</span>
            <Button onClick={() => setOpen(false)} variant="ghost" size="icon" aria-label="Đóng trợ lý POS">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-red-600">Chưa phát triển: thanh toán, đổi bàn, giảm giá và báo cáo.</p>
          <div className="max-h-48 space-y-2 overflow-y-auto text-sm">
            {messages.map((chatMessage, index) => (
              <p key={`${chatMessage.role}-${index}`} className={chatMessage.role === 'user' ? 'text-right text-indigo-700' : 'text-muted-foreground'}>
                <span className="font-medium">{chatMessage.role === 'user' ? 'Bạn: ' : 'AI: '}</span>{chatMessage.content}
              </p>
            ))}
            {!messages.length && <p className="text-muted-foreground">Nhập món cần thêm hoặc bớt khỏi giỏ.</p>}
          </div>
          {items.length > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-md bg-indigo-50 p-2 text-sm">
              <span>{action === 'remove' ? 'Bớt ' : 'Thêm '}{items.map((item) => `${item.quantity}x ${item.productName}`).join(', ')}?</span>
              <Button onClick={confirmItems} size="sm"><Check className="h-4 w-4" /> Xác nhận</Button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              autoFocus
              className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') void analyzeOrder(); }}
              placeholder="Ví dụ: 2 trà sữa nướng..."
              disabled={loading}
            />
            <Button onClick={() => void analyzeOrder()} disabled={loading || !message.trim()} size="sm" aria-label="Gửi yêu cầu">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
            <Button onClick={startVoiceInput} disabled={loading || recording} size="sm" variant={recording ? 'destructive' : 'outline'} aria-label="Nhập bằng giọng nói">
              <Mic className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <Button
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full bg-indigo-600 p-0 text-white shadow-lg hover:bg-indigo-700"
        aria-label={open ? 'Đóng trợ lý POS' : 'Mở trợ lý POS'}
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-6 w-6" />}
      </Button>
    </>
  );
}
