# Giao thức Đo lường Thực nghiệm Baseline (baseline-protocol.md)

- **Mục đích**: Thu thập số liệu thời gian và thao tác thực tế tại quán khi bấm tay trên POS (trước khi áp dụng bất kỳ cải tiến nào của đề tài), làm cơ sở so sánh định lượng khoa học cho báo cáo tốt nghiệp.
- **Quy mô yêu cầu**: Tối thiểu 10 đơn bấm tay thực tế (`≥ 10 đơn`).
- **Nguyên tắc**: *Tuyệt đối không bịa số liệu thực nghiệm. Dữ liệu thực tế gắn nhãn `source: shop`, dữ liệu giả lập phải gắn nhãn `source: synthetic`.*

---

## 1. Kịch bản Đơn hàng Tiêu chuẩn (Benchmark Scenarios)

Để đảm bảo tính nhất quán giữa các lần đo, sử dụng kịch bản đơn hỗn hợp gồm 4–5 món với đầy đủ các thuộc tính tùy chọn:

- **Kịch bản A (Đơn tiêu chuẩn 4 món)**:
  1. *Trà sữa nướng*: Size L, 50% Đường, 70% Đá, Thêm Trân châu hoàng kim.
  2. *Hồng trà sữa*: Size M, 70% Đường, 100% Đá.
  3. *Trà đào cam sả*: Size L, 30% Đường, 50% Đá.
  4. *Bánh ngọt / Ăn vặt*: 1 phần bánh phô mai hoặc hướng dương.

- **Kịch bản B (Đơn phức tạp 5 món)**:
  1. *Sữa tươi trân châu đường đen*: Size M, 100% Đường, 100% Đá.
  2. *Trà ô long sữa*: Size L, 0% Đường, 0% Đá (uống nóng/không đá).
  3. *Trà xoài nhiệt đới*: Size L, 50% Đường, 50% Đá, Thêm Thạch dừa.
  4. *Trà sữa matcha*: Size M, 70% Đường, 100% Đá.
  5. *Cá viên chiên / Ăn vặt*: 1 phần.

---

## 2. Quy trình và Cách thức Bấm giờ

### 2.1. Phân vai
- **Người thao tác (Thu ngân)**: Nhân viên quán thực hiện các thao tác chọn bàn, chọn món, chọn thuộc tính (Size/Đường/Đá), thanh toán trên giao diện POS như thường lệ.
- **Người đo nghiệm (Quan sát viên)**: Dùng đồng hồ bấm giờ độc lập (Stopwatch điện thoại hoặc máy đo).

### 2.2. Các mốc thời gian ghi nhận
- $T_0$ (**Bắt đầu**): Thời điểm bắt đầu nhận yêu cầu (khách đọc món hoặc mở bàn).
- $T_1$ (**Nhập xong món**): Thời điểm chọn xong món cuối cùng và các tùy chọn vào giỏ hàng.
- $T_2$ (**Hoàn tất đơn**): Thời điểm bấm thanh toán thành công và hóa đơn được xuất ra.

### 2.3. Các chỉ số đo lường (Metrics)
1. **Thời gian nhập liệu giỏ hàng**: $\Delta T_{input} = T_1 - T_0$ (giây).
2. **Tổng thời gian xử lý đơn**: $\Delta T_{total} = T_2 - T_0$ (giây).
3. **Số lần sửa thao tác sai (Error correction count)**: Số lần bấm nhầm món, xóa món làm lại, chọn lại size do thao tác nhầm trên màn hình cảm ứng / chuột.

---

## 3. Đạo đức Nghiên cứu & Ẩn danh hóa

1. **Phiếu đồng ý tham gia (Informed Consent)**: Nhân viên tham gia đo nghiệm được thông báo trước mục đích khoa học của việc đo thời gian và đồng ý tham gia tự nguyện.
2. **Ẩn danh hóa**: Mã hóa định danh nhân viên thành `S01`, `S02`, `S03`... Tuyệt đối không lưu tên thật, số điện thoại hay thông tin cá nhân trong bảng dữ liệu thực nghiệm.
3. **Khách hàng**: Dữ liệu chỉ đo lường thời gian thao tác nghiệp vụ của hệ thống POS; không ghi hình hay thu thập bất kỳ dữ liệu định danh nào của khách mua hàng.
