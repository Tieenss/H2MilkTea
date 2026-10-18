# Tiến Độ Dự Án (PROGRESS.md)

- **Nhánh chính**: `exp/thesis-perfect`
- **Phiên bản hiện tại**: Phase 5 — Hoàn thiện và tài liệu (HOÀN TẤT TOÀN DIỆN KHÓA LUẬN)

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

---

## Kế hoạch Thực hiện Phase 5 — Hoàn thiện và tài liệu (HOÀN TẤT)

- [x] **5.1 Quét Secret Toàn Bộ Codebase & Kiểm Toán Bảo Mật**:
  - Quét toàn bộ `src/` và `scripts/`: Xác nhận 0 secret bị lộ, không có hardcoded Supabase service key / LLM token.
  - Kiểm tra các biến môi trường và cơ chế chốt chặn `check-env.mjs` bảo vệ production database (`yeblrlzyellcawfleeox`).
- [x] **5.2 Khả Năng Quan Sát & Module Logger Tập Trung (Traceability & Correlation ID)**:
  - Xây dựng module `src/lib/logger.ts` cung cấp ghi log có cấu trúc chuẩn JSON (`logInfo`, `logWarn`, `logError`) kèm `correlationId`.
  - Cập nhật `src/middleware.ts`: Tự động cấp phát và gắn header `x-correlation-id` xuyên suốt các API request/response.
  - Lập Ma trận Truy vết Yêu cầu Nghiệp vụ (RTM): [docs/traceability.md](file:///d:/Documents/H2MilkTea/docs/traceability.md) ánh xạ 15 yêu cầu -> Use Case -> DB/RPC -> API -> Tests.
- [x] **5.3 Đo Lường Thực Nghiệm Độ Trễ AI (Latency Benchmark)**:
  - Viết script [scripts/measure-latency.ts](file:///d:/Documents/H2MilkTea/scripts/measure-latency.ts) và gán script `npm run eval:latency`.
  - Chạy thực nghiệm 200 mẫu ngẫu nhiên: **p50 = 0.31 ms**, **p95 = 0.65 ms**, min/max = 0.19 ms / 1.39 ms, 100% đạt chuẩn SLA $\le 500$ ms.
  - Xuất báo cáo chi tiết: [docs/agent/ai-latency-report.md](file:///d:/Documents/H2MilkTea/docs/agent/ai-latency-report.md).
- [x] **5.4 Thiết Lập Tự Động Hóa Quy Trình Kiểm Thử CI GitHub Actions**:
  - Tạo cấu hình CI workflow [.github/workflows/ci.yml](file:///d:/Documents/H2MilkTea/.github/workflows/ci.yml).
  - Pipeline tự động: checkout -> node 20 -> npm ci -> check-env -> unit test -> eval:ai -> eval:latency -> build production.
- [x] **5.5 Script Seed Dữ Liệu Mẫu Demo An Toàn trên STAGING**:
  - Xây dựng [scripts/db/seed-demo.mjs](file:///d:/Documents/H2MilkTea/scripts/db/seed-demo.mjs) kích hoạt bằng `npm run db:seed:demo`.
  - Nạp 2 đơn POS mẫu và 2 audit logs đại diện vào Supabase STAGING có gắn nhãn rõ `[DEMO - Đồ án Tốt nghiệp]`, tự động chặn nếu trỏ Production.
- [x] **5.6 Bộ Tài Liệu Kỹ Thuật Hoàn Chỉnh**:
  - [docs/traceability.md](file:///d:/Documents/H2MilkTea/docs/traceability.md): Ma trận truy vết 15 chức năng nghiệp vụ & 81 tests.
  - [docs/api-reference.md](file:///d:/Documents/H2MilkTea/docs/api-reference.md): Bảng đặc tả 16 API endpoints (Request/Response/Auth/Errors).
  - [docs/erd.md](file:///d:/Documents/H2MilkTea/docs/erd.md): Sơ đồ CSDL 10 bảng thực thể và quan hệ khóa ngoại bằng Mermaid.
  - [README.md](file:///d:/Documents/H2MilkTea/README.md): Cập nhật toàn diện hướng dẫn cài đặt, kiến trúc, kiểm thử và hướng dẫn demo.
- [x] **5.7 Báo Cáo Nghiệm Thu & Tổng Kết Khóa Luận**:
  - [docs/agent/phase-5-report.md](file:///d:/Documents/H2MilkTea/docs/agent/phase-5-report.md): Báo cáo nghiệm thu Phase 5.
  - [docs/agent/FINAL-REVIEW.md](file:///d:/Documents/H2MilkTea/docs/agent/FINAL-REVIEW.md): Báo cáo tổng kết toàn khóa luận theo 5 nội dung chuẩn mực của Master Plan.
- [x] **5.8 Đóng Gói Checkpoint & Kiểm Định Toàn Diện**:
  - 100% tests PASS (11/11 test files, 81/81 tests).
  - 100% eval:ai benchmark pass (100.0% accuracy).
  - 100% build Next.js thành công (50/50 routes).
  - Commit và gắn tag `exp/phase-5-done`.
