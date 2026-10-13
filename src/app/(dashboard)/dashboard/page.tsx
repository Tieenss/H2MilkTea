'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import authUtils from '@/utils/authUtils';
import { navigation, NavigationItem } from '@/lib/navigation';
import { 
  Clock, 
  Search, 
  Star, 
  Grid3X3, 
  List,
  Zap,
  Users,
  Settings,
  TrendingUp,
  Activity ,
  
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TodayOrdersCard } from '@/components/TodayOrdersCard';

const DashboardPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [favoriteApps, setFavoriteApps] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = () => {
      if (!authUtils.isAuthenticated()) {
        router.push('/login?returnUrl=/dashboard');
        return;
      }

      const user = authUtils.getUserData();
      if (user) {
        setUserData(user);
        const permissions = user['Quyền View'] || '';
        const userRole = user['Phân quyền'] || '';

        setIsAdmin(userRole === 'Admin');

        if (userRole === 'Admin') {
          // Admin có quyền xem tất cả
          const allItems = getAllNavigationItems(navigation);
          setUserPermissions(allItems.map(nav => nav.name));
        } else {
          // Người dùng khác chỉ xem theo quyền được cấp
          const permissionList = permissions.split(',')
            .map((item: string) => item.trim())
            .filter(Boolean);
          setUserPermissions(permissionList);
        }

        // Load favorite apps from localStorage
        const savedFavorites = localStorage.getItem(`favorites_${user.id || user.email}`);
        if (savedFavorites) {
          setFavoriteApps(JSON.parse(savedFavorites));
        }
      }

      setLoading(false);
    };

    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [router]);

  // Hàm lấy tất cả navigation items (bao gồm cả children trong groups)
  const getAllNavigationItems = (items: NavigationItem[]): NavigationItem[] => {
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
  };

  // Hàm lấy tất cả items có dashboard: true và user có quyền xem
  const getAllDashboardItems = useMemo(() => {
    const dashboardItems: NavigationItem[] = [];

    navigation.forEach(item => {
      // Kiểm tra item chính
      if (item.dashboard && !item.isGroup && (isAdmin || userPermissions.includes(item.name))) {
        dashboardItems.push(item);
      }

      // Kiểm tra children
      if (item.children) {
        item.children.forEach(child => {
          if (child.dashboard && (isAdmin || userPermissions.includes(child.name))) {
            dashboardItems.push(child);
          }
        });
      }
    });

    return dashboardItems;
  }, [isAdmin, userPermissions]);

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm) return getAllDashboardItems;
    
    return getAllDashboardItems.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [getAllDashboardItems, searchTerm]);

  // Separate favorite and regular items
  const { favoriteItems, regularItems } = useMemo(() => {
    const favorites = filteredItems.filter(item => favoriteApps.includes(item.name));
    const regular = filteredItems.filter(item => !favoriteApps.includes(item.name));
    return { favoriteItems: favorites, regularItems: regular };
  }, [filteredItems, favoriteApps]);

  // Toggle favorite
  const toggleFavorite = (itemName: string) => {
    const newFavorites = favoriteApps.includes(itemName)
      ? favoriteApps.filter(name => name !== itemName)
      : [...favoriteApps, itemName];
    
    setFavoriteApps(newFavorites);
    
    // Save to localStorage
    if (userData) {
      localStorage.setItem(`favorites_${userData.id || userData.email}`, JSON.stringify(newFavorites));
    }
  };

  const renderAppCard = (item: NavigationItem, isFavorite = false) => {
    const Icon = item.icon;
    
    if (viewMode === 'list') {
      return (
        <div
          key={`${item.name}-${item.href}`}
          className="flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 group"
        >
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center mr-4 group-hover:scale-105 transition-transform"
            style={{ backgroundColor: item.color || '#6B7280' }}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          
          <div className="flex-1">
            <Link href={item.href || '#'} className="block">
              <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                {item.name}
              </h3>
              {item.description && (
                <p className="text-sm text-gray-500 mt-1">{item.description}</p>
              )}
            </Link>
          </div>

          <div className="flex items-center space-x-2">
            {item.badge && (
              <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                {item.badge}
              </span>
            )}
            <button
              onClick={() => toggleFavorite(item.name)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isFavorite 
                  ? "text-yellow-500 hover:text-yellow-600" 
                  : "text-gray-400 hover:text-yellow-500"
              )}
            >
              <Star className={cn("w-4 h-4", isFavorite && "fill-current")} />
            </button>
          </div>
        </div>
      );
    }

    // Grid view
    return (
      <div key={`${item.name}-${item.href}`} className="relative group">
        <Link
          href={item.href || '#'}
          className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200"
        >
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform relative"
            style={{ backgroundColor: item.color || '#6B7280' }}
          >
            <Icon className="w-6 h-6 text-white" />
            {item.badge && (
              <span className="absolute -top-1 -right-1 px-1 py-0.5 text-xs bg-red-500 text-white rounded-full min-w-[16px] text-center">
                {item.badge}
              </span>
            )}
          </div>
          <span className="text-sm font-medium text-gray-700 text-center leading-tight">
            {item.name}
          </span>
          {item.description && (
            <span className="text-xs text-gray-500 text-center mt-1 line-clamp-2">
              {item.description}
            </span>
          )}
        </Link>
        
        <button
          onClick={() => toggleFavorite(item.name)}
          className={cn(
            "absolute top-2 right-2 p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100",
            isFavorite 
              ? "text-yellow-500 opacity-100" 
              : "text-gray-400 hover:text-yellow-500"
          )}
        >
          <Star className={cn("w-4 h-4", isFavorite && "fill-current")} />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-2rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 mx-auto">
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Tất cả ứng dụng</h2>
          <p className="text-sm text-gray-500">
            {filteredItems.length} ứng dụng
            {!isAdmin && (
              <span className="ml-2 text-xs text-blue-600">
                (theo quyền của bạn)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm kiếm ứng dụng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 transition-colors",
                viewMode === 'grid' 
                  ? "bg-blue-500 text-white" 
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 transition-colors",
                viewMode === 'list' 
                  ? "bg-blue-500 text-white" 
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats - Chỉ hiển thị cho Admin */}
      {isAdmin && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-500" />
            <h3 className="font-medium text-gray-800">Thống kê nhanh</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <TodayOrdersCard />
          </div>
        </div>
      )}

      {/* Applications */}
      {filteredItems.length > 0 ? (
        <div className="space-y-6">
          {/* Favorite Apps */}
          {favoriteItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
                <h3 className="font-medium text-gray-800">Ứng dụng yêu thích</h3>
              </div>
              <div className={cn(
                viewMode === 'grid' 
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4"
                  : "space-y-3"
              )}>
                {favoriteItems.map(item => renderAppCard(item, true))}
              </div>
            </div>
          )}

          {/* Regular Apps */}
          {regularItems.length > 0 && (
            <div>
              {favoriteItems.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-gray-500" />
                  <h3 className="font-medium text-gray-800">Tất cả ứng dụng</h3>
                </div>
              )}
              <div className={cn(
                viewMode === 'grid' 
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4"
                  : "space-y-3"
              )}>
                {regularItems.map(item => renderAppCard(item, false))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            {searchTerm ? <Search className="w-16 h-16 mx-auto" /> : <Clock className="w-16 h-16 mx-auto" />}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Không tìm thấy ứng dụng' : 'Không có ứng dụng nào'}
          </h3>
          <p className="text-gray-500 text-sm">
            {searchTerm 
              ? `Không có ứng dụng nào khớp với "${searchTerm}"`
              : 'Bạn chưa có quyền truy cập vào ứng dụng nào. Liên hệ quản trị viên để được cấp quyền.'
            }
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Xóa tìm kiếm
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;