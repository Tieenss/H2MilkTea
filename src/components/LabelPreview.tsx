'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, ZoomIn, ZoomOut, RotateCcw, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { LabelSettings, PrintableLabelItem } from '@/types/labelSettings';
import { getLabelDimensions, generateQRCodeDataUrl, printOrderLabels, resolveLabelElementSizes } from '@/utils/labelPrint';
import { formatCurrency } from '@/app/(dashboard)/pos/utils/formatters';
import toast from 'react-hot-toast';

interface LabelPreviewProps {
  settings: LabelSettings;
  sampleItem?: Partial<PrintableLabelItem>;
}

export const defaultSampleItem: PrintableLabelItem = {
  id: 'sample-01',
  name: 'Trà Sữa Trân Châu Hoàng Kim',
  size: 'L',
  sugar: '50%',
  ice: '70%',
  toppings: ['Trân châu hoàng kim', 'Pudding trứng'],
  note: 'Uống liền, ít đá',
  price: 35000,
  itemIndex: 1,
  totalItems: 2,
};

export const LabelPreview: React.FC<LabelPreviewProps> = ({ settings, sampleItem }) => {
  const [zoomScale, setZoomScale] = useState(1.5); // Phóng to 1.5x để dễ nhìn trên màn hình
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [showSampleEditor, setShowSampleEditor] = useState(false);

  const [customSample, setCustomSample] = useState<PrintableLabelItem>({
    ...defaultSampleItem,
    ...sampleItem,
  });

  useEffect(() => {
    if (sampleItem) {
      setCustomSample((prev) => ({ ...prev, ...sampleItem }));
    }
  }, [sampleItem]);

  const item = customSample;
  const { width, height } = getLabelDimensions(settings);
  const fields = settings.fields;
  const sizes = resolveLabelElementSizes(settings);

  // 1mm ~ 3.78px trên màn hình 96dpi
  const widthPx = Math.round(width * 3.78 * zoomScale);
  const heightPx = Math.round(height * 3.78 * zoomScale);

  useEffect(() => {
    let active = true;
    if (fields.showBarcodeOrQR === 'qr') {
      generateQRCodeDataUrl('H2POS-DEMO-01').then((url) => {
        if (active) setQrDataUrl(url);
      });
    } else {
      setQrDataUrl('');
    }
    return () => {
      active = false;
    };
  }, [fields.showBarcodeOrQR]);

  const handleTestPrint = async () => {
    setIsPrinting(true);
    try {
      const res = await printOrderLabels(
        [
          {
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            size: item.size,
            sugar: item.sugar,
            ice: item.ice,
            toppings: item.toppings,
            note: item.note,
            image: '',
            unit: 'Ly',
          },
        ],
        {
          orderId: 'DEMO001',
          tableName: 'Bàn 01',
          cashierName: 'Admin',
          createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
        settings
      );

      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi in thử tem.';
      toast.error(msg);
    } finally {
      setIsPrinting(false);
    }
  };

  const applySamplePreset = (mode: 'standard' | 'long') => {
    if (mode === 'standard') {
      setCustomSample({ ...defaultSampleItem });
    } else {
      setCustomSample({
        ...defaultSampleItem,
        name: 'Trà Sữa Ô Long Kem Phô Mai Nướng Đặc Biệt',
        size: 'XL',
        sugar: '30%',
        ice: '50%',
        toppings: ['Trân châu trắng', 'Kem phô mai', 'Thạch dừa', 'Pudding trứng'],
        note: 'Không lấy ống hút nhựa, để riêng đá',
        price: 125000,
      });
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Zoom & Action Controls */}
      <div className="w-full flex items-center justify-between mb-3 px-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Kích thước tem:</span>
          <Badge variant="outline" className="font-mono bg-white text-xs">
            {width}mm × {height}mm
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setZoomScale((s) => Math.max(1.0, s - 0.25))}
            title="Thu nhỏ"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="font-mono text-xs w-10 text-center">{Math.round(zoomScale * 100)}%</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setZoomScale((s) => Math.min(2.5, s + 0.25))}
            title="Phóng to"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 ml-1"
            onClick={() => setZoomScale(1.5)}
            title="Tỉ lệ mặc định"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Visual Sticker Card */}
      <div className="p-4 bg-gray-100 rounded-xl border border-dashed border-gray-300 flex items-center justify-center w-full min-h-[220px] overflow-auto shadow-inner">
        <div
          style={{
            width: `${widthPx}px`,
            height: `${heightPx}px`,
            padding: `${Math.round(6 * zoomScale)}px ${Math.round(8 * zoomScale)}px`,
            boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
          }}
          className="bg-white rounded-sm border border-gray-400 select-none flex flex-col justify-between transition-all duration-200 text-black font-sans relative overflow-hidden"
        >
          {/* HEADER */}
          <div
            className={`flex items-baseline border-b border-black pb-0.5 ${
              fields.headerAlign === 'center' ? 'justify-center gap-2' : 'justify-between'
            }`}
          >
            <span
              style={{ fontSize: `${Math.round(sizes.storeNameSize * zoomScale * 10) / 10}px` }}
              className="font-extrabold uppercase tracking-tight truncate max-w-[65%]"
            >
              {fields.showStoreName ? fields.storeName : ''}
            </span>
            <div
              style={{ fontSize: `${Math.round(sizes.tableAndIndexSize * zoomScale * 10) / 10}px` }}
              className="font-bold flex items-center gap-1 shrink-0"
            >
              {fields.showTable && <span>[Bàn 01]</span>}
              {fields.showOrderIndex && <span>#{item.itemIndex}/{item.totalItems}</span>}
            </div>
          </div>

          {/* BODY */}
          <div className="flex-1 min-h-0 flex flex-col justify-start gap-0.5 overflow-hidden py-1">
            <div
              style={{ fontSize: `${Math.round(sizes.productNameSize * zoomScale * 10) / 10}px` }}
              className={`${
                fields.productNameBold !== false ? 'font-black' : 'font-semibold'
              } uppercase ${
                fields.productNameWrap !== false ? 'line-clamp-2' : 'line-clamp-1'
              } leading-[1.22] break-words shrink-0`}
            >
              {item.name} {item.size && `[${item.size}]`}
            </div>

            {fields.showOptions && (item.sugar || item.ice) && (
              <div
                style={{ fontSize: `${Math.round(sizes.optionsSize * zoomScale * 10) / 10}px` }}
                className="font-semibold text-gray-800 leading-[1.2] shrink-0 truncate"
              >
                {item.sugar ? `Đường: ${item.sugar}` : ''}
                {item.sugar && item.ice ? ' · ' : ''}
                {item.ice ? `Đá: ${item.ice}` : ''}
              </div>
            )}

            {fields.showToppings && item.toppings && item.toppings.length > 0 && (
              <div
                style={{ fontSize: `${Math.round(sizes.toppingsSize * zoomScale * 10) / 10}px` }}
                className="text-gray-900 leading-[1.2] line-clamp-2 overflow-hidden shrink-0"
              >
                {item.toppings.map((t) => `+ ${t}`).join(', ')}
              </div>
            )}

            {fields.showNote && item.note && (
              <div
                style={{ fontSize: `${Math.round(sizes.noteSize * zoomScale * 10) / 10}px` }}
                className="italic text-gray-700 leading-[1.2] line-clamp-1 overflow-hidden shrink-0"
              >
                * {item.note}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="border-t border-dashed border-black pt-1 flex justify-between items-end">
            <div className="flex items-center gap-1.5">
              {fields.showBarcodeOrQR === 'qr' && qrDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={qrDataUrl}
                  alt="QR"
                  style={{
                    width: `${Math.round(sizes.qrCodeSize * zoomScale)}px`,
                    height: `${Math.round(sizes.qrCodeSize * zoomScale)}px`,
                  }}
                  className="object-contain shrink-0"
                />
              ) : fields.showBarcodeOrQR === 'barcode' ? (
                <div
                  style={{ fontSize: `${Math.round(Math.max(6, sizes.metaSize - 0.5) * zoomScale)}px` }}
                  className="font-mono tracking-tighter bg-gray-100 px-1 border border-black"
                >
                  |||||||||||||||
                </div>
              ) : null}

              <div
                style={{ fontSize: `${Math.round(sizes.metaSize * zoomScale * 10) / 10}px` }}
                className="leading-tight text-gray-700"
              >
                {fields.showDateTime && (
                  <div>{new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                )}
                {fields.showCashier && <div>TN: Admin</div>}
              </div>
            </div>

            <div className="text-right">
              {fields.showPrice && (
                <div
                  style={{ fontSize: `${Math.round(sizes.priceSize * zoomScale * 10) / 10}px` }}
                  className={`${fields.priceBold !== false ? 'font-extrabold' : 'font-medium'} text-black leading-tight`}
                >
                  {formatCurrency(item.price)}
                </div>
              )}
              {fields.footerMessage && (
                <div
                  style={{ fontSize: `${Math.round(sizes.footerMessageSize * zoomScale * 10) / 10}px` }}
                  className="italic text-gray-600 line-clamp-1 leading-tight"
                >
                  {fields.footerMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bộ công cụ thử nghiệm dữ liệu mẫu (Sample Data Tester) */}
      <div className="w-full mt-3 border rounded-lg bg-purple-50/40 border-purple-100 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSampleEditor((prev) => !prev)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-purple-900 hover:bg-purple-100/50 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
            Thử nghiệm nội dung mẫu (Kiểm tra tràn chữ)
          </span>
          {showSampleEditor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showSampleEditor && (
          <div className="p-3 pt-1 space-y-2.5 border-t border-purple-100 bg-white">
            <div className="flex items-center gap-1.5 pb-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applySamplePreset('standard')}
                className="h-6 text-[11px] px-2"
              >
                Mẫu tiêu chuẩn
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applySamplePreset('long')}
                className="h-6 text-[11px] px-2 border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                Thử tên món dài & nhiều topping
              </Button>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-gray-600">Tên món thử nghiệm:</Label>
              <Input
                value={item.name}
                onChange={(e) => setCustomSample((s) => ({ ...s, name: e.target.value }))}
                className="h-7 text-xs"
                placeholder="Nhập tên món dài để thử..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-600">Size (M / L / XL):</Label>
                <Input
                  value={item.size || ''}
                  onChange={(e) => setCustomSample((s) => ({ ...s, size: e.target.value }))}
                  className="h-7 text-xs"
                  placeholder="L"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-600">Giá tiền mẫu (VNĐ):</Label>
                <Input
                  type="number"
                  value={item.price}
                  onChange={(e) => setCustomSample((s) => ({ ...s, price: Number(e.target.value) || 0 }))}
                  className="h-7 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-gray-600">Danh sách Topping (phân cách bằng dấu phẩy):</Label>
              <Input
                value={(item.toppings || []).join(', ')}
                onChange={(e) =>
                  setCustomSample((s) => ({
                    ...s,
                    toppings: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  }))
                }
                className="h-7 text-xs"
                placeholder="Trân châu hoàng kim, Pudding trứng..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Test Print Button */}
      <div className="w-full mt-4 flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          Chế độ in: <span className="font-semibold text-foreground">{settings.connectionType === 'browser' ? 'Trình duyệt (Driver)' : 'Web Serial (USB trực tiếp)'}</span>
        </div>
        <Button
          type="button"
          onClick={handleTestPrint}
          disabled={isPrinting || !settings.enabled}
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs px-4 py-2 h-9"
        >
          <Printer className="w-3.5 h-3.5 mr-1.5" />
          {isPrinting ? 'Đang gửi lệnh in...' : 'In thử tem mẫu'}
        </Button>
      </div>
    </div>
  );
};
