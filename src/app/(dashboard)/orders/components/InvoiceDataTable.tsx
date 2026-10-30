// components/InvoiceDataTable.tsx
'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Eye, Printer, CheckCircle, XCircle, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatInvoiceDate, getStatusColor } from '../utils/invoiceFormatters';
import type { Invoice } from '../types/invoice';

interface InvoiceDataTableProps {
  invoices: Invoice[];
  onViewDetails: (invoice: Invoice) => void;
  onPrintInvoice: (invoice: Invoice) => void;
  onConfirmPayment: (invoiceId: string) => void;
  onCancelInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
  isAdmin: boolean;
  isManager: boolean;
}

export const InvoiceDataTable: React.FC<InvoiceDataTableProps> = ({
  invoices,
  onViewDetails,
  onPrintInvoice,
  onConfirmPayment,
  onCancelInvoice,
  onDeleteInvoice,
  isAdmin,
  isManager
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState('');

  const columns: ColumnDef<Invoice>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'IDHOADON',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Mã hóa đơn
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-semibold text-slate-900">{row.getValue('IDHOADON')}</span>,
    },
    {
      accessorKey: 'Ngày',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Ngày tạo
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{formatInvoiceDate(row.getValue('Ngày'))}</span>
      ),
    },
    {
      accessorKey: 'IDBAN',
      header: () => <span className="whitespace-nowrap">Bàn</span>,
      cell: ({ row }) => {
        const val = row.getValue('IDBAN');
        return (
          <span className="font-medium text-slate-700 whitespace-nowrap">
            {val ? String(val) : 'Khách mua về'}
          </span>
        );
      },
    },
    {
      accessorKey: 'Khách hàng',
      header: () => <span className="whitespace-nowrap">Khách hàng</span>,
      cell: ({ row }) => {
        const val = row.getValue('Khách hàng');
        return <span className="whitespace-nowrap">{val ? String(val) : 'Khách lẻ'}</span>;
      },
    },
    {
      accessorKey: 'Nhân viên',
      header: () => <span className="whitespace-nowrap">Nhân viên</span>,
      cell: ({ row }) => {
        const val = row.getValue('Nhân viên');
        return <span className="whitespace-nowrap">{val ? String(val) : 'Thu ngân'}</span>;
      },
    },
    {
      accessorKey: 'Tổng tiền',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Tổng tiền
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const total = Number(row.getValue('Tổng tiền')) || 0;
        const vat = Number(row.original['VAT']) || 0;
        const discount = Number(row.original['Giảm giá']) || 0;
        const netTotal = Math.max(0, total + vat - discount);
        return (
          <span className="font-bold text-slate-900 whitespace-nowrap">
            {formatCurrency(netTotal)}
          </span>
        );
      },
    },
    {
      accessorKey: 'Loại thanh toán',
      header: () => <span className="whitespace-nowrap">Loại thanh toán</span>,
      cell: ({ row }) => (
        <Badge variant="secondary" className="min-w-[100px] justify-center">
          {row.getValue('Loại thanh toán')}
        </Badge>
      ),
    },
    {
      accessorKey: 'Trạng thái',
      header: () => <span className="whitespace-nowrap">Trạng thái</span>,
      cell: ({ row }) => {
        const invoice = row.original;
        const status = row.getValue('Trạng thái') as string;
        const isCancelled = status === 'Đã hủy';
        const cancelNote = invoice['Ghi chú']?.startsWith('[ĐÃ HỦY]')
          ? invoice['Ghi chú'].replace('[ĐÃ HỦY]', '').trim()
          : (isCancelled ? invoice['Ghi chú'] : '');

        return (
          <div className="flex flex-col gap-0.5">
            <Badge className={`${getStatusColor(status)} min-w-[100px] justify-center`}>
              {status}
            </Badge>
            {isCancelled && cancelNote && (
              <span className="text-[10px] text-rose-600 max-w-[170px] truncate font-medium" title={cancelNote}>
                {cancelNote}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => <span className="whitespace-nowrap">Thao tác</span>,
      cell: ({ row }) => {
        const invoice = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Hành động</DropdownMenuLabel>
              
              <DropdownMenuItem onClick={() => onViewDetails(invoice)}>
                <Eye className="mr-2 h-4 w-4" />
                Xem chi tiết
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => onPrintInvoice(invoice)}>
                <Printer className="mr-2 h-4 w-4" />
                In hóa đơn
              </DropdownMenuItem>

              {/* Employee can only confirm payment */}
              {invoice['Trạng thái'] === 'Chờ xác nhận' && (
                <DropdownMenuItem 
                  onClick={() => onConfirmPayment(invoice.IDHOADON)}
                  className="text-green-600 cursor-pointer"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Xác nhận thanh toán
                </DropdownMenuItem>
              )}

              {/* Only Admin and Manager can cancel/delete with anti-loss audit modal */}
              {(isAdmin || isManager) && (
                <>
                  <DropdownMenuSeparator />
                  
                  {invoice['Trạng thái'] !== 'Đã hủy' && invoice['Trạng thái'] !== 'Đã thanh toán' && (
                    <DropdownMenuItem 
                      onClick={() => onCancelInvoice(invoice)}
                      className="text-orange-600 cursor-pointer"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Hủy hóa đơn (Kiểm toán)
                    </DropdownMenuItem>
                  )}

                  {invoice['Trạng thái'] !== 'Đã hủy' && (
                    <DropdownMenuItem
                      onClick={() => onDeleteInvoice(invoice)}
                      className="text-rose-600 cursor-pointer"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Xóa hóa đơn (Soft Delete)
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
    },
  ];

  const table = useReactTable({
    data: invoices,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Tìm kiếm theo mã, khách hàng, bàn..."
          value={globalFilter ?? ''}
          onChange={(event) => setGlobalFilter(String(event.target.value))}
          className="max-w-sm"
        />
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} trên{' '}
          {table.getFilteredRowModel().rows.length} hàng được chọn
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
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
                    <TableCell key={cell.id}>
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
                  className="h-24 text-center text-muted-foreground"
                >
                  Không có hóa đơn nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-xs text-muted-foreground">
          Trang {table.getState().pagination?.pageIndex ?? 0 + 1}
        </div>
      </div>
    </div>
  );
};
