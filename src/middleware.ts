import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Các route công khai (không cần đăng nhập)
  const publicRoutes = [
    '/',           // Trang login
    '/not-found'   // Trang 404
  ];
  
  // Các route có thực trong hệ thống (dựa trên navigation.ts)
  const validRoutes = [
    // Trang chủ và auth
    '/',
    '/dashboard',
    '/not-found',
    '/profile',
    '/receipt-settings',
    // POS & Bán hàng
    '/pos',
    '/orders',
    '/tables',
    '/kitchen',
    // Menu & Sản phẩm
    '/menu/products',
    '/menu/cauhinhnguyenlieu',
    '/menu/nguyenlieu',
    '/reports/customers',
    '/khachhang',
    // Quản lý kho nâng cao
    '/inventory',
    '/inventory/transactions',
    '/inventory/stocktake',
    '/inventory/suppliers',
    '/inventory/forecast',
    '/inventory/products',
    '/inventory/categories',
    '/inventory/customers',
    '/inventory/orders',
    '/inventory/reports',
    
    // Báo cáo & Thống kêwuwatracker
    '/reports/dashboard',
    '/reports/sales',
    '/reports/bestsellers',
    '/reports/staff',
    
    // Cài đặt hệ thống
    '/nhanvien',
    '/settings/store-info',
    '/settingdata',
    '/user-guide'
  ];
  
  // Kiểm tra token trong cookie
  const authToken = request.cookies.get('authToken')?.value;
  
  // Kiểm tra route có tồn tại không (ngoại trừ static files)
  const isStaticFile = pathname.startsWith('/_next') || 
                      pathname.startsWith('/api') || 
                      pathname.includes('.');
  
  if (!isStaticFile && !validRoutes.includes(pathname)) {
    return NextResponse.rewrite(new URL('/not-found', request.url));
  }
  
  // Kiểm tra nếu đang ở login page với token
  if (pathname === '/' && authToken) {
    const returnUrl = request.nextUrl.searchParams.get('returnUrl');
    if (returnUrl) {
      return NextResponse.redirect(new URL(decodeURIComponent(returnUrl), request.url));
    } else {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  // Tự động bảo vệ tất cả route (trừ publicRoutes và static files)
  const isPublicRoute = publicRoutes.includes(pathname);
  
  if (!isStaticFile && !isPublicRoute && !authToken) {
    // Redirect về login với returnUrl
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};