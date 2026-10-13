// utils/columns.tsx
'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Edit, Trash, Eye, Package, Beaker, Zap } from 'lucide-react';
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
import type { ProductMaterial } from '../types/productMaterial';
import { formatNumber } from '../utils/formatters';

interface GetColumnsProps {
  onEdit: (config: ProductMaterial) => void;
  onDelete: (config: ProductMaterial) => void;
  onView: (config: ProductMaterial) => void;
  isAdmin: boolean;
  isManager: boolean;
}

export const getColumns = ({
  onEdit,
  onDelete,
  onView,
  isAdmin,
  isManager
}: GetColumnsProps): ColumnDef<ProductMaterial>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllRowsSelected() ||
          (table.getIsSomeRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
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
    accessorKey: 'IDCauHinh',
    id: 'IDCauHinh',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Mã cấu hình
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-mono font-semibold text-purple-600">
        {row.getValue('IDCauHinh')}
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: 'Tên sản phẩm',
    id: 'Tên sản phẩm',
    header: 'Sản phẩm',
    cell: ({ row }) => {
      const config = row.original;
      return (
        <div className="flex items-center">
          <div className="w-8 h-8 mr-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Package className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{row.getValue('Tên sản phẩm')}</div>
            <div className="text-sm text-gray-500">{config.IDSP}</div>
          </div>
        </div>
      );
    },
    enableHiding: false,
  },
  {
    accessorKey: 'Tên nguyên liệu',
    id: 'Tên nguyên liệu',
    header: 'Nguyên vật liệu',
    cell: ({ row }) => {
      const config = row.original;
      const isSelfConfig = config.IDSP === config.IDNguyenLieu;
      
      return (
        <div className="flex items-center">
          <div className={`w-8 h-8 mr-3 rounded-lg flex items-center justify-center ${
            isSelfConfig 
              ? 'bg-gradient-to-br from-purple-500 to-pink-600' 
              : 'bg-gradient-to-br from-green-500 to-blue-600'
          }`}>
            {isSelfConfig ? (
              <Zap className="h-4 w-4 text-white" />
            ) : (
              <Beaker className="h-4 w-4 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{row.getValue('Tên nguyên liệu')}</div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              {config.IDNguyenLieu}
              {isSelfConfig && (
                <Badge variant="secondary" className="text-xs">Tự động</Badge>
              )}
            </div>
          </div>
        </div>
      );
    },
    enableHiding: false,
  },
  {
    accessorKey: 'Số lượng cần',
    id: 'Số lượng cần',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Số lượng cần
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const config = row.original;
      const isSelfConfig = config.IDSP === config.IDNguyenLieu;
      
      return (
        <div className="text-center">
          <div className={`font-semibold ${isSelfConfig ? 'text-purple-600' : 'text-blue-600'}`}>
            {formatNumber(row.getValue('Số lượng cần'))}
          </div>
          <div className="text-xs text-gray-500">
            {config['Đơn vị sử dụng']}
            {isSelfConfig && <span className="ml-1">(1:1)</span>}
          </div>
        </div>
      );
    },
    enableHiding: true,
  },
  {
    accessorKey: 'Số lượng quy đổi',
    id: 'Số lượng quy đổi',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Quy đổi
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const config = row.original;
      const isSelfConfig = config.IDSP === config.IDNguyenLieu;
      
      return (
        <div className="text-center">
          <div className={`font-semibold ${isSelfConfig ? 'text-purple-600' : 'text-orange-600'}`}>
            {formatNumber(row.getValue('Số lượng quy đổi'))}
          </div>
          <div className="text-xs text-gray-500">
            {config['Đơn vị gốc']}
          </div>
        </div>
      );
    },
    enableHiding: true,
  },
  {
    accessorKey: 'Loại cấu hình',
    id: 'Loại cấu hình',
    header: 'Loại',
    cell: ({ row }) => {
      const config = row.original;
      const isSelfConfig = config.IDSP === config.IDNguyenLieu;
      const configType = isSelfConfig ? 'Tự động' : 'Thông thường';
      
      return (
        <Badge
          variant={isSelfConfig ? 'default' : 'secondary'}
          className={isSelfConfig ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}
        >
          {configType}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      const config = row.original;
      const isSelfConfig = config.IDSP === config.IDNguyenLieu;
      const configType = isSelfConfig ? 'Tự động' : 'Thông thường';
      return Array.isArray(value) ? (value.length === 0 || value.includes(configType)) : true;
    },
    enableHiding: true,
  },
  {
    accessorKey: 'Trạng thái',
    id: 'Trạng thái',
    header: 'Trạng thái',
    cell: ({ row }) => {
      const status = row.getValue('Trạng thái') as string;
      return (
        <Badge
          variant={status === 'Hoạt động' ? 'default' : 'secondary'}
          className={status === 'Hoạt động' ? 'bg-green-100 text-green-800' : ''}
        >
          {status}
        </Badge>
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
      const config = row.original;
      const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
      const isSelfConfig = config.IDSP === config.IDNguyenLieu;

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
              <DropdownMenuLabel>
                Hành động
                {isSelfConfig && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Tự động
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onView(config)}>
                <Eye className="mr-2 h-4 w-4" />
                <span>Xem chi tiết</span>
              </DropdownMenuItem>
              {(isAdmin || isManager) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEdit(config)}>
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
                Bạn có chắc chắn muốn xóa cấu hình "{config['Tên sản phẩm']} - {config['Tên nguyên liệu']}"? 
                {isSelfConfig && " (Đây là cấu hình tự động)"} 
                Hành động này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDelete(config);
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