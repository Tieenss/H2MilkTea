'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '../utils/formatters';
import type { Table, CartItem } from '../types/pos';

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
  const sourceTable = tables.find(t => t.IDBAN === selectedTableId);
  
  // Filter available tables for transfer
  const availableTables = tables.filter(table =>
    table.IDBAN !== selectedTableId && // Not current table
    table['Tên bàn'] !== 'Khách mua về' && // Not takeaway
    (!activeOrders.has(table.IDBAN) || // No active orders
      activeOrders.get(table.IDBAN)!.length === 0)
  );

  if (!sourceTable) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white  rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Chuyển bàn
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Chuyển đơn hàng từ <strong>{sourceTable['Tên bàn']}</strong> sang bàn khác
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
        <div className="p-6 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-800">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-3">
            Đơn hàng hiện tại
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Từ bàn</p>
                <p className="font-semibold text-gray-800 dark:text-white">{sourceTable['Tên bàn']}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tổng món</p>
                <p className="font-semibold text-gray-800 dark:text-white">{cart.length} món</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tổng tiền</p>
                <p className="font-semibold text-gray-800 dark:text-white">{formatCurrency(subtotal)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Available Tables */}
        <div className="p-6">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-4">
            Chọn bàn đích ({availableTables.length} bàn có sẵn)
          </h3>

          {availableTables.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                Không có bàn trống để chuyển
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                Tất cả các bàn khác đều đang có khách hoặc đã có đơn hàng
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {availableTables.map(table => (
                <TransferTableCard
                  key={table.IDBAN}
                  table={table}
                  onSelect={() => onTransfer(table.IDBAN)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <Button
            onClick={onClose}
            variant="outline"
          >
            Hủy
          </Button>
        </div>
      </div>
    </div>
  );
};

interface TransferTableCardProps {
  table: Table;
  onSelect: () => void;
}

const TransferTableCard: React.FC<TransferTableCardProps> = ({ table, onSelect }) => {
  return (
    <Card
      onClick={onSelect}
      className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 rounded-lg cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-all duration-200 hover:shadow-md hover:scale-105"
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-gray-800 dark:text-white text-lg">
          {table['Tên bàn']}
        </h4>
        <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Sức chứa: {table['Sức chứa tối đa']} người
        </p>

        <p className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {table['Trạng thái']}
        </p>

        <div className="pt-2 border-t border-green-200 dark:border-green-800">
          <div className="flex items-center text-green-600 dark:text-green-400 text-sm font-medium">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Nhấn để chuyển
          </div>
        </div>
      </div>
    </Card>
  );
};