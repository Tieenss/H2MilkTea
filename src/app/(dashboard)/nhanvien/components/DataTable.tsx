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
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTableToolbar } from './DataTableToolbar';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  departments: string[];
  positions: string[];
  onAddNew: () => void;
  isAdmin: boolean;
  isManager: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  departments,
  positions,
  onAddNew,
  isAdmin,
  isManager,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    'Số điện thoại': false, // Ẩn mặc định trên mobile
  });
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState<string>('');

  // Load/save column visibility
  React.useEffect(() => {
    const savedVisibility = localStorage.getItem('employee-table-visibility');
    if (savedVisibility) {
      try {
        const parsed = JSON.parse(savedVisibility);
        setColumnVisibility(parsed);
      } catch (error) {
        console.error('Error loading column visibility:', error);
      }
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('employee-table-visibility', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    globalFilterFn: (row, columnId, value) => {
      const search = value.toLowerCase();
      const employee = row.original as any;
      return (
        employee['Họ và Tên']?.toLowerCase().includes(search) ||
        employee['username']?.toLowerCase().includes(search) ||
        employee['Email']?.toLowerCase().includes(search) ||
        employee['Chức vụ']?.toLowerCase().includes(search) ||
        employee['Phòng']?.toLowerCase().includes(search) ||
        employee['Số điện thoại']?.toLowerCase().includes(search) ||
        employee['Địa chỉ']?.toLowerCase().includes(search)
      );
    },
  });

  return (
    <div className="w-full space-y-4">
      <DataTableToolbar
        table={table}
        departments={departments}
        positions={positions}
        onAddNew={onAddNew}
        isAdmin={isAdmin}
        isManager={isManager}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />
      
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead 
                        key={header.id}
                        className="whitespace-nowrap bg-gray-50"
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
                    data-state={row.getIsSelected() && 'selected'}
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
                    Không có kết quả.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 py-4">
        <div className="text-sm text-muted-foreground order-2 sm:order-1">
          <span className="hidden sm:inline">
            {table.getFilteredSelectedRowModel().rows.length} của{' '}
            {table.getFilteredRowModel().rows.length} dòng được chọn.
          </span>
          <span className="sm:hidden">
            {table.getFilteredSelectedRowModel().rows.length}/{table.getFilteredRowModel().rows.length} được chọn
          </span>
        </div>
        
        <div className="flex items-center space-x-2 order-1 sm:order-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Trước
          </Button>
          
          <div className="flex items-center justify-center text-sm text-muted-foreground min-w-[100px]">
            Trang {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}