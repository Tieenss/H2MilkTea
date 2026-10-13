// components/DataTableToolbar.tsx
'use client';

import { ChevronDown, X, Plus, Package, Filter } from 'lucide-react';
import type { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTableFacetedFilter } from '@/components/ui/DataTableFacetedFilter';
import { Badge } from '@/components/ui/badge';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  products: { label: string; value: string }[];
  onAddNew: () => void;
  selectedProduct: string;
  onProductChange: (productId: string) => void;
  isAdmin: boolean;
  isManager: boolean;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
}

export function DataTableToolbar<TData>({ 
  table, 
  products,
  onAddNew, 
  selectedProduct,
  onProductChange,
  isAdmin, 
  isManager,
  globalFilter,
  onGlobalFilterChange 
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter.length > 0 || selectedProduct !== '';

  const handleResetFilters = () => {
    table.resetColumnFilters();
    onGlobalFilterChange('');
    onProductChange('');
  };

  const statusOptions = [
    { label: 'Hoạt động', value: 'Hoạt động' },
    { label: 'Tạm ngừng', value: 'Tạm ngừng' }
  ];

  const configTypeOptions = [
    { label: 'Thông thường', value: 'Thông thường' },
    { label: 'Tự động (1:1)', value: 'Tự động' }
  ];

  // Count active filters
  const activeFiltersCount = table.getState().columnFilters.length + 
    (globalFilter.length > 0 ? 1 : 0) + 
    (selectedProduct !== '' ? 1 : 0);

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <Input
            placeholder="Tìm kiếm cấu hình..."
            value={globalFilter}
            onChange={(event) => onGlobalFilterChange(event.target.value)}
            className="h-8 w-[150px] lg:w-[250px]"
          />

          {/* Product Filter */}
       <Select value={selectedProduct || "ALL"} onValueChange={onProductChange}>
  <SelectTrigger className="h-8 w-[180px]">
    <div className="flex items-center gap-2">
      <Package className="h-4 w-4 text-blue-500" />
      <SelectValue placeholder="Chọn sản phẩm" />
    </div>
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="ALL">Tất cả sản phẩm</SelectItem>  
    {products.map((product) => (
      <SelectItem key={product.value} value={product.value}>
        {product.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
          
          {/* Status Filter */}
          {table.getColumn('Trạng thái') && (
            <DataTableFacetedFilter
              column={table.getColumn('Trạng thái')}
              title="Trạng thái"
              options={statusOptions}
            />
          )}

          {/* Config Type Filter */}
          {table.getColumn('Loại cấu hình') && (
            <DataTableFacetedFilter
              column={table.getColumn('Loại cấu hình')}
              title="Loại cấu hình"
              options={configTypeOptions}
            />
          )}
          
          {/* Clear Filters */}
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={handleResetFilters}
              className="h-8 px-2 lg:px-3"
            >
              Xóa bộ lọc
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Add New Button */}
        {(isAdmin || isManager) && (
          <Button
            onClick={onAddNew}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Thêm cấu hình</span>
            <span className="sm:hidden">Thêm</span>
          </Button>
        )}
        
        {/* Column Visibility */}
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
                  'IDCauHinh': 'Mã cấu hình',
                  'Tên sản phẩm': 'Sản phẩm',
                  'Tên nguyên liệu': 'Nguyên vật liệu',
                  'Số lượng cần': 'SL cần',
                  'Số lượng quy đổi': 'SL quy đổi',
                  'Trạng thái': 'Trạng thái',
                  'Loại cấu hình': 'Loại cấu hình'
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