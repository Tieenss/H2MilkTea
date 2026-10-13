# Hướng dẫn nhanh: Ưu đãi Khách hàng trong POS

## 🎯 Tóm tắt ngắn gọn

### Các loại khách hàng và ưu đãi:
- **Khách thường**: 0% ưu đãi
- **Khách VIP**: 10% giảm giá tự động
- **Khách kim cương**: 20% giảm giá tự động

### Cách sử dụng:
1. **Chọn khách hàng**: Nhấn nút "KH" → Tìm và chọn khách hàng
2. **Kiểm tra ưu đãi**: Hệ thống tự động hiển thị ưu đãi trong giỏ hàng
3. **Thanh toán**: Ưu đãi được trừ tự động trong tổng tiền

### Hiển thị ưu đãi:
- ✅ **Badge màu sắc**: Phân biệt loại khách hàng
- ✅ **Khung ưu đãi xanh**: Hiển thị số tiền và % giảm
- ✅ **Thông báo gợi ý**: Hướng dẫn nâng cấp hạng

### Công thức tính:
```
Tạm tính = Tổng tiền hàng
VAT = Tạm tính × 10%
Ưu đãi = Tạm tính × % theo hạng khách hàng
Tổng tiền = Tạm tính + VAT - Ưu đãi
```

### Ví dụ: Đơn hàng 500,000đ
- **Khách thường**: 550,000đ (500k + 50k VAT)
- **Khách VIP**: 500,000đ (500k + 50k VAT - 50k ưu đãi)
- **Khách kim cương**: 450,000đ (500k + 50k VAT - 100k ưu đãi)

---
📋 **Chi tiết đầy đủ**: Xem file `customer-discount-guide.md`
