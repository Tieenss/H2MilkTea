# Tiến Độ Dự Án (PROGRESS.md)

- **Nhánh chính**: `exp/thesis-perfect`
- **Phiên bản hiện tại**: Phase 0 — Nền móng và hiện trạng

---

## Nhật ký Tiến độ Phase 0

- [x] **0.1**: Kiểm tra `git status` sạch, ghi nhận HEAD.
- [x] **0.2**: Gắn tag `backup/baseline-20261018`, tạo `h2milktea-baseline.bundle`, xuất bản zip ra ngoài repo `D:\Documents\h2milktea-baseline-20261018.zip`, tạo nhánh `exp/thesis-perfect`.
- [x] **0.3**: Viết bộ script an toàn `scripts/check-env.mjs`, `scripts/db/backup.mjs`, `scripts/db/restore.mjs`, `scripts/db/verify-backup.mjs`, cập nhật `.gitignore` và `.env.example`, gắn `predev` và `pretest` vào `package.json`.
- [ ] **0.4**: Diễn tập backup/restore trên STAGING (chờ xác nhận thông tin STAGING và `FORBIDDEN_SUPABASE_REFS` từ chủ dự án).
- [x] **0.5**: Hợp nhất lệch nhánh giữa `master` và `feature/ai-chatbot-mvp`, giải quyết sạch sẽ 4 xung đột, bổ sung các file rollback `.down.sql`.
- [x] **0.6**: Chạy baseline health check (`npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`), lập báo cáo trung thực `docs/agent/00-baseline-report.md`.
- [x] **0.7**: Thực hiện Audit trung thực (ma trận tính năng, RLS, phân quyền API, điểm ghi DB trực tiếp từ client) và lập Risk Register tại `docs/agent/01-honest-audit.md`.
- [x] **0.8**: Thiết lập giao thức đo thực nghiệm `docs/experiment/baseline-protocol.md` và bảng mẫu `docs/experiment/baseline-template.csv`.

---

## Trạng thái Gate 0
- Hồ sơ nghiệm thu Phase 0 đã hoàn tất:
  1. `docs/agent/00-baseline-report.md`
  2. `docs/agent/01-honest-audit.md` (Audit matrix + Risk register)
  3. `docs/agent/ROLLBACK.md` (Playbook quay lui)
  4. `docs/agent/DECISIONS.md` (Quyết định kỹ thuật)
  5. `docs/experiment/baseline-protocol.md` & `baseline-template.csv`
- Cần thực hiện bước 0.4 (Diễn tập backup/restore trên STAGING) sau khi có thông tin xác nhận từ chủ dự án.
