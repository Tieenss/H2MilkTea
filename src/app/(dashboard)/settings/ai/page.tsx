'use client';

import { useEffect, useState } from 'react';
import { Bot, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

export default function AISettingsPage() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/ai/settings').then(async (response) => {
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Không tải được cài đặt.');
      setEnabled(result.enabled);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Không tải được cài đặt.'))
      .finally(() => setLoading(false));
  }, []);

  async function updateEnabled(nextEnabled: boolean) {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Không lưu được cài đặt.');
      setEnabled(result.enabled);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không lưu được cài đặt.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Bot className="h-6 w-6 text-indigo-600" /> Cài đặt chatbot POS</h1>
        <p className="text-sm text-muted-foreground">Công tắc này áp dụng cho toàn bộ tài khoản và thiết bị.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Trợ lý POS</CardTitle>
          <CardDescription>Bật để hiển thị popup chatbot trên màn hình POS.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {enabled ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : null}
            {enabled ? 'Đang bật toàn hệ thống' : 'Đang tắt toàn hệ thống'}
          </div>
          {loading || saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Switch checked={enabled} onCheckedChange={updateEnabled} />}
        </CardContent>
      </Card>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Card className="border-red-200">
        <CardHeader><CardTitle className="text-red-600">Chưa phát triển</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm text-red-600">
          <p>• Ra lệnh thanh toán bằng chatbot</p>
          <p>• Đổi bàn bằng chatbot</p>
          <p>• Áp dụng mã giảm giá bằng chatbot</p>
          <p>• Truy vấn tồn kho và doanh thu</p>
        </CardContent>
      </Card>
    </div>
  );
}
