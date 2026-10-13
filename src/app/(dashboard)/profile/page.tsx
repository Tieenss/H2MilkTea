'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Pencil, Save, X, KeyRound, Shield, Camera, User,
    Mail, Building, Briefcase, Phone, MapPin, Activity,
    Calendar, FileText, Eye, EyeOff, Loader2,
    Edit, UserCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/DatePicker';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import authUtils from '@/utils/authUtils';

interface UserData {
    username: string;
    password: string;
    'Họ và Tên': string;
    'Chức vụ': string;
    'Phòng': string;
    'Email': string;
    'Image': string;
    'Phân quyền': string;
    'Quyền View': string;
    'Số điện thoại': string;
    'Địa chỉ': string;
    'Ngày sinh': string;
    'Ngày vào làm': string;
    'Ghi chú': string;
    [key: string]: any;
}

interface FormData {
    'Họ và Tên': string;
    'Chức vụ': string;
    'Phòng': string;
    'Email': string;
    'Image': string;
    'Quyền View': string;
    'Số điện thoại': string;
    'Địa chỉ': string;
    'Ngày sinh': string;
    'Ngày vào làm': string;
    'Ghi chú': string;
}

interface PasswordData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

// Loading Skeleton Components
const ProfileHeaderSkeleton = () => (
    <div className="animate-pulse">
        <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
    </div>
);

const ProfileCardSkeleton = () => (
    <Card className="shadow-sm animate-pulse">
        <CardHeader className="pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div className="h-6 bg-gray-200 rounded w-48"></div>
                <div className="h-9 bg-gray-200 rounded w-24"></div>
            </div>
        </CardHeader>
        <CardContent className="space-y-6">
            {/* Avatar Section Skeleton */}
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 pb-6 border-b">
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-200 rounded-full"></div>
                <div className="text-center sm:text-left">
                    <div className="h-7 bg-gray-200 rounded w-48 mb-2"></div>
                    <div className="h-5 bg-gray-200 rounded w-32 mb-1"></div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
            </div>

            {/* Form Fields Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-10 bg-gray-200 rounded w-full"></div>
                    </div>
                ))}
            </div>

            {/* Account Info Skeleton */}
            <div className="pt-6 border-t">
                <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-10 bg-gray-200 rounded w-full"></div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-10 bg-gray-200 rounded w-full"></div>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);

const SidebarSkeleton = () => (
    <div className="space-y-6">
        <Card className="shadow-sm animate-pulse">
            <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-32"></div>
            </CardHeader>
            <CardContent className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-10 bg-gray-200 rounded w-full"></div>
                ))}
            </CardContent>
        </Card>

        <Card className="shadow-sm animate-pulse">
            <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-32"></div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-6 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-6 bg-gray-200 rounded w-28"></div>
                </div>
            </CardContent>
        </Card>
    </div>
);

const ProfilePage: React.FC = () => {
    const router = useRouter();

    // States
    const [loading, setLoading] = useState<boolean>(true);
    const [editing, setEditing] = useState<boolean>(false);
    const [changePassword, setChangePassword] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    
    // Date states
    const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    
    // Refs
    const dropZoneRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState<FormData>({
        'Họ và Tên': '',
        'Chức vụ': '',
        'Phòng': '',
        'Email': '',
        'Image': '',
        'Quyền View': '',
        'Số điện thoại': '',
        'Địa chỉ': '',
        'Ngày sinh': '',
        'Ngày vào làm': '',
        'Ghi chú': ''
    });

    const [passwordData, setPasswordData] = useState<PasswordData>({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // Date parsing and formatting functions
    const parseDate = (dateString: string): Date | undefined => {
        if (!dateString) return undefined;
        try {
            // Nếu là format dd/mm/yyyy
            if (dateString.includes('/')) {
                const [day, month, year] = dateString.split('/');
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
            // Nếu là format yyyy-mm-dd
            if (dateString.includes('-')) {
                return new Date(dateString);
            }
            return new Date(dateString);
        } catch {
            return undefined;
        }
    };

    const formatDateToString = (date: Date | undefined): string => {
        if (!date) return '';
        return format(date, "dd/MM/yyyy", { locale: vi });
    };

    // Load user data
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setLoading(true);
                const localUser = authUtils.getUserData();
                if (!localUser || !localUser.username) {
                    toast.error('Phiên đăng nhập đã hết hạn');
                    router.push('/login');
                    return;
                }

                const response = await authUtils.getNhanVienById(localUser.username);
                
                if (!response || !Array.isArray(response) || response.length === 0) {
                    throw new Error('Không tìm thấy thông tin người dùng');
                }

                const user = response[0];
                setUserData(user);
                
                setFormData({
                    'Họ và Tên': user['Họ và Tên'] || '',
                    'Chức vụ': user['Chức vụ'] || '',
                    'Phòng': user['Phòng'] || '',
                    'Email': user['Email'] || '',
                    'Image': user['Image'] || '',
                    'Quyền View': user['Quyền View'] || '',
                    'Số điện thoại': user['Số điện thoại'] || '',
                    'Địa chỉ': user['Địa chỉ'] || '',
                    'Ngày sinh': user['Ngày sinh'] || '',
                    'Ngày vào làm': user['Ngày vào làm'] || '',
                    'Ghi chú': user['Ghi chú'] || ''
                });

                // Set dates
                setBirthDate(parseDate(user['Ngày sinh']));
                setStartDate(parseDate(user['Ngày vào làm']));
                setImagePreview(user['Image'] || '');
                
            } catch (error) {
                console.error('Error fetching user data:', error);
                toast.error('Không thể tải thông tin người dùng');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [router]);

    // Date change handlers
    const handleBirthDateChange = (date: Date | undefined) => {
        setBirthDate(date);
        setFormData(prev => ({
            ...prev,
            'Ngày sinh': formatDateToString(date)
        }));
    };

    const handleStartDateChange = (date: Date | undefined) => {
        setStartDate(date);
        setFormData(prev => ({
            ...prev,
            'Ngày vào làm': formatDateToString(date)
        }));
    };

    // Drag and drop handlers
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            const validation = authUtils.validateImage(file);

            if (!validation.isValid) {
                toast.error(validation.errors.join('\n'));
                return;
            }

            handleImageUpload(file);
        }
    };

    // Handle image upload
    const handleImageUpload = async (file: File) => {
        if (!file) return;

        try {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);

            setImageFile(file);

            const toastId = toast.loading("Đang tải ảnh lên...");
            const result = await authUtils.uploadImage(file);

            if (result && result.success && result.url) {
                setFormData(prev => ({
                    ...prev,
                    'Image': result.url
                }));
                setImagePreview(result.url);
                toast.success("Tải ảnh thành công", { id: toastId });
            } else {
                throw new Error("Không thể lấy URL ảnh");
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Lỗi khi tải ảnh: ' + (error as Error).message);
            setImagePreview(userData?.['Image'] || '');
        }
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validation = authUtils.validateImage(file);
        if (!validation.isValid) {
            toast.error(validation.errors.join('\n'));
            return;
        }

        await handleImageUpload(file);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = (): string[] => {
        const errors: string[] = [];
        if (!formData['Họ và Tên']) errors.push('Họ và tên không được để trống');
        if (!formData['Email']) errors.push('Email không được để trống');

        if (formData['Số điện thoại'] && !/^[0-9+\-\s()]+$/.test(formData['Số điện thoại'])) {
            errors.push('Số điện thoại không hợp lệ');
        }

        if (formData['Email'] && !/\S+@\S+\.\S+/.test(formData['Email'])) {
            errors.push('Email không hợp lệ');
        }

        return errors;
    };

    const handleSubmit = async () => {
        if (isSubmitting || !userData) return;

        try {
            setIsSubmitting(true);

            const errors = validateForm();
            if (errors.length > 0) {
                toast.error(errors.join('\n'));
                return;
            }

            let imageUrl = formData['Image'];

            // Handle image upload if new image
            if (imageFile) {
                const uploadToast = toast.loading('Đang tải ảnh lên...');
                try {
                    const uploadResult = await authUtils.uploadImage(imageFile);
                    if (uploadResult.success) {
                        imageUrl = uploadResult.url;
                        toast.success('Tải ảnh thành công', { id: uploadToast });
                    }
                } catch (error) {
                    console.error('Image upload error:', error);
                    toast.error('Không thể tải ảnh lên, nhưng vẫn tiếp tục lưu thông tin khác', { id: uploadToast });
                }
            }

            const updatedData = {
                ...userData,
                ...formData,
                'Image': imageUrl,
                username: userData.username,
                password: userData.password,
                'Phân quyền': userData['Phân quyền']
            } as UserData;

            const result = await authUtils.updateNhanVien(userData.username, updatedData);

            if (!Array.isArray(result) && result.success) {
                authUtils.saveAuthData(updatedData);
                toast.success('Cập nhật thông tin thành công');
                setEditing(false);
                setImageFile(null);
                setUserData(updatedData);
            } else {
                throw new Error((!Array.isArray(result) && result.message) || 'Cập nhật thất bại');
            }
        } catch (error: any) {
            console.error('Update profile error:', error);
            toast.error('Cập nhật thông tin thất bại: ' + (error.message || 'Lỗi không xác định'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePasswordSubmit = async () => {
        if (isChangingPassword || !userData) return;

        if (!passwordData.currentPassword) {
            toast.error('Vui lòng nhập mật khẩu hiện tại');
            return;
        }

        if (!passwordData.newPassword) {
            toast.error('Vui lòng nhập mật khẩu mới');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Mật khẩu mới không khớp');
            return;
        }

        if (passwordData.currentPassword !== userData.password) {
            toast.error('Mật khẩu hiện tại không đúng');
            return;
        }

        try {
            setIsChangingPassword(true);

            const updatedUser = {
                ...userData,
                password: passwordData.newPassword
            };

            const result = await authUtils.updateNhanVien(userData.username, updatedUser);

            if (!Array.isArray(result) && result.success) {
                authUtils.saveAuthData(updatedUser);
                setUserData(updatedUser);
                toast.success('Đổi mật khẩu thành công');
                setChangePassword(false);
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                });
            } else {
                throw new Error((!Array.isArray(result) && result.message) || 'Đổi mật khẩu thất bại');
            }
        } catch (error: any) {
            console.error('Password change error:', error);
            toast.error('Đổi mật khẩu thất bại: ' + (error.message || 'Lỗi không xác định'));
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleCancel = () => {
        if (!userData) return;
        
        setEditing(false);
        setImageFile(null);
        setImagePreview(userData['Image'] || '');
        setFormData({
            'Họ và Tên': userData['Họ và Tên'] || '',
            'Chức vụ': userData['Chức vụ'] || '',
            'Phòng': userData['Phòng'] || '',
            'Email': userData['Email'] || '',
            'Image': userData['Image'] || '',
            'Quyền View': userData['Quyền View'] || '',
            'Số điện thoại': userData['Số điện thoại'] || '',
            'Địa chỉ': userData['Địa chỉ'] || '',
            'Ngày sinh': userData['Ngày sinh'] || '',
            'Ngày vào làm': userData['Ngày vào làm'] || '',
            'Ghi chú': userData['Ghi chú'] || ''
        });
        
        // Reset dates
        setBirthDate(parseDate(userData['Ngày sinh']));
        setStartDate(parseDate(userData['Ngày vào làm']));
        
        toast.success('Đã hủy chỉnh sửa');
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // Get role badge color
    const getRoleBadgeVariant = (role: string): "default" | "destructive" | "outline" | "secondary" => {
        switch (role) {
            case 'Admin':
                return 'destructive';
            case 'Giám đốc':
                return 'default';
            case 'Quản lý':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    if (loading) {
        return (
            <div className="h-[calc(100vh-7rem)] py-6">
                <div className="mx-auto px-4 sm:px-6 lg:px-8">
                    <ProfileHeaderSkeleton />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <ProfileCardSkeleton />
                        </div>
                        <SidebarSkeleton />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="">
            <div className="mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Profile Card */}
                    <div className="lg:col-span-2">
                        <Card className="shadow-sm">
                            <CardHeader className="pb-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                                    <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
                                        <Edit className="mr-2 h-5 w-5 text-blue-600" />
                                        Thông tin cá nhân
                                    </CardTitle>
                                    <div className="flex space-x-2">
                                        {editing ? (
                                            <>
                                                <Button
                                                    onClick={handleCancel}
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isSubmitting}
                                                >
                                                    <X className="w-4 h-4 mr-2" />
                                                    Hủy
                                                </Button>
                                                <Button
                                                    onClick={handleSubmit}
                                                    size="sm"
                                                    disabled={isSubmitting}
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                >
                                                    {isSubmitting ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Đang lưu...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save className="w-4 h-4 mr-2" />
                                                            Lưu thay đổi
                                                        </>
                                                    )}
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                onClick={() => setEditing(true)}
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                <Pencil className="w-4 h-4 mr-2" />
                                                Chỉnh sửa
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Avatar Section */}
                                <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 pb-6 border-b">
                                    <div className="relative group">
                                        <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white shadow-lg">
                                            <AvatarImage
                                                src={imagePreview || formData['Image']}
                                                alt="Profile"
                                                className="object-cover"
                                            />
                                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl sm:text-4xl font-semibold">
                                                {formData['Họ và Tên']?.[0]?.toUpperCase() || userData?.username?.[0]?.toUpperCase() || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        {editing && (
                                            <div
                                                ref={dropZoneRef}
                                                onDragEnter={handleDragEnter}
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                onDrop={handleDrop}
                                                className={`absolute inset-0 flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 ${isDragging
                                                    ? 'bg-blue-500 bg-opacity-80'
                                                    : 'bg-black bg-opacity-50 opacity-0 group-hover:opacity-100'
                                                    }`}
                                            >
                                                <label className="cursor-pointer flex items-center justify-center w-full h-full">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleImageChange}
                                                        disabled={isSubmitting}
                                                    />
                                                    <Camera className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                                                </label>
                                            </div>
                                        )}
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white"></div>
                                    </div>
                                    <div className="text-center sm:text-left">
                                        <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">
                                            {formData['Họ và Tên'] || userData?.username}
                                        </h3>
                                        <p className="text-blue-600 font-medium mt-1">
                                            {formData['Chức vụ'] || 'Chưa cập nhật'}
                                        </p>
                                        <p className="text-gray-500 text-sm mt-1 flex items-center justify-center sm:justify-start">
                                            <User className="w-3 h-3 mr-1" />
                                            @{userData?.username}
                                        </p>
                                        <div className="mt-2 flex items-center justify-center sm:justify-start space-x-2">
                                            <Badge
                                                variant={getRoleBadgeVariant(userData?.['Phân quyền'] || '')}
                                                className="flex items-center"
                                            >
                                                <Shield className="w-3 h-3 mr-1" />
                                                {userData?.['Phân quyền'] || 'Nhân viên'}
                                            </Badge>
                                            {formData['Phòng'] && (
                                                <Badge variant="outline" className="flex items-center">
                                                    <Building className="w-3 h-3 mr-1" />
                                                    {formData['Phòng']}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Basic Information */}
                                <div>
                                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                        <User className="w-5 h-5 mr-2 text-blue-600" />
                                        Thông tin cơ bản
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                                                Họ và tên <span className="text-red-500">*</span>
                                            </Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input
                                                    id="name"
                                                    name="Họ và Tên"
                                                    value={formData['Họ và Tên']}
                                                    onChange={handleInputChange}
                                                    disabled={!editing || isSubmitting}
                                                    className="pl-10"
                                                    placeholder="Nhập họ và tên"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                                               Email <span className="text-red-500">*</span>
                                           </Label>
                                           <div className="relative">
                                               <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                               <Input
                                                   id="email"
                                                   name="Email"
                                                   type="email"
                                                   value={formData['Email']}
                                                   onChange={handleInputChange}
                                                   disabled={!editing || isSubmitting}
                                                   className="pl-10"
                                                   placeholder="Nhập email"
                                               />
                                           </div>
                                       </div>

                                       <div className="space-y-2">
                                           <Label htmlFor="position" className="text-sm font-medium text-gray-700">
                                               Chức vụ
                                           </Label>
                                           <div className="relative">
                                               <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                               <Input
                                                   id="position"
                                                   name="Chức vụ"
                                                   value={formData['Chức vụ']}
                                                   onChange={handleInputChange}
                                                   disabled={!editing || isSubmitting}
                                                   className="pl-10"
                                                   placeholder="Nhập chức vụ"
                                               />
                                           </div>
                                       </div>

                                       <div className="space-y-2">
                                           <Label htmlFor="department" className="text-sm font-medium text-gray-700">
                                               Phòng ban
                                           </Label>
                                           <div className="relative">
                                               <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                               <Input
                                                   id="department"
                                                   name="Phòng"
                                                   value={formData['Phòng']}
                                                   onChange={handleInputChange}
                                                   disabled={!editing || isSubmitting}
                                                   className="pl-10"
                                                   placeholder="Nhập phòng ban"
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
                                                   name="Số điện thoại"
                                                   type="tel"
                                                   value={formData['Số điện thoại']}
                                                   onChange={handleInputChange}
                                                   disabled={!editing || isSubmitting}
                                                   className="pl-10"
                                                   placeholder="Nhập số điện thoại"
                                               />
                                           </div>
                                       </div>

                                       <div className="space-y-2">
                                           <Label htmlFor="viewPermission" className="text-sm font-medium text-gray-700">
                                               Quyền xem
                                           </Label>
                                           <div className="relative">
                                               <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                               <Input
                                                   id="viewPermission"
                                                   name="Quyền View"
                                                   value={formData['Quyền View']}
                                                   onChange={handleInputChange}
                                                   disabled={true} // Không cho phép edit quyền từ profile
                                                   className="pl-10 bg-gray-50"
                                                   placeholder="Quyền được phân bởi Admin"
                                               />
                                           </div>
                                       </div>

                                       <div className="space-y-2">
                                           <Label htmlFor="birthDate" className="text-sm font-medium text-gray-700">
                                               Ngày sinh
                                           </Label>
                                           <div className="relative">
                                               <DatePicker
                                                   date={birthDate}
                                                   onDateChange={handleBirthDateChange}
                                                   disabled={!editing || isSubmitting}
                                                   placeholder="Chọn ngày sinh"
                                                   showMonthYearPicker={true}
                                               />
                                           </div>
                                       </div>

                                       <div className="space-y-2">
                                           <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                                               Ngày vào làm
                                           </Label>
                                           <div className="relative">
                                               <DatePicker
                                                   date={startDate}
                                                   onDateChange={handleStartDateChange}
                                                   disabled={!editing || isSubmitting}
                                                   placeholder="Chọn ngày vào làm"
                                                   showMonthYearPicker={true}
                                               />
                                           </div>
                                       </div>
                                   </div>
                               </div>

                               {/* Address and Notes */}
                               <div>
                                   <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                       <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                                       Thông tin bổ sung
                                   </h4>
                                   <div className="space-y-4">
                                       <div className="space-y-2">
                                           <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                                               Địa chỉ
                                           </Label>
                                           <div className="relative">
                                               <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                               <Textarea
                                                   id="address"
                                                   name="Địa chỉ"
                                                   value={formData['Địa chỉ']}
                                                   onChange={handleInputChange}
                                                   disabled={!editing || isSubmitting}
                                                   className="pl-10 resize-none"
                                                   rows={2}
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
                                                   name="Ghi chú"
                                                   value={formData['Ghi chú']}
                                                   onChange={handleInputChange}
                                                   disabled={!editing || isSubmitting}
                                                   className="pl-10 resize-none"
                                                   rows={3}
                                                   placeholder="Nhập ghi chú"
                                               />
                                           </div>
                                       </div>
                                   </div>
                               </div>

                               {/* Image Upload Area (when editing) */}
                               {editing && (
                                   <div className="pt-6 border-t">
                                       <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                           <Camera className="w-5 h-5 mr-2 text-blue-600" />
                                           Cập nhật ảnh đại diện
                                       </h4>
                                       <div
                                           ref={dropZoneRef}
                                           onDragEnter={handleDragEnter}
                                           onDragOver={handleDragOver}
                                           onDragLeave={handleDragLeave}
                                           onDrop={handleDrop}
                                           className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer hover:bg-gray-50 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                                               }`}
                                       >
                                           <div className="flex flex-col items-center">
                                               <div className="w-16 h-16 border rounded-full flex items-center justify-center bg-white overflow-hidden mb-3">
                                                   {imagePreview ? (
                                                       <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                   ) : (
                                                       <Camera className="h-8 w-8 text-gray-300" />
                                                   )}
                                               </div>
                                               <div className="text-sm text-gray-600 mb-2">
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
                                                   disabled={isSubmitting}
                                               />
                                               <p className="text-xs text-gray-400">PNG, JPG, GIF tối đa 5MB</p>
                                           </div>
                                       </div>
                                   </div>
                               )}
                           </CardContent>
                       </Card>
                   </div>

                   {/* Sidebar */}
                   <div className="space-y-6">
                       {/* Account Statistics */}
                       <Card className="shadow-sm">
                           <CardHeader>
                               <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                                   <Activity className="w-5 h-5 mr-2 text-blue-600" />
                                   Thống kê tài khoản
                               </CardTitle>
                           </CardHeader>
                           <CardContent className="space-y-4">
                               <div className="flex items-center justify-between">
                                   <span className="text-sm text-gray-600">Trạng thái:</span>
                                   <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                                       <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                       Đang hoạt động
                                   </Badge>
                               </div>
                               <div className="flex items-center justify-between">
                                   <span className="text-sm text-gray-600">Ngày tạo:</span>
                                   <span className="text-sm font-medium text-gray-900">
                                       {userData?.['Ngày vào làm'] || 'Chưa cập nhật'}
                                   </span>
                               </div>
                               <div className="flex items-center justify-between">
                                   <span className="text-sm text-gray-600">Quyền truy cập:</span>
                                   <Badge variant={getRoleBadgeVariant(userData?.['Phân quyền'] || '')}>
                                       {userData?.['Phân quyền'] || 'Nhân viên'}
                                   </Badge>
                               </div>
                               <div className="flex items-center justify-between">
                                   <span className="text-sm text-gray-600">Bộ phận:</span>
                                   <span className="text-sm font-medium text-gray-900">
                                       {formData['Phòng'] || 'Chưa cập nhật'}
                                   </span>
                               </div>
                           </CardContent>
                       </Card>

                       {/* Security Info */}
                       <Card className="shadow-sm">
                           <CardHeader>
                               <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                                   <Shield className="w-5 h-5 mr-2 text-blue-600" />
                                   Bảo mật
                               </CardTitle>
                           </CardHeader>
                           <CardContent className="space-y-4">
                               <div className="flex items-center justify-between">
                                   <span className="text-sm text-gray-600">Mật khẩu:</span>
                                   <div className="flex items-center">
                                       <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                       <span className="text-sm text-green-600">Bảo mật</span>
                                   </div>
                               </div>
                               <div className="flex items-center justify-between">
                                   <span className="text-sm text-gray-600">Xác thực 2FA:</span>
                                   <span className="text-sm text-gray-500">Chưa kích hoạt</span>
                               </div>
                               <Button
                                   onClick={() => setChangePassword(true)}
                                   size="sm"
                                   variant="outline"
                                   className="w-full"
                               >
                                   <KeyRound className="w-4 h-4 mr-2" />
                                   Thay đổi mật khẩu
                               </Button>
                           </CardContent>
                       </Card>
                   </div>
               </div>
           </div>

           {/* Change Password Modal */}
           <Dialog open={changePassword} onOpenChange={setChangePassword}>
               <DialogContent className="sm:max-w-md">
                   <DialogHeader>
                       <DialogTitle className="flex items-center">
                           <KeyRound className="w-5 h-5 mr-2 text-blue-600" />
                           Đổi mật khẩu
                       </DialogTitle>
                   </DialogHeader>
                   <div className="space-y-4 py-4">
                       <div className="space-y-2">
                           <Label htmlFor="currentPassword">
                               Mật khẩu hiện tại <span className="text-red-500">*</span>
                           </Label>
                           <div className="relative">
                               <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                               <Input
                                   id="currentPassword"
                                   name="currentPassword"
                                   type={showPassword ? 'text' : 'password'}
                                   className="pl-10 pr-10"
                                   value={passwordData.currentPassword}
                                   onChange={handlePasswordChange}
                                   disabled={isChangingPassword}
                                   placeholder="Nhập mật khẩu hiện tại"
                               />
                               <Button
                                   type="button"
                                   onClick={togglePasswordVisibility}
                                   variant="ghost"
                                   size="sm"
                                   className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                               >
                                   {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                               </Button>
                           </div>
                       </div>
                       <div className="space-y-2">
                           <Label htmlFor="newPassword">
                               Mật khẩu mới <span className="text-red-500">*</span>
                           </Label>
                           <div className="relative">
                               <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                               <Input
                                   id="newPassword"
                                   name="newPassword"
                                   type="password"
                                   className="pl-10"
                                   value={passwordData.newPassword}
                                   onChange={handlePasswordChange}
                                   disabled={isChangingPassword}
                                   placeholder="Nhập mật khẩu mới"
                               />
                           </div>
                           <p className="text-xs text-gray-500">
                               Mật khẩu phải có ít nhất 6 ký tự
                           </p>
                       </div>
                       <div className="space-y-2">
                           <Label htmlFor="confirmPassword">
                               Xác nhận mật khẩu <span className="text-red-500">*</span>
                           </Label>
                           <div className="relative">
                               <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                               <Input
                                   id="confirmPassword"
                                   name="confirmPassword"
                                   type="password"
                                   className="pl-10"
                                   value={passwordData.confirmPassword}
                                   onChange={handlePasswordChange}
                                   disabled={isChangingPassword}
                                   placeholder="Nhập lại mật khẩu mới"
                               />
                           </div>
                       </div>
                   </div>
                   <DialogFooter className="flex flex-col sm:flex-row gap-2">
                       <Button
                           onClick={() => {
                               setChangePassword(false);
                               setPasswordData({
                                   currentPassword: '',
                                   newPassword: '',
                                   confirmPassword: '',
                               });
                           }}
                           variant="outline"
                           disabled={isChangingPassword}
                           className="w-full sm:w-auto"
                       >
                           <X className="w-4 h-4 mr-2" />
                           Hủy
                       </Button>
                       <Button
                           onClick={handlePasswordSubmit}
                           disabled={isChangingPassword}
                           className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                       >
                           {isChangingPassword ? (
                               <>
                                   <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                   Đang xử lý...
                               </>
                           ) : (
                               <>
                                   <Save className="w-4 h-4 mr-2" />
                                   Xác nhận
                               </>
                           )}
                       </Button>
                   </DialogFooter>
               </DialogContent>
           </Dialog>
       </div>
   );
};

export default ProfilePage;