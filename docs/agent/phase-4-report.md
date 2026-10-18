# Báo cáo Nghiệm thu Phase 4: Mở rộng tùy chọn món và Hỏi đáp tài liệu

- **Thời điểm hoàn thành**: 2026-10-18
- **Nhánh thực hiện**: `exp/thesis-perfect`
- **Môi trường**: Supabase STAGING (`uhnrkyzicqhozwlimvew`) — An toàn tuyệt đối, không chạm production
- **Tag nghiệm thu**: `exp/phase-4-done`
- **Tình trạng nghiệm thu**: **ĐẠT (PASS 100%)**

---

## 1. Tóm tắt Mục tiêu & Kết quả Đạt được

| Hạng mục mục tiêu | Hiện trạng trước Phase 4 | Kết quả đạt được tại Phase 4 | Đánh giá |
|---|---|---|---|
| **Tùy chọn món (Size / Đường / Đá / Topping)** | `lineItemKey` chỉ phân biệt theo `${id}::${note}` khiến các ly cùng món khác tùy chọn bị gộp nhầm | `lineItemKey` tích hợp định danh duy nhất theo `${id}::${note}::size=${size}::sugar=${sugar}::ice=${ice}::toppings=${toppings}`. Toppings được sắp xếp theo bảng chữ cái. Khách gọi 1 ly Size M 50% đường và 1 ly Size L 100% đường sẽ nằm ở 2 dòng riêng biệt | **ĐẠT 100%** |
| **So sánh giỏ hàng Trước / Sau (Before / After Cart Diff)** | Thanh preview chỉ hiển thị văn bản sơ sài, không có so sánh số lượng và chênh lệch tiền | Giao diện Trợ lý POS (`POSAssistant.tsx`) hiển thị khối Before / After Cart Diff trực quan: số lượng món hiện tại vs sau xác nhận (kèm delta `+X`), tổng tiền hiện tại vs sau xác nhận (kèm delta `+Y đ`), chi tiết món thêm (+) / bớt (-) kèm badge options | **ĐẠT 100%** |
| **Hỏi đáp cẩm nang có trích dẫn nguồn (`/user-guide`)** | Trả lời QA cẩm nang dạng text tự do, không dẫn chiếu nguồn | Tri thức `POS_KNOWLEDGE_BASE` chuẩn hóa 100% với `sectionId` và `sectionTitle` tương ứng 13 đề mục cẩm nang. Khi `action === 'qa'`, câu trả lời bắt buộc đính kèm cú pháp chuẩn `[Nguồn: Hướng dẫn sử dụng > {Tên mục}](/user-guide#{sectionId})` | **ĐẠT 100%** |
| **Ranh giới cấm tuyệt đối (Luật 6 & 131)** | Đã được xác nhận | **KHÔNG** làm voice auto-submit (giọng nói chỉ dừng ở việc điền text và hiển thị preview, thu ngân phải tự tay bấm "Xác nhận"), **KHÔNG** làm đồng bộ FAQ QR/POS | **ĐẠT 100%** |
| **Độ chính xác Benchmark AI (`npm run eval:ai`)** | 92.7% (Phase 3) | **100.0%** (55/55 câu trên `test.jsonl`, 30/30 câu trên `dev.jsonl`) | **ĐẠT 100%** |
| **Chất lượng Kiểm thử (Unit Tests)** | 10 test files (69 tests) | **11 test files (81 tests) PASS 100%**, bổ sung `tests/unit/phase-4-options-qa.test.ts` (12 tests) | **ĐẠT 100%** |
| **Biên dịch Production (`npm run build`)** | 50 routes thành công | **50 routes compile thành công 100%**, Next.js 15.3.8 sạch sẽ không cảnh báo lint/type | **ĐẠT 100%** |

---

## 2. Chi tiết Triển khai Kỹ thuật

### 2.1. Tùy chọn Món & Định danh Dòng Giỏ Hàng (`lineItemKey`)
- **Định dạng mới**:
  ```ts
  export function getLineItemKey(item: {
    id: string;
    note?: string;
    size?: string;
    sugar?: string;
    ice?: string;
    toppings?: string[] | string;
  }): string
  ```
  - Base key: `${item.id}::${noteNormalized}` (đảm bảo tính tương thích ngược 100% với Phase 2 và các món không có tùy chọn).
  - Tùy chọn gắn thêm: `::size=${size}::sugar=${sugar}::ice=${ice}::toppings=${sortedToppings}`.
  - Sắp xếp toppings: Danh sách toppings được chuẩn hóa và sắp xếp theo thứ tự a-z (`.sort()`), đảm bảo thứ tự gọi `[Thạch, Trân châu]` hay `[Trân châu, Thạch]` đều sinh ra cùng một key duy nhất.
- **Hook giỏ hàng (`useCart.ts` & `usePOS.ts`)**:
  - `addToCart` nhận `options?: { size, sugar, ice, toppings, note }`.
  - Dùng `getLineItemKey` để tìm dòng trùng lặp trong giỏ. Nếu cùng loại nhưng khác options, tự động thêm dòng mới độc lập.

### 2.2. Giao diện Before / After Cart Diff trên POS Assistant (`POSAssistant.tsx`)
- Khi AI phân tích xong câu lệnh thêm/bớt món, giao diện hiển thị bảng so sánh Trước / Sau:
  - **Hiện tại (Before)**: Số lượng món hiện có và tổng tiền trước thay đổi.
  - **Dự kiến (After)**: Số lượng món dự kiến (kèm delta `+X` hoặc `-X`), tổng tiền dự kiến (kèm delta chênh lệch tiền `+Y đ` hoặc `-Y đ`).
  - **Danh sách chi tiết thay đổi**: Phân loại theo món thêm (➕, nền indigo) hoặc bớt (➖, nền rose), hiển thị rõ ràng từng thuộc tính Size, Đường, Đá, Topping dưới dạng badge màu.
  - **Nút hành động an toàn**: Nút "Hủy" (gửi audit log rejected) và nút "Xác nhận" (gửi audit log confirmed và áp dụng vào giỏ).

### 2.3. Hỏi đáp Cẩm nang `/user-guide` kèm Nguồn Trích dẫn
- **Tri thức nghiệp vụ (`src/lib/ai/knowledge.ts`)**:
  - Chuẩn hóa 13 mục cẩm nang tương ứng trên trang `/user-guide`:
    1. `introduction`: Giới thiệu chung (`/user-guide#introduction`)
    2. `login`: Đăng nhập hệ thống (`/user-guide#login`)
    3. `pos`: POS Bán hàng (`/user-guide#pos`)
    4. `orders`: Quản lý đơn hàng (`/user-guide#orders`)
    5. `customers`: Quản lý khách hàng (`/user-guide#customers`)
    6. `menu`: Menu & Sản phẩm (`/user-guide#menu`)
    7. `reports`: Báo cáo & Thống kê (`/user-guide#reports`)
    8. `settings`: Cài đặt hệ thống (`/user-guide#settings`)
    9. `shortcuts`: Phím tắt (`/user-guide#shortcuts`)
    10. `mobile`: Hỗ trợ di động / Đơn QR (`/user-guide#mobile`)
    11. `troubleshooting`: Xử lý lỗi (`/user-guide#troubleshooting`)
    12. `support`: Hỗ trợ kỹ thuật (`/user-guide#support`)
    13. `ai-assistant`: Trợ lý AI POS (`/user-guide#ai-assistant`)
  - Hàm tiện ích:
    - `formatCitation(sectionTitle, sectionId)`: Sinh chuỗi `[Nguồn: Hướng dẫn sử dụng > {Tên mục}](/user-guide#{sectionId})`.
    - `appendCitationIfMissing(answer, topic)`: Tự động phát hiện và bổ sung nguồn trích dẫn nếu câu trả lời chưa có trích dẫn, đảm bảo không bao giờ bị lặp lại.
  - Cập nhật trong Pipeline AI (`src/lib/ai/pipeline.ts`): Bắt buộc mọi câu trả lời `action === 'qa'` đều có nguồn trích dẫn hợp lệ.

---

## 3. Bằng chứng Kiểm thử & Xác minh

### 3.1. Kết quả Unit Tests (Vitest)
```bash
 RUN  v3.2.7 D:/Documents/H2MilkTea

 ✓ tests/unit/cart-conflict.test.ts (8 tests) 9ms
 ✓ tests/unit/catalog.test.ts (3 tests) 5ms
 ✓ tests/unit/checkout-api.test.ts (4 tests) 17ms
 ✓ tests/unit/transfer-table-api.test.ts (4 tests) 20ms
 ✓ tests/unit/cart-draft-api.test.ts (4 tests) 20ms
 ✓ tests/unit/ai-features.test.ts (9 tests) 9ms
 ✓ tests/unit/phase-4-options-qa.test.ts (12 tests) 16ms
 ✓ tests/unit/qr-lifecycle.test.ts (7 tests) 23ms
 ✓ tests/unit/faq.test.ts (9 tests) 20ms
 ✓ tests/unit/ai-settings.test.ts (8 tests) 20ms
 ✓ tests/unit/ai-pipeline.test.ts (13 tests) 23ms

 Test Files  11 passed (11)
      Tests  81 passed (81)
   Duration  1.04s
```

### 3.2. Kết quả AI Benchmark (`npm run eval:ai`)
```bash
========================================================================
               BẢNG ĐỘ CHÍNH XÁC THEO NHÓM (ACCURACY BY CATEGORY)
========================================================================
| Nhóm kiểm định (Category)     | Số mẫu | Chính xác | Tỷ lệ (%) |
|-------------------------------|--------|-----------|-----------|
| single_item                   |      8 |         8 |    100.0% |
| multi_item                    |      7 |         7 |    100.0% |
| alias                         |      8 |         8 |    100.0% |
| options                       |      7 |         7 |    100.0% |
| ambiguous                     |      8 |         8 |    100.0% |
| unauthorized                  |      8 |         8 |    100.0% |
| prompt_injection              |      9 |         9 |    100.0% |
------------------------------------------------------------------------
| TỔNG CỘNG CHUNG               |     55 |        55 |    100.0% |
========================================================================
🎉 KẾT QUẢ ĐẠT TIÊU CHUẨN NGHIỆM THU: 100.0% >= 80%
```

### 3.3. Kết quả Build Production (`npm run build`)
- 50 static & dynamic routes được biên dịch hoàn tất thành công.
- Không phát sinh lỗi biên dịch, cảnh báo type hoặc xung đột build.

---

## 4. Trạng thái GATE 4

Toàn bộ các tiêu chí của **Phase 4** theo [H2MILKTEA_AGENT_MASTER_PLAN.md](file:///d:/Documents/H2MilkTea/H2MILKTEA_AGENT_MASTER_PLAN.md) đã được nghiệm thu hoàn tất 100%.

> **GATE 4: DỪNG LẠI TẠI ĐÂY**  
> Tuân thủ Quy tắc 11: Agent sẽ commit, gắn tag `exp/phase-4-done` và dừng lại tại GATE 4 để chờ lệnh `GO PHASE 5` từ Người dùng.
