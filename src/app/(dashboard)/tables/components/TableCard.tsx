'use client';

import React, { useState } from 'react';
import { Users, Edit, Trash, MoreVertical, MapPin, Coffee, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import type { Table } from '../types/table';
import { TABLE_STATUS, detectTableArea } from '../utils/constants';

interface TableCardProps {
  table: Table;
  onEdit: (table: Table) => void;
  onDelete: (table: Table) => void;
  isAdmin: boolean;
  isManager: boolean;
}

export const TableCard: React.FC<TableCardProps> = ({
  table,
  onEdit,
  onDelete,
  isAdmin,
  isManager
}) => {
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);

  const statusInfo = TABLE_STATUS.find(s => s.value === table['Trạng thái']) || {
    value: table['Trạng thái'] || 'Đang hoạt động',
    label: table['Trạng thái'] || 'Đang hoạt động',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
  };

  const area = detectTableArea(table['Tên bàn'], table['Khu vực']);
  const canEdit = isAdmin || isManager;

  const getCapacityColor = (capacity: number) => {
    if (capacity <= 2) return 'text-blue-600 dark:text-blue-400';
    if (capacity <= 6) return 'text-green-600 dark:text-green-400';
    if (capacity <= 10) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/50 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-slate-100">
                {table['Tên bàn']}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-gray-500 dark:text-slate-400 font-mono">
                  {table.IDBAN}
                </span>
                <span className="text-[11px] px-1.5 py-0.2 rounded font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
                  {area}
                </span>
              </div>
            </div>
          </div>
          
          {canEdit && (
            <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dark:bg-slate-900 dark:border-slate-800">
                  <DropdownMenuLabel className="dark:text-slate-200">Hành động</DropdownMenuLabel>
                  <DropdownMenuSeparator className="dark:border-slate-800" />
                  <DropdownMenuItem onClick={() => onEdit(table)} className="dark:focus:bg-slate-800">
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Chỉnh sửa</span>
                  </DropdownMenuItem>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50">
                      <Trash className="mr-2 h-4 w-4" />
                      <span>Xóa</span>
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <AlertDialogContent className="dark:bg-slate-900 dark:border-slate-800">
                <AlertDialogHeader>
                  <AlertDialogTitle className="dark:text-slate-100">Xác nhận xóa</AlertDialogTitle>
                  <AlertDialogDescription className="dark:text-slate-400">
                    Bạn có chắc chắn muốn xóa bàn "{table['Tên bàn']}"? Hành động này không thể hoàn tác.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="dark:border-slate-700 dark:text-slate-200">Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onDelete(table);
                      setIsAlertDialogOpen(false);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Xóa
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Capacity */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-500 dark:text-slate-400" />
            <span className="text-sm text-gray-600 dark:text-slate-300">Sức chứa:</span>
          </div>
          <span className={`font-semibold ${getCapacityColor(table['Sức chứa tối đa'])}`}>
            {table['Sức chứa tối đa']} người
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-slate-300">Trạng thái:</span>
          <Badge 
            className={`${statusInfo?.color || 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-200'} flex items-center space-x-1`}
          >
            {statusInfo?.icon && (
              <statusInfo.icon className="h-3 w-3" />
            )}
            <span>{statusInfo?.label || table['Trạng thái']}</span>
          </Badge>
        </div>

        {/* Quick actions for non-admin users */}
        {!canEdit && (
          <div className="pt-2 border-t dark:border-slate-800">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full dark:border-slate-700 dark:text-slate-200"
              onClick={() => onEdit(table)}
            >
              Xem chi tiết
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
