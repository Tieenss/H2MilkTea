'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  Save, Loader2, X, User, Mail, Phone, MapPin, FileText,
  CalendarIcon, Eye, EyeOff, Shield, Briefcase, Plus,
  ChevronDown, CheckCircle2
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
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/DatePicker';
import { DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Employee, EmployeeFormData } from '../types/employee';
import { navigation, NavigationItem } from '@/lib/navigation';
import authUtils from '@/utils/authUtils';

interface EmployeeFormProps {
  employee?: Employee | null;
  formData: EmployeeFormData;
  onFormDataChange: (data: EmployeeFormData) => void;
  onSubmit: (data: EmployeeFormData) => void;
  onCancel: () => void;
  isAdmin: boolean;
  isManager: boolean;
  departments: string[];
  positions: string[];
}

// EditableSelect Component - Responsive
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
  const [isTyping, setIsTyping] = useState(false); // Thêm state để theo dõi việc đang gõ

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
    setIsTyping(false); // Reset typing state
  }, [onValueChange, value]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsTyping(true); // Đang gõ

    // Chỉ mở dropdown nếu không đang gõ hoặc input rỗng
    if (newValue.trim() === '') {
      setOpen(true);
    } else {
      // Đóng dropdown khi đang gõ để tránh gián đoạn
      setOpen(false);
    }

    if (newValue !== value) {
      onValueChange(newValue);
    }
  }, [onValueChange, value]);

  const handleInputClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Chỉ mở dropdown nếu input rỗng hoặc đã có sẵn options
    if (inputValue.trim() === '' || options.includes(inputValue)) {
      setOpen(true);
    }
  }, [inputValue, options]);

  const handleButtonClick = useCallback(() => {
    // Toggle dropdown chỉ khi click vào button (không phải input)
    setOpen(!open);
    setIsTyping(false);
  }, [open]);

  const handleInputFocus = useCallback(() => {
    // Chỉ mở dropdown khi focus nếu input rỗng
    if (inputValue.trim() === '') {
      setOpen(true);
    }
  }, [inputValue]);

  const handleInputBlur = useCallback(() => {
    // Delay để không đóng dropdown khi click vào option
    setTimeout(() => {
      if (!isTyping) {
        setOpen(false);
      }
      setIsTyping(false);
    }, 150);
  }, [isTyping]);

  // Lọc options dựa trên input
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
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
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
          <Command shouldFilter={false}> {/* Tắt filter tự động của Command */}
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
                {/* Hiển thị các options đã lọc */}
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

                {/* Hiển thị option thêm mới nếu input không trùng với option nào */}
                {inputValue.trim() &&
                  !options.some(option => option.toLowerCase() === inputValue.toLowerCase()) && (
                    <CommandItem
                      value={inputValue.trim()}
                      onSelect={() => handleSelect(inputValue.trim())}
                      className="border-t bg-blue-50 hover:bg-blue-100"
                    >
                      <Plus className="mr-2 h-4 w-4 text-blue-600" />
                      <span className="text-blue-700 font-medium">
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

// LazyImage Component - Responsive
const LazyImage = React.memo<{
  src: string;
  alt: string;
  className?: string;
}>(({ src, alt, className }) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src || src.trim() === '') {
      setLoading(false);
      setError(true);
      return;
    }

    setLoading(true);
    setError(false);

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setLoading(false);
    };
    img.onerror = () => {
      setError(true);
      setLoading(false);
    };
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  if (loading) {
    return (
      <div className={cn("animate-pulse bg-gray-200 rounded-full", className)} />
    );
  }

  if (error || !imageSrc) {
    return <User className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300" />;
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
});

LazyImage.displayName = 'LazyImage';

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
  employee,
  formData,
  onFormDataChange,
  onSubmit,
  onCancel,
  isAdmin,
  isManager,
  departments,
  positions
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(formData.Image || null);
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);


  const getAllNavigationItems = useCallback((items: NavigationItem[]): NavigationItem[] => {
    const allItems: NavigationItem[] = [];

    items.forEach(item => {
      // Thêm item chính (trừ khi là group)
      if (!item.isGroup) {
        allItems.push(item);
      }

      // Thêm children nếu có
      if (item.children) {
        allItems.push(...item.children);
      }
    });

    return allItems;
  }, []);
  // Memoize dates để tránh re-render không cần thiết
  const birthDate = useMemo(() => {
    return formData['Ngày sinh'] ? new Date(formData['Ngày sinh']) : undefined;
  }, [formData['Ngày sinh']]);

  const startDate = useMemo(() => {
    return formData['Ngày vào làm'] ? new Date(formData['Ngày vào làm']) : undefined;
  }, [formData['Ngày vào làm']]);

  // Tối ưu selectedPermissions để tránh reset form
  const selectedPermissions = useMemo(() => {
    if (formData['Quyền View']) {
      return formData['Quyền View'].split(',').map(item => item.trim()).filter(Boolean);
    }
    return [];
  }, [formData['Quyền View']]);

  const isEditMode = Boolean(employee);

  // Memoize role options để tránh re-render
  const roleOptions = useMemo(() => [
    { value: 'Admin', label: 'Admin', desc: 'Quản trị viên hệ thống', icon: Shield, disabled: !isAdmin },
    { value: 'Giám đốc', label: 'Giám đốc', desc: 'Quản lý cấp cao', icon: Briefcase, disabled: !isAdmin },
    { value: 'Nhân viên', label: 'Nhân viên', desc: 'Người dùng thông thường', icon: User, disabled: false }
  ], [isAdmin]);

  // Utility functions
  const dateToString = useCallback((date: Date | undefined): string => {
    return date ? format(date, 'yyyy-MM-dd') : '';
  }, []);

  // Form handlers
  const updateFormData = useCallback((field: keyof EmployeeFormData, value: string) => {
    onFormDataChange({ ...formData, [field]: value });
  }, [formData, onFormDataChange]);

  // Auto update permissions for Admin
  useEffect(() => {
    if (formData['Phân quyền'] === 'Admin') {
      const allItems = getAllNavigationItems(navigation);
      const allPermissions = allItems.map(item => item.name);
      const currentPermissions = formData['Quyền View'];
      const allPermissionsString = allPermissions.join(', ');

      if (currentPermissions !== allPermissionsString) {
        updateFormData('Quyền View', allPermissionsString);
      }
    }
  }, [formData['Phân quyền'], formData['Quyền View'], updateFormData, getAllNavigationItems]);


  // Permission handlers
  const handlePermissionChange = useCallback((navName: string, checked: boolean) => {
    const currentPermissions = selectedPermissions;
    let newPermissions: string[];

    if (checked) {
      newPermissions = [...currentPermissions, navName];
    } else {
      newPermissions = currentPermissions.filter(perm => perm !== navName);
    }

    updateFormData('Quyền View', newPermissions.join(', '));
  }, [selectedPermissions, updateFormData]);

  const handleSelectAll = useCallback(() => {
    const allItems = getAllNavigationItems(navigation);
    const allPermissions = allItems.map(item => item.name);
    updateFormData('Quyền View', allPermissions.join(', '));
  }, [updateFormData, getAllNavigationItems]);

  const handleDeselectAll = useCallback(() => {
    updateFormData('Quyền View', '');
  }, [updateFormData]);

  // Date handlers
  const handleBirthDateChange = useCallback((date: Date | undefined) => {
    updateFormData('Ngày sinh', dateToString(date));
  }, [updateFormData, dateToString]);

  const handleStartDateChange = useCallback((date: Date | undefined) => {
    updateFormData('Ngày vào làm', dateToString(date));
  }, [updateFormData, dateToString]);

  // Image upload handlers
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);

      const toastId = toast.loading("Đang tải ảnh lên...");

      const result = await authUtils.uploadImage(file);

      if (result?.success && result?.url) {
        updateFormData('Image', result.url);
        setSelectedImage(result.url);
        toast.success("Tải ảnh thành công", { id: toastId });
      } else {
        throw new Error("Không thể lấy URL ảnh");
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Lỗi khi tải ảnh: ' + (error as Error).message);
      setSelectedImage(null);
    }
  }, [updateFormData]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validation = authUtils.validateImage(file);
      if (!validation.isValid) {
        toast.error(validation.errors.join('\n'));
        return;
      }
      handleImageUpload(file);
    }
  }, [handleImageUpload]);

  const handleImageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = authUtils.validateImage(file);
      if (!validation.isValid) {
        toast.error(validation.errors.join('\n'));
        return;
      }
      handleImageUpload(file);
    }
  }, [handleImageUpload]);

  const handleRemoveImage = useCallback(() => {
    setSelectedImage(null);
    updateFormData('Image', '');
  }, [updateFormData]);

  // Validation
  const validateEmployee = useCallback((employee: EmployeeFormData): string[] => {
    const errors: string[] = [];

    if (!employee['Họ và Tên']?.trim()) errors.push('Họ và tên không được để trống');
    if (!employee['username']?.trim()) errors.push('Tên đăng nhập không được để trống');
    if (!isEditMode && !employee['password']?.trim()) errors.push('Mật khẩu không được để trống');
    if (!employee['Email']?.trim()) errors.push('Email không được để trống');

    if (employee['Số điện thoại'] && !/^[0-9+\-\s()]+$/.test(employee['Số điện thoại'])) {
      errors.push('Số điện thoại không hợp lệ');
    }

    if (employee['Email'] && !/\S+@\S+\.\S+/.test(employee['Email'])) {
      errors.push('Email không hợp lệ');
    }

    if (!isEditMode && employee['password'] && employee['password'].length < 3) {
      errors.push('Mật khẩu phải có ít nhất 3 ký tự');
    }

    return errors;
  }, [isEditMode]);

  // Handle form submission
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

    const employeeToSubmit = {
      ...formData,
      'Ngày sinh': dateToString(birthDate),
      'Ngày vào làm': dateToString(startDate),
      Image: selectedImage || ''
    };

    const errors = validateEmployee(employeeToSubmit);
    if (errors.length > 0) {
      toast.error(errors.join('\n'));
      return;
    }

    if (!isAdmin && ['Admin', 'Giám đốc'].includes(employeeToSubmit['Phân quyền'])) {
      toast.error('Bạn không có quyền tạo/sửa Admin hoặc Giám đốc!');
      return;
    }

    // Call onSubmit và đợi nó hoàn thành
    await onSubmit(employeeToSubmit);
    
    // onCancel sẽ được gọi từ component cha sau khi submit thành công
  } catch (error) {
    console.error('Error in form submission:', error);
    toast.error('Có lỗi xảy ra khi xử lý form');
  } finally {
    setIsSubmitting(false);
  }
}, [
  isSubmitting, isAdmin, isManager, formData, dateToString,
  birthDate, startDate, selectedImage, validateEmployee, onSubmit
]);
  // Input handlers
  const inputHandlers = useMemo(() => ({
    fullName: (e: React.ChangeEvent<HTMLInputElement>) => updateFormData('Họ và Tên', e.target.value),
    email: (e: React.ChangeEvent<HTMLInputElement>) => updateFormData('Email', e.target.value),
    phone: (e: React.ChangeEvent<HTMLInputElement>) => updateFormData('Số điện thoại', e.target.value),
    address: (e: React.ChangeEvent<HTMLTextAreaElement>) => updateFormData('Địa chỉ', e.target.value),
    notes: (e: React.ChangeEvent<HTMLTextAreaElement>) => updateFormData('Ghi chú', e.target.value),
    username: (e: React.ChangeEvent<HTMLInputElement>) => updateFormData('username', e.target.value),
    password: (e: React.ChangeEvent<HTMLInputElement>) => updateFormData('password', e.target.value),
    role: (e: React.ChangeEvent<HTMLInputElement>) => updateFormData('Phân quyền', e.target.value),
    position: (value: string) => updateFormData('Chức vụ', value),
    department: (value: string) => updateFormData('Phòng', value),
  }), [updateFormData]);

  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-4 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Responsive Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">

              {/* Column 1 - Basic Information */}
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                    Họ và tên <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    value={formData['Họ và Tên'] || ''}
                    onChange={inputHandlers.fullName}
                    placeholder="Nhập họ và tên"
                    className="h-9 sm:h-10"
                    required
                  />
                </div>

                <EditableSelect
                  value={formData['Chức vụ'] || ''}
                  onValueChange={inputHandlers.position}
                  options={positions}
                  placeholder="Chọn hoặc nhập chức vụ"
                  label="Chức vụ"
                />

                <EditableSelect
                  value={formData['Phòng'] || ''}
                  onValueChange={inputHandlers.department}
                  options={departments}
                  placeholder="Chọn hoặc nhập phòng ban"
                  label="Phòng ban"
                />

                <DatePicker
                  date={birthDate}
                  onDateChange={handleBirthDateChange}
                  placeholder="Chọn ngày sinh"
                  label="Ngày sinh"
                  showMonthYearPicker={true}
                />

                <DatePicker
                  date={startDate}
                  onDateChange={handleStartDateChange}
                  placeholder="Chọn ngày vào làm"
                  label="Ngày vào làm"
                  showMonthYearPicker={true}
                />
              </div>

              {/* Column 2 - Contact Information */}
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-10 h-9 sm:h-10"
                      value={formData['Email'] || ''}
                      onChange={inputHandlers.email}
                      placeholder="Nhập địa chỉ email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Số điện thoại
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      className="pl-10 h-9 sm:h-10"
                      value={formData['Số điện thoại'] || ''}
                      onChange={inputHandlers.phone}
                      placeholder="Nhập số điện thoại"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                    Địa chỉ
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Textarea
                      id="address"
                      className="pl-10 resize-none min-h-[80px] sm:min-h-[100px]"
                      rows={3}
                      value={formData['Địa chỉ'] || ''}
                      onChange={inputHandlers.address}
                      placeholder="Nhập địa chỉ"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                    Ghi chú
                  </Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Textarea
                      id="notes"
                      className="pl-10 resize-none min-h-[80px] sm:min-h-[100px]"
                      rows={3}
                      value={formData['Ghi chú'] || ''}
                      onChange={inputHandlers.notes}
                      placeholder="Nhập ghi chú"
                    />
                  </div>
                </div>
              </div>

              {/* Column 3 - Account Information */}
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                    Tên đăng nhập <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="username"
                      className={`pl-10 h-9 sm:h-10 ${isEditMode ? 'bg-gray-100' : ''}`}
                      value={formData['username'] || ''}
                      onChange={inputHandlers.username}
                      placeholder="Nhập tên đăng nhập"
                      readOnly={isEditMode}
                      required
                    />
                  </div>
                  {isEditMode && (
                    <p className="text-xs text-gray-500 mt-1">
                      Tên đăng nhập không thể thay đổi sau khi đã tạo.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Mật khẩu {!isEditMode && <span className="text-red-500">*</span>}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="pr-10 h-9 sm:h-10"
                      value={formData['password'] || ''}
                      onChange={inputHandlers.password}
                      placeholder={isEditMode ? 'Nhập để thay đổi mật khẩu' : 'Nhập mật khẩu'}
                      required={!isEditMode}
                    />
                    <Button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {isEditMode && (
                    <p className="text-xs text-gray-500 mt-1">
                      Để trống nếu không muốn thay đổi mật khẩu.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Phân quyền <span className="text-red-500">*</span>
                  </Label>
                  <div className="space-y-2 sm:space-y-3">
                    {roleOptions.map((role) => (
                      <Label key={role.value} className={cn(
                        "flex items-start space-x-2 sm:space-x-3 cursor-pointer p-2 sm:p-3 border rounded-lg transition-colors",
                        role.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                      )}>
                        <input
                          type="radio"
                          name="role"
                          value={role.value}
                          checked={formData['Phân quyền'] === role.value}
                          onChange={inputHandlers.role}
                          disabled={role.disabled}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 mt-0.5 flex-shrink-0"
                        />
                        <div className="flex items-start space-x-2 flex-1 min-w-0">
                          <role.icon className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium text-sm ${role.disabled ? 'text-gray-400' : 'text-gray-700'}`}>
                              {role.label}
                            </div>
                            <div className={`text-xs ${role.disabled ? 'text-gray-300' : 'text-gray-500'}`}>
                              {role.desc}
                            </div>
                          </div>
                        </div>
                      </Label>
                    ))}
                  </div>
                  {!isAdmin && (
                    <p className="text-xs text-red-500 mt-2 flex items-center">
                      <Shield className="h-3 w-3 mr-1 flex-shrink-0" />
                      Chỉ Admin mới có quyền tạo/sửa tài khoản Admin và Giám đốc
                    </p>
                  )}
                </div>
              </div>

              {/* Column 4 - Image Upload & Permissions */}
              <div className="space-y-4 sm:space-y-6 md:col-span-2 xl:col-span-1">
                {/* Image Upload Section */}
                <div
                  ref={dropZoneRef}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-3 sm:p-4 md:p-6 text-center transition-colors cursor-pointer hover:bg-gray-50",
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  )}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 border-2 rounded-full flex items-center justify-center bg-white overflow-hidden mb-3 sm:mb-4">
                      {selectedImage && selectedImage.trim() !== '' ? (
                        <LazyImage
                          src={selectedImage}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <User className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-gray-300" />
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 mb-2 text-center">
                      Kéo thả ảnh vào đây hoặc{' '}
                      <label htmlFor="imageUpload" className="text-blue-600 cursor-pointer hover:underline">
                        chọn file
                      </label>
                    </div>
                    <input
                      id="imageUpload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-400">PNG, JPG, GIF tối đa 5MB</p>

                    {selectedImage && selectedImage.trim() !== '' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveImage}
                        className="mt-2 sm:mt-3 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Xóa ảnh
                      </Button>
                    )}
                  </div>
                </div>


                {/* Permissions Section */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Quyền xem menu
                  </Label>

                  {/* Select All/Deselect All buttons */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="text-xs flex-1 sm:flex-none"
                      disabled={formData['Phân quyền'] === 'Admin'}
                    >
                      Chọn tất cả
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAll}
                      className="text-xs flex-1 sm:flex-none"
                      disabled={formData['Phân quyền'] === 'Admin'}
                    >
                      Bỏ chọn tất cả
                    </Button>
                  </div>

                  {/* Permission checkboxes with groups */}
                  <div className="space-y-3 max-h-48 sm:max-h-56 overflow-y-auto border rounded-lg p-3">
                    {navigation.map((navItem) => {
                      const Icon = navItem.icon;
                      const isDisabled = formData['Phân quyền'] === 'Admin';

                      // Nếu là group có children
                      if (navItem.isGroup && navItem.children) {
                        const groupChildren = navItem.children;
                        const checkedChildren = groupChildren.filter(child =>
                          selectedPermissions.includes(child.name)
                        );
                        const isGroupFullyChecked = checkedChildren.length === groupChildren.length;
                        const isGroupPartiallyChecked = checkedChildren.length > 0 && checkedChildren.length < groupChildren.length;

                        return (
                          <div key={navItem.name} className="space-y-2">
                            {/* Group Header */}
                            <div className="flex items-center space-x-2 sm:space-x-3 pb-2 border-b border-gray-100">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`group-${navItem.name}`}
                                  checked={isGroupFullyChecked}
                                  disabled={isDisabled}
                                  ref={(ref) => {
                                    if (ref && 'indeterminate' in ref) {
                                      (ref as HTMLInputElement).indeterminate = isGroupPartiallyChecked;
                                    }
                                  }}
                                  onCheckedChange={(checked) => {
                                    // Toggle tất cả children trong group
                                    groupChildren.forEach(child => {
                                      handlePermissionChange(child.name, checked as boolean);
                                    });
                                  }}
                                />
                                <Label
                                  htmlFor={`group-${navItem.name}`}
                                  className="flex items-center space-x-2 cursor-pointer font-medium"
                                >
                                  <Icon className="h-4 w-4 text-gray-600 flex-shrink-0" />
                                  <span className="text-sm text-gray-700">{navItem.name}</span>
                                  <span className="text-xs text-gray-500">
                                    ({checkedChildren.length}/{groupChildren.length})
                                  </span>
                                </Label>
                              </div>
                            </div>

                            {/* Group Children */}
                            <div className="ml-6 space-y-2">
                              {groupChildren.map((child) => {
                                const ChildIcon = child.icon;
                                const isChecked = selectedPermissions.includes(child.name);

                                return (
                                  <div key={child.name} className="flex items-center space-x-2 sm:space-x-3">
                                    <Checkbox
                                      id={`perm-${child.name}`}
                                      checked={isChecked}
                                      disabled={isDisabled}
                                      onCheckedChange={(checked) =>
                                        handlePermissionChange(child.name, checked as boolean)
                                      }
                                    />
                                    <Label
                                      htmlFor={`perm-${child.name}`}
                                      className="flex items-center space-x-2 cursor-pointer flex-1 min-w-0"
                                    >
                                      <ChildIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                                      <span className="text-xs sm:text-sm truncate text-gray-600">
                                        {child.name}
                                      </span>
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      // Nếu là item đơn lẻ (không phải group)
                      if (!navItem.isGroup) {
                        const isChecked = selectedPermissions.includes(navItem.name);

                        return (
                          <div key={navItem.name} className="flex items-center space-x-2 sm:space-x-3">
                            <Checkbox
                              id={`perm-${navItem.name}`}
                              checked={isChecked}
                              disabled={isDisabled}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(navItem.name, checked as boolean)
                              }
                            />
                            <Label
                              htmlFor={`perm-${navItem.name}`}
                              className="flex items-center space-x-2 cursor-pointer flex-1 min-w-0"
                            >
                              <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-xs sm:text-sm truncate font-medium text-gray-700">
                                {navItem.name}
                              </span>
                            </Label>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>

                  {formData['Phân quyền'] === 'Admin' && (
                    <p className="text-xs text-blue-600 mt-2">
                      Admin có quyền truy cập tất cả menu
                    </p>
                  )}

                  {/* Display selected permissions - Grouped by category */}
                  {selectedPermissions.length > 0 && formData['Phân quyền'] !== 'Admin' && (
                    <div className="mt-2 p-3 bg-gray-50 rounded text-xs hidden sm:block">
                      <span className="font-medium text-gray-700 mb-2 block">
                        Quyền đã chọn ({selectedPermissions.length}):
                      </span>
                      <div className="space-y-1">
                        {navigation.map((navItem) => {
                          if (navItem.isGroup && navItem.children) {
                            const selectedChildren = navItem.children.filter(child =>
                              selectedPermissions.includes(child.name)
                            );

                            if (selectedChildren.length > 0) {
                              return (
                                <div key={navItem.name} className="text-gray-600">
                                  <span className="font-medium">{navItem.name}:</span>{' '}
                                  {selectedChildren.map(child => child.name).join(', ')}
                                </div>
                              );
                            }
                          } else if (!navItem.isGroup && selectedPermissions.includes(navItem.name)) {
                            return (
                              <div key={navItem.name} className="text-gray-600">
                                <span className="font-medium">Khác:</span> {navItem.name}
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  )}
                </div>


              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Fixed Footer - Responsive */}
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
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-sm"
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
                    {isEditMode ? 'Cập nhật nhân viên' : 'Thêm nhân viên'}
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