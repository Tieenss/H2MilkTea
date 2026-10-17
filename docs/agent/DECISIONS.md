# Nhật ký Quyết định Kỹ thuật (DECISIONS.md)

- **Mục đích**: Ghi lại bối cảnh, các phương án cân nhắc, lý do lựa chọn và đánh đổi kỹ thuật của từng quyết định trong quá trình phát triển (làm nguyên liệu cho báo cáo đồ án tốt nghiệp).

---

## Quyết định 01: Cô lập môi trường phát triển trên nhánh `exp/thesis-perfect`
- **Thời điểm**: 2026-10-18 (Phase 0)
- **Bối cảnh**: Quán đang có bản chạy ổn định trên `master`. Nhánh `feature/ai-chatbot-mvp` có nhiều tính năng AI mới nhưng bị phân kỳ (diverged) và có xung đột.
- **Lựa chọn**: Tạo nhánh `exp/thesis-perfect` từ `master`, hợp nhất có chọn lọc toàn bộ tính năng và test từ `feature/ai-chatbot-mvp`, bảo vệ `master` không bị commit đè.
- **Đánh đổi**: Tốn công giải quyết xung đột thủ công 4 file (`pos-fix-notes.md`, `pos/page.tsx`, `POSAssistant.tsx`, `chat/route.ts`), nhưng đổi lại có một nhánh tham chiếu hoàn hảo và an toàn tuyệt đối cho production.

---

## Quyết định 02: Thiết lập Safety Guardrails tự động qua `scripts/check-env.mjs`
- **Thời điểm**: 2026-10-18 (Phase 0)
- **Bối cảnh**: Nguy cơ vô tình chạy script dev/test làm thay đổi hoặc xóa dữ liệu trên database production.
- **Lựa chọn**: Viết script Node.js thuần kiểm tra project ref trước mọi thao tác DB và gắn vào `predev`, `pretest` của `package.json`. Nếu ref trùng với `FORBIDDEN_SUPABASE_REFS`, tiến trình lập tức bị ngắt.
- **Đánh đổi**: Thêm một bước kiểm tra nhỏ (~50ms) trước mỗi lần khởi chạy dev/test, nhưng loại trừ 100% rủi ro can thiệp nhầm vào production.

---

## Quyết định 03: Chuẩn hóa cặp Migration thuận và Rollback nghịch (`.down.sql`)
- **Thời điểm**: 2026-10-18 (Phase 0)
- **Bối cảnh**: Hệ thống cũ chỉ có migration tăng tiến (`.sql`), thiếu file hoàn tác khiến việc quay lui schema gặp khó khăn.
- **Lựa chọn**: Tạo thư mục `supabase/rollbacks/` với các file `.down.sql` tương ứng theo nguyên tắc *expand -> contract*.
- **Đánh đổi**: Tốn thêm thời gian bảo trì song song 2 file cho mỗi thay đổi DB, nhưng đảm bảo tính khôi phục và đường lui chắc chắn.

---

## Quyết định 04: Báo cáo trung thực hiện trạng kiểm thử (Không sửa code "cho xanh")
- **Thời điểm**: 2026-10-18 (Phase 0)
- **Bối cảnh**: `next.config.ts` bỏ qua lỗi lint và type khi build, che giấu 54 lỗi lint và 22 lỗi type còn tồn đọng trong các module cũ.
- **Lựa chọn**: Phản ánh chính xác kết quả thất bại của `npm run lint` và `tsc --noEmit` vào báo cáo `00-baseline-report.md`, giữ nguyên hiện trạng để có căn cứ cải tiến thực chất ở các phase sau.
- **Đánh đổi**: Báo cáo kiểm định ban đầu có các chỉ số đỏ/fail, nhưng đảm bảo tính trung thực học thuật và phản ánh đúng chất lượng kỹ thuật của sản phẩm.
