'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '../utils/formatters';
import type { Table, CartItem } from '../types/pos';

interface TableModalProps {
  tables: Table[];
  activeOrders: Map<string, CartItem[]>;
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
  onClose: () => void;
  onShowTransfer: () => void;
}

export const TableModal: React.FC<TableModalProps> = ({
  tables,
  activeOrders,
  selectedTableId,
  onSelectTable,
  onClose,
  onShowTransfer
}) => {
  const calculateTotal = (items: CartItem[]): number => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const canTransfer = selectedTableId && activeOrders.has(selectedTableId) && 
    activeOrders.get(selectedTableId)!.length > 0;

  const selectedTable = tables.find(t => t.IDBAN === selectedTableId);
  const canTransferFromTable = selectedTable && selectedTable['Tên bàn'] !== 'Khách mua về';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">
            Chọn bàn: {selectedTable ? selectedTable['Tên bàn'] : 'Không xác định'}
          </h2>
          <div className="flex space-x-2">
            {canTransfer && canTransferFromTable && (
              <Button
                onClick={onShowTransfer}
                className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center space-x-1 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>Chuyển bàn</span>
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="outline"
              className="px-3 py-2 text-sm"
            >
              Đóng
            </Button>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-4">
            {tables.map((table) => {
              const hasOrder = activeOrders.has(table.IDBAN) &&
                activeOrders.get(table.IDBAN)!.length > 0;
              const isCurrentTable = selectedTableId === table.IDBAN;

              return (
                <TableCard
                  key={table.IDBAN}
                  table={table}
                  hasOrder={hasOrder}
                  isCurrentTable={isCurrentTable}
                  orderTotal={hasOrder ? calculateTotal(activeOrders.get(table.IDBAN)!) : 0}
                  onSelect={onSelectTable}
                />
              );
            })}
          </div>

          {/* Legend */}
          <TableLegend />
        </div>
      </div>
    </div>
  );
};

interface TableCardProps {
  table: Table;
  hasOrder: boolean;
  isCurrentTable: boolean;
  orderTotal: number;
  onSelect: (tableId: string) => void;
}

const TableCard: React.FC<TableCardProps> = ({
  table,
  hasOrder,
  isCurrentTable,
  orderTotal,
  onSelect
}) => {
  const getTableStatusClass = () => {
    if (table['Tên bàn'] === 'Khách mua về') {
      return "bg-gray-100 border-gray-200 hover:bg-gray-200";
    }
    
    if (hasOrder || table['Trạng thái'] === 'Đang sử dụng') {
      return "bg-yellow-100 border-yellow-200 hover:bg-yellow-200";
    }
    
    return "bg-green-100 border-green-200 hover:bg-green-200";
  };

  const getStatusIcon = () => {
    if (table['Tên bàn'] === 'Khách mua về') {
      return (
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      );
    }
    
    if (hasOrder || table['Trạng thái'] === 'Đang sử dụng') {
      return (
        <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    
    return (
      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  return (
    <Card
      onClick={() => onSelect(table.IDBAN)}
      className={`p-3 rounded-lg cursor-pointer border-2 transition-all duration-200 hover:shadow-md ${getTableStatusClass()} ${
        isCurrentTable ? 'ring-2 ring-blue-500 shadow-lg' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-gray-800 text-sm">
          {table['Tên bàn']}
        </h3>
        {getStatusIcon()}
      </div>

      <div className="space-y-1">
        <p className="text-xs text-gray-600 flex items-center">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          SC: {table['Sức chứa tối đa']}
        </p>

        {table['Tên bàn'] !== 'Khách mua về' && (
          <p className={`text-xs font-medium flex items-center ${
            hasOrder ? 'text-yellow-600' : 'text-gray-600'
          }`}>
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {table['Trạng thái']}
          </p>
        )}

        {hasOrder && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs font-medium text-blue-600 flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {formatCurrency(orderTotal)}
            </p>
          </div>
        )}

        {isCurrentTable && (
          <div className="mt-2 pt-2 border-t border-blue-200">
            <div className="flex items-center text-blue-600 text-xs font-medium">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M5 13l4 4L19 7" />
              </svg>
              Đang chọn
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

const TableLegend: React.FC = () => (
  <div className="flex flex-wrap gap-4 justify-center pt-3 border-t border-gray-200">
    <div className="flex items-center">
      <div className="w-3 h-3 bg-green-100 rounded mr-1 border border-green-200"></div>
      <span className="text-gray-700 text-xs">Bàn trống</span>
    </div>
    <div className="flex items-center">
      <div className="w-3 h-3 bg-yellow-100 rounded mr-1 border border-yellow-200"></div>
      <span className="text-gray-700 text-xs">Đang có khách</span>
    </div>
    <div className="flex items-center">
      <div className="w-3 h-3 bg-gray-100 rounded mr-1 border border-gray-200"></div>
      <span className="text-gray-700 text-xs">Mang về</span>
    </div>
    <div className="flex items-center">
      <div className="w-3 h-3 bg-blue-100 rounded mr-1 border-2 border-blue-500"></div>
      <span className="text-gray-700 text-xs">Đang chọn</span>
    </div>
  </div>
);