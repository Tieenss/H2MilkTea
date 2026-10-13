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
import type { Material } from '../types/material';

import { formatNumber } from '../utils/formatters';

interface GetColumnsProps {
  onEdit: (material: Material) => void;
  onDelete: (material: Material) => void;
  onCopy: (material: Material) => void;
  onView: (material: Material) => void;
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
}: GetColumnsProps): ColumnDef<Material>[] => [
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
      accessorKey: 'IDNguyenLieu',
      id: 'IDNguyenLieu',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Mã NVL
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-mono font-semibold text-blue-600">
          {row.getValue('IDNguyenLieu')}
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'Tên nguyên liệu',
      id: 'Tên nguyên liệu',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Tên nguyên liệu
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const material = row.original;
        return (
          <div className="flex items-center">
            <div className="w-10 h-10 mr-3 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-medium truncate">{row.getValue('Tên nguyên liệu')}</div>
              <div className="text-sm text-gray-500">
                Mã: {material.IDNguyenLieu}
              </div>
            </div>
          </div>
        );
      },
      enableHiding: false,
    },
    {
      accessorKey: 'Đơn vị tính',
      id: 'Đơn vị tính',
      header: 'Đơn vị tính',
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue('Đơn vị tính') || 'Kg'}</Badge>
      ),
      filterFn: (row, id, value) => {
        const cellValue = row.getValue(id);
        return Array.isArray(value) ? (value.length === 0 || value.includes(cellValue)) : true;
      },
      enableHiding: true,
    },
    {
      accessorKey: 'Số lượng cảnh báo',
      id: 'Số lượng cảnh báo',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          SL Cảnh báo
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium text-orange-600">
          {formatNumber(row.getValue('Số lượng cảnh báo'))} {row.original['Đơn vị tính']}
        </div>
      ),
      enableHiding: true,
    },
    {
  accessorKey: 'Đơn vị cơ sở',
  id: 'Đơn vị cơ sở',
  header: 'Đơn vị cơ sở',
  cell: ({ row }) => (
    <Badge variant="secondary">{row.getValue('Đơn vị cơ sở') || 'Gram'}</Badge>
  ),
  enableHiding: true,
},
{
  accessorKey: 'Hệ số quy đổi',
  id: 'Hệ số quy đổi',
  header: ({ column }) => (
    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
      Hệ số QĐ
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  ),
  cell: ({ row }) => {
    const ratio = row.getValue('Hệ số quy đổi') as number;
    const unit = row.original['Đơn vị tính'];
    const baseUnit = row.original['Đơn vị cơ sở'];
    return (
      <div className="text-center">
        <div className="font-medium text-blue-600">{formatNumber(ratio)}</div>
        <div className="text-xs text-gray-500">
          1 {unit} = {formatNumber(ratio)} {baseUnit}
        </div>
      </div>
    );
  },
  enableHiding: true,
},
    {
      accessorKey: 'Ghi chú',
      id: 'Ghi chú',
      header: 'Ghi chú',
      cell: ({ row }) => {
        const note = row.getValue('Ghi chú') as string;
        return (
          <div className="max-w-xs truncate text-sm text-gray-600">
            {note || 'Không có ghi chú'}
          </div>
        );
      },
      enableHiding: true,
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const material = row.original;
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
                <DropdownMenuItem onClick={() => onView(material)}>
                  <Eye className="mr-2 h-4 w-4" />
                  <span>Xem chi tiết</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCopy(material)}>
                  <Copy className="mr-2 h-4 w-4" />
                  <span>Sao chép</span>
                </DropdownMenuItem>
                {(isAdmin || isManager) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit(material)}>
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
                  Bạn có chắc chắn muốn xóa nguyên vật liệu "{material['Tên nguyên liệu']}"? Hành động này không thể hoàn tác.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onDelete(material);
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