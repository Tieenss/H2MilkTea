# 🍵 H2 MilkTea - Hệ Thống Quản Lý Bán Hàng & Điểm Bán (POS)

![H2 MilkTea Banner](./public/logo-h2.png)

## 📋 Giới thiệu Đề tài

**H2 MilkTea POS** là hệ thống quản lý bán hàng (Point of Sale) toàn diện được nghiên cứu và phát triển nhằm phục vụ mô hình kinh doanh F&B (Trà sữa, Quán Cafe, Đồ uống). Hệ thống được xây dựng với kiến trúc hiện đại, giao diện trực quan, tối ưu hóa quy trình vận hành từ khâu gọi món, quản lý bàn, thanh toán, đến quản lý tồn kho nguyên liệu và phân tích doanh thu theo thời gian thực.

- **Sinh viên thực hiện**: Tiến (TienMaillo / tieenss)
- **Đề tài**: Xây dựng hệ thống quản lý bán hàng đa nền tảng cho chuỗi đồ uống F&B

---

## ✨ Tính năng chính

### 🛍️ 1. POS Bán hàng & Order
- **Giao diện trực quan**: Thiết kế responsive, thân thiện trên Desktop, Tablet và Mobile.
- **Bán hàng tốc độ cao**: Tối ưu hóa thao tác chọn món, thêm topping, giảm thiểu thời gian chờ của khách.
- **Đa phương thức thanh toán**: Tiền mặt, Chuyển khoản ngân hàng, VietQR tự động, thanh toán trực tuyến qua cổng PayOS.
- **Quản lý phòng bàn linh hoạt**: Theo dõi trạng thái bàn trống/có khách, chuyển bàn, gộp bàn nhanh chóng.
- **In phiếu tự động**: Xuất hóa đơn thanh toán cho khách và phiếu báo chế biến cho khu vực bếp/pha chế.

### 👥 2. Quản lý Khách hàng & Thành viên
- **Phân hạng khách hàng**: Tự động xếp hạng (Thường, VIP, Kim cương).
- **Chính sách ưu đãi**: Áp dụng chiết khấu tự động theo hạng thành viên.
- **Tích điểm & Lịch sử giao dịch**: Lưu trữ lịch sử tiêu dùng, quản lý điểm thưởng.

### 🍽️ 3. Quản lý Menu & Định mức Nguyên liệu
- **Danh mục & Sản phẩm**: Quản lý đa dạng nhóm đồ uống, công thức và biến thể kích cỡ (Size M, L,...).
- **Quản lý kho nguyên liệu**: Theo dõi nhập - xuất - tồn, cảnh báo nguyên liệu sắp hết.
- **Cấu hình định mức (BOM)**: Tự động trừ nguyên liệu tồn kho theo từng ly đồ uống bán ra.

### 📊 4. Báo cáo & Phân tích Doanh thu
- **Dashboard trực quan**: Biểu đồ thống kê doanh thu, số lượng đơn hàng theo ngày, tuần, tháng.
- **Top món bán chạy**: Thống kê sản phẩm được ưa chuộng nhất để tối ưu menu.
- **Hiệu suất ca làm**: Thống kê doanh thu theo nhân viên và ca làm việc.

### ⚙️ 5. Quản trị & Cấu hình Hệ thống
- **Phân quyền người dùng**: Phân chia vai trò rõ ràng giữa Quản trị viên (Admin), Quản lý (Manager) và Nhân viên thu ngân/pha chế.
- **Cài đặt mẫu in**: Tùy chỉnh khổ in (K80, K57, A4), thông tin cửa hàng trên hóa đơn.
- **Đồng bộ dữ liệu Realtime**: Sử dụng Supabase Realtime đảm bảo dữ liệu đồng bộ tức thì giữa các thiết bị.

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

### Frontend
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Turbopack)
- **Ngôn ngữ**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: Radix UI, Lucide Icons, Shadcn/ui patterns
- **State & Data Fetching**: TanStack React Query v5

### Backend & Cơ sở dữ liệu
- **Database / BaaS**: [Supabase](https://supabase.com/) (PostgreSQL, Realtime, Storage)
- **Tích hợp thanh toán**: [PayOS](https://payos.vn/) SDK (VietQR động)
- **Realtime Services**: Socket.io / Supabase Realtime Channels

---

## 🚀 Hướng dẫn Cài đặt & Chạy Thử nghiệm

### 1. Yêu cầu hệ thống
- **Node.js**: >= 18.18.0
- **npm** hoặc **yarn** / **pnpm**

### 2. Cài đặt Dependencies
```bash
# Clone hoặc tải source code về máy
cd Next-coffe-demo-main

# Cài đặt các gói phụ thuộc
npm install
```

### 3. Cấu hình Biến môi trường (.env)
Tạo file `.env.local` tại thư mục gốc với các cấu hình tương tự như sau:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# PayOS Configuration (Optional)
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key
```

### 4. Khởi chạy Ứng dụng
```bash
# Chạy môi trường phát triển (Development)
npm run dev

# Mở trình duyệt và truy cập:
# http://localhost:3000
```

---

## 📄 Bản quyền & Tác giả

Đồ án được phát triển và hoàn thiện bởi **Tiến (TienMaillo)**.
© 2026 **H2 MilkTea Management System**.
