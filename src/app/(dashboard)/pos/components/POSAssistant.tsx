'use client';

import { useState } from 'react';
import { Bot, Check, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Product } from '../types/pos';

interface AssistantItem {
  productId: string;
  productName: string;
  quantity: number;
  note?: string;
}

interface POSAssistantProps {
  products: Product[];
  onAddToCart: (productId: string) => void;
}

export function POSAssistant({ products, onAddToCart }: POSAssistantProps) {
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<AssistantItem[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  async function analyzeOrder() {
    if (!message.trim() || loading) return;
    setLoading(true);
    setReply('');
    setItems([]);
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          catalog: products.map((product) => ({
            id: product.IDSP,
            name: product['Tên sản phẩm'],
            price: Number(product['Đơn giá']) || 0,
          })),
        }),
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
    <Card className="m-3 gap-3 border-indigo-200 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
        <Bot className="h-4 w-4" /> Trợ lý POS
      </div>
      <div className="flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') void analyzeOrder(); }}
          placeholder="Ví dụ: 2 trà sữa nướng, 1 hồng trà..."
          disabled={loading}
        />
        <Button onClick={() => void analyzeOrder()} disabled={loading || !message.trim()} size="sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      {reply && <p className="text-sm text-muted-foreground">{reply}</p>}
      {items.length > 0 && (
        <div className="flex items-center justify-between rounded-md bg-indigo-50 p-2 text-sm">
          <span>{items.map((item) => `${item.quantity}x ${item.productName}`).join(', ')}</span>
          <Button onClick={confirmItems} size="sm"><Check className="h-4 w-4" /> Xác nhận</Button>
        </div>
      )}
    </Card>
  );
}
