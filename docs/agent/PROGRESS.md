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

## Trạng thái Gate 0 (ĐÃ HOÀN TẤT - SẴN SÀNG NGHIỆM THU)
- Hồ sơ nghiệm thu Phase 0 đã hoàn tất đầy đủ 100%:
  1. `docs/agent/00-baseline-report.md` (Báo cáo sức khỏe codebase)
  2. `docs/agent/01-honest-audit.md` (Audit matrix + Risk register)
  3. `docs/agent/ROLLBACK.md` (Playbook quay lui + Biên bản diễn tập STAGING 0.4)
  4. `docs/agent/DECISIONS.md` (Quyết định kỹ thuật)
  5. `docs/experiment/baseline-protocol.md` & `baseline-template.csv`
  6. Toàn bộ scripts bảo vệ (`check-env.mjs`, `backup.mjs`, `restore.mjs`, `verify-backup.mjs`, `seed-staging.mjs`)
- Đang dừng tại **GATE 0** chờ lệnh: `GO PHASE 1`.
