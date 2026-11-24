'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Printer,
  RefreshCw,
  Save,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Play,
  Terminal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  DirectPrintMode,
  LocalPrintDeviceConfig,
  WindowsPrinterInfo,
  dispatchDirectOrRemotePrint,
  getPrintDeviceConfig,
  isLikelyMobileOrTablet,
  probeLocalPrintBridge,
  savePrintDeviceConfig,
  syncPrintConfigFromCloud,
} from '@/utils/printBridgeClient';

export function PrintBridgeSettingsCard() {
  const [config, setConfig] = useState<LocalPrintDeviceConfig>(() => getPrintDeviceConfig());
  const [bridgeOnline, setBridgeOnline] = useState<boolean>(false);
  const [printers, setPrinters] = useState<WindowsPrinterInfo[]>([]);
  const [scanning, setScanning] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [testingType, setTestingType] = useState<'receipt' | 'label' | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);

  const scanBridge = useCallback(async (bridgeUrl?: string, silent = false) => {
    setScanning(true);
    try {
      const targetUrl = bridgeUrl || config.bridgeUrl || 'http://127.0.0.1:18181';
      const result = await probeLocalPrintBridge(targetUrl);
      setBridgeOnline(result.online);
      setPrinters(result.printers);
      if (!silent) {
        if (result.online) {
          toast.success(`Đã kết nối Trạm In Windows (${result.printers.length} máy in).`);
        } else {
          toast.error('Không tìm thấy Trạm In trên máy này (127.0.0.1:18181).');
        }
      }
    } finally {
      setScanning(false);
    }
  }, [config.bridgeUrl]);

  useEffect(() => {
    setIsMobileDevice(isLikelyMobileOrTablet());
    let active = true;
    (async () => {
      const synced = await syncPrintConfigFromCloud();
      if (!active) return;
      setConfig(synced);
      if (!isLikelyMobileOrTablet()) {
        await scanBridge(synced.bridgeUrl, true);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveAndSync = async () => {
    setSaving(true);
    try {
      savePrintDeviceConfig(config);
      const res = await fetch('/api/print/dispatch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bridgeUrl: config.bridgeUrl,
          receiptPrinterName: config.receiptPrinterName,
          labelPrinterName: config.labelPrinterName,
          autoFallbackToBrowser: config.autoFallbackToBrowser,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        toast.success('Đã lưu cấu hình máy in và đồng bộ lên Cloud cho các thiết bị khác!');
      } else {
        toast.success('Đã lưu cấu hình máy in trên thiết bị này (Cloud sync chưa khả dụng).');
      }
    } catch {
      toast.success('Đã lưu cấu hình máy in trên thiết bị này.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrint = async (jobType: 'receipt' | 'label') => {
    setTestingType(jobType);
    try {
      savePrintDeviceConfig(config);
      const isLabel = jobType === 'label';
      const sampleHtml = isLabel
        ? `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{size:50mm 30mm;margin:0}body{margin:0;padding:4px;font-family:sans-serif;font-size:11px}</style></head><body><div style="font-weight:bold">H2 MilkTea - IN THỬ TEM</div><div>Trà Sữa Trân Châu (L)</div><div>50% Đường • 50% Đá</div><div style="font-size:9px;margin-top:2px">Bàn Test • In trực tiếp OK</div></body></html>`
        : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{size:80mm auto;margin:0}body{margin:0;padding:8px;font-family:monospace;font-size:12px;width:72mm}</style></head><body><div style="text-align:center;font-weight:bold;font-size:14px">H2 MILKTEA</div><div style="text-align:center">PHIẾU IN THỬ TRẠM IN</div><hr/><div>Chế độ: ${config.mode}</div><div>Máy in: ${config.receiptPrinterName || 'Mặc định Windows'}</div><hr/><div style="text-align:center">Kết nối thành công!</div></body></html>`;

      const res = await dispatchDirectOrRemotePrint({
        jobType,
        htmlList: [sampleHtml],
        tableName: 'Bàn Test Cấu Hình',
        widthMm: isLabel ? 50 : 80,
        heightMm: isLabel ? 30 : 0,
        requestedBy: 'Cài đặt máy in',
      });

      if (!res.handled) {
        toast('Đang ở chế độ Trình duyệt (Ctrl+P). Hãy chọn "In trực tiếp" hoặc "In từ xa" để bỏ qua hộp thoại.');
      } else if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } finally {
      setTestingType(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                Trạm In Trực Tiếp & In Từ Xa (Không qua Ctrl+P)
              </CardTitle>
              <CardDescription>
                Chọn máy in USB mặc định trên Windows để in ngay lập tức khi bấm nút, hoặc gửi lệnh in từ Điện thoại về máy tính quầy.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {bridgeOnline ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Trạm In Windows: Đang chạy
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {isMobileDevice ? 'Thiết bị di động (Dùng chế độ In từ xa)' : 'Trạm In Windows: Chưa kết nối'}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Chế độ in của thiết bị hiện tại */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Chế độ in cho thiết bị này</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, mode: 'local_bridge' as DirectPrintMode }))}
                className={`p-3.5 rounded-lg border text-left transition-all ${
                  config.mode === 'local_bridge'
                    ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm text-gray-900">
                  <Monitor className="w-4 h-4 text-emerald-600" />
                  In trực tiếp máy tính (USB)
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Bấm in là ra giấy ngay lập tức, bỏ qua hoàn toàn hộp thoại Ctrl+P của trình duyệt.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, mode: 'remote_relay' as DirectPrintMode }))}
                className={`p-3.5 rounded-lg border text-left transition-all ${
                  config.mode === 'remote_relay'
                    ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm text-gray-900">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  In từ xa (Điện thoại → PC)
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Bấm in bàn nào trên điện thoại, máy tính quầy tự nhận tín hiệu và in đúng bàn đó qua USB.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, mode: 'browser' as DirectPrintMode }))}
                className={`p-3.5 rounded-lg border text-left transition-all ${
                  config.mode === 'browser'
                    ? 'border-gray-700 bg-gray-100 ring-1 ring-gray-700'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm text-gray-900">
                  <Wifi className="w-4 h-4 text-gray-600" />
                  Trình duyệt (Ctrl+P)
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Mở cửa sổ xem trước & chọn máy in mặc định của trình duyệt như trước đây.
                </p>
              </button>
            </div>
          </div>

          {/* Quét và chọn máy in Windows */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-2">
              <Label htmlFor="receipt-printer">Máy in Hóa đơn (K80 / K58)</Label>
              {printers.length > 0 && (
                <Select
                  value={config.receiptPrinterName || '__custom__'}
                  onValueChange={(val) => {
                    if (val !== '__custom__') {
                      setConfig((prev) => ({ ...prev, receiptPrinterName: val }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn máy in hóa đơn Windows..." />
                  </SelectTrigger>
                  <SelectContent>
                    {printers.map((p) => (
                      <SelectItem key={`rec-${p.name}`} value={p.name}>
                        {p.name} {p.isDefault ? '(Mặc định)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Input
                id="receipt-printer"
                value={config.receiptPrinterName}
                onChange={(e) => setConfig((prev) => ({ ...prev, receiptPrinterName: e.target.value }))}
                placeholder="VD: XP-80C (hoặc tên máy in trong Windows)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="label-printer">Máy in Tem Nhãn Dán Ly (50x30 / 40x30)</Label>
              {printers.length > 0 && (
                <Select
                  value={config.labelPrinterName || '__custom__'}
                  onValueChange={(val) => {
                    if (val !== '__custom__') {
                      setConfig((prev) => ({ ...prev, labelPrinterName: val }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn máy in tem Windows..." />
                  </SelectTrigger>
                  <SelectContent>
                    {printers.map((p) => (
                      <SelectItem key={`lbl-${p.name}`} value={p.name}>
                        {p.name} {p.isDefault ? '(Mặc định)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Input
                id="label-printer"
                value={config.labelPrinterName}
                onChange={(e) => setConfig((prev) => ({ ...prev, labelPrinterName: e.target.value }))}
                placeholder="VD: Xprinter XP-350B (hoặc tên máy in tem)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="space-y-1.5">
              <Label htmlFor="bridge-url">Địa chỉ Trạm In Cục Bộ (trên PC quầy)</Label>
              <Input
                id="bridge-url"
                value={config.bridgeUrl}
                onChange={(e) => setConfig((prev) => ({ ...prev, bridgeUrl: e.target.value }))}
                placeholder="http://127.0.0.1:18181"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
              <div>
                <div className="text-sm font-medium">Tự mở Ctrl+P nếu mất kết nối Trạm In</div>
                <div className="text-xs text-gray-500">Đảm bảo không bị gián đoạn bán hàng khi chưa bật phần mềm cầu nối.</div>
              </div>
              <Switch
                checked={config.autoFallbackToBrowser}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, autoFallbackToBrowser: checked }))
                }
              />
            </div>
          </div>

          {/* Nút thao tác */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => scanBridge(config.bridgeUrl, false)}
              disabled={scanning}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
              Quét máy in Windows
            </Button>

            <Button
              type="button"
              onClick={handleSaveAndSync}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Đang lưu...' : 'Lưu & Đồng bộ Cloud'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => handleTestPrint('receipt')}
              disabled={testingType !== null}
            >
              <Play className="w-4 h-4 mr-2" />
              {testingType === 'receipt' ? 'Đang gửi...' : 'In thử Hóa đơn'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => handleTestPrint('label')}
              disabled={testingType !== null}
            >
              <Play className="w-4 h-4 mr-2" />
              {testingType === 'label' ? 'Đang gửi...' : 'In thử Tem ly'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hướng dẫn cài đặt 1 chạm trên Windows */}
      <Card className="border-blue-200 bg-blue-50/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-blue-900">
            <Terminal className="w-4 h-4" />
            Hướng dẫn bật Trạm In USB trên máy tính quầy Windows
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 space-y-2">
          <p>
            1. Trên máy tính quầy có cắm máy in USB (hóa đơn / tem ly), mở thư mục dự án và nháy đúp file{' '}
            <code className="px-1.5 py-0.5 rounded bg-blue-100 font-mono text-xs">
              scripts\print-bridge\H2-Print-Bridge.bat
            </code>{' '}
            (hoặc chạy <code className="px-1.5 py-0.5 rounded bg-blue-100 font-mono text-xs">node scripts/print-bridge/h2-print-bridge.mjs</code>).
          </p>
          <p>
            2. Bấm <strong>Quét máy in Windows</strong> ở trên, chọn đúng tên máy in Hóa đơn và máy in Tem ly, chọn chế độ{' '}
            <strong>In trực tiếp máy tính (USB)</strong> rồi bấm <strong>Lưu &amp; Đồng bộ Cloud</strong>.
          </p>
          <p>
            3. Trên điện thoại/tablet: vào đúng trang này, hệ thống sẽ tự tải tên máy in từ Cloud về. Chọn chế độ{' '}
            <strong>In từ xa (Điện thoại → PC)</strong> rồi bấm <strong>Lưu</strong>. Từ lúc này, bấm in bàn nào trên điện thoại thì máy tính quầy sẽ in đúng bàn đó!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
