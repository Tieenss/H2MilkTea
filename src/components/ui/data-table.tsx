// components/ui/data-table.tsx
'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronDown, Search, Filter, RotateCcw } from 'lucide-react';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  enableColumnVisibility?: boolean;
  enableGlobalFilter?: boolean;
  onGlobalFilterChange?: (value: string) => void;
  globalFilter?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Tìm kiếm...",
  enableColumnVisibility = true,
  enableGlobalFilter = false,
  onGlobalFilterChange,
  globalFilter = ""
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [localGlobalFilter, setLocalGlobalFilter] = React.useState(globalFilter);

  // Load column visibility from localStorage
  React.useEffect(() => {
    const savedVisibility = localStorage.getItem('data-table-visibility');
    if (savedVisibility) {
      try {
        setColumnVisibility(JSON.parse(savedVisibility));
      } catch (error) {
        console.error('Error loading column visibility:', error);
      }
    }
  }, []);

  // Save column visibility to localStorage
  React.useEffect(() => {
    localStorage.setItem('data-table-visibility', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter: enableGlobalFilter ? localGlobalFilter : undefined,
    },
    onGlobalFilterChange: enableGlobalFilter ? setLocalGlobalFilter : undefined,
  });

  // Handle search input change
  const handleSearchChange = (value: string) => {
    if (enableGlobalFilter && onGlobalFilterChange) {
      setLocalGlobalFilter(value);
      onGlobalFilterChange(value);
    } else if (searchKey) {
      table.getColumn(searchKey)?.setFilterValue(value);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSorting([]);
    setColumnFilters([]);
    setLocalGlobalFilter("");
    if (enableGlobalFilter && onGlobalFilterChange) {
      onGlobalFilterChange("");
    }
    if (searchKey) {
      table.getColumn(searchKey)?.setFilterValue("");
    }
  };

  // Get current search value
  const currentSearchValue = enableGlobalFilter 
    ? localGlobalFilter 
    : (searchKey ? (table.getColumn(searchKey)?.getFilterValue() as string) : "") ?? "";

  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-1 flex-col sm:flex-row items-start sm:items-center gap-2">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={currentSearchValue}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="pl-8"
            />
          </div>

          {/* Reset Filters */}
          <Button
            variant="outline"
            onClick={resetFilters}
            className="h-8 px-2 lg:px-3"
            disabled={
              sorting.length === 0 && 
              columnFilters.length === 0 && 
              currentSearchValue === ""
            }
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Đặt lại
          </Button>
        </div>

        {/* Column Visibility */}
        {enableColumnVisibility && (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto h-8">
                  <Filter className="h-4 w-4 mr-2" />
                  Cột hiển thị
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Bật/tắt cột</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {getColumnDisplayName(column.id)}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead 
                      key={header.id}
                      className="whitespace-nowrap"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id}
                      className="whitespace-nowrap"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="text-muted-foreground">
                      <Search className="h-8 w-8" />
                    </div>
                    <div className="text-muted-foreground">
                      Không tìm thấy kết quả nào
                    </div>
                    {(currentSearchValue || columnFilters.length > 0) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetFilters}
                      >
                        Xóa bộ lọc
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination table={table} />
    </div>
  );
}

// Pagination Component
interface DataTablePaginationProps<TData> {
  table: any; // Replace with proper type from @tanstack/react-table
}

function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 py-4">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground order-2 sm:order-1">
        <span>
          {table.getFilteredSelectedRowModel().rows.length} trong{" "}
          {table.getFilteredRowModel().rows.length} dòng được chọn
        </span>
      </div>

      <div className="flex items-center space-x-6 lg:space-x-8 order-1 sm:order-2">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Số dòng mỗi trang</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-[120px] items-center justify-center text-sm font-medium">
          Trang {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Đến trang đầu</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m18.75 4.5-7.5 7.5 7.5 7.5m-6-15L5.25 12l7.5 7.5"
              />
            </svg>
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Trang trước</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Trang sau</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
              />
            </svg>
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Đến trang cuối</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5"
              />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper function to get column display name
function getColumnDisplayName(columnId: string): string {
  const columnNames: Record<string, string> = {
    'select': 'Chọn',
    'IDHOADON': 'Mã hóa đơn',
    'Ngày': 'Ngày tạo',
    'IDBAN': 'Bàn',
    'Khách hàng': 'Khách hàng',
    'Nhân viên': 'Nhân viên',
    'totalAmount': 'Tổng tiền',
    'Loại thanh toán': 'Thanh toán',
    'Trạng thái': 'Trạng thái',
    'actions': 'Hành động',
    // Employee table columns
    'Họ và Tên': 'Họ và tên',
    'username': 'Tài khoản',
    'Chức vụ': 'Chức vụ',
    'Phòng': 'Phòng ban',
    'Phân quyền': 'Phân quyền',
    'Số điện thoại': 'Liên hệ'
  };

  return columnNames[columnId] || columnId;
}

export { DataTablePagination };