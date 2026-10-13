'use client';

import React, { useState } from 'react';
import { Users, Edit, Trash, MoreVertical, MapPin } from 'lucide-react';
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
import { TABLE_STATUS } from '../utils/constants';

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

  const statusInfo = TABLE_STATUS.find(s => s.value === table['Trạng thái']);
  const canEdit = isAdmin || isManager;

  const getCapacityColor = (capacity: number) => {
    if (capacity <= 2) return 'text-blue-600';
    if (capacity <= 6) return 'text-green-600';
    if (capacity <= 10) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">
                {table['Tên bàn']}
              </h3>
              <p className="text-sm text-gray-500 font-mono">
                {table.IDBAN}
              </p>
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
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEdit(table)}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Chỉnh sửa</span>
                  </DropdownMenuItem>
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
                    Bạn có chắc chắn muốn xóa bàn "{table['Tên bàn']}"? Hành động này không thể hoàn tác.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onDelete(table);
                      setIsAlertDialogOpen(false);
                    }}
                    className="bg-red-600 hover:bg-red-700"
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
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Sức chứa:</span>
          </div>
          <span className={`font-semibold ${getCapacityColor(table['Sức chứa tối đa'])}`}>
            {table['Sức chứa tối đa']} người
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Trạng thái:</span>
          <Badge 
            className={`${statusInfo?.color || 'bg-gray-100 text-gray-800'} flex items-center space-x-1`}
          >
            {statusInfo?.icon && (
              <statusInfo.icon className="h-3 w-3" />
            )}
            <span>{statusInfo?.label || table['Trạng thái']}</span>
          </Badge>
        </div>

        {/* Quick actions for non-admin users */}
        {!canEdit && (
          <div className="pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
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