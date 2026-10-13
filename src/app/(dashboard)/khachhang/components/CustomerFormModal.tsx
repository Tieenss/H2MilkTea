// components/CustomerFormModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, Mail, MapPin, Calendar, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { CUSTOMER_TYPES, CUSTOMER_STATUS, GENDER_OPTIONS, INITIAL_CUSTOMER_FORM } from '../utils/customerConstants';
import { validateCustomerData } from '../utils/customerFormatters';
import type { Customer, CustomerFormData } from '../types/customer';

interface CustomerFormModalProps {
 customer?: Customer | null;
 isOpen: boolean;
 onClose: () => void;
 onSubmit: (data: CustomerFormData) => Promise<void>;
 isEditing?: boolean;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
 customer,
 isOpen,
 onClose,
 onSubmit,
 isEditing = false
}) => {
 const [formData, setFormData] = useState<CustomerFormData>(INITIAL_CUSTOMER_FORM);
 const [loading, setLoading] = useState(false);
 const [errors, setErrors] = useState<string[]>([]);

 // Initialize form data
 useEffect(() => {
   if (isEditing && customer) {
     setFormData({
       'Tên khách hàng': customer['Tên khách hàng'] || '',
       'Số điện thoại': customer['Số điện thoại'] || '',
       'Email': customer['Email'] || '',
       'Địa chỉ': customer['Địa chỉ'] || '',
       'Ngày sinh': customer['Ngày sinh'] || '',
       'Giới tính': customer['Giới tính'] || 'Nam',
       'Loại khách hàng': customer['Loại khách hàng'] || 'Khách thường',
       'Điểm tích lũy': Number(customer['Điểm tích lũy']) || 0,
       'Ghi chú': customer['Ghi chú'] || '',
       'Trạng thái': customer['Trạng thái'] || 'Hoạt động',
       'Ưu đãi hiện tại': customer['Ưu đãi hiện tại'] || ''
     });
   } else {
     setFormData(INITIAL_CUSTOMER_FORM);
   }
   setErrors([]);
 }, [customer, isEditing, isOpen]);

 const handleInputChange = (field: keyof CustomerFormData, value: string | number) => {
   setFormData(prev => ({
     ...prev,
     [field]: value
   }));
   
   // Clear errors when user starts typing
   if (errors.length > 0) {
     setErrors([]);
   }
 };

 const handleSubmit = async (e: React.FormEvent) => {
   e.preventDefault();
   
   // Validate form
   const validationErrors = validateCustomerData(formData);
   if (validationErrors.length > 0) {
     setErrors(validationErrors);
     return;
   }

   try {
     setLoading(true);
     await onSubmit(formData);
     onClose();
     
     // Reset form
     setFormData(INITIAL_CUSTOMER_FORM);
     setErrors([]);
   } catch (error) {
     console.error('Error submitting customer form:', error);
   } finally {
     setLoading(false);
   }
 };

 const handleClose = () => {
   if (!loading) {
     onClose();
     setFormData(INITIAL_CUSTOMER_FORM);
     setErrors([]);
   }
 };

 return (
   <Dialog open={isOpen} onOpenChange={handleClose}>
     <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
       <DialogHeader>
         <DialogTitle className="text-xl font-bold flex items-center">
           <User className="mr-2 h-5 w-5" />
           {isEditing ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
         </DialogTitle>
       </DialogHeader>

       <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto max-h-[70vh] pr-2">
         {/* Error Messages */}
         {errors.length > 0 && (
           <div className="bg-red-50 border border-red-200 rounded-md p-4">
             <h4 className="text-sm font-medium text-red-800 mb-2">Có lỗi xảy ra:</h4>
             <ul className="text-sm text-red-600 space-y-1">
               {errors.map((error, index) => (
                 <li key={index}>• {error}</li>
               ))}
             </ul>
           </div>
         )}

         {/* Basic Information */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="space-y-2">
             <Label htmlFor="name" className="flex items-center">
               <User className="w-4 h-4 mr-1" />
               Tên khách hàng *
             </Label>
             <Input
               id="name"
               value={formData['Tên khách hàng']}
               onChange={(e) => handleInputChange('Tên khách hàng', e.target.value)}
               placeholder="Nhập tên khách hàng"
               required
             />
           </div>

           <div className="space-y-2">
             <Label htmlFor="phone" className="flex items-center">
               <Phone className="w-4 h-4 mr-1" />
               Số điện thoại *
             </Label>
             <Input
               id="phone"
               value={formData['Số điện thoại']}
               onChange={(e) => handleInputChange('Số điện thoại', e.target.value)}
               placeholder="Nhập số điện thoại"
               required
             />
           </div>

           <div className="space-y-2">
             <Label htmlFor="email" className="flex items-center">
               <Mail className="w-4 h-4 mr-1" />
               Email
             </Label>
             <Input
               id="email"
               type="email"
               value={formData['Email']}
               onChange={(e) => handleInputChange('Email', e.target.value)}
               placeholder="Nhập email"
             />
           </div>

           <div className="space-y-2">
             <Label htmlFor="gender">Giới tính</Label>
             <Select
               value={formData['Giới tính']}
               onValueChange={(value) => handleInputChange('Giới tính', value)}
             >
               <SelectTrigger>
                 <SelectValue placeholder="Chọn giới tính" />
               </SelectTrigger>
               <SelectContent>
                 {GENDER_OPTIONS.map(option => (
                   <SelectItem key={option.value} value={option.value}>
                     {option.label}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>

           <div className="space-y-2">
             <Label htmlFor="birthDate" className="flex items-center">
               <Calendar className="w-4 h-4 mr-1" />
               Ngày sinh
             </Label>
             <Input
               id="birthDate"
               type="date"
               value={formData['Ngày sinh']}
               onChange={(e) => handleInputChange('Ngày sinh', e.target.value)}
             />
           </div>

           <div className="space-y-2">
             <Label htmlFor="customerType">Loại khách hàng</Label>
             <Select
               value={formData['Loại khách hàng']}
               onValueChange={(value) => handleInputChange('Loại khách hàng', value)}
             >
               <SelectTrigger>
                 <SelectValue placeholder="Chọn loại khách hàng" />
               </SelectTrigger>
               <SelectContent>
                 {CUSTOMER_TYPES.map(type => (
                   <SelectItem key={type.value} value={type.value}>
                     {type.label}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
         </div>

         {/* Address */}
         <div className="space-y-2">
           <Label htmlFor="address" className="flex items-center">
             <MapPin className="w-4 h-4 mr-1" />
             Địa chỉ
           </Label>
           <Textarea
             id="address"
             value={formData['Địa chỉ']}
             onChange={(e) => handleInputChange('Địa chỉ', e.target.value)}
             placeholder="Nhập địa chỉ"
             rows={2}
           />
         </div>

         {/* Loyalty & Status */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {isEditing && (
             <div className="space-y-2">
               <Label htmlFor="points" className="flex items-center">
                 <Gift className="w-4 h-4 mr-1" />
                 Điểm tích lũy
               </Label>
               <Input
                 id="points"
                 type="number"
                 min="0"
                 value={formData['Điểm tích lũy']}
                 onChange={(e) => handleInputChange('Điểm tích lũy', Number(e.target.value))}
                 placeholder="Nhập điểm tích lũy"
               />
             </div>
           )}

           <div className="space-y-2">
             <Label htmlFor="status">Trạng thái</Label>
             <Select
               value={formData['Trạng thái']}
               onValueChange={(value) => handleInputChange('Trạng thái', value)}
             >
               <SelectTrigger>
                 <SelectValue placeholder="Chọn trạng thái" />
               </SelectTrigger>
               <SelectContent>
                 {CUSTOMER_STATUS.map(status => (
                   <SelectItem key={status.value} value={status.value}>
                     {status.label}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
         </div>

         {/* Current Offers */}
         <div className="space-y-2">
           <Label htmlFor="offers">Ưu đãi hiện tại</Label>
           <Textarea
             id="offers"
             value={formData['Ưu đãi hiện tại']}
             onChange={(e) => handleInputChange('Ưu đãi hiện tại', e.target.value)}
             placeholder="Nhập ưu đãi hiện tại cho khách hàng"
             rows={2}
           />
         </div>

         {/* Notes */}
         <div className="space-y-2">
           <Label htmlFor="notes">Ghi chú</Label>
           <Textarea
             id="notes"
             value={formData['Ghi chú']}
             onChange={(e) => handleInputChange('Ghi chú', e.target.value)}
             placeholder="Nhập ghi chú về khách hàng (sở thích, yêu cầu đặc biệt...)"
             rows={3}
           />
         </div>

         {/* Submit Buttons */}
         <div className="flex justify-end space-x-3 pt-4 border-t">
           <Button
             type="button"
             variant="outline"
             onClick={handleClose}
             disabled={loading}
           >
             Hủy
           </Button>
           <Button
             type="submit"
             disabled={loading}
             className="bg-blue-600 hover:bg-blue-700"
           >
             {loading ? (
               <div className="flex items-center">
                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                 Đang xử lý...
               </div>
             ) : (
               <div className="flex items-center">
                 <Save className="w-4 h-4 mr-2" />
                 {isEditing ? 'Cập nhật' : 'Thêm mới'}
               </div>
             )}
           </Button>
         </div>
       </form>
     </DialogContent>
   </Dialog>
 );
};