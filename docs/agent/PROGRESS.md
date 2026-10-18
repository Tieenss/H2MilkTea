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
- [x] **1.5 Tổng kết Gate 1**:
  - Soạn báo cáo nghiệm thu `docs/agent/phase-1-report.md`.


