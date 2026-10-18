# Danh Mục API Toàn Diện Hệ Thống (API Reference)

**Phiên bản**: 1.0.0 (Khóa luận Tốt nghiệp 2026)  
**Môi trường thử nghiệm**: Supabase STAGING (`uhnrkyzicqhozwlimvew`)  
**Header dùng chung**: `x-correlation-id` (UUID truy vết lỗi xuyên suốt hệ thống)  

---

## 1. Nhóm API Bán Hàng & Giỏ Hàng POS (/api/pos/*)

### 1.1. `POST /api/pos/checkout`
- **Mục đích**: Thanh toán đơn hàng POS, ghi hóa đơn và chi tiết nguyên tử, đóng bàn và cập nhật trạng thái đơn bếp.
- **Xác thực**: Yêu cầu cookie `authToken` nhân viên (Role: `Admin` hoặc `Thu ngân`).
- **Headers**: `idempotency-key` (UUID chống thanh toán trùng lặp).
- **Request Body**:
  ```json
  {
    "tableId": "1",
    "paymentMethod": "CASH" | "BANK_TRANSFER" | "VIETQR",
    "discount": 0,
    "vat": 10,
    "paidAmount": 150000,
    "change": 10000,
    "customer": { "id": "KH001", "name": "Nguyễn Văn A", "phone": "0901234567" },
    "items": [
      { "id": "SP001", "name": "Trà Sữa Topping Thạch Củ Năng", "price": 35000, "quantity": 2, "unit": "Ly", "size": "L", "sugar": "50%", "ice": "ít đá" }
    ]
  }
  ```
- **Response Success (200 OK)**:
  ```json
  { "success": true, "invoiceId": "HD20261018-0001", "message": "Thanh toán thành công." }
  ```
- **Error Codes**: `400` (Thiếu dữ liệu / Giỏ hàng rỗng), `401` (Hết phiên đăng nhập), `409` (Trùng lặp idempotency), `500` (Lỗi giao dịch DB).

---

### 1.2. `POST /api/pos/transfer-table`
- **Mục đích**: Chuyển toàn bộ giỏ hàng từ bàn nguồn sang bàn đích nguyên tử (Deadlock-free locking).
- **Xác thực**: Yêu cầu cookie `authToken` nhân viên.
- **Request Body**:
  ```json
  { "sourceTableId": "1", "targetTableId": "3", "mergeStrategy": "merge" }
  ```
- **Response Success (200 OK)**:
  ```json
  { "success": true, "message": "Đã chuyển từ Bàn 1 sang Bàn 3." }
  ```
- **Error Codes**: `400` (Bàn nguồn trùng bàn đích / Bàn nguồn rỗng), `401` (Chưa đăng nhập), `500` (Lỗi RPC chuyển bàn).

---

### 1.3. `GET /api/pos/cart-draft` & `PUT /api/pos/cart-draft`
- **Mục đích**: Lấy và lưu tự động (Autosave) bản nháp giỏ hàng của bàn theo phiên bản (`version`), loại bỏ hiện tượng giỏ hàng "ma" (ghost cart).
- **PUT Request Body**:
  ```json
  {
    "tableId": "1",
    "version": 3,
    "items": [
      { "id": "SP001", "name": "Trà Sữa Nướng", "price": 35000, "quantity": 1, "size": "M" }
    ]
  }
  ```
- **Response Success (200 OK)**:
  ```json
  { "success": true, "version": 4 }
  ```
- **Error Codes**: `409 Conflict` (Phiên bản giỏ hàng bị stale hoặc bàn đã thanh toán/chuyển đi).

---

## 2. Nhóm API Đơn Hàng & Đơn QR (/api/orders/*)

### 2.1. `POST /api/orders`
- **Mục đích**: Đặt món tại quầy (`source: "POS_COUNTER"`) hoặc khách tự quét mã QR tại bàn (`source: "QR_TABLE"`).
- **Xác thực**: POS yêu cầu `authToken`; QR yêu cầu `HMAC session token` (nếu bật `FEATURE_QR_TOKEN`) kèm kiểm tra Rate Limit.
- **Request Body**:
  ```json
  {
    "source": "QR_TABLE",
    "tableId": "2",
    "idempotencyKey": "uuid-v4-client",
    "items": [
      { "productId": "SP001", "quantity": 2, "size": "L", "sugar": "50%", "ice": "ít đá", "note": "Ít ngọt" }
    ],
    "note": "Khách ngồi ngoài trời"
  }
  ```
- **Response Success (200 OK)**:
  ```json
  { "success": true, "orderId": "uuid", "trackingToken": "secret_token_to_track_or_cancel", "status": "awaiting_confirmation" }
  ```

---

### 2.2. `POST /api/orders/cancel`
- **Mục đích**: Khách hàng tự hủy đơn QR bằng mã `trackingToken` bí mật khi đơn đang ở trạng thái `awaiting_confirmation`.
- **Request Body**:
  ```json
  { "orderId": "uuid", "trackingToken": "secret_token_to_track_or_cancel" }
  ```
- **Response Success (200 OK)**:
  ```json
  { "success": true, "status": "cancelled_by_customer", "message": "Đã hủy đơn hàng thành công." }
  ```
- **Error Codes**: `400` (Đơn đã được quầy nhận pha chế nên không thể hủy), `403` (Sai trackingToken), `404` (Không tìm thấy đơn).

---

### 2.3. `POST /api/pos/orders/decision`
- **Mục đích**: Thu ngân tại quầy bấm "Tiếp nhận" (`action: "accept"`) hoặc "Từ chối" (`action: "reject"`) đơn QR.
- **Xác thực**: Yêu cầu cookie `authToken` nhân viên.
- **Request Body**:
  ```json
  { "orderId": "uuid", "action": "accept" | "reject", "reason": "Hết nguyên liệu" }
  ```

---

## 3. Nhóm API Trợ Lý AI An Toàn (/api/ai/*)

### 3.1. `POST /api/ai/chat`
- **Mục đích**: Tiếp nhận câu lệnh ngôn ngữ tự nhiên từ thu ngân (thêm/bớt món, chuyển bàn, hỏi đáp cẩm nang nghiệp vụ).
- **Xác thực**: Yêu cầu cookie `authToken` nhân viên.
- **Giới hạn (Rate Limit)**: Tối đa 20 yêu cầu / phút / nhân viên.
- **Request Body**:
  ```json
  {
    "message": "2 trà sữa nướng size L 50% đường ít đá vào bàn 1",
    "table": "Bàn 1",
    "cart": []
  }
  ```
- **Response Success (200 OK)**:
  ```json
  {
    "success": true,
    "action": "add" | "remove" | "select_table" | "qa" | "none",
    "targetTable": { "id": "1", "name": "Bàn 1" },
    "items": [
      { "productId": "SP001", "productName": "Trà Sữa Topping Thạch Củ Năng", "quantity": 2, "size": "L", "sugar": "50%", "ice": "ít đá", "toppings": [] }
    ],
    "message": "Đã nhận diện thêm: 2x Trà Sữa Topping Thạch Củ Năng (Size L, 50% đường, ít đá) cho Bàn 1. Vui lòng xác nhận.",
    "logId": "audit_log_uuid"
  }
  ```
- **Hỏi đáp cẩm nang (QA)**: Tự động đính kèm `[Nguồn: Hướng dẫn sử dụng > {Tên mục}](/user-guide#{sectionId})`.
- **Hàng rào an toàn (Security Guardrails)**: Chặn 100% câu lệnh thanh toán, xóa bàn, sửa giá về 0đ hoặc prompt injection.

---

### 3.2. `POST /api/ai/audit`
- **Mục đích**: Cập nhật trạng thái của bản ghi kiểm toán AI sau khi thu ngân bấm trên giao diện Preview.
- **Request Body**:
  ```json
  { "logId": "audit_log_uuid", "status": "confirmed" | "rejected" }
  ```

---

### 3.3. `GET /api/ai/settings` & `POST /api/ai/settings`
- **Mục đích**: Xem và cập nhật cài đặt AI Assistant (Bật/tắt toàn hệ thống, tự động nhận diện giọng nói, cấu hình alias và FAQ tùy biến).
- **Phân quyền**: Chỉ tài khoản có vai trò `Admin` mới được lưu thay đổi cấu hình.
