# 📊 GOALPOS - Hệ Thống Quản Lý Bán Hàng - Phân Tích Toàn Diện

## 1. GIỚI THIỆU DỰ ÁN

### 1.1 Tên Dự Án
- **Tên chính thức**: GOALPOS / Goal POS
- **Loại**: Hệ thống quản lý điểm bán hàng (Point of Sale System)
- **Phiên bản**: v1.0
- **Mục đích**: Quản lý bán hàng F&B (nhà hàng, quán cafe, cửa hàng thức ăn nước uống)

### 1.2 Mô Tả Chức Năng
GOALPOS là một hệ thống quản lý bán hàng (POS) toàn diện được thiết kế dành riêng cho các cửa hàng F&B. Hệ thống được xây dựng với công nghệ hiện đại, giao diện thân thiện và tích hợp đầy đủ các tính năng cần thiết cho việc quản lý kinh doanh hiệu quả.

### 1.3 Đặc Điểm Nổi Bật
- Giao diện responsive tối ưu cho mọi thiết bị
- Hỗ trợ Dark/Light Mode
- Phân quyền chi tiết (Admin, Manager, Nhân viên)
- Đồng bộ dữ liệu real-time trên nhiều thiết bị
- Hỗ trợ offline mode
- PWA Ready
- In hóa đơn tích hợp

---

## 2. STACK CÔNG NGHỆ

### 2.1 Frontend
- **Framework**: Next.js 15.3.3 - React 19 Framework với App Router
- **Ngôn ngữ**: TypeScript 5
- **Styling**: Tailwind CSS 3.4.17 + PostCSS 4.0
- **UI Library**: Shadcn/ui - High-quality component library
- **Icons**: Lucide React 0.514.0
- **State Management**: React Context + React Query 5.81.2
- **Data Table**: React Table 8.21.3 (@tanstack/react-table)

### 2.2 Thư Viện Chính
- **Toast Notifications**: react-hot-toast 2.5.2, sonner 2.0.5, react-toastify 11.0.5
- **Date Picker**: date-fns 4.1.0, react-day-picker 9.7.0
- **Charts**: Chart.js 4.5.0, react-chartjs-2 5.3.0, recharts 2.15.3
- **Drag & Drop**: @hello-pangea/dnd 18.0.1
- **Themes**: next-themes 0.4.6
- **Utilities**: clsx 2.1.1, tailwind-merge 3.3.1, class-variance-authority 0.7.1

### 2.3 Thư Viện Chuyên Biệt
- **Payment**: @payos/node 1.0.10, @payos/payos-checkout 1.0.8
- **Printer**: node-thermal-printer 4.5.0 (in hóa đơn tích hợp)
- **Excel**: xlsx 0.18.5 (import/export data)
- **XML**: xmlbuilder2 3.1.1
- **Google**: googleapis 152.0.0, google-auth-library 10.1.0
- **Database**: @supabase/supabase-js 2.105.4, @supabase/ssr 0.10.3
- **Realtime**: socket.io 4.8.1 (đồng bộ dữ liệu real-time)
- **Cmd Palette**: cmdk 1.1.1 (command palette)

### 2.4 Radix UI Components
- Alert Dialog, Avatar, Checkbox, Dialog, Dropdown Menu
- Label, Popover, Progress, Scroll Area, Select
- Separator, Slot, Switch, Tabs

### 2.5 Build & Development
- **Lint**: ESLint 9, eslint-config-next 15.3.3
- **Package Manager**: npm
- **Build Command**: next build
- **Dev Command**: next dev --turbopack

---

## 3. CẤU TRÚC THƯMỤC DỰ ÁN

```
Next-coffe-demo-main/
├── public/                          # Static files & Demo Data
│   ├── data/
│   │   ├── CAUHINH.json            # Cấu hình
│   │   ├── DMHH.json               # Danh mục hàng hóa
│   │   ├── DSBAN.json              # Danh sách bàn
│   │   ├── DSNV.json               # Danh sách nhân viên
│   │   ├── HOADON.json             # Hóa đơn (invoices)
│   │   ├── HOADONDETAIL.json       # Chi tiết hóa đơn
│   │   ├── KHACHHANG.json          # Khách hàng
│   │   ├── KIEMKEKHO.json          # Kiểm kê kho
│   │   ├── NGUYENLIEU.json         # Nguyên liệu
│   │   ├── NHACUNGCAP.json         # Nhà cung cấp
│   │   └── NHAPXUATKHO.json        # Nhập/xuất kho
│   └── manifest.json
│
├── src/
│   ├── middleware.ts                # Next.js Middleware
│   ├── app/
│   │   ├── globals.css             # Global styles
│   │   ├── layout.tsx              # Root layout
│   │   ├── login.tsx               # Login page
│   │   ├── not-found.tsx           # 404 page
│   │   ├── page.tsx                # Root page (redirects to login)
│   │   │
│   │   └── (dashboard)/            # Protected dashboard routes
│   │       ├── layout.tsx          # Dashboard layout with sidebar & header
│   │       ├── not-found.tsx
│   │       │
│   │       ├── dashboard/          # Dashboard tổng quan
│   │       ├── pos/                # ⭐ POS Bán hàng (Module chính)
│   │       │   ├── page.tsx
│   │       │   ├── components/
│   │       │   │   ├── BarcodeScanner.tsx
│   │       │   │   ├── ProductGrid.tsx
│   │       │   │   ├── CartSidebar.tsx
│   │       │   │   ├── TableModal.tsx
│   │       │   │   ├── CheckoutModal.tsx
│   │       │   │   ├── TransferModal.tsx
│   │       │   │   ├── NoteModal.tsx
│   │       │   │   ├── ReceiptSettings.tsx
│   │       │   │   └── CustomerSelectModal.tsx
│   │       │   ├── hooks/
│   │       │   │   └── usePOS.ts
│   │       │   ├── styles/
│   │       │   │   └── pos.css
│   │       │   ├── types/
│   │       │   └── utils/
│   │       │
│   │       ├── orders/             # 📦 Quản lý đơn hàng
│   │       │   ├── page.tsx
│   │       │   ├── components/
│   │       │   │   ├── InvoiceStats.tsx
│   │       │   │   ├── InvoiceDataTable.tsx
│   │       │   │   ├── InvoiceDetailsModal.tsx
│   │       │   │   └── ...
│   │       │   ├── hooks/
│   │       │   │   └── useInvoices.ts
│   │       │   ├── types/
│   │       │   │   └── invoice.ts
│   │       │   └── utils/
│   │       │
│   │       ├── khachhang/          # 👥 Quản lý khách hàng
│   │       │   ├── page.tsx
│   │       │   ├── components/
│   │       │   │   ├── CustomerStats.tsx
│   │       │   │   ├── CustomerDataTable.tsx
│   │       │   │   ├── CustomerDetailsModal.tsx
│   │       │   │   ├── CustomerFormModal.tsx
│   │       │   │   └── ...
│   │       │   ├── hooks/
│   │       │   │   └── useCustomers.ts
│   │       │   ├── types/
│   │       │   │   └── customer.ts
│   │       │   └── utils/
│   │       │
│   │       ├── tables/             # 🪑 Quản lý bàn
│   │       │   ├── page.tsx
│   │       │   ├── components/
│   │       │   │   ├── TableCard.tsx
│   │       │   │   ├── TableForm.tsx
│   │       │   │   ├── TableStats.tsx
│   │       │   │   └── ...
│   │       │   ├── hooks/
│   │       │   │   └── useTables.ts
│   │       │   ├── types/
│   │       │   └── utils/
│   │       │
│   │       ├── kitchen/            # 🍳 Kitchen Display System (KDS)
│   │       │   ├── page.tsx
│   │       │   ├── components/
│   │       │   │   └── KitchenDisplay.tsx
│   │       │   └── ...
│   │       │
│   │       ├── menu/               # 🍽️ Quản lý Menu & Sản phẩm
│   │       │   ├── products/       # Quản lý sản phẩm
│   │       │   │   ├── page.tsx
│   │       │   │   ├── components/
│   │       │   │   ├── hooks/
│   │       │   │   ├── types/
│   │       │   │   └── utils/
│   │       │   ├── nguyenlieu/     # Quản lý nguyên liệu
│   │       │   │   ├── page.tsx
│   │       │   │   ├── components/
│   │       │   │   ├── hooks/
│   │       │   │   ├── types/
│   │       │   │   └── utils/
│   │       │   └── cauhinhnguyenlieu/  # Cấu hình định mức nguyên liệu
│   │       │       ├── page.tsx
│   │       │       ├── components/
│   │       │       ├── hooks/
│   │       │       ├── types/
│   │       │       └── utils/
│   │       │
│   │       ├── inventory/          # 📦 Quản lý kho nâng cao
│   │       │   ├── page.tsx
│   │       │   ├── transactions/   # Giao dịch kho
│   │       │   ├── stocktake/      # Kiểm kê kho
│   │       │   ├── suppliers/      # Nhà cung cấp
│   │       │   ├── forecast/       # Dự báo
│   │       │   ├── categories/     # Danh mục
│   │       │   ├── products/       # Sản phẩm trong kho
│   │       │   ├── customers/      # Khách hàng
│   │       │   ├── orders/         # Đơn hàng
│   │       │   └── reports/        # Báo cáo kho
│   │       │
│   │       ├── products/           # 📦 Quản lý sản phẩm (Old)
│   │       │   ├── page.tsx
│   │       │   ├── components/
│   │       │   ├── hooks/
│   │       │   ├── types/
│   │       │   └── utils/
│   │       │
│   │       ├── reports/            # 📊 Báo cáo & Thống kê
│   │       │   ├── dashboard/      # Dashboard báo cáo
│   │       │   ├── sales/          # Báo cáo bán hàng
│   │       │   ├── bestsellers/    # Top sản phẩm bán chạy
│   │       │   ├── products/       # Báo cáo sản phẩm
│   │       │   ├── customers/      # Báo cáo khách hàng
│   │       │   ├── staff/          # Báo cáo nhân viên
│   │       │   └── ...
│   │       │
│   │       ├── nhanvien/           # 👨‍💼 Quản lý nhân viên
│   │       │   ├── page.tsx (or page.txt)
│   │       │   ├── components/
│   │       │   ├── hooks/
│   │       │   ├── types/
│   │       │   └── utils/
│   │       │
│   │       ├── settingdata/        # ⚙️ Cài đặt & Backup dữ liệu
│   │       │   ├── page.tsx
│   │       │   ├── components/
│   │       │   └── ...
│   │       │
│   │       ├── profile/            # 👤 Trang cá nhân
│   │       ├── receipt-settings/   # 🧾 Cài đặt mẫu in
│   │       └── user-guide/         # 📖 Hướng dẫn sử dụng
│   │
│   ├── components/
│   │   ├── GoogleDriveSync.tsx     # Đồng bộ Google Drive
│   │   ├── ReceiptPreview.tsx      # Preview mẫu in
│   │   ├── ReportFilters.tsx       # Component filter báo cáo
│   │   ├── ReportKPICards.tsx      # KPI cards cho báo cáo
│   │   ├── SyncStatusCard.tsx      # Card trạng thái sync
│   │   ├── TodayOrdersBadge.tsx    # Badge số đơn hôm nay
│   │   ├── TodayOrdersCard.tsx     # Card số đơn hôm nay
│   │   ├── theme-provider.tsx      # Theme provider
│   │   ├── charts/
│   │   │   └── ClientCharts.tsx    # Client-side charts
│   │   └── ui/                     # Shadcn/ui Components
│   │       ├── alert.tsx
│   │       ├── alert-dialog.tsx
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── calendar.tsx
│   │       ├── card.tsx
│   │       ├── checkbox.tsx
│   │       ├── command.tsx
│   │       ├── date-range-picker.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── header.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── popover.tsx
│   │       ├── progress.tsx
│   │       ├── route-progress.tsx
│   │       ├── scroll-area.tsx
│   │       ├── scroll-to-top.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── sheet.tsx
│   │       ├── sidebar.tsx
│   │       ├── switch.tsx
│   │       ├── table.tsx
│   │       ├── tabs.tsx
│   │       ├── textarea.tsx
│   │       ├── tooltip.tsx
│   │       └── ...
│   │
│   ├── config/
│   │   ├── config.ts               # Config chính
│   │   ├── environment.ts          # Environment variables
│   │   └── googleDrive.ts          # Google Drive config
│   │
│   ├── context/
│   │   ├── ThemeContext.tsx        # Theme dark/light mode
│   │   └── TodayOrdersContext.tsx  # Context cho số đơn hôm nay
│   │
│   ├── hooks/
│   │   ├── useReceiptSettings.ts   # Hook for receipt settings
│   │   ├── useReportData.ts        # Hook for report data
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── formatters.ts           # Formatting utilities
│   │   ├── navigation.ts           # Navigation structure
│   │   └── utils.ts                # General utilities
│   │
│   ├── data/                       # Sample JSON data
│   │   └── (same as public/data/)
│   │
│   ├── pages/
│   │   └── api/
│   │       └── kitchen/            # Kitchen API endpoints
│   │
│   └── utils/
│       ├── authUtils.ts            # Authentication utilities
│       ├── DataManager.ts          # Data management
│       ├── googleDriveUtils.ts     # Google Drive utilities
│       ├── jsonFileManager.ts      # JSON file operations
│       └── receiptSettings.ts      # Receipt settings utilities
│
├── docs/                            # Documentation
│   ├── auto-save-guide.md
│   ├── auto-save-fix.md
│   ├── customer-discount-guide.md
│   ├── customer-discount-quick-guide.md
│   ├── inventory-data-fix-complete.md
│   ├── inventory-data-integration.md
│   ├── quick-start.md
│   ├── serverless-compatibility.md
│   ├── stocktake-toLocaleString-fix-summary.md
│   ├── today-orders-feature.md
│   └── user-guide.md
│
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript config
├── next.config.ts                   # Next.js config
├── tailwind.config.js               # Tailwind CSS config
├── postcss.config.js                # PostCSS config
├── eslint.config.mjs                # ESLint config
├── components.json                  # Shadcn/ui config
├── README.md                        # Project README
└── test-*.md                        # Test documentation
```

---

## 4. CÁC MODULE & TÍNH NĂNG CHÍNH

### 4.1 🛍️ POS BÁN HÀNG (Module chính)

**File**: `src/app/(dashboard)/pos/`

**Tính năng**:
- Giao diện bán hàng trực quan với danh sách sản phẩm theo thể loại
- Giỏ hàng dynamic với cập nhật real-time
- Barcode scanner integration
- Quản lý bàn (table management)
- Chọn khách hàng & áp dụng ưu đãi tự động
- Thêm ghi chú cho từng món
- Chuyển bàn (transfer table)
- Multiple payment methods (tiền mặt, chuyển khoản, thẻ, VietQR)
- Tính VAT tự động (10%)
- Áp dụng ưu đãi khách hàng (10% VIP, 20% Kim cương)
- In hóa đơn tích hợp
- Receipt preview & settings

**Components chính**:
- ProductGrid - Hiển thị danh sách sản phẩm
- CartSidebar - Giỏ hàng
- TableModal - Chọn bàn
- CheckoutModal - Thanh toán
- CustomerSelectModal - Chọn khách hàng
- BarcodeScanner - Quét mã vạch
- NoteModal - Thêm ghi chú

**Hooks**:
- usePOS() - Quản lý toàn bộ logic POS

**Tính toán tiền tệ**:
```
Tạm tính = Giá × Số lượng
VAT = Tạm tính × 10%
Ưu đãi = Tạm tính × % ưu đãi khách hàng
Tổng = Tạm tính + VAT - Ưu đãi
```

---

### 4.2 📦 QUẢN LÝ ĐƠN HÀNG (Orders Management)

**File**: `src/app/(dashboard)/orders/`

**Tính năng**:
- Danh sách tất cả đơn hàng với filter & search
- Thống kê đơn hàng (tổng số, hôm nay, theo trạng thái)
- Chi tiết đơn hàng (khách hàng, sản phẩm, thanh toán, v.v.)
- Lọc theo:
  - Trạng thái (Hoàn thành, Đang xử lý, Hủy)
  - Phương thức thanh toán
  - Ngày tạo
  - Nhân viên
- Cập nhật trạng thái đơn hàng
- Xóa đơn hàng
- In hóa đơn/receipt
- Export Excel
- Badge "Đơn hôm nay" - tự động cập nhật

**Components**:
- InvoiceStats - Thống kê đơn hàng
- InvoiceDataTable - Bảng danh sách
- InvoiceDetailsModal - Chi tiết đơn

**Hook**:
- useInvoices() - Quản lý invoice data

---

### 4.3 👥 QUẢN LÝ KHÁCH HÀNG (Customer Management)

**File**: `src/app/(dashboard)/khachhang/`

**Tính năng**:
- Quản lý thông tin khách hàng (tên, SĐT, email, địa chỉ)
- Phân loại khách hàng:
  - Khách thường: 0% ưu đãi
  - Khách VIP: 10% ưu đãi (1000-2999 điểm)
  - Khách kim cương: 20% ưu đãi (3000+ điểm)
- Theo dõi điểm tích lũy
- Lịch sử mua hàng
- Filter & search
- Thêm/sửa/xóa khách hàng
- Export dữ liệu khách hàng
- Thống kê khách hàng (tổng số, theo loại, lịch sử)

**Components**:
- CustomerStats - Thống kê
- CustomerDataTable - Bảng dữ liệu
- CustomerDetailsModal - Chi tiết khách
- CustomerFormModal - Form thêm/sửa

**Hook**:
- useCustomers() - Quản lý customer data

---

### 4.4 🪑 QUẢN LÝ BÀN (Table Management)

**File**: `src/app/(dashboard)/tables/`

**Tính năng**:
- Quản lý danh sách bàn (vị trí, dung tích, trạng thái)
- Trạng thái bàn: Trống, Có khách, Đã đặt, Bảo trì
- Thêm/sửa/xóa bàn
- Tìm kiếm theo vị trí
- Thống kê bàn
- Card view hiển thị trạng thái bàn với màu sắc

**Components**:
- TableCard - Hiển thị thông tin bàn
- TableForm - Form thêm/sửa bàn
- TableStats - Thống kê

**Hook**:
- useTables() - Quản lý table data

---

### 4.5 🍽️ QUẢN LÝ MENU & SẢN PHẨM

**File**: `src/app/(dashboard)/menu/`

#### 4.5.1 Products Management
**Tính năng**:
- Danh sách sản phẩm bán hàng (chế biến sẵn)
- Thông tin: tên, giá, danh mục, mô tả, ảnh, v.v.
- Thêm/sửa/xóa sản phẩm
- Copy sản phẩm
- Import từ Excel
- Export dữ liệu
- Tìm kiếm & filter theo danh mục
- View chi tiết sản phẩm

#### 4.5.2 Nguyên Liệu (Materials)
**Tính năng**:
- Quản lý nguyên liệu dùng để chế biến
- Thông tin: tên, đơn vị tính, giá nhập, nhà cung cấp
- Quản lý tồn kho nguyên liệu
- Cảnh báo tồn kho thấp
- Thêm/sửa/xóa nguyên liệu
- Import từ Excel
- Thống kê nguyên liệu

#### 4.5.3 Cấu Hình Định Mức Nguyên Liệu (Product Materials)
**Tính năng**:
- Cấu hình nguyên liệu cho từng sản phẩm
- Xác định lượng nguyên liệu cần cho mỗi sản phẩm
- Calculator tính toán nguyên liệu
- Xem tồn kho nguyên liệu cho từng sản phẩm
- Material calculator - tính toán lượng nguyên liệu cần

---

### 4.6 🍳 KITCHEN DISPLAY SYSTEM (KDS)

**File**: `src/app/(dashboard)/kitchen/`

**Tính năng**:
- Hiển thị các đơn hàng mới trên màn hình bếp
- Theo dõi trạng thái từng mon
- Thông báo khi có đơn mới
- Giao diện tối ưu cho bếp (màu lớn, dễ đọc)
- Hỗ trợ multiple cooking stations
- Giới hạn số đơn hiển thị (max orders)

**Component**:
- KitchenDisplay - Main KDS component

---

### 4.7 📊 BÁO CÁO & THỐNG KÊ (Reports & Analytics)

**File**: `src/app/(dashboard)/reports/`

#### 4.7.1 Dashboard Báo Cáo
**Tính năng**:
- Tổng quan doanh thu hôm nay, tuần, tháng, năm
- Biểu đồ doanh thu theo thời gian
- KPI cards - hiển thị chỉ số quan trọng
- Top sản phẩm bán chạy
- Xu hướng kinh doanh

#### 4.7.2 Báo Cáo Bán Hàng
**Tính năng**:
- Chi tiết doanh thu theo ngày/tuần/tháng
- Filter theo ngày, danh mục, phương thức thanh toán
- Min/Max amount filter
- Biểu đồ xu hướng
- Thống kê chi tiết
- Export Excel

#### 4.7.3 Báo Cáo Sản Phẩm
**Tính năng**:
- Top sản phẩm bán chạy
- Doanh thu theo sản phẩm
- Phân tích hiệu suất sản phẩm
- Biểu đồ so sánh

#### 4.7.4 Báo Cáo Khách Hàng
**Tính năng**:
- Phân tích khách hàng theo loại
- Doanh thu từ từng nhóm khách hàng
- Top khách hàng
- Tần suất mua hàng
- Giá trị đơn hàng trung bình

#### 4.7.5 Báo Cáo Nhân Viên
**Tính năng**:
- Hiệu suất bán hàng từng nhân viên
- KPI nhân viên (doanh thu, số lượng đơn, avg bill)
- Ranking nhân viên

**Components**:
- ReportKPICards - Hiển thị KPI
- ReportFilters - Bộ lọc báo cáo
- Multiple Chart types (Bar, Pie, Line) using Chart.js & Recharts

---

### 4.8 📦 QUẢN LÝ KHO NÂNG CAO (Advanced Inventory)

**File**: `src/app/(dashboard)/inventory/`

**Tính năng**:
- **Giao dịch kho** (Transactions) - lịch sử nhập/xuất
- **Kiểm kê kho** (Stocktake) - kiểm kho định kỳ
- **Nhà cung cấp** (Suppliers) - quản lý nhà cung cấp
- **Dự báo** (Forecast) - dự báo tồn kho
- **Danh mục** (Categories) - quản lý danh mục hàng hóa
- **Sản phẩm** (Products) - quản lý sản phẩm trong kho
- **Khách hàng** - liên kết khách hàng
- **Đơn hàng** - lịch sử đơn hàng
- **Báo cáo kho** - thống kê kho

---

### 4.9 👨‍💼 QUẢN LÝ NHÂN VIÊN (Employee Management)

**File**: `src/app/(dashboard)/nhanvien/`

**Tính năng**:
- Danh sách nhân viên
- Thông tin: tên, mã nhân viên, chức vụ, số điện thoại, email, địa chỉ
- Phân quyền người dùng: Admin, Manager, Nhân viên
- Thêm/sửa/xóa nhân viên
- Thống kê nhân viên
- Theo dõi hiệu suất
- Avatar & thông tin cá nhân

---

### 4.10 ⚙️ QUẢN LÝ HỆ THỐNG (System Settings)

**File**: `src/app/(dashboard)/settingdata/`

**Tính năng**:
- **Sao lưu dữ liệu** (Backup/Restore)
  - Backup/Restore từng file dữ liệu
  - Download backup
  - Restore từ file
  - Backup tự động
- **Quản lý dữ liệu**
  - Upload file JSON mới
  - Xóa dữ liệu
  - Refresh dữ liệu
  - Sync dữ liệu
- **Thống kê dữ liệu**
  - Hiển thị số lượng bản ghi từng loại
  - Dung lượng file
  - Thời gian cập nhật cuối cùng

---

### 4.11 🧾 CẤU HÌNH MẪU IN (Receipt Settings)

**File**: `src/app/(dashboard)/receipt-settings/`

**Tính năng**:
- Cấu hình mẫu in hóa đơn
- Cấu hình mẫu in cho bếp (KDS)
- Tùy chỉnh header, footer
- Chọn thông tin hiển thị trên hóa đơn
- Preview mẫu in
- Lưu cài đặt

---

### 4.12 📖 HƯỚNG DẪN SỬ DỤNG (User Guide)

**File**: `src/app/(dashboard)/user-guide/`

**Tính năng**:
- Hướng dẫn sử dụng hệ thống
- Hướng dẫn các tính năng chính
- FAQ
- Troubleshooting

---

## 5. TÍNH NĂNG ĐẶC BIỆT

### 5.1 Ưu Đãi Khách Hàng (Customer Discount)

**Tự động áp dụng giảm giá dựa trên loại khách hàng**:
- **Khách thường**: 0% ưu đãi
- **Khách VIP** (1000-2999 điểm): 10% ưu đãi
- **Khách kim cương** (3000+ điểm): 20% ưu đãi

**Cách tính**:
```
Tạm tính = Tổng giá sản phẩm × số lượng
VAT = Tạm tính × 10%
Ưu đãi = Tạm tính × % ưu đãi
Tổng = Tạm tính + VAT - Ưu đãi
```

**Hiển thị**:
- Badge loại khách hàng với màu sắc
- Khung ưu đãi trong giỏ hàng
- Hiển thị trên hóa đơn

---

### 5.2 Số Đơn Hàng Hôm Nay (Today Orders Counter)

**Tính năng**:
- Tự động đếm số đơn hàng tạo trong ngày hôm nay
- Hiển thị ở 3 vị trí:
  - **Sidebar**: Badge cạnh menu "Đơn hàng"
  - **Dashboard**: Card với số đơn
  - **Trang Orders**: Thống kê "Hôm nay"
- Cập nhật real-time mỗi phút
- Sử dụng Context Provider (TodayOrdersContext)

**Implementation**:
- `TodayOrdersProvider` - wrap trong DashboardLayout
- `TodayOrdersBadge` - component badge
- `TodayOrdersCard` - component card
- Auto-refresh mỗi 60 giây

---

### 5.3 Đồng Bộ Dữ Liệu Real-time (Real-time Sync)

**Tính năng**:
- Sync dữ liệu tự động giữa các thiết bị
- Socket.io integration
- Cập nhật tức thì khi có thay đổi dữ liệu
- Refresh button trong POS
- Loading indicator

---

### 5.4 Google Drive Integration

**Tính năng**:
- Upload/Download dữ liệu từ Google Drive
- Backup tự động lên Google Drive
- Sync dữ liệu từ Google Drive
- Component: GoogleDriveSync.tsx
- Utils: googleDriveUtils.ts

---

### 5.5 Tính Tương Thích Serverless

**Tính năng**:
- Hỗ trợ chạy trên Vercel, AWS Lambda, Netlify
- Tự động detect môi trường serverless
- Sử dụng `/tmp` directory thay vì `/var/task/data`
- Graceful error handling

**Phát hiện**:
- `process.env.VERCEL` - Vercel
- `process.env.AWS_LAMBDA_FUNCTION_NAME` - AWS Lambda

---

### 5.6 Dark/Light Mode

**Tính năng**:
- Toggle theme
- Persistent theme preference
- Sử dụng next-themes
- ThemeContext.tsx

---

### 5.7 Responsive Design & PWA

**Tính năng**:
- Responsive layout cho mobile, tablet, desktop
- Sidebar collapse trên mobile
- Mobile-optimized navigation
- PWA ready (manifest.json)
- Offline support

---

## 6. AUTHENTICATION & AUTHORIZATION

### 6.1 Xác Thực (Authentication)

**File**: `src/utils/authUtils.ts`, `src/middleware.ts`

**Tính năng**:
- Login/Logout
- Token-based authentication
- Token expiry handling (24 hours default)
- Redirect to login khi token hết hạn

**Store**:
- Token: localStorage/cookie (authToken)
- User data: localStorage (userData)
- Token expiry: localStorage (tokenExpiry)

### 6.2 Phân Quyền (Authorization)

**3 Cấp độ phân quyền**:
1. **Admin** - Toàn quyền
2. **Manager** (Quản lý) - Quản lý nhân viên, báo cáo
3. **Staff** (Nhân viên) - Bán hàng POS

**Kiểm tra quyền**:
```tsx
const userData = authUtils.getUserData();
const isAdmin = userData['Phân quyền'] === 'Admin';
const isManager = userData['Phân quyền'] === 'Quản lý';
```

### 6.3 Protected Routes

**Middleware**:
- Tất cả routes (trừ login) cần token
- Invalid routes → 404
- Redirect to login khi không có token

---

## 7. CẤU TRÚC DỮ LIỆU (Data Structure)

### 7.1 JSON Data Files

Dữ liệu được lưu trữ trong JSON files:

#### HOADON.json (Invoices)
```json
{
  "IDHOADON": "INV001",
  "IDBAN": "B01",
  "Khách hàng": "Nguyễn Văn A",
  "Nhân viên": "Nhân viên 1",
  "Ngày": "2024-01-15",
  "Trạng thái": "Hoàn thành",
  "Loại thanh toán": "Tiền mặt",
  "Tạm tính": 500000,
  "VAT": 50000,
  "Ưu đãi": 50000,
  "Tổng tiền": 500000
}
```

#### KHACHHANG.json (Customers)
```json
{
  "IDKHACHHANG": "C001",
  "Tên khách hàng": "Nguyễn Văn A",
  "Số điện thoại": "0912345678",
  "Email": "abc@gmail.com",
  "Địa chỉ": "123 Đường ABC",
  "Loại khách hàng": "VIP",
  "Điểm tích lũy": 1500,
  "Trạng thái": "Hoạt động",
  "Ngày tạo": "2024-01-01"
}
```

#### DMHH.json (Product Categories)
```json
{
  "IDDMHH": "CAT001",
  "Tên danh mục": "Cà phê",
  "Mô tả": "Các loại cà phê"
}
```

#### HOADONDETAIL.json (Invoice Details)
```json
{
  "IDCHITIET": "DET001",
  "IDHOADON": "INV001",
  "IDSP": "P001",
  "Tên sản phẩm": "Cà phê đen",
  "Số lượng": 2,
  "Giá": 50000,
  "Thành tiền": 100000,
  "Ghi chú": "Ít đường, nhiều đá"
}
```

#### NGUYENLIEU.json (Materials)
```json
{
  "IDNGUYENLIEU": "MAT001",
  "Tên nguyên liệu": "Cà phê rang xay",
  "Đơn vị tính": "kg",
  "Giá nhập": 200000,
  "Nhà cung cấp": "NCC001"
}
```

#### DSBAN.json (Tables)
```json
{
  "IDBAN": "B01",
  "Tên bàn": "Bàn 1",
  "Vị trí": "Cạnh cửa sổ",
  "Sức chứa": 4,
  "Trạng thái": "Trống"
}
```

#### DSNV.json (Employees)
```json
{
  "IDNV": "EMP001",
  "Họ và Tên": "Trần Văn B",
  "Chức vụ": "Nhân viên bán hàng",
  "Số điện thoại": "0987654321",
  "Email": "tranvanb@gmail.com",
  "Phân quyền": "Staff"
}
```

---

## 8. KEY UTILITIES & HELPERS

### 8.1 Authentication Utils
**File**: `src/utils/authUtils.ts`
- `isAuthenticated()` - Kiểm tra đã login
- `getUserData()` - Lấy thông tin user
- `getToken()` - Lấy authentication token
- `logout()` - Đăng xuất

### 8.2 Formatters
**File**: `src/lib/formatters.ts`
- Currency formatting (VND)
- Date formatting (DD/MM/YYYY)
- Number formatting
- Percentage formatting

### 8.3 Navigation
**File**: `src/lib/navigation.ts`
- Define tất cả routes
- Permission-based routes
- Dashboard routes structure

### 8.4 Data Manager
**File**: `src/utils/DataManager.ts`
- Quản lý JSON data
- Load/Save operations
- Data validation

---

## 9. KIẾN TRÚC COMPONENT

### 9.1 UI Components (Shadcn/ui)

Tất cả components được import từ `src/components/ui/`:
- Button, Input, Label, Dialog, Modal
- Card, Badge, Avatar, Separator
- Select, Checkbox, Switch, Tabs
- Table, Popover, Tooltip
- AlertDialog, Sheet, Dropdown
- Calendar, DateRangePicker

### 9.2 Layout Components

**Header** (`src/components/ui/header.tsx`):
- User info & logout
- Settings button
- Mobile menu toggle
- Theme toggle

**Sidebar** (`src/components/ui/sidebar.tsx`):
- Navigation menu
- User permission-based routes
- Collapse toggle
- Today orders badge

**Main Layout** (`src/app/(dashboard)/layout.tsx`):
- Header + Sidebar + Content
- Auth check
- Loading state
- Mobile responsive

### 9.3 Feature-Specific Components

- **POS**: ProductGrid, CartSidebar, CheckoutModal, v.v.
- **Reports**: ReportKPICards, ReportFilters, Charts
- **Tables**: TableCard, TableForm
- **Customers**: CustomerDataTable, CustomerDetailsModal

---

## 10. API STRUCTURE

### 10.1 API Routes

**Kitchen API**:
- `src/pages/api/kitchen/` - Kitchen-related endpoints

**Data API** (implied):
- Loaded from JSON files
- No explicit API routes for CRUD (client-side JSON file management)

### 10.2 Real-time Communication

**Socket.io**:
- Real-time data sync
- Multi-device synchronization
- Order updates
- Inventory updates

---

## 11. STYLING & THEME

### 11.1 Tailwind CSS

**Configuration**: `tailwind.config.js`
- Custom colors
- Responsive breakpoints
- Component utilities

### 11.2 CSS Modules & Global Styles

**Global**: `src/app/globals.css`
- Base styles
- Typography
- Layout utilities

**Module**: `src/app/(dashboard)/pos/styles/pos.css`
- POS-specific styles

### 11.3 Theme System

**Provider**: `src/components/theme-provider.tsx`
**Context**: `src/context/ThemeContext.tsx`
- Dark/Light mode toggle
- Persistent theme preference
- Using next-themes

---

## 12. PERFORMANCE & OPTIMIZATION

### 12.1 Data Management

- **Lazy Loading**: React.lazy() cho components
- **Code Splitting**: Dynamic imports
- **Memoization**: useMemo(), useCallback()

### 12.2 Image Optimization

- Next.js Image component
- Responsive images
- Image optimization

### 12.3 Bundle Size

- Treeshaking enabled
- Dynamic imports
- Minimal dependencies

---

## 13. TESTING & DOCUMENTATION

### 13.1 Test Files

- `test-auto-features.md` - Auto features testing
- `test-google-drive.md` - Google Drive integration testing

### 13.2 Documentation

**Docs folder** (`docs/`):
- User guides
- Quick start guides
- Feature guides (discount, today orders, etc.)
- Troubleshooting guides
- Serverless compatibility info

---

## 14. SCRIPTS & COMMANDS

### 14.1 Available Scripts

```bash
npm run dev              # Start development server (with Turbopack)
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint
npm run check-env        # Check environment variables
```

### 14.2 Environment Variables

**Required**:
- `NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID` - Google Drive API
- `NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY` - Google Drive API key

**Optional**:
- `NEXT_PUBLIC_IMGBB_API_KEY` - Image upload API
- `NEXT_PUBLIC_CLOUD_NAME` - Cloudinary cloud name
- `NEXT_PUBLIC_UPLOAD_PRESET` - Cloudinary upload preset

---

## 15. DEPLOYMENT & PRODUCTION

### 15.1 Build Process

1. NextJS compilation
2. TypeScript type checking
3. ESLint validation
4. Asset optimization

### 15.2 Deployment Platforms

Tương thích với:
- **Vercel** (recommended)
- **AWS Lambda**
- **Netlify**
- **Self-hosted servers**

### 15.3 Serverless Considerations

- `/tmp` directory for file operations
- Environment detection
- Graceful error handling
- No persistent local storage

---

## 16. KEY DEPENDENCIES EXPLANATION

| Package | Purpose | Version |
|---------|---------|---------|
| next | React framework | 15.3.3 |
| react | UI library | 19.0.0 |
| typescript | Type safety | 5 |
| tailwindcss | CSS framework | 3.4.17 |
| @tanstack/react-table | Data tables | 8.21.3 |
| @tanstack/react-query | Data fetching | 5.81.2 |
| chart.js | Charts | 4.5.0 |
| recharts | Advanced charts | 2.15.3 |
| date-fns | Date utilities | 4.1.0 |
| socket.io | Real-time | 4.8.1 |
| xlsx | Excel files | 0.18.5 |
| next-themes | Theme toggle | 0.4.6 |
| react-hot-toast | Notifications | 2.5.2 |
| @payos/payos-checkout | Payment gateway | 1.0.8 |
| googleapis | Google APIs | 152.0.0 |
| @supabase/supabase-js | Database (optional) | 2.105.4 |

---

## 17. FILE NAMING CONVENTIONS

### 17.1 TypeScript/React Files
- Components: `PascalCase.tsx` (e.g., `ProductGrid.tsx`)
- Hooks: `camelCase.ts` (e.g., `usePOS.ts`)
- Utils: `camelCase.ts` (e.g., `formatters.ts`)
- Types: `camelCase.ts` (e.g., `product.ts`)
- Pages: `page.tsx` (Next.js convention)

### 17.2 Styling
- CSS Modules: `camelCase.css`
- Tailwind: Inline utilities

---

## 18. TƯƠNG LAI VÀ MỚI NHẤT (Latest Features)

### 18.1 Recent Updates
- Today Orders Counter Feature
- Customer Discount System
- Serverless Compatibility
- Auto-save functionality
- Inventory Data Integration
- Stocktake improvements

### 18.2 Potential Enhancements
- Real-time notifications system
- Advanced analytics & ML predictions
- Mobile app (React Native)
- Multi-branch support
- API gateway for external integrations
- Machine learning for demand forecasting

---

## 19. TROUBLESHOOTING GUIDE

### 19.1 Common Issues

**Serverless Error**:
- Error: `ENOENT: no such file or directory, mkdir '/var/task/data'`
- Solution: Use `/tmp` directory instead

**Discount Not Applied**:
- Check customer type is correct
- Verify points accumulated
- Refresh customer data

**Today Orders Counter Not Updating**:
- Check API connectivity
- Refresh page
- Check console for errors

**Theme Not Persisting**:
- Check localStorage
- Clear cache
- Check next-themes configuration

---

## 20. QUICK START GUIDE

### 20.1 Setup
```bash
# Clone & install
npm install

# Setup environment
cp .env.example .env.local

# Development
npm run dev

# Access
http://localhost:3000
```

### 20.2 Default Test Credentials
(Check data files for default users)

### 20.3 First Steps
1. Login with default credentials
2. Explore Dashboard
3. Try POS Bán hàng
4. Check Báo cáo
5. Manage Khách hàng & Products

---

## 21. CONTACT & SUPPORT

### 21.1 Social Media
- YouTube: @TienMaillo
- Facebook: (See login.tsx for links)

### 21.2 Documentation
- User Guide: `docs/user-guide.md`
- Quick Start: `docs/quick-start.md`
- README: `README.md`

---

# 📌 SUMMARY - TÓM TẮT

**GOALPOS** là một hệ thống quản lý bán hàng POS toàn diện:

- ✅ **Frontend Modern**: Next.js 15 + React 19 + TypeScript
- ✅ **Responsive UI**: Tailwind CSS + Shadcn/ui
- ✅ **Rich Features**: POS, Inventory, Reports, KDS, CRM
- ✅ **Data-Driven**: Real-time charts, advanced analytics
- ✅ **Scalable**: Serverless compatible, microservices ready
- ✅ **Enterprise**: Multi-user, permissions, audit trails
- ✅ **User-Friendly**: Intuitive UI, mobile responsive, PWA ready

**Dự án này là một nền tảng hoàn chỉnh cho các cửa hàng F&B hiện đại!**

---

*Document được cập nhật: 10/05/2026*
*Phiên bản: 1.0*
*Ngôn ngữ: Vietnamese*
