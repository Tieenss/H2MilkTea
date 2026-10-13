'use client';

import { ChevronDown, X, Plus, Upload } from 'lucide-react';
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
import { DataTableFacetedFilter } from '@/components/ui/DataTableFacetedFilter';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  units: string[];
  onAddNew: () => void;
  onImportExcel: () => void;
  isAdmin: boolean;
  isManager: boolean;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
}

export function DataTableToolbar<TData>({ 
  table, 
  units, 
  onAddNew, 
  onImportExcel,
  isAdmin, 
  isManager,
  globalFilter,
  onGlobalFilterChange 
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter.length > 0;

  const unitOptions = units.map(unit => ({ label: unit, value: unit }));

  const handleResetFilters = () => {
    table.resetColumnFilters();
    onGlobalFilterChange('');
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Tìm kiếm nguyên vật liệu..."
            value={globalFilter}
            onChange={(event) => onGlobalFilterChange(event.target.value)}
            className="h-8 w-[150px] lg:w-[250px]"
          />
          
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

      <div className="flex items-center space-x-2">
        {(isAdmin || isManager) && (
          <>
            <Button
              onClick={onImportExcel}
              size="sm"
              variant="outline"
              className="flex items-center gap-1"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import Excel</span>
              <span className="sm:hidden">Import</span>
            </Button>
            
            <Button
              onClick={onAddNew}
              size="sm"
              className="bg-green-600 hover:bg-green-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Thêm nguyên vật liệu</span>
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
                  'IDNguyenLieu': 'Mã NVL',
                  'Tên nguyên liệu': 'Tên NVL',
                  'Đơn vị tính': 'Đơn vị',
                  'Số lượng cảnh báo': 'SL Cảnh báo',
                  'Ghi chú': 'Ghi chú'
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