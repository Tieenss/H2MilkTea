'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import authUtils from '@/utils/authUtils';
import { Header } from '@/components/ui/header';
import { Sidebar } from '@/components/ui/sidebar';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import { RouteProgress } from '@/components/ui/route-progress';
import { cn } from '@/lib/utils';
import { TodayOrdersProvider } from '@/context/TodayOrdersContext';
import { GlobalAssistant } from '@/components/GlobalAssistant';
import { useSingleActiveSession } from '@/hooks/useSingleActiveSession';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useSingleActiveSession();

  useEffect(() => {
    // Khôi phục trạng thái sidebar từ localStorage đã lưu trên máy (Mục #17)
    try {
      const savedCollapsed = localStorage.getItem('h2_sidebar_collapsed');
      if (savedCollapsed !== null) {
        setSidebarCollapsed(savedCollapsed === 'true');
      } else {
        // Mặc định mở rộng khi mới vào trên máy tính để tiện thao tác
        setSidebarCollapsed(false);
      }
    } catch {
      // fallback
    }

    const handleResize = () => {
      // Khi ở kích thước màn hình nhỏ (< 1024px), tự động reset trạng thái collapse
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      if (!authUtils.isAuthenticated(pathname ?? undefined)) {
        const loginUrl = new URL('/', window.location.origin);
        loginUrl.searchParams.set('returnUrl', pathname ?? '');
        router.push(loginUrl.toString());
        return;
      }
      setIsAuthenticated(true);
      setIsLoading(false);
    };

    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [router, pathname]);

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('h2_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <TodayOrdersProvider>
      <div className="min-h-screen overflow-hidden bg-gray-50 text-gray-900 transition-colors duration-200">
        <Header 
          onToggleSidebar={handleToggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
          onMobileMenuToggle={handleMobileMenuToggle}
        />
        {/* Thanh tiến độ nhỏ gọn ngay dưới Header */}
        <RouteProgress />
        
        <Sidebar 
          collapsed={sidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          onMobileClose={handleMobileMenuClose}
        />
        <div 
          className={cn(
            "pt-16 transition-all duration-300 ease-in-out",
            sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
          )}
          style={{ height: '100vh', overflow: 'hidden' }}
        >
          <main
            className={cn("h-full", pathname === '/pos' ? "overflow-hidden" : "overflow-auto")}
            style={{ height: 'calc(100vh - 64px)' }}
            data-scroll-container
          >
            <div className={cn(pathname === '/pos' ? "p-2 sm:p-3 h-full flex flex-col min-h-0 overflow-hidden" : "p-6")}>
              {children}
            </div>
          </main>
        </div>
      </div>
      
      <ScrollToTop />
      {/* Trợ lý AI toàn hệ thống nhận diện ngữ cảnh từng trang (Mục #16) */}
      <GlobalAssistant />
    </TodayOrdersProvider>
  );
}
