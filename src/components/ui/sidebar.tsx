'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    X,
    ChevronDown,
    ChevronRight,
    RotateCcw,
    HelpCircle,
    Search,
    Sparkles,
    CheckCircle2,
    ShieldCheck,
    Compass
} from 'lucide-react';
import {
    navigation,
    NAVIGATION_SECTIONS,
    findActiveNavigationContext,
    type NavigationItem,
    type NavigationSectionId
} from '@/lib/navigation';
import { useFeatureFlags } from '@/lib/settings/useFeatureFlags';
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

interface HoverCardState {
    item: NavigationItem;
    parentGroup?: NavigationItem | null;
    top: number;
    left: number;
}

export function Sidebar({ collapsed, mobileOpen, onMobileClose, className }: SidebarProps) {
    const pathname = usePathname();
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['POS & Bán hàng']));
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deviceFeatureState, setDeviceFeatureState] = useState<DeviceFeatureState>(getDeviceFeatureState());
    const [hoverCard, setHoverCard] = useState<HoverCardState | null>(null);
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useFeatureFlags();

    // Xác định ngữ cảnh trang đang mở
    const activeContext = useMemo(() => findActiveNavigationContext(pathname), [pathname]);

    // Cập nhật trạng thái tính năng khi chuyển trang (Mục #8) + đóng hover card
    useEffect(() => {
        setHoverCard(null);
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
                        const allItems = getAllNavigationItems(navigation);
                        setUserPermissions(allItems.map(item => item.name));
                    } else {
                        const permissionList = permissions.split(',')
                            .map((item: string) => item.trim())
                            .filter(Boolean);
                        setUserPermissions(permissionList);
                    }
                } else {
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

    // Tự động bung mở nhóm đang chứa chức năng đang chọn
    useEffect(() => {
        if (activeContext.parentGroup && !collapsed) {
            setExpandedGroups(prev => new Set([...prev, activeContext.parentGroup!.name]));
        }
    }, [activeContext.parentGroup, collapsed]);

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

    const hasPermission = (item: NavigationItem): boolean => {
        if (isAdmin) return true;
        if (!item.name) return false;
        return userPermissions.includes(item.name);
    };

    const isItemActive = (item: NavigationItem): boolean => {
        if (!pathname || !item.href) return false;
        const cleanPath = pathname.split('?')[0];
        if (cleanPath === item.href) return true;
        if (item.href !== '/dashboard' && cleanPath.startsWith(item.href + '/')) return true;
        return false;
    };

    // Lọc các mục theo phân quyền và từ khóa tìm kiếm nhanh trên Sidebar
    const filteredSidebarItems = useMemo(() => {
        if (isLoading) return [];
        const q = searchQuery.trim().toLowerCase();

        return navigation
            .filter(item => {
                if (!item.sidebar) return false;

                if (item.isGroup && item.children) {
                    const permittedChildren = item.children.filter(child => child.sidebar && hasPermission(child));
                    if (permittedChildren.length === 0) return false;

                    if (!q) return true;
                    const groupMatch =
                        item.name.toLowerCase().includes(q) ||
                        (item.description || '').toLowerCase().includes(q);
                    const childMatch = permittedChildren.some(
                        c =>
                            c.name.toLowerCase().includes(q) ||
                            (c.description || '').toLowerCase().includes(q)
                    );
                    return groupMatch || childMatch;
                }

                if (!hasPermission(item)) return false;
                if (!q) return true;
                return (
                    item.name.toLowerCase().includes(q) ||
                    (item.description || '').toLowerCase().includes(q)
                );
            })
            .map(item => {
                if (item.isGroup && item.children) {
                    const permittedChildren = item.children.filter(child => child.sidebar && hasPermission(child));
                    if (!q) {
                        return { ...item, children: permittedChildren };
                    }
                    const groupMatch = item.name.toLowerCase().includes(q);
                    return {
                        ...item,
                        children: groupMatch
                            ? permittedChildren
                            : permittedChildren.filter(
                                  c =>
                                      c.name.toLowerCase().includes(q) ||
                                      (c.description || '').toLowerCase().includes(q)
                              )
                    };
                }
                return item;
            });
    }, [isLoading, isAdmin, userPermissions, searchQuery]);

    // Gom theo 3 Phân khu: Vận hành chính ('core'), Quản lý & Kho ('management'), Hệ thống & Cài đặt ('system')
    const groupedBySection = useMemo(() => {
        return NAVIGATION_SECTIONS.map(sec => ({
            section: sec,
            items: filteredSidebarItems.filter(item => (item.section || 'core') === sec.id)
        })).filter(group => group.items.length > 0);
    }, [filteredSidebarItems]);

    const toggleGroup = (groupName: string) => {
        if (collapsed) return;
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupName)) {
                next.delete(groupName);
            } else {
                next.add(groupName);
            }
            return next;
        });
    };

    // Quản lý hiển thị Smart Floating Hover Card (không bị cắt bởi overflow-y-auto)
    const handleMouseEnterItem = (
        e: React.MouseEvent<HTMLElement>,
        item: NavigationItem,
        parentGroup?: NavigationItem | null
    ) => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const sidebarWidth = collapsed ? 64 : 256;
        const maxTop = typeof window !== 'undefined' ? Math.max(72, window.innerHeight - 310) : rect.top;
        const safeTop = Math.min(Math.max(68, rect.top - 6), maxTop);

        setHoverCard({
            item,
            parentGroup: parentGroup || null,
            top: safeTop,
            left: Math.max(rect.right + 10, sidebarWidth + 10)
        });
    };

    const handleMouseLeaveItem = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = setTimeout(() => {
            setHoverCard(null);
        }, 130);
    };

    const handleMouseEnterHoverCard = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
    };

    const renderNavigationItem = (item: NavigationItem, level = 0, parentGroup?: NavigationItem) => {
        if (!item.icon) return null;
        const Icon = item.icon;

        // 1. RENDER MỤC NHÓM CHÍNH (PARENT GROUP)
        if (item.isGroup && item.children && item.children.length > 0) {
            const isSearching = searchQuery.trim().length > 0;
            const isExpanded = isSearching || expandedGroups.has(item.name);
            const showChildren = !collapsed && isExpanded;
            const hasActiveChild = item.children.some(child => isItemActive(child));
            const isGroupSelfActive = Boolean(item.href && pathname === item.href);
            const isGroupHighlighted = hasActiveChild || isGroupSelfActive;

            return (
                <div key={item.name} className="relative">
                    <div
                        onMouseEnter={(e) => handleMouseEnterItem(e, item, null)}
                        onMouseLeave={handleMouseLeaveItem}
                        className={cn(
                            "w-full flex items-center rounded-xl text-sm transition-all duration-200 ease-in-out group relative select-none",
                            collapsed ? "px-2 py-2.5 justify-center" : "px-2.5 py-2",
                            isGroupHighlighted
                                ? "bg-indigo-50/95 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 font-bold border border-indigo-200/80 dark:border-indigo-800/70 shadow-2xs"
                                : "text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100/90 dark:hover:bg-slate-800/80"
                        )}
                    >
                        {/* Thanh chỉ báo dọc bên trái khi Nhóm đang có chức năng con được chọn */}
                        {isGroupHighlighted && (
                            <span
                                className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-600 dark:bg-indigo-400 rounded-r-full"
                                aria-hidden="true"
                            />
                        )}

                        <button
                            type="button"
                            onClick={() => toggleGroup(item.name)}
                            className={cn(
                                "flex items-center flex-1 min-w-0 text-left cursor-pointer",
                                collapsed ? "justify-center" : "gap-2.5"
                            )}
                        >
                            {/* Hộp Icon màu đặc trưng cho Nhóm Chính */}
                            <div
                                className={cn(
                                    "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200",
                                    isGroupHighlighted
                                        ? "bg-indigo-600 text-white shadow-xs"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950/70 group-hover:text-indigo-600"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                            </div>

                            {!collapsed && (
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="truncate text-[13px] leading-tight">
                                            {item.name}
                                        </span>
                                        <span
                                            className={cn(
                                                "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                                                isGroupHighlighted
                                                    ? "bg-indigo-200/80 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200"
                                                    : "bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                                            )}
                                        >
                                            {item.children.length}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </button>

                        {!collapsed && (
                            <div className="flex items-center gap-1 ml-1">
                                {hasActiveChild && (
                                    <span
                                        className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse"
                                        title="Đang mở chức năng trong nhóm này"
                                    />
                                )}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleGroup(item.name);
                                    }}
                                    className="p-1 text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-md transition-colors cursor-pointer"
                                    title={isExpanded ? "Thu gọn nhóm" : "Mở rộng nhóm"}
                                    aria-label="Toggle group"
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200" />
                                    ) : (
                                        <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200" />
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Danh sách Chức năng Phụ (Children) có Đường kẻ Nhánh cây (Tree Guide Line) */}
                    {showChildren && (
                        <div className="ml-5 pl-2.5 border-l-2 border-indigo-200/80 dark:border-slate-700/90 space-y-1 mt-1 mb-1.5 animate-in slide-in-from-top-1 duration-150">
                            {item.children.map(child => renderNavigationItem(child, level + 1, item))}
                        </div>
                    )}
                </div>
            );
        }

        // 2. RENDER MỤC CHỨC NĂNG ĐƠN LẺ HOẶC CHỨC NĂNG CON (SUB-ITEM)
        if (!item.href) return null;

        const isActive = isItemActive(item);
        const itemBadge = getFeatureBadge(item.href, deviceFeatureState);
        const isTopLevelItem = level === 0;

        return (
            <div key={item.name} className="relative">
                <Link
                    href={item.href}
                    onClick={onMobileClose}
                    onMouseEnter={(e) => handleMouseEnterItem(e, item, parentGroup)}
                    onMouseLeave={handleMouseLeaveItem}
                    className={cn(
                        "flex items-center rounded-xl transition-all duration-200 ease-in-out group relative",
                        collapsed ? "px-2 py-2.5 justify-center" : isTopLevelItem ? "px-2.5 py-2 gap-2.5" : "px-2.5 py-1.5 gap-2.5",
                        isActive
                            ? "bg-indigo-600 text-white font-semibold shadow-sm ring-1 ring-indigo-500/40"
                            : isTopLevelItem
                                ? "text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800/90 hover:text-slate-900 dark:hover:text-white"
                                : "text-slate-600 dark:text-slate-300 font-medium hover:bg-indigo-50/70 dark:hover:bg-slate-800/80 hover:text-indigo-700 dark:hover:text-white"
                    )}
                >
                    {/* Thanh chỉ báo dọc bên trái khi mục đang Active */}
                    {isActive && (
                        <span
                            className="absolute -left-2.5 top-1.5 bottom-1.5 w-1 bg-indigo-600 dark:bg-indigo-400 rounded-r-full"
                            aria-hidden="true"
                        />
                    )}

                    {/* Icon hoặc Chấm nút nhánh cho mục con */}
                    <div
                        className={cn(
                            "flex-shrink-0 flex items-center justify-center transition-colors duration-200",
                            isTopLevelItem
                                ? cn(
                                      "w-7 h-7 rounded-lg",
                                      isActive
                                          ? "bg-white/20 text-white"
                                          : "bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400"
                                  )
                                : "w-4 h-4"
                        )}
                    >
                        <Icon
                            className={cn(
                                "h-4 w-4 transition-colors duration-200",
                                isActive
                                    ? "text-white"
                                    : isTopLevelItem
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-slate-400 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300"
                            )}
                        />
                    </div>

                    {!collapsed && (
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5">
                            <span className={cn("truncate leading-tight", isTopLevelItem ? "text-[13px]" : "text-xs")}>
                                {item.name.trim()}
                            </span>

                            <div className="flex items-center gap-1 shrink-0">
                                {item.name === 'Đơn hàng' ? (
                                    <TodayOrdersBadge />
                                ) : itemBadge ? (
                                    <span
                                        className={cn(
                                            "px-1.5 py-0.5 text-[9.5px] font-bold rounded-full shadow-2xs leading-none",
                                            isActive ? "bg-white text-indigo-700" : itemBadge.className
                                        )}
                                    >
                                        {itemBadge.label}
                                    </span>
                                ) : item.badge ? (
                                    <span
                                        className={cn(
                                            "px-1.5 py-0.5 text-[9.5px] font-bold rounded-full leading-none",
                                            isActive ? "bg-white text-indigo-700" : "bg-rose-500 text-white"
                                        )}
                                    >
                                        {item.badge}
                                    </span>
                                ) : null}

                                {isActive && (
                                    <span
                                        className="w-1.5 h-1.5 rounded-full bg-white shadow-xs"
                                        title="Đang chọn"
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </Link>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div
                className={cn(
                    "fixed top-16 left-0 bottom-0 z-30 flex flex-col bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 shadow-sm transition-all duration-300 ease-in-out",
                    collapsed ? "w-16" : "w-64",
                    mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
                    className
                )}
            >
                <div className="p-4 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
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

            {/* Sidebar Container */}
            <aside
                aria-label="Thanh điều hướng chức năng chính"
                className={cn(
                    "fixed top-16 left-0 bottom-0 z-30 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 ease-in-out",
                    collapsed ? "w-16" : "w-64",
                    mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
                    className
                )}
            >
                {/* Mobile close button */}
                <div className="lg:hidden absolute top-3 right-3 z-40">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onMobileClose}
                        className="h-8 w-8"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Hộp Định vị "Đang mở" & Ô Tìm kiếm nhanh chức năng (khi Sidebar mở rộng) */}
                {!collapsed && (
                    <div className="px-3 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
                        {/* Thẻ báo hiệu chức năng đang chọn */}
                        {activeContext.activeItem && (
                            <div className="px-2.5 py-2 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/70">
                                <div className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                    <span className="flex items-center gap-1 truncate">
                                        <Compass className="w-3 h-3 shrink-0" />
                                        Đang mở
                                    </span>
                                    {activeContext.sectionMeta && (
                                        <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 text-[9.5px]">
                                            {activeContext.sectionMeta.shortLabel}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-0.5 text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {activeContext.parentGroup && activeContext.parentGroup.name !== activeContext.activeItem.name
                                        ? `${activeContext.parentGroup.name} ▸ ${activeContext.activeItem.name.trim()}`
                                        : activeContext.activeItem.name.trim()}
                                </div>
                                {activeContext.activeItem.description && (
                                    <p className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                        {activeContext.activeItem.description}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Ô Tìm kiếm nhanh chức năng */}
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm nhanh chức năng..."
                                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                    aria-label="Xóa tìm kiếm menu"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Navigation List chia theo 3 Phân khu Chính / Quản lý / Cài đặt */}
                <nav
                    className={cn(
                        "flex-1 px-2.5 py-3 space-y-4",
                        "overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                    )}
                >
                    {groupedBySection.length > 0 ? (
                        groupedBySection.map(({ section, items }) => (
                            <div key={section.id} className="space-y-1">
                                {!collapsed ? (
                                    <div
                                        className="px-2 pt-1 pb-1 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none"
                                        title={section.description}
                                    >
                                        <span className="flex items-center gap-1">
                                            <span>{section.emoji}</span>
                                            <span>{section.label}</span>
                                        </span>
                                    </div>
                                ) : (
                                    <div
                                        className="mx-auto w-6 border-t border-slate-200 dark:border-slate-800 my-1"
                                        title={section.label}
                                    />
                                )}

                                <div className="space-y-1">
                                    {items.map(item => renderNavigationItem(item))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-gray-500 text-xs py-8 px-2">
                            {searchQuery ? (
                                <div>
                                    <p className="font-medium text-slate-600 dark:text-slate-300 mb-1">
                                        Không tìm thấy chức năng "{searchQuery}"
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                                    >
                                        Hiện tất cả chức năng
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div className="text-gray-400 mb-1">Không có menu</div>
                                    <div className="text-[11px] text-gray-400">
                                        Bạn chưa được cấp quyền truy cập
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </nav>

                {/* Machine Feature State Control (Mục #8) */}
                {!collapsed && (
                    <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/60 flex items-center justify-between text-[11px]">
                        <div className="flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Theo máy này</span>
                            <div className="relative group cursor-help inline-flex items-center">
                                <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
                                <div className="absolute bottom-full left-0 mb-2 w-56 p-2 bg-gray-900 text-white text-[10.5px] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none leading-relaxed border border-gray-700">
                                    <div className="font-semibold text-amber-300 mb-0.5">Chú thích tính năng:</div>
                                    Xóa lịch sử lượt click trên trình duyệt máy này để khôi phục lại các huy hiệu <strong>[Mới]</strong>, <strong>[Hot]</strong> trên thanh menu về mặc định ban đầu.
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                resetFeatureTracker();
                                toast.success('Đã khôi phục trạng thái huy hiệu tính năng về mặc định!');
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                            title="Khôi phục trạng thái Hot/Mới ban đầu cho máy này"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset chức năng
                        </button>
                    </div>
                )}
            </aside>

            {/* SMART FLOATING HOVER INFO CARD (Position Fixed - Không bao giờ bị cắt bởi overflow-y-auto) */}
            {hoverCard && (
                <div
                    onMouseEnter={handleMouseEnterHoverCard}
                    onMouseLeave={handleMouseLeaveItem}
                    style={{
                        top: `${hoverCard.top}px`,
                        left: `${hoverCard.left}px`,
                    }}
                    className="hidden lg:block fixed z-[9999] w-80 rounded-2xl bg-slate-900/98 dark:bg-slate-900 text-white shadow-2xl border border-slate-700/90 p-3.5 animate-in fade-in zoom-in-95 duration-150"
                >
                    {/* Header của Hover Card */}
                    <div className="flex items-start gap-2.5 pb-2.5 border-b border-slate-800">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-0.5">
                            {hoverCard.item.icon && (
                                <hoverCard.item.icon className="w-4 h-4 text-indigo-300" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                                <h4 className="font-bold text-sm text-white truncate">
                                    {hoverCard.item.name.trim()}
                                </h4>
                                {isItemActive(hoverCard.item) && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                        Đang mở
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center flex-wrap gap-1.5 mt-1">
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/25 text-indigo-200 border border-indigo-400/30">
                                    {hoverCard.item.tierLabel || (hoverCard.item.isGroup ? 'Nhóm chức năng chính' : 'Chức năng nghiệp vụ')}
                                </span>
                                {hoverCard.parentGroup && (
                                    <span className="text-[10px] text-slate-400 truncate">
                                        • Nhóm: <strong className="text-slate-200">{hoverCard.parentGroup.name}</strong>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mô tả chi tiết chức năng */}
                    <div className="py-2.5 space-y-2 text-xs">
                        <p className="text-slate-200 leading-relaxed">
                            {hoverCard.item.description || 'Chức năng quản lý và vận hành hệ thống H2MilkTea.'}
                        </p>

                        {/* Các điểm nổi bật (Highlights) */}
                        {hoverCard.item.highlights && hoverCard.item.highlights.length > 0 && (
                            <div className="space-y-1 pt-1">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    Tính năng nổi bật:
                                </div>
                                <ul className="space-y-1 text-[11px] text-slate-300">
                                    {hoverCard.item.highlights.map((hl, idx) => (
                                        <li key={idx} className="flex items-start gap-1.5">
                                            <span className="text-indigo-400 font-bold">•</span>
                                            <span>{hl}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Nếu đang di chuột vào Nhóm (Group): liệt kê luôn các chức năng con để bấm nhanh 1 chạm */}
                        {hoverCard.item.isGroup && hoverCard.item.children && hoverCard.item.children.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-800 space-y-1">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Chức năng trong nhóm ({hoverCard.item.children.length}) — Bấm để mở:
                                </div>
                                <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1">
                                    {hoverCard.item.children.map((child) => {
                                        const childActive = isItemActive(child);
                                        const ChildIcon = child.icon;
                                        return (
                                            <Link
                                                key={child.name}
                                                href={child.href || '#'}
                                                onClick={() => {
                                                    setHoverCard(null);
                                                    onMobileClose();
                                                }}
                                                className={cn(
                                                    "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                                                    childActive
                                                        ? "bg-indigo-600 text-white font-semibold"
                                                        : "bg-slate-800/80 text-slate-200 hover:bg-slate-800 hover:text-white"
                                                )}
                                            >
                                                {ChildIcon && <ChildIcon className="w-3.5 h-3.5 shrink-0 text-indigo-300" />}
                                                <div className="flex-1 min-w-0">
                                                    <div className="truncate font-medium">{child.name.trim()}</div>
                                                    {child.description && (
                                                        <div className="text-[10px] text-slate-400 truncate">
                                                            {child.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer gợi ý quyền sử dụng */}
                    {hoverCard.item.roleHint && (
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10.5px] text-slate-400">
                            <span className="flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>Dành cho: <strong className="text-slate-200">{hoverCard.item.roleHint}</strong></span>
                            </span>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
