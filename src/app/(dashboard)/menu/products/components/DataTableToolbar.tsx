'use client';

import { ChevronDown, X, Plus, Upload, Download } from 'lucide-react';
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
  onGlobalFilterChange 
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter.length > 0;

  const categoryOptions = categories.map(cat => ({ label: cat, value: cat }));
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
            placeholder="Tìm kiếm sản phẩm..."
            value={globalFilter}
            onChange={(event) => onGlobalFilterChange(event.target.value)}
            className="h-8 w-[150px] lg:w-[250px]"
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
              className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1"
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