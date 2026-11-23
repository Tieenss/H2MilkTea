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
import { QABugReporter } from '@/components/QABugReporter';
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
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <TodayOrdersProvider>
      <div className="h-[100dvh] w-full overflow-hidden bg-gray-50 text-gray-900 transition-colors duration-200">
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
            "h-[100dvh] pt-14 sm:pt-16 overflow-hidden transition-all duration-300 ease-in-out",
            sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
          )}
        >
          <main
            className={cn(
              "h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)] w-full",
              pathname === '/pos' ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden"
            )}
            data-scroll-container
          >
            <div className={cn(pathname === '/pos' ? "p-1.5 sm:p-2.5 lg:p-3 h-full flex flex-col min-h-0 overflow-hidden" : "p-2.5 sm:p-4 lg:p-6")}>
              {children}
            </div>
          </main>
        </div>
      </div>
      
      <ScrollToTop />
      {/* Trợ lý AI toàn hệ thống nhận diện ngữ cảnh từng trang (Mục #16) */}
      <GlobalAssistant />
      {/* Công cụ Bắt lỗi & Checklist Kiểm thử QA trực tiếp trên từng màn hình */}
      <QABugReporter />
    </TodayOrdersProvider>
  );
}
