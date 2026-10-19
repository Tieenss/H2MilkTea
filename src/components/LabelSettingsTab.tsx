'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Printer, Save, RotateCcw, Tag, CheckSquare, Square } from 'lucide-react';
import { LabelSettings, LabelPaperSize, LabelBarcodeType, LabelFontSize } from '@/types/labelSettings';
import { getLabelSettings, saveLabelSettings, getDefaultLabelSettings, LABEL_PAPER_SIZES } from '@/utils/labelSettings';
import { LabelPreview } from './LabelPreview';
import toast from 'react-hot-toast';

const AVAILABLE_CATEGORIES = [
  'Trà sữa',
  'Cà phê',
  'Trà trái cây',
  'Đá xay',
  'Sinh tố',
  'Macchiato',
  'Latte',
  'Sữa chua',
  'Nước ép',
  'Bánh ngọt',
  'Ăn vặt',
];

export const LabelSettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<LabelSettings>(getDefaultLabelSettings());
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setSettings(getLabelSettings());
  }, []);

  const handleSave = () => {
    const ok = saveLabelSettings(settings);
    if (ok) {
      setIsSaved(true);
      toast.success('Đã lưu cấu hình máy in tem nhãn dán ly thành công!');
      setTimeout(() => setIsSaved(false), 2000);
    } else {
      toast.error('Lỗi khi lưu cấu hình.');
    }
  };

  const handleReset = () => {
    const defaults = getDefaultLabelSettings();
    setSettings(defaults);
    saveLabelSettings(defaults);
    toast.success('Đã khôi phục cài đặt tem dán mặc định.');
  };

  const toggleCategory = (cat: string) => {
    setSettings((prev) => {
      const exists = prev.applicableCategories.includes(cat);
      const nextCategories = exists
        ? prev.applicableCategories.filter((c) => c !== cat)
        : [...prev.applicableCategories, cat];
      return { ...prev, applicableCategories: nextCategories };
    });
  };

  const selectAllCategories = () => {
    setSettings((prev) => ({ ...prev, applicableCategories: [...AVAILABLE_CATEGORIES] }));
  };

  const clearAllCategories = () => {
    setSettings((prev) => ({ ...prev, applicableCategories: [] }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* CỘT TRÁI: FORM CÀI ĐẶT (7 CỘT) */}
      <div className="lg:col-span-7 space-y-6">
        {/* CARD 1: KẾT NỐI & KHỔ TEM */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Printer className="w-4 h-4 text-purple-600" />
                  Cấu hình Máy in tem & Khổ giấy
                </CardTitle>
                <CardDescription>
                  Chọn phương thức kết nối máy in nhiệt và kích thước cuộn tem
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="enable-label-switch" className="text-sm font-medium">
                  {settings.enabled ? 'Đang bật' : 'Đang tắt'}
                </Label>
                <Switch
                  id="enable-label-switch"
                  checked={settings.enabled}
                  onCheckedChange={(checked) => setSettings((s) => ({ ...s, enabled: checked }))}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Chế độ kết nối máy in */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Chế độ kết nối máy in tem:</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setSettings((s) => ({ ...s, connectionType: 'browser' }))}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    settings.connectionType === 'browser'
                      ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-sm flex items-center justify-between text-gray-900">
                    Trình duyệt (Driver)
                    <Badge variant="secondary" className="text-[10px]">Khuyên dùng</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    In qua hộp thoại in của Windows/macOS. Tương thích mọi loại máy in có cài driver.
                  </p>
                </div>

                <div
                  onClick={() => setSettings((s) => ({ ...s, connectionType: 'usb_serial' }))}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    settings.connectionType === 'usb_serial'
                      ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-sm flex items-center justify-between text-gray-900">
                    Cổng USB trực tiếp
                    <Badge variant="outline" className="text-[10px] text-purple-700 border-purple-200">TSPL</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gửi trực tiếp lệnh máy in Xprinter qua Web Serial USB. In cực nhanh, không hiện popup.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Khổ tem */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paper-size-select" className="text-xs font-semibold">Khổ tem dán ly:</Label>
                <Select
                  value={settings.paperSize}
                  onValueChange={(val: LabelPaperSize) => setSettings((s) => ({ ...s, paperSize: val }))}
                >
                  <SelectTrigger id="paper-size-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LABEL_PAPER_SIZES).map(([key, item]) => (
                      <SelectItem key={key} value={key}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {LABEL_PAPER_SIZES[settings.paperSize]?.description}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="font-size-select" className="text-xs font-semibold">Cỡ chữ trên tem:</Label>
                <Select
                  value={settings.fontSize}
                  onValueChange={(val: LabelFontSize) => setSettings((s) => ({ ...s, fontSize: val }))}
                >
                  <SelectTrigger id="font-size-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Nhỏ (Tiết kiệm không gian tem)</SelectItem>
                    <SelectItem value="medium">Tiêu chuẩn (Rõ ràng, cân đối)</SelectItem>
                    <SelectItem value="large">Lớn (Nổi bật cho quầy Barista)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom dimensions if paperSize === 'custom' */}
            {settings.paperSize === 'custom' && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg border border-dashed">
                <div className="space-y-1">
                  <Label className="text-xs">Chiều rộng (mm):</Label>
                  <Input
                    type="number"
                    min="30"
                    max="100"
                    value={settings.customWidthMm}
                    onChange={(e) => setSettings((s) => ({ ...s, customWidthMm: parseInt(e.target.value) || 50 }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Chiều cao (mm):</Label>
                  <Input
                    type="number"
                    min="20"
                    max="100"
                    value={settings.customHeightMm}
                    onChange={(e) => setSettings((s) => ({ ...s, customHeightMm: parseInt(e.target.value) || 30 }))}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CARD 2: NỘI DUNG VÀ CÁC TRƯỜNG THÔNG TIN */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-600" />
              Thiết kế nội dung tem dán ly
            </CardTitle>
            <CardDescription>
              Tùy biến các trường hiển thị phù hợp với quy trình pha chế của quán
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="store-name-input" className="text-xs font-semibold">Tên quán trên tem:</Label>
                <Input
                  id="store-name-input"
                  value={settings.fields.storeName}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      fields: { ...s.fields, storeName: e.target.value },
                    }))
                  }
                  placeholder="H2 MilkTea"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="footer-message-input" className="text-xs font-semibold">Lời chúc / Thông điệp đáy:</Label>
                <Input
                  id="footer-message-input"
                  value={settings.fields.footerMessage || ''}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      fields: { ...s.fields, footerMessage: e.target.value },
                    }))
                  }
                  placeholder="Chúc quý khách ngon miệng!"
                />
              </div>
            </div>

            <Separator />

            {/* Checkboxes trường hiển thị */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border">
                <span className="text-xs font-medium">Hiện tên quán / Header</span>
                <Switch
                  checked={settings.fields.showStoreName}
                  onCheckedChange={(c) =>
                    setSettings((s) => ({ ...s, fields: { ...s.fields, showStoreName: c } }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border">
                <span className="text-xs font-medium">Số thứ tự ly (#1/2, #2/2)</span>
                <Switch
                  checked={settings.fields.showOrderIndex}
                  onCheckedChange={(c) =>
                    setSettings((s) => ({ ...s, fields: { ...s.fields, showOrderIndex: c } }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border">
                <span className="text-xs font-medium">Tên bàn / Khách mang về</span>
                <Switch
                  checked={settings.fields.showTable}
                  onCheckedChange={(c) =>
                    setSettings((s) => ({ ...s, fields: { ...s.fields, showTable: c } }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border">
                <span className="text-xs font-medium">Tùy chọn Đường / Đá</span>
                <Switch
                  checked={settings.fields.showOptions}
                  onCheckedChange={(c) =>
                    setSettings((s) => ({ ...s, fields: { ...s.fields, showOptions: c } }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border">
                <span className="text-xs font-medium">Danh sách Topping mua kèm</span>
                <Switch
                  checked={settings.fields.showToppings}
                  onCheckedChange={(c) =>
                    setSettings((s) => ({ ...s, fields: { ...s.fields, showToppings: c } }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border">
                <span className="text-xs font-medium">Ghi chú đặc biệt của khách</span>
                <Switch
                  checked={settings.fields.showNote}
                  onCheckedChange={(c) =>
                    setSettings((s) => ({ ...s, fields: { ...s.fields, showNote: c } }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border">
                <span className="text-xs font-medium">Đơn giá món</span>
                <Switch
                  checked={settings.fields.showPrice}
                  onCheckedChange={(c) =>
                    setSettings((s) => ({ ...s, fields: { ...s.fields, showPrice: c } }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border">
                <span className="text-xs font-medium">Ngày giờ & Thu ngân</span>
                <Switch
                  checked={settings.fields.showDateTime}
                  onCheckedChange={(c) =>
                    setSettings((s) => ({ ...s, fields: { ...s.fields, showDateTime: c } }))
                  }
                />
              </div>
            </div>

            {/* Loại mã QR / Barcode */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold">Mã định danh tra cứu trên tem:</Label>
              <Select
                value={settings.fields.showBarcodeOrQR}
                onValueChange={(val: LabelBarcodeType) =>
                  setSettings((s) => ({ ...s, fields: { ...s.fields, showBarcodeOrQR: val } }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qr">Mã QR Code mini (Tiết kiệm diện tích, quét nhanh)</SelectItem>
                  <SelectItem value="barcode">Mã vạch Barcode 1D</SelectItem>
                  <SelectItem value="none">Không in mã (Tối đa chỗ cho topping)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: DANH MỤC SẢN PHẨM ÁP DỤNG IN TEM */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-purple-600" />
                  Loại sản phẩm được phép in tem ly
                </CardTitle>
                <CardDescription>
                  Chỉ in tem cho đồ uống cần pha chế, tránh lãng phí tem cho đồ ăn vặt hoặc topping mua thêm
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAllCategories} className="text-xs h-7">
                  Tất cả
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearAllCategories} className="text-xs h-7">
                  Bỏ chọn
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_CATEGORIES.map((cat) => {
                const isSelected = settings.applicableCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    {cat}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* CARD 4: QUY TẮC TỰ ĐỘNG IN */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quy tắc tự động in tem</CardTitle>
            <CardDescription>
              Thiết lập thời điểm máy in tự động xuất tem dán
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-purple-50/50">
              <div>
                <div className="font-semibold text-sm">Tự động in khi bấm &quot;Gửi đến bếp&quot;</div>
                <div className="text-xs text-muted-foreground">
                  Ngay khi thu ngân bấm Gửi bếp, máy in tự nhả tem để nhân viên pha chế dán ly làm đồ ngay.
                </div>
              </div>
              <Switch
                checked={settings.autoPrintOnKitchenSend}
                onCheckedChange={(c) => setSettings((s) => ({ ...s, autoPrintOnKitchenSend: c }))}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <div className="font-semibold text-sm">Tự động in khi hoàn tất &quot;Thanh toán&quot;</div>
                <div className="text-xs text-muted-foreground">
                  In kèm tem nhãn sau khi đơn hàng thanh toán thành công (phù hợp cho quầy Takeaway).
                </div>
              </div>
              <Switch
                checked={settings.autoPrintOnCheckout}
                onCheckedChange={(c) => setSettings((s) => ({ ...s, autoPrintOnCheckout: c }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* ACTION BUTTONS */}
        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="outline" onClick={handleReset} className="text-xs">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Khôi phục mặc định
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm px-6"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaved ? 'Đã lưu cấu hình!' : 'Lưu cài đặt tem dán'}
          </Button>
        </div>
      </div>

      {/* CỘT PHẢI: LIVE PREVIEW (5 CỘT) */}
      <div className="lg:col-span-5">
        <div className="sticky top-20 space-y-4">
          <Card className="border-purple-200 shadow-md">
            <CardHeader className="pb-3 bg-purple-50/40 border-b">
              <CardTitle className="text-base text-purple-950 flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-600" />
                Mô phỏng tem thực tế (Live Preview)
              </CardTitle>
              <CardDescription>
                Xem trước diện mạo tem dán ly theo thời gian thực khi bạn thay đổi các tùy chọn
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <LabelPreview settings={settings} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
