# Roadmap phát triển AI POS H2 MilkTea

## Nguyên tắc cốt lõi

1. **Safety First**: Không cho AI tự thay đổi dữ liệu (cart, bàn, tiền) nếu chưa có bước Xem trước (Preview) và Xác nhận (Confirm) từ nhân viên.
2. **Context-Aware Permissions**: Chatbot tự động kiểm tra quyền hạn của tài khoản đăng nhập hiện tại từ bảng `DSNV`. Nếu tài khoản không có quyền đối với thao tác yêu cầu (hoặc chức năng không tồn tại), AI từ chối rõ ràng và giải thích nguyên nhân.
3. **Server-Side Validation**: AI chỉ là bộ phân tích ngôn ngữ (NLP/NLU). Mọi `productId`, `tableId` và số lượng đều phải được validate chặt chẽ trên server từ catalog `DMHH` và danh sách `DSBAN`.
4. **Không lộ bí mật**: API keys và service-role secrets chỉ nằm trên server, không truyền xuống browser.
5. **Tiến độ minh bạch**: Mỗi giai đoạn đều có tiêu chí nghiệm thu và bộ unit test tự động đi kèm.

---

## 🎯 Phân loại mức độ ưu tiên (Priority Matrix)

| Mức độ | Mục tiêu chính | Trọng tâm tính năng |
| :--- | :--- | :--- |
| **P0 (Làm ngay)** | Nền tảng gọi món thông minh & Hỏi đáp nghiệp vụ | Chuẩn hóa món tiếng Việt + Nhận diện & Mở bàn + Tra cứu Hướng dẫn sử dụng + Setting Auto-submit giọng nói + Giới hạn an toàn |
| **P1 (Kế tiếp)** | Trải nghiệm nâng cao & Đa kênh | Quản lý FAQ tùy biến (hỗ trợ cả QR bàn khách) + Cart safety nâng cao + Size/Đường/Đá/Topping + AI Audit Log |
| **P2 (Tương lai)** | Bán hàng thông minh & Mở rộng hệ thống | Sổ tay công thức/Ghi chú nội bộ cho AI đọc + Gợi ý bán thêm (Upsell) + Bảng tin nội bộ trong ngày |

---

## Giai đoạn 0: Ổn định nền tảng & Hạ tầng AI (Đã hoàn thành)
- [x] Popup trợ lý AI nổi trên giao diện POS, lưu lịch sử theo bàn vào `localStorage`.
- [x] API chat server-side tích hợp Google Gemini với cơ chế **Multi-Model Auto Fallback** (`gemini-2.5-flash` ➔ `gemini-flash-latest` ➔ `gemini-3.7-flash`...).
- [x] Trang Admin `/settings/ai` bật/tắt toàn hệ thống (`ai_assistant_enabled`).
- [x] Nhập liệu giọng nói tiếng Việt bằng Web Speech API.
- [x] Bộ lọc câu chào phản hồi tức thì 0ms không tốn quota API.

---

## Giai đoạn 1 (P0): Chuẩn hóa nhận diện Món & Bàn + Hỏi đáp Hướng dẫn sử dụng

### 1.1. Chuẩn hóa nhận diện Món & Alias tiếng Việt (`src/lib/ai/catalog.ts`)
- [ ] Bổ sung từ điển Alias & Viết tắt thông dụng:
  - `ts` ➔ *Trà sữa*
  - `cf`, `cafe` ➔ *Cà phê*
  - `dcs` ➔ *Trà đào cam sả*
  - `bx` ➔ *Bạc xỉu*
  - `tt` / `truyền thống` ➔ *Trà sữa truyền thống*
  - `nướng` ➔ *Trà sữa nướng*
- [ ] Chuẩn hóa tìm kiếm tiếng Việt không dấu (`tra dao cam sa` ➔ `Trà đào cam sả`).
- [ ] Server-side Matching: Map chính xác về `IDSP` đang hoạt động trong `DMHH`. Nếu món không có, AI giải thích rõ và gợi ý món tương tự.

### 1.2. Nhận diện & Thao tác Bàn tự động (`src/lib/ai/table.ts`)
- [ ] Nhận diện câu lệnh có chỉ định bàn:
  - `bàn 3`, `bàn 03`, `bàn số 3`, `b3`, `table 3` ➔ Khớp chính xác `IDBAN` ("BAN001") và `Tên bàn` ("Bàn 03").
  - `mang về`, `mua mang về`, `khách mua về` ➔ Khớp với bàn `Khách mua về`.
- [ ] Tự động chuyển/mở bàn trên POS:
  - Khi nhân viên xác nhận câu lệnh *"cho 3 trà sữa vào bàn 3"*, POS tự động chuyển sang Bàn 3 và thêm món vào giỏ hàng của Bàn 3.
  - Lệnh điều hướng thuần túy: *"chuyển sang bàn 2"* hoặc *"mở bàn 4"* chỉ chuyển bàn mà không thêm món thừa.
- [ ] Thông báo nếu số bàn không tồn tại trong quán.

### 1.3. Đọc Hướng dẫn sử dụng & Hỏi đáp nghiệp vụ (Knowledge Base Q&A)
- [ ] Tích hợp nguồn tri thức từ `/user-guide`:
  - Cách thêm món mới, sửa giá, phân loại sản phẩm.
  - Phím tắt bán hàng: F1 (Reset), F3 (Khách hàng), F4 (Thanh toán), F5 (Đồng bộ), Esc (Xóa giỏ).
  - Hướng dẫn cài đặt máy in, khổ giấy, mẫu in bếp.
  - Xử lý các lỗi thường gặp: Mất kết nối, xung đột giỏ hàng.
- [ ] Phân loại intent câu lệnh:
  - Nếu là **lệnh order/chuyển bàn**: Trả về `action: "add" | "remove" | "select_table"` kèm items để nhân viên bấm xác nhận.
  - Nếu là **câu hỏi nghiệp vụ**: Trả về `action: "qa"`, giải thích từng bước rõ ràng bằng tiếng Việt, không hiện nút xác nhận thêm món.

### 1.4. Phân quyền Context-Aware & Giới hạn an toàn (Safety Guardrails)
- [ ] Chatbot tự động đọc quyền từ phiên đăng nhập nhân viên (`DSNV`). Nếu nhân viên yêu cầu thao tác vượt quyền (như xem doanh thu, cấu hình hệ thống), chatbot từ chối: *"Tài khoản của bạn không có quyền thực hiện thao tác này."*
- [ ] Cài đặt giới hạn số lượng món tối đa cho mỗi lệnh AI (mặc định tối đa 10 ly/lệnh để phòng ngừa gọi nhầm hoặc spam).

### 1.5. Cấu hình Giọng nói thông minh (Voice Settings)
- [ ] Bổ sung cài đặt trong `/settings/ai`:
  - **Tự động gửi sau khi dứt câu (Auto-submit on Speech Silence)**: Bật/Tắt.
  - **Thời gian chờ dứt câu**: Tùy chỉnh từ 1.0s đến 3.0s (mặc định 1.5s).

### Tiêu chí nghiệm thu Giai đoạn 1:
- Thử thành công câu lệnh: *"cho 3 trà sữa nướng vào bàn 3"* ➔ POS mở Bàn 3 và đưa 3 ly vào preview.
- Thử hỏi: *"Làm sao để thêm món mới vào menu?"* ➔ Chatbot hướng dẫn chi tiết các bước.
- Bộ Unit Test tối thiểu 15 kịch bản thực tế pass 100%.

---

## Giai đoạn 2 (P1): Nâng cấp Trải nghiệm Bán hàng & Quản lý

### 2.1. Quản lý FAQ tùy biến (Áp dụng cả POS và Khách quét QR bàn)
- [x] Trang quản lý danh sách Câu hỏi - Trả lời nhanh trong Admin (`/settings/ai`):
  - Mật khẩu Wifi, giờ mở cửa, chính sách gửi xe, thanh toán, ưu đãi tích điểm.
  - Thêm, sửa, xóa, tìm kiếm, bật/tắt và bảo vệ phân quyền Admin.
- [x] Tái sử dụng nguồn FAQ này cho tính năng **Khách hàng quét mã QR tại bàn** (`/order`): Modal xem tiện ích quán và nút chép nhanh pass Wifi.
- [x] Chatbot POS tự động học và trả lời chính xác các câu hỏi này.

### 2.2. Cart Action an toàn nâng cao
- [ ] Ngăn chặn bớt món vượt quá số lượng đang có trong giỏ hàng.
- [ ] Nếu giỏ có nhiều món trà sữa khác nhau mà người dùng bảo *"bỏ 1 ly trà sữa"*, chatbot hỏi lại cụ thể ly nào.
- [ ] Hiển thị preview so sánh rõ ràng: Giỏ hàng hiện tại ➔ Giỏ hàng sau khi thay đổi.

### 2.3. Hỗ trợ Size, Đường, Đá và Topping (Item Options)
- [ ] Nhận diện câu lệnh phức tạp: *"2 trà sữa size L 50% đường ít đá, thêm trân châu đen"*.
- [ ] Lưu trữ và hiển thị chi tiết options trong giỏ hàng và đơn bếp.

### 2.4. Nhật ký lệnh AI (AI Audit Log)
- [ ] Bảng lưu trữ lịch sử câu lệnh AI trong Supabase: Thời gian, nhân viên, câu lệnh, kết quả phân tích, trạng thái xác nhận hay hủy.
- [ ] Báo cáo thống kê: Tỉ lệ hiểu lệnh thành công, danh sách các câu lệnh AI chưa nhận diện được để tiếp tục tinh chỉnh.

---

## Giai đoạn 3 (P2): Bán hàng thông minh & Mở rộng tính năng tương lai

### 3.1. Sổ tay Công thức & Ghi chú nội bộ (App Notes & Recipes)
- [ ] Module ghi chú nội bộ trong app: Quản lý/pha chế có thể ghi lại công thức pha chế, bí quyết và lưu ý nguyên liệu.
- [ ] Chatbot được cấp quyền đọc sổ tay này: Khi nhân viên hoặc khách hỏi về công thức, thành phần hoặc dị ứng (lactose, đậu phộng...), chatbot tra cứu và giải đáp ngay.

### 3.2. Bảng tin nội bộ trong ngày (Daily Store Notice for AI)
- [ ] Ô nhập ghi chú nhanh mỗi ca làm việc của Quản lý:
  - *"Hôm nay hết trân châu trắng."*
  - *"Đang có chương trình mua 2 trà đào tặng 1 bánh quy."*
- [ ] AI tự động ghi nhớ thông báo này để cảnh báo thu ngân khi khách gọi món hết, hoặc nhắc ưu đãi trong ngày.

### 3.3. Gợi ý bán thêm thông minh (Auto Upsell / Cross-sell)
- [ ] Tự động nhắc nhân viên gợi ý món kèm theo:
  - Khách gọi trà sữa ➔ Gợi ý thêm topping trân châu hoặc bánh tráng/bánh ngọt.
  - Khách gọi cà phê ➔ Gợi ý bạc xỉu hoặc hướng dương.

---

## Quy chuẩn kỹ thuật & Bảo mật

1. Không lưu cache token hay key của AI vào git.
2. Mọi migration vào Supabase đều phải dùng cú pháp an toàn (`if exists`, `if not exists`, `on conflict`).
3. Khả năng chịu lỗi: Mọi lệnh gọi AI đều phải có timeout (25s) và cơ chế chuyển model tự động khi Google API quá tải.
