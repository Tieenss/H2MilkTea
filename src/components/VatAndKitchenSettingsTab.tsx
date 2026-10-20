'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Receipt,
  ChefHat,
  Percent,
  Save,
  RotateCcw,
  ExternalLink,
  Volume2,
  CheckCircle2,
  Clock,
  Sparkles,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import {
  VatSettings,
  KitchenSettings,
  getVatSettings,
  saveVatSettings,
  getDefaultVatSettings,
  getKitchenSettings,
  saveKitchenSettings,
  getDefaultKitchenSettings,
} from '@/utils/vatSettings';
import toast from 'react-hot-toast';

export const VatAndKitchenSettingsTab: React.FC = () => {
  const [vatSettings, setVatSettings] = useState<VatSettings>(getDefaultVatSettings());
  const [kitchenSettings, setKitchenSettings] = useState<KitchenSettings>(getDefaultKitchenSettings());
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setVatSettings(getVatSettings());
    setKitchenSettings(getKitchenSettings());
  }, []);

  const handleSaveAll = () => {
    const okVat = saveVatSettings(vatSettings);
    const okKitchen = saveKitchenSettings(kitchenSettings);

    if (okVat && okKitchen) {
      setIsSaved(true);
      toast.success('Đã lưu cấu hình Thuế VAT & Khu Bếp thành công!');
      setTimeout(() => setIsSaved(false), 2500);
    } else {
      toast.error('Lỗi khi lưu cài đặt.');
    }
  };

  const handleResetDefaults = () => {
    const defaultVat = getDefaultVatSettings();
    const defaultKitchen = getDefaultKitchenSettings();
    setVatSettings(defaultVat);
    setKitchenSettings(defaultKitchen);
    saveVatSettings(defaultVat);
    saveKitchenSettings(defaultKitchen);
    toast.success('Đã khôi phục cài đặt mặc định.');
  };

  // Phát âm thanh thử nghiệm cho khu bếp
  const handleTestSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
      toast.success('Đã phát âm thanh thông báo đơn mới!', { icon: '🔔' });
    } catch {
      toast.error('Không thể phát âm thanh.');
    }
  };

  // Tính thử tiền thuế mô phỏng
  const demoSubtotal = 100000;
  const demoVat = vatSettings.enabled ? Math.round(demoSubtotal * (vatSettings.ratePercent / 100)) : 0;
  const demoTotal = demoSubtotal + demoVat;

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Percent className="h-5 w-5 text-orange-600" />
            Cài Đặt Thuế VAT & Quản Lý Khu Bếp (KDS)
          </h2>
          <p className="text-xs text-gray-500">
            Cấu hình tỷ lệ thuế GTGT trên hóa đơn và quy trình điều phối pha chế giữa quầy POS và bếp
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Khôi phục mặc định
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSaveAll}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaved ? 'Đã lưu ✓' : 'Lưu cài đặt'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ============================================================== */}
        {/* PHẦN 1: CẤU HÌNH THUẾ VAT (VALUE-ADDED TAX) */}
        {/* ============================================================== */}
        <Card className="rounded-3xl border-gray-100 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-blue-600" />
                  Cấu hình Thuế VAT (GTGT)
                </CardTitle>
                <CardDescription>
                  Áp dụng thuế trên máy POS, hóa đơn in và đơn hàng đặt qua QR
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="vat-enable-switch" className="text-xs font-semibold">
                  {vatSettings.enabled ? 'Đang bật tính VAT' : 'Tắt VAT (0%)'}
                </Label>
                <Switch
                  id="vat-enable-switch"
                  checked={vatSettings.enabled}
                  onCheckedChange={(checked) => setVatSettings((v) => ({ ...v, enabled: checked }))}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Tùy chọn tỷ lệ thuế VAT */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Tỷ lệ thuế VAT (%):</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { rate: 0, label: '0% (Miễn)' },
                  { rate: 5, label: '5%' },
                  { rate: 8, label: '8% (Ưu đãi)' },
                  { rate: 10, label: '10% (Chuẩn)' },
                ].map((item) => (
                  <button
                    key={item.rate}
                    type="button"
                    disabled={!vatSettings.enabled}
                    onClick={() => setVatSettings((v) => ({ ...v, ratePercent: item.rate }))}
                    className={`rounded-xl border p-2.5 text-center text-xs font-bold transition-all ${
                      vatSettings.ratePercent === item.rate && vatSettings.enabled
                        ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    } ${!vatSettings.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mã số thuế quán */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="vat-number" className="text-xs font-semibold">Mã số thuế quán (MST):</Label>
                <Input
                  id="vat-number"
                  value={vatSettings.vatNumber || ''}
                  onChange={(e) => setVatSettings((v) => ({ ...v, vatNumber: e.target.value }))}
                  placeholder="0312345678"
                  className="rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vat-note" className="text-xs font-semibold">Ghi chú chân hóa đơn:</Label>
                <Input
                  id="vat-note"
                  value={vatSettings.note || ''}
                  onChange={(e) => setVatSettings((v) => ({ ...v, note: e.target.value }))}
                  placeholder="Áp dụng VAT theo NĐ hiện hành"
                  className="rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Bảng mô phỏng tính VAT */}
            <div className="rounded-2xl bg-blue-50/60 border border-blue-100 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold text-blue-900">
                <span>Ví dụ mô phỏng đơn hàng:</span>
                <Badge variant="outline" className="border-blue-300 text-blue-700 bg-white">
                  Thuế suất: {vatSettings.enabled ? `${vatSettings.ratePercent}%` : 'Tắt'}
                </Badge>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính tiền hàng:</span>
                <span className="font-medium">{demoSubtotal.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tiền thuế VAT ({vatSettings.enabled ? `${vatSettings.ratePercent}%` : '0%'}):</span>
                <span className="font-semibold text-blue-700">+{demoVat.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="border-t border-blue-200/60 pt-2 flex justify-between font-bold text-gray-900 text-sm">
                <span>Tổng khách trả:</span>
                <span className="text-orange-600 font-black">{demoTotal.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            {/* Hướng dẫn VAT */}
            <div className="rounded-2xl bg-amber-50/60 border border-amber-200 p-3.5 text-[11px] text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <HelpCircle className="h-4 w-4 text-amber-600" />
                <span>Quy định xuất hóa đơn VAT theo F&B:</span>
              </div>
              <p className="leading-relaxed">
                Khi kích hoạt VAT, hệ thống tự động cộng tỷ lệ thuế vào tổng tiền hóa đơn bán hàng và chia tách rõ ràng dòng VAT trên bill in nhiệt lẫn hóa đơn điện tử cho khách hàng.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ============================================================== */}
        {/* PHẦN 2: CẤU HÌNH & HƯỚNG DẪN QUẢN LÝ KHU BẾP (KDS) */}
        {/* ============================================================== */}
        <Card className="rounded-3xl border-gray-100 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ChefHat className="h-5 w-5 text-orange-600" />
                  Quản Lý Khu Bếp Pha Chế (KDS)
                </CardTitle>
                <CardDescription>
                  Điều phối đơn hàng Realtime giữa máy POS và màn hình khu Bếp
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="kds-enable-switch" className="text-xs font-semibold">
                  {kitchenSettings.kdsEnabled ? 'Đang bật KDS' : 'Tắt'}
                </Label>
                <Switch
                  id="kds-enable-switch"
                  checked={kitchenSettings.kdsEnabled}
                  onCheckedChange={(checked) => setKitchenSettings((k) => ({ ...k, kdsEnabled: checked }))}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Quick Link to Kitchen Page */}
            <div className="flex items-center justify-between rounded-2xl bg-orange-50 border border-orange-200 p-4">
              <div>
                <h4 className="font-bold text-sm text-orange-950">Màn hình Bếp KDS Realtime</h4>
                <p className="text-xs text-orange-800">Mở màn hình chuyên dụng cho nhân viên pha chế tại quầy Bar</p>
              </div>
              <Button
                type="button"
                onClick={() => window.open('/kitchen', '_blank')}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <span>Mở /kitchen</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Tùy chọn chuông báo và tự động in */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 bg-gray-50/50">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Volume2 className="h-4 w-4 text-orange-600" />
                    Âm thanh chuông báo đơn mới
                  </span>
                  <p className="text-[11px] text-gray-500">Phát âm báo reo khi quầy POS hoặc khách QR gửi món vào bếp</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleTestSound}
                    className="h-7 text-[11px] text-orange-700 hover:bg-orange-100"
                  >
                    Thử chuông
                  </Button>
                  <Switch
                    checked={kitchenSettings.alertSoundEnabled}
                    onCheckedChange={(c) => setKitchenSettings((k) => ({ ...k, alertSoundEnabled: c }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 bg-gray-50/50">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-gray-800">Tự động in phiếu bếp khi gửi</span>
                  <p className="text-[11px] text-gray-500">Tự động in phiếu order bếp cho từng bàn ngay khi bấm Gửi bếp</p>
                </div>
                <Switch
                  checked={kitchenSettings.autoPrintKitchenTicket}
                  onCheckedChange={(c) => setKitchenSettings((k) => ({ ...k, autoPrintKitchenTicket: c }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 bg-gray-50/50">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-gray-800">Thời gian pha chế tiêu chuẩn:</span>
                  <p className="text-[11px] text-gray-500">Đơn quá thời gian này sẽ đổi màu cảnh báo đỏ trên KDS</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min="5"
                    max="60"
                    value={kitchenSettings.maxPreparationMinutes}
                    onChange={(e) => setKitchenSettings((k) => ({ ...k, maxPreparationMinutes: parseInt(e.target.value) || 15 }))}
                    className="w-16 h-8 text-center text-xs font-bold rounded-lg"
                  />
                  <span className="text-xs text-gray-500">phút</span>
                </div>
              </div>
            </div>

            {/* Quy trình phối hợp 3 bước Bếp - Thu ngân (Mục #1) */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-2">
              <h4 className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Quy trình sử dụng tính năng "Gửi đến bếp":
              </h4>
              <div className="space-y-1.5 text-[11px] text-emerald-900">
                <div className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">1</span>
                  <span><strong>Thu ngân chọn bàn & món:</strong> Thêm món đồ uống vào giỏ hàng bàn rồi bấm nút cam <em>"Gửi đến bếp pha chế"</em>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">2</span>
                  <span><strong>Khu bếp nhận order Realtime:</strong> Màn hình Bếp KDS phát chuông reo, hiển thị bàn, size, đường, đá, topping và nhả tem dán ly.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">3</span>
                  <span><strong>Hoàn thành ra món:</strong> Khi pha xong, bếp bấm <em>"Sẵn sàng"</em> → Quầy POS và điện thoại khách quét QR sẽ cập nhật ngay lập tức!</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
