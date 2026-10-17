# Báo cáo Audit Trung thực & Bảng Đăng ký Rủi ro (01-honest-audit.md)

- **Ngày thực hiện**: 2026-10-18
- **Nhánh**: `exp/thesis-perfect`
- **Mục tiêu**: Đánh giá thực trạng toàn diện hệ thống, phân tích lỗ hổng, xác định các điểm trình duyệt ghi thẳng vào DB và thiết lập Risk Register chuẩn bị cho các Phase tiếp theo.

---

## 1. Bảng Audit Tính Năng (Feature Matrix)

| STT | Tính năng | File / Dòng chính | Trạng thái | Kiểm thử tự động | Bằng chứng / Đánh giá |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | **POS Bán hàng & Chọn món** | `src/app/(dashboard)/pos/page.tsx` | Chạy được | Có 1 phần | `tests/unit/catalog.test.ts` kiểm thử chuẩn hóa tên món. Thiếu E2E test cho toàn bộ luồng. |
| 2 | **Đồng bộ giỏ hàng (Cart Drafts)** | `src/app/api/pos/cart-draft/route.ts`<br>`src/hooks/useCartSync.ts` | Chạy được | Có test API | `tests/unit/cart-draft-api.test.ts` (4 tests pass: auth, tableId limit, read/write, 409 conflict). Chưa có test fake timer cho client debounce. |
| 3 | **Chuyển bàn / Đổi bàn** | `src/app/(dashboard)/pos/page.tsx` | Chưa chắc | Chưa có test | Chưa có hàm RPC transaction nguyên tử (atomic). Autosave trễ có thể ghi lại giỏ hàng cũ. |
| 4 | **Thanh toán & Ghi hóa đơn** | `src/app/(dashboard)/pos/page.tsx`<br>`src/utils/authUtils.ts:595-616` | Nguy cơ cao | Chưa có test | Trình duyệt ghi trực tiếp vào `HOADON` và `HOADONDETAIL`. Nếu RLS chặn hoặc mạng ngắt giữa chừng sẽ sinh lỗi 500 hoặc mất toàn vẹn. |
| 5 | **Đơn hàng QR tại bàn** | `src/app/order/page.tsx`<br>`src/app/api/orders/route.ts` | Chạy được | Chưa có test | Server tự tính lại giá dựa trên `DMHH`, kiểm tra trạng thái bàn `DSBAN`, có chống gửi trùng qua `idempotency_key`. |
| 6 | **Màn hình Bếp (KDS)** | `src/app/(dashboard)/kitchen/page.tsx`<br>`src/pages/api/kitchen/orders.ts` | Chạy được | Chưa có test | Có kiểm tra phiên đăng nhập nhân viên (`getAuthenticatedStaff`), cập nhật trạng thái có `status_version`. |
| 7 | **Trợ lý AI POS (Gemini)** | `src/app/(dashboard)/pos/components/POSAssistant.tsx`<br>`src/app/api/ai/chat/route.ts` | Chạy được | Có test | `tests/unit/ai-features.test.ts` (9 tests pass). Có preview trước khi thêm/bớt món, fallback model, context-aware. |
| 8 | **Quản trị AI & Cửa hàng FAQ** | `src/app/(dashboard)/settings/ai/page.tsx`<br>`src/app/api/ai/settings/route.ts`<br>`src/app/api/ai/faq/route.ts` | Chạy được | Có test | `tests/unit/ai-settings.test.ts` (8 tests), `tests/unit/faq.test.ts` (9 tests). Bắt buộc quyền admin khi cập nhật. |
| 9 | **Quản lý Kho & Nhà cung cấp** | `src/app/(dashboard)/inventory/` | Chưa ổn định | Chưa có test | Tồn tại lỗi type TypeScript trong `useSuppliers.ts` và component merge declaration. |
| 10 | **Tạo tài khoản người dùng** | `src/app/api/auth/create-user/route.ts` | Lỗ hổng bảo mật | Chưa có test | Dùng Service Role Key nhưng **hoàn toàn không kiểm tra xác thực hoặc quyền admin**. |

---

## 2. Audit Row Level Security (RLS) từng bảng

| Tên bảng | Trạng thái RLS | Policy hiện tại | Rủi ro / Nhận xét |
| :--- | :---: | :--- | :--- |
| `pos_orders` | **BẬT** | - SELECT: `authenticated`<br>- UPDATE: `authenticated` | An toàn cho nhân viên. Khách QR truy cập qua API server có xác thực token riêng. |
| `pos_cart_drafts` | **BẬT** | - SELECT: `authenticated`<br>- INSERT: `authenticated`<br>- UPDATE: `authenticated` | Yêu cầu nhân viên đăng nhập. Cần kiểm soát hẹp hơn tránh ghi đè giỏ bàn khác ngoài ca. |
| `app_settings` | **BẬT** | - SELECT: `authenticated` | Chỉ nhân viên đăng nhập mới đọc được cấu hình hệ thống. Cập nhật được bảo vệ qua API route admin. |
| `HOADON` | **TÙY THUỘC DB** | Chưa có migration RLS rõ ràng trong repo | **CỰC KỲ NGUY HIỂM**: Mã nguồn client (`authUtils.ts`) cố gắng insert thẳng từ trình duyệt. Nếu RLS bật trên Supabase mà không cấp quyền anon -> sinh lỗi thanh toán. |
| `HOADONDETAIL` | **TÙY THUỘC DB** | Chưa có migration RLS rõ ràng trong repo | Tương tự bảng `HOADON`. |
| `DMHH` | **TÙY THUỘC DB** | Chưa có migration RLS rõ ràng trong repo | Bảng danh mục món. Nên cho phép đọc công khai (để khách QR xem menu) nhưng chỉ server/admin mới được ghi. |
| `DSBAN` | **TÙY THUỘC DB** | Chưa có migration RLS rõ ràng trong repo | Danh mục bàn quán. |
| `DSNV` | **TÙY THUỘC DB** | Chưa có migration RLS rõ ràng trong repo | Bảng thông tin nhân viên, nhạy cảm về thông tin cá nhân/vai trò. Cần khóa RLS chặt chẽ. |

---

## 3. Ma trận API Route & Cơ chế Xác thực / Phân quyền

| Endpoint | HTTP Method | Cơ chế xác thực | Yêu cầu quyền hạn | Đánh giá an toàn |
| :--- | :---: | :--- | :--- | :---: |
| `/api/ai/chat` | POST | Cookie session (`getAuthenticatedStaff`) | Nhân viên (Admin có thêm quyền context) | ✅ An toàn |
| `/api/ai/faq` | GET | Không bắt buộc | Công khai | ✅ Hợp lệ |
| `/api/ai/faq` | POST | Cookie session (`getAuthenticatedStaff`) | **Chỉ Admin** (`staff.role === 'admin'`) | ✅ An toàn |
| `/api/ai/settings` | GET | Không bắt buộc | Nhân viên / Khách | ✅ Hợp lệ |
| `/api/ai/settings` | POST | Cookie session (`getAuthenticatedStaff`) | **Chỉ Admin** (`staff.role === 'admin'`) | ✅ An toàn |
| `/api/auth/create-user` | POST | **KHÔNG CÓ** | **Bất kỳ ai cũng gọi được** | 🚨 **LỖ HỔNG NGHIÊM TRỌNG** |
| `/api/orders` | POST | - `POS_COUNTER`: Cookie session<br>- `QR_TABLE`: Mở cho khách | Nhân viên với đơn POS, Khách với đơn QR | ✅ An toàn (server tự tính giá) |
| `/api/orders` | GET | Tracking token (≥ 32 ký tự) | Khách cầm token đơn | ✅ An toàn |
| `/api/orders` | PATCH | Cookie session (`getAuthenticatedStaff`) | Nhân viên thu ngân/quản lý | ✅ An toàn (chống xung đột version) |
| `/api/pos/cart-draft` | GET / PUT / DELETE | Cookie session (`getAuthenticatedStaff`) | Nhân viên thu ngân | ✅ An toàn |
| `/api/pos/orders` | GET | Cookie session (`getAuthenticatedStaff`) | Nhân viên thu ngân | ✅ An toàn |
| `/api/pos/orders/decision` | POST | Cookie session (`getAuthenticatedStaff`) | Nhân viên thu ngân | ✅ An toàn |
| `/api/kitchen/orders` | GET | Cookie session (`getAuthenticatedStaff`) | Nhân viên bếp/quản lý | ✅ An toàn |
| `/api/kitchen/update-order` | POST | Cookie session (`getAuthenticatedStaff`) | Nhân viên bếp | ✅ An toàn |
| `/api/customer-order` | POST | HTTP 410 Gone (đã đóng) | N/A | ✅ An toàn |
| `/api/kitchen/new-order` | ALL | HTTP 410 Gone (đã đóng) | N/A | ✅ An toàn |

---

## 4. Điểm trình duyệt ghi thẳng vào Database (Client Direct Writes)

Trong file [src/utils/authUtils.ts](file:///d:/Documents/H2MilkTea/src/utils/authUtils.ts) (dòng 575–632):
```typescript
const supabase = createClient(); // Khởi tạo bằng anon key trên trình duyệt
// ...
await supabase.from(tableName).insert(result.data); // Dòng 600
await supabase.from(tableName).update(result.data).eq(pk, result.data[pk]); // Dòng 612
await supabase.from(tableName).delete().eq(pk, data[pk]); // Dòng 624
```
**Hệ quả & Rủi ro**:
- Trình duyệt ghi hóa đơn thanh toán trực tiếp xuống `HOADON` và `HOADONDETAIL`.
- Không nằm trong một database transaction. Nếu ghi `HOADON` thành công nhưng mất mạng trước khi ghi `HOADONDETAIL`, hệ thống bị phân mảnh dữ liệu nghiêm trọng.
- Đây là nguyên nhân gốc rễ của các lỗi thanh toán / 500 được xác định trong mục tiêu Phase 1.

---

## 5. Bảng Đăng ký Rủi ro (Risk Register)

| ID | Mã rủi ro | Mức độ | Khả năng xảy ra | Mô tả chi tiết | Phương án giảm thiểu / Kế hoạch xử lý |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **R-01** | `SEC-AUTH-CREATE-USER` | **CRITICAL** | Cao | Endpoint `/api/auth/create-user` dùng Service Role Key nhưng không có kiểm tra quyền admin. Bất kỳ ai cũng có thể tạo tài khoản admin/nhân viên trái phép. | Thêm middleware/guard kiểm tra phiên đăng nhập và quyền `admin` ngay lập tức trước khi cho phép gọi Supabase Admin API. |
| **R-02** | `DATA-CLIENT-DIRECT-PAY` | **HIGH** | Rất cao | Trình duyệt ghi trực tiếp vào `HOADON` và `HOADONDETAIL` không có transaction, dễ bị RLS chặn hoặc đứt gãy mạng gây mất chi tiết hóa đơn. | Chuyển toàn bộ luồng thanh toán sang API server hoặc Postgres RPC `pay_order` atomic ở **Phase 1**. |
| **R-03** | `DATA-GHOST-CART-TRANSFER` | **HIGH** | Trung bình | Khi chuyển bàn, autosave debounce trễ từ trình duyệt cũ có thể gửi bản ghi nháp đè lại bàn vừa dọn (tạo giỏ ma). | Hủy debounce trước khi chuyển bàn; đổi cơ chế autosave sang `UPDATE ... WHERE version = :v` (không dùng upsert) ở **Phase 1**. |
| **R-04** | `TYPE-LINT-BUILD-BYPASS` | **MEDIUM** | Cao | `next.config.ts` đang bật `ignoreDuringBuilds` và `ignoreBuildErrors`, che giấu 54 lỗi lint và 22 lỗi kiểu dữ liệu. | Khoanh vùng và dọn dẹp lỗi type ở các module liên quan; gỡ bỏ dần các cờ bỏ qua lỗi trước khi hoàn tất đồ án. |
| **R-05** | `AI-RATE-LIMIT-QUOTA` | **MEDIUM** | Trung bình | Gemini API phụ thuộc vào quota bên ngoài; nếu hết quota hoặc mạng chập chờn có thể ảnh hưởng trải nghiệm POS. | Giữ nguyên kiến trúc hiện tại: AI hoàn toàn nằm ngoài luồng cốt lõi; có popup thông báo thân thiện và tự động fallback sang chế độ bán tay. |
| **R-06** | `QR-SPAM-DOS` | **MEDIUM** | Thấp | Khách hàng có thể spam gửi đơn QR liên tục làm tràn hàng chờ nhà bếp. | Triển khai token ký HMAC theo bàn/phiên và rate limiting ở **Phase 2** sau cờ `FEATURE_QR_TOKEN`. |
