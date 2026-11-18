# 🔍 BÁO CÁO RÀ SOÁT ĐỐI CHIẾU CODE & KHUNG TỰ ĐIỀN (`[...]`) ĐỒ ÁN TỐT NGHIỆP H2MILKTEA

- **Tệp báo cáo gốc được rà soát**: [DoAnTotNghiep.TranVanTien.74dcht22275.docx](file:///d:/Documents/H2MilkTea/DoAnTotNghiep.TranVanTien.74dcht22275.docx) (751 đoạn văn, 78 bảng biểu, 133 trang)
- **Nguyên tắc**: Tài liệu này **không điền hộ sẵn toàn bộ lời giải** mà chỉ ra các lỗi lệch code, lỗi bất nhất số liệu, các vị trí còn trống trong file Word và cung cấp **Khung mẫu Điền vào chỗ trống (`[...]`) kèm chỉ dẫn file code cần mở** để bạn tự tra cứu, tự điền và làm chủ 100% kiến thức khi đứng trước Hội đồng bảo vệ.

---

## PHẦN 1: PHÁT HIỆN SAI SÓT, LỆCH CODE & THIẾU SÓT TRONG FILE WORD HIỆN TẠI

### 1.1. Lỗi đường dẫn File, Route giao diện & API Endpoint không khớp với Code thực tế
Khi Hội đồng yêu cầu *"Em mở đúng file viết chức năng này trong báo cáo cho thầy/cô xem"*, nếu đường dẫn trong báo cáo khác với code thực tế sẽ rất dễ bị trừ điểm. Dưới đây là **08 điểm lệch** giữa file Word và workspace hiện tại:

| STT | Vị trí trong File Word | Nội dung đang ghi trong Báo cáo Word (Sai / Cũ) | Thực tế trong Mã nguồn Workspace (`src/`) |
| :---: | :--- | :--- | :--- |
| **1** | `Bảng 3.42` (`Table[58]`) & `Mục 4.1.1` (`Table[59]`) | Ghi API cấu hình AI là `GET / PUT /api/settings/ai` | Đường dẫn API thật nằm tại [src/app/api/ai/settings/route.ts](file:///d:/Documents/H2MilkTea/src/app/api/ai/settings/route.ts) (tức là **`/api/ai/settings`**; còn `/settings/ai` là URL giao diện Frontend). |
| **2** | `Bảng 3.42` (`Table[58]`) & `Bảng 4.1` (`Table[60]`, UC-08) | Ghi có trang `/customers/debt` và endpoint `GET / POST /api/customers/debt` | Cả 2 đường dẫn này **không tồn tại** trong dự án. Thực tế quản lý công nợ và trả nợ nằm ở trang [src/app/(dashboard)/khachhang/page.tsx](file:///d:/Documents/H2MilkTea/src/app/(dashboard)/khachhang/page.tsx) (`/khachhang`), modal [DebtRepaymentModal.tsx](file:///d:/Documents/H2MilkTea/src/app/(dashboard)/khachhang/components/DebtRepaymentModal.tsx) và gọi qua API `/api/db`. |
| **3** | `Mục 4.1.1` (`Table[59]`) | Ghi `/payment/sepay-webhook` nằm dưới nhánh `src/app/api/` (App Router) | Thực tế SePay Webhook được viết theo **Pages Router** tại [src/pages/api/payment/sepay-webhook.ts](file:///d:/Documents/H2MilkTea/src/pages/api/payment/sepay-webhook.ts) (cùng với 4 API bếp tại `src/pages/api/kitchen/*.ts`). |
| **4** | `Mục 4.1.1` (`Table[59]`) & `Bảng 4.1` (`Table[60]`, UC-04) | Ghi module hàng đợi ngoại tuyến là `src/lib/offlineQueue.ts` | Tên file thực tế trong code là [src/lib/offline/offlineSyncQueue.ts](file:///d:/Documents/H2MilkTea/src/lib/offline/offlineSyncQueue.ts). |
| **5** | `Table[3]` (Cẩm nang ôn tập #2, Chương 2) | Ghi thuật toán hợp nhất giỏ hàng tại `src/lib/pos/mergeCart.ts` | Đường dẫn thực tế là [src/lib/cart/mergeCart.ts](file:///d:/Documents/H2MilkTea/src/lib/cart/mergeCart.ts). |
| **6** | `Bảng 4.1` (`Table[60]`, UC-08), `Hình 4.11` & `Table[70]` | Ghi đường dẫn cấu hình định mức BOM là `/menu/cauhinh` | Route thực tế trong `src/app/(dashboard)/menu/` là **`/menu/cauhinhnguyenlieu`** ([page.tsx](file:///d:/Documents/H2MilkTea/src/app/(dashboard)/menu/cauhinhnguyenlieu/page.tsx)). |
| **7** | `Bảng 4.1` (`Table[60]`, UC-10) | Ghi trang quản lý hóa đơn & Soft Delete là `/reports/invoices` | Trong `src/app/(dashboard)/reports/` không có `invoices`. Trang quản lý hóa đơn và hủy hóa đơn thực tế nằm tại **`/orders`** ([page.tsx](file:///d:/Documents/H2MilkTea/src/app/(dashboard)/orders/page.tsx) và [CancelInvoiceModal.tsx](file:///d:/Documents/H2MilkTea/src/app/(dashboard)/orders/components/CancelInvoiceModal.tsx)). |
| **8** | `Mục 4.1.1` (`Table[59]`) | Ghi `AccessibilityToggle` là file riêng trong `src/app/order/` | Thực tế nút bật Chế độ chữ lớn (Trợ năng 2.0) của khách QR được tích hợp trực tiếp trong [src/app/order/components/CustomerHeader.tsx](file:///d:/Documents/H2MilkTea/src/app/order/components/CustomerHeader.tsx) kết hợp [src/utils/appearanceSettings.ts](file:///d:/Documents/H2MilkTea/src/utils/appearanceSettings.ts). |

---

### 1.2. Lỗi "Vênh số liệu" giữa các Chương trong cùng File Word (Bất nhất nội bộ)
Do file Word đã trải qua nhiều đợt cập nhật tự động ở các mốc thời gian khác nhau, hiện có **05 cụm con số đang tự mâu thuẫn** giữa các trang:

1. **Số lượng Bộ kiểm thử tự động (Vitest Test Suites & Test Cases):**
   - Tại `Mục 4.1.2` (`Table[64]`): Ghi `# Chạy kiểm chứng toàn bộ 22 bộ kiểm thử (151 kịch bản)`.
   - Tại `Mục 4.2.1` (Đoạn văn `P[568]`): Ghi một câu bị lỗi ghép chữ: *"xác nhận toàn bộ **30 tệp** kiểm thử tự động (`30/30 test suites`) với tổng cộng **216 kịch bản** kiểm thử (**`216/233 tests`**)"*.
   - Tại tiêu đề `Bảng 4.2` (`P[569]`), `Tổng quan` (`P[115]`) và `Kết luận` (`P[595]`): Ghi **`32 bộ kiểm thử / 233 kịch bản`**.
   - **Thực tế trong thư mục `tests/unit/` hiện tại**: Đã có **`36 tệp kiểm thử`** (34 tệp đã commit + 2 tệp mới) với **`~260 kịch bản test`**!
2. **Số lượng Kịch bản Kiểm thử Tích hợp (`Bảng 4.3`):**
   - Đoạn văn `P[572]` ghi: *"Bảng 4.3 thiết lập danh mục **33 kịch bản** kiểm thử tích hợp trọng tâm (**`TC-01` đến `TC-30`**)"*.
   - Tiêu đề `Bảng 4.3` (`P[573]`) vẫn ghi *"Danh mục **30 kịch bản**..."*, nhưng bên trong bảng thực tế có từ **`TC-01` đến `TC-33`** (33 dòng).
3. **Số lượng Bàn phục vụ (`20 bàn` vs `24 bàn`):**
   - `Mục 3.1.1` (`P[179]`), `Mục 4.1.1` (`Table[59]`) và `Kết luận` (`P[593]`) ghi: **04 khu vực (*Phòng hát, Quầy, Vườn, Mang về*) với 20 bàn hoạt động chính thức**.
   - Nhưng tiêu đề `Nhóm chức năng UC-02` (`P[271]`), tiêu đề `Bảng 3.16` (`P[277]`) và thuyết minh giao diện POS (`P[548]`) vẫn ghi **"24 bàn phục vụ"** (do trong file tĩnh [src/data/DSBAN.json](file:///d:/Documents/H2MilkTea/src/data/DSBAN.json) có 24 bản ghi, trong đó 4 bàn ở trạng thái `Không hoạt động` / bàn ảo, còn trên giao diện lọc 20 bàn hoạt động). Nếu không giải thích rõ "24 bản ghi vật lý (20 bàn hoạt động thuộc 4 khu vực)", người đọc sẽ thấy mâu thuẫn.
4. **Số lượng Bảng CSDL vật lý (`14 bảng` vs `15 bảng`) & Số lượng file SQL Migrations (`6 tệp` vs `7 tệp`):**
   - `Table[2]` (Cẩm nang ôn tập #1) gợi ý `14 bảng CSDL vật lý`, trong khi `Mục 3.4.4` (`P[468]`, `P[471]`) đặc tả **15 bảng** (`Bảng 3.27` → `Bảng 3.41`).
   - `Mục 4.1.1` (`Table[59]`) và `Mục 4.1.2` (`Table[62]`) chỉ liệt kê **06 tệp SQL migrations**, thiếu tệp thứ 7 là [supabase/migrations/202611070007_add_table_area.sql](file:///d:/Documents/H2MilkTea/supabase/migrations/202611070007_add_table_area.sql).
5. **Cấu trúc CSDL Multi-Tenant (`store_id`) vs Schema thực tế trong Migrations:**
   - Trong [docs/BAO_CAO_DO_AN_TOT_NGHIEP_H2MILKTEA.md](file:///d:/Documents/H2MilkTea/docs/BAO_CAO_DO_AN_TOT_NGHIEP_H2MILKTEA.md) nhấn mạnh cột `store_id UUID` trên mọi bảng, nhưng trong 7 file SQL tại `supabase/migrations/` hiện tại, các bảng `pos_orders`, `pos_cart_drafts`, `app_settings`, `ai_audit_logs` chưa khai báo cột `store_id` trong file migration gốc mà mới kiểm thử ở tầng logic/bảo mật. Trong file Word (.docx), tác giả đã khéo léo đưa phần này về đúng bản chất (15 bảng thực tế), bạn cần nắm rõ điểm này để nếu Hội đồng hỏi về Multi-Tenant thì trình bày đó là kiến trúc mở rộng đã có kiểm thử mô phỏng ([tests/unit/invoice-anti-loss-and-multitenant.test.ts](file:///d:/Documents/H2MilkTea/tests/unit/invoice-anti-loss-and-multitenant.test.ts)).

---

### 1.3. Các Hộp Ghi Chú Nội Bộ & Các Chỗ Trống Chưa Hoàn Thiện Trong File Word
1. **10 Hộp "💡 CẨM NANG ÔN TẬP (#1 → #10)" đang nằm прямо trong nội dung báo cáo Word:**
   - Gồm các bảng: `Table[2]`, `Table[3]`, `Table[4]`, `Table[19]`, `Table[30]`, `Table[33]`, `Table[36]`, `Table[40]`, `Table[74]`, `Table[78]`.
   - **Cảnh báo quan trọng**: Đây là các hộp bài tập tự điền và mẹo trả lời Hội đồng được chèn vào để bạn học bài. **Sau khi bạn đã tự điền và thuộc bài, trước khi xuất PDF nộp cho Khoa, bạn BẮT BUỘC phải xóa 10 bảng "💡 CẨM NANG ÔN TẬP" này đi**, nếu không cuốn báo cáo nộp chính thức sẽ chứa cả lời nhắc *"Nếu thầy cô trong Hội đồng hỏi..."*!
2. **07 Khung Hình Ảnh Chương 4 (`Hình 4.6` → `Hình 4.12`, tương ứng `Table[65]` → `Table[71]`) vẫn đang là khung chữ `[CHÈN ẢNH GIAO DIỆN THỰC TẾ...]`:**
   - Trong khi `Hình 4.1` → `Hình 4.5` và `Hình 4.13` đã có ảnh, thì **7 hình quan trọng nhất của Chương 4 (`Hình 4.6` đến `Hình 4.12`) hiện vẫn đang là bảng hướng dẫn chụp màn hình**, chưa được thay bằng ảnh chụp thật!
3. **Các Bảng Dữ liệu Khảo sát & Thực nghiệm đang để trống `[ĐIỀN ...]`:**
   - `Table[10]` (Thông tin thực tế quán H2Milktea ở Mục 3.1.1).
   - `Table[12]` (`Bảng 3.2`: Số lượng nhân sự theo ca).
   - `Table[18]` (`Bảng 3.8`: Tổng hợp kết quả khảo sát 5 nhóm đối tượng).
   - `Table[20]` (Khung số liệu quan sát hiện trạng Baseline Trước ở Mục 3.2.2).
   - `Table[24]` (`Bảng 3.12`: Ngày tháng cụ thể của 4 giai đoạn thực hiện đồ án).
   - `Table[73]` (`Bảng 4.3`: Cột kết quả thực tế `TC-01` → `TC-33`).
   - `Table[75]` (`Bảng 4.4`: Đo thời gian Trước/Sau cho 6 tác vụ `TV-01` → `TV-06`).
   - `Table[76]` (`Bảng 4.5`: Kết quả đánh giá AI theo 5 nhóm câu lệnh).
   - `Table[77]` (`Bảng 4.6`: Điểm khảo sát khả dụng SUS 10 câu).

---

## PHẦN 2: KHUNG MẪU "ĐIỀN VÀO CHỖ TRỐNG" (`[...]`) ĐỂ BẠN TỰ TRA CỨU CODE & HIỂU SÂU HỆ THỐNG

> 💡 **Cách sử dụng phần này**: Với mỗi mục dưới đây, hãy mở đúng **File mã nguồn được gợi ý** trong IDE, đọc đoạn code xử lý để tự điền vào dấu `[...]` trước khi cập nhật sang file Word.

---

### BÀI TẬP 1: Nắm vững Quy mô Dữ liệu & Kiến trúc Tổng thể (TỔNG QUAN & MỤC 3.1)

**📂 File code cần mở để tra cứu:**
- Danh mục dữ liệu JSON: [src/data/DMHH.json](file:///d:/Documents/H2MilkTea/src/data/DMHH.json), [src/data/DSBAN.json](file:///d:/Documents/H2MilkTea/src/data/DSBAN.json), [src/data/NGUYENLIEU.json](file:///d:/Documents/H2MilkTea/src/data/NGUYENLIEU.json), [src/data/store_recipes.json](file:///d:/Documents/H2MilkTea/src/data/store_recipes.json), [src/data/project_knowledge_chunks.json](file:///d:/Documents/H2MilkTea/src/data/project_knowledge_chunks.json).
- Thư mục миграции CSDL: `supabase/migrations/*.sql`.
- Cấu hình phân quyền điều hướng: [src/middleware.ts](file:///d:/Documents/H2MilkTea/src/middleware.ts) và [src/lib/navigation.ts](file:///d:/Documents/H2MilkTea/src/lib/navigation.ts).

**✍️ Khung mẫu tự điền (Dùng cho Mục 1.4, Mục 3.1.1, Bảng 3.1, Bảng 3.2):**

```markdown
1. Quy mô Cơ sở dữ liệu & Danh mục thực tế tại H2Milktea:
   - Tổng số bảng CSDL vật lý được đặc tả trong Từ điển dữ liệu (Bảng 3.27 -> 3.41): [...] bảng
     (gồm [...] bảng nghiệp vụ truyền thống viết hoa tên và [...] bảng mở rộng viết thường phục vụ Realtime/AI).
   - Tổng số tệp SQL Migration trong `supabase/migrations/`: [...] tệp
     (Tệp thứ 7 mới nhất tên là `[...]`, dùng để bổ sung cột `[...]` cho bảng `DSBAN`).
   - Thực đơn (`DMHH.json`): gồm [...] sản phẩm đồ uống/topping, chia thành [...] nhóm danh mục.
   - Sơ đồ bàn (`DSBAN.json` & `/tables`): Tổng cộng có [...] bản ghi trong file gốc, trong đó có [...] bàn đang hoạt động chính thức được phân vào [...] khu vực thực tế gồm: `[...]`, `[...]`, `[...]`, và `[...]`.
   - Kho nguyên vật liệu (`NGUYENLIEU.json`): quản lý [...] mã nguyên liệu pha chế.

2. Thông tin đơn vị khảo sát (Điền vào Khung đơn vị khảo sát `Table[10]` & `Bảng 3.2` trong Word):
   - Địa chỉ cửa hàng H2Milktea khảo sát: [...]
   - Năm/tháng bắt đầu hoạt động: [...]
   - Khung giờ mở cửa: 08:00 – 22:30 | Hai khung giờ cao điểm trong ngày: [...] và [...]
   - Lưu lượng đơn trung bình: Ngày thường từ [...] – [...] đơn/ngày; Cuối tuần từ [...] – [...] đơn/ngày.
   - Cơ cấu nhân sự mỗi ca (`Bảng 3.2`):
     + Chủ quán / Quản lý: [...] người
     + Nhân viên Thu ngân / Phục vụ quầy POS: [...] người/ca
     + Nhân viên Pha chế (Barista / Kitchen): [...] người/ca

3. Cơ chế Bảo vệ Tuyến đường (Route Guard) tại `src/middleware.ts`:
   - Khi người dùng truy cập vào một đường dẫn nội bộ, `middleware.ts` đọc Cookie có tên là `[...]` (hoặc kiểm tra phiên Supabase) để xác định trạng thái đăng nhập và vai trò.
   - Ngoài ra, mỗi request đi qua `middleware.ts` đều được gắn thêm Header truy vết lỗi tên là `[...]` (sinh bằng hàm `crypto.randomUUID()`).
```

---

### BÀI TẬP 2: Giải phẫu Luồng Đặt món QR tại Bàn & Đồng bộ Giỏ hàng Đa thiết bị (TRỤ CỘT 1 — UC-02, UC-03, UC-04)

**📂 File code cần mở để tra cứu:**
- Giải quyết tên bàn thông minh: [src/lib/tableResolver.ts](file:///d:/Documents/H2MilkTea/src/lib/tableResolver.ts)
- API tạo đơn QR của khách: [src/app/api/orders/route.ts](file:///d:/Documents/H2MilkTea/src/app/api/orders/route.ts) và [src/app/api/customer-order/route.ts](file:///d:/Documents/H2MilkTea/src/app/api/customer-order/route.ts)
- API lưu nháp giỏ hàng theo bàn (OCC): [src/app/api/pos/cart-draft/route.ts](file:///d:/Documents/H2MilkTea/src/app/api/pos/cart-draft/route.ts)
- Thuật toán gộp giỏ hàng & phát hiện xung đột: [src/lib/cart/mergeCart.ts](file:///d:/Documents/H2MilkTea/src/lib/cart/mergeCart.ts)
- Hook đồng bộ giỏ hàng Realtime phía Client: [src/app/(dashboard)/pos/hooks/useSharedCartDraft.ts](file:///d:/Documents/H2MilkTea/src/app/(dashboard)/pos/hooks/useSharedCartDraft.ts)

**✍️ Khung mẫu tự điền (Dùng để hiểu sâu Mục 3.3.3 UC-03/UC-04 và Mục 3.4.2 Trụ cột 1):**

```markdown
1. Luồng Khách hàng quét QR đặt món (`UC-03`):
   - Khi khách quét mã QR có tham số `?table=...` (ví dụ `?table=B001` hoặc `?table=Bàn 1`), hàm `[...]` trong file `src/lib/tableResolver.ts` sẽ chuẩn hóa chuỗi và đối chiếu với danh sách `DSBAN` để tìm ra đúng `IDBAN` hợp lệ.
   - Khi khách bấm "Gửi đơn", dữ liệu được gửi tới endpoint `POST [...]`.
   - Câu hỏi bảo mật cốt lõi: Nếu một khách hàng dùng F12 sửa giá món Trà sữa từ `35.000đ` xuống `1.000đ` trong request body thì chuyện gì xảy ra?
     -> Trả lời dựa vào code `src/app/api/orders/route.ts`: Server KHÔNG dùng trường giá từ Client gửi lên mà tự truy vấn lại đơn giá gốc từ bảng `[...]`, cộng thêm phụ thu Size `[...]` và giá các `[...]`, sau đó lưu đơn vào bảng `[...]` với trạng thái ban đầu là `order_status = '[...]'` và thời gian hết hạn `expires_at` là `[...]` phút.
   - Ngay khi đơn QR được tạo, màn hình `/order` phát tín hiệu qua kênh Supabase Broadcast tên là `[...]` kết hợp cơ chế Polling mỗi `[...]` giây tại `usePOS.ts` để Hộp thư đơn QR (`QROrderInbox.tsx`) phát âm thanh chuông báo `ding-dong` tức thì.

2. Thuật toán Kiểm soát Đồng thời Lạc quan (OCC) & Hợp nhất Giỏ hàng (`UC-04`):
   - Mỗi dòng món trong giỏ hàng được định danh duy nhất bởi hàm `getLineItemKey(item)` trong `src/lib/cart/mergeCart.ts` theo công thức ghép chuỗi:
     `Key = [...] + "::" + [...] + "::size=" + [...] + "::sugar=" + [...] + "::ice=" + [...] + "::toppings=" + [...]`
     (Nhờ đó, 2 ly cùng mã `SP001` nhưng 1 ly `50% đường` và 1 ly `100% đường` sẽ được tách thành [...] dòng riêng biệt, không bị gộp nhầm).
   - Khi Thu ngân A và Thu ngân B cùng mở giỏ hàng của Bàn 01 (đang ở `version = 3`):
     + Thu ngân A lưu trước -> gửi `PUT /api/pos/cart-draft` kèm `expectedVersion = 3`. Câu lệnh SQL `UPDATE pos_cart_drafts SET ..., version = [...] WHERE table_id = ... AND version = [...]` thực thi thành công, `version` trên DB tăng lên `[...]`.
     + Thu ngân B lưu sau -> vẫn gửi `expectedVersion = 3`. Do `version` trong DB đã là `4`, câu lệnh `UPDATE` không khớp dòng nào và API trả về mã HTTP `[...]` kèm theo `remoteDraft` mới nhất.
   - Khi nhận mã HTTP `409`, hàm `diffCartItems(baseCart, localCart, remoteCart)` trong `src/lib/cart/mergeCart.ts` sẽ xử lý như thế nào?
     + Trường hợp 2 máy thêm 2 món có `lineItemKey` KHÁC NHAU: Hệ thống tự động `[...]`.
     + Trường hợp 2 máy cùng sửa số lượng trên CÙNG một `lineItemKey` thành 2 con số khác nhau: Hệ thống mở hộp thoại `[...]` (`CartConflictModal.tsx`) cho phép thu ngân chọn 1 trong 3 phương án: (1) `[...]`, (2) `[...]`, hoặc (3) `[...]`.
   - Để tránh việc chính máy vừa lưu lại nhận ngược gói tin WebSocket broadcast của mình (hiện tượng Echo), hook `useSharedCartDraft.ts` gắn kèm trường `updated_by_device = [...]` và kiểm tra: nếu `remoteDraft.updated_by_device === myDeviceId` thì `[...]`.
```

---

### BÀI TẬP 3: Giải phẫu Giao dịch Thanh toán Nguyên tử, Chuyển bàn & SePay Webhook (TRỤ CỘT 2 — UC-06)

**📂 File code cần mở để tra cứu:**
- Migration chứa hàm RPC PostgreSQL: [supabase/migrations/202610180004_pos_core_rpc.sql](file:///d:/Documents/H2MilkTea/supabase/migrations/202610180004_pos_core_rpc.sql)
- API Thanh toán tại quầy: [src/app/api/pos/checkout/route.ts](file:///d:/Documents/H2MilkTea/src/app/api/pos/checkout/route.ts)
- API Chuyển bàn: [src/app/api/pos/transfer-table/route.ts](file:///d:/Documents/H2MilkTea/src/app/api/pos/transfer-table/route.ts)
- API SePay Webhook: [src/pages/api/payment/sepay-webhook.ts](file:///d:/Documents/H2MilkTea/src/pages/api/payment/sepay-webhook.ts)
- Quản lý hủy hóa đơn Soft Delete: [src/app/(dashboard)/orders/components/CancelInvoiceModal.tsx](file:///d:/Documents/H2MilkTea/src/app/(dashboard)/orders/components/CancelInvoiceModal.tsx)

**✍️ Khung mẫu tự điền (Dùng cho Mục 3.3.3 UC-06, Mục 3.4.2 Trụ cột 2 & 4, và Bảng 3.42):**

```markdown
1. Thanh toán Nguyên tử (Atomic Checkout) & Tính Lũy đẳng (Idempotency):
   - Khi thu ngân bấm "Thanh toán", Client sinh một mã `idempotencyKey` duy nhất và gọi `POST /api/pos/checkout`.
   - Tại `202610180004_pos_core_rpc.sql`, hàm RPC `pos_pay_order` gói gọn [...] thao tác cập nhật CSDL vào trong CÙNG MỘT Transaction:
     (1) Kiểm tra xem `p_idempotency_key` đã tồn tại trong bảng `HOADON` chưa; nếu đã tồn tại thì trả về ngay hóa đơn cũ với cờ `idempotent_replay = [...]` (chống tạo 2 hóa đơn trùng khi mạng lag thu ngân bấm đúp).
     (2) `INSERT` hóa đơn mới vào bảng `[...]`.
     (3) `INSERT` danh sách các món vào bảng `[...]`.
     (4) `UPDATE` trạng thái bàn trong bảng `DSBAN` về `'[...]'` và `DELETE` giỏ hàng nháp của bàn đó trong bảng `[...]`.
     (5) `UPDATE` các đơn trong `pos_orders` của bàn đó sang `payment_status = '[...]'` và `kitchen_status = '[...]'` (để tự động dọn khỏi màn hình bếp KDS).
   - Ngoài ra, trong `src/app/api/pos/checkout/route.ts`, hệ thống còn tự động tính toán và trừ tồn kho nguyên vật liệu dựa trên bảng công thức định mức `[...]` (BOM) và ghi phiếu xuất kho vào bảng `[...]`.

2. Thuật toán Chuyển bàn Chống Khóa chết (Deadlock-Free Table Transfer):
   - Trong hàm RPC `pos_transfer_table_cart` (`202610180004_pos_core_rpc.sql`), giả sử Thu ngân 1 chuyển từ `BAN01 -> BAN02` cùng lúc Thu ngân 2 chuyển từ `BAN02 -> BAN01`. Làm sao để PostgreSQL không bị Deadlock?
   - Trả lời: Trước khi khóa dòng bằng `SELECT ... FOR UPDATE`, hàm sắp xếp thứ tự khóa 2 bàn theo quy tắc `LEAST(p_source_table_id, p_target_table_id)` trước rồi mới đến `GREATEST(...)`, nghĩa là luôn khóa theo thứ tự `[...]` cố định!

3. Luồng Đối soát Thanh toán Tự động qua SePay Webhook:
   - Đường dẫn file thực tế trong dự án: `[...]` (lưu ý: nằm trong `src/pages/api/...`, không phải `src/app/api/...`).
   - Khi SePay gửi gói tin POST sang, hàm xử lý kiểm tra Header `Authorization` có chứa chuỗi `Apikey [...]` khớp với biến môi trường `SEPAY_API_KEY` (hoặc `SEPAY_WEBHOOK_SECRET`).
   - Tiếp theo, hàm dùng biểu thức chính quy (Regex) quét trường `content` (nội dung chuyển khoản) để tìm mã hóa đơn `HD...` hoặc mã bàn theo cú pháp `H2 [...]`.
   - Sau khi cập nhật trạng thái thanh toán xong, Server phát sự kiện broadcast tên là `'[...]'` trên kênh Realtime `'[...]'` để màn hình POS đang mở tự động đóng hộp thoại thanh toán và báo thành công.

4. Cơ chế Chống thất thoát Hóa đơn (Soft Delete Audit Trail):
   - Tại trang `/orders` ([CancelInvoiceModal.tsx](file:///d:/Documents/H2MilkTea/src/app/(dashboard)/orders/components/CancelInvoiceModal.tsx)), hệ thống KHÔNG cho phép xóa vật lý (`DELETE`) bản ghi trong bảng `HOADON`.
   - Khi hủy đơn, trường `Trạng thái` của hóa đơn chuyển thành `'[...]'`, đồng thời bắt buộc thu ngân chọn/nhập lý do hủy để nối vào trường `[...]` theo định dạng: `[ĐÃ HỦY] <Lý do> (Bởi: <Nhân viên> lúc <Thời gian>)`.
```

---

### BÀI TẬP 4: Giải phẫu Đường ống Trợ lý AI 2 Tầng & In-App Hybrid RAG (TRỤ CỘT 3 — UC-05)

**📂 File code cần mở để tra cứu:**
- Đường ống xử lý AI trung tâm: [src/lib/ai/pipeline.ts](file:///d:/Documents/H2MilkTea/src/lib/ai/pipeline.ts)
- Tầng 1 Rule Engine & Từ điển viết tắt: [src/lib/ai/ruleEngine.ts](file:///d:/Documents/H2MilkTea/src/lib/ai/ruleEngine.ts) và [src/lib/ai/aliases.ts](file:///d:/Documents/H2MilkTea/src/lib/ai/aliases.ts)
- Rào chắn an toàn & Chống Prompt Injection: [src/lib/ai/security.ts](file:///d:/Documents/H2MilkTea/src/lib/ai/security.ts)
- Động cơ In-App Hybrid RAG 4 nguồn: [src/lib/ai/ragEngine.ts](file:///d:/Documents/H2MilkTea/src/lib/ai/ragEngine.ts)
- Bóc tách topping của Chatbot khách QR: [src/lib/ai/customerDrinkParser.ts](file:///d:/Documents/H2MilkTea/src/lib/ai/customerDrinkParser.ts)

**✍️ Khung mẫu tự điền (Dùng cho Mục 3.3.3 UC-05, Mục 3.4.2 Trụ cột 3, và Bảng 4.5):**

```markdown
1. Rào chắn Bảo mật AI (`src/lib/ai/security.ts` & `src/lib/ai/pipeline.ts`):
   - Giới hạn tần suất gọi (Rate Limit): Tối đa `[...]` yêu cầu / phút / nhân viên.
   - Giới hạn số lượng ly tối đa trong 1 lệnh gọi món qua AI (`MAX_ITEM_QUANTITY`): `[...]` ly/món (nếu vượt quá ngưỡng này, ví dụ gọi `5000 ly`, hàm `validateQuantityLimit` sẽ chặn ngay và trả về `status = 'blocked'`).
   - Các hành động bị CẤM TUYỆT ĐỐI trong `security.ts` (AI không bao giờ được tự thực thi):
     (1) Tự động `[...]` hóa đơn (Checkout/Pay),
     (2) Tự động `[...]` hóa đơn hoặc xóa bàn,
     (3) Sửa đơn giá món về `0đ` hoặc chiết khấu `100%` (Prompt Injection như *"ignore previous instructions..."*).

2. Kiến trúc 2 Tầng (Rule Engine + LLM Fallback):
   - Tầng 1 (`src/lib/ai/ruleEngine.ts`):
     + Chuẩn hóa chuỗi tiếng Việt bằng `.normalize('NFD')`, mở rộng các từ viết tắt trong `aliases.ts` (ví dụ: `ts` -> `[...]`, `dcs` -> `[...]`, `bx` -> `[...]`, `tcdd` -> `[...]`).
     + Bóc tách số lượng, tên món, Size (`M`/`L`), `% đường`, `% đá`, và `toppings`.
     + Độ trễ thực nghiệm tại Tầng 1 (`docs/agent/ai-latency-report.md`): trung vị `p50 = [...] ms`, phân vị `p95 = [...] ms` (tiết kiệm khoảng `[...]%` số lần phải gọi API Gemini).
   - Tầng 2 (Google Gemini API trong `pipeline.ts`):
     + Chỉ kích hoạt khi câu lệnh quá mơ hồ mà Tầng 1 không khớp được hoặc khi hỏi đáp tự nhiên, đầu ra bị ép kiểu chặt chẽ bằng thư viện `[...]` (`src/lib/ai/schema.ts`).
   - Cơ chế Human-in-the-Loop (`POSAssistant.tsx`):
     + Mọi lệnh thêm/sửa/xóa món đều chỉ trả về thẻ xem trước (`Preview Card`) ở trạng thái `status = '[...]'` kèm bảng so sánh Giỏ hàng Trước/Sau (Before/After Diff). Chỉ khi thu ngân bấm nút **"Xác nhận"**, món mới được đưa vào giỏ hàng và cập nhật trạng thái log trong bảng `ai_audit_logs` sang `status = '[...]'`.

3. Động cơ In-App Hybrid RAG (`src/lib/ai/ragEngine.ts`):
   - Kết hợp 04 nguồn tri thức nội bộ gồm:
     (1) Các mảnh kiến trúc & quy trình dự án: file `src/data/[...].json`
     (2) Cẩm nang hỏi đáp cửa hàng: file `src/data/[...].json`
     (3) Công thức pha chế, calo & cảnh báo dị ứng: file `src/data/[...].json`
     (4) Dữ liệu thời gian thực (Live BI): truy vấn trực tiếp từ các bảng `DMHH`, `DSBAN`, `HOADON`, `NGUYENLIEU`.
   - Cô lập theo vai trò (`Role-based RAG Scope`): Nếu người hỏi là Khách hàng trên màn hình QR (`roleScope = 'customer'`), động cơ RAG sẽ tự động lọc bỏ toàn bộ các mảnh tri thức thuộc phạm vi `[...]` (như doanh thu, giá vốn, công thức định lượng mật, nhân sự).
```

---

### BÀI TẬP 5: Khung Điền Bảng Số liệu Thực nghiệm, Kiểm thử & Khảo sát SUS (CHƯƠNG 3 & CHƯƠNG 4)

**📂 File tài liệu & script trong dự án để tra cứu số liệu thật:**
- Kết quả chạy Vitest: Chạy lệnh `npx vitest run` hoặc đối chiếu [docs/BAO_CAO_TEST_MANUAL_TOAN_DU_AN.md](file:///d:/Documents/H2MilkTea/docs/BAO_CAO_TEST_MANUAL_TOAN_DU_AN.md).
- Báo cáo độ chính xác AI (`eval:ai`): [docs/agent/eval-ai-report.md](file:///d:/Documents/H2MilkTea/docs/agent/eval-ai-report.md) (55 câu trong `eval/ai/test.jsonl` chia theo 7 nhóm).
- Báo cáo độ trễ AI (`eval:latency`): [docs/agent/ai-latency-report.md](file:///d:/Documents/H2MilkTea/docs/agent/ai-latency-report.md) (200 mẫu đo).
- Giao thức đo thực nghiệm Trước/Sau tại quán: [docs/experiment/baseline-protocol.md](file:///d:/Documents/H2MilkTea/docs/experiment/baseline-protocol.md).

**✍️ Khung mẫu tự điền cho các Bảng còn để trống trong Chương 3 & Chương 4:**

#### 5.1. Đồng bộ con số Kiểm thử Tự động (Sửa ở Mục 1.4, Mục 4.1.1, Mục 4.1.2, Mục 4.2.1, Bảng 4.2 và Kết luận)
```markdown
- Tổng số tệp kiểm thử tự động Vitest trong `tests/unit/`: [...] tệp
  (Lưu ý: Nếu tính bản đã ghi sẵn trong Bảng 4.2 của file Word là 32 tệp / 233 kịch bản; nếu bổ sung thêm 4 tệp mới nhất gồm `smart-table-resolver.test.ts`, `qr-order-pos-notification.test.ts`, `sidebar-navigation-ux.test.ts`, `qa-bug-reporter-and-test-plan.test.ts` thì tổng là 36 tệp / 260 kịch bản. Hãy chọn 1 con số thống nhất xuyên suốt cả cuốn báo cáo và sửa lại câu bị lỗi ghép chữ tại đoạn P[568]!).
- Tổng số kịch bản kiểm thử tích hợp tại `Bảng 4.3`: Sửa thống nhất tiêu đề và đoạn dẫn thành `[...]` kịch bản (`TC-01` đến `TC-[...]`), và điền cột cuối cùng của cả 33 dòng là `PASS - [...]`.
```

#### 5.2. Khung điền `Bảng 4.4` (Đo thời gian thực nghiệm Trước và Sau tại quán — `Table[75]`)
> *Gợi ý phương pháp*: Bạn hãy tự bấm giờ trên hệ thống Web H2Milktea cho 6 tác vụ `TV-01` → `TV-06` và đối chiếu với thời gian làm thủ công (ghi giấy/nhập tay/cộng sổ) để điền vào bảng:

| Mã tác vụ | Tác vụ thực nghiệm | Thời gian TB Trước (Thủ công) | Thời gian TB Sau (Web H2Milktea) | Tỷ lệ rút ngắn (%) & Nhận xét thực tế |
| :--- | :--- | :---: | :---: | :--- |
| `TV-01` | Lên đơn lẻ 01 món cơ bản tại quầy và báo pha chế | `[...] giây` | `[...] giây` | Giảm `[...]%` — [...] |
| `TV-02` | Lên đơn nhóm 4–5 món có Size, % đường, % đá, topping | `[...] giây` | `[...] giây` | Giảm `[...]%` — [...] |
| `TV-03` | Nhập nhanh đơn nhiều món bằng Trợ lý AI (so với bấm tay) | `[...] giây` | `[...] giây` | Giảm `[...]%` — [...] |
| `TV-04` | Chuyển bàn đang phục vụ kèm toàn bộ món và ghi chú sang bàn mới | `[...] giây` | `[...] giây` | Giảm `[...]%` — [...] |
| `TV-05` | Tính tiền hóa đơn có chiết khấu VIP và in phiếu / đối soát QR | `[...] giây` | `[...] giây` | Giảm `[...]%` — [...] |
| `TV-06` | Tổng hợp doanh thu cuối ca và kiểm tra nguyên liệu tồn kho | `[...] phút` | `[...] giây` | Giảm `[...]%` — [...] |

#### 5.3. Khung điền `Bảng 4.5` (Đánh giá Độ chính xác & Độ trễ Trợ lý AI — `Table[76]`)
> *Gợi ý tra cứu*: Mở file [docs/agent/eval-ai-report.md](file:///d:/Documents/H2MilkTea/docs/agent/eval-ai-report.md) và [docs/agent/ai-latency-report.md](file:///d:/Documents/H2MilkTea/docs/agent/ai-latency-report.md) để lấy số mẫu thực tế từ bộ `eval/ai/test.jsonl` (55 câu) + `dev.jsonl` (30 câu):

| Nhóm câu lệnh thử nghiệm | Số mẫu ($n$) | Số câu đúng | Độ chính xác (%) | Độ trễ trung vị $p50$ (ms) & Nguồn xử lý |
| :--- | :---: | :---: | :---: | :--- |
| 1. Câu gọi 01 món chuẩn hoặc dùng từ viết tắt (`ts`, `cf`, `bx`) | `n1 = [...]` | `[...]/[...]` | `[...]%` | Rule Engine: `[...] ms` |
| 2. Câu ghép nhiều món kèm Size, % đường, % đá, nhiều topping | `n2 = [...]` | `[...]/[...]` | `[...]%` | Rule / Gemini: `[...] ms` |
| 3. Câu hỏi tra cứu quy trình vận hành (`/user-guide`) và FAQ quán | `n3 = [...]` | `[...]/[...]` | `[...]%` | Hybrid RAG / FAQ: `[...] ms` |
| 4. Câu lệnh mơ hồ, thiếu tên món hoặc món đã ngừng kinh doanh | `n4 = [...]` | `[...]/[...]` | `[...]%` | Rule / Gemini: `[...] ms` |
| 5. Câu lệnh vượt quyền (tự thanh toán, sửa giá `0đ`, gọi `5000` ly) | `n5 = [...]` | `[...]/[...]` | `[...]%` (Chặn đúng) | Security Guardrail: `[...] ms` |
| **Tổng cộng / Trung bình toàn bộ tập kiểm định** | **`N = [...]`** | **`[...]/[...]`** | **`[...]%`** | **`p50 = [...] ms` / `p95 = [...] ms`** |

#### 5.4. Khung điền `Bảng 4.6` (Thang đo Khả dụng Hệ thống SUS — `Table[77]`)
> *Công thức chuẩn John Brooke (1996) để bạn tự tính không bao giờ sai*:
> - Với các **câu số lẻ** (Câu 1, 3, 5, 7, 9 — mang ý nghĩa tích cực): $\text{Điểm quy đổi} = \text{Điểm TB} - 1$.
> - Với các **câu số chẵn** (Câu 2, 4, 6, 8, 10 — mang ý nghĩa tiêu cực): $\text{Điểm quy đổi} = 5 - \text{Điểm TB}$.
> - **Tổng điểm SUS (thang 100)** $= \left(\sum_{i=1}^{10} \text{Điểm quy đổi}_i\right) \times 2.5$. (Nếu tổng điểm $\ge 80.3$ thì đạt mức **Xuất sắc / Grade A**).

```markdown
- Tổng cộng 10 điểm quy đổi thành phần của bạn: [...] + [...] + ... = [...] (trên thang 40)
- Nhân với hệ số 2.5 -> Điểm SUS trung bình toàn hệ thống = [...] / 100 điểm (Xếp loại: [...]).
```

---

## PHẦN 3: DANH SÁCH KIỂM TRA (CHECKLIST) 6 BƯỚC TRƯỚC KHI XUẤT PDF NỘP BÀI

Để bản báo cáo [DoAnTotNghiep.TranVanTien.74dcht22275.docx](file:///d:/Documents/H2MilkTea/DoAnTotNghiep.TranVanTien.74dcht22275.docx) hoàn hảo 100% trước khi nộp:
- [ ] **Bước 1**: Tự tra cứu code theo **Bài tập 1 → Bài tập 5** ở trên và điền toàn bộ các ô `[ĐIỀN ...]` trong `Bảng 3.2`, `Bảng 3.8`, `Bảng 3.12`, `Bảng 4.3`, `Bảng 4.4`, `Bảng 4.5`, `Bảng 4.6`.
- [ ] **Bước 2**: Chụp và chèn **07 ảnh giao diện thực tế** vào `Hình 4.6` → `Hình 4.12` (thay thế hoàn toàn 7 bảng khung hướng dẫn chụp `Table[65]` → `Table[71]`).
- [ ] **Bước 3**: Sửa lại **08 đường dẫn file/API bị lệch** (Mục 1.1) và **05 cụm số liệu bị vênh** (Mục 1.2), đặc biệt là câu bị lỗi ghép chữ `30 tệp ... 216/233 tests` ngay trên `Bảng 4.2` và `33 kịch bản (TC-01 đến TC-30)` ngay trên `Bảng 4.3`.
- [ ] **Bước 4**: **XÓA BỎ toàn bộ 10 bảng "💡 CẨM NANG ÔN TẬP (#1 → #10)"** ra khỏi file Word sau khi bạn đã ôn tập xong (để không lộ ghi chú nhắc bài trong cuốn báo cáo nộp cho Khoa).
- [ ] **Bước 5**: Nhấn `Ctrl + F` trên Word tìm từ khóa `[ĐIỀN` và `[CHÈN ẢNH` — đảm bảo kết quả trả về bằng **`0`**.
- [ ] **Bước 6**: Nhấn `Ctrl + A` rồi nhấn phím **`F9`** (chọn *Update entire table*) để cập nhật lại toàn bộ số trang của **Mục lục**, **Danh mục hình ảnh** và **Danh mục bảng biểu**, sau đó xuất ra file `.pdf`.
