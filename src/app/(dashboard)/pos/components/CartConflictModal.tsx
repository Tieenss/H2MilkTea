'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, ArrowRightLeft, PlusCircle } from 'lucide-react';
import type { ConflictingItem } from '@/lib/cart/mergeCart';

interface CartConflictModalProps {
  open: boolean;
  tableName?: string;
  conflictingItems: ConflictingItem[];
  onResolve: (strategy: 'keep_local' | 'take_remote' | 'merge_quantities') => void;
  onCancel?: () => void;
}

export const CartConflictModal: React.FC<CartConflictModalProps> = ({
  open,
  tableName = 'bàn hiện tại',
  conflictingItems,
  onResolve,
  onCancel,
}) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && onCancel) onCancel(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <AlertTriangle className="w-5 h-5" />
            <DialogTitle className="text-lg font-bold">Xung đột giỏ hàng tại {tableName}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600">
            Giỏ hàng của bàn này vừa được cập nhật đồng thời trên một thiết bị khác. Vui lòng chọn cách xử lý để tránh ghi đè dữ liệu:
          </DialogDescription>
        </DialogHeader>

        <div className="my-3 border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-700 text-xs uppercase">
              <tr>
                <th className="p-2.5">Tên món</th>
                <th className="p-2.5 text-center text-blue-600">Máy này (Local)</th>
                <th className="p-2.5 text-center text-purple-600">Máy khác (Remote)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {conflictingItems.map((item) => (
                <tr key={item.key} className="hover:bg-gray-50">
                  <td className="p-2.5">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    {item.note && <p className="text-xs text-gray-500 italic">{item.note}</p>}
                  </td>
                  <td className="p-2.5 text-center font-bold text-blue-700 bg-blue-50/50">
                    {item.localQuantity} {item.unit}
                  </td>
                  <td className="p-2.5 text-center font-bold text-purple-700 bg-purple-50/50">
                    {item.remoteQuantity} {item.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            className="border-blue-500 text-blue-700 hover:bg-blue-50 flex items-center justify-center gap-1.5"
            onClick={() => onResolve('keep_local')}
          >
            <CheckCircle className="w-4 h-4" />
            Giữ bản máy này
          </Button>

          <Button
            type="button"
            variant="outline"
            className="border-purple-500 text-purple-700 hover:bg-purple-50 flex items-center justify-center gap-1.5"
            onClick={() => onResolve('take_remote')}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Nhận bản máy khác
          </Button>

          <Button
            type="button"
            className="bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-1.5"
            onClick={() => onResolve('merge_quantities')}
          >
            <PlusCircle className="w-4 h-4" />
            Gộp số lượng cả hai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
