# Báo cáo Nghiệm thu Phase 2: Đồng bộ Đa Thiết bị và Đơn QR

- **Thời điểm hoàn thành**: 2026-10-18
- **Nhánh thực hiện**: `exp/thesis-perfect`
- **Môi trường**: Supabase STAGING (`uhnrkyzicqhozwlimvew`) — An toàn tuyệt đối, không chạm production
- **Tag nghiệm thu**: `exp/phase-2-done`
- **Tình trạng nghiệm thu**: **ĐẠT (PASS 100%)**

---

## 1. Tóm tắt Mục tiêu & Kết quả Đạt được

| Hạng mục mục tiêu | Hiện trạng trước Phase 2 | Kết quả đạt được tại Phase 2 | Đánh giá |
|---|---|---|---|
| **Xung đột giỏ hàng đa thiết bị** | Ghi đè âm thầm (last write wins), mất món khi 2 nhân viên cùng thao tác | Định danh món theo `id + note` (`lineItemKey`). Auto-merge khi khác món. Bật `CartConflictModal` với 3 lựa chọn (giữ máy này / lấy từ xa / cộng dồn) khi trùng món khác số lượng | **ĐẠT 100%** |
| **Vòng đời đơn QR** | Chỉ có `pending` / `completed`, thiếu trạng thái quá hạn và hủy | Mở rộng đầy đủ 7 trạng thái: `awaiting_confirmation`, `accepted`, `rejected`, `completed`, `cancelled`, `expired`, `cancelled_by_customer` | **ĐẠT 100%** |
| **Khách tự hủy đơn QR** | Khách không thể hủy đơn, phải gọi nhân viên | Khách tự hủy qua `POST /api/orders/cancel` bằng `tracking_token` bí mật (chỉ cho phép khi đang chờ duyệt), broadcast realtime tức thì | **ĐẠT 100%** |
| **Tự động hết hạn đơn QR** | Đơn cũ tồn đọng vô hạn | Tự động đánh dấu `expired` sau 15 phút chưa duyệt (qua RPC DB và background sweep) | **ĐẠT 100%** |
| **Bảo mật chống spam QR** | Bất kỳ ai có link đều gửi đơn không giới hạn | Xác thực HMAC token theo phiên/bàn (`FEATURE_QR_TOKEN`), In-memory Rate Limit theo `IP + bàn` (5 req/phút), tối đa 20 món/đơn | **ĐẠT 100%** |
| **Tối ưu Polling & Chặn thanh toán** | Polling chạy liên tục ngốn tài nguyên, vẫn cho thanh toán khi giỏ lỗi | Dừng polling khi `document.hidden`, exponential backoff. Chặn nút "Thanh toán" khi trạng thái là `conflict` hoặc `offline` | **ĐẠT 100%** |
| **Chất lượng Kiểm thử** | 7 test files (41 tests) | **9 test files (56 tests) PASS 100%**, thêm unit test cho conflict resolution & QR lifecycle | **ĐẠT 100%** |
| **Biên dịch Production** | 48 routes | **49 routes compile thành công 100%** (`npm run build`), không lỗi cú pháp hoặc kiểu | **ĐẠT 100%** |

---

## 2. Chi tiết Triển khai Kỹ thuật

### 2.1. Cơ sở dữ liệu & Rollback
- **Migration**: [supabase/migrations/202610180005_qr_order_lifecycle.sql](file:///d:/Documents/H2MilkTea/supabase/migrations/202610180005_qr_order_lifecycle.sql)
  - Mở rộng check constraint `order_status` trên bảng `pos_orders` cho 7 trạng thái.
  - Bổ sung cột `expires_at TIMESTAMPTZ` và index `pos_orders_expiry_idx`.
  - Hàm RPC `expire_stale_qr_orders()` quét và chuyển trạng thái các đơn quá hạn.
- **Rollback**: [supabase/rollbacks/202610180005_qr_order_lifecycle.down.sql](file:///d:/Documents/H2MilkTea/supabase/rollbacks/202610180005_qr_order_lifecycle.down.sql)

### 2.2. Thuật toán Hợp nhất Giỏ hàng & Xử lý Xung đột
- [src/lib/cart/mergeCart.ts](file:///d:/Documents/H2MilkTea/src/lib/cart/mergeCart.ts):
  - `getLineItemKey(item)`: Chuẩn hóa `${item.id}::${note.trim().toLowerCase()}`.
  - `diffCartItems(localCart, remoteCart)`: Phân loại chính xác các món tự động merge được và các món xung đột số lượng.
  - `resolveCartConflict(localCart, remoteCart, resolution)`: Hỗ trợ 3 chiến lược:
    - `'keep_local'`: Giữ giỏ hiện tại của máy thu ngân này.
    - `'take_remote'`: Lấy giỏ của thiết bị kia.
    - `'merge_quantities'`: Giữ cả hai và cộng dồn số lượng.
- [src/app/(dashboard)/pos/components/CartConflictModal.tsx](file:///d:/Documents/H2MilkTea/src/app/(dashboard)/pos/components/CartConflictModal.tsx):
  - Giao diện trực quan hiển thị từng dòng món bị xung đột kèm bảng so sánh `Máy này: x` vs `Máy khác: y` và 3 nút lựa chọn giải quyết.
- [src/app/(dashboard)/pos/hooks/useSharedCartDraft.ts](file:///d:/Documents/H2MilkTea/src/app/(dashboard)/pos/hooks/useSharedCartDraft.ts) & [usePOS.ts](file:///d:/Documents/H2MilkTea/src/app/(dashboard)/pos/hooks/usePOS.ts):
  - Tích hợp kiểm tra xung đột thời gian thực, tạm ngừng ghi đè khi phát hiện xung đột.
  - Tính toán `canCheckout`: chỉ cho phép thanh toán khi giỏ hàng đã đồng bộ an toàn (`synced` hoặc `syncing`), vô hiệu hóa nút thanh toán khi `conflict` hoặc `offline`.
  - Cơ chế tự dừng polling khi chuyển tab (`document.visibilityState === 'hidden'`) giúp tiết kiệm băng thông và tài nguyên CPU.

### 2.3. Vòng đời Đơn QR & Chống Spam
- [src/lib/qr/token.ts](file:///d:/Documents/H2MilkTea/src/lib/qr/token.ts):
  - `generateTableQrToken(tableId)` & `verifyTableQrToken(token, tableId)`: Sử dụng HMAC sha256 ký số phiên bàn và thời hạn hết hạn 24 giờ.
  - `checkOrderRateLimit(identifier)`: Giới hạn tối đa 5 yêu cầu / phút trên mỗi cặp `IP:bàn`, tự dọn dẹp bộ nhớ đệm định kỳ.
- [src/app/api/orders/cancel/route.ts](file:///d:/Documents/H2MilkTea/src/app/api/orders/cancel/route.ts):
  - Xác thực bằng `tracking_token` bí mật của đơn.
  - Chỉ cho phép hủy khi đơn ở trạng thái `awaiting_confirmation`.
  - Cập nhật nguyên tử với `status_version` chống race condition với thao tác bấm duyệt của thu ngân.
  - Phát sự kiện broadcast qua Supabase Realtime channel `qr-order:${token}` để cập nhật giao diện khách hàng và POS tức thì.
- [src/app/api/orders/route.ts](file:///d:/Documents/H2MilkTea/src/app/api/orders/route.ts):
  - Kiểm tra rate limit và HMAC token (dưới cờ `FEATURE_QR_TOKEN`).
  - Giới hạn tối đa 20 món/đơn QR để chống spam tràn bộ nhớ.
  - Thiết lập `expires_at = now() + 15 phút` và trạng thái ban đầu `awaiting_confirmation`.
- [src/app/api/pos/orders/route.ts](file:///d:/Documents/H2MilkTea/src/app/api/pos/orders/route.ts):
  - Tự động gọi RPC `expire_stale_qr_orders` để dọn các đơn quá hạn mỗi khi quầy POS lấy danh sách đơn.

---

## 3. Bằng chứng Kiểm thử (Verification Evidence)

### 3.1. Kết quả Unit Tests (Vitest)
```bash
> npm test

======================================================
 [check-env] KIỂM TRA AN TOÀN MÔI TRƯỜNG SUPABASE
======================================================
ℹ️ Project Ref hiện tại: [uhnrkyzicqhozwlimvew]
ℹ️ Danh sách Ref cấm: [yeblrlzyellcawfleeox]
✅ XÁC NHẬN AN TOÀN: Môi trường hợp lệ, không trỏ vào database Production bị cấm.
======================================================

 ✓ tests/unit/cart-conflict.test.ts (8 tests)
 ✓ tests/unit/catalog.test.ts (3 tests)
 ✓ tests/unit/ai-features.test.ts (9 tests)
 ✓ tests/unit/transfer-table-api.test.ts (4 tests)
 ✓ tests/unit/cart-draft-api.test.ts (4 tests)
 ✓ tests/unit/qr-lifecycle.test.ts (7 tests)
 ✓ tests/unit/checkout-api.test.ts (4 tests)
 ✓ tests/unit/faq.test.ts (9 tests)
 ✓ tests/unit/ai-settings.test.ts (8 tests)

 Test Files  9 passed (9)
      Tests  56 passed (56)
   Duration  725ms
```

### 3.2. Kết quả Biên dịch Production (Next.js Build)
```bash
> npm run build
> next build

 ✓ Compiled successfully in 6.0s
 ✓ Generating static pages (49/49)
   Finalizing page optimization ...

Route (app)                                  Size  First Load JS
├ ƒ /api/orders/cancel                      185 B         102 kB
├ ƒ /api/orders                             185 B         102 kB
├ ƒ /api/pos/cart-draft                     185 B         102 kB
├ ƒ /api/pos/checkout                       185 B         102 kB
├ ƒ /api/pos/orders                         185 B         102 kB
├ ○ /pos                                  36.4 kB         410 kB
└ ... 43 other routes

○ (Static)   prerendered as static content
ƒ (Dynamic)  server-rendered on demand
Exit code: 0 (Thành công tuyệt đối)
```

---

## 4. Xác nhận Dừng tại Cổng Kiểm soát GATE 2

Căn cứ theo Hiến pháp [H2MILKTEA_AGENT_MASTER_PLAN.md](file:///d:/Documents/H2MilkTea/H2MILKTEA_AGENT_MASTER_PLAN.md) (Quy tắc 11 - Phân ranh giới nghiệm thu):
- [x] Toàn bộ tiêu chí của Phase 2 đã hoàn thành 100%.
- [x] Không có lỗi kiểm thử, không có lỗi build.
- [x] Đã cập nhật đầy đủ nhật ký tiến độ [PROGRESS.md](file:///d:/Documents/H2MilkTea/docs/agent/PROGRESS.md) và nhật ký quyết định kỹ thuật [DECISIONS.md](file:///d:/Documents/H2MilkTea/docs/agent/DECISIONS.md).
- [x] Hệ thống dừng lại tại **GATE 2** và chờ lệnh chỉ đạo tiếp theo từ người dùng (`GO PHASE 3`).
