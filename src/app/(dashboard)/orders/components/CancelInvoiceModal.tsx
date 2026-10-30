'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';
import { formatCurrency } from '../utils/invoiceFormatters';
import type { Invoice } from '../types/invoice';

interface CancelInvoiceModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onConfirm: (invoiceId: string, reason: string, staffName: string) => Promise<void>;
  currentStaffName?: string;
}

const PRESET_REASONS = [
  'Khách đổi ý / Không mua nữa',
  'Pha chế làm sai món / Order nhầm món',
  'Trùng đơn / Thu ngân bấm nhầm 2 lần',
  'Khách không nhận hàng / Boom hàng',
  'Đơn test thử nghiệm hệ thống',
  'Khác (nhập chi tiết bên dưới)',
];

export const CancelInvoiceModal: React.FC<CancelInvoiceModalProps> = ({
  isOpen,
  invoice,
  onClose,
  onConfirm,
  currentStaffName = 'Quản lý',
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!invoice) return null;

  const totalAmount = Number(invoice['Tổng tiền'] || 0) + Number(invoice['VAT'] || 0) - Number(invoice['Giảm giá'] || 0);

  const handleSubmit = async () => {
    const finalReason = selectedPreset.startsWith('Khác')
      ? customReason.trim() || 'Lý do khác không xác định'
      : customReason.trim()
      ? `${selectedPreset} - ${customReason.trim()}`
      : selectedPreset;

    try {
      setIsSubmitting(true);
      await onConfirm(invoice.IDHOADON, finalReason, currentStaffName);
      onClose();
      setCustomReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600">
            <ShieldAlert className="w-5 h-5" />
            <DialogTitle className="text-lg font-bold">
              Kiểm soát thất thoát - Hủy hóa đơn
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 pt-1">
            Theo tiêu chuẩn kiểm toán F&B, hóa đơn sẽ được chuyển sang trạng thái <strong>"Đã hủy"</strong> để lưu vết kiểm toán, tuyệt đối không bị xóa mất dữ liệu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Invoice Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Mã hóa đơn:</span>
              <span className="font-semibold text-slate-800">{invoice.IDHOADON}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Bàn / Khách:</span>
              <span className="font-medium text-slate-700">
                {invoice.IDBAN || 'Mang về'} - {invoice['Khách hàng'] || 'Khách lẻ'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Giá trị hóa đơn:</span>
              <span className="font-bold text-rose-600">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Lý do hủy hóa đơn <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={selectedPreset}
              onValueChange={setSelectedPreset}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Chọn lý do hủy" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason} className="text-xs">
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Detailed Note */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Ghi chú giải trình chi tiết
            </Label>
            <Textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Nhập giải trình bổ sung hoặc biên bản hủy món nếu có..."
              rows={3}
              className="text-xs resize-none"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-md text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Người thực hiện: <strong>{currentStaffName}</strong>. Thời gian và lý do hủy sẽ được ghi lại trong nhật ký kiểm toán quản trị để đối soát cuối ngày.
            </span>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Đóng
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang lưu vết...
              </>
            ) : (
              'Xác nhận hủy hóa đơn'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
