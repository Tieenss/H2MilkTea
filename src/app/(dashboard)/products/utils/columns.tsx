'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Edit, Trash, Copy, Package, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Product } from '../types/product';
import { PRODUCT_STATUS } from './constants';
import { formatCurrency } from './formatters';

interface GetColumnsProps {
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onCopy: (product: Product) => void;
  onView: (product: Product) => void;
  isAdmin: boolean;
  isManager: boolean;
}

export const getColumns = ({ 
  onEdit, 
  onDelete, 
  onCopy, 
  onView, 
  isAdmin, 
  isManager 
}: GetColumnsProps): ColumnDef<Product>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'IDSP',
    id: 'IDSP',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Mã SP
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-mono font-semibold text-blue-600">
        {row.getValue('IDSP')}
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: 'Tên sản phẩm',
    id: 'Tên sản phẩm',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Sản phẩm
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const product = row.original;
      return (
        <div className="flex items-center">
          <Avatar className="h-12 w-12 mr-3">
            <AvatarImage
              src={product['Hình ảnh'] || ''}
              alt={product['Tên sản phẩm']}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
              <Package className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-medium truncate">{row.getValue('Tên sản phẩm')}</div>
            <div className="text-sm text-gray-500">
              {product['Loại sản phẩm'] || 'Chưa phân loại'}
            </div>
          </div>
        </div>
      );
    },
    enableHiding: false,
  },
  {
    accessorKey: 'Loại sản phẩm',
    id: 'Loại sản phẩm',
    header: 'Loại sản phẩm',
    cell: ({ row }) => (
      <Badge variant="outline">{row.getValue('Loại sản phẩm') || 'Chưa phân loại'}</Badge>
    ),
    filterFn: (row, id, value) => {
      const cellValue = row.getValue(id);
      return Array.isArray(value) ? (value.length === 0 || value.includes(cellValue)) : true;
    },
    enableHiding: true,
  },
  {
    accessorKey: 'Đơn vị tính',
    id: 'Đơn vị tính',
    header: 'Đơn vị',
    cell: ({ row }) => (
      <span className="text-sm">{row.getValue('Đơn vị tính') || 'Cái'}</span>
    ),
    enableHiding: true,
  },
  {
    accessorKey: 'Giá vốn',
    id: 'Giá vốn',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Giá vốn
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium text-orange-600">
        {formatCurrency(row.getValue('Giá vốn'))}
      </div>
    ),
    enableHiding: true,
  },
  {
    accessorKey: 'Đơn giá',
    id: 'Đơn giá',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Đơn giá
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-semibold text-green-600">
        {formatCurrency(row.getValue('Đơn giá'))}
      </div>
    ),
    enableHiding: true,
  },
  {
    accessorKey: 'Trạng thái',
    id: 'Trạng thái',
    header: 'Trạng thái',
    cell: ({ row }) => {
      const status = PRODUCT_STATUS.find((s) => s.value === row.getValue('Trạng thái'));
      if (!status) return null;
      return (
        <div className="flex items-center">
          {status.icon && (<status.icon className="mr-2 h-4 w-4 text-muted-foreground" />)}
          <Badge
            variant={
              status.value === 'Hoạt động' ? 'default' :
                status.value === 'Hết hàng' ? 'destructive' : 'secondary'
            }
          >
            {status.label}
          </Badge>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      const cellValue = row.getValue(id);
      return Array.isArray(value) ? (value.length === 0 || value.includes(cellValue)) : true;
    },
    enableHiding: true,
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const product = row.original;
      const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);

      return (
        <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Hành động</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onView(product)}>
                <Eye className="mr-2 h-4 w-4" />
                <span>Xem chi tiết</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopy(product)}>
                <Copy className="mr-2 h-4 w-4" />
                <span>Sao chép</span>
              </DropdownMenuItem>
              {(isAdmin || isManager) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEdit(product)}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Chỉnh sửa</span>
                  </DropdownMenuItem>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">
                      <Trash className="mr-2 h-4 w-4" />
                      <span>Xóa</span>
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
                Bạn có chắc chắn muốn xóa sản phẩm "{product['Tên sản phẩm']}"? Hành động này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDelete(product);
                  setIsAlertDialogOpen(false);
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
  },
];