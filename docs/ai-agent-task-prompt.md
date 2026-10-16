# Prompt giao việc cho agent khác

Sao chép phần dưới đây vào một chat/agent mới khi giao việc phần AI POS.

---

Bạn đang làm việc trong repository `Tieenss/H2MilkTea`.

## Bắt buộc đọc trước khi sửa

1. `docs/ai-agent-handoff.md`
2. `docs/ai-development-roadmap.md`
3. `docs/pos-fix-notes.md`
4. Các file nguồn được liệt kê trong task cụ thể.

## Bối cảnh hiện tại

Nhánh chatbot là `feature/ai-chatbot-mvp`. Chatbot POS dùng Gemini, hiển thị popup nổi, lưu lịch sử localStorage theo bàn, phân tích `add/remove/none`, và chỉ cập nhật cart sau khi nhân viên xác nhận.

Các file chính:

- `src/app/(dashboard)/pos/components/POSAssistant.tsx`
- `src/app/api/ai/chat/route.ts`
- `src/app/api/ai/settings/route.ts`
- `src/app/(dashboard)/settings/ai/page.tsx`
- `supabase/migrations/202610150003_ai_settings.sql`

## Quy tắc thực hiện

- Trước khi sửa, đọc đủ context của file liên quan.
- Không reset hoặc ghi đè thay đổi của người khác.
- Không sửa các lỗi POS ngoài phạm vi task.
- Không đưa secret vào client hoặc commit `.env.local`.
- Không cho AI tự ghi dữ liệu nếu chưa có preview và xác nhận.
- Dùng validation server-side, không tin dữ liệu từ Gemini.
- Nếu cần đổi schema Supabase, tạo migration idempotent và ghi rõ cách chạy.
- Nếu gặp lựa chọn kiến trúc ảnh hưởng lớn, dừng và hỏi người dùng thay vì tự đoán.
- Giữ thay đổi nhỏ, có test.

## Quy trình bắt buộc

1. Kiểm tra branch và worktree:

```powershell
git branch --show-current
git status --short
```

2. Đọc file liên quan.
3. Nêu ngắn gọn nguyên nhân và cách sửa trong phản hồi nội bộ.
4. Sửa code tối thiểu nhưng đầy đủ.
5. Chạy:

```powershell
npm test
npm run build
```

6. Kiểm tra `git diff`.
7. Báo cáo:
   - file đã sửa;
   - hành vi thay đổi;
   - test/build;
   - migration hoặc biến môi trường cần cập nhật;
   - rủi ro còn lại.

## Contract chatbot hiện tại

`POST /api/ai/chat` nhận:

```json
{
  "message": "thêm 5 trà sữa khoai môn",
  "history": [],
  "table": "Bàn 3",
  "cart": []
}
```

Trả:

```json
{
  "success": true,
  "action": "add",
  "items": [
    {
      "productId": "string",
      "productName": "string",
      "quantity": 5
    }
  ],
  "message": "string"
}
```

Nếu chatbot bị Admin tắt, trả HTTP 403. Nếu chưa đăng nhập, trả HTTP 401. Nếu thiếu Gemini key, trả HTTP 503.

## Task giao cho agent

Thay phần này bằng một task cụ thể, ví dụ:

> Giai đoạn 1: cải thiện nhận diện tên món. Thêm normalize alias tiếng Việt, không thay đổi UI, thêm unit tests cho ít nhất 10 câu lệnh và đảm bảo product ID luôn được kiểm tra từ catalog server-side.

## Tiêu chí hoàn thành

- Không có lỗi TypeScript/runtime mới.
- Test liên quan pass.
- Build pass.
- Có ghi rõ giới hạn chưa xử lý.
- Không báo “đã hoàn tất” nếu chưa kiểm tra migration hoặc environment cần thiết.

