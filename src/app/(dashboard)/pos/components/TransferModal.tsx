'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '../utils/formatters';
import type { Table, CartItem } from '../types/pos';
import { ArrowRight, AlertTriangle, CheckCircle2, Users, ShoppingBag, Wallet } from 'lucide-react';

interface TransferModalProps {
  tables: Table[];
  selectedTableId: string | null;
  activeOrders: Map<string, CartItem[]>;
  cart: CartItem[];
  subtotal: number;
  onTransfer: (targetTableId: string) => void;
  onClose: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  tables,
  selectedTableId,
  activeOrders,
  cart,
  subtotal,
  onTransfer,
  onClose
}) => {
  const [pendingTargetTable, setPendingTargetTable] = useState<Table | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sourceTable = tables.find(t => t.IDBAN === selectedTableId);

  // Lấy danh sách bàn có thể chuyển đến (bao gồm cả bàn trống và bàn đang có đơn để hỗ trợ gộp bàn)
  const targetTables = tables.filter(table =>
    table.IDBAN !== selectedTableId &&
    table['Tên bàn'] !== 'Khách mua về'
  );

  const getTableOrderItems = (table: Table): CartItem[] => {
    const byId = activeOrders.get(table.IDBAN);
    if (byId && byId.length > 0) return byId;
    const byName = activeOrders.get(table['Tên bàn']);
    if (byName && byName.length > 0) return byName;
    return [];
  };

  if (!sourceTable) {
    return null;
  }

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const pendingTargetItems = pendingTargetTable ? getTableOrderItems(pendingTargetTable) : [];
  const isTargetOccupied = pendingTargetItems.length > 0;
  const pendingTargetQty = pendingTargetItems.reduce((sum, item) => sum + item.quantity, 0);
  const pendingTargetTotal = pendingTargetItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleConfirmTransfer = async () => {
    if (!pendingTargetTable || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onTransfer(pendingTargetTable.IDBAN);
      setPendingTargetTable(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-5 sm:p-6 border-b dark:border-gray-800">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-1">
              Chuyển bàn
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Chọn bàn đích để chuyển đơn hàng từ <strong className="text-blue-600 dark:text-blue-400">{sourceTable['Tên bàn']}</strong>
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Current Order Summary */}
        <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900/60 border-b dark:border-gray-800">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-3 text-sm uppercase tracking-wider">
            Đơn hàng hiện tại
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Từ bàn nguồn</p>
                <p className="font-bold text-gray-800 dark:text-white">{sourceTable['Tên bàn']}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Số lượng món</p>
                <p className="font-bold text-gray-800 dark:text-white">{totalQuantity} ly/món ({cart.length} loại)</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                <Wallet className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tổng tiền tạm tính</p>
                <p className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(subtotal)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Available Tables */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-white">
              Chọn bàn đích ({targetTables.length} bàn)
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-green-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                Bàn trống
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Đang có khách (Gộp bàn)
              </span>
            </div>
          </div>

          {targetTables.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                Không có bàn nào khả dụng để chuyển
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 max-h-96 overflow-y-auto pr-1">
              {targetTables.map(table => {
                const existingItems = getTableOrderItems(table);
                return (
                  <TransferTableCard
                    key={table.IDBAN}
                    table={table}
                    existingItems={existingItems}
                    isSelected={pendingTargetTable?.IDBAN === table.IDBAN}
                    onSelect={() => setPendingTargetTable(table)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 sm:p-5 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <Button
            onClick={onClose}
            variant="outline"
          >
            Đóng
          </Button>
        </div>

        {/* Popup / Overlay Xác nhận chuyển bàn */}
        {pendingTargetTable && (
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs z-20 flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => !isSubmitting && setPendingTargetTable(null)}
          >
            <div
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Popup Header */}
              <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Xác nhận chuyển bàn</h3>
                    <p className="text-xs text-blue-100">
                      Vui lòng kiểm tra kỹ thông tin trước khi xác nhận
                    </p>
                  </div>
                </div>
              </div>

              {/* Popup Body */}
              <div className="p-5 space-y-4">
                {/* Sơ đồ chuyển từ bàn nguồn -> bàn đích */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700">
                  <div className="text-center flex-1">
                    <span className="text-[11px] uppercase tracking-wider text-gray-500 block mb-1">
                      Bàn nguồn
                    </span>
                    <span className="text-base font-bold text-gray-800 dark:text-white block">
                      {sourceTable['Tên bàn']}
                    </span>
                  </div>

                  <div className="px-3 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="text-center flex-1">
                    <span className="text-[11px] uppercase tracking-wider text-blue-600 font-semibold block mb-1">
                      Bàn đích
                    </span>
                    <span className="text-base font-bold text-blue-700 dark:text-blue-400 block">
                      {pendingTargetTable['Tên bàn']}
                    </span>
                  </div>
                </div>

                {/* Chi tiết đơn chuyển */}
                <div className="space-y-2 text-sm bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Số lượng món chuyển:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {totalQuantity} món ({cart.length} dòng)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Tổng tiền tạm tính:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-base">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                </div>

                {/* Ghi chú nếu bàn đích đang có đơn (Gộp bàn) hoặc bàn trống */}
                {isTargetOccupied ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-amber-950">
                        Lưu ý: {pendingTargetTable['Tên bàn']} đang có đơn ({pendingTargetQty} món - {formatCurrency(pendingTargetTotal)})
                      </p>
                      <p className="text-amber-800 leading-relaxed">
                        Khi xác nhận, toàn bộ món của <strong>{sourceTable['Tên bàn']}</strong> sẽ được <strong>gộp chung</strong> vào hóa đơn của <strong>{pendingTargetTable['Tên bàn']}</strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>{pendingTargetTable['Tên bàn']}</strong> hiện đang trống. Đơn hàng sẽ được chuyển nguyên vẹn sang bàn mới.
                    </span>
                  </div>
                )}
              </div>

              {/* Popup Actions */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t dark:border-gray-800 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => setPendingTargetTable(null)}
                  className="px-4"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmTransfer}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 shadow-md"
                >
                  {isSubmitting ? 'Đang chuyển...' : 'Xác nhận chuyển bàn'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface TransferTableCardProps {
  table: Table;
  existingItems: CartItem[];
  isSelected?: boolean;
  onSelect: () => void;
}

const TransferTableCard: React.FC<TransferTableCardProps> = ({
  table,
  existingItems,
  isSelected,
  onSelect,
}) => {
  const isOccupied = existingItems.length > 0;
  const itemCount = existingItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Card
      onClick={onSelect}
      className={`p-4 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] border-2 ${
        isSelected
          ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/40'
          : isOccupied
            ? 'bg-amber-50/70 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:bg-amber-100/70'
            : 'bg-green-50/70 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100/70'
      }`}
    >
      <div className="flex items-start justify-between mb-2.5">
        <h4 className="font-bold text-gray-800 dark:text-white text-base sm:text-lg">
          {table['Tên bàn']}
        </h4>
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center ${
            isOccupied
              ? 'bg-amber-100 text-amber-700'
              : 'bg-green-100 text-green-600'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
          <Users className="w-3.5 h-3.5 mr-1.5 opacity-75" />
          Sức chứa: {table['Sức chứa tối đa']} người
        </p>

        <p
          className={`text-xs font-semibold flex items-center ${
            isOccupied ? 'text-amber-700 dark:text-amber-400' : 'text-green-600 dark:text-green-400'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full mr-1.5 ${
              isOccupied ? 'bg-amber-500' : 'bg-green-500'
            }`}
          />
          {isOccupied ? `Đang có ${itemCount} món (Gộp bàn)` : 'Bàn trống'}
        </p>

        <div
          className={`pt-2 mt-2 border-t ${
            isOccupied ? 'border-amber-200/80' : 'border-green-200/80'
          }`}
        >
          <div
            className={`flex items-center text-xs font-semibold ${
              isOccupied ? 'text-amber-700' : 'text-green-700'
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5 mr-1" />
            {isOccupied ? 'Chọn để gộp bàn' : 'Chọn để chuyển bàn'}
          </div>
        </div>
      </div>
    </Card>
  );
};
