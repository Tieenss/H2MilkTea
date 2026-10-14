'use client';

import { useMemo, useState } from 'react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { Download, QrCode } from 'lucide-react';
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

interface BulkQRCodeGeneratorProps {
  tables: Table[];
}

function safeFileName(value: string) {
  return value.replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').trim() || 'table';
}

async function makeBrandedQr(table: Table, origin: string) {
  const tableId = table.IDBAN === 'Khách mua về' ? 'takeaway' : table.IDBAN;
  const url = `${origin}/order?table=${encodeURIComponent(tableId)}`;
  const qrDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 640,
    color: { dark: '#111827', light: '#FFFFFF' },
  });

  const qrImage = new Image();
  qrImage.src = qrDataUrl;
  await new Promise<void>((resolve, reject) => {
    qrImage.onload = () => resolve();
    qrImage.onerror = () => reject(new Error(`Không thể tạo QR cho ${table['Tên bàn']}`));
  });

  const brandLogo = new Image();
  brandLogo.src = '/logo-h2.png';
  await new Promise<void>((resolve, reject) => {
    brandLogo.onload = () => resolve();
    brandLogo.onerror = () => reject(new Error('Không tải được logo H2 MilkTea.'));
  });

  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 960;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Trình duyệt không hỗ trợ tạo ảnh QR.');

  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.textAlign = 'center';
  context.save();
  context.shadowColor = 'rgba(15, 118, 110, 0.18)';
  context.shadowBlur = 12;
  context.shadowOffsetY = 3;
  context.font = '800 48px "Trebuchet MS", "Segoe UI", sans-serif';
  const brandGradient = context.createLinearGradient(190, 0, 610, 0);
  brandGradient.addColorStop(0, '#9a3412');
  brandGradient.addColorStop(0.48, '#0f766e');
  brandGradient.addColorStop(1, '#0369a1');
  context.fillStyle = brandGradient;
  context.textAlign = 'center';
  context.fillText('H2 MilkTea', 400, 68);
  context.restore();
  const accentGradient = context.createLinearGradient(300, 0, 500, 0);
  accentGradient.addColorStop(0, '#f59e0b');
  accentGradient.addColorStop(1, '#14b8a6');
  context.fillStyle = accentGradient;
  context.beginPath();
  context.roundRect(335, 82, 130, 5, 3);
  context.fill();
  context.drawImage(qrImage, 80, 105, 640, 640);
  context.fillStyle = '#fff';
  context.beginPath();
  context.roundRect(344, 369, 112, 112, 22);
  context.fill();
  context.drawImage(brandLogo, 352, 377, 96, 96);
  context.fillStyle = '#111827';
  context.font = 'bold 34px Arial';
  context.fillText(table['Tên bàn'], 400, 805, 720);
  context.fillStyle = '#6b7280';
  context.font = '20px Arial';
  context.fillText(`Mã bàn: ${table.IDBAN}`, 400, 845, 720);
  context.fillText('Quét mã để xem menu và đặt món', 400, 885, 720);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((imageBlob) => imageBlob ? resolve(imageBlob) : reject(new Error('Không thể xuất ảnh QR.')), 'image/png');
  });
  return { blob, url };
}

export function BulkQRCodeGenerator({ tables }: BulkQRCodeGeneratorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const eligibleTables = useMemo(
    () => tables.filter((table) => table.IDBAN !== 'Khách mua về' && table['Trạng thái'] !== 'Bảo trì' && table['Trạng thái'] !== 'Ngừng hoạt động'),
    [tables],
  );
  const selectedTables = eligibleTables.filter((table) => selectedIds.includes(table.IDBAN));
  const allSelected = eligibleTables.length > 0 && selectedTables.length === eligibleTables.length;

  const toggleTable = (tableId: string) => {
    setSelectedIds((current) => current.includes(tableId)
      ? current.filter((id) => id !== tableId)
      : [...current, tableId]);
  };

  const generateZip = async () => {
    if (!selectedTables.length) return;
    setIsGenerating(true);
    setError('');
    setProgress('Đang chuẩn bị ảnh...');
    try {
      const origin = window.location.origin;
      const zip = new JSZip();
      for (const [index, table] of selectedTables.entries()) {
        setProgress(`Đang tạo QR ${index + 1}/${selectedTables.length}: ${table['Tên bàn']}`);
        const { blob } = await makeBrandedQr(table, origin);
        zip.file(`${safeFileName(table['Tên bàn'])}-${safeFileName(table.IDBAN)}.png`, blob);
      }
      setProgress('Đang nén ảnh thành file ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `QR-cac-ban-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      URL.revokeObjectURL(downloadUrl);
      setProgress(`Đã tạo ${selectedTables.length} ảnh QR.`);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Không thể tạo ảnh QR.');
      setProgress('');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog onOpenChange={(open) => { if (!open) { setError(''); setProgress(''); } }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="border-blue-600 text-blue-700 hover:bg-blue-50">
          <QrCode className="mr-2 h-4 w-4" /> Tạo QR hàng loạt
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo ảnh QR cho nhiều bàn</DialogTitle>
          <DialogDescription>Chọn các bàn cần tạo. Mỗi ảnh PNG có tên bàn, mã bàn và đường dẫn đặt món; tất cả được tải trong một file ZIP.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-gray-50 p-3">
          <span className="text-sm font-medium">Đã chọn {selectedTables.length}/{eligibleTables.length} bàn</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setSelectedIds(allSelected ? [] : eligibleTables.map((table) => table.IDBAN))}>
            {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả bàn đang hoạt động'}
          </Button>
        </div>
        <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
          {eligibleTables.map((table) => (
            <label key={table.IDBAN} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-blue-50">
              <input
                type="checkbox"
                checked={selectedIds.includes(table.IDBAN)}
                onChange={() => toggleTable(table.IDBAN)}
                className="h-4 w-4 accent-blue-600"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{table['Tên bàn']}</span>
                <span className="block text-xs text-gray-500">{table.IDBAN}</span>
              </span>
            </label>
          ))}
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {progress && <p aria-live="polite" className="text-sm text-gray-600">{progress}</p>}
        <Button type="button" onClick={generateZip} disabled={isGenerating || selectedTables.length === 0} className="w-full bg-blue-600 hover:bg-blue-700">
          <Download className="mr-2 h-4 w-4" />
          {isGenerating ? 'Đang tạo ảnh QR...' : `Tạo và tải ${selectedTables.length} ảnh QR`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
