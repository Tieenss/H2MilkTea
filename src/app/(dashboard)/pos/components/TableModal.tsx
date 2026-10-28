'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '../utils/formatters';
import type { Table, CartItem } from '../types/pos';
import type { TablePresenceSummary } from '@/hooks/useTablePresence';

interface TableModalProps {
  tables: Table[];
  activeOrders: Map<string, CartItem[]>;
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
  onClose: () => void;
  onShowTransfer: () => void;
  presenceByTable?: Map<string, TablePresenceSummary>;
}

export const TableModal: React.FC<TableModalProps> = ({
  tables,
  activeOrders,
  selectedTableId,
  onSelectTable,
  onClose,
  onShowTransfer,
  presenceByTable,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'occupied' | 'empty'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const calculateTotal = (items: CartItem[]): number => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  // Helper lấy danh sách món giỏ hàng của bàn một cách nhất quán (khớp theo cả ID lẫn Tên bàn)
  const getTableCart = useCallback((table: Table): CartItem[] => {
    const byId = activeOrders.get(table.IDBAN);
    if (byId && byId.length > 0) return byId;
    const byName = activeOrders.get(table['Tên bàn']);
    if (byName && byName.length > 0) return byName;
    return [];
  }, [activeOrders]);

  // Thống kê các bàn thực tế đang có đơn chưa thanh toán (chỉ tính các bàn đang hiển thị trong quán)
  const occupiedTables = useMemo(() => {
    return tables.filter((t) => {
      const items = getTableCart(t);
      return items.length > 0 || t['Trạng thái sử dụng'] === 'Đang sử dụng';
    });
  }, [tables, getTableCart]);

  // TỔNG TIỀN TẠM TÍNH CHUẨN XÁC: Chỉ cộng dồn tổng tiền của các bàn đang hiển thị thực tế
  const totalUnpaidAmount = useMemo(() => {
    return occupiedTables.reduce((sum, table) => {
      const items = getTableCart(table);
      return sum + calculateTotal(items);
    }, 0);
  }, [occupiedTables, getTableCart]);

  const emptyTablesCount = Math.max(0, tables.length - occupiedTables.length);

  // Lọc danh sách bàn theo tab và tìm kiếm
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const items = getTableCart(t);
      const hasOrder = items.length > 0 || t['Trạng thái sử dụng'] === 'Đang sử dụng';

      if (filterMode === 'occupied' && !hasOrder) return false;
      if (filterMode === 'empty' && hasOrder) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const name = (t['Tên bàn'] || '').toLowerCase();
        const id = (t.IDBAN || '').toLowerCase();
        return name.includes(query) || id.includes(query);
      }

      return true;
    });
  }, [tables, getTableCart, filterMode, searchQuery]);

  const canTransfer = selectedTableId && activeOrders.has(selectedTableId) && 
    activeOrders.get(selectedTableId)!.length > 0;

  const selectedTable = tables.find(t => t.IDBAN === selectedTableId);
  const canTransferFromTable = selectedTable && selectedTable['Tên bàn'] !== 'Khách mua về';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              Sơ đồ bàn phục vụ
              {selectedTable && (
                <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-700 bg-indigo-50">
                  Đang chọn: {selectedTable['Tên bàn']}
                </Badge>
              )}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Chọn bàn để gọi món, xem giỏ hàng và theo dõi khách quét QR theo thời gian thực
            </p>
          </div>
          <div className="flex space-x-2">
            {canTransfer && canTransferFromTable && (
              <Button
                onClick={onShowTransfer}
                className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center space-x-1 text-sm shadow-sm"
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

        {/* Banner thống kê đơn chưa thanh toán & Bộ lọc bàn */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                filterMode === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Tất cả ({tables.length})
            </button>
            <button
              onClick={() => setFilterMode('occupied')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
                filterMode === 'occupied'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Đang có đơn ({occupiedTables.length})</span>
            </button>
            <button
              onClick={() => setFilterMode('empty')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                filterMode === 'empty'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              Bàn trống ({emptyTablesCount})
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            {occupiedTables.length > 0 && (
              <span className="text-[11px] text-amber-800 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded font-medium hidden md:inline">
                Tạm tính chưa trả: <strong>{formatCurrency(totalUnpaidAmount)}</strong>
              </span>
            )}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên bàn..."
              className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 w-32 sm:w-40"
            />
          </div>
        </div>

        {/* Tables Grid */}
        <div className="p-4 overflow-y-auto flex-1">
          {filteredTables.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <p className="text-sm">Không có bàn nào phù hợp với bộ lọc hiện tại.</p>
              {filterMode !== 'all' && (
                <button
                  onClick={() => setFilterMode('all')}
                  className="mt-2 text-xs text-purple-600 hover:underline font-medium"
                >
                  Xem tất cả bàn
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-4">
              {filteredTables.map((table) => {
                const tableItems = getTableCart(table);
                const hasOrder = tableItems.length > 0;
                const isCurrentTable = selectedTableId === table.IDBAN || selectedTableId === table['Tên bàn'];
                const presence = presenceByTable?.get(table.IDBAN);

                return (
                  <TableCard
                    key={table.IDBAN}
                    table={table}
                    hasOrder={hasOrder}
                    itemCount={tableItems.reduce((sum, it) => sum + it.quantity, 0)}
                    isCurrentTable={isCurrentTable}
                    orderTotal={hasOrder ? calculateTotal(tableItems) : 0}
                    presence={presence}
                    onSelect={onSelectTable}
                  />
                );
              })}
            </div>
          )}

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
  itemCount: number;
  isCurrentTable: boolean;
  orderTotal: number;
  presence?: TablePresenceSummary;
  onSelect: (tableId: string) => void;
}

const TableCard: React.FC<TableCardProps> = ({
  table,
  hasOrder,
  itemCount,
  isCurrentTable,
  orderTotal,
  presence,
  onSelect
}) => {
  const isTakeaway = table['Tên bàn'] === 'Khách mua về';
  // Sửa lỗi logic: kiểm tra cả hasOrder lẫn Trạng thái sử dụng (thay vì Trạng thái chung của bàn)
  const isOccupied = hasOrder || table['Trạng thái sử dụng'] === 'Đang sử dụng';

  const getTableStatusClass = () => {
    if (isTakeaway) {
      return "bg-slate-50 border-slate-200 hover:bg-slate-100";
    }
    if (isOccupied) {
      return "bg-amber-50/80 border-amber-300 hover:bg-amber-100/90";
    }
    return "bg-emerald-50/70 border-emerald-300 hover:bg-emerald-100/80";
  };

  const getStatusIcon = () => {
    if (isTakeaway) {
      return (
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      );
    }
    
    if (isOccupied) {
      return (
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" title="Đang có khách" />
      );
    }
    
    return (
      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Bàn trống" />
    );
  };

  const hasCashierViewing = presence?.cashiers && presence.cashiers.length > 0;
  const hasCustomerViewing = presence?.customerCount && presence.customerCount > 0;

  return (
    <Card
      onClick={() => onSelect(table.IDBAN)}
      className={`p-3 rounded-xl cursor-pointer border-2 transition-all duration-200 hover:shadow-md flex flex-col justify-between min-h-[140px] ${getTableStatusClass()} ${
        isCurrentTable ? 'ring-2 ring-blue-600 shadow-md border-blue-500' : ''
      }`}
    >
      <div>
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="font-bold text-gray-800 text-sm truncate">
            {table['Tên bàn']}
          </h3>
          {getStatusIcon()}
        </div>

        <div className="space-y-1">
          <p className="text-[11px] text-gray-500 flex items-center">
            Sức chứa: {table['Sức chứa tối đa'] || '4'} khách
          </p>

          {!isTakeaway && (
            <p className={`text-xs font-semibold ${isOccupied ? 'text-amber-700' : 'text-emerald-700'}`}>
              {isOccupied ? `Đang có khách (${itemCount} món)` : 'Bàn trống'}
            </p>
          )}

          {hasOrder && (
            <div className="pt-1">
              <span className="text-xs font-bold text-blue-700">
                {formatCurrency(orderTotal)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Realtime Presence Badges: Ai đang xem bàn */}
      <div className="mt-2 pt-1.5 border-t border-black/5 space-y-1">
        {hasCashierViewing && (
          <div className="flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-medium truncate" title={`Thu ngân ${presence.cashiers.join(', ')} đang mở giỏ hàng bàn này`}>
            <span>🖥️</span>
            <span className="truncate">{presence.cashiers.join(', ')} đang mở</span>
          </div>
        )}

        {hasCustomerViewing ? (
          <div className="flex items-center gap-1 text-[10px] text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded font-semibold animate-pulse truncate" title={`${presence.customerCount} khách đang quét QR xem menu và chọn món`}>
            <span>📱</span>
            <span className="truncate">
              {presence.customerCount} khách xem menu {presence.customerItemCount > 0 ? `(${presence.customerItemCount} món tạm)` : ''}
            </span>
          </div>
        ) : null}

        {isCurrentTable && (
          <div className="flex items-center text-blue-600 text-[11px] font-bold">
            <svg className="w-3.5 h-3.5 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
            Đang chọn
          </div>
        )}
      </div>
    </Card>
  );
};

const TableLegend: React.FC = () => (
  <div className="flex flex-wrap gap-4 justify-center pt-3 border-t border-gray-200 text-xs">
    <div className="flex items-center">
      <div className="w-3 h-3 bg-emerald-100 rounded mr-1.5 border border-emerald-300"></div>
      <span className="text-gray-700">Bàn trống</span>
    </div>
    <div className="flex items-center">
      <div className="w-3 h-3 bg-amber-100 rounded mr-1.5 border border-amber-300"></div>
      <span className="text-gray-700">Đang có khách / Có đơn</span>
    </div>
    <div className="flex items-center">
      <div className="w-3 h-3 bg-slate-100 rounded mr-1.5 border border-slate-300"></div>
      <span className="text-gray-700">Khách mua về</span>
    </div>
    <div className="flex items-center">
      <span className="mr-1">🖥️</span>
      <span className="text-indigo-700 font-medium">Thu ngân đang mở</span>
    </div>
    <div className="flex items-center">
      <span className="mr-1">📱</span>
      <span className="text-amber-800 font-medium">Khách quét QR đang xem</span>
    </div>
    <div className="flex items-center">
      <div className="w-3 h-3 bg-blue-100 rounded mr-1.5 border-2 border-blue-600"></div>
      <span className="text-blue-700 font-bold">Đang chọn</span>
    </div>
  </div>
);
