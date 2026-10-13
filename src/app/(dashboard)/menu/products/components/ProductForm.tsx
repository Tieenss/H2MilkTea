'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
 Save, Loader2, X, Package, DollarSign, FileText, Image as ImageIcon,
 Plus, ChevronDown, CheckCircle2, Hash
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
import { DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Product, ProductFormData } from '../types/product';
import { PRODUCT_STATUS, PRODUCT_UNITS } from '../utils/constants';

import { formatNumber, parseNumber } from '../utils/formatters';
import authUtils from '@/utils/authUtils';

interface ProductFormProps {
 product?: Product | null;
 formData: ProductFormData;
 onFormDataChange: (data: ProductFormData) => void;
 onSubmit: (data: ProductFormData) => void;
 onCancel: () => void;
 isAdmin: boolean;
 isManager: boolean;
 categories: string[];
 generateProductId: () => string;
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

 const handleInputFocus = useCallback(() => {
   if (inputValue.trim() === '') {
     setOpen(true);
   }
 }, [inputValue]);

 const handleInputBlur = useCallback(() => {
   setTimeout(() => {
     if (!isTyping) {
       setOpen(false);
     }
     setIsTyping(false);
   }, 150);
 }, [isTyping]);

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

// LazyImage Component
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
     <div className={cn("animate-pulse bg-gray-200 rounded", className)} />
   );
 }

 if (error || !imageSrc) {
   return <Package className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300" />;
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

export const ProductForm: React.FC<ProductFormProps> = ({
 product,
 formData,
 onFormDataChange,
 onSubmit,
 onCancel,
 isAdmin,
 isManager,
 categories,
 generateProductId
}) => {
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [selectedImage, setSelectedImage] = useState<string | null>(formData['Hình ảnh'] || null);
 const [isDragging, setIsDragging] = useState(false);
 const dropZoneRef = useRef<HTMLDivElement>(null);

 const isEditMode = Boolean(product);

 // Auto-generate product ID for new products
 useEffect(() => {
   if (!isEditMode && !formData.IDSP) {
     const newId = generateProductId();
     updateFormData('IDSP', newId);
   }
 }, [isEditMode, formData.IDSP, generateProductId]);

 // Form handlers
 const updateFormData = useCallback((field: keyof ProductFormData, value: string | number) => {
   onFormDataChange({ ...formData, [field]: value });
 }, [formData, onFormDataChange]);

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
       updateFormData('Hình ảnh', result.url);
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
   updateFormData('Hình ảnh', '');
 }, [updateFormData]);

 // Validation
 const validateProduct = useCallback((product: ProductFormData): string[] => {
   const errors: string[] = [];

   if (!product.IDSP?.trim()) errors.push('Mã sản phẩm không được để trống');
   if (!product['Tên sản phẩm']?.trim()) errors.push('Tên sản phẩm không được để trống');
   if (!product['Đơn vị tính']?.trim()) errors.push('Đơn vị tính không được để trống');

   if (product['Giá vốn'] < 0) errors.push('Giá vốn không được âm');
   if (product['Đơn giá'] < 0) errors.push('Đơn giá không được âm');
   if (product['Đơn giá'] < product['Giá vốn']) {
     errors.push('Đơn giá không được nhỏ hơn giá vốn');
   }

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

     const productToValidate = {
       ...formData,
       'Hình ảnh': selectedImage || ''
     };

     const errors = validateProduct(productToValidate);
     if (errors.length > 0) {
       toast.error(errors.join('\n'));
       return;
     }

     onSubmit(productToValidate);
   } catch (error) {
     console.error('Error in form submission:', error);
     toast.error('Có lỗi xảy ra khi xử lý form');
   } finally {
     setIsSubmitting(false);
   }
 }, [
   isSubmitting, isAdmin, isManager, formData,
   selectedImage, validateProduct, onSubmit
 ]);

 // Input handlers
 const inputHandlers = useMemo(() => ({
   productId: (e: React.ChangeEvent<HTMLInputElement>) => updateFormData('IDSP', e.target.value),
   productName: (e: React.ChangeEvent<HTMLInputElement>) => updateFormData('Tên sản phẩm', e.target.value),
   description: (e: React.ChangeEvent<HTMLTextAreaElement>) => updateFormData('Mô tả', e.target.value),
   category: (value: string) => updateFormData('Loại sản phẩm', value),
   unit: (value: string) => updateFormData('Đơn vị tính', value),
   costPrice: (e: React.ChangeEvent<HTMLInputElement>) => {
     const value = parseNumber(e.target.value);
     updateFormData('Giá vốn', value);
   },
   sellingPrice: (e: React.ChangeEvent<HTMLInputElement>) => {
     const value = parseNumber(e.target.value);
     updateFormData('Đơn giá', value);
   },
   status: (e: React.ChangeEvent<HTMLInputElement>) => updateFormData('Trạng thái', e.target.value),
 }), [updateFormData]);

 return (
   <div className="flex flex-col h-full max-h-screen">
     {/* Scrollable Content */}
     <div className="flex-1 overflow-y-auto">
       <div className="p-3 sm:p-4 md:p-6">
         <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
           {/* Responsive Grid Layout */}
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">

             {/* Column 1 - Basic Information */}
             <div className="space-y-4 sm:space-y-6">
               <div className="space-y-2">
                 <Label htmlFor="productId" className="text-sm font-medium text-gray-700">
                   Mã sản phẩm <span className="text-red-500">*</span>
                 </Label>
                 <div className="relative">
                   <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                   <Input
                     id="productId"
                     className={`pl-10 h-9 sm:h-10 font-mono ${isEditMode ? 'bg-gray-100' : ''}`}
                     value={formData.IDSP || ''}
                     onChange={inputHandlers.productId}
                     placeholder="Nhập mã sản phẩm"
                     readOnly={isEditMode}
                     required
                   />
                 </div>
                 {isEditMode && (
                   <p className="text-xs text-gray-500 mt-1">
                     Mã sản phẩm không thể thay đổi sau khi đã tạo.
                   </p>
                 )}
               </div>

               <div className="space-y-2">
                 <Label htmlFor="productName" className="text-sm font-medium text-gray-700">
                   Tên sản phẩm <span className="text-red-500">*</span>
                 </Label>
                 <div className="relative">
                   <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                   <Input
                     id="productName"
                     className="pl-10 h-9 sm:h-10"
                     value={formData['Tên sản phẩm'] || ''}
                     onChange={inputHandlers.productName}
                     placeholder="Nhập tên sản phẩm"
                     required
                   />
                 </div>
               </div>

               <EditableSelect
                 value={formData['Loại sản phẩm'] || ''}
                 onValueChange={inputHandlers.category}
                 options={categories}
                 placeholder="Chọn hoặc nhập loại sản phẩm"
                 label="Loại sản phẩm"
               />

               <EditableSelect
                 value={formData['Đơn vị tính'] || ''}
                 onValueChange={inputHandlers.unit}
                 options={PRODUCT_UNITS}
                 placeholder="Chọn đơn vị tính"
                 label="Đơn vị tính"
               />

               <div className="space-y-2">
                 <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                   Mô tả sản phẩm
                 </Label>
                 <div className="relative">
                   <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                   <Textarea
                     id="description"
                     className="pl-10 resize-none min-h-[80px] sm:min-h-[100px]"
                     rows={4}
                     value={formData['Mô tả'] || ''}
                     onChange={inputHandlers.description}
                     placeholder="Nhập mô tả chi tiết sản phẩm"
                   />
                 </div>
               </div>
             </div>

             {/* Column 2 - Pricing & Status */}
             <div className="space-y-4 sm:space-y-6">
               <div className="space-y-2">
                 <Label htmlFor="costPrice" className="text-sm font-medium text-gray-700">
                   Giá vốn
                 </Label>
                 <div className="relative">
                   <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                   <Input
                     id="costPrice"
                     type="number"
                     min="0"
                     step="1000"
                     className="pl-10 h-9 sm:h-10"
                     value={formData['Giá vốn'] || ''}
                     onChange={inputHandlers.costPrice}
                     placeholder="0"
                   />
                 </div>
                 <p className="text-xs text-gray-500">
                   Giá nhập hàng hoặc chi phí sản xuất
                 </p>
               </div>

               <div className="space-y-2">
                 <Label htmlFor="sellingPrice" className="text-sm font-medium text-gray-700">
                   Đơn giá bán <span className="text-red-500">*</span>
                 </Label>
                 <div className="relative">
                   <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-400" />
                   <Input
                     id="sellingPrice"
                     type="number"
                     min="0"
                     step="1000"
                     className="pl-10 h-9 sm:h-10"
                     value={formData['Đơn giá'] || ''}
                     onChange={inputHandlers.sellingPrice}
                     placeholder="0"
                     required
                   />
                 </div>
                 <p className="text-xs text-gray-500">
                   Giá bán ra cho khách hàng
                 </p>
               </div>

               {/* Profit Margin Display */}
               <div className="p-3 bg-gray-50 rounded-lg">
                 <div className="text-sm font-medium text-gray-700 mb-2">Thông tin lợi nhuận</div>
                 <div className="space-y-1 text-xs">
                   <div className="flex justify-between">
                     <span>Lợi nhuận:</span>
                     <span className="font-medium text-green-600">
                       {formatNumber((formData['Đơn giá'] || 0) - (formData['Giá vốn'] || 0))} ₫
                     </span>
                   </div>
                   <div className="flex justify-between">
                     <span>Tỷ suất lợi nhuận:</span>
                     <span className="font-medium text-blue-600">
                       {formData['Giá vốn'] > 0 
                         ? `${(((formData['Đơn giá'] || 0) - (formData['Giá vốn'] || 0)) / (formData['Giá vốn'] || 1) * 100).toFixed(1)}%`
                         : '0%'
                       }
                     </span>
                   </div>
                 </div>
               </div>

               <div className="space-y-3">
                 <Label className="text-sm font-medium text-gray-700">
                   Trạng thái <span className="text-red-500">*</span>
                 </Label>
                 <div className="space-y-2 sm:space-y-3">
                   {PRODUCT_STATUS.map((status) => (
                     <Label key={status.value} className={cn(
                       "flex items-start space-x-2 sm:space-x-3 cursor-pointer p-2 sm:p-3 border rounded-lg transition-colors hover:bg-gray-50"
                     )}>
                       <input
                         type="radio"
                         name="status"
                         value={status.value}
                         checked={formData['Trạng thái'] === status.value}
                         onChange={inputHandlers.status}
                         className="h-4 w-4 text-blue-600 focus:ring-blue-500 mt-0.5 flex-shrink-0"
                       />
                       <div className="flex items-start space-x-2 flex-1 min-w-0">
                         <status.icon className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                         <div className="flex-1 min-w-0">
                           <div className="font-medium text-sm text-gray-700">
                             {status.label}
                           </div>
                         </div>
                       </div>
                     </Label>
                   ))}
                 </div>
               </div>
             </div>

             {/* Column 3 - Image Upload */}
             <div className="space-y-4 sm:space-y-6 md:col-span-2 xl:col-span-1">
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
                   <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 border-2 rounded-lg flex items-center justify-center bg-white overflow-hidden mb-3 sm:mb-4">
                     {selectedImage && selectedImage.trim() !== '' ? (
                       <LazyImage
                         src={selectedImage}
                         alt="Preview"
                         className="w-full h-full object-cover rounded-lg"
                       />
                     ) : (
                       <Package className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-gray-300" />
                     )}
                   </div>
                   <div className="text-xs sm:text-sm text-gray-600 mb-2 text-center">
                     <ImageIcon className="inline w-4 h-4 mr-1" />
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
                     onClick={() => {
                       const costPrice = formData['Giá vốn'] || 0;
                       const margin = 1.3; // 30% markup
                       updateFormData('Đơn giá', Math.round(costPrice * margin / 1000) * 1000);
                     }}
                     className="text-xs"
                   >
                     +30% lợi nhuận
                   </Button>
                   <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={() => {
                       const costPrice = formData['Giá vốn'] || 0;
                       const margin = 1.5; // 50% markup
                       updateFormData('Đơn giá', Math.round(costPrice * margin / 1000) * 1000);
                     }}
                     className="text-xs"
                   >
                     +50% lợi nhuận
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
                   {isEditMode ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm'}
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