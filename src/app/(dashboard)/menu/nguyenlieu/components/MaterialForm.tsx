'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
    Save, Loader2, X, Package, Hash, FileText, AlertTriangle,
    Plus, ChevronDown, CheckCircle2, Calculator
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { Material, MaterialFormData } from '../types/material';
import { BASE_UNITS, COMMON_CONVERSIONS, MATERIAL_UNITS } from '../utils/constants';

import { formatNumber, parseNumber } from '../utils/formatters';

interface MaterialFormProps {
    material?: Material | null;
    formData: MaterialFormData;
    onFormDataChange: (data: MaterialFormData) => void;
    onSubmit: (data: MaterialFormData) => void;
    onCancel: () => void;
    isAdmin: boolean;
    isManager: boolean;
    generateMaterialId: () => string;
}

// EditableSelect Component
interface EditableSelectProps {
    value: string;
    onValueChange: (value: string) => void;
    options: string[];
    placeholder: string;
    label: string;
}

const EditableSelect = React.memo<EditableSelectProps>(({
    value,
    onValueChange,
    options,
    placeholder,
    label
}) => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        if (inputValue !== value) {
            setInputValue(value);
        }
    }, [value]);

    const handleSelect = useCallback((selectedValue: string) => {
        if (selectedValue !== value) {
            setInputValue(selectedValue);
            onValueChange(selectedValue);
        }
        setOpen(false);
        setIsTyping(false);
    }, [onValueChange, value]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setIsTyping(true);

        if (newValue.trim() === '') {
            setOpen(true);
        } else {
            setOpen(false);
        }

        if (newValue !== value) {
            onValueChange(newValue);
        }
    }, [onValueChange, value]);

    const handleInputClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (inputValue.trim() === '' || options.includes(inputValue)) {
            setOpen(true);
        }
    }, [inputValue, options]);

    const handleButtonClick = useCallback(() => {
        setOpen(!open);
        setIsTyping(false);
    }, [open]);

    const filteredOptions = useMemo(() => {
        if (!inputValue.trim()) return options;
        return options.filter(option =>
            option.toLowerCase().includes(inputValue.toLowerCase())
        );
    }, [options, inputValue]);

    return (
        <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">{label}</Label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <div className="relative">
                        <Input
                            value={inputValue}
                            onChange={handleInputChange}
                            onClick={handleInputClick}
                            placeholder={placeholder}
                            className="pr-10 h-10"
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleButtonClick}
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                            type="button"
                        >
                            <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder={`Tìm kiếm ${label.toLowerCase()}...`}
                            value={inputValue}
                            onValueChange={setInputValue}
                        />
                        <CommandEmpty>
                            <div className="p-2 text-sm text-muted-foreground">
                                {inputValue.trim() ? (
                                    <div className="text-center">
                                        <div>Không tìm thấy kết quả</div>
                                        <div className="text-xs mt-1">Nhấn Enter để thêm mới</div>
                                    </div>
                                ) : (
                                    'Nhập để tìm kiếm hoặc thêm mới'
                                )}
                            </div>
                        </CommandEmpty>
                        <CommandList>
                            <CommandGroup>
                                {filteredOptions.map((option) => (
                                    <CommandItem
                                        key={option}
                                        value={option}
                                        onSelect={() => handleSelect(option)}
                                    >
                                        <CheckCircle2
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === option ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {option}
                                    </CommandItem>
                                ))}

                                {inputValue.trim() &&
                                    !options.some(option => option.toLowerCase() === inputValue.toLowerCase()) && (
                                        <CommandItem
                                            value={inputValue.trim()}
                                            onSelect={() => handleSelect(inputValue.trim())}
                                            className="border-t bg-green-50 hover:bg-green-100"
                                        >
                                            <Plus className="mr-2 h-4 w-4 text-green-600" />
                                            <span className="text-green-700 font-medium">
                                                Thêm mới: "{inputValue.trim()}"
                                            </span>
                                        </CommandItem>
                                    )}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
});

EditableSelect.displayName = 'EditableSelect';

export const MaterialForm: React.FC<MaterialFormProps> = ({
    material,
    formData,
    onFormDataChange,
    onSubmit,
    onCancel,
    isAdmin,
    isManager,
    generateMaterialId
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEditMode = Boolean(material);

    // Auto-generate material ID for new materials
    useEffect(() => {
        if (!isEditMode && !formData.IDNguyenLieu) {
            const newId = generateMaterialId();
            updateFormData('IDNguyenLieu', newId);
        }
    }, [isEditMode, formData.IDNguyenLieu, generateMaterialId]);

    // Form handlers
    const updateFormData = useCallback((field: keyof MaterialFormData, value: string | number) => {
        onFormDataChange({ ...formData, [field]: value });
    }, [formData, onFormDataChange]);

    // Validation
    const validateMaterial = useCallback((material: MaterialFormData): string[] => {
        const errors: string[] = [];

        if (!material.IDNguyenLieu?.trim()) errors.push('Mã nguyên vật liệu không được để trống');
        if (!material['Tên nguyên liệu']?.trim()) errors.push('Tên nguyên vật liệu không được để trống');
        if (!material['Đơn vị tính']?.trim()) errors.push('Đơn vị tính không được để trống');

        if (material['Số lượng cảnh báo'] < 0) errors.push('Số lượng cảnh báo không được âm');

        return errors;
    }, []);

    // Handle form submission
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

    const errors = validateMaterial(formData);
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
}, [
  isSubmitting, isAdmin, isManager, formData,
  validateMaterial, onSubmit
]);

    // Input handlers
    const inputHandlers = useMemo(() => ({
        materialId: (e: React.ChangeEvent<HTMLInputElement>) => updateFormData('IDNguyenLieu', e.target.value),
        materialName: (e: React.ChangeEvent<HTMLInputElement>) => updateFormData('Tên nguyên liệu', e.target.value),
        notes: (e: React.ChangeEvent<HTMLTextAreaElement>) => updateFormData('Ghi chú', e.target.value),
        unit: (value: string) => updateFormData('Đơn vị tính', value),
        baseUnit: (value: string) => updateFormData('Đơn vị cơ sở', value),
        conversionRatio: (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = parseNumber(e.target.value);
            updateFormData('Hệ số quy đổi', value);
        },
        warningQuantity: (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = parseNumber(e.target.value);
            updateFormData('Số lượng cảnh báo', value);
        },
    }), [updateFormData]);
    const handleUnitChange = useCallback((newUnit: string) => {
        inputHandlers.unit(newUnit);

        // Auto-suggest base unit and conversion ratio
        const conversionKey = `${newUnit} -> ${formData['Đơn vị cơ sở']}`;
        if (COMMON_CONVERSIONS[conversionKey as keyof typeof COMMON_CONVERSIONS]) {
            updateFormData('Hệ số quy đổi', COMMON_CONVERSIONS[conversionKey as keyof typeof COMMON_CONVERSIONS]);
        }
    }, [inputHandlers, formData, updateFormData]);
    return (
        <div className="flex flex-col h-full max-h-screen">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-3 sm:p-4 md:p-6">
                    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                        {/* Responsive Grid Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">

                            {/* Column 1 - Basic Information */}
                            <div className="space-y-4 sm:space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="materialId" className="text-sm font-medium text-gray-700">
                                        Mã nguyên vật liệu <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="materialId"
                                            className={`pl-10 h-9 sm:h-10 font-mono ${isEditMode ? 'bg-gray-100' : ''}`}
                                            value={formData.IDNguyenLieu || ''}
                                            onChange={inputHandlers.materialId}
                                            placeholder="Nhập mã nguyên vật liệu"
                                            readOnly={isEditMode}
                                            required
                                        />
                                    </div>
                                    {isEditMode && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Mã nguyên vật liệu không thể thay đổi sau khi đã tạo.
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="materialName" className="text-sm font-medium text-gray-700">
                                        Tên nguyên vật liệu <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="materialName"
                                            className="pl-10 h-9 sm:h-10"
                                            value={formData['Tên nguyên liệu'] || ''}
                                            onChange={inputHandlers.materialName}
                                            placeholder="Nhập tên nguyên vật liệu"
                                            required
                                        />
                                    </div>
                                </div>

                                <EditableSelect
                                    value={formData['Đơn vị tính'] || ''}
                                    onValueChange={inputHandlers.unit}
                                    options={MATERIAL_UNITS}
                                    placeholder="Chọn đơn vị tính"
                                    label="Đơn vị tính"
                                />

                                <div className="space-y-2">
                                    <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                                        Ghi chú
                                    </Label>
                                    <div className="relative">
                                        <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <Textarea
                                            id="notes"
                                            className="pl-10 resize-none min-h-[80px] sm:min-h-[100px]"
                                            rows={4}
                                            value={formData['Ghi chú'] || ''}
                                            onChange={inputHandlers.notes}
                                            placeholder="Nhập ghi chú về nguyên vật liệu"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Column 2 - Warning & Additional Info */}
                            <div className="space-y-4 sm:space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="warningQuantity" className="text-sm font-medium text-gray-700">
                                        Số lượng cảnh báo
                                    </Label>
                                    <div className="relative">
                                        <AlertTriangle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-400" />
                                        <Input
                                            id="warningQuantity"
                                            type="number"
                                            min="0"
                                            step="1"
                                            className="pl-10 h-9 sm:h-10"
                                            value={formData['Số lượng cảnh báo'] || ''}
                                            onChange={inputHandlers.warningQuantity}
                                            placeholder="0"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Ngưỡng cảnh báo khi số lượng tồn kho thấp ({formData['Đơn vị tính'] || 'đơn vị'})
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="baseUnit" className="text-sm font-medium text-gray-700">
                                        Đơn vị cơ sở <span className="text-red-500">*</span>
                                    </Label>
                                    <EditableSelect
                                        value={formData['Đơn vị cơ sở'] || ''}
                                        onValueChange={inputHandlers.baseUnit}
                                        options={BASE_UNITS}
                                        placeholder="Chọn đơn vị cơ sở"
                                        label=""
                                    />
                                    <p className="text-xs text-gray-500">
                                        Đơn vị gốc để tính toán định mức
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="conversionRatio" className="text-sm font-medium text-gray-700">
                                        Hệ số quy đổi <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Calculator className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-400" />
                                        <Input
                                            id="conversionRatio"
                                            type="number"
                                            min="0"
                                            step="0.001"
                                            className="pl-10 h-9 sm:h-10"
                                            value={formData['Hệ số quy đổi'] || ''}
                                            onChange={inputHandlers.conversionRatio}
                                            placeholder="1"
                                            required
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        1 {formData['Đơn vị tính'] || 'đơn vị'} = {formatNumber(formData['Hệ số quy đổi'] || 0)} {formData['Đơn vị cơ sở'] || 'đơn vị cơ sở'}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-sm font-medium text-gray-700">
                                        Hệ số phổ biến
                                    </Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => updateFormData('Hệ số quy đổi', 1000)}
                                            className="text-xs"
                                        >
                                            Kg → g (1000)
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => updateFormData('Hệ số quy đổi', 1000)}
                                            className="text-xs"
                                        >
                                            L → ml (1000)
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => updateFormData('Hệ số quy đổi', 12)}
                                            className="text-xs"
                                        >
                                            Thùng → Hộp (12)
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => updateFormData('Hệ số quy đổi', 1)}
                                            className="text-xs"
                                        >
                                            1:1 (1)
                                        </Button>
                                    </div>
                                </div>
                                {/* Info Panel */}
                                <div className="p-3 bg-green-50 rounded-lg">
                                    <div className="text-sm font-medium text-green-700 mb-2">Thông tin nguyên vật liệu</div>
                                    <div className="space-y-2 text-xs text-green-600">
                                        <div className="flex justify-between">
                                            <span>Mã NVL:</span>
                                            <span className="font-mono font-medium">{formData.IDNguyenLieu || 'Chưa có'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Đơn vị tính:</span>
                                            <span className="font-medium">{formData['Đơn vị tính'] || 'Chưa chọn'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Cảnh báo:</span>
                                            <span className="font-medium">
                                                {formData['Số lượng cảnh báo'] || 0} {formData['Đơn vị tính'] || 'đơn vị'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium text-gray-700">
                                        Thao tác nhanh
                                    </Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => updateFormData('Số lượng cảnh báo', 10)}
                                            className="text-xs"
                                        >
                                            Cảnh báo: 10
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => updateFormData('Số lượng cảnh báo', 50)}
                                            className="text-xs"
                                        >
                                            Cảnh báo: 50
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => updateFormData('Số lượng cảnh báo', 100)}
                                            className="text-xs"
                                        >
                                            Cảnh báo: 100
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => updateFormData('Số lượng cảnh báo', 0)}
                                            className="text-xs"
                                        >
                                            Không cảnh báo
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 border-t border-gray-200 bg-white">
                <div className="p-3 sm:p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 w-full">
                        <div className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
                            {/* Space for additional info if needed */}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto order-1 sm:order-2">
                            <Button
                                onClick={onCancel}
                                variant="outline"
                                disabled={isSubmitting}
                                type="button"
                                className="w-full sm:w-auto text-sm"
                            >
                                <X className="h-4 w-4 mr-2" />
                                Hủy
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto text-sm"
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
                                        {isEditMode ? 'Cập nhật nguyên vật liệu' : 'Thêm nguyên vật liệu'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};