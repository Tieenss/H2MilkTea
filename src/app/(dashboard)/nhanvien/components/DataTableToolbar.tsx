'use client';

import { ChevronDown, X, UserPlus } from 'lucide-react';
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
import { EMPLOYEE_ROLES } from '../utils/constants';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  departments: string[];
  positions: string[];
  onAddNew: () => void;
  isAdmin: boolean;
  isManager: boolean;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
}

export function DataTableToolbar<TData>({ 
  table, 
  departments, 
  positions, 
  onAddNew, 
  isAdmin, 
  isManager,
  globalFilter,
  onGlobalFilterChange 
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter.length > 0;

  const departmentOptions = departments.map(dept => ({ label: dept, value: dept }));
  const positionOptions = positions.map(pos => ({ label: pos, value: pos }));

  const handleResetFilters = () => {
    table.resetColumnFilters();
    onGlobalFilterChange('');
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Tìm kiếm nhân viên..."
            value={globalFilter}
            onChange={(event) => onGlobalFilterChange(event.target.value)}
            className="h-8 w-[150px] lg:w-[250px]"
          />
          
          {table.getColumn('Phân quyền') && (
            <DataTableFacetedFilter
              column={table.getColumn('Phân quyền')}
              title="Phân quyền"
              options={EMPLOYEE_ROLES}
            />
          )}
          
          {table.getColumn('Phòng') && (
            <DataTableFacetedFilter
              column={table.getColumn('Phòng')}
              title="Phòng ban"
              options={departmentOptions}
            />
          )}
          
          {table.getColumn('Chức vụ') && (
            <DataTableFacetedFilter
              column={table.getColumn('Chức vụ')}
              title="Chức vụ"
              options={positionOptions}
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
          <Button
            onClick={onAddNew}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Thêm nhân viên</span>
            <span className="sm:hidden">Thêm</span>
          </Button>
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
                  'Họ và Tên': 'Họ và tên',
                  'username': 'Tài khoản',
                  'Chức vụ': 'Chức vụ',
                  'Phòng': 'Phòng ban',
                  'Phân quyền': 'Phân quyền',
                  'Số điện thoại': 'Liên hệ'
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