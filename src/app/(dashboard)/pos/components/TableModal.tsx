'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '../utils/formatters';
import type { Table, CartItem } from '../types/pos';
import type { TablePresenceSummary } from '@/hooks/useTablePresence';
import {
  detectTableArea,
  DEFAULT_AREAS,
  AREA_DISPLAY_ORDER,
  TABLE_SORT_OPTIONS,
  getAreaMeta,
  sortTables,
  groupTablesByArea,
  type TableSortMode
} from '@/app/(dashboard)/tables/utils/constants';

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
  const [selectedArea, setSelectedArea] = useState<string>('Tất cả');
  const [sortMode, setSortMode] = useState<TableSortMode>('name-asc');

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

  const isTableOccupied = useCallback((table: Table): boolean => {
    const items = getTableCart(table);
    return items.length > 0 || table['Trạng thái sử dụng'] === 'Đang sử dụng';
  }, [getTableCart]);

  // Danh sách bàn thuộc khu vực đang chọn (trước khi lọc theo trạng thái Có đơn / Bàn trống)
  const areaScopedTables = useMemo(() => {
    if (selectedArea === 'Tất cả') return tables;
    return tables.filter((t) => detectTableArea(t['Tên bàn'], t['Khu vực']) === selectedArea);
  }, [tables, selectedArea]);

  // Thống kê các bàn thực tế đang có đơn chưa thanh toán trong phạm vi khu vực đang xem
  const occupiedTables = useMemo(() => {
    return areaScopedTables.filter((t) => isTableOccupied(t));
  }, [areaScopedTables, isTableOccupied]);

  // TỔNG TIỀN TẠM TÍNH CHUẨN XÁC: Cộng dồn tổng tiền của các bàn đang có đơn
  const totalUnpaidAmount = useMemo(() => {
    return occupiedTables.reduce((sum, table) => {
      const items = getTableCart(table);
      return sum + calculateTotal(items);
    }, 0);
  }, [occupiedTables, getTableCart]);

  const emptyTablesCount = Math.max(0, areaScopedTables.length - occupiedTables.length);

  // Lọc và sắp xếp danh sách bàn theo tab, khu vực, từ khóa tìm kiếm và chế độ sắp xếp
  const filteredTables = useMemo(() => {
    const filtered = areaScopedTables.filter((t) => {
      const hasOrder = isTableOccupied(t);

      if (filterMode === 'occupied' && !hasOrder) return false;
      if (filterMode === 'empty' && hasOrder) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const name = (t['Tên bàn'] || '').toLowerCase();
        const id = (t.IDBAN || '').toLowerCase();
        const area = detectTableArea(t['Tên bàn'], t['Khu vực']).toLowerCase();
        return name.includes(query) || id.includes(query) || area.includes(query);
      }

      return true;
    });

    return sortTables(filtered, sortMode, isTableOccupied);
  }, [areaScopedTables, isTableOccupied, filterMode, searchQuery, sortMode]);

  // Chia nhóm theo Khu vực khi chọn "Tất cả"
  const areaGroups = useMemo(() => {
    return groupTablesByArea(filteredTables, sortMode, isTableOccupied, false);
  }, [filteredTables, sortMode, isTableOccupied]);

  // Danh sách các khu vực tiêu chuẩn hiện có 0 bàn để hiển thị dòng chú thích gọn
  const emptyAreaNames = useMemo(() => {
    if (selectedArea !== 'Tất cả') return [];
    const populatedSet = new Set(areaGroups.map((g) => g.area));
    return AREA_DISPLAY_ORDER.filter((area) => !populatedSet.has(area));
  }, [selectedArea, areaGroups]);

  const canTransfer = selectedTableId && activeOrders.has(selectedTableId) && 
    activeOrders.get(selectedTableId)!.length > 0;

  const selectedTable = tables.find(t => t.IDBAN === selectedTableId);
  const canTransferFromTable = selectedTable && selectedTable['Tên bàn'] !== 'Khách mua về';

  const renderTableGrid = (tableList: Table[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {tableList.map((table) => {
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
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              Sơ đồ bàn phục vụ
              {selectedTable && (
                <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800">
                  Đang chọn: {selectedTable['Tên bàn']}
                </Badge>
              )}
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
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

        {/* Thanh lọc theo Khu vực (Tất cả, Phòng hát, Quầy, Vườn, Mang về) */}
        <div className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap mr-1">Khu vực:</span>
          {DEFAULT_AREAS.map((area) => {
            const isSelected = selectedArea === area;
            const count = area === 'Tất cả'
              ? tables.length
              : tables.filter(t => detectTableArea(t['Tên bàn'], t['Khu vực']) === area).length;
            const meta = area !== 'Tất cả' ? getAreaMeta(area) : null;
            return (
              <button
                key={area}
                type="button"
                onClick={() => setSelectedArea(area)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {meta && <span className="text-xs leading-none">{meta.emoji}</span>}
                <span>{area}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${isSelected ? 'bg-white/20 text-white' : 'bg-white/80 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Thanh lọc Trạng thái + Sắp xếp A-Z + Tìm kiếm */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-slate-800 text-white shadow-sm dark:bg-indigo-600'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100'
              }`}
            >
              Tất cả ({areaScopedTables.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('occupied')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                filterMode === 'occupied'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 hover:bg-amber-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Đang có đơn ({occupiedTables.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('empty')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                filterMode === 'empty'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50'
              }`}
            >
              Bàn trống ({emptyTablesCount})
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end flex-wrap">
            {occupiedTables.length > 0 && (
              <span className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded-md font-medium hidden lg:inline">
                Tạm tính chưa trả: <strong>{formatCurrency(totalUnpaidAmount)}</strong>
              </span>
            )}

            {/* Bộ chọn Sắp xếp A -> Z / Z -> A / Ưu tiên bàn có khách */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-2 py-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">Xếp:</span>
              <select
                aria-label="Chế độ sắp xếp bàn"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as TableSortMode)}
                className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none cursor-pointer"
              >
                {TABLE_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên bàn..."
              className="text-xs px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-32 sm:w-40 text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Tables Content: Chia nhóm theo Khu vực khi chọn "Tất cả", hoặc hiển thị 1 Khu vực cụ thể */}
        <div className="p-4 overflow-y-auto flex-1 space-y-5">
          {filteredTables.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-slate-500">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {selectedArea !== 'Tất cả'
                  ? `Khu vực "${selectedArea}" hiện chưa có bàn nào phù hợp.`
                  : 'Không có bàn nào phù hợp với bộ lọc hiện tại.'}
              </p>
              <div className="mt-3 flex items-center justify-center gap-3">
                {filterMode !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                  >
                    Xem tất cả trạng thái
                  </button>
                )}
                {selectedArea !== 'Tất cả' && (
                  <button
                    type="button"
                    onClick={() => setSelectedArea('Tất cả')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                  >
                    Quay về Tất cả khu vực
                  </button>
                )}
              </div>
            </div>
          ) : selectedArea === 'Tất cả' ? (
            <>
              <div className="space-y-6">
                {areaGroups.map((group) => {
                  const areaUnpaidTotal = group.tables.reduce((sum, t) => {
                    const items = getTableCart(t);
                    return sum + calculateTotal(items);
                  }, 0);

                  return (
                    <section
                      key={group.area}
                      className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-3.5"
                    >
                      {/* Area Section Header */}
                      <div className={`flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b ${group.meta.headerBorderClass}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{group.meta.emoji}</span>
                          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {group.meta.label}
                          </h3>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${group.meta.badgeClass}`}>
                            {group.tables.length} bàn
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          {group.occupiedCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>{group.occupiedCount} đang có khách</span>
                              {areaUnpaidTotal > 0 && (
                                <span className="font-bold text-amber-900 dark:text-amber-200">
                                  · {formatCurrency(areaUnpaidTotal)}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                              ✓ Tất cả bàn trống
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Sorted Table Grid inside this Area */}
                      {renderTableGrid(group.tables)}
                    </section>
                  );
                })}
              </div>

              {emptyAreaNames.length > 0 && !searchQuery.trim() && filterMode === 'all' && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 flex items-center justify-between flex-wrap gap-2">
                  <span>
                    Đang ẩn gọn khu vực chưa có bàn:{' '}
                    <strong className="text-slate-700 dark:text-slate-300">
                      {emptyAreaNames.map((a) => `${a} (0)`).join(', ')}
                    </strong>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    (Có thể thêm bàn mới vào các khu vực này tại mục Quản lý bàn)
                  </span>
                </div>
              )}
            </>
          ) : (
            <section className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-3.5">
              <div className={`flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b ${getAreaMeta(selectedArea).headerBorderClass}`}>
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{getAreaMeta(selectedArea).emoji}</span>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {getAreaMeta(selectedArea).label}
                  </h3>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getAreaMeta(selectedArea).badgeClass}`}>
                    {filteredTables.length} bàn
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sắp xếp: <strong>{TABLE_SORT_OPTIONS.find((o) => o.value === sortMode)?.label}</strong>
                </span>
              </div>

              {renderTableGrid(filteredTables)}
            </section>
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
  // Kiểm tra cả hasOrder lẫn Trạng thái sử dụng
  const isOccupied = hasOrder || table['Trạng thái sử dụng'] === 'Đang sử dụng';
  const areaName = detectTableArea(table['Tên bàn'], table['Khu vực']);

  const getTableStatusClass = () => {
    if (isTakeaway) {
      return "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-slate-100";
    }
    if (isOccupied) {
      return "bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 hover:bg-amber-100/90";
    }
    return "bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100/80";
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
          <h3 className="font-bold text-gray-800 dark:text-slate-100 text-sm line-clamp-2 break-words leading-tight">
            {table['Tên bàn']}
          </h3>
          {getStatusIcon()}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1 text-[11px] text-gray-500 dark:text-slate-400">
            <span>Sức chứa: {table['Sức chứa tối đa'] || '4'} khách</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-medium">
              {areaName}
            </span>
          </div>

          {!isTakeaway && (
            <p className={`text-xs font-semibold ${isOccupied ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {isOccupied ? `Đang có khách (${itemCount} món)` : 'Bàn trống'}
            </p>
          )}

          {hasOrder && (
            <div className="pt-1">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                {formatCurrency(orderTotal)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Realtime Presence Badges: Ai đang xem bàn */}
      <div className="mt-2 pt-1.5 border-t border-black/5 dark:border-white/5 space-y-1">
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
          <div className="flex items-center text-blue-600 dark:text-blue-400 text-[11px] font-bold">
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
  <div className="flex flex-wrap gap-4 justify-center pt-3 border-t border-gray-200 dark:border-slate-800 text-xs">
    <div className="flex items-center">
      <div className="w-3 h-3 bg-emerald-100 rounded mr-1.5 border border-emerald-300"></div>
      <span className="text-gray-700 dark:text-slate-300">Bàn trống</span>
    </div>
    <div className="flex items-center">
      <div className="w-3 h-3 bg-amber-100 rounded mr-1.5 border border-amber-300"></div>
      <span className="text-gray-700 dark:text-slate-300">Đang có khách / Có đơn</span>
    </div>
    <div className="flex items-center">
      <div className="w-3 h-3 bg-slate-100 rounded mr-1.5 border border-slate-300"></div>
      <span className="text-gray-700 dark:text-slate-300">Khách mua về</span>
    </div>
    <div className="flex items-center">
      <span className="mr-1">🖥️</span>
      <span className="text-indigo-700 dark:text-indigo-400 font-medium">Thu ngân đang mở</span>
    </div>
    <div className="flex items-center">
      <span className="mr-1">📱</span>
      <span className="text-amber-800 dark:text-amber-400 font-medium">Khách quét QR đang xem</span>
    </div>
    <div className="flex items-center">
      <div className="w-3 h-3 bg-blue-100 rounded mr-1.5 border-2 border-blue-600"></div>
      <span className="text-blue-700 dark:text-blue-400 font-bold">Đang chọn</span>
    </div>
  </div>
);
