// components/DataTable.tsx
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
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';

import { DataTableToolbar } from './DataTableToolbar';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  products: { label: string; value: string }[];
  onAddNew: () => void;
  selectedProduct: string;
  onProductChange: (productId: string) => void;
  isAdmin: boolean;
  isManager: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  products,
  onAddNew,
  selectedProduct,
  onProductChange,
  isAdmin,
  isManager,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState<string>('');

  // Load/save column visibility
  React.useEffect(() => {
    const savedVisibility = localStorage.getItem('product-material-table-visibility');
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
    localStorage.setItem('product-material-table-visibility', JSON.stringify(columnVisibility));
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
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    globalFilterFn: (row, columnId, value) => {
      const search = value.toLowerCase();
      const config = row.original as any;
      return (
        config.IDCauHinh?.toLowerCase().includes(search) ||
        config['Tên sản phẩm']?.toLowerCase().includes(search) ||
        config['Tên nguyên liệu']?.toLowerCase().includes(search) ||
        config.IDSP?.toLowerCase().includes(search) ||
        config.IDNguyenLieu?.toLowerCase().includes(search) ||
        config['Ghi chú']?.toLowerCase().includes(search)
      );
    },
  });

  return (
    <div className="w-full space-y-4">
      <DataTableToolbar
        table={table}
        products={products}
        onAddNew={onAddNew}
        selectedProduct={selectedProduct}
        onProductChange={onProductChange}
        isAdmin={isAdmin}
        isManager={isManager}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />

      {/* Scrollable table container */}
      <div className="rounded-md border">
        <div className="relative h-[600px] overflow-auto">
          <table className="min-w-full table-auto">
            <thead className="sticky top-0 z-20 bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th 
                      key={header.id}
                      className="whitespace-nowrap border-b-2 border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-900"
                      style={{
                        position: 'sticky',
                        top: 0,
                        backgroundColor: 'rgb(249 250 251)',
                        zIndex: 20,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td 
                        key={cell.id}
                        className="whitespace-nowrap border-b border-gray-100 px-4 py-3 text-sm text-gray-900"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="h-24 text-center px-4 py-3"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="text-gray-500">Không có kết quả.</div>
                      <div className="text-sm text-gray-400">
                        {selectedProduct ? 'Sản phẩm này chưa có cấu hình nguyên vật liệu' : 'Thử điều chỉnh bộ lọc hoặc tìm kiếm khác'}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary info */}
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 py-2">
        <div className="text-sm text-muted-foreground order-2 sm:order-1">
          <span className="hidden sm:inline">
            Hiển thị {table.getFilteredRowModel().rows.length} cấu hình
            {table.getFilteredSelectedRowModel().rows.length > 0 && (
              <> • {table.getFilteredSelectedRowModel().rows.length} đã chọn</>
            )}
          </span>
          <span className="sm:hidden">
            {table.getFilteredRowModel().rows.length} cấu hình
            {table.getFilteredSelectedRowModel().rows.length > 0 && (
              <> • {table.getFilteredSelectedRowModel().rows.length} chọn</>
            )}
          </span>
        </div>

        {/* Additional actions for selected rows */}
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <div className="flex items-center space-x-2 order-1 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Selected rows:', table.getFilteredSelectedRowModel().rows);
              }}
            >
              Thao tác hàng loạt ({table.getFilteredSelectedRowModel().rows.length})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.resetRowSelection()}
            >
              Bỏ chọn tất cả
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}