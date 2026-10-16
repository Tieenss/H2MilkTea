# Roadmap phát triển AI POS

## Nguyên tắc chung

1. Mỗi giai đoạn phải có test và tiêu chí nghiệm thu trước khi sang giai đoạn tiếp theo.
2. Không cho AI tự thực hiện thao tác làm thay đổi dữ liệu nếu chưa có preview và xác nhận.
3. AI chỉ được chọn món từ catalog server-side đang hoạt động.
4. Không gửi secret Gemini xuống browser.
5. Các thay đổi schema phải có migration idempotent và hướng dẫn chạy trên Supabase production.
6. Giữ các thay đổi theo từng commit nhỏ để agent khác dễ review/rollback.

## Giai đoạn 0 - Ổn định nền tảng hiện tại

### Mục tiêu

Xác nhận chatbot hiện tại hoạt động sau khi deploy và migration đã được chạy đúng project.

### Việc cần làm

- [ ] Chạy migration `202610150003_ai_settings.sql`.
- [ ] Kiểm tra bảng `app_settings` và row `ai_assistant_enabled`.
- [ ] Kiểm tra Vercel environment variables.
- [ ] Test Admin bật/tắt.
- [ ] Test nhân viên thường không được PUT setting.
- [ ] Test popup POS và voice-to-text.
- [ ] Thu thập browser console nếu vẫn có lỗi client-side.

### Tiêu chí nghiệm thu

- Không còn màn hình trắng khi mở POS.
- Popup ẩn/hiện theo setting.
- HTTP status lỗi hiển thị đúng cho người dùng.
- `npm test` và `npm run build` pass.

## Giai đoạn 1 - Chuẩn hóa nhận diện món

### Mục tiêu

Giảm lỗi AI chọn nhầm món và chuẩn bị cho size/topping.

### Thiết kế đề xuất

Tách dữ liệu thành:

```ts
interface CatalogItem {
  id: string;
  name: string;
  price: number;
  options?: ProductOption[];
}
```

Không dùng tên món làm ID. Mọi kết quả AI phải map về ID từ catalog.

### Việc cần làm

- [ ] Viết hàm normalize tên món và alias tiếng Việt.
- [ ] Thêm test cho dấu, viết tắt và tên gần giống.
- [ ] Xử lý trường hợp nhiều món cùng tên khác ID.
- [ ] Từ chối kết quả có product ID không tồn tại.
- [ ] Hiển thị cảnh báo khi AI không chắc chắn.

### Tiêu chí nghiệm thu

- Không có item ngoài catalog được đưa vào preview.
- Món không rõ ràng phải hỏi lại.
- Có test cho ít nhất 10 câu lệnh tiếng Việt thực tế.

## Giai đoạn 2 - Cart action an toàn

### Mục tiêu

Làm cho add/remove hoạt động đáng tin cậy với cart thực tế.

### Việc cần làm

- [ ] Kiểm tra remove không vượt quá số lượng trong cart.
- [ ] Nếu người dùng nói “bỏ 2 ly” nhưng có nhiều món phù hợp, hỏi lại món.
- [ ] Không cho quantity âm hoặc số thập phân.
- [ ] Preview phải hiển thị cart trước và cart sau.
- [ ] Xác nhận phải gắn với snapshot cart đã phân tích.
- [ ] Nếu cart đã thay đổi trước khi xác nhận, yêu cầu phân tích lại.

### Tiêu chí nghiệm thu

- Không thể làm âm quantity.
- Không thể xác nhận preview cũ lên cart mới.
- Add/remove có test unit và test thủ công.

## Giai đoạn 3 - Option món

### Mục tiêu

Hỗ trợ size, mức đường, mức đá và topping mà không phá cấu trúc cart hiện tại.

### Việc cần làm

- [ ] Khảo sát schema sản phẩm/nguyên liệu hiện tại.
- [ ] Xác định option nào là bắt buộc/tùy chọn.
- [ ] Thiết kế `CartItem` có `options` ổn định.
- [ ] Xác định cách so sánh hai item cùng món nhưng khác option.
- [ ] Hiển thị option trong preview và POS.
- [ ] Chỉ triển khai sau khi có migration hoặc type contract rõ ràng.

### Tiêu chí nghiệm thu

- “2 trà sữa, một ít đá và một không đá” tạo đúng hai dòng hoặc hai cấu hình.
- Không gộp nhầm item khác option.
- Giá topping/size tính đúng.

## Giai đoạn 4 - Voice-to-text production

### Mục tiêu

Làm voice input đáng tin cậy hơn mà không biến voice recognition thành một backend rủi ro.

### Việc cần làm

- [ ] Kiểm tra browser support.
- [ ] Hiển thị trạng thái đang nghe.
- [ ] Cho phép dừng ghi âm.
- [ ] Không gửi audio lên server nếu chỉ cần Web Speech API.
- [ ] Xử lý permission denied, no speech, timeout.
- [ ] Không giữ microphone sau khi đóng popup hoặc rời trang.

### Tiêu chí nghiệm thu

- Permission bị từ chối vẫn có hướng dẫn nhập text.
- Không treo trạng thái recording.
- Microphone được release khi recognition kết thúc.

## Giai đoạn 5 - Action mở rộng có kiểm soát

Chỉ triển khai từng action, không bật tất cả cùng lúc:

1. Ghi chú món.
2. Gửi bếp.
3. Đổi bàn.
4. Giảm giá.
5. Thanh toán.
6. Báo cáo/tồn kho.

Mỗi action bắt buộc có:

- quyền rõ ràng;
- endpoint riêng hoặc contract rõ ràng;
- validation server-side;
- preview;
- xác nhận;
- audit log;
- test lỗi và retry;
- cơ chế idempotency nếu có ghi dữ liệu.

Không cho Gemini gọi trực tiếp database hoặc tự gọi tool không qua server validation.

## Giai đoạn 6 - Quan sát và vận hành

- [ ] Log request ID, không log API key.
- [ ] Không log toàn bộ thông tin nhạy cảm của khách hàng.
- [ ] Đo latency Gemini, timeout và lỗi 4xx/5xx.
- [ ] Có fallback message thân thiện.
- [ ] Có rate limit theo nhân viên hoặc session nếu cần.
- [ ] Có cơ chế tắt toàn hệ thống đã kiểm thử.
- [ ] Có tài liệu rollback.

