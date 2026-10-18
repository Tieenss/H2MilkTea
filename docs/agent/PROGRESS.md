# Tiến Độ Dự Án (PROGRESS.md)

- **Nhánh chính**: `exp/thesis-perfect`
- **Phiên bản hiện tại**: Phase 0 — Nền móng và hiện trạng

---

## Nhật ký Tiến độ Phase 0

- [x] **0.1**: Kiểm tra `git status` sạch, ghi nhận HEAD.
- [x] **0.2**: Gắn tag `backup/baseline-20261018`, tạo `h2milktea-baseline.bundle`, xuất bản zip ra ngoài repo `D:\Documents\h2milktea-baseline-20261018.zip`, tạo nhánh `exp/thesis-perfect`.
- [x] **0.3**: Viết bộ script an toàn `scripts/check-env.mjs`, `scripts/db/backup.mjs`, `scripts/db/restore.mjs`, `scripts/db/verify-backup.mjs`, cập nhật `.gitignore` và `.env.example`, gắn `predev` và `pretest` vào `package.json`.
- [x] **0.4**: Diễn tập backup/restore trên STAGING (mã backup `20261017-194019-rehearsal`, kiểm định checksum và số bản ghi khớp 100%, ghi biên bản vào `ROLLBACK.md`).
- [x] **0.5**: Hợp nhất lệch nhánh giữa `master` và `feature/ai-chatbot-mvp`, giải quyết sạch sẽ 4 xung đột, bổ sung các file rollback `.down.sql`.
- [x] **0.6**: Chạy baseline health check (`npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`), lập báo cáo trung thực `docs/agent/00-baseline-report.md`.
- [x] **0.7**: Thực hiện Audit trung thực (ma trận tính năng, RLS, phân quyền API, điểm ghi DB trực tiếp từ client) và lập Risk Register tại `docs/agent/01-honest-audit.md`.
- [x] **0.8**: Thiết lập giao thức đo thực nghiệm `docs/experiment/baseline-protocol.md` và bảng mẫu `docs/experiment/baseline-template.csv`.

---

## Kế hoạch Thực hiện Phase 1 — Ổn định POS lõi (HOÀN TẤT)

- [x] **1.1 Database Migration & Rollback**:
  - Tạo migration `202610180004_pos_core_rpc.sql` và rollback `202610180004_pos_core_rpc.down.sql`.
  - Thêm cột `idempotency_key UNIQUE` vào bảng `HOADON`.
  - Viết RPC `pos_pay_order` (atomic transaction: tạo hóa đơn + chi tiết + đóng bàn + xóa draft + cập nhật pos_orders sang paid).
  - Viết RPC `pos_transfer_table_cart` (atomic transaction: deadlock-free lock order, chuyển/gộp giỏ draft, cập nhật trạng thái 2 bàn).
  - Thiết lập script an toàn `scripts/db/apply-migration.mjs` có tích hợp guardrail `check-env.mjs`.
- [x] **1.2 API Checkout & Sửa Autosave**:
  - Tạo route POST `/api/pos/checkout`: xác thực staff role, chuyển toàn bộ thao tác ghi hóa đơn lên server qua RPC và server-side transaction fallback, loại trừ hoàn toàn việc browser ghi trực tiếp vào DB.
  - Sửa PUT `/api/pos/cart-draft`: thay thế upsert bằng `UPDATE ... WHERE version = :v` có điều kiện, loại bỏ hiện tượng ghost cart khi autosave gửi trễ.
  - Tạo route POST `/api/pos/transfer-table`: chuyển bàn phía server an toàn nguyên tử.
- [x] **1.3 Cải tiến Client (POS Hook & Modal Xóa Giỏ)**:
  - Cập nhật `usePOS.ts`: chuyển `processPayment` sang gọi `/api/pos/checkout` thay cho `authUtils.addHoaDon`.
  - Cập nhật `transferTable`: hủy debounce autosave trước khi gọi (`cancelPendingAutosave`), chuyển sang gọi `/api/pos/transfer-table`.
  - Phím `Escape` & Xóa giỏ: bật dialog xác nhận xóa giỏ (AlertDialog) qua `showClearConfirmation`, triệt tiêu hoàn toàn việc xóa im lặng giỏ hàng.
- [x] **1.4 Unit & Integration Tests**:
  - Viết test cho `checkout API` (`tests/unit/checkout-api.test.ts`): kiểm tra 401 unauth, 400 validation, single server flow, idempotency duplicate prevention.
  - Viết test cho `transfer-table API` (`tests/unit/transfer-table-api.test.ts`): kiểm tra 401, 400 cùng bàn, RPC execution, server-side merge carts.
  - Cập nhật `cart-draft-api.test.ts` để kiểm thử logic `UPDATE` và conflict `409` khi stale version.
  - Kết quả kiểm thử: **100% PASS** (7/7 test files, 41/41 tests pass).
  - Build sản phẩm: `npm run build` thành công 100% (48 routes compile sạch sẽ).
## Kế hoạch Thực hiện Phase 2 — Đồng bộ đa thiết bị và đơn QR (HOÀN TẤT)

- [x] **2.1 Migration Vòng Đời Đơn QR & Token Bảo Vệ**:
  - Tạo migration `202610180005_qr_order_lifecycle.sql` và `202610180005_qr_order_lifecycle.down.sql`.
  - Mở rộng check constraint `order_status` của `pos_orders` để hỗ trợ: `'awaiting_confirmation', 'accepted', 'rejected', 'completed', 'cancelled', 'expired', 'cancelled_by_customer'`.
  - Bổ sung cột `expires_at`, chỉ mục `pos_orders_expiry_idx` và hàm RPC `expire_stale_qr_orders()`.
- [x] **2.2 Nâng Cấp API Đơn QR (Hủy Đơn, Hết Hạn & Chống Spam)**:
  - Khách hàng tự hủy đơn qua `POST /api/orders/cancel` bằng `tracking_token` bí mật khi đơn đang ở `awaiting_confirmation`. Broadcast realtime tới khách và POS.
  - Tự động đánh dấu `expired` sau 15 phút chưa duyệt khi gọi danh sách đơn tại quầy.
  - Chống spam QR: HMAC session token (`generateTableQrToken`, `verifyTableQrToken`), In-memory Rate Limiting theo `IP + bàn`, giới hạn tối đa 20 món/đơn QR.
- [x] **2.3 Chính Sách Xung Đột Giỏ Hàng (Conflict Resolution)**:
  - Xây dựng thuật toán `getLineItemKey` (`id + note`) và `diffCartItems`.
  - Tự động merge an toàn các món không trùng key giữa 2 thiết bị.
  - Cùng key nhưng khác số lượng: chặn thanh toán và hiển thị `CartConflictModal` cung cấp 3 phương án xử lý minh bạch (Giữ máy này, Lấy từ máy khác, Cộng dồn số lượng). Không ghi đè âm thầm.
- [x] **2.4 Realtime + Polling Dự Phòng & Chặn Thanh Toán Khi Chưa Chắc Chắn**:
  - Dừng polling khi tab ẩn (`document.hidden`) và áp dụng exponential backoff khi lỗi kết nối.
  - Badge trạng thái đồng bộ rõ ràng trên header giỏ hàng (`Đã đồng bộ`, `Đang đồng bộ...`, `Xung đột giỏ hàng`, `Mất kết nối`).
  - Chặn nút thanh toán (`disabled` kèm tooltip cảnh báo) khi `sharedCartStatus === 'conflict' | 'offline'`.
- [x] **2.5 Unit Tests & Báo Cáo Gate 2**:
  - Viết bộ kiểm thử `tests/unit/cart-conflict.test.ts` (8 tests) và `tests/unit/qr-lifecycle.test.ts` (7 tests).
  - Kiểm định toàn diện: **9/9 test files pass 100% (56/56 tests)**.
  - Build production: **49 routes compile thành công 100%** không lỗi.
  - Lập báo cáo nghiệm thu `docs/agent/phase-2-report.md`.

---

## Kế hoạch Thực hiện Phase 3 — AI An Toàn (P0) (HOÀN TẤT)

- [x] **3.1 Backup DB & Migration Audit Logs**:
  - Tạo backup an toàn STAGING: `backups/db/20261018-053423-phase-3-start`.
  - Migration `202610180006_ai_audit_logs.sql` và rollback `202610180006_ai_audit_logs.down.sql`.
  - Thiết lập module `auditLogger.ts` ghi nhận log vào DB kèm fallback lưu file JSON `data/ai_audit_logs.json`.
- [x] **3.2 Hàng Rào An Toàn & Chống Prompt Injection**:
  - Viết module `security.ts`: cấm tuyệt đối AI tự thanh toán, xóa bàn, sửa giá, chiết khấu 100%.
  - Ngăn chặn triệt để prompt injection (`ignore instructions`, `system prompt`, `override system`).
  - Phân quyền theo vai trò nhân viên: chặn truy cập báo cáo tài chính qua chatbot đối với tài khoản thu ngân thông thường.
- [x] **3.3 Pipeline Cố Định 8 Bước (Rule Engine + LLM + Zod)**:
  - Viết `schema.ts`: Ép kiểu dữ liệu chặt chẽ bằng `zod`.
  - Viết `aliases.ts`: Quản lý từ điển alias (`ts`, `dcs`, `bx`, `cf`...) và thay thế theo cụm từ.
  - Viết `ruleEngine.ts`: Xử lý nhanh các câu lệnh chuẩn (<5ms), chuyển câu lệnh mơ hồ cho LLM.
  - Viết `pipeline.ts`: Ghim phiên bản model (`gemini-2.5-flash`), temperature thấp (0.1), version prompt (`v1.0.0`), rate limit 20 req/phút/nhân viên, server validation (`DMHH`, `DSBAN`, max 10 ly).
- [x] **3.4 Quy Trình Preview → Xác Nhận & Cập Nhật Audit**:
  - Client `POSAssistant.tsx`: Hiển thị thanh Preview rõ ràng, bổ sung nút "Xác nhận" và "Hủy".
  - Endpoint `POST /api/ai/audit`: Cập nhật trạng thái audit log sang `confirmed` hoặc `rejected`.
- [x] **3.5 Bộ Đánh Giá Benchmark (eval:ai) & Unit Tests**:
  - Xây dựng `eval/ai/dev.jsonl` (30 câu) và `eval/ai/test.jsonl` (55 câu đóng băng, SHA-256 `ae64094c...`).
  - Viết script `scripts/eval-ai.ts`: Tính độ chính xác theo 7 nhóm và ma trận nhầm lẫn (`npm run eval:ai`). Kết quả đạt **92.7%** (vượt chuẩn 80%).
  - Viết unit tests `tests/unit/ai-pipeline.test.ts` (13 tests). Toàn bộ 10 test files (69/69 tests) pass 100%.
  - Build production thành công 100% (50 routes).

---

## Kế hoạch Thực hiện Phase 4 — Mở rộng tùy chọn món và Hỏi đáp tài liệu (HOÀN TẤT)

- [x] **4.1 Tùy chọn Món & Định danh Dòng Giỏ Hàng (`lineItemKey`)**:
  - Mở rộng `CartItem` trong `pos.ts` bổ sung `size`, `sugar`, `ice`, `toppings`.
  - Cập nhật `getLineItemKey` trong `mergeCart.ts`: tích hợp định danh duy nhất `${id}::${note}::size=${size}::sugar=${sugar}::ice=${ice}::toppings=${sortedToppings}`.
  - Phân biệt các món cùng loại nhưng khác tùy chọn, duy trì tương thích ngược 100% với các món không có tùy chọn.
  - Hook `useCart.ts` & `usePOS.ts`: `addToCart` nhận `options` và tìm kiếm dòng tương ứng qua `getLineItemKey`.
- [x] **4.2 So sánh Giỏ Hàng Trước / Sau khi Preview (Before / After Cart Diff)**:
  - Cập nhật `POSAssistant.tsx`: Tính toán số lượng món hiện tại vs sau xác nhận (kèm delta `+X` hoặc `-X`), tổng tiền hiện tại vs sau xác nhận (kèm delta `+Y đ` hoặc `-Y đ`).
  - Render khối Before / After Cart Diff trực quan với badge options phân loại rõ ràng (Size, Đường, Đá, Topping), nút "Hủy" và nút "Xác nhận".
- [x] **4.3 Hỏi đáp Tài liệu `/user-guide` có Trích dẫn Nguồn**:
  - Chuẩn hóa 13 mục cẩm nang trong `src/lib/ai/knowledge.ts` tương ứng các anchor `/user-guide#{sectionId}`.
  - Hàm `formatCitation` và `appendCitationIfMissing` tự động kiểm tra và gắn trích dẫn nguồn chuẩn `[Nguồn: Hướng dẫn sử dụng > {Tên mục}](/user-guide#{sectionId})` cho tất cả câu trả lời `action: 'qa'`.
  - Hướng dẫn Gemini LLM trong system instruction luôn đính kèm trích dẫn nguồn.
- [x] **4.4 Ranh giới cấm tuyệt đối (Luật 6 & 131)**:
  - Không làm voice auto-submit: Giọng nói chỉ dừng ở việc điền text và hiển thị preview, thu ngân phải tự bấm "Xác nhận".
  - Không làm đồng bộ FAQ QR/POS.
- [x] **4.5 Kiểm thử & Nghiệm thu Gate 4**:
  - Viết unit test `tests/unit/phase-4-options-qa.test.ts` (12 tests).
  - Toàn bộ 11 test files (81/81 tests) PASS 100%.
  - Benchmark AI `npm run eval:ai` đạt **100.0%** (55/55 câu trên `test.jsonl` và 30/30 câu trên `dev.jsonl`).
  - Build production `npm run build` thành công 100% (50 static & dynamic routes).
  - Lập báo cáo nghiệm thu `docs/agent/phase-4-report.md`.
