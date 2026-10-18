# Báo cáo Nghiệm thu Phase 1: Ổn định POS Lõi (phase-1-report.md)

- **Thời điểm nghiệm thu**: 2026-10-18
- **Nhánh làm việc**: `exp/thesis-perfect`
- **Môi trường thực thi**: STAGING (`uhnrkyzicqhozwlimvew`), Node.js `v24.19.0`, Next.js `15.3.8`, Supabase PostgreSQL
- **Mục tiêu**: Giải quyết triệt để lỗi thanh toán 500/RLS, chống giỏ ma autosave, chuyển bàn nguyên tử chống deadlock, và chặn xóa giỏ im lặng từ phím Esc.

---

## 1. Tóm tắt các Thay đổi Chính (Changelog)

### 1.1. Kiến trúc Server Checkout (`POST /api/pos/checkout`)
- **Vấn đề cũ**: Client trình duyệt gọi trực tiếp `authUtils.addHoaDon` rồi chạy vòng lặp `addHoaDonDetail` ghi vào Supabase. Thao tác này thất bại do RLS chặn quyền ghi trực tiếp từ browser, và nếu đứt kết nối mạng thì dữ liệu bị rách nát (có hóa đơn nhưng thiếu chi tiết).
- **Giải pháp mới**:
  - Chuyển 100% nghiệp vụ thanh toán lên server qua endpoint `/api/pos/checkout`.
  - Xác thực nhân viên qua cookie (`getAuthenticatedStaff`).
  - Giao dịch nguyên tử qua RPC `pos_pay_order` (hoặc server-side fallback an toàn với `service_role`): lưu `HOADON` + bulk insert `HOADONDETAIL` + đổi trạng thái bàn `DSBAN` về 'Trống' + xóa draft `pos_cart_drafts` + cập nhật đơn bếp `pos_orders` sang `paid`.
  - Tích hợp `idempotency_key` duy nhất (`UNIQUE`), chống thanh toán trùng lặp khi mạng chập chờn hoặc thu ngân bấm liên tiếp.

### 1.2. Chuyển bàn Nguyên tử (`POST /api/pos/transfer-table`)
- **Vấn đề cũ**: Client cập nhật rời rạc 2 bàn và xóa draft, dễ gây deadlock và race condition giữa các máy thu ngân; timer autosave có thể ghi đè lại giỏ ở bàn cũ.
- **Giải pháp mới**:
  - Hủy timer debounce autosave (`cancelPendingAutosave()`) ngay trước khi gọi lệnh chuyển bàn.
  - Endpoint `/api/pos/transfer-table` thực thi chuyển bàn với cơ chế khóa hàng theo thứ tự alphabet cố định (`source_id < target_id`), loại trừ hoàn toàn deadlock.
  - Tự động gộp giỏ hàng (merge items) nếu bàn đích đã có sẵn món.

### 1.3. Triệt tiêu "Giỏ Ma" (Ghost Cart) trong Autosave (`PUT /api/pos/cart-draft`)
- **Vấn đề cũ**: Sử dụng `upsert({ onConflict: 'table_id' })`, khiến một request autosave gửi trễ từ máy khách vô tình hồi sinh bản ghi draft cho một bàn vừa được thanh toán hoặc đã chuyển đi.
- **Giải pháp mới**:
  - Thay thế `upsert` bằng `UPDATE ... WHERE table_id = :id AND version = :expectedVersion`.
  - Nếu bản ghi đã bị xóa (do đã thanh toán/chuyển bàn), API trả về `409 Conflict`, ngắt ngay tiến trình autosave trễ và không bao giờ tự ý tạo mới giỏ ma.

### 1.4. Bảo vệ Thao tác Xóa Giỏ (Chặn xóa im lặng khi bấm Esc)
- **Vấn đề cũ**: Nhấn phím `Escape` tự động gọi `clearCart()` xóa sạch giỏ hàng không cần xác nhận.
- **Giải pháp mới**:
  - Khi bấm `Escape` hoặc nút "Xóa tất cả", hệ thống luôn kích hoạt hộp thoại xác nhận `AlertDialog` (`showClearConfirmation`). Thu ngân bắt buộc bấm "Xóa tất cả" mới thực thi làm sạch giỏ.

---

## 2. Danh mục File Database & Code Thay đổi

| Loại | Đường dẫn File | Mục đích |
| :--- | :--- | :--- |
| **Migration** | `supabase/migrations/202610180004_pos_core_rpc.sql` | Thêm cột `idempotency_key UNIQUE` vào `HOADON`; khai báo 2 RPC `pos_pay_order` và `pos_transfer_table_cart`. |
| **Rollback** | `supabase/rollbacks/202610180004_pos_core_rpc.down.sql` | Script hoàn tác schema và drop 2 hàm RPC an toàn. |
| **Script** | `scripts/db/apply-migration.mjs` | Script áp migration kèm tự động kiểm định an toàn môi trường STAGING (`check-env.mjs`). |
| **Server API** | `src/app/api/pos/checkout/route.ts` | Endpoint thanh toán server-side an toàn nguyên tử. |
| **Server API** | `src/app/api/pos/transfer-table/route.ts` | Endpoint chuyển bàn server-side chống deadlock. |
| **Server API** | `src/app/api/pos/cart-draft/route.ts` | Sửa PUT dùng `UPDATE` có điều kiện version, chống sinh ghost cart. |
| **Client Hook** | `src/app/(dashboard)/pos/hooks/usePOS.ts` | Gọi `/api/pos/checkout`, `/api/pos/transfer-table`, tích hợp `showClearConfirmation` cho phím Esc. |
| **Client Hook** | `src/app/(dashboard)/pos/hooks/useSharedCartDraft.ts` | Bổ sung `cancelPendingAutosave()` để hủy timer debounce khi chuyển bàn. |
| **Client UI** | `src/app/(dashboard)/pos/components/CartSidebar.tsx` | Điều khiển `AlertDialog` xác nhận xóa giỏ qua props đồng bộ. |
| **Client UI** | `src/app/(dashboard)/pos/page.tsx` | Liên kết state `showClearConfirmation` với giao diện POS. |
| **Type** | `src/app/(dashboard)/pos/types/pos.ts` | Khai báo `showClearConfirmation` trong `ModalState`. |
| **Test** | `tests/unit/checkout-api.test.ts` | 4 bài test cho luồng checkout, xác thực, idempotency. |
| **Test** | `tests/unit/transfer-table-api.test.ts` | 4 bài test cho luồng chuyển bàn, RPC, gộp giỏ fallback. |
| **Test** | `tests/unit/cart-draft-api.test.ts` | Cập nhật 4 bài test kiểm thử logic `UPDATE` và conflict 409. |

---

## 3. Kết quả Kiểm thử & Build

### 3.1. Unit Test Tự động (`npm test`)
```
 RUN  v3.2.7 D:/Documents/H2MilkTea

 ✓ tests/unit/catalog.test.ts (3 tests)
 ✓ tests/unit/ai-features.test.ts (9 tests)
 ✓ tests/unit/transfer-table-api.test.ts (4 tests)
 ✓ tests/unit/checkout-api.test.ts (4 tests)
 ✓ tests/unit/cart-draft-api.test.ts (4 tests)
 ✓ tests/unit/faq.test.ts (9 tests)
 ✓ tests/unit/ai-settings.test.ts (8 tests)

 Test Files  7 passed (7)
      Tests  41 passed (41) - TỶ LỆ PASS: 100%
```

### 3.2. Production Build (`npm run build`)
```
 ✓ Compiled successfully in 6.0s
 ✓ Generating static pages (48/48)
 ✓ Finalizing page optimization
 ✓ Toàn bộ dynamic routes và static routes đều build thành công, không phát sinh lỗi.
```

---

## 4. Kế hoạch & Hướng dẫn Quay lui (Rollback Playbook)

### 4.1. Quay lui Mã nguồn (Git)
Nếu phát sinh lỗi nghiệp vụ ở Phase 1:
```bash
# Quay về điểm tag kết thúc Phase 0
git switch exp/thesis-perfect
git reset --hard backup/baseline-20261018
```

### 4.2. Quay lui Database (Supabase)
Nếu cần khôi phục lại cấu trúc schema trước Phase 1:
1. Áp file rollback: `supabase/rollbacks/202610180004_pos_core_rpc.down.sql` (chạy trên SQL Editor của Supabase STAGING).
2. Hoặc khôi phục từ bản backup an toàn trước khi vào Phase 1:
```bash
npm run db:restore backups/db/20261018-050529-phase-1-start -- --confirm-ref=uhnrkyzicqhozwlimvew
npm run db:verify
```

---

## 5. Kịch bản Thực nghiệm Kiểm chứng (Demo Steps)

Chủ dự án hoặc người đánh giá có thể kiểm tra nghiệm thu theo 4 bước sau:

1. **Kiểm chứng Thanh toán An toàn (Single-transaction & Idempotency)**:
   - Mở màn hình POS quầy (`/pos`), chọn Bàn 01, thêm 2 món.
   - Nhấn **F4** hoặc bấm nút "Thanh toán", nhập số tiền khách trả, bấm "Xác nhận thanh toán".
   - *Kết quả mong đợi*: Hóa đơn được tạo trên server trong 1 transaction duy nhất, bàn tự động chuyển về trạng thái 'Trống', giỏ hàng dùng chung được dọn dẹp sạch sẽ. Nếu có network retry với cùng `idempotency_key`, server trả về kết quả thành công ngay mà không tạo hóa đơn kép.
2. **Kiểm chứng Chuyển bàn Nguyên tử**:
   - Chọn Bàn 02, thêm 1 món (Bàn 02 chuyển sang 'Đang sử dụng').
   - Nhấn "Đổi bàn", chọn chuyển sang Bàn 03.
   - *Kết quả mong đợi*: Bàn 02 trở về 'Trống', Bàn 03 nhận toàn bộ món và chuyển sang 'Đang sử dụng'. Timer autosave của Bàn 02 bị hủy ngay lập tức, không để lại giỏ ma trên Bàn 02.
3. **Kiểm chứng Chống Giỏ Ma (Autosave Ghost Cart)**:
   - Mở cùng lúc 2 tab trình duyệt trên Bàn 04.
   - Tab 1 thanh toán Bàn 04 thành công (bàn trở về 'Trống').
   - Tab 2 thử thêm món hoặc autosave muộn.
   - *Kết quả mong đợi*: API trả về `409 Conflict`, từ chối tạo mới bản ghi giỏ hàng trên bàn đã đóng.
4. **Kiểm chứng Phím Esc Không Xóa Im Lặng**:
   - Chọn một bàn có 3 món trong giỏ.
   - Nhấn phím `Escape` trên bàn phím.
   - *Kết quả mong đợi*: Hộp thoại xác nhận `AlertDialog` hiển thị ("Xóa toàn bộ giỏ hàng?"). Giỏ hàng chỉ bị xóa khi thu ngân chủ động bấm "Xóa tất cả". Nếu bấm "Hủy", giỏ hàng giữ nguyên 100%.

---

## 6. Trạng thái Gate 1
- **ĐIỀU KIỆN GATE 1 ĐÃ ĐẠT 100%**:
  - Không vi phạm 11 Luật An toàn.
  - Toàn bộ 41 unit tests pass.
  - Build production thành công.
  - Đầy đủ file migration + rollback down.
- **Hành động tiếp theo**: Đang dừng tại **GATE 1**. Chờ lệnh từ chủ dự án: `GO PHASE 2`.
