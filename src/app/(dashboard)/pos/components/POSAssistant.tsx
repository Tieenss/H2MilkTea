'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Check, Loader2, Mic, Send, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Table } from '../types/pos';

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultList {
  [index: number]: {
    [index: number]: SpeechRecognitionResultItem;
    isFinal?: boolean;
  };
  length: number;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  onstart: () => void;
  onend: () => void;
  onerror: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  start: () => void;
  stop: () => void;
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
  selectedTableId?: string | null;
  tables?: Table[];
  onSelectTable?: (tableId: string) => void;
}

export function POSAssistant({
  onAddToCart,
  onAdjustQuantity,
  cart,
  selectedTableName,
  selectedTableId,
  tables = [],
  onSelectTable,
}: POSAssistantProps) {
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<AssistantItem[]>([]);
  const [targetTable, setTargetTable] = useState<{ id: string; name: string } | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<'add' | 'remove' | 'select_table' | 'qa' | 'none'>('none');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [recording, setRecording] = useState(false);
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);

  // Settings
  const [autoSubmitVoice, setAutoSubmitVoice] = useState(true);
  const [voiceSilenceTimeoutMs, setVoiceSilenceTimeoutMs] = useState(1500);

  const storageKey = `h2-pos-ai-chat:${selectedTableName}`;
  const loadedStorageKeyRef = useRef<string | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch('/api/ai/settings')
      .then(async (response) => {
        const result = await response.json();
        if (response.ok && result.success) {
          if (result.settings) {
            setEnabled(result.settings.enabled);
            setAutoSubmitVoice(result.settings.autoSubmitVoice ?? true);
            setVoiceSilenceTimeoutMs(result.settings.voiceSilenceTimeoutMs ?? 1500);
          } else if (typeof result.enabled === 'boolean') {
            setEnabled(result.enabled);
          }
        }
      })
      .catch((error) => console.error('Không thể tải cài đặt chatbot:', error));
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

  async function analyzeOrder(overrideMessage?: string) {
    const rawMsg = overrideMessage !== undefined ? overrideMessage : message;
    const userMessage = rawMsg.trim();
    if (!userMessage || loading) return;

    setLoading(true);
    setReply('');
    setItems([]);
    setTargetTable(null);
    setMessages((current) => [...current, { role: 'user', content: userMessage }]);
    if (overrideMessage === undefined) setMessage('');

    if (/^(xin chào(\s+(bạn|bot|em|shop|ad))?|chào(\s+(bạn|bot|em|shop|ad|buổi sáng|buổi trưa|buổi chiều|buổi tối))?|hello(\s+(bạn|bot))?|hi(\s+(bạn|bot))?|alo(\s+(bạn|bot))?|hey)[!. ]*$/i.test(userMessage)) {
      const greeting = 'Xin chào! Tôi có thể giúp thêm/bớt món, chuyển bàn hoặc hướng dẫn sử dụng phần mềm.';
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
      setTargetTable(result.targetTable || null);
      setReply(result.message || '');
      setAction(result.action || 'none');
      setCurrentLogId(result.logId || null);
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
    // Ghi nhận xác nhận kiểm toán audit log
    if (currentLogId) {
      void fetch('/api/ai/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId: currentLogId, status: 'confirmed' }),
      }).catch(() => {});
      setCurrentLogId(null);
    }

    // 1. Nếu có bàn mục tiêu và khác bàn đang mở, tự động chuyển bàn
    if (targetTable && onSelectTable && targetTable.id !== selectedTableId) {
      onSelectTable(targetTable.id);
    }

    // 2. Nếu chỉ là lệnh chuyển bàn
    if (action === 'select_table') {
      const msg = `Đã chuyển sang ${targetTable?.name || 'bàn mới'}.`;
      setReply(msg);
      setMessages((current) => [...current, { role: 'assistant', content: msg }]);
      setTargetTable(null);
      setAction('none');
      return;
    }

    // 3. Áp dụng thêm/bớt món
    items.forEach((item) => {
      if (action === 'remove') onAdjustQuantity(item.productId, -item.quantity);
      else if (action === 'add') {
        for (let index = 0; index < item.quantity; index += 1) onAddToCart(item.productId);
      }
    });

    const actionText = action === 'remove' ? 'Đã bớt món khỏi giỏ' : 'Đã thêm món vào giỏ';
    const tableText = targetTable ? ` của ${targetTable.name}` : '';
    const finishMsg = `${actionText}${tableText}.`;

    setReply(finishMsg);
    setMessages((current) => [...current, { role: 'assistant', content: finishMsg }]);
    setItems([]);
    setTargetTable(null);
    setMessage('');
    setAction('none');
  }

  function rejectItems() {
    if (currentLogId) {
      void fetch('/api/ai/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId: currentLogId, status: 'rejected' }),
      }).catch(() => {});
      setCurrentLogId(null);
    }

    setItems([]);
    setTargetTable(null);
    setAction('none');
    const cancelMsg = 'Đã hủy thao tác.';
    setReply(cancelMsg);
    setMessages((current) => [...current, { role: 'assistant', content: cancelMsg }]);
  }

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setReply('Trình duyệt này chưa hỗ trợ nhập giọng nói.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = true;

    recognition.onstart = () => {
      setRecording(true);
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognition.onerror = () => {
      setRecording(false);
      setReply('Không nhận diện được giọng nói. Vui lòng thử lại.');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      for (let i = 0; i < event.results.length; i += 1) {
        finalTranscript += event.results[i][0].transcript;
      }

      setMessage(finalTranscript);

      // Nếu bật Auto-submit, tự động gửi sau khi dứt câu
      if (autoSubmitVoice && finalTranscript.trim()) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          try {
            recognition.stop();
          } catch {
            // bỏ qua nếu đã stop
          }
          setRecording(false);
          void analyzeOrder(finalTranscript);
        }, voiceSilenceTimeoutMs);
      }
    };

    recognition.start();
  }

  if (!enabled) return null;

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-[430px] flex-col gap-3 rounded-xl border border-indigo-200 bg-white p-4 shadow-2xl">
          <div className="flex items-center justify-between text-sm font-semibold text-indigo-700">
            <span className="flex items-center gap-2">
              <Bot className="h-4 w-4" /> Trợ lý POS H2 MilkTea
            </span>
            <Button onClick={() => setOpen(false)} variant="ghost" size="icon" aria-label="Đóng trợ lý POS" className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-2 rounded text-xs text-slate-600">
            💡 Gợi ý: &quot;3 trà sữa nướng vào bàn 3&quot;, &quot;chuyển sang bàn 2&quot;, &quot;hướng dẫn thêm món mới&quot;
          </div>

          <div className="max-h-56 min-h-[140px] space-y-2.5 overflow-y-auto text-sm pr-1">
            {messages.map((chatMessage, index) => (
              <div
                key={`${chatMessage.role}-${index}`}
                className={chatMessage.role === 'user' ? 'text-right' : 'text-left'}
              >
                <div
                  className={`inline-block rounded-lg px-3 py-2 text-xs leading-relaxed max-w-[88%] whitespace-pre-line ${
                    chatMessage.role === 'user'
                      ? 'bg-indigo-600 text-white text-left'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <span className="font-semibold block mb-0.5 opacity-80">
                    {chatMessage.role === 'user' ? 'Bạn' : 'Trợ lý AI'}
                  </span>
                  {chatMessage.content}
                </div>
              </div>
            ))}
            {!messages.length && (
              <div className="text-center py-6 text-muted-foreground text-xs">
                Sẵn sàng nhận lệnh gọi món, đổi bàn hoặc hướng dẫn nghiệp vụ.
              </div>
            )}
          </div>

          {/* Thanh Preview Xác nhận */}
          {((items.length > 0) || (action === 'select_table' && targetTable)) && (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-indigo-50 border border-indigo-100 p-2.5 text-xs text-indigo-950">
              <div className="flex-1 min-w-0 pr-1">
                {targetTable && (
                  <Badge variant="secondary" className="bg-indigo-200 text-indigo-900 text-[10px] mr-1.5 font-bold">
                    {targetTable.name}
                  </Badge>
                )}
                <span>
                  {action === 'select_table'
                    ? `Mở / Chuyển sang ${targetTable?.name}?`
                    : `${action === 'remove' ? 'Bớt ' : 'Thêm '}${items.map((item) => `${item.quantity}x ${item.productName}`).join(', ')}`}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  onClick={rejectItems}
                  size="sm"
                  variant="outline"
                  className="text-gray-600 hover:text-red-600 hover:bg-red-50 text-xs h-8 px-2"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Hủy
                </Button>
                <Button
                  onClick={confirmItems}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-2.5"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {action === 'select_table' ? 'Mở bàn' : 'Xác nhận'}
                </Button>
              </div>
            </div>
          )}

          {/* Ô nhập lệnh & giọng nói */}
          <div className="flex gap-1.5 items-center">
            <input
              autoFocus
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void analyzeOrder();
              }}
              placeholder={recording ? 'Đang lắng nghe bạn nói...' : 'Ví dụ: 3 trà sữa nướng vào bàn 3...'}
              disabled={loading}
            />
            <Button
              onClick={() => void analyzeOrder()}
              disabled={loading || !message.trim()}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-2.5"
              aria-label="Gửi yêu cầu"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
            <Button
              onClick={startVoiceInput}
              disabled={loading || recording}
              size="sm"
              variant={recording ? 'destructive' : 'outline'}
              className="h-8 px-2.5"
              aria-label="Nhập bằng giọng nói"
            >
              <Mic className={`h-4 w-4 ${recording ? 'animate-pulse text-white' : 'text-slate-600'}`} />
            </Button>
          </div>
        </div>
      )}

      {/* Nút FAB mở popup */}
      <Button
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full bg-indigo-600 p-0 text-white shadow-xl hover:bg-indigo-700 hover:scale-105 transition-transform"
        aria-label={open ? 'Đóng trợ lý POS' : 'Mở trợ lý POS'}
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-7 w-7" />}
      </Button>
    </>
  );
}
