# 💻 GOALPOS - CODE EXAMPLES & IMPLEMENTATION PATTERNS

## 1. AUTHENTICATION & AUTHORIZATION EXAMPLES

### 1.1 Login Implementation

```typescript
// src/app/login.tsx - Login Page
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      
      // Fetch employees data
      const response = await fetch('/data/DSNV.json');
      const employees = await response.json();
      
      // Find matching employee
      const user = employees.find((emp: any) => 
        emp['Họ và Tên'].toLowerCase() === username.toLowerCase() &&
        emp['Số điện thoại'] === password
      );
      
      if (!user) {
        toast.error('Tên đăng nhập hoặc mật khẩu không chính xác');
        return;
      }
      
      // Save auth token and user data
      const token = Math.random().toString(36).substr(2);
      const expiryTime = new Date().getTime() + 24 * 60 * 60 * 1000;
      
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(user));
      localStorage.setItem('tokenExpiry', expiryTime.toString());
      
      // Also set as cookie for middleware
      document.cookie = `authToken=${token}; path=/; max-age=${24 * 60 * 60}`;
      
      toast.success('Đăng nhập thành công!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Lỗi đăng nhập!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-8">GOALPOS</h1>
        
        <Input
          placeholder="Tên đăng nhập"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          className="mb-4"
        />
        
        <Input
          placeholder="Mật khẩu"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          className="mb-6"
        />
        
        <Button 
          onClick={handleLogin} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>
      </div>
    </div>
  );
}
```

### 1.2 Auth Utils

```typescript
// src/utils/authUtils.ts
class AuthUtils {
  private readonly TOKEN_KEY = 'authToken';
  private readonly USER_DATA_KEY = 'userData';
  private readonly TOKEN_EXPIRY_KEY = 'tokenExpiry';

  // Check if user is authenticated
  isAuthenticated(pathname?: string): boolean {
    if (typeof window === 'undefined') return false;
    
    const token = localStorage.getItem(this.TOKEN_KEY);
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    
    if (!token || !expiry) return false;
    
    // Check if token expired
    if (new Date().getTime() > parseInt(expiry)) {
      this.logout();
      return false;
    }
    
    return true;
  }

  // Get current user data
  getUserData(): any {
    if (typeof window === 'undefined') return null;
    
    const userData = localStorage.getItem(this.USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  // Get authentication token
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // Check user permission level
  isAdmin(): boolean {
    const user = this.getUserData();
    return user?.['Phân quyền'] === 'Admin';
  }

  isManager(): boolean {
    const user = this.getUserData();
    return user?.['Phân quyền'] === 'Quản lý';
  }

  // Logout
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_DATA_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    document.cookie = 'authToken=; path=/; max-age=0';
  }
}

export default new AuthUtils();
```

### 1.3 Middleware - Protected Routes

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes (no auth needed)
  const publicRoutes = [
    '/',           // Login page
    '/not-found'
  ];
  
  const isPublicRoute = publicRoutes.includes(pathname);
  const authToken = request.cookies.get('authToken')?.value;
  
  // Redirect to login if no token
  if (!isPublicRoute && !authToken) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Redirect to dashboard if already logged in
  if (pathname === '/' && authToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|favicon).*)']
};
```

---

## 2. POS SYSTEM EXAMPLES

### 2.1 usePOS Hook - Main Business Logic

```typescript
// src/app/(dashboard)/pos/hooks/usePOS.ts
'use client';

import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
  totalPrice: number;
}

export interface Customer {
  IDKHACHHANG: string;
  'Tên khách hàng': string;
  'Loại khách hàng': 'Khách thường' | 'VIP' | 'Kim cương';
  'Điểm tích lũy': number;
  'Số điện thoại': string;
  [key: string]: any;
}

export const usePOS = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch products on mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch('/data/DMHH.json');
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Error loading products:', error);
        toast.error('Lỗi tải dữ liệu sản phẩm');
      }
    };
    
    loadProducts();
  }, []);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const vat = subtotal * 0.1;
  
  // Get discount percentage based on customer type
  const getDiscountRate = (customer: Customer): number => {
    switch (customer['Loại khách hàng']) {
      case 'VIP':
        return 0.1; // 10%
      case 'Kim cương':
        return 0.2; // 20%
      default:
        return 0;   // 0%
    }
  };
  
  const customerDiscount = selectedCustomer 
    ? subtotal * getDiscountRate(selectedCustomer)
    : 0;
  
  const total = subtotal + vat - customerDiscount;

  // Add product to cart
  const addToCart = useCallback((product: any, quantity: number = 1) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.productId === product.IDSP);
      
      if (existingItem) {
        // Update quantity if product already in cart
        return prev.map(item =>
          item.productId === product.IDSP
            ? {
                ...item,
                quantity: item.quantity + quantity,
                totalPrice: (item.quantity + quantity) * item.price
              }
            : item
        );
      }
      
      // Add new item
      return [
        ...prev,
        {
          id: Math.random().toString(),
          productId: product.IDSP,
          name: product['Tên sản phẩm'],
          price: product['Giá bán'],
          quantity,
          totalPrice: product['Giá bán'] * quantity
        }
      ];
    });
    
    toast.success(`Đã thêm ${product['Tên sản phẩm']}`);
  }, []);

  // Remove product from cart
  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
    toast.success('Đã xóa khỏi giỏ hàng');
  }, []);

  // Adjust quantity
  const adjustQuantity = useCallback((productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(prev =>
      prev.map(item =>
        item.productId === productId
          ? {
              ...item,
              quantity: newQuantity,
              totalPrice: newQuantity * item.price
            }
          : item
      )
    );
  }, [removeFromCart]);

  // Clear cart
  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedCustomer(null);
    setSelectedTableId(null);
  }, []);

  // Process payment & create invoice
  const processPayment = useCallback(async (paymentMethod: string) => {
    if (!selectedTableId || cart.length === 0) {
      toast.error('Vui lòng chọn bàn và thêm sản phẩm');
      return false;
    }

    try {
      setIsLoading(true);

      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const invoiceId = `INV${Date.now()}`;
      
      // Create invoice
      const invoice = {
        IDHOADON: invoiceId,
        IDBAN: selectedTableId,
        'Khách hàng': selectedCustomer?.['Tên khách hàng'] || 'Khách lẻ',
        'Nhân viên': userData['Họ và Tên'],
        'Ngày': new Date().toLocaleString('vi-VN'),
        'Trạng thái': 'Hoàn thành',
        'Loại thanh toán': paymentMethod,
        'Tạm tính': subtotal,
        'VAT': vat,
        'Ưu đãi': customerDiscount,
        'Tổng tiền': total
      };

      // Save invoice to localStorage
      const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
      invoices.push(invoice);
      localStorage.setItem('invoices', JSON.stringify(invoices));

      // Save invoice details
      const details = cart.map((item, idx) => ({
        IDCHITIET: `${invoiceId}-${idx}`,
        IDHOADON: invoiceId,
        IDSP: item.productId,
        'Tên sản phẩm': item.name,
        'Số lượng': item.quantity,
        'Giá': item.price,
        'Thành tiền': item.totalPrice,
        'Ghi chú': item.note || ''
      }));

      const allDetails = JSON.parse(localStorage.getItem('invoiceDetails') || '[]');
      allDetails.push(...details);
      localStorage.setItem('invoiceDetails', JSON.stringify(allDetails));

      // Clear cart
      clearCart();
      
      toast.success('Thanh toán thành công!');
      return true;
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Lỗi khi thanh toán');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [cart, selectedTableId, selectedCustomer, subtotal, vat, customerDiscount, total, clearCart]);

  return {
    products,
    cart,
    selectedTableId,
    selectedCustomer,
    isLoading,
    subtotal,
    vat,
    total,
    customerDiscount,
    setSelectedTableId,
    setSelectedCustomer,
    addToCart,
    removeFromCart,
    adjustQuantity,
    clearCart,
    processPayment
  };
};
```

### 2.2 CartSidebar Component with Discount Display

```typescript
// src/app/(dashboard)/pos/components/CartSidebar.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Gift } from 'lucide-react';
import { CurrencyFormatter } from '@/lib/formatters';

interface CartSidebarProps {
  cart: CartItem[];
  selectedCustomer: Customer | null;
  subtotal: number;
  vat: number;
  customerDiscount: number;
  total: number;
  onRemoveItem: (productId: string) => void;
  onAdjustQty: (productId: string, qty: number) => void;
  onCheckout: () => void;
}

export const CartSidebar = ({
  cart,
  selectedCustomer,
  subtotal,
  vat,
  customerDiscount,
  total,
  onRemoveItem,
  onAdjustQty,
  onCheckout
}: CartSidebarProps) => {
  const getCustomerBadgeColor = (type: string) => {
    switch (type) {
      case 'VIP': return 'bg-blue-100 text-blue-800';
      case 'Kim cương': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-full lg:w-80 flex flex-col gap-4 p-4 bg-white rounded-lg border">
      {/* Customer Info */}
      {selectedCustomer && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="font-semibold text-sm">{selectedCustomer['Tên khách hàng']}</p>
            <p className="text-xs text-gray-600">{selectedCustomer['Số điện thoại']}</p>
            <Badge className={`${getCustomerBadgeColor(selectedCustomer['Loại khách hàng'])} mt-2`}>
              {selectedCustomer['Loại khách hàng']}
            </Badge>
            <p className="text-xs mt-2">Điểm: {selectedCustomer['Điểm tích lũy']}</p>
          </CardContent>
        </Card>
      )}

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto space-y-2">
        <p className="text-sm font-semibold text-gray-600">
          Giỏ hàng ({cart.reduce((sum, item) => sum + item.quantity, 0)} món)
        </p>
        
        {cart.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">
            Giỏ hàng trống
          </p>
        ) : (
          cart.map(item => (
            <Card key={item.id} className="p-3">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-gray-600">
                    {CurrencyFormatter(item.price)}/cái
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveItem(item.productId)}
                  className="h-6 w-6 p-0 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Quantity Control */}
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAdjustQty(item.productId, item.quantity - 1)}
                  className="h-6 w-6 p-0 text-xs"
                >
                  -
                </Button>
                <span className="text-sm font-semibold w-8 text-center">
                  {item.quantity}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAdjustQty(item.productId, item.quantity + 1)}
                  className="h-6 w-6 p-0 text-xs"
                >
                  +
                </Button>
              </div>

              {/* Item total */}
              <p className="text-sm font-semibold text-right">
                {CurrencyFormatter(item.totalPrice)}
              </p>

              {/* Note */}
              {item.note && (
                <p className="text-xs text-gray-500 italic mt-1">
                  📝 {item.note}
                </p>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Pricing Breakdown */}
      <Card className="bg-gray-50">
        <CardContent className="pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Tạm tính:</span>
            <span className="font-semibold">{CurrencyFormatter(subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">VAT (10%):</span>
            <span className="font-semibold">{CurrencyFormatter(vat)}</span>
          </div>

          {/* Discount Box */}
          {customerDiscount > 0 && (
            <div className="flex justify-between bg-green-50 p-2 rounded border border-green-200">
              <div className="flex items-center gap-1">
                <Gift className="w-4 h-4 text-green-600" />
                <span className="text-green-700 font-semibold">Ưu đãi:</span>
              </div>
              <span className="font-bold text-green-700">
                -{CurrencyFormatter(customerDiscount)}
              </span>
            </div>
          )}

          <div className="border-t pt-2 flex justify-between text-base font-bold">
            <span>Tổng tiền:</span>
            <span className="text-lg text-blue-600">
              {CurrencyFormatter(total)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Button
        onClick={onCheckout}
        disabled={cart.length === 0}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        Thanh Toán
      </Button>
    </div>
  );
};
```

---

## 3. CUSTOMER MANAGEMENT EXAMPLES

### 3.1 useCustomers Hook

```typescript
// src/app/(dashboard)/khachhang/hooks/useCustomers.ts
'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export interface Customer {
  IDKHACHHANG: string;
  'Tên khách hàng': string;
  'Số điện thoại': string;
  'Email'?: string;
  'Địa chỉ'?: string;
  'Loại khách hàng': 'Khách thường' | 'VIP' | 'Kim cương';
  'Điểm tích lũy': number;
  'Trạng thái': 'Hoạt động' | 'Không hoạt động';
  'Ngày tạo': string;
}

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all customers
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/data/KHACHHANG.json');
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Lỗi tải dữ liệu khách hàng');
    } finally {
      setLoading(false);
    }
  };

  // Load customers on mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Add new customer
  const addCustomer = async (customerData: Omit<Customer, 'IDKHACHHANG'>) => {
    try {
      const newCustomer: Customer = {
        ...customerData,
        IDKHACHHANG: `C${Date.now()}`,
        'Ngày tạo': new Date().toLocaleString('vi-VN')
      };

      const updated = [...customers, newCustomer];
      setCustomers(updated);
      
      // Save to localStorage
      localStorage.setItem('customers', JSON.stringify(updated));
      
      toast.success('Thêm khách hàng thành công');
      return newCustomer;
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Lỗi thêm khách hàng');
      throw error;
    }
  };

  // Update customer
  const updateCustomer = async (customerId: string, updates: Partial<Customer>) => {
    try {
      const updated = customers.map(c =>
        c.IDKHACHHANG === customerId ? { ...c, ...updates } : c
      );
      
      setCustomers(updated);
      localStorage.setItem('customers', JSON.stringify(updated));
      
      toast.success('Cập nhật khách hàng thành công');
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Lỗi cập nhật khách hàng');
      throw error;
    }
  };

  // Delete customer
  const deleteCustomer = async (customerId: string) => {
    try {
      const updated = customers.filter(c => c.IDKHACHHANG !== customerId);
      
      setCustomers(updated);
      localStorage.setItem('customers', JSON.stringify(updated));
      
      toast.success('Xóa khách hàng thành công');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Lỗi xóa khách hàng');
      throw error;
    }
  };

  // Get customer by ID
  const getCustomer = (customerId: string) => {
    return customers.find(c => c.IDKHACHHANG === customerId);
  };

  // Search customers
  const searchCustomers = (query: string) => {
    return customers.filter(c =>
      c['Tên khách hàng'].toLowerCase().includes(query.toLowerCase()) ||
      c['Số điện thoại'].includes(query) ||
      c.IDKHACHHANG.toLowerCase().includes(query.toLowerCase())
    );
  };

  return {
    customers,
    loading,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomer,
    searchCustomers
  };
};
```

### 3.2 Customer Tier Logic

```typescript
// src/app/(dashboard)/khachhang/utils/customerTierHelpers.ts

export const CUSTOMER_TIERS = {
  REGULAR: {
    name: 'Khách thường',
    minPoints: 0,
    maxPoints: 999,
    discount: 0,
    color: 'gray'
  },
  VIP: {
    name: 'VIP',
    minPoints: 1000,
    maxPoints: 2999,
    discount: 0.1,  // 10%
    color: 'blue'
  },
  DIAMOND: {
    name: 'Kim cương',
    minPoints: 3000,
    maxPoints: Infinity,
    discount: 0.2,  // 20%
    color: 'purple'
  }
};

// Get tier based on points
export function getTierByPoints(points: number) {
  if (points >= CUSTOMER_TIERS.DIAMOND.minPoints) {
    return CUSTOMER_TIERS.DIAMOND;
  }
  if (points >= CUSTOMER_TIERS.VIP.minPoints) {
    return CUSTOMER_TIERS.VIP;
  }
  return CUSTOMER_TIERS.REGULAR;
}

// Calculate points from invoice total
export function calculatePointsFromInvoice(totalAmount: number): number {
  // 1 point per 1000 VND
  return Math.floor(totalAmount / 1000);
}

// Get discount percentage
export function getDiscountPercentage(customerType: string): number {
  const tier = Object.values(CUSTOMER_TIERS).find(t => t.name === customerType);
  return tier?.discount ?? 0;
}

// Format tier for display
export function formatTierDisplay(tier: any) {
  return {
    label: tier.name,
    badge: `${tier.minPoints}${tier.maxPoints === Infinity ? '+' : `-${tier.maxPoints}`} pts`,
    discount: `${(tier.discount * 100).toFixed(0)}%`,
    color: tier.color
  };
}
```

---

## 4. REPORTING & ANALYTICS EXAMPLES

### 4.1 Report Data Hook

```typescript
// src/hooks/useReportData.ts
'use client';

import { useMemo } from 'react';
import { Invoice, InvoiceDetail } from '@/types';

export interface ReportFilters {
  dateRange?: { from: Date; to: Date };
  categories?: string[];
  paymentMethods?: string[];
  minAmount?: number;
  maxAmount?: number;
}

export const useReportData = (
  invoices: Invoice[],
  details: InvoiceDetail[],
  filters?: ReportFilters
) => {
  // Filter invoices based on criteria
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Date range filter
      if (filters?.dateRange) {
        const invDate = new Date(inv['Ngày']);
        if (invDate < filters.dateRange.from || invDate > filters.dateRange.to) {
          return false;
        }
      }

      // Payment method filter
      if (filters?.paymentMethods && filters.paymentMethods.length > 0) {
        if (!filters.paymentMethods.includes(inv['Loại thanh toán'])) {
          return false;
        }
      }

      // Amount range filter
      const total = inv['Tổng tiền'];
      if (filters?.minAmount && total < filters.minAmount) {
        return false;
      }
      if (filters?.maxAmount && total > filters.maxAmount) {
        return false;
      }

      return true;
    });
  }, [invoices, filters]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv['Tổng tiền'], 0);
    const totalOrders = filteredInvoices.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      totalVAT: filteredInvoices.reduce((sum, inv) => sum + inv['VAT'], 0),
      totalDiscount: filteredInvoices.reduce((sum, inv) => sum + inv['Ưu đãi'], 0)
    };
  }, [filteredInvoices]);

  // Get top products
  const topProducts = useMemo(() => {
    const productMap = new Map<string, { name: string; qty: number; revenue: number }>();

    details
      .filter(d => filteredInvoices.some(inv => inv.IDHOADON === d.IDHOADON))
      .forEach(d => {
        const existing = productMap.get(d.IDSP) || {
          name: d['Tên sản phẩm'],
          qty: 0,
          revenue: 0
        };

        productMap.set(d.IDSP, {
          name: d['Tên sản phẩm'],
          qty: existing.qty + d['Số lượng'],
          revenue: existing.revenue + d['Thành tiền']
        });
      });

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [details, filteredInvoices]);

  // Get daily revenue
  const dailyRevenue = useMemo(() => {
    const dayMap = new Map<string, number>();

    filteredInvoices.forEach(inv => {
      const date = new Date(inv['Ngày']).toLocaleDateString('vi-VN');
      dayMap.set(date, (dayMap.get(date) || 0) + inv['Tổng tiền']);
    });

    return Array.from(dayMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredInvoices]);

  // Get payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const methodMap = new Map<string, number>();

    filteredInvoices.forEach(inv => {
      const method = inv['Loại thanh toán'];
      methodMap.set(method, (methodMap.get(method) || 0) + inv['Tổng tiền']);
    });

    return Array.from(methodMap.entries())
      .map(([method, amount]) => ({ method, amount }));
  }, [filteredInvoices]);

  return {
    filteredInvoices,
    kpis,
    topProducts,
    dailyRevenue,
    paymentBreakdown
  };
};
```

### 4.2 KPI Cards Component

```typescript
// src/components/ReportKPICards.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp 
} from 'lucide-react';
import { CurrencyFormatter } from '@/lib/formatters';

interface KPICardsProps {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalDiscount: number;
}

export const ReportKPICards = ({
  totalRevenue,
  totalOrders,
  averageOrderValue,
  totalDiscount
}: KPICardsProps) => {
  const kpiData = [
    {
      title: 'Doanh Thu',
      value: CurrencyFormatter(totalRevenue),
      icon: DollarSign,
      color: 'bg-green-100 text-green-600',
      trend: '+12.5%'
    },
    {
      title: 'Số Đơn',
      value: totalOrders,
      icon: ShoppingCart,
      color: 'bg-blue-100 text-blue-600',
      trend: '+5%'
    },
    {
      title: 'Trung Bình/Đơn',
      value: CurrencyFormatter(averageOrderValue),
      icon: BarChart3,
      color: 'bg-purple-100 text-purple-600',
      trend: '+2.3%'
    },
    {
      title: 'Tổng Ưu Đãi',
      value: CurrencyFormatter(totalDiscount),
      icon: TrendingUp,
      color: 'bg-orange-100 text-orange-600',
      trend: '-1%'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {kpiData.map((kpi) => {
        const IconComponent = kpi.icon;
        return (
          <Card key={kpi.title}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {kpi.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${kpi.color}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-green-600 mt-1">{kpi.trend}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
```

---

## 5. FORM & VALIDATION EXAMPLES

### 5.1 Customer Form with Validation

```typescript
// src/app/(dashboard)/khachhang/components/CustomerFormModal.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDescription } from '@/components/ui/alert';
import toast from 'react-hot-toast';

interface CustomerFormData {
  'Tên khách hàng': string;
  'Số điện thoại': string;
  'Email'?: string;
  'Địa chỉ'?: string;
  'Loại khách hàng': 'Khách thường' | 'VIP' | 'Kim cương';
  'Trạng thái': 'Hoạt động' | 'Không hoạt động';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  initialData?: CustomerFormData;
  isEditing?: boolean;
}

export const CustomerFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing
}: Props) => {
  const [formData, setFormData] = useState<CustomerFormData>(
    initialData || {
      'Tên khách hàng': '',
      'Số điện thoại': '',
      'Email': '',
      'Địa chỉ': '',
      'Loại khách hàng': 'Khách thường',
      'Trạng thái': 'Hoạt động'
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData['Tên khách hàng']?.trim()) {
      newErrors['name'] = 'Tên khách hàng không được trống';
    }

    if (!formData['Số điện thoại']?.trim()) {
      newErrors['phone'] = 'Số điện thoại không được trống';
    } else if (!/^[0-9]{10,11}$/.test(formData['Số điện thoại'])) {
      newErrors['phone'] = 'Số điện thoại không hợp lệ (10-11 chữ số)';
    }

    if (formData['Email'] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData['Email'])) {
      newErrors['email'] = 'Email không hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('Vui lòng sửa lỗi trước khi lưu');
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
      onClose();
      setFormData({
        'Tên khách hàng': '',
        'Số điện thoại': '',
        'Email': '',
        'Địa chỉ': '',
        'Loại khách hàng': 'Khách thường',
        'Trạng thái': 'Hoạt động'
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Chỉnh Sửa Khách Hàng' : 'Thêm Khách Hàng'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="name">Tên khách hàng *</Label>
            <Input
              id="name"
              value={formData['Tên khách hàng']}
              onChange={(e) => setFormData({ 
                ...formData, 
                'Tên khách hàng': e.target.value 
              })}
              className={errors['name'] ? 'border-red-500' : ''}
            />
            {errors['name'] && (
              <p className="text-red-500 text-sm mt-1">{errors['name']}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone">Số điện thoại *</Label>
            <Input
              id="phone"
              value={formData['Số điện thoại']}
              onChange={(e) => setFormData({ 
                ...formData, 
                'Số điện thoại': e.target.value 
              })}
              placeholder="0912345678"
              className={errors['phone'] ? 'border-red-500' : ''}
            />
            {errors['phone'] && (
              <p className="text-red-500 text-sm mt-1">{errors['phone']}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData['Email'] || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                'Email': e.target.value 
              })}
              className={errors['email'] ? 'border-red-500' : ''}
            />
            {errors['email'] && (
              <p className="text-red-500 text-sm mt-1">{errors['email']}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <Label htmlFor="address">Địa chỉ</Label>
            <Input
              id="address"
              value={formData['Địa chỉ'] || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                'Địa chỉ': e.target.value 
              })}
            />
          </div>

          {/* Customer Type */}
          <div>
            <Label htmlFor="type">Loại khách hàng</Label>
            <Select 
              value={formData['Loại khách hàng']}
              onValueChange={(value) => setFormData({
                ...formData,
                'Loại khách hàng': value as any
              })}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Khách thường">Khách thường</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
                <SelectItem value="Kim cương">Kim cương</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Trạng thái</Label>
            <Select
              value={formData['Trạng thái']}
              onValueChange={(value) => setFormData({
                ...formData,
                'Trạng thái': value as any
              })}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Hoạt động">Hoạt động</SelectItem>
                <SelectItem value="Không hoạt động">Không hoạt động</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600"
          >
            {loading ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

---

## 6. UTILITY FUNCTIONS

### 6.1 Formatting Utilities

```typescript
// src/lib/formatters.ts

// Format currency (VND)
export function CurrencyFormatter(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Format date
export function DateFormatter(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// Format datetime
export function DateTimeFormatter(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Format percentage
export function PercentFormatter(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// Format number
export function NumberFormatter(value: number, decimals = 0): string {
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

// Parse Vietnamese date (DD/MM/YYYY)
export function parseVietnameseDate(dateString: string): Date | null {
  try {
    const [day, month, year] = dateString.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}
```

---

*This comprehensive code examples document provides real-world implementations for all major features of GOALPOS.*

*Version: 1.0*
*Last Updated: 10/05/2026*
