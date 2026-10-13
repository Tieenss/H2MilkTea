# 🏗️ GOALPOS - KIẾN TRÚC VÀ CẤU TRÚC CODE CHI TIẾT

## 1. APPLICATION ARCHITECTURE

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GOALPOS System                           │
└─────────────────────────────────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
        ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
        │   Frontend   │  │  Middleware │  │ Static/API  │
        │ (Next.js UI) │  │(Auth, Route)│  │   Routes    │
        └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
               │                │                │
        ┌──────▼────────────────▼────────────────▼──────┐
        │         Next.js Application Layer             │
        │  ┌─────────────────────────────────────────┐  │
        │  │  App Router (src/app)                   │  │
        │  │  - Login                                │  │
        │  │  - Dashboard (Protected)                │  │
        │  │    - POS, Orders, Customers, Reports   │  │
        │  └─────────────────────────────────────────┘  │
        └──────────────────┬───────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
   │ Context │      │  Hooks   │      │ Utils   │
   │ (State) │      │ (Logic)  │      │(Helpers)│
   └────┬────┘      └────┬────┘      └────┬────┘
        │                │                │
        └────────────────┼────────────────┘
                        │
        ┌───────────────▼───────────────┐
        │     Data Layer (JSON)          │
        │  - Local Storage               │
        │  - localStorage                │
        │  - JSON files (JSON imports)   │
        │  - Optional: Database (future) │
        └────────────────────────────────┘
```

### 1.2 Module Architecture

```
GOALPOS
├── POS Module
│   ├── Product Selection
│   ├── Cart Management
│   ├── Customer Selection
│   ├── Discount Application
│   ├── Table Management
│   ├── Payment Processing
│   └── Receipt Generation
│
├── Inventory Module
│   ├── Product Management
│   ├── Material Management
│   ├── Stocktake
│   ├── Forecasting
│   └── Supplier Management
│
├── Customer Module
│   ├── Customer Management
│   ├── Loyalty Program
│   ├── Transaction History
│   └── Discount Tiers
│
├── Reporting Module
│   ├── Sales Reports
│   ├── Product Analytics
│   ├── Customer Analytics
│   ├── Staff Performance
│   └── KPI Dashboards
│
├── Kitchen Module
│   ├── Order Display
│   ├── Status Tracking
│   └── Station Management
│
└── Admin Module
    ├── User Management
    ├── Settings
    ├── Data Backup/Restore
    └── System Configuration
```

---

## 2. DATA FLOW DIAGRAM

### 2.1 POS Order Flow

```
Customer Selection / Item Selection / Quantity
        │                 │              │
        └─────────────────┼──────────────┘
                          │
                    ┌─────▼─────┐
                    │ Cart Store │ (useState)
                    └─────┬─────┘
                          │
                    ┌─────▼──────────────────┐
                    │ Calculate Totals       │
                    │ - Subtotal             │
                    │ - VAT (10%)            │
                    │ - Customer Discount    │
                    │ - Final Total          │
                    └─────┬──────────────────┘
                          │
                    ┌─────▼──────────────────┐
                    │ Select Payment Method  │
                    │ - Cash                 │
                    │ - Card                 │
                    │ - Transfer             │
                    │ - VietQR               │
                    └─────┬──────────────────┘
                          │
                    ┌─────▼──────────────────┐
                    │ Generate Invoice       │
                    │ - Save to HOADON.json  │
                    │ - Save Details to      │
                    │   HOADONDETAIL.json    │
                    └─────┬──────────────────┘
                          │
                    ┌─────▼──────────────────┐
                    │ Print Receipt          │
                    │ - Kitchen Copy         │
                    │ - Customer Copy        │
                    └─────┬──────────────────┘
                          │
                    ┌─────▼──────────────────┐
                    │ Update Inventory       │
                    │ - Decrease Materials   │
                    │ - Update Customer Pts  │
                    │ - Clear Cart           │
                    └───────────────────────┘
```

### 2.2 Discount Application Flow

```
Customer Selected
        │
    ┌───▼───────────────────────────────┐
    │ Check Customer Type               │
    └───┬─────────────────────────────┬─┘
        │                             │
        ├─ Khách thường (0-999pts)    │
        │                             │
        ├─ Khách VIP (1000-2999pts)   │
        │                             │
        └─ Khách Kim cương (3000+pts) │
                                      │
                    ┌─────────────────▼────────────────┐
                    │ Get Discount Percentage          │
                    │ - Thường: 0%                     │
                    │ - VIP: 10%                       │
                    │ - Kim cương: 20%                 │
                    └─────────────────┬────────────────┘
                                      │
                    ┌─────────────────▼────────────────┐
                    │ Calculate Discount Amount        │
                    │ Discount = Subtotal × % / 100    │
                    └─────────────────┬────────────────┘
                                      │
                    ┌─────────────────▼────────────────┐
                    │ Apply to Total                   │
                    │ Total = Sub + VAT - Discount     │
                    └─────────────────┬────────────────┘
                                      │
                    ┌─────────────────▼────────────────┐
                    │ Display Discount Box             │
                    │ Show in Cart & Receipt           │
                    └──────────────────────────────────┘
```

---

## 3. STATE MANAGEMENT FLOW

### 3.1 Global State (Context)

```
TodayOrdersContext
├── todayOrdersCount (number)
├── isLoading (boolean)
├── error (string | null)
└── refreshTodayOrders() (function)
    │
    └─ Fetches HOADON.json
       └─ Filters by today's date
          └─ Returns count
             └─ Updates every 60 seconds
```

### 3.2 Local State (Component-level)

```
POS Page State
├── products (array)
├── cart (array)
├── selectedTableId (string)
├── selectedCustomer (Customer | null)
├── searchTerm (string)
├── categoryFilter (string)
├── priceFilter (number)
├── showTableModal (boolean)
├── showCheckoutModal (boolean)
├── showCustomerModal (boolean)
├── noteInput (string)
└── selectedItemForNote (CartItem | null)

Reports Page State
├── dateRange (DateRange)
├── categories (string[])
├── paymentMethods (string[])
├── minAmount (number)
├── maxAmount (number)
└── data (ReportData)

Customer Page State
├── searchTerm (string)
├── typeFilter (string)
├── statusFilter (string)
├── dateRange (DateRange)
└── selectedCustomer (Customer | null)
```

---

## 4. COMPONENT HIERARCHY

### 4.1 Dashboard Layout Hierarchy

```
Root Layout
├── ThemeProvider
│   └── TodayOrdersProvider
│       └── DashboardLayout
│           ├── Header
│           │   ├── Logo
│           │   ├── User Menu
│           │   ├── Theme Toggle
│           │   └── Logout
│           │
│           ├── Sidebar
│           │   ├── Navigation Menu
│           │   │   ├── Dashboard
│           │   │   ├── POS
│           │   │   ├── Orders (with TodayOrdersBadge)
│           │   │   ├── Customers
│           │   │   ├── Menu
│           │   │   ├── Inventory
│           │   │   ├── Reports
│           │   │   ├── Kitchen
│           │   │   ├── Staff
│           │   │   ├── Settings
│           │   │   └── Help
│           │   └── Collapse Toggle
│           │
│           ├── RouteProgress
│           │   └── Loading Bar
│           │
│           ├── ScrollToTop Button
│           │
│           └── Main Content Area
│               └── Page Components
│                   ├── Dashboard
│                   ├── POS
│                   ├── Orders
│                   ├── Customers
│                   ├── Reports
│                   └── ...
```

### 4.2 POS Page Component Tree

```
POSPage
├── Header (Mobile)
│   ├── Table Selector Button
│   ├── Customer Selector Button
│   └── Cart Button
│
├── Desktop Layout (LG+)
│   ├── Left Side (2/3)
│   │   ├── Search Bar
│   │   ├── Filters
│   │   └── ProductGrid
│   │       └── ProductCard (multiple)
│   │           ├── Image
│   │           ├── Name & Price
│   │           ├── +/- Buttons
│   │           └── Add to Cart
│   │
│   └── Right Side (1/3)
│       └── CartSidebar
│           ├── Table Info
│           ├── Customer Info
│           ├── Cart Items
│           │   ├── CartItem (multiple)
│           │   │   ├── Name & Price
│           │   │   ├── Qty +/-
│           │   │   ├── Note Button
│           │   │   └── Remove Button
│           │   └── Order Notes (if any)
│           │
│           ├── Pricing Section
│           │   ├── Subtotal
│           │   ├── VAT
│           │   ├── Discount Box (if customer)
│           │   └── Total
│           │
│           ├── Action Buttons
│           │   ├── Clear Cart
│           │   ├── Transfer Table
│           │   ├── Settings
│           │   ├── Print Preview
│           │   └── Checkout Button
│           │
│           └── Sync Status
│
├── Modals
│   ├── TableModal
│   │   ├── Search & Filter
│   │   └── Table List/Grid
│   │
│   ├── CheckoutModal
│   │   ├── Review Items
│   │   ├── Payment Method Selection
│   │   ├── Notes
│   │   ├── Total & Discount Display
│   │   └── Confirm Button
│   │
│   ├── TransferModal
│   │   ├── Current Table
│   │   ├── Target Table Selection
│   │   └── Transfer Items
│   │
│   ├── NoteModal
│   │   ├── Item Name
│   │   ├── Note Input
│   │   └── Save Button
│   │
│   ├── CustomerSelectModal
│   │   ├── Search Bar
│   │   ├── Customer List
│   │   └── Quick Add
│   │
│   └── ReceiptSettings
│       ├── Template Preview
│       ├── Settings Options
│       └── Save
```

### 4.3 Orders Page Component Tree

```
OrdersPage
├── Header
│   ├── Page Title
│   ├── Create New Button
│   ├── Filter Button
│   ├── Export Button
│   └── Settings
│
├── FilterBar
│   ├── Search Input
│   ├── Status Filter
│   ├── Payment Method Filter
│   ├── Date Range Picker
│   └── Reset Button
│
├── StatsSection
│   ├── StatCard: Total Orders
│   ├── StatCard: Today Orders
│   ├── StatCard: Total Revenue
│   ├── StatCard: Pending Orders
│   └── StatCard: Completed Orders
│
├── DataTable
│   ├── Columns
│   │   ├── Invoice ID
│   │   ├── Customer
│   │   ├── Staff
│   │   ├── Date
│   │   ├── Status
│   │   ├── Payment Method
│   │   ├── Amount
│   │   └── Actions
│   │
│   ├── Rows (Invoice Items)
│   │   └── Row Actions
│   │       ├── View Details
│   │       ├── Print
│   │       ├── Update Status
│   │       └── Delete
│   │
│   └── Pagination
│
└── Modals
    ├── InvoiceDetailsModal
    │   ├── Header Info
    │   ├── Customer Details
    │   ├── Invoice Items Table
    │   ├── Payment Info
    │   ├── Actions
    │   └── Close
    │
    └── PrintPreview
        ├── Receipt Template
        ├── Print Button
        └── Close
```

---

## 5. DATA MODELS

### 5.1 Core Interfaces/Types

```typescript
// Customer Type
type Customer = {
  IDKHACHHANG: string;
  'Tên khách hàng': string;
  'Số điện thoại': string;
  'Email'?: string;
  'Địa chỉ'?: string;
  'Loại khách hàng': 'Khách thường' | 'VIP' | 'Kim cương';
  'Điểm tích lũy': number;
  'Trạng thái': 'Hoạt động' | 'Không hoạt động';
  'Ngày tạo': string; // DD/MM/YYYY HH:mm:ss
}

// Invoice Type
type Invoice = {
  IDHOADON: string;
  IDBAN: string;
  'Khách hàng': string;
  'Nhân viên': string;
  'Ngày': string; // DD/MM/YYYY HH:mm:ss
  'Trạng thái': 'Hoàn thành' | 'Đang xử lý' | 'Hủy';
  'Loại thanh toán': 'Tiền mặt' | 'Chuyển khoản' | 'Thẻ' | 'VietQR';
  'Tạm tính': number;
  'VAT': number;
  'Ưu đãi': number;
  'Tổng tiền': number;
}

// Invoice Detail Type
type InvoiceDetail = {
  IDCHITIET: string;
  IDHOADON: string;
  IDSP: string;
  'Tên sản phẩm': string;
  'Số lượng': number;
  'Giá': number;
  'Thành tiền': number;
  'Ghi chú'?: string;
}

// Product Type
type Product = {
  IDSP: string;
  'Tên sản phẩm': string;
  'Loại sản phẩm': string;
  'Giá bán': number;
  'Đơn vị tính': string;
  'Hình ảnh'?: string;
  'Mô tả'?: string;
  'Trạng thái': 'Bán' | 'Ngừng bán';
}

// Table Type
type Table = {
  IDBAN: string;
  'Tên bàn': string;
  'Vị trí'?: string;
  'Sức chứa': number;
  'Trạng thái': 'Trống' | 'Có khách' | 'Đã đặt' | 'Bảo trì';
}

// Employee Type
type Employee = {
  IDNV: string;
  'Họ và Tên': string;
  'Chức vụ': string;
  'Số điện thoại': string;
  'Email': string;
  'Phân quyền': 'Admin' | 'Quản lý' | 'Nhân viên';
  'Trạng thái': 'Hoạt động' | 'Không hoạt động';
}

// Cart Item Type
type CartItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
  totalPrice: number;
}

// Report Data Type
type ReportData = {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: Product[];
  revenueByCategory: Record<string, number>;
  revenueByPaymentMethod: Record<string, number>;
  dailyRevenue: Record<string, number>;
}
```

---

## 6. HOOK ARCHITECTURE

### 6.1 Custom Hooks Pattern

```typescript
// usePOS.ts - Main POS Logic
export const usePOS = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Computed values
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const vat = subtotal * 0.1;
  const customerDiscount = selectedCustomer ? 
    subtotal * getDiscountRate(selectedCustomer) : 0;
  const total = subtotal + vat - customerDiscount;
  
  // Operations
  const addToCart = (product: Product, quantity: number) => { /* ... */ };
  const removeFromCart = (productId: string) => { /* ... */ };
  const adjustQuantity = (productId: string, newQty: number) => { /* ... */ };
  const clearCart = () => { /* ... */ };
  const processPayment = (method: PaymentMethod) => { /* ... */ };
  
  return {
    products, cart, selectedTableId, selectedCustomer,
    subtotal, vat, total, customerDiscount,
    addToCart, removeFromCart, adjustQuantity, clearCart, processPayment
  };
}

// useCustomers.ts - Customer Management
export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  
  const fetchCustomers = async () => { /* ... */ };
  const addCustomer = async (data: CustomerFormData) => { /* ... */ };
  const updateCustomer = async (id: string, data: CustomerFormData) => { /* ... */ };
  const deleteCustomer = async (id: string) => { /* ... */ };
  
  return { customers, loading, fetchCustomers, addCustomer, updateCustomer, deleteCustomer };
}

// useInvoices.ts - Order Management
export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetail[]>([]);
  
  const fetchInvoices = async () => { /* ... */ };
  const fetchInvoiceDetails = async (invoiceId: string) => { /* ... */ };
  const updateInvoiceStatus = async (id: string, status: string) => { /* ... */ };
  
  return { invoices, invoiceDetails, fetchInvoices, fetchInvoiceDetails, updateInvoiceStatus };
}

// useReportData.ts - Report Calculations
export const useReportData = () => {
  const calculateRevenue = (invoices: Invoice[], dateRange?: DateRange) => { /* ... */ };
  const getTopProducts = (details: InvoiceDetail[]) => { /* ... */ };
  const analyzeCustomerSegments = (customers: Customer[]) => { /* ... */ };
  
  return { calculateRevenue, getTopProducts, analyzeCustomerSegments };
}
```

---

## 7. API & DATA FETCHING PATTERN

### 7.1 JSON File Loading Pattern

```typescript
// Load data from JSON files (public/data/)
async function loadInvoices(): Promise<Invoice[]> {
  try {
    const response = await fetch('/data/HOADON.json');
    const data = await response.json();
    return data as Invoice[];
  } catch (error) {
    console.error('Error loading invoices:', error);
    return [];
  }
}

// Save data to localStorage
function saveInvoices(invoices: Invoice[]): void {
  try {
    localStorage.setItem('invoices', JSON.stringify(invoices));
  } catch (error) {
    console.error('Error saving invoices:', error);
  }
}

// Load from cache first, then fetch
async function getInvoices(): Promise<Invoice[]> {
  const cached = localStorage.getItem('invoices');
  if (cached) {
    return JSON.parse(cached);
  }
  
  const data = await loadInvoices();
  saveInvoices(data);
  return data;
}
```

### 7.2 Real-time Sync Pattern

```typescript
// Socket.io Connection (implied in dependencies)
const socket = io();

socket.on('invoice:created', (newInvoice: Invoice) => {
  setInvoices(prev => [...prev, newInvoice]);
  // Update UI
});

socket.on('data:updated', (data: any) => {
  // Refresh relevant data
  syncData();
});

// Emit event when data changes
function updateInvoice(invoice: Invoice) {
  socket.emit('invoice:update', invoice);
}
```

---

## 8. AUTHENTICATION FLOW

### 8.1 Login Flow

```
┌─────────────┐
│ Login Page  │
└──────┬──────┘
       │
       ├─ Username/Password
       ├─ Validate (against DSNV.json)
       │
    ┌──▼──────────────────────┐
    │ Check Credentials       │
    │ Match DSNV.json data?   │
    └──┬────────────────┬─────┘
       │                │
    ✓  │              ✗ │
       │                └──► Show Error Toast
       │
    ┌──▼────────────────────┐
    │ Generate Token        │
    │ (24 hour expiry)      │
    └──┬────────────────────┘
       │
    ┌──▼────────────────────┐
    │ Store in localStorage │
    │ - authToken           │
    │ - userData            │
    │ - tokenExpiry         │
    └──┬────────────────────┘
       │
    ┌──▼────────────────────┐
    │ Redirect to           │
    │ Dashboard or returnUrl│
    └──────────────────────┘
```

### 8.2 Protected Route Flow

```
Request Protected Route
        │
    ┌───▼──────────────────────┐
    │ middleware.ts checks:    │
    │ 1. Route is valid?       │
    │ 2. Token exists?         │
    │ 3. Token not expired?    │
    └───┬──────────────────────┘
        │
        ├─ ✓ All checks pass → Allow access
        │
        ├─ ✗ No token → Redirect to login
        │
        ├─ ✗ Invalid route → 404
        │
        └─ ✗ Token expired → Redirect to login
```

---

## 9. ERROR HANDLING PATTERNS

### 9.1 Try-Catch Pattern

```typescript
async function handleAddProduct(formData: ProductFormData) {
  try {
    setLoading(true);
    // Validate input
    if (!formData.name) throw new Error('Tên sản phẩm không được trống');
    
    // Process
    const newProduct = await addProduct(formData);
    
    // Success
    toast.success('Thêm sản phẩm thành công');
    setProducts(prev => [...prev, newProduct]);
  } catch (error: any) {
    console.error('Error:', error);
    toast.error(error.message || 'Lỗi khi thêm sản phẩm');
  } finally {
    setLoading(false);
  }
}
```

### 9.2 Validation Pattern

```typescript
function validateProduct(product: ProductFormData): string[] {
  const errors: string[] = [];
  
  if (!product.name?.trim()) {
    errors.push('Tên sản phẩm không được trống');
  }
  
  if (product.price <= 0) {
    errors.push('Giá sản phẩm phải lớn hơn 0');
  }
  
  if (!product.category) {
    errors.push('Danh mục không được trống');
  }
  
  return errors;
}

// Usage
const errors = validateProduct(formData);
if (errors.length > 0) {
  errors.forEach(err => toast.error(err));
  return;
}
```

---

## 10. STYLING ARCHITECTURE

### 10.1 Tailwind CSS Class Organization

```css
/* Utility-first approach */
<button className="
  px-4 py-2                    /* Padding */
  bg-blue-600 hover:bg-blue-700 /* Background */
  text-white font-semibold     /* Text */
  rounded-lg shadow-md         /* Border & Shadow */
  transition-colors duration-200 /* Animation */
  disabled:opacity-50          /* State */
">
  Save
</button>

/* Component grouping */
const buttonClasses = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
  danger: "bg-red-600 hover:bg-red-700 text-white",
}
```

### 10.2 CSS Module Organization

```css
/* pos.css */
.pos-container {
  @apply flex h-full gap-4;
}

.product-grid {
  @apply flex-1 overflow-auto;
}

.cart-sidebar {
  @apply w-80 border-l bg-gray-50;
}

@media (max-width: 1024px) {
  .pos-container {
    @apply flex-col;
  }
  
  .cart-sidebar {
    @apply w-full h-64;
  }
}
```

---

## 11. PERFORMANCE OPTIMIZATION

### 11.1 Memoization

```typescript
// Memoize expensive calculations
const filteredProducts = useMemo(() => {
  return products.filter(p => 
    p['Tên sản phẩm'].toLowerCase().includes(searchTerm.toLowerCase())
  );
}, [products, searchTerm]);

// Memoize callbacks
const handleAddToCart = useCallback((productId: string) => {
  setCart(prev => [...prev, { ...product, quantity: 1 }]);
}, []);

// Memoize components
const ProductCard = React.memo(({ product, onAdd }) => (
  <div>
    <h3>{product.name}</h3>
    <button onClick={() => onAdd(product.id)}>Add</button>
  </div>
));
```

### 11.2 Code Splitting

```typescript
// Dynamic imports for large components
const KitchenDisplay = dynamic(
  () => import('@/app/(dashboard)/kitchen/components/KitchenDisplay'),
  { loading: () => <div>Loading...</div> }
);

// Route-based code splitting (automatic with Next.js)
```

---

## 12. TESTING CONSIDERATIONS

### 12.1 Unit Test Examples

```typescript
// calculateDiscount.test.ts
describe('calculateDiscount', () => {
  it('should return 0% for regular customers', () => {
    const result = getDiscountRate({ type: 'Khách thường' });
    expect(result).toBe(0);
  });
  
  it('should return 10% for VIP customers', () => {
    const result = getDiscountRate({ type: 'VIP' });
    expect(result).toBe(0.1);
  });
  
  it('should return 20% for diamond customers', () => {
    const result = getDiscountRate({ type: 'Kim cương' });
    expect(result).toBe(0.2);
  });
});

// formatPrice.test.ts
describe('formatPrice', () => {
  it('should format VND correctly', () => {
    expect(formatPrice(1000)).toBe('1,000đ');
    expect(formatPrice(1000000)).toBe('1,000,000đ');
  });
});
```

### 12.2 Integration Test Examples

```typescript
// POS order flow test
describe('POS Order Flow', () => {
  it('should create invoice with correct total', async () => {
    // Setup
    const customer = { type: 'VIP' };
    const items = [
      { id: 1, price: 50000, qty: 2 },
      { id: 2, price: 100000, qty: 1 }
    ];
    
    // Execute
    const invoice = await processOrder(items, customer);
    
    // Assert
    const expectedSubtotal = 200000;
    const expectedVAT = 20000;
    const expectedDiscount = 20000;
    const expectedTotal = 200000;
    
    expect(invoice.total).toBe(expectedTotal);
  });
});
```

---

## 13. DEPLOYMENT CHECKLIST

### 13.1 Pre-deployment

- [ ] All TypeScript types check
- [ ] ESLint passes
- [ ] No console errors/warnings
- [ ] Environment variables configured
- [ ] Tests pass
- [ ] Build succeeds (`npm run build`)
- [ ] Performance optimized
- [ ] Security review done

### 13.2 Deployment Steps

```bash
# 1. Build
npm run build

# 2. Test build locally
npm start

# 3. Deploy to Vercel/Server
# - Vercel: Push to main branch
# - Self-hosted: Run `npm start` on server
```

### 13.3 Post-deployment

- [ ] Test all features in production
- [ ] Check error logs
- [ ] Monitor performance
- [ ] Verify data persistence
- [ ] Test real-time sync
- [ ] Check mobile responsiveness

---

## 14. TROUBLESHOOTING GUIDE

### 14.1 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Cart items not persisting | State reset on navigate | Use localStorage + Context |
| Discount not applying | Wrong customer type | Check `useCustomers` hook |
| Invoice not printing | Missing printer | Check browser print setup |
| Real-time sync failing | Socket.io connection | Check websocket connection |
| Data files not loading | Wrong path | Verify `/public/data/` files |
| Theme not changing | localStorage issue | Clear cache, check next-themes |
| Serverless error | `/var/task/data` not writable | Use `/tmp` directory |

### 14.2 Debug Mode

```typescript
// Enable debug logs
const DEBUG = process.env.NODE_ENV === 'development';

function debugLog(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, data);
  }
}

// Usage
debugLog('Customer selected:', selectedCustomer);
debugLog('Cart total:', total);
```

---

## 15. MIGRATION & UPGRADE PATH

### 15.1 Database Migration (Future)

```
Phase 1: Current State
├── JSON files (public/data/)
└── localStorage

Phase 2: Hybrid Approach
├── Keep JSON for demo
├── Add PostgreSQL/MongoDB
└── Dual sync

Phase 3: Full Database
├── Migrate to PostgreSQL/MongoDB
├── Remove JSON dependency
├── Real-time subscriptions
└── Analytics DB
```

### 15.2 API Gateway (Future)

```
Current: Frontend ↔ JSON
Future:  Frontend ↔ API Gateway ↔ Database
         Frontend ↔ WebSocket ↔ Real-time Service
```

---

*Document Version: 1.0*
*Last Updated: 10/05/2026*
*For GOALPOS POS System Analysis*
