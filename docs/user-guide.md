# 📖 Hướng dẫn sử dụng GigaPOS - Hệ thống quản lý bán hàng

## 🌟 Giới thiệu chung

**GigaPOS** là hệ thống quản lý bán hàng toàn diện dành cho nhà hàng, quán cafe và các cửa hàng F&B. Hệ thống tích hợp đầy đủ các chức năng từ bán hàng, quản lý kho, báo cáo đến quản lý khách hàng.

### 🎯 Tính năng chính
- **POS Bán hàng**: Giao diện bán hàng trực quan, nhanh chóng
- **Quản lý đơn hàng**: Theo dõi và xử lý đơn hàng
- **Quản lý khách hàng**: Hệ thống khách hàng thân thiết với ưu đãi tự động
- **Quản lý menu**: Danh mục sản phẩm và nguyên liệu
- **Báo cáo thống kê**: Phân tích doanh thu và hiệu quả kinh doanh
- **Quản lý nhân viên**: Phân quyền và theo dõi hiệu suất

---

## 🔐 Đăng nhập hệ thống

### Bước 1: Truy cập trang đăng nhập
- Mở trình duyệt web và truy cập địa chỉ hệ thống
- Hệ thống sẽ tự động chuyển đến trang đăng nhập

### Bước 2: Nhập thông tin đăng nhập
- **Tên đăng nhập**: Nhập tên đăng nhập được cấp
- **Mật khẩu**: Nhập mật khẩu tương ứng
- Nhấn **"Đăng nhập"** để vào hệ thống

### Bước 3: Dashboard chính
Sau khi đăng nhập thành công, bạn sẽ thấy:
- **Dashboard tổng quan**: Hiển thị các ứng dụng có thể truy cập
- **Menu sidebar**: Danh sách chức năng theo phân quyền
- **Thanh header**: Thông tin người dùng và cài đặt

---

## 🛍️ Module POS Bán hàng

### Giao diện POS

#### Bố cục màn hình:
1. **Khu vực sản phẩm** (bên trái): Danh sách menu
2. **Giỏ hàng** (bên phải): Các món đã chọn
3. **Thanh công cụ** (trên cùng): Tìm kiếm, lọc, chọn bàn

#### Các bước bán hàng:

### Bước 1: Chọn bàn
```
💡 Mẹo: Nhấn F2 để mở nhanh danh sách bàn
```
- Nhấn nút **"Chọn bàn"** 
- Chọn bàn từ danh sách hiển thị
- Trạng thái bàn sẽ tự động cập nhật

### Bước 2: Chọn sản phẩm
- Duyệt danh sách sản phẩm hoặc sử dụng tìm kiếm
- Nhấn vào sản phẩm để thêm vào giỏ hàng
- Sử dụng **+/-** để điều chỉnh số lượng

### Bước 3: Thêm ghi chú (tùy chọn)
- Nhấn nút **"Ghi chú"** trên từng món
- Nhập yêu cầu đặc biệt (ít đường, không đá, v.v.)

### Bước 4: Chọn khách hàng (tùy chọn)
```
🎁 Ưu đãi tự động:
• Khách VIP: Giảm 10%
• Khách kim cương: Giảm 20%
• Khách thường: Không ưu đãi
```
- Nhấn nút **"Chọn khách hàng"**
- Tìm kiếm theo tên hoặc số điện thoại
- Hệ thống tự động áp dụng ưu đãi

### Bước 5: Thanh toán
```
💡 Phím tắt: F4 để thanh toán nhanh
```
- Nhấn **"Thanh toán"** 
- Chọn phương thức thanh toán:
  - **Tiền mặt**
  - **Chuyển khoản** 
  - **Thẻ**
  - **VietQR**
- Nhập số tiền khách trả
- Xác nhận thanh toán

### Bước 6: In hóa đơn
- Hệ thống tự động in hóa đơn sau khi thanh toán
- Có thể in lại hóa đơn từ menu **Đơn hàng**

---

## 🧾 Module Đơn hàng

### Quản lý đơn hàng
- **Xem danh sách**: Tất cả đơn hàng theo thời gian
- **Tìm kiếm**: Theo mã đơn, khách hàng, nhân viên
- **Lọc trạng thái**: Chờ xác nhận, Đã thanh toán, Đã hủy

### Các thao tác với đơn hàng:
- **👁️ Xem chi tiết**: Thông tin đầy đủ đơn hàng
- **🖨️ In hóa đơn**: In lại hóa đơn cho khách
- **✅ Xác nhận thanh toán**: Đối với đơn chờ xác nhận
- **❌ Hủy đơn**: Chỉ Admin/Manager (đơn chưa thanh toán)

### Trạng thái đơn hàng:
- **🔄 Chờ xác nhận**: Đơn vừa tạo
- **✅ Đã thanh toán**: Hoàn tất giao dịch  
- **❌ Đã hủy**: Đơn bị hủy bỏ

---

## 👥 Module Khách hàng

### Phân loại khách hàng:
1. **Khách thường**: Không ưu đãi
2. **Khách VIP**: Giảm 10% tự động
3. **Khách kim cương**: Giảm 20% tự động

### Quản lý thông tin:
- **Thêm khách hàng mới**
- **Cập nhật thông tin**
- **Theo dõi điểm tích lũy**
- **Lịch sử mua hàng**

### Điểm tích lũy:
```
💰 Quy tắc tích điểm:
• 1.000 VNĐ = 1 điểm
• Điểm được cộng tự động sau mỗi giao dịch
```

---

## 🍽️ Module Menu & Sản phẩm

### Quản lý sản phẩm:
- **➕ Thêm sản phẩm mới**
- **✏️ Chỉnh sửa thông tin**
- **📂 Phân loại theo danh mục**
- **💲 Cập nhật giá bán**

### Quản lý nguyên liệu:
- **📦 Danh sách nguyên liệu**
- **⚖️ Đơn vị tính và quy đổi**
- **⚠️ Cảnh báo hết hàng**
- **📊 Theo dõi tồn kho**

### Cấu hình nguyên liệu:
- **🔧 Định mức nguyên liệu cho từng sản phẩm**
- **🧮 Máy tính định mức tự động**
- **📋 Quản lý công thức**

---

## 📊 Module Báo cáo

### Dashboard tổng quan:
- **💰 Doanh thu theo ngày/tuần/tháng**
- **📈 Biểu đồ xu hướng**
- **🏆 Top sản phẩm bán chạy**
- **👥 Thống kê khách hàng**

### Báo cáo chi tiết:
- **📋 Báo cáo bán hàng**: Doanh thu, số đơn, trung bình
- **🥇 Báo cáo món bán chạy**: Ranking sản phẩm
- **👨‍💼 Báo cáo nhân viên**: Hiệu suất bán hàng

### Xuất báo cáo:
- **📄 Xuất Excel**: Dữ liệu để phân tích
- **🖨️ In báo cáo**: Báo cáo giấy cho quản lý

---

## 👨‍💼 Module Nhân viên (Admin/Manager)

### Quản lý nhân viên:
- **👤 Thêm nhân viên mới**
- **✏️ Chỉnh sửa thông tin**
- **🔐 Phân quyền truy cập**
- **📱 Quản lý tài khoản**

### Phân quyền hệ thống:
- **Admin**: Toàn quyền hệ thống
- **Manager**: Quản lý vận hành  
- **Nhân viên**: Bán hàng và xem báo cáo cơ bản

---

## ⚙️ Module Cài đặt

### Cài đặt mẫu in:
- **🖨️ Tùy chỉnh mẫu hóa đơn**
- **🏢 Thông tin công ty**
- **📏 Khổ giấy và font chữ**
- **🔧 Cài đặt cho POS và Kitchen**

### Cài đặt data:
- **💾 Sao lưu dữ liệu**
- **🔄 Đồng bộ hóa**
- **🧹 Dọn dẹp dữ liệu**
- **🔍 Kiểm tra tính toàn vẹn**

---

## ⌨️ Phím tắt hữu ích

| Phím | Chức năng |
|------|-----------|
| **F1** | Reset bộ lọc |
| **F2** | Mở danh sách bàn |
| **F4** | Thanh toán nhanh |
| **F5** | Đồng bộ dữ liệu |
| **Esc** | Xóa giỏ hàng |

---

## 📱 Hỗ trợ thiết bị di động

### Giao diện responsive:
- **📱 Tablet**: Giao diện tối ưu cho màn hình cảm ứng
- **📲 Smartphone**: Bố cục thu gọn, dễ thao tác
- **💻 Desktop**: Giao diện đầy đủ tính năng

### Tính năng mobile:
- **👆 Cảm ứng**: Thao tác bằng ngón tay
- **🔍 Tìm kiếm mở rộng**: Giao diện tìm kiếm thân thiện
- **🛒 Giỏ hàng thu gọn**: Tiết kiệm không gian màn hình

---

## ❗ Xử lý lỗi thường gặp

### Lỗi đăng nhập:
```
✅ Giải pháp:
• Kiểm tra tên đăng nhập và mật khẩu
• Đảm bảo kết nối internet ổn định
• Liên hệ Admin để reset mật khẩu
```

### Lỗi thanh toán:
```
✅ Giải pháp:
• Kiểm tra số tiền khách trả >= tổng tiền
• Đảm bảo đã chọn bàn
• Kiểm tra giỏ hàng không trống
```

### Lỗi in hóa đơn:
```
✅ Giải pháp:
• Kiểm tra máy in đã kết nối
• Vào Cài đặt mẫu in để cấu hình
• Thử in lại từ menu Đơn hàng
```

### Lỗi đồng bộ dữ liệu:
```
✅ Giải pháp:
• Nhấn F5 để đồng bộ thủ công
• Kiểm tra kết nối mạng
• Tải lại trang nếu cần thiết
```

---

## 📞 Hỗ trợ kỹ thuật

### Thông tin liên hệ:
- **📧 Email**: support@gigapos.com
- **📱 Hotline**: 0326132124
- **🕐 Thời gian**: 8:00 - 22:00 (T2-CN)

### Tài liệu bổ sung:
- **📖 FAQ**: Câu hỏi thường gặp
- **🎥 Video hướng dẫn**: Tutorial chi tiết
- **💬 Chat support**: Hỗ trợ trực tuyến

---

## 🔄 Cập nhật và phiên bản

### Tính năng mới:
- **🔄 Tự động cập nhật**: Hệ thống tự động cập nhật
- **📢 Thông báo**: Được thông báo khi có phiên bản mới
- **📋 Release notes**: Chi tiết tính năng mới

---

*Tài liệu này được cập nhật liên tục để phản ánh những thay đổi mới nhất của hệ thống GigaPOS.*

**© 2024 GigaPOS System - All Rights Reserved**
