'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { navigation, NavigationItem } from '@/lib/navigation';
import authUtils from '@/utils/authUtils';
import { TodayOrdersBadge } from '@/components/TodayOrdersBadge';
import { toast } from 'react-hot-toast';
import {
    getFeatureBadge,
    recordFeatureVisit,
    resetFeatureTracker,
    getDeviceFeatureState,
    type DeviceFeatureState,
} from '@/utils/featureTracker';

interface SidebarProps {
    collapsed: boolean;
    mobileOpen: boolean;
    onMobileClose: () => void;
    className?: string;
}

export function Sidebar({ collapsed, mobileOpen, onMobileClose, className }: SidebarProps) {
    const pathname = usePathname();
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [deviceFeatureState, setDeviceFeatureState] = useState<DeviceFeatureState>(getDeviceFeatureState());

    // Cập nhật trạng thái tính năng khi chuyển trang (Mục #8)
    useEffect(() => {
        if (pathname) {
            const nextState = recordFeatureVisit(pathname);
            setDeviceFeatureState(nextState);
        }
    }, [pathname]);

    // Lắng nghe sự kiện cập nhật trạng thái tính năng trên máy
    useEffect(() => {
        const handleUpdate = () => {
            setDeviceFeatureState(getDeviceFeatureState());
        };
        window.addEventListener('h2_feature_state_updated', handleUpdate);
        window.addEventListener('storage', handleUpdate);
        return () => {
            window.removeEventListener('h2_feature_state_updated', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, []);

    useEffect(() => {
        const loadUserPermissions = () => {
            try {
                const userData = authUtils.getUserData();
                if (userData) {
                    const permissions = userData['Quyền View'] || '';
                    const userRole = userData['Phân quyền'] || '';
                    
                    setIsAdmin(userRole === 'Admin');
                    
                    if (userRole === 'Admin') {
                        // Admin có quyền xem tất cả
                        const allItems = getAllNavigationItems(navigation);
                        setUserPermissions(allItems.map(item => item.name));
                    } else {
                        // Người dùng khác chỉ xem theo quyền được cấp
                        const permissionList = permissions.split(',')
                            .map((item: string) => item.trim())
                            .filter(Boolean);
                        setUserPermissions(permissionList);
                    }
                } else {
                    // Nếu không có userData, set permissions rỗng
                    setUserPermissions([]);
                    setIsAdmin(false);
                }
            } catch (error) {
                console.error('Error loading user permissions:', error);
                setUserPermissions([]);
                setIsAdmin(false);
            } finally {
                setIsLoading(false);
            }
        };

        loadUserPermissions();
    }, []);

    // Auto-expand groups that contain active item
    useEffect(() => {
        const activeGroup = navigation.find(item => 
            item.isGroup && (item.children?.some(child => child.href === pathname) || item.href === pathname)
        );
        
        if (activeGroup && !collapsed) {
            setExpandedGroups(prev => new Set([...prev, activeGroup.name]));
        }
    }, [pathname, collapsed]);

    // Hàm lấy tất cả items (bao gồm cả children)
    const getAllNavigationItems = (items: NavigationItem[]): NavigationItem[] => {
        const allItems: NavigationItem[] = [];
        items.forEach(item => {
            if (!item.isGroup) {
                allItems.push(item);
            }
            if (item.children) {
                allItems.push(...getAllNavigationItems(item.children));
            }
        });
        return allItems;
    };

    // Hàm kiểm tra user có quyền xem item không
    const hasPermission = (item: NavigationItem): boolean => {
        if (isAdmin) return true;
        if (!item.name) return false;
        return userPermissions.includes(item.name);
    };

    // Lọc navigation items
    const filterNavigationItems = (items: NavigationItem[]): NavigationItem[] => {
        if (isLoading) return [];
        
        return items
            .filter(item => {
                if (!item.sidebar) return false;
                
                if (item.isGroup && item.children) {
                    // Kiểm tra xem group có children được phép xem không
                    const filteredChildren = item.children.filter(child => 
                        child.sidebar && hasPermission(child)
                    );
                    return filteredChildren.length > 0;
                }
                
                return hasPermission(item);
            })
            .map(item => {
                if (item.isGroup && item.children) {
                    return {
                        ...item,
                        children: item.children.filter(child => 
                            child.sidebar && hasPermission(child)
                        )
                    };
                }
                return item;
            });
    };

    const sidebarItems = filterNavigationItems(navigation);

    const toggleGroup = (groupName: string) => {
        if (collapsed) return; // Không toggle khi collapsed
        
        setExpandedGroups(prev => {
            const newExpanded = new Set(prev);
            if (newExpanded.has(groupName)) {
                newExpanded.delete(groupName);
            } else {
                newExpanded.add(groupName);
            }
            return newExpanded;
        });
    };

    const renderNavigationItem = (item: NavigationItem, level = 0) => {
        if (!item.icon) return null;
        
        const Icon = item.icon;
        
        if (item.isGroup && item.children && item.children.length > 0) {
            const isExpanded = expandedGroups.has(item.name);
            const showChildren = !collapsed && isExpanded;
            const hasActiveChild = item.children.some(child => child.href === pathname);
            
            return (
                <div key={item.name} className="relative">
                    {/* Group Header (Hỗ trợ click vào Hub hoặc toggle con - Mục #6) */}
                    <div
                        className={cn(
                            "w-full flex items-center rounded-lg text-sm font-medium transition-all duration-200 ease-in-out group relative",
                            collapsed ? "px-2 py-2 justify-center" : "px-2 py-1.5",
                            (hasActiveChild || (item.href && pathname === item.href))
                                ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold" 
                                : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/90 hover:text-gray-900 dark:hover:text-white"
                        )}
                        title={collapsed ? item.name : undefined}
                    >
                        {item.href ? (
                            <Link
                                href={item.href}
                                onClick={onMobileClose}
                                className={cn(
                                    "flex items-center flex-1 min-w-0 transition-colors",
                                    collapsed ? "justify-center" : "gap-3 py-1"
                                )}
                            >
                                <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                                    <Icon className={cn(
                                        "h-4 w-4 transition-colors duration-200",
                                        (hasActiveChild || (item.href && pathname === item.href)) ? "text-indigo-600" : "text-gray-500"
                                    )} />
                                </div>
                                {!collapsed && (
                                    <span className="flex-1 text-left truncate">
                                        {item.name}
                                    </span>
                                )}
                            </Link>
                        ) : (
                            <button
                                type="button"
                                onClick={() => toggleGroup(item.name)}
                                className={cn(
                                    "flex items-center flex-1 min-w-0 text-left",
                                    collapsed ? "justify-center" : "gap-3 py-1"
                                )}
                            >
                                <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                                    <Icon className="h-4 w-4 text-gray-500" />
                                </div>
                                {!collapsed && (
                                    <span className="flex-1 text-left truncate">
                                        {item.name}
                                    </span>
                                )}
                            </button>
                        )}

                        {!collapsed && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleGroup(item.name);
                                }}
                                className="p-1 text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-slate-700/70 rounded-md transition-colors ml-1"
                                title={isExpanded ? "Thu gọn danh mục" : "Mở rộng danh mục"}
                                aria-label="Toggle group"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200" />
                                ) : (
                                    <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200" />
                                )}
                            </button>
                        )}
                    </div>

                    {/* Group Children */}
                    {showChildren && (
                        <div className="ml-4 space-y-1 mt-1 animate-in slide-in-from-top-1 duration-200">
                            {item.children.map(child => renderNavigationItem(child, level + 1))}
                        </div>
                    )}

                    {/* Tooltip for collapsed group */}
                    {collapsed && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[99999] pointer-events-none shadow-xl min-w-max max-w-xs">
                            <div className="font-medium mb-2">{item.name}</div>
                            {item.children && item.children.length > 0 && (
                                <div className="space-y-1">
                                    {item.children.map(child => {
                                        const childBadge = getFeatureBadge(child.href, deviceFeatureState);
                                        return (
                                            <Link
                                                key={child.name}
                                                href={child.href || '#'}
                                                onClick={onMobileClose}
                                                className={cn(
                                                    "flex items-center text-xs py-1 px-2 rounded hover:bg-gray-800 transition-colors pointer-events-auto",
                                                    pathname === child.href 
                                                        ? "bg-blue-600 text-white" 
                                                        : "text-gray-300 hover:text-white"
                                                )}
                                            >
                                                <child.icon className="h-3 w-3 mr-2 flex-shrink-0" />
                                                <span className="flex-1">{child.name}</span>
                                                {child.name === 'Đơn hàng' ? (
                                                    <TodayOrdersBadge />
                                                ) : childBadge ? (
                                                    <span className={cn(
                                                        "ml-2 px-1.5 py-0.5 text-[9px] font-bold rounded-full shadow-sm",
                                                        childBadge.className
                                                    )}>
                                                        {childBadge.label}
                                                    </span>
                                                ) : child.badge ? (
                                                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                                                        {child.badge}
                                                    </span>
                                                ) : null}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                        </div>
                    )}
                </div>
            );
        }

        // Regular menu item
        if (!item.href) return null;
        
        const isActive = pathname === item.href;
        const itemBadge = getFeatureBadge(item.href, deviceFeatureState);
        
        return (
            <div key={item.name} className="relative">
                <Link
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                        "flex items-center rounded-lg text-sm font-medium transition-all duration-200 ease-in-out group relative",
                        collapsed ? "px-2 py-2 justify-center" : "px-3 py-2 space-x-3",
                        level > 0 && !collapsed ? "pl-2" : "",
                        isActive
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/90 hover:text-gray-900 dark:hover:text-white"
                    )}
                    title={collapsed ? item.name : undefined}
                >
                    <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                        <Icon className={cn(
                            "h-4 w-4 transition-colors duration-200",
                            isActive ? "text-white" : ""
                        )} />
                    </div>
                    
                    {!collapsed && (
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5">
                            <span className="truncate text-xs font-medium">
                                {item.name}
                            </span>
                            {item.name === 'Đơn hàng' ? (
                                <div className="shrink-0"><TodayOrdersBadge /></div>
                            ) : itemBadge ? (
                                <span className={cn(
                                    "shrink-0 px-1.5 py-0.5 text-[9.5px] font-bold rounded-full shadow-xs leading-none",
                                    itemBadge.className
                                )}>
                                    {itemBadge.label}
                                </span>
                            ) : item.badge ? (
                                <span className={cn(
                                    "shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded-full leading-none",
                                    isActive 
                                        ? "bg-white text-indigo-600" 
                                        : "bg-red-500 text-white"
                                )}>
                                    {item.badge}
                                </span>
                            ) : null}
                        </div>
                    )}
                </Link>

                {/* Tooltip for collapsed item */}
                {collapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[99999] pointer-events-none shadow-xl">
                        <div className="flex items-center">
                            {item.name}
                            {item.name === 'Đơn hàng' ? (
                                <TodayOrdersBadge />
                            ) : itemBadge ? (
                                <span className={cn(
                                    "ml-2 px-1.5 py-0.5 text-[9px] font-bold rounded-full",
                                    itemBadge.className
                                )}>
                                    {itemBadge.label}
                                </span>
                            ) : item.badge ? (
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                                    {item.badge}
                                </span>
                            ) : null}
                        </div>
                        {item.description && (
                            <div className="mt-1 text-xs text-gray-300">
                                {item.description}
                            </div>
                        )}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                    </div>
                )}
            </div>
        );
    };

    // Loading state
    if (isLoading) {
        return (
            <div
                className={cn(
                    "fixed top-16 left-0 bottom-0 z-30 flex flex-col bg-white border-r border-gray-200 shadow-sm transition-all duration-300 ease-in-out",
                    collapsed ? "w-16" : "w-64",
                    mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
                    className
                )}
            >
                <div className="p-4 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    onClick={onMobileClose}
                />
            )}

            {/* Sidebar */}
            <div
                className={cn(
                    "fixed top-16 left-0 bottom-0 z-30 flex flex-col bg-white border-r border-gray-200 shadow-sm transition-all duration-300 ease-in-out",
                    collapsed ? "w-16" : "w-64",
                    mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
                    className
                )}
            >
                {/* Mobile close button */}
                <div className="lg:hidden absolute top-4 right-4 z-40">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onMobileClose}
                        className="h-8 w-8"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Navigation */}
                <nav className={cn(
                    "flex-1 p-4 space-y-1",
                    "overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                )}>
                    {sidebarItems.length > 0 ? (
                        sidebarItems.map(item => renderNavigationItem(item))
                    ) : (
                        <div className="text-center text-gray-500 text-sm py-8">
                            {collapsed ? (
                                <div className="flex justify-center">
                                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <X className="h-4 w-4" />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="text-gray-400 mb-2">Không có menu</div>
                                    <div className="text-xs text-gray-400">
                                        Bạn chưa được cấp quyền truy cập
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </nav>

                {/* Machine Feature State Control (Mục #8) */}
                {!collapsed && (
                    <div className="p-3 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            <span className="text-[11px] text-gray-500 font-medium">Theo máy này</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                resetFeatureTracker();
                                toast.success('Đã reset toàn bộ trạng thái tính năng về mặc định!');
                            }}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold hover:underline flex items-center gap-1"
                            title="Khôi phục trạng thái Hot/Mới/Gần đây ban đầu cho máy này"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset chức năng
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
