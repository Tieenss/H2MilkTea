'use client';

import { useState } from 'react';
import { Bot, Check, Loader2, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AssistantItem {
  productId: string;
  productName: string;
  quantity: number;
  note?: string;
}

interface POSAssistantProps {
  onAddToCart: (productId: string) => void;
}

export function POSAssistant({ onAddToCart }: POSAssistantProps) {
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<AssistantItem[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function analyzeOrder() {
    if (!message.trim() || loading) return;
    setLoading(true);
    setReply('');
    setItems([]);
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Không thể xử lý câu lệnh.');
      setItems(result.items || []);
      setReply(result.message || '');
    } catch (error) {
      setReply(error instanceof Error ? error.message : 'Không thể xử lý câu lệnh.');
    } finally {
      setLoading(false);
    }
  }

  function confirmItems() {
    items.forEach((item) => {
      for (let index = 0; index < item.quantity; index += 1) onAddToCart(item.productId);
    });
    setReply('Đã thêm món vào giỏ hàng.');
    setItems([]);
    setMessage('');
  }

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
          <div className="max-h-48 overflow-y-auto text-sm">
            {reply ? <p className="text-muted-foreground">{reply}</p> : <p className="text-muted-foreground">Nhập món cần thêm vào giỏ.</p>}
          </div>
          {items.length > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-md bg-indigo-50 p-2 text-sm">
              <span>{items.map((item) => `${item.quantity}x ${item.productName}`).join(', ')}</span>
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
