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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  onCancelInvoice: (invoiceId: string) => void;
  onDeleteInvoice: (invoiceId: string) => void;
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
      cell: ({ row }) => (
        <div className="font-medium text-blue-600 min-w-[120px]">
          {row.getValue('IDHOADON')}
        </div>
      ),
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
        <div className="min-w-[140px]">
          {formatInvoiceDate(row.getValue('Ngày'))}
        </div>
      ),
    },
    {
      accessorKey: 'IDBAN',
      header: 'Bàn',
      cell: ({ row }) => (
        <Badge variant="outline" className="min-w-[60px] justify-center">
          {row.getValue('IDBAN')}
        </Badge>
      ),
    },
    {
      accessorKey: 'Khách hàng',
      header: 'Khách hàng',
      cell: ({ row }) => (
        <div className="min-w-[120px]">
          {row.getValue('Khách hàng')}
        </div>
      ),
    },
    {
      accessorKey: 'Nhân viên',
      header: 'Nhân viên',
      cell: ({ row }) => (
        <div className="min-w-[120px]">
          {row.getValue('Nhân viên')}
        </div>
      ),
    },
    {
      id: 'totalAmount',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Tổng tiền
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const invoice = row.original;
        const total = Number(invoice['Tổng tiền']) + Number(invoice['VAT']) - Number(invoice['Giảm giá']);
        return (
          <div className="font-medium text-right min-w-[100px]">
            {formatCurrency(total)}
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const totalA = Number(rowA.original['Tổng tiền']) + Number(rowA.original['VAT']) - Number(rowA.original['Giảm giá']);
        const totalB = Number(rowB.original['Tổng tiền']) + Number(rowB.original['VAT']) - Number(rowB.original['Giảm giá']);
        return totalA - totalB;
      },
    },
    {
      accessorKey: 'Loại thanh toán',
      header: 'Thanh toán',
      cell: ({ row }) => (
        <Badge variant="secondary" className="min-w-[100px] justify-center">
          {row.getValue('Loại thanh toán')}
        </Badge>
      ),
    },
    {
      accessorKey: 'Trạng thái',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const status = row.getValue('Trạng thái') as string;
        return (
          <Badge className={`${getStatusColor(status)} min-w-[100px] justify-center`}>
            {status}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => {
        const invoice = row.original;
        const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

        return (
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
                    className="text-green-600"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Xác nhận thanh toán
                  </DropdownMenuItem>
                )}

                {/* Only Admin and Manager can cancel/delete */}
                {(isAdmin || isManager) && (
                  <>
                    <DropdownMenuSeparator />
                    
                    {invoice['Trạng thái'] !== 'Đã hủy' && invoice['Trạng thái'] !== 'Đã thanh toán' && (
                      <DropdownMenuItem 
                        onClick={() => onCancelInvoice(invoice.IDHOADON)}
                        className="text-orange-600"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Hủy hóa đơn
                      </DropdownMenuItem>
                    )}

                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem className="text-red-600">
                        <Trash className="mr-2 h-4 w-4" />
                        Xóa hóa đơn
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                <AlertDialogDescription>
                  Bạn có chắc chắn muốn xóa hóa đơn "{invoice.IDHOADON}"? 
                  Hành động này không thể hoàn tác và sẽ xóa cả chi tiết hóa đơn.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onDeleteInvoice(invoice.IDHOADON);
                    setIsDeleteDialogOpen(false);
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Xóa
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      },
      enableSorting: false,
    },
  ];

  const table = useReactTable({
    data: invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
    },
  });

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Tìm kiếm hóa đơn..."
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="text-sm text-muted-foreground">
          Hiển thị {table.getFilteredRowModel().rows.length} / {invoices.length} hóa đơn
        </div>
      </div>

      {/* Scrollable Table */}
      <div className="border rounded-md">
        <div className="relative max-h-[600px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="bg-muted/50 border-r last:border-r-0">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
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
                      <TableCell key={cell.id} className="border-r last:border-r-0">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    Không có dữ liệu.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Selected Info */}
      {Object.keys(rowSelection).length > 0 && (
        <div className="text-sm text-muted-foreground">
          Đã chọn {Object.keys(rowSelection).length} hóa đơn.
        </div>
      )}
    </div>
  );
};