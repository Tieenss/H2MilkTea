'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Save, Loader2, X, MapPin, Users, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Table, TableFormData } from '../types/table';
import { TABLE_STATUS } from '../utils/constants';
import toast from 'react-hot-toast';

interface TableFormProps {
  table?: Table | null;
  formData: TableFormData;
  onFormDataChange: (data: TableFormData) => void;
  onSubmit: (data: TableFormData) => void;
  onCancel: () => void;
  isAdmin: boolean;
  isManager: boolean;
  generateTableId: () => string;
}

export const TableForm: React.FC<TableFormProps> = ({
  table,
  formData,
  onFormDataChange,
  onSubmit,
  onCancel,
  isAdmin,
  isManager,
  generateTableId
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = Boolean(table);

  // Auto-generate table ID for new tables
  useEffect(() => {
    if (!isEditMode && !formData.IDBAN) {
      const newId = generateTableId();
      updateFormData('IDBAN', newId);
    }
  }, [isEditMode, formData.IDBAN, generateTableId]);

  const updateFormData = useCallback((field: keyof TableFormData, value: string | number) => {
    onFormDataChange({ ...formData, [field]: value });
  }, [formData, onFormDataChange]);

  const validateTable = useCallback((table: TableFormData): string[] => {
    const errors: string[] = [];

    if (!table.IDBAN?.trim()) errors.push('Mã bàn không được để trống');
    if (!table['Tên bàn']?.trim()) errors.push('Tên bàn không được để trống');
    if (table['Sức chứa tối đa'] < 1) errors.push('Sức chứa phải lớn hơn 0');
    if (table['Sức chứa tối đa'] > 50) errors.push('Sức chứa không được quá 50 người');

    return errors;
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();

  if (isSubmitting || (!isAdmin && !isManager)) {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền thực hiện chức năng này!');
    }
    return;
  }

  try {
    setIsSubmitting(true);

    const errors = validateTable(formData);
    if (errors.length > 0) {
      toast.error(errors.join('\n'));
      return;
    }

    // Chỉ gọi onSubmit, không cần xử lý thêm
    onSubmit(formData);
  } catch (error) {
    console.error('Error in form submission:', error);
    toast.error('Có lỗi xảy ra khi xử lý form');
  } finally {
    setIsSubmitting(false);
  }
}, [isSubmitting, isAdmin, isManager, formData, validateTable, onSubmit]);
  return (
    <div className="flex flex-col h-full max-h-screen">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="tableId" className="text-sm font-medium text-gray-700">
                    Mã bàn <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="tableId"
                      className={`pl-10 h-10 font-mono ${isEditMode ? 'bg-gray-100' : ''}`}
                      value={formData.IDBAN || ''}
                      onChange={(e) => updateFormData('IDBAN', e.target.value)}
                      placeholder="Nhập mã bàn"
                      readOnly={isEditMode}
                      required
                    />
                  </div>
                  {isEditMode && (
                    <p className="text-xs text-gray-500 mt-1">
                      Mã bàn không thể thay đổi sau khi đã tạo.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tableName" className="text-sm font-medium text-gray-700">
                    Tên bàn <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="tableName"
                      className="pl-10 h-10"
                      value={formData['Tên bàn'] || ''}
                      onChange={(e) => updateFormData('Tên bàn', e.target.value)}
                      placeholder="Nhập tên bàn"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacity" className="text-sm font-medium text-gray-700">
                    Sức chứa tối đa <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      max="50"
                      className="pl-10 h-10"
                      value={formData['Sức chứa tối đa'] || ''}
                      onChange={(e) => updateFormData('Sức chứa tối đa', parseInt(e.target.value) || 0)}
                      placeholder="Số người"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Số lượng khách tối đa có thể ngồi tại bàn này
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                 <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Trạng thái <span className="text-red-500">*</span>
                  </Label>
                  <div className="space-y-3">
                    {TABLE_STATUS.map((status) => (
                      <Label 
                        key={status.value} 
                        className={cn(
                          "flex items-start space-x-3 cursor-pointer p-3 border rounded-lg transition-colors hover:bg-gray-50",
                          formData['Trạng thái'] === status.value && "border-blue-500 bg-blue-50"
                        )}
                      >
                        <input
                          type="radio"
                          name="status"
                          value={status.value}
                          checked={formData['Trạng thái'] === status.value}
                          onChange={(e) => updateFormData('Trạng thái', e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 mt-0.5"
                        />
                        <div className="flex items-start space-x-2 flex-1">
                          <status.icon className="h-4 w-4 text-gray-500 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-700">
                              {status.label}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {status.value === 'Đang hoạt động' && 'Bàn sẵn sàng phục vụ khách hàng'}
                              {status.value === 'Bảo trì' && 'Bàn đang được bảo trì hoặc sửa chữa'}
                            </div>
                          </div>
                        </div>
                      </Label>
                    ))}
                  </div>
                </div>
                {/* Capacity suggestions */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Gợi ý sức chứa
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[2, 4, 6, 8].map((capacity) => (
                      <Button
                        key={capacity}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateFormData('Sức chứa tối đa', capacity)}
                        className={cn(
                          "text-xs",
                          formData['Sức chứa tối đa'] === capacity && "border-blue-500 bg-blue-50"
                        )}
                      >
                        {capacity} người
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white">
        <div className="p-6">
          <div className="flex justify-end gap-3">
            <Button
              onClick={onCancel}
              variant="outline"
              disabled={isSubmitting}
              type="button"
            >
              <X className="h-4 w-4 mr-2" />
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditMode ? 'Cập nhật bàn' : 'Thêm bàn'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};