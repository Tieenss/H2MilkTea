# Hướng dẫn sử dụng Ưu đãi Khách hàng - GOALPOS

## Tổng quan
Hệ thống ưu đãi khách hàng trong GOALPOS cho phép tự động áp dụng giảm giá dựa trên loại khách hàng đã được định nghĩa trước.

## Các loại khách hàng và mức ưu đãi

### 1. Khách thường
- **Điểm tích lũy yêu cầu:** 0 - 999 điểm
- **Mức ưu đãi:** 0% (không có ưu đãi tự động)
- **Màu sắc hiển thị:** Xám
- **Ký hiệu:** Không có badge đặc biệt

### 2. Khách VIP
- **Điểm tích lũy yêu cầu:** 1000 - 2999 điểm
- **Mức ưu đãi:** 10% trên tổng giá trị đơn hàng (chưa bao gồm VAT)
- **Màu sắc hiển thị:** Xanh dương
- **Ký hiệu:** Badge "Khách VIP" màu xanh

### 3. Khách kim cương
- **Điểm tích lũy yêu cầu:** 3000+ điểm
- **Mức ưu đãi:** 20% trên tổng giá trị đơn hàng (chưa bao gồm VAT)
- **Màu sắc hiển thị:** Tím
- **Ký hiệu:** Badge "Khách kim cương" màu tím

## Cách hoạt động của hệ thống ưu đãi

### 1. Tính toán ưu đãi
```
Tạm tính = Tổng giá sản phẩm × số lượng
VAT = Tạm tính × 10%
Ưu đãi khách hàng = Tạm tính × % ưu đãi theo loại khách hàng
Tổng tiền = Tạm tính + VAT - Ưu đãi khách hàng
```

### 2. Ví dụ tính toán
**Đơn hàng có tạm tính: 500,000 VNĐ**

- **Khách thường:**
  - Tạm tính: 500,000 VNĐ
  - VAT (10%): 50,000 VNĐ
  - Ưu đãi: 0 VNĐ (0%)
  - **Tổng tiền: 550,000 VNĐ**

- **Khách VIP:**
  - Tạm tính: 500,000 VNĐ
  - VAT (10%): 50,000 VNĐ
  - Ưu đãi: 50,000 VNĐ (10%)
  - **Tổng tiền: 500,000 VNĐ**

- **Khách kim cương:**
  - Tạm tính: 500,000 VNĐ
  - VAT (10%): 50,000 VNĐ
  - Ưu đãi: 100,000 VNĐ (20%)
  - **Tổng tiền: 450,000 VNĐ**

## Cách sử dụng trong POS

### 1. Chọn khách hàng
1. Trong màn hình POS, nhấn nút **"KH"** hoặc **"Khách lẻ"**
2. Tìm kiếm khách hàng theo:
   - Tên khách hàng
   - Số điện thoại
   - Mã khách hàng
3. Chọn khách hàng từ danh sách

### 2. Kiểm tra ưu đãi
Sau khi chọn khách hàng, hệ thống sẽ:
- Hiển thị badge loại khách hàng với màu sắc tương ứng
- Tự động tính toán và hiển thị ưu đãi trong giỏ hàng
- Cập nhật tổng tiền sau khi trừ ưu đãi

### 3. Hiển thị ưu đãi trong giỏ hàng
- **Thông tin khách hàng:** Hiển thị tên, số điện thoại, điểm tích lũy
- **Badge loại khách hàng:** Màu sắc phân biệt từng loại
- **Khung ưu đãi:** Màu xanh lá với biểu tượng quà tặng
  - Số tiền ưu đãi: -100,000đ
  - Phần trăm ưu đãi: (20%)

### 4. Tổng kết thanh toán
```
Tạm tính:           500,000đ
VAT (10%):           50,000đ
Ưu đãi khách hàng:  -100,000đ
─────────────────────────────
Tổng tiền:          450,000đ
```

## Quản lý khách hàng

### 1. Nâng cấp loại khách hàng
- Khách hàng được tự động nâng cấp dựa trên điểm tích lũy
- Có thể thủ công thay đổi trong trang "Quản lý khách hàng"

### 2. Thêm ưu đãi đặc biệt
- Trường "Ưu đãi hiện tại" cho phép ghi chú ưu đãi bổ sung
- Ví dụ: "Giảm 5% sinh nhật", "Tặng 1 ly free"

### 3. Theo dõi hiệu quả ưu đãi
- Xem báo cáo doanh thu theo loại khách hàng
- Theo dõi tần suất mua hàng của khách VIP/Kim cương

## Lưu ý quan trọng

### 1. Thứ tự tính toán
- Ưu đãi được tính trên **tạm tính** (chưa bao gồm VAT)
- VAT được tính trên tạm tính gốc
- Tổng tiền = Tạm tính + VAT - Ưu đãi

### 2. Giới hạn ưu đãi
- Ưu đãi tự động chỉ áp dụng cho khách VIP và Kim cương
- Không giới hạn số tiền ưu đãi tối đa
- Ưu đãi không được cộng dồn với các chương trình khuyến mại khác

### 3. Hiển thị trên hóa đơn
- Ưu đãi sẽ được in rõ ràng trên hóa đơn
- Hiển thị cả số tiền và phần trăm ưu đãi
- Ghi chú loại khách hàng trên hóa đơn

## Khắc phục sự cố thường gặp

### 1. Ưu đãi không được áp dụng
- Kiểm tra loại khách hàng đã được chọn đúng
- Xác nhận điểm tích lũy đủ điều kiện
- Làm mới dữ liệu khách hàng

### 2. Ưu đãi hiển thị sai
- Kiểm tra cấu hình phần trăm ưu đãi trong code
- Xác nhận tính toán VAT đúng thứ tự

### 3. Khách hàng không xuất hiện
- Kiểm tra trạng thái khách hàng (phải là "Hoạt động")
- Xác nhận thông tin tìm kiếm chính xác

## Cập nhật và bảo trì

### 1. Thay đổi mức ưu đãi
- Chỉnh sửa trong file: `src/app/(dashboard)/pos/hooks/usePOS.ts`
- Tìm các dòng: `customerDiscount = subtotal * 0.1` (VIP) và `customerDiscount = subtotal * 0.2` (Kim cương)

### 2. Thêm loại khách hàng mới
- Cập nhật file: `src/app/(dashboard)/khachhang/utils/customerConstants.ts`
- Thêm logic tính ưu đãi trong `usePOS.ts`

### 3. Tùy chỉnh hiển thị
- Chỉnh sửa component: `src/app/(dashboard)/pos/components/CartSidebar.tsx`
- Tùy chỉnh màu sắc và văn bản hiển thị
