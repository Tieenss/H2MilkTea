# H2 MilkTea - DESIGN SYSTEM SPECIFICATION

## 1. Triết lý Thiết kế: "Thực tế - Tinh tế - Chống AI Slop"
Hệ thống giao diện H2 MilkTea loại bỏ phong cách thiết kế AI Slop (màu mè, gradient chuyển sắc vô tội vạ, thẻ lồng trong thẻ, low-contrast text) để hướng tới một trải nghiệm F&B chuyên nghiệp, tốc độ cao, thân thiện và đáng tin cậy.

---

## 2. Bảng Màu Thương Hiệu & Design Tokens (Color Palette)

### 2.1. Màu sắc Chủ đạo (Brand Color Tokens)
Hệ thống thống nhất sử dụng tone màu **Trà Sữa & Đất Nung Ấm Áp (Warm Amber / Terracotta)** kết hợp với bảng màu chức năng chuẩn mực:

| Token | Giá trị CSS | Tailwind Match | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `--h2-primary` | `#EA580C` | `orange-600` | Màu thương hiệu chính, nút CTA đặt món, điểm nhấn nhận diện |
| `--h2-primary-hover`| `#C2410C` | `orange-700` | Trạng thái hover / active của primary action |
| `--h2-primary-subtle`| `#FFF7ED` | `orange-50` | Nền pill, nền tag được chọn, highlight mềm |
| `--h2-surface-bg` | `#F8FAFC` | `slate-50` / `gray-50` | Nền tổng thể của ứng dụng (POS & Menu) |
| `--h2-surface-card` | `#FFFFFF` | `white` | Nền của Card sản phẩm, Ticket bếp, Hóa đơn |
| `--h2-text-primary` | `#0F172A` | `slate-900` | Tiêu đề, tên món, giá tiền, số bàn |
| `--h2-text-secondary`| `#475569` | `slate-600` | Mô tả phụ, đơn vị tính, thời gian đặt hàng |
| `--h2-text-muted` | `#64748B` | `slate-500` | Placeholder, nhãn phân loại (Tối thiểu tỷ lệ tương phản 4.5:1) |
| `--h2-border-light` | `#E2E8F0` | `slate-200` | Đường viền chia tách component, không dùng viền quá đậm |

### 2.2. Màu Trạng thái Vận hành (Semantic Status Colors)
- **Đang chờ xác nhận / Cần gấp**: Hổ phách ấm (`amber-500` / `bg-amber-50`)
- **Đang pha chế**: Xanh lam pha chế (`sky-600` / `bg-sky-50`)
- **Hoàn thành / Sẵn sàng**: Xanh ngọc lục bảo (`emerald-600` / `bg-emerald-50`)
- **Lỗi / Hủy / Bàn bảo trì**: Đỏ gạch cảnh báo (`rose-600` / `bg-rose-50`)

> [!CAUTION]
> **Quy tắc cấm AI Slop**: Tuyệt đối không dùng gradient cầu vồng ngẫu hứng (`from-indigo-600 via-purple-600 to-pink-600`, `from-gray-900 via-indigo-950 to-purple-950`). Giữ nền nút CTA dạng Solid có chiều sâu bóng đổ tinh tế (`shadow-sm` / `shadow-orange-500/20`), không làm lóe mắt người dùng.

---

## 3. Hệ thống Typography & Độ tương phản (Typography & Contrast)

### 3.1. Phân cấp Cỡ chữ & Tỷ lệ đọc
- **Tên màn hình / Trang chào mừng**: `text-2xl` - `text-3xl` (`font-bold`, `tracking-tight`)
- **Tên món ăn / Thẻ bàn POS**: `text-base` - `text-lg` (`font-bold`, `text-slate-900`)
- **Giá tiền**: `text-base` - `text-lg` (`font-extrabold`, `text-orange-600` solid, **không dùng gradient trên chữ**)
- **Nhãn phân loại & Ghi chú**: `text-xs` - `text-sm` (`font-medium`)

### 3.2. Tiêu chuẩn KDS (Kitchen Display System Typography) - Đọc cự ly 1.5 mét
- **Số bàn / Tên bàn**: Tối thiểu `text-xl` đến `text-2xl` (`font-black`)
- **Tên món cần pha chế**: Tối thiểu `text-base` đến `text-lg` (`font-bold`)
- **Ghi chú định lượng (Ít đá / Giảm đường / Dị ứng)**: Tối thiểu `text-sm` đến `text-base` (`font-extrabold`, nền vàng `bg-amber-100`, chữ `text-amber-900`, **không dùng chữ nghiêng xám mờ**)
- **Số lượng (x1, x2)**: Badge to nổi bật `text-lg` đến `text-xl`

---

## 4. Chuẩn Vùng chạm Ngón cái (Thumb-Zone & Touch Targets)

### 4.1. Mobile Ordering (375px - 430px)
- **Vùng chạm tối thiểu**: Tất cả các nút bấm chọn Size (S/M/L), Mức đường (0%/30%/50%/70%/100%), Mức đá, Nút cộng/trừ số lượng phải đạt tối thiểu **44px × 44px** (theo chuẩn Apple Human Interface Guidelines và Google Material Design).
- **Tránh mép dưới màn hình (Safe Area Inset)**:
  - Bắt buộc áp dụng `padding-bottom: max(16px, env(safe-area-inset-bottom))` cho thanh giỏ hàng nổi (`CartFloatingBar`) và đáy của modal chọn món. Tránh xung đột với thanh Home Bar của iPhone.

### 4.2. POS Screen (1024px iPad & 1366x768 / 1920x1080 Desktop)
- Các nút thao tác nhanh trên giỏ hàng (Nút Ghi chú, Xóa món, Tăng/giảm) phải đạt kích thước tối thiểu **36px × 36px** (thay vì `w-6 h-6` = 24px hiện tại).
- Khoảng cách an toàn giữa nút phá hủy ("Xóa tất cả") và nút điều hướng/tác vụ chính tối thiểu 16px.

---

## 5. Quy tắc Chống AI Slop (Impeccable Anti-AI Slop Rules)

| Hành vi AI Slop (Cấm) | Giải pháp Impeccable (Khuyên dùng) |
| :--- | :--- |
| **Nested Cards**: Thẻ Card bọc trong Card, bọc tiếp trong Card với viền xám lặp lại 3-4 tầng. | Sử dụng phân cách phẳng (Flat separation): Dùng khoảng trắng (`gap-4`), đường kẻ đơn mảnh (`border-b border-slate-100`), hoặc nền phân vùng nhẹ (`bg-slate-50`). |
| **Gradient lộn xộn**: Mỗi trang một kiểu dải màu chuyển tiếp (Menu đỏ-cam, banner tím CSGO, Drawer xanh teal, AI FAB hồng cánh sen). | Thống nhất 1 tone chủ đạo duy nhất (`orange-600` / `amber-500`) kết hợp nền trung tính (`slate-50` / `white`). |
| **Chữ xám mờ (Low-Contrast)**: Dùng `text-gray-400` hoặc `text-slate-400` trên nền xám nhạt `bg-gray-100` khiến người lớn tuổi hoặc màn hình chói nắng không đọc được. | Toàn bộ chữ phụ phải dùng tối thiểu `text-slate-600` hoặc `text-gray-600` (đạt tỷ lệ WCAG AA tối thiểu 4.5:1). |
| **Lạm dụng Icon cảm xúc vô nghĩa**: Gắn hàng loạt emoji 🧋, 🥤, 🍹, 🎰, 🍰, ✨, 🚀 trên từng tiêu đề và nút bấm. | Chỉ sử dụng icon SVG đơn sắc (Lucide icons) tại vị trí thực sự mang ý nghĩa điều hướng (giỏ hàng, tìm kiếm, in ấn, chuông báo). |
| **Layout Shift do thông báo đè**: Box thông báo đơn QR nhảy vào giữa màn hình làm thụt toàn bộ danh sách sản phẩm. | Sử dụng khay trượt cố định (Collapsible fixed bar) hoặc Drawer góc, giữ ổn định vị trí của Lưới sản phẩm POS. |
