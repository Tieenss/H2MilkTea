'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, ExternalLink, Printer, X, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface TableQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string | null;
  tableName: string;
}

export const TableQRModal: React.FC<TableQRModalProps> = ({
  isOpen,
  onClose,
  tableId,
  tableName,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [orderUrl, setOrderUrl] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !tableId) return;

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://h2milktea.vercel.app';
    const url = `${origin}/order/menu?table=${encodeURIComponent(tableId)}`;
    setOrderUrl(url);

    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch((err) => console.error('Lỗi tạo mã QR:', err));
  }, [isOpen, tableId]);

  if (!isOpen || !tableId) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(orderUrl);
      toast.success('Đã sao chép liên kết đặt món!');
    } catch {
      toast.error('Không thể sao chép liên kết.');
    }
  };

  const handleOpenDemo = () => {
    window.open(orderUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Mã QR - ${tableName}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 24px;
              text-align: center;
            }
            .card {
              border: 2px dashed #0284c7;
              border-radius: 16px;
              padding: 28px;
              max-width: 340px;
            }
            h1 { font-size: 24px; color: #0f172a; margin: 0 0 6px 0; }
            h2 { font-size: 18px; color: #0284c7; margin: 0 0 16px 0; }
            img { width: 240px; height: 240px; }
            p { font-size: 13px; color: #475569; margin: 12px 0 0 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>H2 MILK TEA</h1>
            <h2>Quét QR Gọi Món - ${tableName}</h2>
            <img src="${qrDataUrl}" alt="QR Code" />
            <p>Mở Zalo hoặc Camera điện thoại quét mã để xem menu và đặt món nhanh chóng!</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-scale-up">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Mã QR Đặt Món</h3>
              <p className="text-xs text-slate-500 font-medium">{tableName}</p>
            </div>
          </div>
          <Button onClick={onClose} variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* QR Body */}
        <div className="p-6 flex flex-col items-center text-center">
          <div className="p-3 bg-white border-2 border-dashed border-indigo-200 rounded-2xl shadow-sm mb-4">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`Mã QR ${tableName}`} className="w-56 h-56 object-contain" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                Đang tạo mã QR...
              </div>
            )}
          </div>

          <p className="text-xs text-slate-600 max-w-xs leading-relaxed mb-4">
            Khách ngồi tại <strong>{tableName}</strong> có thể mở Zalo hoặc Camera quét mã này để tự chọn món và gửi đơn trực tiếp đến máy POS.
          </p>

          <div className="w-full bg-slate-50 border border-slate-200/80 rounded-lg p-2 flex items-center justify-between text-xs text-slate-600 mb-5">
            <span className="truncate flex-1 text-left font-mono mr-2">{orderUrl}</span>
            <Button onClick={handleCopyLink} size="sm" variant="outline" className="h-7 px-2 text-xs flex-shrink-0">
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 w-full">
            <Button
              onClick={handleOpenDemo}
              variant="outline"
              className="w-full text-xs font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Mở trang khách
            </Button>
            <Button
              onClick={handlePrint}
              className="w-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              In phiếu dán bàn
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
