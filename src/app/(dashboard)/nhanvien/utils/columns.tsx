'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Edit, Trash, Mail, Phone, MapPin, User, Briefcase } from 'lucide-react';
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
import type { Employee } from '../types/employee';
import { EMPLOYEE_ROLES } from './constants';

interface GetColumnsProps {
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  isAdmin: boolean;
  isManager: boolean;
}

export const getColumns = ({ onEdit, onDelete, isAdmin, isManager }: GetColumnsProps): ColumnDef<Employee>[] => [
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
    accessorKey: 'Họ và Tên',
    id: 'Họ và Tên',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Họ và tên
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const employee = row.original;
      return (
        <div className="flex items-center">
          <Avatar className="h-10 w-10 mr-3">
            <AvatarImage
              src={employee['Image'] || ''}
              alt={employee['Họ và Tên']}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
              {employee['Họ và Tên']?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{row.getValue('Họ và Tên')}</div>
            <div className="text-sm text-gray-500 flex items-center">
              <Mail className="w-3 h-3 mr-1" />
              {employee['Email'] || 'Chưa cập nhật'}
            </div>
          </div>
        </div>
      );
    },
    enableHiding: false,
  },
  {
    accessorKey: 'username',
    id: 'username',
    header: 'Tài khoản',
    cell: ({ row }) => (
      <div className="flex items-center">
        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mr-3">
          <User className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <div className="font-medium">{row.getValue('username')}</div>
          <div className="text-xs text-gray-500">Tài khoản đăng nhập</div>
        </div>
      </div>
    ),
    enableHiding: true,
  },
  {
    accessorKey: 'Chức vụ',
    id: 'Chức vụ',
    header: 'Chức vụ',
    cell: ({ row }) => {
      const employee = row.original;
      return (
        <div className="space-y-1">
          <div className="text-sm font-medium text-gray-900 flex items-center">
            <Briefcase className="w-3 h-3 mr-2 text-blue-600" />
            {employee['Chức vụ'] || 'Chưa cập nhật'}
          </div>
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
    accessorKey: 'Phòng',
    id: 'Phòng',
    header: 'Phòng ban',
    cell: ({ row }) => <Badge variant="secondary">{row.getValue('Phòng') || 'Chưa cập nhật'}</Badge>,
    filterFn: (row, id, value) => {
      const cellValue = row.getValue(id);
      return Array.isArray(value) ? (value.length === 0 || value.includes(cellValue)) : true;
    },
    enableHiding: true,
  },
  {
    accessorKey: 'Phân quyền',
    id: 'Phân quyền',
    header: 'Phân quyền',
    cell: ({ row }) => {
      const role = EMPLOYEE_ROLES.find((r) => r.value === row.getValue('Phân quyền'));
      if (!role) return null;
      return (
        <div className="flex w-[120px] items-center">
          {role.icon && (<role.icon className="mr-2 h-4 w-4 text-muted-foreground" />)}
          <Badge
            variant={
              role.value === 'Admin' ? 'destructive' :
                role.value === 'Giám đốc' ? 'default' : 'secondary'
            }
          >
            {role.label}
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
    accessorKey: 'Số điện thoại',
    id: 'Số điện thoại',
    header: 'Liên hệ',
    cell: ({ row }) => {
      const employee = row.original;
      return (
        <div className="space-y-1">
          <div className="text-sm text-gray-900 flex items-center">
            <Phone className="w-3 h-3 mr-2 text-green-600" />
            {employee['Số điện thoại'] || 'Chưa cập nhật'}
          </div>
          <div className="text-sm text-gray-500 flex items-center">
            <MapPin className="w-3 h-3 mr-2 text-blue-600" />
            <span className="truncate max-w-32">
              {employee['Địa chỉ'] || 'Chưa cập nhật'}
            </span>
          </div>
        </div>
      );
    },
    enableHiding: true,
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const employee = row.original;
      const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);

      if (!isAdmin && !isManager) return null;

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
              <DropdownMenuItem onClick={() => onEdit(employee)}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Chỉnh sửa</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  <Trash className="mr-2 h-4 w-4" />
                  <span>Xóa</span>
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn xóa nhân viên "{employee['Họ và Tên']}"? Hành động này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDelete(employee);
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