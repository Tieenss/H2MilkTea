# H2 MilkTea AI POS - Hồ sơ bàn giao cho agent

## 1. Mục đích

Tài liệu này dùng để bàn giao phần AI POS cho một agent khác. Agent phải đọc tài liệu này trước khi sửa code, sau đó đọc các file nguồn được liệt kê trong từng nhiệm vụ.

Phạm vi hiện tại là chatbot nổi trong màn hình POS, dùng Gemini để hiểu câu lệnh thêm/bớt món và chỉ cập nhật giỏ hàng sau khi nhân viên xác nhận.

## 2. Trạng thái repository

- Repository: `Tieenss/H2MilkTea`
- Nhánh chatbot: `feature/ai-chatbot-mvp`
- Commit gần nhất của phần sửa runtime: `4fc1eef`
- Build local gần nhất: `npm run build` thành công
- Test local gần nhất: `npm test`, 2 test files và 7 tests pass
- Không được tự ý sửa hoặc reset các thay đổi không liên quan trong worktree.

## 3. Tính năng đã có

### 3.1 Chatbot POS

- Component: [`src/app/(dashboard)/pos/components/POSAssistant.tsx`](../src/app/(dashboard)/pos/components/POSAssistant.tsx)
- Hiển thị dạng popup nổi ở góc phải màn hình POS.
- Lưu tối đa 20 tin nhắn gần nhất vào `localStorage`.
- Tách lịch sử theo tên bàn:
  `h2-pos-ai-chat:<selectedTableName>`
- Gửi cho API:
  - câu người dùng;
  - tối đa 10 lượt history;
  - tên bàn hiện tại;
  - cart hiện tại.
- Hỗ trợ action:
  - `add`: thêm món;
  - `remove`: bớt món;
  - `none`: hỏi lại hoặc không nhận diện được.
- Không tự ghi vào cart sau khi AI trả lời. Người dùng phải bấm **Xác nhận**.
- Có nhập giọng nói bằng Web Speech API, locale `vi-VN`.
- Có trả lời local cho câu chào để không gọi Gemini không cần thiết.
- Client timeout: 30 giây.

### 3.2 API Gemini

- File: [`src/app/api/ai/chat/route.ts`](../src/app/api/ai/chat/route.ts)
- Endpoint: `POST /api/ai/chat`
- Yêu cầu cookie phiên đăng nhập nhân viên.
- Đọc catalog món đang hoạt động từ bảng `DMHH`.
- Nếu không có dữ liệu live thì fallback về [`src/data/DMHH.json`](../src/data/DMHH.json).
- Chỉ cho phép product ID có trong catalog.
- Timeout gọi Gemini: 25 giây.
- Gemini phải trả JSON có dạng:

```json
{
  "action": "add",
  "items": [
    {
      "productId": "SP001",
      "productName": "Trà sữa khoai môn",
      "quantity": 5,
      "note": "ít đá"
    }
  ],
  "message": "Đã nhận diện món. Vui lòng xác nhận."
}
```

### 3.3 Bật/tắt toàn hệ thống

- Migration: [`supabase/migrations/202610150003_ai_settings.sql`](../supabase/migrations/202610150003_ai_settings.sql)
- API: [`src/app/api/ai/settings/route.ts`](../src/app/api/ai/settings/route.ts)
- Trang Admin: [`src/app/(dashboard)/settings/ai/page.tsx`](../src/app/(dashboard)/settings/ai/page.tsx)
- Menu/sidebar: [`src/lib/navigation.ts`](../src/lib/navigation.ts)
- Middleware route: [`src/middleware.ts`](../src/middleware.ts)

Setting dùng key:

```text
ai_assistant_enabled
```

Giá trị mặc định là `true`.

GET setting yêu cầu nhân viên đăng nhập. PUT chỉ chấp nhận nhân viên có `"Phân quyền" = "Admin"` trong bảng `DSNV`.

## 4. Cài đặt Supabase bắt buộc

Mở Supabase Dashboard của project đang dùng bởi Vercel, vào **SQL Editor**, chạy toàn bộ file:

[`supabase/migrations/202610150003_ai_settings.sql`](../supabase/migrations/202610150003_ai_settings.sql)

Migration tạo:

```sql
public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
)
```

Migration bật RLS và tạo policy authenticated read. API dùng service-role client nên thao tác server-side không phụ thuộc policy này.

Sau khi chạy, kiểm tra:

```sql
select key, value, updated_by, updated_at
from public.app_settings
where key = 'ai_assistant_enabled';
```

Kết quả ban đầu phải có `value = true`.

## 5. Biến môi trường

Vercel cần có các biến phù hợp với từng environment:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
GEMINI_API_KEY=<gemini-api-key>
GEMINI_MODEL=<model-dang-duoc-ho-tro>
```

Lưu ý:

- Không đặt `GEMINI_API_KEY` thành `NEXT_PUBLIC_GEMINI_API_KEY`.
- Không đưa service-role key vào client.
- Nếu `GEMINI_MODEL` không có, code dùng fallback hiện tại trong route; agent phải kiểm tra model còn được Gemini account hỗ trợ trước khi đổi.
- Nếu `.env.local` từng bị chia sẻ công khai, cần rotate/revoke các key tương ứng.

## 6. Luồng kiểm thử thủ công tối thiểu

1. Đăng nhập bằng nhân viên hợp lệ.
2. Mở `/settings/ai` bằng Admin.
3. Tắt chatbot:
   - API PUT trả `success: true`;
   - popup AI biến mất ở POS;
   - API chat trả HTTP 403.
4. Bật lại chatbot.
5. Mở POS, chọn bàn và mở popup.
6. Nhập câu chào; câu trả lời phải nhanh và không cần Gemini.
7. Nhập: `thêm 5 trà sữa khoai môn`.
8. Kiểm tra preview đúng món/số lượng và cart chưa đổi.
9. Bấm **Xác nhận**; cart tăng đúng 5.
10. Nhập: `bỏ 2 ly đi`.
11. Kiểm tra preview remove đúng 2 và bấm xác nhận.
12. Mở lại cùng bàn; history được giữ trong localStorage.
13. Kiểm tra microphone trên Chrome/Edge; nếu browser không hỗ trợ phải có thông báo rõ ràng.

## 7. Phạm vi hỗ trợ và giới hạn hiện tại

Đang triển khai trong Giai đoạn 1 (P0):
- Chuẩn hóa nhận diện món & Alias tiếng Việt.
- Nhận diện bàn và tự động chuyển/mở bàn trên POS theo câu lệnh.
- Đọc Hướng dẫn sử dụng (`/user-guide`) để giải đáp nghiệp vụ, phím tắt, cách thêm món.
- Setting giọng nói tự động gửi sau khi dứt câu (Auto-submit on speech silence).
- Giới hạn an toàn (tối đa 10 ly/lệnh).

Chưa hỗ trợ (nằm ở P1 & P2):
- Thanh toán và in hóa đơn tự động bằng AI.
- Mã giảm giá.
- Truy vấn tồn kho và báo cáo doanh thu.
- Tùy chỉnh size/đường/đá/topping theo cấu trúc option (P1).
- Tự động xác nhận hành động nguy hiểm mà không qua nhân viên.

## 8. Các vấn đề nền POS cần nhớ

Các vấn đề này đã được ghi trong [`docs/pos-fix-notes.md`](./pos-fix-notes.md), chưa giải quyết trong MVP AI:

- chuyển bàn còn có thể để lại cart/tổng tiền ở bàn cũ;
- xóa toàn bộ cart cần xác nhận và đồng bộ đa thiết bị;
- trạng thái bàn/cart giữa nhiều thiết bị;
- đồng bộ khách hàng của bàn;
- thanh toán HTTP 500;
- đơn QR chưa chắc đã tới POS.

Không trộn các sửa đổi lớn này vào một task chatbot nhỏ nếu không có yêu cầu rõ ràng.

## 9. Lệnh xác minh

```powershell
npm test
npm run build
git status --short
```

Build hiện đang bỏ qua kiểm tra TypeScript và lint trong [`next.config.ts`](../next.config.ts). Vì vậy build pass chưa đủ để kết luận không có lỗi runtime; phải kiểm tra các route/component mới trên browser.

