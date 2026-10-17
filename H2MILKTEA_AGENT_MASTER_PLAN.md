# H2Milktea — Kế hoạch giao việc cho Antigravity (bản thí nghiệm an toàn)

> File này là "hiến pháp" của phiên làm việc. Đọc toàn bộ trước khi làm bất cứ điều gì. Đọc lại **mục 2 (Luật an toàn)** mỗi lần bắt đầu một Phase mới.

---

## 0. Việc chủ dự án làm TRƯỚC khi giao file này (agent không tự làm)

- [ ] Tạo project Supabase **STAGING** riêng (hoặc Supabase branch), nạp schema bằng migration hiện có. Lấy URL, anon key, service role key của STAGING.
- [ ] Tự sao lưu **PRODUCTION** bằng tay (Dashboard → Database → Backups, hoặc `pg_dump`), cất file ngoài thư mục dự án. Kiểm tra gói Supabase đang dùng có backup tự động không; nếu không, bản dump thủ công là đường lui duy nhất của production.
- [ ] Tạo `.env.local` **chỉ chứa khóa STAGING** (kể cả khóa Gemini: dùng khóa riêng có giới hạn quota). Đặt `FORBIDDEN_SUPABASE_REFS=<project-ref-production>` để script chặn chạy nhầm.
- [ ] Đo baseline "trước" tại quán (≥ 10 đơn bấm tay) theo mẫu ở Phase 0.8 **trước khi** merge bất kỳ thay đổi nào.
- [ ] Đặt Antigravity ở chế độ **yêu cầu duyệt** khi chạy lệnh terminal, không để tự chạy hoàn toàn (tên tùy chọn có thể khác theo phiên bản).
- [ ] Đọc quy định của khoa về việc dùng AI hỗ trợ viết code và ghi rõ trong báo cáo.

---

## 1. Vai trò và mục tiêu

Bạn là kỹ sư fullstack senior (Next.js, TypeScript, Supabase/PostgreSQL, Playwright). Dự án: **H2Milktea**, POS cho quán trà sữa nhỏ, đặt món QR tại bàn, trợ lý AI trong POS.

**Mục tiêu**: dựng trên nhánh riêng một **bản tham chiếu đã hoàn thiện** để chủ dự án đánh giá. Bản này **không thay thế** bản đang chạy; chủ dự án tự quyết định phần nào đưa vào production, theo từng PR nhỏ.

Nguyên tắc: chất lượng hơn số lượng. Mỗi thay đổi phải có test, có cách quay lui, và giải thích được bằng ngôn ngữ đơn giản (chủ dự án phải tự bảo vệ trước hội đồng).

Tên bảng cố định, **không đổi tên**: `DMHH`, `DSBAN`, `DSNV`, `HOADON`, `HOADONDETAIL`, `pos_orders`, `pos_cart_drafts`.

---

## 2. LUẬT AN TOÀN (không được vi phạm trong bất kỳ trường hợp nào)

1. **Chỉ làm việc trên nhánh `exp/thesis-perfect`** (và nhánh con của nó), trong thư mục riêng (`git worktree` hoặc bản clone). Không commit lên `main` hay nhánh đang deploy production.
2. **Không chạm database production.** Trước mọi lệnh có kết nối DB, chạy `node scripts/check-env.mjs`; nếu URL/project ref nằm trong `FORBIDDEN_SUPABASE_REFS` hoặc không xác định được → **dừng ngay**.
3. Cấm: `vercel --prod`, `supabase link` tới production, `supabase db push` / `db reset` ngoài STAGING, `git push --force`, `git reset --hard` trên nhánh dùng chung, xóa nhánh/tag/thư mục `backups/`.
4. Mọi thay đổi DB **chỉ qua file migration** có file `down` tương ứng. Theo nguyên tắc **expand → contract**: chỉ thêm cột/bảng/hàm/index trong cùng bản phát hành; không xóa hay đổi tên cột cũ. Mục tiêu: code cũ vẫn chạy được trên schema mới.
5. Không `DROP` / `TRUNCATE` / `DELETE` không có `WHERE`, trừ trong file `down` hoặc script dữ liệu mẫu chỉ chạy trên STAGING.
6. Không in, không commit secret. Kiểm tra `.gitignore` (`.env*`, `backups/`) và quét lịch sử git tìm key bị lộ; nếu thấy thì báo cho chủ dự án để xoay key.
7. **Không bịa số liệu thực nghiệm.** Dữ liệu mẫu/synthetic phải gắn nhãn rõ (`source: synthetic`). Không tạo log AI giả để "trông đẹp". Bộ test của AI (Phase 3) được **đóng băng** trước khi chỉnh prompt.
8. Không thêm dependency lớn, không đổi framework, không refactor cấu trúc thư mục. Mỗi dependency mới phải nêu lý do trong `PROGRESS.md`.
9. Không chắc thì **đọc code trước, không đoán**. Mô tả cũ trong ghi chú (ví dụ "đã xong 75–80%", "lỗi nằm ở dòng X") chỉ là giả thuyết cần kiểm chứng.
10. Kẹt quá 3 lần thử với cùng một lỗi → dừng, ghi vào `docs/agent/PROGRESS.md`, hỏi chủ dự án.
11. Đến **CỔNG DỪNG** (Gate) thì dừng hẳn và chờ chủ dự án gõ đúng cụm `GO PHASE N`.

---

## 3. Hệ thống đường lui (backup và rollback)

### 3.1 Code (Git)
- Trước khi làm gì: tag `backup/baseline-YYYYMMDD` trên commit hiện tại và `git bundle create ../h2milktea-baseline.bundle --all`; nén thêm bản zip mã nguồn ra ngoài repo.
- Mỗi Phase xong: tag `exp/phase-N-done`. Mỗi task: 1 commit nhỏ (Conventional Commits). Không gộp migration với thay đổi logic lớn trong cùng commit.
- Quay lui code: `git switch main` (bản cũ không hề bị động), hoặc trên nhánh thí nghiệm dùng `git revert` / `git reset --hard <tag phase>`.

### 3.2 Database
Viết bằng **Node (`scripts/*.mjs`)** để chạy được trên Windows/macOS/Linux (gọi `supabase` CLI hoặc `pg_dump` qua `child_process`; báo rõ nếu thiếu công cụ):
- `scripts/check-env.mjs`: chặn chạy nếu trỏ production; gắn vào `predev`, `pretest` và mọi script DB.
- `scripts/db/backup.mjs <label>`: dump schema + dữ liệu STAGING vào `backups/db/<timestamp>-<label>/`, kèm checksum và file đếm số bản ghi từng bảng. `backups/` nằm trong `.gitignore`.
- `scripts/db/restore.mjs <thư-mục-backup>`: **chỉ chạy với STAGING**, bắt người dùng gõ lại tên project để xác nhận.
- `scripts/db/verify-backup.mjs`: so checksum và số bản ghi sau khi restore.
- Mỗi migration: `supabase/migrations/<ts>_<tên>.sql` đi kèm `supabase/rollbacks/<ts>_<tên>.down.sql`. Chạy `backup.mjs` trước mỗi lần áp migration lên STAGING.
- **Bắt buộc diễn tập**: backup STAGING → áp một migration thử → chạy file `down` → restore từ backup → `verify-backup` khớp. Ghi kết quả vào `docs/agent/ROLLBACK.md`.

### 3.3 Cờ tính năng và triển khai
- Tính năng mới đặt sau cờ (`FEATURE_AI_V2`, `FEATURE_QR_TOKEN`, `FEATURE_SMART_SYNC`, ...), mặc định **tắt** ở production.
- Không promote bản thí nghiệm lên production. Vercel chỉ dùng preview deployment trỏ STAGING.

### 3.4 `docs/agent/ROLLBACK.md` (agent soạn, chủ dự án duyệt)
Các kịch bản có lệnh cụ thể: (A) chỉ quay lại code, (B) chỉ quay lại DB, (C) quay lại cả hai, (D) khôi phục khẩn cấp production từ bản dump thủ công, (E) tắt tính năng bằng cờ. Có bảng "thứ tự quay lui" (vì schema chỉ thêm nên thường quay code trước, DB sau hoặc không cần).

### 3.5 Kế hoạch đưa vào production (chỉ viết, không thực thi)
Mỗi phần đưa lên là một PR nhỏ riêng: backup production → áp migration ngoài giờ bán → deploy với cờ tắt → smoke test (checklist trong ROLLBACK.md) → bật cờ → theo dõi → sẵn sàng rollback.

---

## 4. Quy trình cho mỗi task

1. Đọc code liên quan, viết kế hoạch 5–10 dòng vào `docs/agent/PROGRESS.md`.
2. Viết test trước (phải đỏ) → code → test xanh → `lint` + `typecheck` + `build`.
3. Commit nhỏ.
4. Cập nhật `PROGRESS.md`: task, file đổi, test, bằng chứng, rủi ro, **cách rollback**.
5. Có quyết định kỹ thuật → ghi 3–4 dòng vào `docs/agent/DECISIONS.md` (bối cảnh, lựa chọn, vì sao, đánh đổi). Đây là nguyên liệu cho báo cáo đồ án.

**Definition of Done**: test mới pass, không thêm lỗi lint/type, có ghi chú rollback, tài liệu cập nhật, có ảnh chụp hoặc sơ đồ cho thay đổi giao diện/kiến trúc.

---

## 5. CÁC PHASE

### Phase 0 — Nền móng và hiện trạng (KHÔNG sửa logic nghiệp vụ)
- 0.1 `git status` sạch (nếu không → dừng). Ghi lại HEAD.
- 0.2 Tag baseline, bundle, zip, tạo nhánh `exp/thesis-perfect` và worktree.
- 0.3 Viết các script ở mục 3.2 và `.env.example`.
- 0.4 Diễn tập backup/restore trên STAGING (mục 3.2); ghi kết quả.
- 0.5 **Lệch nhánh**: bản zip hiện ở commit `760d2b23` (route AI cũ dùng OpenAI) trong khi `feature/ai-chatbot-mvp` (commit `4fc1eef`) có Gemini, `/settings/ai`, giọng nói. So sánh hai nhánh (`git diff --stat`, migration mới, biến môi trường mới), merge vào `exp/thesis-perfect` (không phải main), xử lý xung đột, giữ đúng thứ tự migration. Báo cáo những gì đã đổi.
- 0.6 Chạy `npm ci`, lint, typecheck, `npm test`, build. Ghi kết quả vào `docs/agent/00-baseline-report.md`, **không sửa để "cho xanh"**.
- 0.7 **Audit trung thực**: bảng "tính năng → file/dòng → trạng thái (chạy được / có test / chưa chắc / thiếu) → bằng chứng". Audit RLS từng bảng; liệt kê mọi API route và cơ chế xác thực/phân quyền; xác định chỗ nào trình duyệt ghi thẳng vào DB. Dựng risk register.
- 0.8 Tạo `docs/experiment/`: giao thức đo baseline (kịch bản 4–5 món có Size/Đường/Đá, người đo, cách bấm giờ, phiếu đồng ý, ẩn danh) và `baseline-template.csv` **để trống**.

**GATE 0**: nộp `00-baseline-report.md`, bảng audit, risk register. Chờ `GO PHASE 1`.

### Phase 1 — Ổn định POS lõi
- **Thanh toán / lỗi 500**: tái hiện bằng log trước khi sửa. Nếu nguyên nhân là RLS chặn ghi `HOADON`/`HOADONDETAIL` từ trình duyệt thì **không mở RLS cho anon/authenticated ghi trực tiếp**. Chuyển việc ghi hóa đơn lên server (API route kiểm tra đăng nhập + vai trò, hoặc RPC `pay_order`), gồm: tạo hóa đơn + chi tiết + đóng bàn + xóa draft trong **một transaction**, kèm `idempotency_key` và ràng buộc `UNIQUE`.
- **Chuyển bàn**: RPC `transfer_table_cart` (một transaction): kiểm quyền bên trong hàm, đặt `search_path`, `FOR UPDATE` theo thứ tự id cố định, chuyển/gộp giỏ sang bàn mới, xóa draft bàn cũ, cập nhật trạng thái cả hai bàn, tăng `version`; cấp `EXECUTE` hẹp. Phía client hủy debounce autosave trước khi gọi.
- **Autosave**: dùng `UPDATE ... WHERE version = :v`, **không upsert**, để autosave trễ không tạo lại giỏ ma ở bàn cũ.
- **Xóa giỏ / phím Esc**: hộp thoại xác nhận (modal), không xóa im lặng.
- Test: unit + integration cho từng RPC (kể cả chạy song song để thử race).

**GATE 1**: `phase-1-report.md` (đổi gì, migration + down, kết quả test, cách rollback, các bước demo). Chờ `GO PHASE 2`.

### Phase 2 — Đồng bộ đa thiết bị và đơn QR
- Giữ cơ chế `expectedVersion`/409 hiện có, **bổ sung chính sách xung đột**: merge theo `lineItemKey`; cùng dòng mà khác nội dung → hộp thoại cho thu ngân chọn. Không ghi đè bản nháp cục bộ một cách âm thầm.
- Đơn QR: vòng đời `awaiting_confirmation → accepted / rejected / expired / cancelled_by_customer`; hết hạn tự động; khách xem trạng thái và hủy trước khi quầy duyệt; chống trùng bằng UUID mỗi lần gửi + `UNIQUE`; **giữ nguyên việc server tự tính lại giá**.
- Chống spam QR: token ký (HMAC) theo bàn/phiên, rate limit theo IP + bàn, giới hạn số món/đơn, phiên hết hạn sau khi bàn thanh toán (sau cờ `FEATURE_QR_TOKEN`).
- Realtime + polling dự phòng: chỉ báo trạng thái kết nối (online / đang đồng bộ / xung đột); polling dừng khi tab ẩn, có backoff; **chặn thanh toán khi trạng thái chưa chắc chắn**.
- Test: Playwright 2 trình duyệt cùng mở một bàn; gửi đơn QR song song; mất mạng rồi nối lại.

**GATE 2**: báo cáo như Gate 1. Chờ `GO PHASE 3`.

### Phase 3 — AI an toàn (P0)
- Pipeline cố định: **từ điển alias/luật** (`ts`, `dcs`, `bx`, cấu hình được) → LLM chỉ xử lý phần mơ hồ → ép đầu ra theo schema (zod) → kiểm quyền (`DSNV` + `/settings/ai`) → validate server (`DMHH`, `DSBAN`, ngưỡng số lượng cấu hình được, mặc định 10) → **Preview → Xác nhận** → thực thi → ghi log.
- AI **không bao giờ** tự thanh toán, xóa bàn, đổi giá hay sửa cấu hình. Không nằm trên đường tới hạn của thanh toán; khi Gemini lỗi/hết quota thì POS vẫn chạy bình thường và hiện thông báo.
- Ghim phiên bản mô hình, `temperature` thấp, version hóa prompt, rate limit theo nhân viên, gửi dữ liệu tối thiểu cho mô hình.
- Bảng `ai_audit_logs` (thêm mới, có `down`): thời điểm, nhân viên, câu lệnh, hành động đã phân tích (jsonb), nguồn xử lý (rule/llm), trạng thái (previewed/confirmed/rejected/blocked) và lý do bị chặn, độ trễ, tên mô hình, phiên bản prompt. Ghi qua server; chỉ admin được đọc.
- Phân quyền: ma trận **vai trò × hành động × kết quả mong đợi**, test bằng cách **gọi thẳng API** (không qua khung chat). Test prompt injection (ghi chú món hoặc tên khách chứa câu lệnh), gọi vượt ngưỡng, món ngừng bán, yêu cầu tự thanh toán.
- Bộ đánh giá: `eval/ai/dev.jsonl` (~30 câu, dùng để chỉnh) và `eval/ai/test.jsonl` (≥ 50 câu, **đóng băng**, ghi hash trước khi chỉnh prompt). Chia nhóm: một món, nhiều món, alias, tùy chọn, mơ hồ, vượt quyền, tấn công prompt. Lệnh `npm run eval:ai` xuất bảng độ chính xác theo nhóm và ma trận nhầm lẫn (Markdown/CSV). Agent chỉ soạn **câu ứng viên** gắn `source: synthetic`; chủ dự án sẽ thay/bổ sung bằng câu thật từ quán (`source: shop`).

**GATE 3**: báo cáo như trên, kèm kết quả `eval:ai` trung thực (kể cả chỗ sai). Chờ `GO PHASE 4`.

### Phase 4 — Mở rộng (chỉ làm sau Gate 3)
- Tùy chọn Size/Đường/Đá/Topping với `lineItemKey`, hiển thị so sánh giỏ trước/sau khi Preview.
- Hỏi đáp `/user-guide` (`action: "qa"`), có nguồn trích dẫn từ tài liệu hướng dẫn.
- **Voice auto-submit, đồng bộ FAQ QR/POS: KHÔNG làm** trừ khi chủ dự án yêu cầu rõ ràng.

**GATE 4**: báo cáo. Chờ `GO PHASE 5`.

### Phase 5 — Hoàn thiện và tài liệu
- Audit RLS lần cuối (từng bảng, từng vai trò); kiểm tra endpoint nào thiếu xác thực/phân quyền; quét secret.
- Ghi log lỗi có `correlation id`; trạng thái loading/rỗng/lỗi trên các màn hình chính; kiểm tra responsive POS (tablet) và menu QR (mobile); Lighthouse; đo độ trễ AI (p50/p95).
- CI (GitHub Actions: lint, typecheck, test, build).
- Tài liệu: `README.md`, hướng dẫn cài đặt/deploy, ERD (Mermaid), danh sách API, `docs/traceability.md` (yêu cầu → use case → bảng/API → ca kiểm thử).
- Dữ liệu demo: script seed **chỉ chạy trên STAGING**, gắn nhãn rõ là dữ liệu mẫu.

---

## 6. Phạm vi

**Làm**: Phase 0–5 ở trên.
**Không làm**: `branch_id` / đa chi nhánh; voice auto-submit; đồng bộ FAQ; đổi tên bảng; đổi framework; thêm tính năng ngoài danh sách; sửa dữ liệu thật.

---

## 7. Báo cáo cuối: `docs/agent/FINAL-REVIEW.md`

Gồm: (1) bảng so sánh trước/sau (tính năng, test, độ phủ, rủi ro còn lại); (2) những gì **chưa** làm hoặc chưa chắc; (3) cách xem bản demo (preview URL hoặc chạy local trỏ STAGING); (4) cách quay lại từng tầng (code / DB / cả hai); (5) danh sách PR nhỏ đề xuất để đưa dần vào production, theo thứ tự rủi ro tăng dần.
