'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '../utils/customerFormatters';
import type { Customer } from '../types/customer';

interface DebtRepaymentModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customer: Customer, amount: number, paymentMethod: string, note: string) => Promise<void>;
}

export const DebtRepaymentModal: React.FC<DebtRepaymentModalProps> = ({
  customer,
  isOpen,
  onClose,
  onConfirm
}) => {
  const currentDebt = Number(customer?.['Công nợ']) || 0;
  const [amount, setAmount] = useState<number>(currentDebt);
  const [paymentMethod, setPaymentMethod] = useState<string>('Tiền mặt');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (customer) {
      const debt = Number(customer['Công nợ']) || 0;
      setAmount(debt);
      setNote(`Thu tiền nợ của khách hàng ${customer['Tên khách hàng']}`);
    }
  }, [customer]);

  if (!customer) return null;

  const remainingAfterPayment = Math.max(0, currentDebt - amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Số tiền thu nợ phải lớn hơn 0!');
      return;
    }
    if (amount > currentDebt) {
      alert('Số tiền thu nợ không được vượt quá số tiền nợ hiện tại!');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm(customer, amount, paymentMethod, note);
      onClose();
    } catch (err) {
      console.error('Error submitting debt repayment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-900">
            <CreditCard className="w-5 h-5 text-amber-600" />
            Thu nợ khách hàng
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Customer Summary */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Khách hàng:</span>
              <strong className="text-gray-900">{customer['Tên khách hàng']}</strong>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Số điện thoại:</span>
              <span className="text-gray-800">{customer['Số điện thoại'] || 'Không có'}</span>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-amber-200">
              <span className="text-amber-900 font-medium">Tổng nợ hiện tại:</span>
              <span className="text-base font-bold text-rose-600">{formatCurrency(currentDebt)}</span>
            </div>
          </div>

          {/* Amount to pay */}
          <div className="space-y-1.5">
            <Label htmlFor="repayAmount" className="text-sm font-medium text-gray-700">
              Số tiền thu nợ (VNĐ)
            </Label>
            <Input
              id="repayAmount"
              type="number"
              min={1000}
              max={currentDebt}
              step={1000}
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="font-semibold text-lg text-blue-700"
              required
            />
            {/* Quick buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount(currentDebt)}
                className="text-xs flex-1 bg-amber-50 text-amber-900 border-amber-300"
              >
                Trả hết ({formatCurrency(currentDebt)})
              </Button>
              {currentDebt > 20000 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(Math.round(currentDebt / 2000) * 1000)}
                  className="text-xs flex-1"
                >
                  Trả 50%
                </Button>
              )}
            </div>
          </div>

          {/* Remaining Debt Forecast */}
          <div className="bg-gray-50 p-2.5 rounded text-xs flex justify-between items-center text-gray-700">
            <span>Dư nợ còn lại sau khi thu:</span>
            <strong className={remainingAfterPayment === 0 ? 'text-green-600' : 'text-amber-700'}>
              {formatCurrency(remainingAfterPayment)}
            </strong>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label htmlFor="repayMethod" className="text-sm font-medium text-gray-700">
              Hình thức thanh toán
            </Label>
            <select
              id="repayMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 text-sm"
            >
              <option value="Tiền mặt">Tiền mặt</option>
              <option value="Chuyển khoản">Chuyển khoản</option>
              <option value="Thẻ">Thẻ</option>
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="repayNote" className="text-sm font-medium text-gray-700">
              Ghi chú
            </Label>
            <Textarea
              id="repayNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="resize-none text-sm"
              placeholder="Nhập ghi chú thu nợ..."
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || amount <= 0 || amount > currentDebt}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
            >
              {isSubmitting ? 'Đang xử lý...' : `Xác nhận thu nợ (${formatCurrency(amount)})`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
