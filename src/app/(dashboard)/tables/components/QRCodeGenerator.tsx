'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Table } from '../types/table';

export function QRCodeGenerator({ table }: { table: Table }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [error, setError] = useState('');
  const [origin, setOrigin] = useState('');
  const tableId = table.IDBAN === 'Khách mua về' ? 'takeaway' : table.IDBAN;
  const orderUrl = `${origin}/order?table=${encodeURIComponent(tableId)}`;

  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    QRCode.toDataURL(orderUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 640,
      color: { dark: '#111827', light: '#FFFFFF' },
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setQrDataUrl(dataUrl);
          setError('');
        }
      })
      .catch(() => {
        if (!cancelled) setError('Không thể tạo mã QR. Vui lòng thử lại.');
      });
    return () => { cancelled = true; };
  }, [orderUrl]);

  const getBrandedQr = async () => {
    if (!qrDataUrl) return;
    const source = new Image();
    source.src = qrDataUrl;
    await new Promise<void>((resolve, reject) => {
      source.onload = () => resolve();
      source.onerror = () => reject(new Error('Cannot load QR image'));
    });
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 960;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textAlign = 'center';
    context.fillStyle = '#dc2626';
    context.font = 'bold 42px Arial';
    context.fillText('H2 MilkTea', 400, 68);
    context.drawImage(source, 80, 105, 640, 640);
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.roundRect(350, 375, 100, 100, 18);
    context.fill();
    context.fillStyle = '#dc2626';
    context.font = 'bold 42px Arial';
    context.fillText('H2', 400, 440);
    context.fillStyle = '#111827';
    context.font = 'bold 34px Arial';
    context.fillText(table['Tên bàn'], 400, 805, 720);
    context.fillStyle = '#6b7280';
    context.font = '20px Arial';
    context.fillText('Quét mã để xem menu và đặt món', 400, 850);
    return canvas.toDataURL('image/png');
  };

  const downloadQr = async () => {
    try {
      const brandedQr = await getBrandedQr();
      if (!brandedQr) return;
    const link = document.createElement('a');
    link.href = brandedQr;
    link.download = `QR-${table.IDBAN}.png`;
    link.click();
    } catch {
      setError('Không thể tải ảnh QR. Vui lòng thử lại.');
    }
  };

  const printQr = async () => {
    if (!qrDataUrl) return;
    const printWindow = window.open('', '_blank', 'width=600,height=700');
    if (!printWindow) {
      setError('Trình duyệt đang chặn cửa sổ in. Hãy cho phép popup rồi thử lại.');
      return;
    }
    try {
    const brandedQr = await getBrandedQr();
    if (!brandedQr) return;
    const safeTableName = table['Tên bàn'].replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character] || character);
    printWindow.document.write(`<!doctype html><html><head><title>QR ${safeTableName}</title><style>
      body{font-family:Arial,sans-serif;text-align:center;padding:24px;color:#111827}
      img{width:min(80vw,420px);height:auto}.brand{font-weight:800;color:#dc2626;font-size:24px;margin:12px}
      h1{font-size:22px;margin:8px}p{font-size:12px;color:#4b5563;word-break:break-all}
      @media print{body{padding:0}}
    </style></head><body><img src="${brandedQr}" alt="QR đặt món"><p>${safeTableName}</p><p>${orderUrl}</p><script>window.onload=()=>window.print()</script></body></html>`);
    printWindow.document.close();
    } catch {
      printWindow.close();
      setError('Không thể tạo bản in QR. Vui lòng thử lại.');
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-full">
          <QrCode className="mr-2 h-4 w-4" /> Tạo QR đặt món
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>QR đặt món · {table['Tên bàn']}</DialogTitle>
          <DialogDescription>Khách quét mã này để mở menu gắn với bàn {table['Tên bàn']}.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3">
          {qrDataUrl ? (
            <div className="relative rounded-xl bg-white p-3 shadow-sm">
              <img src={qrDataUrl} alt={`QR đặt món ${table['Tên bàn']}`} className="h-64 w-64" />
              <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border-4 border-white bg-red-600 text-xs font-black text-white shadow">H2</div>
            </div>
          ) : <div className="flex h-64 w-64 items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-500">Đang tạo mã QR...</div>}
          <p className="max-w-full break-all text-center text-xs text-gray-500">{orderUrl}</p>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex w-full gap-2">
            <Button type="button" className="flex-1" onClick={downloadQr} disabled={!qrDataUrl}>
              <Download className="mr-2 h-4 w-4" /> Tải PNG
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={printQr} disabled={!qrDataUrl}>
              <Printer className="mr-2 h-4 w-4" /> In QR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
