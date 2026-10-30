# CẨM NANG HỌC TẬP & BẢO VỆ ĐỒ ÁN TỐT NGHIỆP TỪ A–Z
## HỆ THỐNG QUẢN LÝ BÁN HÀNG & GỌI MÓN THÔNG MINH H2MILKTEA
**Khoa Công nghệ Thông tin – Trường Đại học Công nghệ Giao thông Vận tải (UTT)**  
*Dành riêng cho sinh viên phát triển dự án theo phương pháp Vibecode muốn làm chủ bản chất kỹ thuật để tự tin bảo vệ trước Hội đồng chấm Đồ án.*

---

## LỜI NÓI ĐẦU TỪ GIẢNG VIÊN HƯỚNG DẪN (AGENT 3)

Chào bạn! Khi bạn xây dựng dự án bằng phương pháp **vibecode** (sử dụng AI hỗ trợ viết code với tốc độ cao), điểm mạnh là sản phẩm hoàn thiện rất nhanh, tính năng phong phú và giao diện hiện đại. Tuy nhiên, rủi ro lớn nhất khi bước vào phòng bảo vệ Đồ án tốt nghiệp là: **Hội đồng không chấm số lượng dòng code, mà chấm mức độ hiểu bản chất kiến trúc và khả năng giải thích lý do tại sao em lại chọn giải pháp kỹ thuật đó**.

Cẩm nang này được thiết kế để biến bạn từ một người "chỉ biết bấm nút chạy code" thành một kỹ sư phần mềm thực thụ: hiểu rõ từng gói tin mạng đi từ đâu tới đâu, tại sao database không bị xung đột khi nhiều thu ngân cùng bấm, và tại sao AI không thể bị lừa sửa giá ly trà sữa từ 40.000đ xuống 1.000đ.

---

# CHUYÊN ĐỀ 1: KIẾN TRÚC THIẾT KẾ DỰ ÁN (ARCHITECTURE & DESIGN PATTERNS)

## 1. Kiến trúc Next.js 15 App Router: Client Components vs. Server API Route Handlers

### Bản chất kỹ thuật
Dự án H2MilkTea được xây dựng trên nền tảng **Next.js 15 (App Router)** với cơ chế kết hợp giữa **CSR (Client-Side Rendering)** và **Serverless Backend (Node.js API Route Handlers)**.

```
[Trình duyệt Khách/Thu ngân] <--- (Mạng Internet / Wi-Fi quán) ---> [Vercel Serverless Function] <---> [Supabase PostgreSQL]
(Chạy React, State, DOM, Web Speech)                               (Chạy Node.js, Middleware, Bảng giá, Logic nghiệp vụ)
```

### Khi nào code chạy trên Trình duyệt (Client), khi nào chạy trên Máy chủ (Server)?

1. **Code chạy trên Trình duyệt của Khách / Thu ngân (Client Components)**:
   - **Nhận diện**: Mọi file có dòng chỉ thị `'use client';` ở đầu file.
   - **File thực tế**:
     - [`src/app/(dashboard)/pos/page.tsx`](file:///src/app/(dashboard)/pos/page.tsx): Giao diện bán hàng POS tại quầy.
     - [`src/app/(dashboard)/pos/hooks/useSharedCartDraft.ts`](file:///src/app/(dashboard)/pos/hooks/useSharedCartDraft.ts): Hook quản lý giỏ hàng đồng bộ.
     - [`src/app/(dashboard)/pos/components/POSAssistant.tsx`](file:///src/app/(dashboard)/pos/components/POSAssistant.tsx): Khung trợ lý ảo nhận diện giọng nói.
     - [`src/app/order/page.tsx`](file:///src/app/order/page.tsx): Giao diện khách ngồi tại bàn quét mã QR trên điện thoại.
   - **Nhiệm vụ trên Client**:
     - Lắng nghe thao tác người dùng (bấm chọn món, vuốt bàn, nhập số lượng).
     - Truy cập API của trình duyệt: `localStorage` (lưu ID thiết bị), `navigator.mediaDevices` / `window.SpeechRecognition` (thu âm giọng nói tiếng Việt).
     - Duy trì React State (`useState`, `useEffect`, `useRef`) để giao diện mượt mà không bị tải lại trang.

2. **Code chạy trên Máy chủ Vercel / Edge Runtime (Server Handlers & Middleware)**:
   - **Nhận diện**: Các file nằm trong thư mục `src/app/api/**/route.ts` và [`src/middleware.ts`](file:///src/middleware.ts).
   - **File thực tế**:
     - [`src/middleware.ts`](file:///src/middleware.ts): Chạy tại tầng Vercel Edge Runtime.
     - [`src/app/api/orders/route.ts`](file:///src/app/api/orders/route.ts): API tạo đơn hàng và kiểm tra giá.
     - [`src/app/api/pos/cart-draft/route.ts`](file:///src/app/api/pos/cart-draft/route.ts): API xử lý lưu giỏ hàng nháp dùng chung.
     - [`src/app/api/ai/chat/route.ts`](file:///src/app/api/ai/chat/route.ts): API trung chuyển gọi LLM Gemini.
   - **Nhiệm vụ trên Server**:
     - Nắm giữ các khóa bảo mật tối cao (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`). Trình duyệt khách hoàn toàn không thể xem được các khóa này.
     - Thực thi xác thực và phân quyền nhân viên (RBAC).
     - Truy vấn trực tiếp cơ sở dữ liệu Supabase PostgreSQL với toàn quyền Admin.
     - Tính toán tiền bạc, doanh thu, kiểm tra số lượng tồn kho.

> **💡 Ví dụ thực tế tại quán H2MilkTea:**
> Khách hàng mở điện thoại quét mã QR tại Bàn 04:
> - Màn hình chọn trà sữa, bấm nút tăng đá 70%, giảm đường 50% chạy hoàn toàn trên điện thoại khách (**Client**).
> - Khi khách bấm nút *"Gửi gọi món"*, điện thoại bắn một gói tin HTTP POST chứa thông tin giỏ hàng lên máy chủ Vercel (**Server**). Máy chủ tiếp nhận, kiểm tra xem Bàn 04 có đang hoạt động không, tính toán lại tổng tiền rồi ghi vào bảng `pos_orders` trong cơ sở dữ liệu.

---

## 2. Đồng bộ thời gian thực (Realtime WebSocket + Fallback Polling) & Khóa lạc quan (OCC)

### Vấn đề đặt ra tại quán trà sữa đông khách
Vào khung giờ cao điểm (19h – 21h), quán có 2 thu ngân: Thu ngân A cầm iPad đi đến từng bàn nhận gọi món, Thu ngân B đứng tại máy tính quầy bar. Cả hai người đều có thể cùng mở **Bàn số 05** để thao tác.  
- Nếu không có cơ chế đồng bộ: Thu ngân A thêm 2 Trà sữa nướng, Thu ngân B bấm thêm 1 Trà đào cam sả -> người bấm sau sẽ **ghi đè và làm mất đơn** của người bấm trước!
- Nếu khóa cứng bàn lại (Pessimistic Locking - Khóa bi quan): Thu ngân A đang mở bàn thì Thu ngân B bị chặn không được xem giỏ -> gây ức chế, chậm trễ phục vụ.

### Giải pháp kỹ thuật trong H2MilkTea: Kiến trúc 2 tầng (WebSocket + Polling + OCC)

#### Tầng 1: Lắng nghe qua WebSocket kết hợp Fallback Polling
Trong [`src/app/(dashboard)/pos/hooks/useSharedCartDraft.ts`](file:///src/app/(dashboard)/pos/hooks/useSharedCartDraft.ts):
- **Realtime WebSocket Channel** (dòng 90, 132-142): Khi Thu ngân A lưu giỏ thành công, hàm `saveMergedDraft` gửi một sự kiện broadcast `cart_sync` qua kênh WebSocket Supabase. Thiết bị của Thu ngân B nhận được tín hiệu này ngay lập tức (dưới 50ms) và gọi `applyDraft()` để cập nhật giỏ hàng trên màn hình.
- **Dự phòng rớt mạng bằng Fallback Polling** (dòng 85, 241-260): Wi-Fi quán trà sữa rất dễ bị chập chờn khi có đông khách kết nối. Nếu kết nối WebSocket bị đứt (`realtimeStatus !== 'SUBSCRIBED'`), hook tự động kích hoạt vòng lặp Polling (`fetchDraft`) định kỳ **3.5 giây một lần** (`pollDelayRef.current = 3500`). Nếu gặp lỗi mạng liên tiếp, hệ thống dùng thuật toán **Exponential Backoff** lùi thời gian thăm dò tối đa lên 10 giây để không gây nghẽn đường truyền.

#### Tầng 2: Kiểm soát xung đột lạc quan (Optimistic Concurrency Control - OCC) qua cột `version`
Trong bảng `pos_cart_drafts`, mỗi bàn có một dòng dữ liệu chứa cột `version` (kiểu số nguyên, bắt đầu từ 1):

```sql
TABLE pos_cart_drafts (
  table_id TEXT PRIMARY KEY,
  cart JSONB,
  version INT DEFAULT 1,
  updated_at TIMESTAMP
);
```

Trong file [`src/app/api/pos/cart-draft/route.ts`](file:///src/app/api/pos/cart-draft/route.ts) (hàm `PUT`, dòng 108–175):
1. Khi Thu ngân A mở Bàn 05, ứng dụng đọc được `version = 3`.
2. Khi Thu ngân A thêm 1 ly trà sữa và bấm lưu, máy tính A gửi yêu cầu:  
   `PUT /api/pos/cart-draft { tableId: "B05", expectedVersion: 3, cart: [...] }`.
3. Câu lệnh SQL cập nhật trên máy chủ được viết cực kỳ chặt chẽ (dòng 132–142):
   ```typescript
   const nextVersion = expectedVersion + 1; // 3 + 1 = 4
   const { data: updated, error } = await supabase
     .from('pos_cart_drafts')
     .update({ cart, version: nextVersion, updated_at: new Date().toISOString() })
     .eq('table_id', tableId)
     .eq('version', expectedVersion); // ĐIỀU KIỆN TIÊN QUYẾT: Version trong DB phải đúng bằng 3
   ```
4. **Trường hợp xung đột (Conflict)**:
   - Giả sử trong lúc Thu ngân A đang thao tác, Thu ngân B đã bấm lưu trước -> `version` trong DB đã nhảy lên `4`.
   - Khi gói tin của Thu ngân A gửi tới với `expectedVersion = 3`, điều kiện `.eq('version', 3)` sẽ **không khớp dòng nào** (`!updated`).
   - Máy chủ lập tức phát hiện có xung đột và trả về mã lỗi **HTTP 409 Conflict** (dòng 166–172):
     ```json
     {
       "success": false,
       "conflict": true,
       "error": "Giỏ hàng đã được cập nhật trên thiết bị khác.",
       "draft": current
     }
     ```
5. **Tự động gộp món thông minh (Auto-merge Diffing)**:
   - Trên Client ([`useSharedCartDraft.ts`](file:///src/app/(dashboard)/pos/hooks/useSharedCartDraft.ts), dòng 161–174 và 211–227), hàm `diffCartItems()` đối chiếu giỏ hàng cục bộ và giỏ hàng từ máy chủ.
   - Nếu Thu ngân A thêm "Trà sữa nướng", còn Thu ngân B thêm "Bánh tiramisu" (hai món khác nhau hoàn toàn), hệ thống sẽ **tự động gộp cả 2 món vào giỏ** mà không bắt người dùng phải nhập lại từ đầu.
   - Nếu cả 2 cùng sửa số lượng của cùng 1 ly trà sữa, giao diện sẽ hiển thị Modal cảnh báo để thu ngân quyết định lấy số lượng của ai.

---

## 3. Cơ chế Tính lũy đẳng (Idempotency Key) chống tạo đơn trùng lặp

### Vấn đề mạng lag tại quầy thu ngân
Khách thanh toán quét mã QR hoặc cà thẻ. Thu ngân bấm nút *"Thanh toán & Tạo đơn"*. Do mạng 4G hoặc Wi-Fi bị đơ 3 giây, màn hình chưa kịp hiện thông báo thành công. Theo phản xạ tự nhiên, thu ngân sẽ bấm thêm 2–3 lần nữa vào nút *"Tạo đơn"*.
- Nếu không có chống trùng: Quán sẽ tạo ra 3 đơn hàng giống hệt nhau trong database, trừ nguyên liệu 3 lần và in ra 3 hóa đơn thừa!

### Giải pháp kỹ thuật: Khóa lũy đẳng (Idempotency Key) bằng UUID
Trong toán học và khoa học máy tính, một hàm $f(x)$ được gọi là **lũy đẳng (Idempotent)** nếu áp dụng nó nhiều lần cũng cho ra kết quả y hệt như áp dụng một lần: $f(f(x)) = f(x)$.

Trong [`src/app/api/orders/route.ts`](file:///src/app/api/orders/route.ts) (dòng 139–203):
1. **Phía Client**: Mỗi lần bấm nút gửi đơn, client tự động sinh một chuỗi ngẫu nhiên duy nhất `crypto.randomUUID()` (ví dụ: `d8a2b3e4-8f12-4c55-9b2a-112233445566`) và gửi trong Header `idempotency-key` hoặc trong Body.
2. **Phía Server**:
   ```typescript
   // Bước 1: Kiểm tra khóa đã tồn tại trong DB chưa (dòng 143-146)
   const { data: existingOrder } = await supabase
     .from('pos_orders')
     .select('id, tracking_token, order_status')
     .eq('idempotency_key', idempotencyKey)
     .maybeSingle();

   if (existingOrder) {
     // ĐÃ CÓ RỒI: Trả về luôn thông tin đơn cũ kèm cờ duplicate: true, KHÔNG GHI THÊM ĐƠN MỚI
     return NextResponse.json({
       success: true,
       orderId: existingOrder.id,
       duplicate: true
     });
   }
   ```
3. **Bảo vệ tầng sâu nhất tại Database Constraint (PostgreSQL)**:
   - Trong bảng `pos_orders`, cột `idempotency_key` được gắn ràng buộc duy nhất: `UNIQUE(idempotency_key)`.
   - Nếu 2 request bay đến server cùng một mili-giây (Race condition), câu lệnh INSERT thứ hai sẽ vấp phải lỗi vi phạm ràng buộc khóa duy nhất của PostgreSQL (mã lỗi `23505`, dòng 195–198). Server bắt mã lỗi này và trả về đơn cũ thành công tốt đẹp, đảm bảo an toàn tuyệt đối cho doanh thu của quán.

---

# CHUYÊN ĐỀ 2: PHÂN QUYỀN & BẢO MẬT DỰ ÁN (AUTHENTICATION, RBAC & SECURITY)

## 1. Cơ chế Đăng nhập Supabase Auth (JWT Cookie) & Phân quyền RBAC qua bảng `DSNV`

### Phân tích luồng xác thực (Authentication Flow)
Dự án H2MilkTea không lưu thông tin đăng nhập trong LocalStorage (vì LocalStorage rất dễ bị tấn công qua lỗ hổng XSS - Cross-Site Scripting). Thay vào đó, dự án dùng gói chuẩn `@supabase/ssr` để lưu phiên trong **HTTP Cookie**.

```
[Trình duyệt Web] --- Gửi Cookie chứa authToken / Supabase Token ---> [Next.js Middleware (Edge)]
                                                                           |
                                            (Hợp lệ?) --- Cho qua ---> [API Route / Trang quản trị]
                                            (Chưa đăng nhập?) -------> [Redirect về trang login /]
```

Trong file [`src/lib/supabase/server.ts`](file:///src/lib/supabase/server.ts):
- Hàm `getAuthenticatedStaff(cookieHeader)` (dòng 14–68) phân tích chuỗi Header Cookie từ HTTP Request, khởi tạo Supabase Server Client thông qua `createServerClient` của `@supabase/ssr` và gọi `supabase.auth.getUser()`.
- Dự án còn có cơ chế Fallback (dòng 40–65) đọc cookie `staffUser` hoặc `authToken` giúp hệ thống không bị đơ gián đoạn nếu phiên Supabase Auth đám mây gặp sự cố mạng ngắn hạn.

### Phân quyền nhân sự RBAC (Role-Based Access Control)
Trong [`src/lib/supabase/server.ts`](file:///src/lib/supabase/server.ts), hàm `getStaffRole()` (dòng 75–129) thực hiện phân quyền theo thứ tự ưu tiên:
1. **Kiểm tra Siêu quản trị (Super Admin)**: Nếu username là `admin` hoặc email có dạng `admin@...` hoặc trong metadata có `role === 'admin'` -> Gán quyền `Admin: true`.
2. **Tra cứu bảng `DSNV` trên PostgreSQL**: Truy vấn cột `Phân quyền` của nhân viên ứng với `username` hoặc `Email`.
   - Nếu `Phân quyền === 'Admin'`: Có toàn quyền sửa menu, đổi giá bán, xem báo cáo doanh thu tài chính, cấu hình API Trợ lý AI, quản lý danh sách nhân sự.
   - Nếu `Phân quyền === 'Nhân viên'`: Chỉ được bán hàng tại màn hình `/pos`, xem đơn bếp tại `/kitchen`, tuyệt đối không được truy cập các trang cấu hình nhạy cảm.
3. **Fallback JSON cục bộ**: Nếu Supabase không phản hồi, hệ thống đối chiếu với file [`src/data/DSNV.json`](file:///src/data/DSNV.json) để đảm bảo nhân viên vẫn làm việc được.

### Cơ chế Kiểm tra Route trong `src/middleware.ts`
Trong file [`src/middleware.ts`](file:///src/middleware.ts):
- **Cấp mã Correlation ID** (dòng 8–11): Mọi request đi qua Edge Middleware đều được cấp một mã `x-correlation-id = crypto.randomUUID()`. Khi phát sinh lỗi, mã này được in ra log giúp lập trình viên tìm đúng vết request trong 5 giây.
- **Danh sách Route công khai (`publicRoutes`)** (dòng 24–28): Gồm `/` (trang đăng nhập), `/not-found` và toàn bộ các trang con của `/order/**` (dành cho khách quét QR đặt món).
- **Chặn truy cập trái phép** (dòng 111–119): Bất kỳ ai cố tình truy cập vào `/pos`, `/kitchen`, `/inventory`, `/reports` mà không có cookie `authToken` hợp lệ sẽ bị `NextResponse.redirect` ngay lập tức về trang đăng nhập `/` kèm tham số `returnUrl`.

---

## 2. Phân biệt `NEXT_PUBLIC_SUPABASE_ANON_KEY` và `SUPABASE_SERVICE_ROLE_KEY`

Đây là một trong những câu hỏi mà Hội đồng chuyên ngành An toàn thông tin và Hệ thống thông tin rất thích hỏi để kiểm tra xem sinh viên có hiểu về ranh giới bảo mật Client-Server hay không.

| Tiêu chí | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `SUPABASE_SERVICE_ROLE_KEY` |
| :--- | :--- | :--- |
| **Vị trí lưu trữ** | Công khai trong file `.env`, được đóng gói vào file Javascript gửi về trình duyệt khách. | Bí mật tuyệt đối trên máy chủ (Vercel Environment Variables / `.env.local`). |
| **Tiền tố biến** | Có tiền tố `NEXT_PUBLIC_` (Next.js cho phép client đọc). | Không có tiền tố `NEXT_PUBLIC_` (Chỉ chạy trong môi trường Node.js Server). |
| **Mức độ quyền hạn** | **Bị hạn chế (Restricted)**: Phụ thuộc vào chính sách **RLS (Row Level Security)** của PostgreSQL. | **Quyền tối cao (Bypass RLS)**: Bỏ qua mọi hàng rào RLS, có thể đọc/ghi/xóa mọi bảng trong Database. |
| **Nơi sử dụng trong code** | [`src/lib/supabase/client.ts`](file:///src/lib/supabase/client.ts) (giao diện POS, kênh Realtime). | Chỉ duy nhất tại [`src/lib/supabase/server.ts`](file:///src/lib/supabase/server.ts) trong hàm `createAdminSupabaseClient()`. |
| **Nguy cơ nếu lộ** | Kẻ xấu chỉ xem được dữ liệu công khai cho phép bởi RLS. | Kẻ xấu có thể xóa sạch toàn bộ cơ sở dữ liệu của quán! |

> **🎓 Câu trả lời mẫu trước Hội đồng:**  
> *"Thưa thầy cô, dự án của em tuân thủ nghiêm ngặt nguyên tắc Least Privilege (Đặc quyền tối thiểu). Khóa Anon Key chỉ đóng vai trò định danh ứng dụng ở phía Frontend và luôn bị kiểm soát bởi Row Level Security. Còn mọi thao tác nhạy cảm như ghi nhận doanh thu, trừ kho, tạo đơn hàng đều được chuyển qua API Route Handlers trên máy chủ Next.js và chỉ tại đó em mới dùng Service Role Key để thực thi với quyền Admin an toàn."*

---

## 3. Nguyên tắc Xác thực Giá phía Máy chủ (Server-side Price Validation)

### Lỗ hổng kinh điển: Tin tưởng dữ liệu từ Client
Một lỗi rất phổ biến của sinh viên làm đồ án là: Ở màn hình điện thoại, khách bấm chọn trà sữa giá 35.000đ; khi gửi request POST `/api/orders`, client gửi kèm payload `{ productId: "SP01", unitPrice: 35000 }`.  
Nếu máy chủ lấy luôn số `unitPrice: 35000` này để nhân số lượng rồi lưu vào bảng hóa đơn, kẻ xấu có thể dùng công cụ DevTools (F12) hoặc Postman sửa payload thành `{ productId: "SP01", unitPrice: 1000 }` để mua ly trà sữa với giá 1.000 đồng!

### Cách giải quyết triệt để trong `src/app/api/orders/route.ts`
Trong file [`src/app/api/orders/route.ts`](file:///src/app/api/orders/route.ts) (dòng 86–137):
1. **Máy chủ phớt lờ giá tiền client gửi lên**: Vòng lặp duyệt qua từng món trong mảng `items`:
   ```typescript
   // Bước 1: Tra cứu món trực tiếp từ Database DMHH trên Server
   const product = products.find((row) => row.IDSP === productId && row['Trạng thái'] === 'Hoạt động');
   if (!product) {
     return NextResponse.json({ success: false, error: 'Món không tồn tại.' }, { status: 400 });
   }

   // Bước 2: Lấy giá gốc niêm yết từ DB của quán
   const basePrice = Number(product['Đơn giá']);

   // Bước 3: Tính phụ thu theo quy chuẩn kích cỡ do Server quyết định (Size L +5.000đ)
   const sizeAdjust = isFood ? 0 : (normalizedSize === 'L' ? 5000 : 0);
   const expectedUnitPrice = basePrice + sizeAdjust; // Giá hợp lệ duy nhất được công nhận
   ```
2. **Kiểm tra chéo với đơn POS tại quầy** (dòng 113–124): Nếu đơn đến từ POS thu ngân mà giá bị lệch so với bảng giá chuẩn, máy chủ lập tức từ chối và cảnh báo `Giá của món đã thay đổi. Vui lòng tải lại menu`.
3. **Tính toán tổng tiền trên Server** (dòng 148–150):
   ```typescript
   const subtotal = canonicalItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
   const vatAmount = Math.round(subtotal * 0.1); // VAT 10%
   const totalAmount = subtotal + vatAmount;     // Tổng thanh toán cuối cùng
   ```
Khách hàng hay bất kỳ ai can thiệp vào đường truyền đều **không thể làm sai lệch dù chỉ 1 đồng** trong doanh thu của quán.

---

# CHUYÊN ĐỀ 3: CÔNG NGHỆ AI CHATBOT TRONG DỰ ÁN & SO SÁNH VỚI THỰC TẾ THỊ TRƯỜNG

## 1. Luồng hoạt động chi tiết của Trợ lý AI POS

Kiến trúc AI của H2MilkTea không phải là một con chatbot "chém gió" đơn thuần, mà là một **Hệ thống điều khiển bằng giọng nói đa tầng (Voice-driven Control System)** với độ chính xác cao.

```
[Giọng nói Thu ngân]
        │ (1. Web Speech API - vi-VN)
        ▼
[Văn bản Tiếng Việt thô]
        │ (2. POST /api/ai/chat)
        ▼
[Lớp 1: Rate Limiter & Security Guardrails] ──(Vi phạm?)──> [Chặn & Ghi log kiểm toán]
        │ (Hợp lệ)
        ▼
[Lớp 2: Bộ luật & Từ điển Alias (Rule Engine)] ──(Khớp 100%)──> [Trả về kết quả ngay (10ms)]
        │ (Câu nói tự nhiên phức tạp)
        ▼
[Lớp 3: LLM NLU (Google Gemini 2.5 Flash)] ──(Ép khuôn Structured JSON)
        │
        ▼
[Lớp 4: Catalog Resolution (NFD Normalization & F1-Score Token Matching)]
        │
        ▼
[Giao diện POS: Hiển thị Preview] ──(Thu ngân bấm Xác nhận)──> [Nạp vào Giỏ hàng thật]
```

### Bước 1: Nhận diện giọng nói tiếng Việt qua Web Speech API
- File: [`src/app/(dashboard)/pos/components/POSAssistant.tsx`](file:///src/app/(dashboard)/pos/components/POSAssistant.tsx) (hàm `startVoiceInput`, dòng 269–317).
- Sử dụng chuẩn `window.SpeechRecognition` hoặc `window.webkitSpeechRecognition` với ngôn ngữ `recognition.lang = 'vi-VN'`.
- Tích hợp tính năng **Auto-submit khi ngừng nói** (`autoSubmitVoice = true`, `voiceSilenceTimeoutMs = 1500`): Khi thu ngân dứt câu 1.5 giây, hệ thống tự động ngắt micro và chuyển câu lệnh văn bản đi phân tích.

### Bước 2: Chuẩn hóa tiếng Việt không dấu (NFD) & Thuật toán Token Scoring
- File: [`src/lib/ai/catalog.ts`](file:///src/lib/ai/catalog.ts).
- Khách hoặc thu ngân thường nói tắt: *"cho 2 cốc ts nướng"*, *"1 cf sữa"*, *"3 dcs"*.
- Hàm `normalizeSearchText()` (dòng 15–24) sử dụng chuẩn phân rã Unicode NFD (`.normalize('NFD').replace(/[\u0300-\u036f]/g, '')`), biến chữ "đ" thành "d", loại bỏ ký tự lạ và đưa về chữ thường.
- Hàm `expandAliases()` (dòng 63–68) tra cứu từ điển viết tắt:
  - `ts` -> `tra sua`
  - `cf` / `cafe` -> `ca phe`
  - `dcs` -> `tra dao cam sa`
  - `bx` -> `bac xiu`
  - `olong` -> `tra o long`
- Thuật toán `scoreProduct()` (dòng 70–102) tính toán độ tương đồng giữa câu nói và tên món trong thực đơn bằng chỉ số **$F_1$-Score** giữa Precision (độ chuẩn xác) và Recall (độ bao phủ):
  $$\text{Precision} = \frac{|\text{Tokens khớp}|}{|\text{Tokens trong câu gọi}|}, \quad \text{Recall} = \frac{|\text{Tokens khớp}|}{|\text{Tokens tên món}|}$$
  $$F_1 = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$$
  Ngưỡng chấp nhận `MATCH_THRESHOLD = 0.6`. Nếu món đứng đầu cách món thứ hai $\ge 0.10$ điểm (`AMBIGUITY_MARGIN`), hệ thống tự tin chọn ngay món đó.

### Bước 3: Phân tích NLU bằng Google Gemini với Structured JSON Output
- File: [`src/lib/ai/pipeline.ts`](file:///src/lib/ai/pipeline.ts) (dòng 207–260) và [`src/app/api/ai/chat/route.ts`](file:///src/app/api/ai/chat/route.ts).
- Yêu cầu mô hình LLM phân tích ý định (Intent) và thực thể (Entities), ép trả về JSON theo khuôn mẫu cố định (`AiOutputSchema`):
  ```json
  {
    "action": "add",
    "targetTable": { "id": "B02", "name": "Bàn 2" },
    "items": [
      {
        "productName": "Trà sữa nướng",
        "quantity": 3,
        "sugar": "50%",
        "ice": "70%",
        "size": "L"
      }
    ],
    "message": "Đã chuẩn bị 3 trà sữa nướng (Size L, 50% đường, 70% đá) cho Bàn 2."
  }
  ```
- **Hàng rào an toàn (Security Guardrails)** (dòng 112–139): Nghiêm cấm AI không được tự ý xóa bàn, không được sửa giá tiền và không được tự động thanh toán.

### Bước 4: Nguyên lý Human-in-the-Loop (Người kiểm duyệt)
- Trong [`src/app/(dashboard)/pos/components/POSAssistant.tsx`](file:///src/app/(dashboard)/pos/components/POSAssistant.tsx) (dòng 197–249):
- AI **chỉ có quyền gợi ý và hiển thị hộp thoại xem trước (Preview)** các món đã bóc tách. Thu ngân phải nhìn mắt thấy, tai nghe và dùng tay bấm nút **"Xác nhận" (Checkmark)** thì hàm `confirmItems()` mới thực sự gọi `onAddToCart` để đưa món vào giỏ hàng thật.
- Nếu AI hiểu sai, thu ngân bấm nút **"Hủy" (X)**, hệ thống lập tức gửi một gói tin tới `/api/ai/audit` ghi nhận trạng thái `rejected` để phục vụ cải tiến mô hình.

---

## 2. So sánh Kiến trúc AI H2MilkTea với các Phương pháp trên Thị trường

Khi bảo vệ Đồ án, các thầy cô trong Hội đồng rất hay đặt các câu hỏi so sánh công nghệ để xem bạn có hiểu tại sao mình lại chọn phương án này hay chỉ là "thấy người ta làm thì làm theo".

| Phương pháp | Nguyên lý hoạt động | Ưu điểm | Nhược điểm lớn đối với bài toán POS F&B | Áp dụng trong H2MilkTea |
| :--- | :--- | :--- | :--- | :--- |
| **Fine-tuning (Huấn luyện lại mô hình)** | Lấy mô hình gốc (LLaMA, GPT), chuẩn bị hàng chục nghìn cặp câu hỏi-đáp rồi train lại trọng số mạng nơ-ron (weights). | Bắt chước giọng văn tốt. | ❌ Cực kỳ đắt đỏ, tốn GPU. Khi quán **thay đổi giá hoặc thêm món mới vào menu**, mô hình sẽ bị kiến thức cũ (Outdated) và phải train lại từ đầu! | ❌ **Không dùng** vì không phù hợp với thực tế kinh doanh F&B luôn thay đổi menu. |
| **RAG (Retrieval-Augmented Generation)** | Cắt tài liệu thành các đoạn nhỏ (chunks), biến thành vector (Embeddings) lưu vào Vector Database (Pinecone, pgvector) rồi tìm kiếm ngữ nghĩa. | Rất tốt để đọc tài liệu dài (PDF chính sách, sách luật, sổ tay nội bộ). | ❌ Quá nặng nề cho bảng thực đơn 50 món. Tìm kiếm vector dễ bị nhầm lẫn giữa "Trà sữa khoai môn" và "Trà khoai môn" vì điểm vector gần giống nhau. | ⚠️ **Chỉ dùng dạng RAG rút gọn** cho mục hỏi đáp FAQ quán. |
| **Function Calling / Tool Use** | LLM tự quyết định gọi API nào thông qua danh sách định nghĩa Tools. | Tự động hóa linh hoạt. | ❌ Độ trễ cao (phải gọi 2 lượt LLM). Tiềm ẩn rủi ro nếu LLM tự ý gọi hàm thanh toán mà không có người kiểm soát. | ❌ Thay thế bằng cơ chế Human-in-the-Loop an toàn hơn. |
| **Kiến trúc H2MilkTea (Hybrid: Rules + NFD Scoring + LLM JSON + Server Guard)** | Kết hợp 4 tầng: Lọc từ điển cục bộ -> LLM hiểu ngữ nghĩa xuất JSON -> Thuật toán F1-Score so khớp IDSP gốc -> Thu ngân bấm duyệt bằng tay. | ✅ **Siêu nhanh**: Câu lệnh chuẩn xử lý chỉ mất 10ms.<br>✅ **Bảo mật tuyệt đối**: AI không có quyền đụng vào tiền bạc.<br>✅ **Cập nhật menu tức thì**: Đổi giá trong DB là AI hiểu ngay không cần train lại. | Cần đầu tư công sức viết bộ luật và chuẩn hóa tiếng Việt chu đáo ban đầu. | ✅ **Đây là kiến trúc cốt lõi của đồ án!** |

> **🎓 Câu hỏi vàng: "Tại sao em không dùng Fine-tuning cho Chatbot của quán trà sữa?"**  
> **Đáp án ghi điểm tuyệt đối trước Hội đồng:**  
> *"Thưa thầy cô, Fine-tuning là kỹ thuật dùng để dạy cho mô hình một phong cách hành văn mới hoặc một cấu trúc dữ liệu đặc thù, chứ không phải để cập nhật dữ liệu nghiệp vụ thay đổi hàng ngày. Trong một quán trà sữa, menu món, giá tiền và topping biến động liên tục theo tuần và theo chương trình khuyến mãi. Nếu dùng Fine-tuning, mỗi lần quán đổi giá ly trà đào từ 30k lên 35k em lại phải tốn hàng giờ đồng hồ và hàng trăm USD để huấn luyện lại mô hình.*  
> *Do đó, em lựa chọn kiến trúc **Hybrid kết hợp In-Context Learning với Structured JSON Schema và Thuật toán tra cứu danh mục thời gian thực (Catalog Matcher)**. Toàn bộ danh mục món được nạp động từ bảng DMHH trên cơ sở dữ liệu. Khi quán sửa giá món, AI ngay lập tức cập nhật kiến thức mới trong vòng 1 giây với chi phí vận hành 0 đồng!"*

---

# CHUYÊN ĐỀ 4: LỘ TRÌNH ÔN TẬP 14 NGÀY & 20 CÂU HỎI VẤN ĐÁP BẢO VỆ ĐỒ ÁN

## 1. Lộ trình ôn tập 14 ngày (Mỗi ngày 30–45 phút)

Để không bị "ngợp" kiến thức, bạn chỉ cần mở đúng file và đọc đúng các dòng code đã được chỉ rõ dưới đây:

| Ngày | Trọng tâm nghiên cứu | File cần mở lên đọc | Dòng code trọng tâm | Mục tiêu cần đạt |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Cấu trúc tổng quan Next.js 15 | `src/app/(dashboard)/layout.tsx`, `src/middleware.ts` | Dòng 1–120 | Hiểu luồng request đi qua Middleware, sinh Correlation ID và kiểm tra cookie. |
| **2** | Đăng nhập & RBAC Server-side | `src/lib/supabase/server.ts` | Dòng 14–129 | Nắm rõ hàm `getAuthenticatedStaff` và `getStaffRole` tra cứu bảng `DSNV`. |
| **3** | Phân biệt 2 loại Khóa bí mật | `src/lib/supabase/server.ts`, `.env.example` | Dòng 5–12 | Giải thích rành rọt vì sao Service Role Key không bao giờ được gửi ra browser. |
| **4** | Giao diện Bán hàng POS | `src/app/(dashboard)/pos/page.tsx` | Phần state & giỏ hàng | Hiểu cách màn hình POS render danh sách bàn và cập nhật giỏ hàng cục bộ. |
| **5** | Cơ chế Khóa lạc quan (OCC) Server | `src/app/api/pos/cart-draft/route.ts` | Dòng 108–175 (PUT) | Thấy rõ câu lệnh SQL `.eq('version', expectedVersion)` trả về lỗi 409 thế nào. |
| **6** | Cơ chế Hook đồng bộ nhiều máy | `src/app/(dashboard)/pos/hooks/useSharedCartDraft.ts` | Dòng 62–151 | Hiểu cách lưu nháp, gửi broadcast WebSocket và fallback polling chu kỳ 3.5s. |
| **7** | Thuật toán gộp giỏ hàng Diffing | `src/lib/cart/mergeCart.ts`, `useSharedCartDraft.ts` | Dòng 153–239 | Hiểu tại sao 2 máy cùng bấm 2 món khác nhau lại tự động gộp được vào giỏ. |
| **8** | Chống gửi trùng đơn (Idempotency) | `src/app/api/orders/route.ts` | Dòng 139–203 | Giải thích cách dùng UUID và cột `idempotency_key UNIQUE` trong DB để chặn F5. |
| **9** | Xác thực giá phía Server | `src/app/api/orders/route.ts` | Dòng 86–137 | Nắm vững lý do máy chủ tra lại bảng `DMHH` và cộng 5.000đ cho Size L. |
| **10** | Trang Khách quét QR gọi món | `src/app/order/page.tsx`, `src/lib/qr/token.ts` | Dòng kiểm tra token & IP | Giải thích cách quán chống khách đặt đơn ảo từ xa bằng QR Token và Rate Limit. |
| **11** | Nhận diện giọng nói POS AI | `src/app/(dashboard)/pos/components/POSAssistant.tsx` | Dòng 269–317 | Nắm cơ chế Web Speech API, tự động nộp lệnh khi dứt lời sau 1.5 giây. |
| **12** | Chuẩn hóa tiếng Việt NFD & F1-Score | `src/lib/ai/catalog.ts` | Dòng 15–103 | Tự tin giải thích cách đổi "ts" thành "trà sữa" và công thức tính điểm F1. |
| **13** | AI Pipeline & Ép khuôn JSON | `src/lib/ai/pipeline.ts` | Dòng 92–220 | Hiểu 3 lớp: Rate Limit -> Rule Engine -> Google Gemini -> Human-in-the-Loop. |
| **14** | Tập dượt phản xạ 20 câu hỏi | Đọc lại Mục 2 Chuyên đề 4 này | Toàn bộ 20 câu hỏi | Đóng vai đứng trước gương tự trả lời to, rõ ràng, dứt khoát từng câu hỏi. |

---

## 2. Tổng hợp 20 câu hỏi vấn đáp hóc búa nhất của Hội đồng (Kèm đáp án mẫu)

### Nhóm 1: Về Kiến trúc & Cơ sở dữ liệu (Database & Architecture)

#### Câu 1: Em hãy giải thích mô hình kiến trúc tổng thể của dự án H2MilkTea?
- **Trả lời:**  
  *"Thưa thầy cô, dự án áp dụng mô hình kiến trúc Next.js 15 App Router kết hợp Serverless Backend và Cơ sở dữ liệu đám mây Supabase PostgreSQL. Hệ thống chia làm 4 tầng rõ rệt:  
  1. Tầng Client: Gồm POS thu ngân, Khách quét QR và Màn hình bếp KDS chạy bằng React Client Components.  
  2. Tầng Edge & Gateway: Next.js Middleware đảm nhiệm gán Correlation ID và phân luồng bảo vệ route; Supabase Realtime Gateway phát sóng WebSocket.  
  3. Tầng Serverless API: Các API Route Handlers trên Node.js xử lý nghiệp vụ, kiểm tra giá, chống trùng đơn và phân quyền nhân sự.  
  4. Tầng Database & AI: Supabase PostgreSQL lưu trữ dữ liệu tập trung và Google Gemini 2.5 Flash xử lý ngôn ngữ tự nhiên."*

#### Câu 2: Khóa lạc quan (Optimistic Concurrency Control - OCC) trong dự án của em hoạt động thế nào?
- **Trả lời:**  
  *"Thưa thầy cô, OCC được cài đặt tại API `cart-draft/route.ts` thông qua cột `version` kiểu số nguyên trong bảng `pos_cart_drafts`. Khi client đọc giỏ hàng sẽ nhận về `version` hiện tại (ví dụ = 2). Khi client lưu giỏ mới, nó bắt buộc phải gửi kèm `expectedVersion = 2`. Máy chủ thực hiện câu lệnh UPDATE với điều kiện `WHERE table_id = ? AND version = 2` và tăng version lên 3. Nếu trước đó đã có thiết bị khác sửa trước làm version nhảy lên 3, câu lệnh UPDATE sẽ không tìm thấy dòng nào, máy chủ phát hiện xung đột và trả về mã lỗi HTTP 409 Conflict kèm giỏ hàng mới nhất để client giải quyết."*

#### Câu 3: Tại sao em không dùng Khóa bi quan (Pessimistic Locking) khóa luôn bàn lại?
- **Trả lời:**  
  *"Thưa thầy cô, trong nghiệp vụ F&B, quán trà sữa cần tốc độ phục vụ rất nhanh. Nếu dùng Khóa bi quan (khóa cứng bàn lại mỗi khi có một thu ngân mở ra xem), các nhân viên khác sẽ bị chặn không thể xem bàn hay thêm món phụ, gây nghẽn nghiệp vụ tại quầy. OCC cho phép tất cả các máy đọc và sửa tự do, chỉ can thiệp khi có xung đột ghi đè đồng thời thực sự xảy ra, tối ưu hóa tối đa trải nghiệm người dùng."*

#### Câu 4: Khi mạng quán trà sữa bị đứt WebSocket, hệ thống làm sao để tiếp tục đồng bộ?
- **Trả lời:**  
  *"Thưa thầy cô, trong hook `useSharedCartDraft.ts`, em thiết kế cơ chế phòng vệ 2 lớp (Dual-layer Sync). Kênh WebSocket Realtime là kênh ưu tiên số 1 để nhận dữ liệu tức thì dưới 50ms. Nếu WebSocket mất kết nối, hệ thống tự động chuyển sang cơ chế Fallback Polling chu kỳ 3.5 giây một lần gửi yêu cầu GET tới API `/api/pos/cart-draft` để lấy giỏ hàng mới nhất, đảm bảo nhân viên không bao giờ bị mất liên lạc với máy chủ."*

#### Câu 5: Bảng `pos_orders` lưu trữ dữ liệu món ăn thế nào? Sao em không tách ra bảng `order_items`?
- **Trả lời:**  
  *"Thưa thầy cô, trong thiết kế của em, các món trong đơn hàng được lưu dưới dạng trường JSONB `items` trong bảng `pos_orders`. Lý do là trong ngành F&B, một món có rất nhiều tùy chọn biến động (kích cỡ size, phần trăm đường, phần trăm đá, danh sách 3–4 loại topping đi kèm và ghi chú khách hàng). Lưu dạng JSONB giúp truy vấn toàn bộ hóa đơn chỉ trong 1 câu lệnh SELECT duy nhất mà không cần JOIN phức tạp qua 3 bảng, đồng thời bảo toàn trọn vẹn lịch sử tên món và giá tiền tại thời điểm xuất hóa đơn kể cả sau này danh mục menu gốc có thay đổi."*

---

### Nhóm 2: Về Tính toàn vẹn Dữ liệu & Xử lý Giao dịch (Transaction & Integrity)

#### Câu 6: Tính lũy đẳng (Idempotency) là gì và em áp dụng nó vào đâu?
- **Trả lời:**  
  *"Thưa thầy cô, tính lũy đẳng nghĩa là việc một API nhận cùng một yêu cầu nhiều lần thì trạng thái của hệ thống và kết quả trả về vẫn y hệt như khi chỉ thực hiện một lần. Em áp dụng tính lũy đẳng trong API `/api/orders/route.ts` bằng mã `idempotency_key` (UUID). Mỗi khi client gửi đơn hàng, nó tự tạo một chuỗi UUID duy nhất. Nếu mạng lag nhân viên bấm nút tạo đơn 3 lần, máy chủ chỉ tạo đúng 1 đơn hàng ở lần đầu tiên; 2 lần gửi sau máy chủ nhận diện đã có UUID này trong database nên trả về ngay đơn cũ kèm cờ `duplicate: true`, ngăn chặn tuyệt đối việc tạo đơn trùng lặp."*

#### Câu 7: Nếu 2 yêu cầu cùng Idempotency Key gửi tới máy chủ cùng đúng 1 mili-giây thì sao?
- **Trả lời:**  
  *"Thưa thầy cô, em đã thiết lập ràng buộc duy nhất `UNIQUE(idempotency_key)` trực tiếp ở tầng Database PostgreSQL của bảng `pos_orders`. Khi 2 transaction gửi đến cùng một thời điểm vi mô, cơ chế khóa dòng của PostgreSQL sẽ cho 1 transaction thành công, transaction thứ hai sẽ bị bắn lỗi vi phạm ràng buộc khóa duy nhất (mã lỗi PostgreSQL `23505`). Tại dòng 195 trong file `orders/route.ts`, code của em đã chủ động bắt lỗi 23505 này để truy vấn lại đơn cũ và trả về thành công cho người dùng mà không làm sập server."*

#### Câu 8: Tại sao máy chủ không tin giá tiền gửi lên từ ứng dụng của khách?
- **Trả lời:**  
  *"Thưa thầy cô, theo nguyên tắc Zero Trust trong bảo mật, mọi dữ liệu đến từ Client đều có thể bị kẻ xấu can thiệp bằng cách can thiệp gói tin HTTP hoặc dùng DevTools sửa giá. Do đó trong file `orders/route.ts`, máy chủ hoàn toàn phớt lờ trường đơn giá client gửi lên. Máy chủ tự động lấy mã `productId`, tra cứu giá gốc niêm yết trong bảng `DMHH` lưu trên Database, cộng thêm 5.000đ nếu chọn Size L, rồi tự nhân số lượng và cộng thuế VAT 10%. Nhờ đó doanh thu của quán được bảo toàn 100%."*

#### Câu 9: Cơ chế Self-healing (Tự phục hồi) khi cơ sở dữ liệu lỗi schema hoạt động thế nào?
- **Trả lời:**  
  *"Thưa thầy cô, trong quá trình nâng cấp hệ thống thực tế, schema cache của Supabase có thể chưa kịp cập nhật một số cột mới thêm (như cột `expires_at` gây ra lỗi PostgREST mã `PGRST204`). Trong `orders/route.ts` (dòng 182–192), em viết hàm `isMissingExpiresAtError()`. Nếu gặp lỗi này, máy chủ tự động chuyển sang chế độ tự phục hồi (Self-healing), tự động loại bỏ trường lỗi và INSERT lại đơn hàng an toàn mà không làm gián đoạn việc mua bán của khách."*

#### Câu 10: Đơn hàng khách đặt qua mã QR được quản lý vòng đời (Lifecycle) như thế nào?
- **Trả lời:**  
  *"Thưa thầy cô, đơn hàng từ khách quét mã QR ban đầu sẽ mang trạng thái `awaiting_confirmation` (Chờ thu ngân duyệt). Đơn này có trường `expires_at` với hạn giờ đúng 15 phút. Trong vòng 15 phút, nếu thu ngân bấm 'Nhận đơn' trên màn hình POS thì đơn mới được chuyển sang trạng thái `accepted` và bắn tín hiệu sang màn hình bếp KDS để pha chế. Nếu quá 15 phút mà không ai nhận, API sẽ tự động chuyển đơn thành `expired` (Hết hạn), giúp quán tránh được các đơn ảo do khách quét QR nghịch phá rồi bỏ về."*

---

### Nhóm 3: Về Phân quyền & An toàn Thông tin (Security & RBAC)

#### Câu 11: Em hãy phân biệt vai trò của Middleware và API Route trong việc bảo mật?
- **Trả lời:**  
  *"Thưa thầy cô, Middleware chạy ở tầng Vercel Edge Runtime ngay khi request vừa chạm vào hệ thống. Nhiệm vụ của Middleware là bảo vệ bề mặt: kiểm tra sự tồn tại của Cookie `authToken` để chặn người chưa đăng nhập không được vào các trang nội bộ (`/pos`, `/kitchen`, `/reports`) và gán mã truy vết `x-correlation-id`. Còn API Route Handlers chạy trên Node.js Server phía sau, đảm nhiệm kiểm tra sâu hơn về mặt nghiệp vụ (RBAC): tra cứu bảng `DSNV` xem tài khoản này là Admin hay Nhân viên để cấp quyền truy cập dữ liệu tương ứng."*

#### Câu 12: Tại sao em không lưu token đăng nhập vào `localStorage`?
- **Trả lời:**  
  *"Thưa thầy cô, `localStorage` có thể bị truy cập bởi bất kỳ đoạn mã JavaScript nào chạy trên trang. Nếu ứng dụng không may dính lỗi XSS (Cross-Site Scripting) từ một thư viện bên thứ ba, kẻ tấn công có thể đánh cắp token dễ dàng. Do đó, em sử dụng gói `@supabase/ssr` lưu token trong HTTP Cookie, giúp tăng cường bảo mật và cho phép Server/Middleware đọc được phiên đăng nhập ngay trong giai đoạn SSR trước khi trang kịp render."*

#### Câu 13: Khi nào dùng Anon Key, khi nào bắt buộc phải dùng Service Role Key?
- **Trả lời:**  
  *"Thưa thầy cô, `NEXT_PUBLIC_SUPABASE_ANON_KEY` được dùng ở phía trình duyệt khách (Client) cho các thao tác thông thường và luôn bị giới hạn bởi các chính sách bảo mật dòng (Row Level Security - RLS). Còn `SUPABASE_SERVICE_ROLE_KEY` là khóa quản trị tối cao có quyền bypass mọi chính sách RLS, khóa này chỉ được lưu trữ bí mật trên server (file `server.ts`) và tuyệt đối không bao giờ được gửi về trình duyệt của khách hàng."*

#### Câu 14: Hệ thống ngăn chặn tấn công đặt đơn phá hoại qua mã QR bàn bằng cách nào?
- **Trả lời:**  
  *"Thưa thầy cô, em bảo vệ qua 3 lớp:  
  1. Rate Limiting: Giới hạn tần suất đặt đơn theo cặp IP máy khách và ID bàn (`checkOrderRateLimit`), nếu gửi liên tục trong 1 phút sẽ bị chặn ngay mã lỗi 429.  
  2. QR Token ký số: Mã QR dán tại bàn có kèm mã xác thực có thời hạn được tạo bởi HMAC SHA-256 (`verifyTableQrToken`).  
  3. Duyệt thủ công: Mọi đơn QR bắt buộc phải được thu ngân bấm duyệt trên POS thì bếp mới làm món."*

#### Câu 15: Mã Correlation ID có tác dụng gì trong việc vận hành thực tế?
- **Trả lời:**  
  *"Thưa thầy cô, trong kiến trúc phân tán (Distributed System), khi người dùng báo lỗi 'Tôi bấm thanh toán bị xoay tròn', việc tìm kiếm trong hàng triệu dòng log là cực kỳ khó khăn. Trong `middleware.ts`, mỗi request được sinh một mã UUID duy nhất và gán vào header `x-correlation-id`. Mã này đi xuyên suốt từ Middleware, API Route cho đến Database log. Khi có sự cố, kỹ sư chỉ cần tìm đúng chuỗi mã này là xem được toàn bộ hành trình của gói tin trong vòng 5 giây."*

---

### Nhóm 4: Về Trí tuệ Nhân tạo & Xử lý Ngôn ngữ Tự nhiên (AI & NLU)

#### Câu 16: Em hãy trình bày quy trình từ lúc thu ngân nói vào micro cho tới khi món được thêm vào giỏ?
- **Trả lời:**  
  *"Thưa thầy cô, quy trình diễn ra qua 5 bước:  
  1. Thu ngân bấm micro nói, Web Speech API trên trình duyệt chuyển âm thanh thành văn bản tiếng Việt thô.  
  2. Client gửi POST `/api/ai/chat` lên máy chủ. Máy chủ kiểm tra Rate Limit và kiểm tra từ ngữ vi phạm bảo mật.  
  3. Câu lệnh đi qua bộ luật Rule Engine; nếu phức tạp sẽ chuyển cho mô hình Google Gemini 2.5 Flash để bóc tách ý định và thực thể dưới dạng Structured JSON.  
  4. Module Catalog Matcher chuẩn hóa tiếng Việt NFD, mở rộng từ viết tắt (ts -> trà sữa) và dùng thuật toán F1-Score tìm chính xác mã IDSP trong DB.  
  5. Máy chủ trả kết quả về màn hình POS hiển thị khung xem trước (Preview). Thu ngân nhìn thấy đúng món và bấm nút 'Xác nhận' thì món mới chính thức được thêm vào giỏ."*

#### Câu 17: Tại sao em không dùng Fine-tuning cho bài toán trợ lý POS trà sữa?
- **Trả lời:**  
  *"Thưa thầy cô, Fine-tuning rất tốn kém chi phí phần cứng và thời gian huấn luyện, đặc biệt là không thể thích ứng với môi trường F&B khi thực đơn, giá tiền và topping thay đổi liên tục. Nếu dùng Fine-tuning, mỗi lần quán đổi giá hoặc thêm món mới em lại phải huấn luyện lại toàn bộ mô hình. Thay vào đó, em chọn kiến trúc Hybrid: kết hợp Mô hình nền tảng (Foundation Model) làm nhiệm vụ hiểu ngôn ngữ tự nhiên với Cơ sở dữ liệu động DMHH nạp vào qua prompt. Nhờ đó, bất cứ khi nào quán đổi giá trong database, AI lập tức hiểu và áp dụng giá mới ngay mà không tốn 1 đồng chi phí train lại."*

#### Câu 18: Thuật toán F1-Score trong `catalog.ts` giải quyết vấn đề gì?
- **Trả lời:**  
  *"Thưa thầy cô, khi thu ngân nói 'cho 2 cốc trà sữa nướng', câu này chứa nhiều từ phụ như 'cho', 'cốc'. Thuật toán F1-Score là trung bình điều hòa giữa Precision (độ chuẩn xác: tỷ lệ từ đúng trên tổng số từ thu ngân nói) và Recall (độ bao phủ: tỷ lệ từ đúng trên tên gốc của món). Chỉ số F1 giúp hệ thống không bị đánh lừa bởi các câu nói dài dòng, đảm bảo chọn đúng món 'Trà sữa nướng' với độ tin cậy cao nhất kể cả khi người dùng nói thừa từ."*

#### Câu 19: Nguyên lý Human-in-the-Loop thể hiện như thế nào trong module AI của em?
- **Trả lời:**  
  *"Thưa thầy cô, Human-in-the-Loop nghĩa là luôn có sự kiểm soát của con người trong các quyết định quan trọng. AI trong H2MilkTea không bao giờ có quyền tự ý tạo đơn, tự ý xóa bàn hay thanh toán trừ tiền khách. AI chỉ đóng vai trò trợ lý lắng nghe và soạn sẵn bản nháp xem trước (Preview). Thu ngân là người ra quyết định cuối cùng bằng cách bấm nút Xác nhận (Confirm) hoặc Từ chối (Reject). Điều này loại bỏ hoàn toàn nguy cơ mất mát tài chính do AI nghe nhầm giọng nói trong môi trường quán ồn ào."*

#### Câu 20: Nhật ký kiểm toán AI (AI Audit Log) lưu trữ những thông tin gì và nhằm mục đích gì?
- **Trả lời:**  
  *"Thưa thầy cô, mọi tương tác của AI đều được ghi vào bảng `ai_audit_logs` trên Supabase thông qua hàm `createAuditLog()`. Bảng này lưu: Mã nhân viên gọi lệnh, câu nói thô ban đầu, JSON bóc tách được, độ trễ phản hồi (latency tính bằng mili-giây) và trạng thái cuối cùng (nhân viên bấm duyệt hay bấm hủy). Dữ liệu này giúp chủ quán đánh giá được hiệu quả thực tế của AI, biết được những câu lệnh nào AI thường xuyên hiểu sai để bổ sung từ viết tắt vào từ điển Alias, giúp hệ thống ngày càng thông minh hơn."*

---

## LỜI CHÚC TỪ GIẢNG VIÊN HƯỚNG DẪN (AGENT 3)

Bảo vệ Đồ án tốt nghiệp là bước ngoặt quan trọng khép lại 4 năm đại học của bạn. Hãy ghi nhớ rằng: **Sự tự tin đến từ sự thấu hiểu**.  
Khi bạn đứng trước Hội đồng, hãy mỉm cười, trình bày mạch lạc, tự tin trích dẫn đúng tên file, hàm xử lý và mở ngay sơ đồ kiến trúc tương tác `docs/h2milktea-interactive-architecture.html` để minh họa trực quan.

Chúc bạn có một buổi bảo vệ Đồ án thành công rực rỡ và đạt điểm số xuất sắc nhất!
