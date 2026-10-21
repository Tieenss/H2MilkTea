'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import authUtils from '@/utils/authUtils';
import GoogleDriveUtils from '@/utils/googleDriveUtils';
import {
    Bell,
    Sun,
    Moon,
    LogOut,
    Menu,
    ChevronLeft,
    ChevronRight,
    User,
    ChevronDown,
    Package,
    AlertCircle,
    CheckCircle,
    Cloud,
    CloudOff,
    RefreshCw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    getStoredNotifications,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    getUnreadCount,
    type AppNotification,
} from '@/utils/notificationStore';

interface HeaderProps {
    onToggleSidebar: () => void;
    sidebarCollapsed: boolean;
    onMobileMenuToggle: () => void;
}

export function Header({ onToggleSidebar, sidebarCollapsed, onMobileMenuToggle }: HeaderProps) {
    const userData = authUtils.getUserData();
    const router = useRouter();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [googleDriveStatus, setGoogleDriveStatus] = useState<{
        connected: boolean;
        autoBackup: boolean;
        lastSync: string | null;
        needsSync: boolean;
    }>({
        connected: false,
        autoBackup: false,
        lastSync: null,
        needsSync: false
    });

    // Thêm kiểm tra userData ở đầu
    useEffect(() => {
        if (!userData) {
            router.push('/');
        }
    }, [userData, router]);

    // Đồng bộ danh sách thông báo từ store
    useEffect(() => {
        setNotifications(getStoredNotifications());

        const handleUpdate = () => {
            setNotifications(getStoredNotifications());
        };

        window.addEventListener('h2_notifications_updated', handleUpdate);
        window.addEventListener('storage', handleUpdate);
        return () => {
            window.removeEventListener('h2_notifications_updated', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, []);

    // Cập nhật thời gian thực
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Kiểm tra trạng thái Google Drive
    useEffect(() => {
        const checkGoogleDriveStatus = () => {
            const authInfo = GoogleDriveUtils.getAuthInfo();
            const isConnected = GoogleDriveUtils.isSignedIn();
            const needsSync = GoogleDriveUtils.shouldAutoSync();
            
            setGoogleDriveStatus({
                connected: isConnected,
                autoBackup: authInfo?.autoSyncEnabled || false,
                lastSync: authInfo?.lastSync || null,
                needsSync: needsSync && authInfo?.autoSyncEnabled
            });
        };

        checkGoogleDriveStatus();
        const statusTimer = setInterval(checkGoogleDriveStatus, 30000);
        return () => clearInterval(statusTimer);
    }, []);

    const handleLogout = () => {
        authUtils.logout();
        toast.success('Đăng xuất thành công!');
        window.location.href = '/';
    };

    // Nếu không có userData, return loading hoặc null
    if (!userData) {
        return (
            <div className="h-16 bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-40">
                <div className="flex items-center justify-center h-full">
                    <div className="text-gray-500">Đang tải...</div>
                </div>
            </div>
        );
    }

    const formatDate = (date: Date) => {
        const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const dayName = days[date.getDay()];
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        return `${dayName}, ${day}/${month}/${year}`;
    };

    const formatTime = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'warning':
                return 'text-amber-600 bg-amber-50';
            case 'success':
                return 'text-emerald-600 bg-emerald-50';
            case 'info':
                return 'text-blue-600 bg-blue-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    const getGoogleDriveStatusIcon = () => {
        if (!googleDriveStatus.connected) {
            return <CloudOff className="h-4 w-4 text-gray-400" />;
        }
        
        if (googleDriveStatus.needsSync) {
            return <RefreshCw className="h-4 w-4 text-orange-500 animate-pulse" />;
        }
        
        if (googleDriveStatus.autoBackup) {
            return <Cloud className="h-4 w-4 text-green-500" />;
        }
        
        return <Cloud className="h-4 w-4 text-blue-500" />;
    };

    const getGoogleDriveStatusText = () => {
        if (!googleDriveStatus.connected) {
            return 'Google Drive: Chưa kết nối';
        }
        
        if (googleDriveStatus.needsSync) {
            return 'Google Drive: Cần backup';
        }
        
        if (googleDriveStatus.autoBackup) {
            return 'Google Drive: Tự động backup';
        }
        
        return 'Google Drive: Đã kết nối';
    };

    const getGoogleDriveStatusColor = () => {
        if (!googleDriveStatus.connected) {
            return 'text-gray-600';
        }
        
        if (googleDriveStatus.needsSync) {
            return 'text-orange-600';
        }
        
        if (googleDriveStatus.autoBackup) {
            return 'text-green-600';
        }
        
        return 'text-blue-600';
    };

    const unreadCount = getUnreadCount(notifications);

    return (
        <div className="h-16 bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-40">
            <div className="flex items-center justify-between h-full px-3">
                {/* Left side */}
                <div className="flex items-center space-x-4">
                    {/* Mobile menu button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onMobileMenuToggle}
                        className="lg:hidden"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>

                    {/* Logo and title */}
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                            <img
                                src="/logo-h2.png"
                                alt="H2 MilkTea Logo"
                                className="w-10 h-10 object-cover rounded-full"
                            />
                        </div>
                        <div>
                            <span className="font-bold text-gray-800">H2 MilkTea</span>
                        </div>
                    </div>
                    {/* Desktop collapse button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleSidebar}
                        className="hidden lg:flex ml-2 transition-all duration-200"
                        title={sidebarCollapsed ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
                    >
                        {sidebarCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                        ) : (
                            <ChevronLeft className="h-4 w-4" />
                        )}
                    </Button>
                </div>

                {/* Right side */}
                <div className="flex items-center space-x-4">
                    {/* Google Drive Status */}
                    <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                         title={`${getGoogleDriveStatusText()}${googleDriveStatus.lastSync ? '\nLần sync cuối: ' + new Date(googleDriveStatus.lastSync).toLocaleString('vi-VN') : ''}`}
                         onClick={() => router.push('/settingdata')}>
                        {getGoogleDriveStatusIcon()}
                        <span className={`text-xs font-medium ${getGoogleDriveStatusColor()}`}>
                            {googleDriveStatus.connected ? (
                                googleDriveStatus.needsSync ? 'Cần sync' : (
                                    googleDriveStatus.autoBackup ? 'Auto backup' : 'Đã kết nối'
                                )
                            ) : 'Chưa kết nối'}
                        </span>
                    </div>

                    {/* Real-time clock */}
                    <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                        <span>{formatDate(currentTime)}</span>
                        <span className="font-mono font-semibold">{formatTime(currentTime)}</span>
                    </div>

                    {/* Quick Dark Mode Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={toggleQuickDarkMode}
                        className="transition-colors text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title={colorMode === 'dark' ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối (Dark Mode)'}
                    >
                        {colorMode === 'dark' ? (
                            <Sun className="h-5 w-5 text-amber-400 hover:rotate-45 transition-transform" />
                        ) : (
                            <Moon className="h-5 w-5 text-indigo-600 hover:-rotate-12 transition-transform" />
                        )}
                    </Button>

                                        {/* Notification dropdown (Mục #15: Chấm xanh unread, click điều hướng, dọn thông báo) */}
                    <DropdownMenu open={notificationDropdownOpen} onOpenChange={setNotificationDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative transition-all duration-200" title="Thông báo hệ thống">
                                <Bell className="h-5 w-5 text-gray-700" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white"></span>
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-96 p-0 shadow-2xl rounded-2xl border border-gray-200 overflow-hidden" sideOffset={8}>
                            {/* Header */}
                            <div className="px-4 py-3 border-b bg-gray-50/80">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <h3 className="font-bold text-gray-800 text-sm">Thông báo</h3>
                                        {unreadCount > 0 && (
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 text-xs font-semibold">
                                                {unreadCount} mới
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const updated = markAllAsRead();
                                                setNotifications(updated);
                                                toast.success('Đã đánh dấu đã đọc');
                                            }}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                        >
                                            Đã đọc hết
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const updated = clearAllNotifications();
                                                setNotifications(updated);
                                                toast.success('Đã dọn dẹp thông báo');
                                            }}
                                            className="text-xs text-gray-400 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                        >
                                            Dọn dẹp
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Notifications list */}
                            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 text-sm">
                                        Không có thông báo nào
                                    </div>
                                ) : (
                                    notifications.map((notification) => {
                                        const Icon = notification.type === 'warning' ? AlertCircle : notification.type === 'success' ? CheckCircle : Package;
                                        return (
                                            <div
                                                key={notification.id}
                                                className={`flex items-start space-x-3 p-3.5 hover:bg-gray-50/80 cursor-pointer transition-colors duration-150 ${
                                                    notification.unread ? 'bg-emerald-50/30' : ''
                                                }`}
                                                onClick={() => {
                                                    markAsRead(notification.id);
                                                    setNotificationDropdownOpen(false);
                                                    if (notification.route) {
                                                        router.push(notification.route);
                                                    }
                                                }}
                                            >
                                                <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${getNotificationColor(notification.type)}`}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-semibold text-gray-800 truncate">
                                                            {notification.title}
                                                        </p>
                                                        {notification.unread && (
                                                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full ml-2 flex-shrink-0 animate-pulse shadow-sm" title="Mới chưa đọc" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-600 mt-1 leading-relaxed line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                    <div className="flex items-center justify-between mt-2 pt-1">
                                                        <span className="text-[11px] text-gray-400">
                                                            {notification.time}
                                                        </span>
                                                        <span className="text-[11px] text-blue-600 font-medium hover:underline flex items-center">
                                                            {notification.actionLabel || 'Xem ngay'} &rarr;
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-4 py-2.5 border-t bg-gray-50/80">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setNotificationDropdownOpen(false);
                                        router.push('/notifications');
                                    }}
                                    className="w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                                >
                                    Xem và quản lý tất cả thông báo
                                </Button>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* User dropdown */}
                    <DropdownMenu open={userDropdownOpen} onOpenChange={setUserDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-50 transition-all duration-200">
                                <Avatar className="h-8 w-8 ring-2 ring-gray-100">
                                    <AvatarImage
                                        src={userData?.avatar || userData?.Image || ''}
                                        alt={userData?.username || 'User Avatar'}
                                        className="object-cover"
                                    />
                                    <AvatarFallback className="bg-gradient-to-br from-red-500 to-red-600 text-white text-sm font-semibold">
                                        {userData?.username?.charAt(0)?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="hidden lg:block text-left">
                                    <p className="text-sm font-medium text-gray-800">
                                        {userData?.['Họ và Tên'] || 'Người dùng'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {userData?.username || ''}
                                    </p>
                                </div>
                                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-80 p-0 overflow-hidden"
                            sideOffset={8}
                        >
                            {/* User info header */}
                            <div className="px-4 py-3 bg-gray-50 border-b">
                                <div className="flex items-center space-x-3">
                                    <Avatar className="h-12 w-12 ring-2 ring-white shadow-sm">
                                        <AvatarImage
                                            src={userData?.avatar || userData?.Image || ''}
                                            alt={userData?.username || 'User Avatar'}
                                            className="object-cover"
                                        />
                                        <AvatarFallback className="bg-gradient-to-br from-red-500 to-red-600 text-white text-lg font-semibold">
                                            {userData?.username?.charAt(0)?.toUpperCase() || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-800 truncate">
                                            {userData?.['Họ và Tên'] || 'Người dùng'}
                                        </p>
                                        <p className="text-sm text-gray-600 truncate">
                                            {userData?.['Email'] || ''}
                                        </p>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <Badge variant="outline" className="text-xs flex-shrink-0">
                                                <User className="h-3 w-3 mr-1" />
                                                {userData?.['Phân quyền'] || 'User'}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 flex-shrink-0">
                                                {userData?.['Chức vụ'] || ''}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Menu items */}
                            <div className="py-2">
                                <DropdownMenuItem
                                    className="mx-2 px-3 py-2 cursor-pointer focus:bg-gray-50 transition-colors duration-150 rounded-md"
                                    onClick={() => router.push('/profile')}
                                >
                                    <User className="h-4 w-4 mr-3 text-gray-500" />
                                    <span>Thông tin cá nhân</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-2" />

                                <DropdownMenuItem
                                    className="mx-2 px-3 py-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 transition-colors duration-150 rounded-md"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="h-4 w-4 mr-3" />
                                    <span>Đăng xuất</span>
                                </DropdownMenuItem>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}
