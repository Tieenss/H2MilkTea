# Tính năng Hiển thị Số Đơn hàng Trong Ngày

## Tổng quan

Tính năng này tự động hiển thị số đơn hàng trong ngày hôm đó tại các vị trí khác nhau trong ứng dụng GigaPOS.

## Các vị trí hiển thị

### 1. Sidebar Navigation
- **Vị trí**: Bên cạnh menu "Đơn hàng" trong sidebar
- **Hiển thị**: Badge màu đỏ với số đơn hàng trong ngày
- **Cập nhật**: Tự động cập nhật mỗi phút
- **Ẩn hiện**: Chỉ hiển thị khi có đơn hàng (số > 0)

### 2. Dashboard
- **Vị trí**: Phần "Thống kê nhanh" trên trang Dashboard
- **Hiển thị**: Card với icon và số đơn hàng
- **Tính năng**: Click để chuyển đến trang Đơn hàng

### 3. Trang Đơn hàng
- **Vị trí**: Phần thống kê đầu trang
- **Hiển thị**: Card "Hôm nay" với số đơn hàng trong ngày
- **Màu sắc**: Màu tím để phân biệt với các thống kê khác

## Cách hoạt động

### Context Provider
- Sử dụng `TodayOrdersProvider` để quản lý state toàn cục
- Tự động fetch dữ liệu từ API `HOADON`
- Lọc đơn hàng theo ngày hiện tại
- Cập nhật mỗi phút để đảm bảo dữ liệu luôn mới

### Components
1. **TodayOrdersBadge**: Hiển thị badge trong sidebar
2. **TodayOrdersCard**: Hiển thị card trên dashboard
3. **InvoiceStats**: Tích hợp vào trang đơn hàng

## Cấu hình

### Layout
Provider được wrap trong `DashboardLayout` để cung cấp context cho toàn bộ ứng dụng:

```tsx
<TodayOrdersProvider>
  {/* Dashboard content */}
</TodayOrdersProvider>
```

### Navigation
Đã xóa badge cố định "12" trong `navigation.ts` để sử dụng số thực tế:

```tsx
{
  name: 'Đơn hàng',
  href: '/orders',
  icon: ShoppingCart,
  dashboard: true,
  sidebar: true,
  color: '#578FCA',
  description: 'Quản lý đơn hàng'
  // Đã xóa badge: '12'
}
```

## Tối ưu hóa

### Performance
- Sử dụng Context để tránh re-render không cần thiết
- Cache dữ liệu trong context
- Chỉ fetch khi cần thiết

### UX
- Loading state với animation pulse
- Tự động ẩn badge khi không có đơn hàng
- Cập nhật real-time mỗi phút

## Troubleshooting

### Badge không hiển thị
1. Kiểm tra xem có đơn hàng trong ngày hôm nay không
2. Kiểm tra console để xem có lỗi API không
3. Đảm bảo TodayOrdersProvider đã được wrap đúng cách

### Số liệu không cập nhật
1. Kiểm tra interval timer (60 giây)
2. Kiểm tra kết nối API
3. Refresh trang để force update

## Tương lai

Có thể mở rộng tính năng này để:
- Hiển thị số đơn hàng theo tuần/tháng
- Thêm thống kê doanh thu theo ngày
- Tích hợp với real-time notifications 