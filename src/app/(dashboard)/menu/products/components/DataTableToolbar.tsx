'use client';

import { ChevronDown, X, Plus, Upload, Download, Sparkles, CopyCheck } from 'lucide-react';
import type { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTableFacetedFilter } from './DataTableFacetedFilter';
import { PRODUCT_STATUS } from '../utils/constants';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  categories: string[];
  units: string[];
  onAddNew: () => void;
  onImportExcel: () => void;
  isAdmin: boolean;
  isManager: boolean;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  onOpenAIModal?: () => void;
  onOpenDuplicateChecker?: () => void;
  duplicateCount?: number;
}

export function DataTableToolbar<TData>({ 
  table, 
  categories, 
  units, 
  onAddNew, 
  onImportExcel,
  isAdmin, 
  isManager,
  globalFilter,
  onGlobalFilterChange,
  onOpenAIModal,
  onOpenDuplicateChecker,
  duplicateCount = 0
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter.length > 0;

  const categoryOptions = categories.map(cat => ({ label: cat, value: cat }));
  const unitOptions = units.map(unit => ({ label: unit, value: unit }));

  const handleResetFilters = () => {
    table.resetColumnFilters();
    onGlobalFilterChange('');
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-1 items-center space-x-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Tìm kiếm sản phẩm..."
            value={globalFilter}
            onChange={(event) => onGlobalFilterChange(event.target.value)}
            className="h-8 w-[150px] lg:w-[220px]"
          />
          
          {table.getColumn('Trạng thái') && (
            <DataTableFacetedFilter
              column={table.getColumn('Trạng thái')}
              title="Trạng thái"
              options={PRODUCT_STATUS}
            />
          )}
          
          {table.getColumn('Loại sản phẩm') && (
            <DataTableFacetedFilter
              column={table.getColumn('Loại sản phẩm')}
              title="Loại sản phẩm"
              options={categoryOptions}
            />
          )}
          
          {table.getColumn('Đơn vị tính') && (
            <DataTableFacetedFilter
              column={table.getColumn('Đơn vị tính')}
              title="Đơn vị"
              options={unitOptions}
            />
          )}
          
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={handleResetFilters}
              className="h-8 px-2 lg:px-3"
            >
              Xóa
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onOpenDuplicateChecker && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenDuplicateChecker}
            className="h-8 flex items-center gap-1.5 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold relative"
          >
            <CopyCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Kiểm tra trùng lặp</span>
            <span className="sm:hidden">Trùng lặp</span>
            {duplicateCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-black rounded-full bg-red-600 text-white animate-pulse">
                {duplicateCount}
              </span>
            )}
          </Button>
        )}

        {(isAdmin || isManager) && (
          <>
            {onOpenAIModal && (
              <Button
                type="button"
                onClick={onOpenAIModal}
                size="sm"
                className="h-8 flex items-center gap-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-sm font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                <span className="hidden sm:inline">Thêm bằng AI ✨</span>
                <span className="sm:hidden">AI ✨</span>
              </Button>
            )}

            <Button
              onClick={onImportExcel}
              size="sm"
              variant="outline"
              className="h-8 flex items-center gap-1"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import Excel</span>
              <span className="sm:hidden">Import</span>
            </Button>
            
            <Button
              onClick={onAddNew}
              size="sm"
              className="h-8 bg-blue-600 hover:bg-blue-700 flex items-center gap-1 text-white font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Thêm sản phẩm</span>
              <span className="sm:hidden">Thêm</span>
            </Button>
          </>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 hidden lg:flex">
              <ChevronDown className="mr-2 h-4 w-4" />
              Hiển thị
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[150px]">
            <DropdownMenuLabel>Bật/tắt cột</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                const headerText = {
                  'IDSP': 'Mã SP',
                  'Tên sản phẩm': 'Tên sản phẩm',
                  'Loại sản phẩm': 'Loại SP',
                  'Đơn vị tính': 'Đơn vị',
                  'Giá vốn': 'Giá vốn',
                  'Đơn giá': 'Đơn giá',
                  'Trạng thái': 'Trạng thái'
                }[column.id] || column.id;
                
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {headerText}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
