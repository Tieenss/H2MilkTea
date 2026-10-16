'use client';

import { useEffect, useState } from 'react';
import { Bot, CheckCircle2, Clock, Loader2, Mic, ShieldAlert, Sparkles, Volume2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import authUtils from '@/utils/authUtils';

interface AISettingsConfig {
  enabled: boolean;
  autoSubmitVoice: boolean;
  voiceSilenceTimeoutMs: number;
  maxItemQuantity: number;
}

export default function AISettingsPage() {
  const [settings, setSettings] = useState<AISettingsConfig>({
    enabled: true,
    autoSubmitVoice: true,
    voiceSilenceTimeoutMs: 1500,
    maxItemQuantity: 10,
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const localUser = authUtils.getUserData();
      if (localUser) {
        const localRole = localUser['Phân quyền'] || '';
        const isLocalAdmin = localRole === 'Admin' || localUser.username?.toLowerCase() === 'admin';
        setIsAdmin(isLocalAdmin);
      }
    } catch {
      // Bỏ qua lỗi đọc localStorage nếu có
    }

    fetch('/api/ai/settings')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Không tải được cài đặt.');
        if (typeof result.isAdmin === 'boolean') setIsAdmin(result.isAdmin);
        if (result.settings) setSettings(result.settings);
        else if (typeof result.enabled === 'boolean') setSettings((prev) => ({ ...prev, enabled: result.enabled }));
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Không tải được cài đặt.'))
      .finally(() => setLoading(false));
  }, []);

  async function saveSettings(nextSettings: AISettingsConfig) {
    setSaving(true);
    setError('');
    setSavedSuccess(false);
    try {
      const response = await fetch('/api/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextSettings),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Không lưu được cài đặt.');
      if (typeof result.isAdmin === 'boolean') setIsAdmin(result.isAdmin);
      setSettings(result.settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không lưu được cài đặt.');
    } finally {
      setSaving(false);
    }
  }

  function handleToggleEnabled(enabled: boolean) {
    const updated = { ...settings, enabled };
    setSettings(updated);
    saveSettings(updated);
  }

  function handleToggleAutoSubmit(autoSubmitVoice: boolean) {
    const updated = { ...settings, autoSubmitVoice };
    setSettings(updated);
  }

  function handleChangeSilenceTimeout(value: string) {
    const updated = { ...settings, voiceSilenceTimeoutMs: Number(value) };
    setSettings(updated);
  }

  function handleChangeMaxQuantity(value: string) {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0) {
      const updated = { ...settings, maxItemQuantity: num };
      setSettings(updated);
    }
  }

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bot className="h-7 w-7 text-indigo-600" /> Trung tâm Cài đặt Trợ lý AI POS
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý tính năng, giọng nói, giới hạn an toàn và khả năng nghiệp vụ của Chatbot.
          </p>
        </div>
        {savedSuccess && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 py-1.5 px-3 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-600" /> Đã lưu cài đặt thành công
          </Badge>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}

      {!isAdmin && !loading && (
        <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-sm border border-amber-200 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
          <span>Tài khoản hiện tại có quyền <strong>Nhân viên</strong> (chỉ xem). Để thay đổi cài đặt Chatbot, vui lòng đăng nhập tài khoản <strong>Admin</strong>.</span>
        </div>
      )}

      {/* 1. Công tắc chính */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Trạng thái hoạt động toàn hệ thống</CardTitle>
              <CardDescription>Bật/tắt popup Trợ lý AI trên toàn bộ màn hình POS.</CardDescription>
            </div>
            {loading || saving ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Switch checked={settings.enabled} onCheckedChange={handleToggleEnabled} disabled={!isAdmin} />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${settings.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
            {settings.enabled ? 'Trợ lý AI đang hoạt động bình thường' : 'Trợ lý AI đang tắt toàn bộ'}
          </div>
        </CardContent>
      </Card>

      {/* 2. Cài đặt Giọng nói & Nhận diện */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mic className="h-5 w-5 text-indigo-600" /> Tương tác Giọng nói & Dứt câu
          </CardTitle>
          <CardDescription>Tùy chỉnh hành vi thu âm và tự động gửi lệnh khi nói xong.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="font-medium text-sm">Tự động gửi sau khi dứt câu (Auto-submit on silence)</p>
              <p className="text-xs text-muted-foreground">Không cần bấm nút gửi; AI sẽ tự động phân tích ngay khi bạn dừng nói.</p>
            </div>
            <Switch
              checked={settings.autoSubmitVoice}
              onCheckedChange={handleToggleAutoSubmit}
              disabled={!isAdmin || !settings.enabled}
            />
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="font-medium text-sm flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" /> Thời gian chờ dứt câu
              </p>
              <p className="text-xs text-muted-foreground">Độ trễ tính từ lúc ngưng nói đến khi AI bắt đầu xử lý.</p>
            </div>
            <div className="w-48">
              <Select
                value={String(settings.voiceSilenceTimeoutMs)}
                onValueChange={handleChangeSilenceTimeout}
                disabled={!isAdmin || !settings.enabled || !settings.autoSubmitVoice}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn thời gian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1000">1.0 giây (Siêu nhanh)</SelectItem>
                  <SelectItem value="1500">1.5 giây (Tiêu chuẩn)</SelectItem>
                  <SelectItem value="2000">2.0 giây (Thư thả)</SelectItem>
                  <SelectItem value="2500">2.5 giây</SelectItem>
                  <SelectItem value="3000">3.0 giây (Chậm rãi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Giới hạn an toàn (Safety Limits) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldAlert className="h-5 w-5 text-amber-600" /> Giới hạn an toàn gọi món
          </CardTitle>
          <CardDescription>Ngăn ngừa việc gọi nhầm số lượng quá lớn bằng giọng nói hoặc phím tắt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-sm">Số lượng món tối đa cho mỗi lệnh</p>
              <p className="text-xs text-muted-foreground">Nếu khách gọi vượt quá số ly này, AI sẽ yêu cầu quản lý xác nhận riêng.</p>
            </div>
            <div className="w-28">
              <Input
                type="number"
                min="1"
                max="50"
                value={settings.maxItemQuantity}
                onChange={(e) => handleChangeMaxQuantity(e.target.value)}
                disabled={!isAdmin || !settings.enabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nút lưu cài đặt */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveSettings(settings)}
          disabled={!isAdmin || loading || saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Lưu cài đặt
        </Button>
      </div>

      {/* 4. Khả năng hiện có & Lộ trình */}
      <div className="grid md:grid-cols-2 gap-6 pt-4">
        <Card className="border-indigo-100 bg-indigo-50/40">
          <CardHeader>
            <CardTitle className="text-indigo-900 text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" /> Khả năng đã kích hoạt (P0)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-indigo-950">
            <p>✓ <strong>Gọi món tiếng Việt</strong>: Hiểu viết tắt (ts, dcs, bx...), gõ không dấu, chuẩn hóa theo menu.</p>
            <p>✓ <strong>Tự động nhận diện bàn</strong>: Lệnh "bàn 3", "b3", "mang về" tự động mở đúng bàn trên POS.</p>
            <p>✓ <strong>Hỏi đáp nghiệp vụ</strong>: Hướng dẫn sử dụng POS, phím tắt F1-F5, kết nối máy in nhiệt K80/K57.</p>
            <p>✓ <strong>Phân quyền Context-aware</strong>: Tự động từ chối nếu tài khoản không đủ quyền quản trị.</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-800 text-base">Kế hoạch mở rộng sắp tới (P1 & P2)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>• <strong>FAQ tùy biến</strong>: Áp dụng cho cả POS và khách quét mã QR bàn.</p>
            <p>• <strong>Sổ tay công thức & Ghi chú</strong>: Ghi chú công thức cho AI đọc trả lời dị ứng/thành phần.</p>
            <p>• <strong>Tùy chọn chi tiết</strong>: Size M/L, % đường, % đá, topping.</p>
            <p>• <strong>AI Audit Log</strong>: Nhật ký theo dõi hiệu quả và độ chuẩn xác của câu lệnh.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
