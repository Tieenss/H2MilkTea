'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { LabelSettings, PrintableLabelItem } from '@/types/labelSettings';
import { getLabelDimensions, generateQRCodeDataUrl, printOrderLabels } from '@/utils/labelPrint';
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

export const LabelPreview: React.FC<LabelPreviewProps> = ({ settings, sampleItem = defaultSampleItem }) => {
  const [zoomScale, setZoomScale] = useState(1.5); // Phóng to 1.5x để dễ nhìn trên màn hình
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);

  const item: PrintableLabelItem = { ...defaultSampleItem, ...sampleItem };
  const { width, height } = getLabelDimensions(settings);
  const fields = settings.fields;

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

  const fontMultiplier = (settings.fontSize === 'small' ? 0.85 : settings.fontSize === 'large' ? 1.15 : 1.0) * zoomScale;

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
          className="bg-white rounded-sm border border-gray-400 select-none flex flex-col justify-between transition-all duration-200 text-black font-sans relative"
        >
          {/* HEADER */}
          <div className="flex justify-between items-baseline border-b border-black pb-0.5">
            <span
              style={{ fontSize: `${Math.round(10 * fontMultiplier)}px` }}
              className="font-extrabold uppercase tracking-tight truncate max-w-[65%]"
            >
              {fields.showStoreName ? fields.storeName : ''}
            </span>
            <div
              style={{ fontSize: `${Math.round(9 * fontMultiplier)}px` }}
              className="font-bold flex items-center gap-1"
            >
              {fields.showTable && <span>[Bàn 01]</span>}
              {fields.showOrderIndex && <span>#1/2</span>}
            </div>
          </div>

          {/* BODY */}
          <div className="flex-1 flex flex-col justify-start overflow-hidden py-1">
            <div
              style={{ fontSize: `${Math.round(11 * fontMultiplier)}px` }}
              className="font-black uppercase line-clamp-1 leading-tight"
            >
              {item.name} {item.size && `[${item.size}]`}
            </div>

            {fields.showOptions && (item.sugar || item.ice) && (
              <div
                style={{ fontSize: `${Math.round(9 * fontMultiplier)}px` }}
                className="font-semibold text-gray-800 leading-tight mt-0.5"
              >
                {item.sugar ? `Đường: ${item.sugar}` : ''}
                {item.sugar && item.ice ? ' · ' : ''}
                {item.ice ? `Đá: ${item.ice}` : ''}
              </div>
            )}

            {fields.showToppings && item.toppings && item.toppings.length > 0 && (
              <div
                style={{ fontSize: `${Math.round(8.5 * fontMultiplier)}px` }}
                className="text-gray-900 leading-tight mt-0.5 line-clamp-1"
              >
                {item.toppings.map((t) => `+ ${t}`).join(', ')}
              </div>
            )}

            {fields.showNote && item.note && (
              <div
                style={{ fontSize: `${Math.round(8 * fontMultiplier)}px` }}
                className="italic text-gray-700 leading-tight mt-0.5 line-clamp-1"
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
                  style={{ width: `${Math.round(18 * zoomScale)}px`, height: `${Math.round(18 * zoomScale)}px` }}
                  className="object-contain"
                />
              ) : fields.showBarcodeOrQR === 'barcode' ? (
                <div
                  style={{ fontSize: `${Math.round(7 * fontMultiplier)}px` }}
                  className="font-mono tracking-tighter bg-gray-100 px-1 border border-black"
                >
                  |||||||||||||||
                </div>
              ) : null}

              <div
                style={{ fontSize: `${Math.round(7.5 * fontMultiplier)}px` }}
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
                  style={{ fontSize: `${Math.round(10 * fontMultiplier)}px` }}
                  className="font-extrabold text-black"
                >
                  35.000 ₫
                </div>
              )}
              {fields.footerMessage && (
                <div
                  style={{ fontSize: `${Math.round(6.5 * fontMultiplier)}px` }}
                  className="italic text-gray-600 line-clamp-1"
                >
                  {fields.footerMessage}
                </div>
              )}
            </div>
          </div>
        </div>
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
