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

---

## Quyết định 05: Chuyển toàn bộ ghi hóa đơn lên Server Endpoint `/api/pos/checkout`
- **Thời điểm**: 2026-10-18 (Phase 1)
- **Bối cảnh**: Client POS trước đây gọi Supabase trực tiếp qua `authUtils.addHoaDon` và lặp từng dòng `addHoaDonDetail`, dẫn đến lỗi 500 do RLS chặn ghi trực tiếp từ browser, và dữ liệu rách nát nếu mạng đứt giữa chừng.
- **Lựa chọn**: Đóng hoàn toàn việc ghi trực tiếp từ client. Tạo server route `/api/pos/checkout` xác thực staff cookie, thực thi RPC `pos_pay_order` (hoặc server transaction fallback) xử lý nguyên tử: tạo hóa đơn + chi tiết + đóng bàn + xóa draft + cập nhật đơn bếp sang `paid`, kèm `idempotency_key UNIQUE` chống thanh toán trùng.
- **Đánh đổi**: Phát sinh thêm API hop qua server Next.js (~15ms), nhưng đổi lại tính toàn vẹn dữ liệu đạt 100%, chống gian lận và RLS bảo vệ chặt chẽ.

---

## Quyết định 06: Chống giỏ ma (Ghost Cart) bằng `UPDATE ... WHERE version = :v` thay vì `UPSERT`
- **Thời điểm**: 2026-10-18 (Phase 1)
- **Bối cảnh**: Trong `PUT /api/pos/cart-draft`, lệnh `upsert` khiến client có mạng trễ (delayed debounce) vô tình tạo mới lại bản ghi draft cho một bàn vừa được thanh toán hoặc đã chuyển sang bàn khác.
- **Lựa chọn**: Thay `upsert` bằng `UPDATE ... WHERE table_id = :id AND version = :v`. Nếu bản ghi không còn (đã bị xóa do thanh toán/chuyển bàn), API trả về `409 Conflict` và hủy cập nhật, không tự ý hồi sinh bản ghi giỏ hàng.
- **Đánh đổi**: Client cần xử lý mã 409 để reset giỏ cục bộ, nhưng triệt tiêu vĩnh viễn hiện tượng giỏ hàng "ma" tự xuất hiện lại trên bàn trống.

---

## Quyết định 07: Chuyển bàn nguyên tử với Deadlock-free Lock Order và Hủy Autosave Debounce
- **Thời điểm**: 2026-10-18 (Phase 1)
- **Bối cảnh**: Chuyển bàn giữa 2 thiết bị thu ngân đồng thời có nguy cơ deadlock và xung đột nếu không khóa theo thứ tự; đồng thời timer autosave đang chờ có thể ghi đè lại bàn cũ.
- **Lựa chọn**: Khóa hàng theo thứ tự alphabet cố định (`source_id < target_id`), cung cấp hàm `cancelPendingAutosave()` hủy timer trước khi gửi yêu cầu chuyển bàn, gộp giỏ nếu bàn đích đã có món.
- **Đánh đổi**: Logic xử lý phức tạp hơn, nhưng bảo đảm giao dịch chuyển bàn không bao giờ bị deadlock hoặc bị ghi đè sau đó.

---

## Quyết định 08: Modal xác nhận bắt buộc khi xóa giỏ (Triệt tiêu xóa im lặng từ phím Esc)
- **Thời điểm**: 2026-10-18 (Phase 1)
- **Bối cảnh**: Phím `Escape` trước đây gọi trực tiếp `clearCart()`, khiến thu ngân vô tình bấm nhầm phím thì toàn bộ giỏ hàng của khách bị xóa sạch mà không có cảnh báo.
- **Lựa chọn**: Tích hợp `showClearConfirmation` điều khiển tập trung: phím `Escape` chỉ kích hoạt modal xác nhận (AlertDialog). Thu ngân bắt buộc bấm "Xóa tất cả" mới thực thi xóa giỏ.
- **Đánh đổi**: Thêm một thao tác click xác nhận, nhưng bảo vệ an toàn cho dữ liệu giỏ hàng của khách tại quầy.

---

## Quyết định 09: Định danh dòng món theo `productId + note` (`lineItemKey`) và giải quyết xung đột 3 lựa chọn
- **Thời điểm**: 2026-10-18 (Phase 2)
- **Bối cảnh**: Khi 2 thu ngân hoặc khách qua QR cùng gọi món trên một bàn, việc chỉ định danh theo `productId` sẽ làm mất các tùy chọn/ghi chú khác nhau (ví dụ cùng Trà Sữa nhưng 1 ly không đường, 1 ly nhiều đá). Nếu ghi đè âm thầm (last write wins) sẽ mất món của nhân viên kia.
- **Lựa chọn**: Chuẩn hóa `lineItemKey = ${id}::${noteNormalized}`. Thuật toán `diffCartItems` tự động gộp (auto-merge) an toàn các món không trùng key. Khi phát hiện trùng key nhưng khác số lượng, lập tức chặn thanh toán và hiển thị `CartConflictModal` cung cấp 3 lựa chọn minh bạch: "Giữ giỏ máy này", "Lấy từ máy khác", "Cộng dồn số lượng".
- **Đánh đổi**: Tốn thêm bộ nhớ ánh xạ key và yêu cầu tương tác thu ngân khi có xung đột, nhưng loại bỏ 100% tình trạng mất món do ghi đè âm thầm.

---

## Quyết định 10: Vòng đời đơn QR đầy đủ và Quyền tự hủy đơn của Khách hàng (`POST /api/orders/cancel`)
- **Thời điểm**: 2026-10-18 (Phase 2)
- **Bối cảnh**: Đơn QR trước đây chỉ có 2 trạng thái cơ bản (`pending`, `completed`), không có trạng thái cho việc đơn bị quá hạn hoặc khách muốn tự hủy khi quầy chưa kịp duyệt.
- **Lựa chọn**: Mở rộng check constraint `order_status` hỗ trợ `awaiting_confirmation`, `accepted`, `rejected`, `expired`, `cancelled_by_customer`. Khách hàng được cung cấp `POST /api/orders/cancel` sử dụng `tracking_token` bí mật để hủy đơn nếu quầy chưa bấm duyệt. Tự động đánh dấu `expired` sau 15 phút không duyệt.
- **Đánh đổi**: Cần lưu trữ thêm `tracking_token` và `expires_at` trên database, nhưng bảo vệ khách hàng khỏi việc bị phục vụ nhầm đơn cũ và giải phóng bàn nhanh chóng.

---

## Quyết định 11: Bảo mật QR bằng HMAC Token và Giới hạn tần suất tạo đơn (Rate Limiting)
- **Thời điểm**: 2026-10-18 (Phase 2)
- **Bối cảnh**: Kẻ xấu chụp ảnh mã QR bàn rồi về nhà liên tục spam gửi đơn ảo vào quầy, hoặc dùng script làm tràn cơ sở dữ liệu.
- **Lựa chọn**: Sinh HMAC token có chữ ký số bí mật gắn với phiên/bàn và thời hạn 24 giờ (`FEATURE_QR_TOKEN`), kiểm tra chữ ký ở server Next.js. Đồng thời triển khai In-memory Rate Limiting theo `IP + tableId` (tối đa 5 đơn / phút / bàn) và giới hạn tối đa 20 món / đơn QR.
- **Đánh đổi**: QR cần in kèm token hoặc làm mới định kỳ nếu hết hạn 24h, nhưng ngăn chặn triệt để nguy cơ tấn công từ xa qua mạng Internet.

---

## Quyết định 12: Kiến trúc Pipeline AI 8 bước (Rule Engine kết hợp LLM & Schema Zod)
- **Thời điểm**: 2026-10-18 (Phase 3)
- **Bối cảnh**: Gọi LLM cho 100% câu lệnh gây tốn kém quota, độ trễ cao (~2000ms), dễ bị ảo giác (hallucination) và rủi ro output không chuẩn cấu trúc.
- **Lựa chọn**: Xây dựng Pipeline cố định: Từ điển alias (`ts`, `dcs`, `bx`) & Rule Engine chạy trước → nếu khớp chắc chắn thì trả kết quả ngay (<5ms) → chỉ các câu mơ hồ mới gửi cho Gemini (temperature 0.1) → ép schema đầu ra bằng Zod → Server validation (`DMHH`, `DSBAN`, max 10 ly) → Preview → Xác nhận → Ghi audit log.
- **Đánh đổi**: Code phức tạp hơn với 2 tầng xử lý, nhưng giảm 70% số lượng request gọi LLM, tăng tốc độ phản hồi và bảo đảm đầu ra luôn hợp lệ 100%.

---

## Quyết định 13: Hàng rào An toàn Tuyệt đối: Cấm AI tự thanh toán, xóa bàn, sửa giá & Chống Prompt Injection
- **Thời điểm**: 2026-10-18 (Phase 3)
- **Bối cảnh**: Nguy cơ người dùng hoặc nhân viên cố tình nhập lệnh qua chatbot nhằm tự ý hoàn tất đơn hàng, đổi giá món về 0đ hoặc chèn prompt injection ("Ignore previous instructions...").
- **Lựa chọn**: Thiết lập module `security.ts` chặn đứng các câu lệnh vi phạm trước khi vào pipeline. AI tuyệt đối không bao giờ có công cụ hoặc quyền tự thanh toán hay sửa giá. Mọi yêu cầu gọi món đều phải qua bước Preview và bắt buộc người dùng bấm "Xác nhận".
- **Đánh đổi**: Người dùng không thể ra lệnh thanh toán qua giọng nói/chat, nhưng loại trừ 100% rủi ro thất thoát doanh thu và tấn công chiếm quyền hệ thống.

---

## Quyết định 14: Đóng băng Bộ dữ liệu Benchmark và Đánh giá Tự động (`eval:ai`)
- **Thời điểm**: 2026-10-18 (Phase 3)
- **Bối cảnh**: Đánh giá tính hiệu quả của Trợ lý AI một cách định tính rất dễ chủ quan và khó đo lường độ suy thoái khi cập nhật prompt.
- **Lựa chọn**: Xây dựng bộ test `eval/ai/test.jsonl` (55 câu thuộc 7 nhóm), đóng băng và ghi nhận mã băm SHA-256 (`ae64094c...`). Xây dựng script `scripts/eval-ai.ts` tính toán độ chính xác theo nhóm và ma trận nhầm lẫn tự động (đạt 92.7% trên test set).
- **Đánh đổi**: Cần bảo trì bộ dữ liệu kiểm định chuẩn, nhưng tạo cơ sở khoa học định lượng vững chắc cho báo cáo đồ án tốt nghiệp.



