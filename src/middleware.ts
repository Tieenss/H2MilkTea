import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Quản lý Correlation ID cho truy vết lỗi
  const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-correlation-id', correlationId);

  // Đối với các API endpoints: chuyển tiếp với correlation-id và bỏ qua route check UI
  if (pathname.startsWith('/api')) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    response.headers.set('x-correlation-id', correlationId);
    return response;
  }
  
  // Các route công khai (không cần đăng nhập)
  const publicRoutes = [
    '/',           // Trang login
    '/not-found',  // Trang 404
    '/order',      // Trang order cho khách hàng (QR)
  ];
  
  // Các route có thực trong hệ thống (dựa trên navigation.ts)
  const validRoutes = [
    // Trang chủ và auth
    '/',
    '/dashboard',
    '/not-found',
    '/profile',
    '/receipt-settings',
    '/notifications',
    '/pos-hub',
    '/menu',
    '/reports',
    '/settings',
    '/settings/appearance',
    // POS & Bán hàng
    '/pos',
    '/orders',
    '/tables',
    '/kitchen',
    // Menu & Sản phẩm
    '/products',
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
    
    // Báo cáo & Thống kê
    '/reports/dashboard',
    '/reports/sales',
    '/reports/bestsellers',
    '/reports/products',
    '/reports/comprehensive',
    '/reports/staff',
    
    // Cài đặt hệ thống
    '/nhanvien',
    '/settings/store-info',
    '/settingdata',
    '/settings/ai',
    '/user-guide',
    // Customer QR Order (public)
    '/order',
    '/order/menu',
    '/order/cart',
    '/order/status',
  ];
  
  // Kiểm tra token trong cookie
  const authToken = request.cookies.get('authToken')?.value;
  
  // Kiểm tra route có tồn tại không (ngoại trừ static files)
  const isStaticFile = pathname.startsWith('/_next') || pathname.includes('.');
  
  if (!isStaticFile && !validRoutes.includes(pathname)) {
    const notFoundRes = NextResponse.rewrite(new URL('/not-found', request.url));
    notFoundRes.headers.set('x-correlation-id', correlationId);
    return notFoundRes;
  }
  
  // Kiểm tra nếu đang ở login page với token
  if (pathname === '/' && authToken) {
    const returnUrl = request.nextUrl.searchParams.get('returnUrl');
    const redirectUrl = returnUrl ? decodeURIComponent(returnUrl) : '/dashboard';
    const redirectRes = NextResponse.redirect(new URL(redirectUrl, request.url));
    redirectRes.headers.set('x-correlation-id', correlationId);
    return redirectRes;
  }
  
  // Tự động bảo vệ tất cả route (trừ publicRoutes và static files)
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/order');
  
  if (!isStaticFile && !isPublicRoute && !authToken) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    const loginRes = NextResponse.redirect(loginUrl);
    loginRes.headers.set('x-correlation-id', correlationId);
    return loginRes;
  }
  
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set('x-correlation-id', correlationId);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};