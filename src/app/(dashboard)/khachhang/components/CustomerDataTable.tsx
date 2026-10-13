// components/CustomerDataTable.tsx
'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Eye, Edit, Trash, Phone, Mail, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { 
  formatCurrency, 
  formatCustomerDate, 
  getCustomerTypeColor, 
  getCustomerStatusColor,
  formatPoints,
  getTimeAgo
} from '../utils/customerFormatters';
import type { Customer } from '../types/customer';

interface CustomerDataTableProps {
  customers: Customer[];
  onViewDetails: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
  isAdmin: boolean;
  isManager: boolean;
}

export const CustomerDataTable: React.FC<CustomerDataTableProps> = ({
  customers,
  onViewDetails,
  onEditCustomer,
  onDeleteCustomer,
  isAdmin,
  isManager
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState('');

  const columns: ColumnDef<Customer>[] = [
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
      accessorKey: 'IDKHACHHANG',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Mã KH
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium text-blue-600 min-w-[80px]">
          {row.getValue('IDKHACHHANG')}
        </div>
      ),
    },
    {
      accessorKey: 'Tên khách hàng',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Khách hàng
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const name = row.getValue('Tên khách hàng') as string;
        const phone = row.original['Số điện thoại'];
        return (
          <div className="flex items-center space-x-3 min-w-[180px]">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {name?.charAt(0)?.toUpperCase() || 'K'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{name}</div>
              <div className="text-sm text-gray-500">{phone}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'Email',
      header: 'Email',
      cell: ({ row }) => (
        <div className="min-w-[160px] text-sm">
          {row.getValue('Email') || 'Chưa có'}
        </div>
      ),
    },
    {
      accessorKey: 'Loại khách hàng',
      header: 'Loại khách hàng',
      cell: ({ row }) => {
        const type = row.getValue('Loại khách hàng') as string;
        return (
          <Badge className={`${getCustomerTypeColor(type)} min-w-[120px] justify-center`}>
            {type}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'Điểm tích lũy',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Điểm tích lũy
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium min-w-[100px]">
          <span className="inline-flex items-center">
            <Gift className="w-4 h-4 mr-1 text-orange-500" />
            {formatPoints(row.getValue('Điểm tích lũy'))}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'Tổng chi tiêu',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Tổng chi tiêu
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium min-w-[120px]">
          {formatCurrency(row.getValue('Tổng chi tiêu'))}
        </div>
      ),
    },
    {
      accessorKey: 'Lần mua cuối',
      header: 'Lần mua cuối',
      cell: ({ row }) => {
        const lastPurchase = row.getValue('Lần mua cuối') as string;
        return (
          <div className="min-w-[100px]">
            {lastPurchase ? (
              <div>
                <div className="text-sm">{formatCustomerDate(lastPurchase)}</div>
                <div className="text-xs text-gray-500">{getTimeAgo(lastPurchase)}</div>
              </div>
            ) : (
              <span className="text-gray-400">Chưa mua</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'Trạng thái',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const status = row.getValue('Trạng thái') as string;
        return (
          <Badge className={`${getCustomerStatusColor(status)} min-w-[100px] justify-center`}>
            {status}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => {
        const customer = row.original;
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
                
                <DropdownMenuItem onClick={() => onViewDetails(customer)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Xem chi tiết
                </DropdownMenuItem>

                <DropdownMenuItem 
                  onClick={() => window.open(`tel:${customer['Số điện thoại']}`)}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Gọi điện
                </DropdownMenuItem>

                {customer['Email'] && (
                  <DropdownMenuItem 
                    onClick={() => window.open(`mailto:${customer['Email']}`)}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Gửi email
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={() => onEditCustomer(customer)}
                  className="text-blue-600"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Chỉnh sửa
                </DropdownMenuItem>

                {/* Only Admin and Manager can delete */}
                {(isAdmin || isManager) && (
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-red-600">
                      <Trash className="mr-2 h-4 w-4" />
                      Xóa khách hàng
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                <AlertDialogDescription>
                  Bạn có chắc chắn muốn xóa khách hàng "{customer['Tên khách hàng']}"? 
                  Hành động này không thể hoàn tác và sẽ xóa toàn bộ lịch sử giao dịch.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onDeleteCustomer(customer.IDKHACHHANG);
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
    data: customers,
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
          placeholder="Tìm kiếm khách hàng..."
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="text-sm text-muted-foreground">
          Hiển thị {table.getFilteredRowModel().rows.length} / {customers.length} khách hàng
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
          Đã chọn {Object.keys(rowSelection).length} khách hàng.
        </div>
      )}
    </div>
  );
};