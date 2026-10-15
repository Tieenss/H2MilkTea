# POS Fix Notes

## Mục tiêu

Ổn định các luồng POS cốt lõi và đồng bộ đa thiết bị trước khi tích hợp AI Assistant. Không triển khai AI order lên production khi các luồng bên dưới chưa đạt.

## P0 - Phải sửa trước khi sang giai đoạn AI

### 1. Đồng bộ đổi bàn

- Khi chuyển từ bàn 3 sang bàn 4, không được chỉ sao chép cart sang bàn 4.
- Bản nháp của bàn 3 phải được xóa hoặc chuyển sang trạng thái không còn hoạt động.
- Máy A và máy B phải cùng thấy:
  - Bàn 4 nhận đúng cart.
  - Bàn 3 trở về trạng thái trống hoặc không còn cart.
  - Không còn tổng tiền cũ hiển thị khi chọn bàn 3.
- Thao tác chuyển bàn cần có cơ chế version/conflict giống cart draft.
- Cần xử lý trường hợp máy khác vừa cập nhật bàn 3 hoặc bàn 4.

### 2. Xóa toàn bộ giỏ hàng

- Không xóa ngay khi người dùng bấm nút.
- Hiển thị hộp thoại xác nhận rõ ràng:
  - "Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng của bàn này không?"
  - Nêu rõ số món và tổng tiền sắp bị xóa.
- Chỉ xóa bản nháp sau khi người dùng xác nhận.
- Sau khi xóa, mọi thiết bị đang mở bàn phải nhận cart rỗng và cập nhật tổng tiền.
- Có thể cân nhắc nút "Hủy" được chọn mặc định để tránh bấm nhầm.

### 3. Đồng bộ danh sách/chọn bàn

- Khi máy B xóa cart của bàn 3, máy A phải cập nhật ngay:
  - Trạng thái bàn.
  - Số lượng món.
  - Tổng tiền.
  - Trạng thái "đang hoạt động/trống".
- Khi mở menu chọn bàn, dữ liệu phải lấy từ nguồn trạng thái dùng chung, không chỉ từ state cục bộ.
- Cần có Realtime event hoặc cơ chế refresh có version cho thay đổi cart/table.
- Không được để máy A tiếp tục hiển thị bàn 3 đang hoạt động với giá trị của cart đã bị xóa.

### 4. Đồng bộ khách hàng

- Khi máy A chọn hoặc đổi khách hàng cho một bàn, máy B phải nhận được thay đổi.
- Khi bỏ chọn khách hàng, máy B cũng phải trở về khách lẻ.
- `selected_customer` phải được lưu trong cart draft hoặc một state draft riêng và phát qua Realtime.
- Cần tránh ghi đè khách hàng mới bằng một bản draft cũ đến từ thiết bị khác.

### 5. Thanh toán bị lỗi HTTP 500

Điều tra theo thứ tự:

- Kiểm tra log Vercel/Next.js của request thanh toán để lấy lỗi gốc, không chỉ thông báo 500 trên UI.
- Kiểm tra tài khoản test đã đăng nhập bằng Supabase Auth hay chỉ có dữ liệu nhân viên cũ trong JSON/localStorage.
- Kiểm tra cookie/session có được gửi tới API Route hay không.
- Kiểm tra `SUPABASE_SERVICE_ROLE_KEY` có được cấu hình trong Vercel Preview và đúng Supabase project không.
- Kiểm tra migration/schema của bảng hóa đơn, chi tiết hóa đơn và các bảng liên quan đã chạy trên database Preview chưa.
- Kiểm tra RLS/policy và quyền của tài khoản test.
- Kiểm tra payload thanh toán, đặc biệt `IDBAN`, `IDHOADON`, tổng tiền, phương thức thanh toán và idempotency.
- API phải trả lỗi nghiệp vụ cụ thể trong log/server response; không nuốt lỗi thành 500 chung chung.
- Không giải quyết bằng cách cấp service role key cho frontend.

## P1 - Phải sửa trước khi bật QR production

### 6. Đơn QR không đến POS

- Kiểm tra khách QR có tạo được row trong `pos_orders` với `source = 'QR_TABLE'` hay không.
- Kiểm tra Supabase Realtime publication đã có `pos_orders` chưa.
- Kiểm tra subscription `staff-pos-qr-orders` có chuyển sang `SUBSCRIBED` không.
- Kiểm tra RLS cho tài khoản nhân viên test có quyền `SELECT` trên `pos_orders` không.
- Kiểm tra POS và QR đang trỏ cùng một Supabase project.
- Kiểm tra API `/api/pos/orders` có trả về đơn `awaiting_confirmation` không.
- Kiểm tra filter Realtime `source=eq.QR_TABLE` có khớp đúng giá trị enum/text không.
- Thêm trạng thái lỗi rõ ràng trên POS khi subscription thất bại hoặc API refresh lỗi.
- Có polling dự phòng nhưng phải hiển thị cảnh báo nếu Realtime không kết nối.

### 7. Bàn QR chưa hiện đơn khách

- Sau khi đơn QR được tạo, bàn tương ứng phải hiển thị trạng thái có đơn chờ xác nhận.
- Không tự trộn đơn QR vào cart POS trước khi thu ngân chấp nhận.
- Khi thu ngân chấp nhận, cart phải được tạo trên đúng bàn và đồng bộ sang các thiết bị POS khác.
- Khi từ chối hoặc hết hạn, bàn phải trở về trạng thái phù hợp.
- Cần tránh tạo trùng đơn bằng `idempotency_key`.

## Thứ tự xử lý đề xuất

1. Thu thập log và sửa lỗi thanh toán 500.
2. Sửa vòng đời cart draft khi đổi bàn.
3. Thêm xác nhận xóa toàn bộ cart.
4. Đồng bộ trạng thái bàn và tổng tiền giữa các thiết bị.
5. Đồng bộ selected customer.
6. Điều tra và sửa luồng QR từ tạo đơn đến POS inbox.
7. Chạy regression test hai thiết bị.
8. Chỉ sau khi đạt mới tiếp tục chuẩn hóa `CartItem` và tích hợp AI.

## Tiêu chí chấp nhận

- Đổi bàn không để lại cart/tổng tiền ma ở bàn cũ.
- Xóa toàn bộ luôn yêu cầu xác nhận và đồng bộ sang thiết bị khác.
- Danh sách bàn phản ánh đúng trạng thái mới trong thời gian thực hoặc có cảnh báo mất kết nối.
- Khách hàng được chọn/đổi/bỏ chọn nhất quán trên các thiết bị.
- Thanh toán thành công bằng tài khoản nhân viên test và có lỗi cụ thể khi thất bại.
- Đơn QR xuất hiện ở POS, có thông báo, không tạo trùng và cập nhật đúng bàn.
- Các luồng cũ: gửi bếp, thanh toán, in hóa đơn, đổi bàn và QR đều pass trên ít nhất hai phiên đăng nhập.

## Checklist kiểm tra toàn hệ thống

Đánh dấu từng mục sau khi đã kiểm tra và có bằng chứng từ log hoặc test thực tế.

### A. Môi trường Vercel và Supabase

- [ ] Production và Preview đang trỏ đến đúng project Supabase mong muốn.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` giống đúng nơi cần dùng trong từng environment.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` tương ứng với URL Supabase.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` chỉ tồn tại ở server environment, không xuất hiện trong bundle trình duyệt.
- [ ] Preview đã được redeploy sau khi thay đổi environment variables.
- [ ] Tất cả migration cần thiết đã chạy trên đúng database:
  - [ ] `pos_orders`
  - [ ] `pos_cart_drafts`
  - [ ] các bảng hóa đơn/chi tiết hóa đơn
  - [ ] các bảng sản phẩm, bàn, khách hàng và nguyên liệu
- [ ] `pos_orders`, `pos_cart_drafts` và `DSBAN` được bật trong `supabase_realtime`.
- [ ] Có trang/log hiển thị rõ trạng thái subscription: `SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`.
- [ ] Polling fallback hoạt động khi Realtime bị ngắt.

### B. Xác thực và phân quyền

- [ ] Tài khoản test tồn tại trong Supabase Auth.
- [ ] Đăng nhập tạo cookie/session Supabase hợp lệ.
- [ ] Request từ trình duyệt gửi cookie đến các API Route.
- [ ] API trả `401` khi chưa đăng nhập.
- [ ] Nhân viên thường chỉ thao tác được các chức năng POS được phép.
- [ ] Chức năng quản lý giá, sản phẩm, tồn kho vẫn giới hạn theo role.
- [ ] RLS cho phép nhân viên đã xác thực đọc dữ liệu Realtime cần thiết.
- [ ] Không dùng localStorage/mock login làm bằng chứng duy nhất cho quyền backend.
- [ ] Không đưa service role key vào client hoặc biến `NEXT_PUBLIC_*`.

### C. Nguồn dữ liệu và tính nhất quán

- [ ] Xác định nguồn chính cho từng bảng: Supabase hay JSON fallback.
- [ ] Preview và Production không vô tình dùng hai nguồn dữ liệu khác nhau.
- [ ] API backend đọc catalog/bàn từ cùng nguồn mà POS hiển thị.
- [ ] Fallback JSON chỉ dùng khi đã ghi log rõ ràng.
- [ ] Trạng thái sản phẩm `Hoạt động`/ngừng bán được kiểm tra ở backend.
- [ ] Mã bàn được chuẩn hóa giống nhau giữa `DSBAN`, cart draft và `pos_orders`.
- [ ] Không có hai bản ghi cart draft cho cùng một bàn.
- [ ] Version của cart draft tăng đúng sau mỗi lần ghi.

### D. Realtime trạng thái bàn

- [ ] Có subscription Realtime cho `DSBAN` hoặc một nguồn trạng thái bàn dùng chung.
- [ ] Có subscription Realtime cho `pos_cart_drafts`.
- [ ] Thêm cart vào bàn cập nhật trạng thái bàn thành `Đang sử dụng`.
- [ ] Xóa cart làm bàn trở về `Trống` nếu không còn đơn chờ/đơn đang phục vụ.
- [ ] Thanh toán xong làm bàn trở về `Trống`.
- [ ] Đổi bàn xóa/đóng draft của bàn cũ và tạo draft cho bàn mới.
- [ ] Máy A nhận được thay đổi trạng thái bàn do máy B thực hiện.
- [ ] Menu chọn bàn không hiển thị tổng tiền hoặc cart cũ sau khi draft bị xóa.
- [ ] Chọn lại bàn luôn tải dữ liệu mới nhất thay vì chỉ dùng state cũ.
- [ ] Có xử lý conflict khi hai máy cùng sửa một bàn.

### E. Cart draft đa thiết bị

- [ ] Mở cùng một bàn trên hai phiên đăng nhập thật.
- [ ] Thêm món ở máy A, máy B nhận đúng món.
- [ ] Thêm món ở máy B, máy A nhận đúng món.
- [ ] Tăng/giảm số lượng không tạo bản ghi trùng.
- [ ] Xóa một món đồng bộ sang máy còn lại.
- [ ] Xóa toàn bộ yêu cầu xác nhận.
- [ ] Xóa toàn bộ cập nhật cart rỗng và tổng tiền trên tất cả thiết bị.
- [ ] Đổi bàn không sao chép cart mà vẫn giữ lại cart ở bàn cũ.
- [ ] Mất mạng rồi kết nối lại không ghi đè dữ liệu mới hơn.
- [ ] Conflict trả trạng thái rõ ràng và tải lại bản mới nhất.
- [ ] Xóa draft sau thanh toán không làm phát sinh lại do debounce cũ.

### F. Khách hàng

- [ ] Chọn khách hàng trên máy A cập nhật máy B.
- [ ] Đổi khách hàng cập nhật máy B.
- [ ] Bỏ chọn khách hàng đưa cả hai máy về khách lẻ.
- [ ] Khách hàng được lưu cùng draft đúng bàn.
- [ ] Khách hàng không bị giữ lại khi đổi sang bàn khác.
- [ ] Khách hàng không bị ghi đè bởi payload Realtime cũ.
- [ ] Chiết khấu hiển thị lại đúng sau khi nhận khách hàng từ máy khác.

### G. Thanh toán

- [ ] Ghi lại request ID, route, status và server log khi test thanh toán.
- [ ] Thanh toán tiền mặt thành công bằng tài khoản test.
- [ ] Thanh toán chuyển khoản/QR thành công nếu được bật.
- [ ] Tổng tiền frontend và backend khớp.
- [ ] VAT/giảm giá/tiền khách trả/tiền thừa được kiểm tra ở server.
- [ ] Bàn phải được xác định hợp lệ ở backend.
- [ ] Hóa đơn và chi tiết hóa đơn được ghi đủ.
- [ ] Thanh toán lặp lại không tạo hóa đơn trùng.
- [ ] Sau thanh toán cart, draft và trạng thái bàn được dọn đúng.
- [ ] Nếu lỗi, API trả mã lỗi nghiệp vụ và log nguyên nhân thật.
- [ ] Kiểm tra riêng lỗi `500` do thiếu bảng, thiếu key, RLS, cookie hoặc payload.

### H. Đơn QR

- [ ] Khách QR tạo được row `pos_orders` với `source = QR_TABLE`.
- [ ] Row có `order_status = awaiting_confirmation`.
- [ ] POS nhận được INSERT qua Realtime.
- [ ] POS vẫn nhận đơn qua polling khi Realtime tắt.
- [ ] POS hiển thị thông báo có đơn mới.
- [ ] Đơn QR hiển thị đúng bàn và danh sách món.
- [ ] Bàn có đơn chờ được đánh dấu phù hợp.
- [ ] Thu ngân chấp nhận đơn thì cart vào đúng bàn.
- [ ] Thu ngân từ chối đơn thì bàn/cart không bị giữ trạng thái sai.
- [ ] Accept/reject không tạo bản ghi trùng.
- [ ] `idempotency_key` chống retry tạo đơn trùng.
- [ ] Máy POS thứ hai nhận cùng trạng thái đơn QR.

### I. Bếp, hóa đơn và luồng cũ

- [ ] Gửi đơn bếp một lần không tạo duplicate.
- [ ] Đơn bếp nhận đúng option và ghi chú.
- [ ] Cập nhật trạng thái bếp đồng bộ.
- [ ] Thanh toán không gửi lại đơn bếp ngoài ý muốn.
- [ ] In hóa đơn thành công hoặc báo lỗi riêng mà không rollback thanh toán sai.
- [ ] Đổi bàn không làm mất đơn đang chờ bếp.
- [ ] Refresh trang không làm mất dữ liệu đã lưu.
- [ ] Các phím tắt POS không vô tình xóa cart hoặc thanh toán.

### J. Chuẩn bị cho AI MVP

- [ ] `CartItem` có option có cấu trúc: `size`, `sugar`, `ice`, `toppings`.
- [ ] Có `lineItemKey` để hai món cùng product nhưng khác option không bị gộp.
- [ ] Có API resolver sản phẩm chống tên mơ hồ.
- [ ] Giá được lấy/tính từ backend, không lấy từ kết quả tự do của LLM.
- [ ] Có preview và xác nhận trước khi thêm order bằng AI.
- [ ] Tool AI không truy cập database trực tiếp.
- [ ] Các API nghiệp vụ có quyền, validation và audit log.
- [ ] Có bộ benchmark tối thiểu 50 câu lệnh tiếng Việt thật.
- [ ] Chỉ bắt đầu tích hợp OpenAI sau khi các mục P0/P1 đạt.

## Bộ kiểm thử tự động

### Cách chạy

```powershell
npm test
```

Chạy ở chế độ theo dõi khi phát triển:

```powershell
npm run test:watch
```

### Đã triển khai hoặc có test tự động

- [x] Chuẩn hóa và phân giải tên sản phẩm trong catalog.
- [x] Có unit test cho catalog resolver.
- [x] Từ chối sản phẩm không hoạt động.
- [x] API cart draft từ chối truy cập chưa xác thực.
- [x] API cart draft kiểm tra `tableId` và giới hạn số dòng cart.
- [x] API cart draft đọc/ghi/xóa dữ liệu.
- [x] API cart draft phát hiện version conflict.
- [x] Realtime hook ghi lại `SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`.
- [x] Polling tránh chạy đè lên request PUT đang xử lý.
- [x] Polling bỏ qua bản remote cũ hơn version hiện tại.

### Còn cần bổ sung test tự động

- [ ] Unit test trực tiếp cho vòng đời Realtime/polling bằng fake timer và mock channel.
- [ ] API integration test với Supabase test project.
- [ ] Playwright E2E cho đổi bàn, xác nhận xóa cart và thanh toán.
- [ ] Playwright multi-context cho hai thiết bị.

### Chưa thể chứng minh hoàn toàn bằng unit test

- [ ] Supabase Realtime thật nhận event trên database Preview.
- [ ] RLS và Auth session thật trên Vercel Preview.
- [ ] Hai browser context nhận thay đổi qua Realtime.
- [ ] Máy in nhiệt, mạng Wi-Fi và thanh toán/QR provider thật.

Các mục này cần smoke test sau khi migration đã chạy trên đúng Supabase project. Không được coi unit test pass là bằng chứng Realtime production đã hoạt động.
