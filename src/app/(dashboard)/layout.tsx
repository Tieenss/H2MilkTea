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

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };

    handleResize();
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
    setSidebarCollapsed(!sidebarCollapsed);
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
      <div className="min-h-screen overflow-hidden">
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
            className="h-full overflow-auto"
            style={{ height: 'calc(100vh - 64px)' }}
            data-scroll-container
          >
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
      
      <ScrollToTop />
    </TodayOrdersProvider>
  );
}