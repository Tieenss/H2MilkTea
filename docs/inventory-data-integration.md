# Tích hợp dữ liệu Inventory với JSON Files

## Tổng quan

Các module trong thư mục `inventory/` đã được cập nhật để sử dụng dữ liệu thực tế từ các file JSON thay vì mock data. Điều này đảm bảo tính nhất quán và độ tin cậy của dữ liệu trong toàn bộ hệ thống.

## Cấu trúc dữ liệu

### 1. Kiểm kê kho (Stocktake)
- **File nguồn**: `src/data/KIEMKEKHO.json`
- **Module**: `src/app/(dashboard)/inventory/stocktake/`
- **Hook**: `useStocktake.ts`

**Cấu trúc dữ liệu**:
```json
{
  "IDKiemKe": "KK001",
  "NgayKiemKe": "01/08/2025",
  "LoaiKiemKe": "Định kỳ",
  "NhanVienThucHien": "Nguyễn Văn A",
  "TrangThai": "Hoàn thành",
  "GhiChu": "Kiểm kê định kỳ tháng 8",
  "TongMatHang": 15,
  "TongGiaTri": 8500000,
  "ChiTiet": [
    {
      "IDNguyenLieu": "NVL001",
      "TenNguyenLieu": "Cà phê hạt Robusta",
      "SoLuongTheoSo": 45,
      "SoLuongThucTe": 43,
      "ChenhLech": -2,
      "DonViTinh": "Kg",
      "DonGia": 45000,
      "GiaTriChenhLech": -90000,
      "LyDo": "Hao hụt tự nhiên"
    }
  ]
}
```

### 2. Nhà cung cấp (Suppliers)
- **File nguồn**: `src/data/NHACUNGCAP.json`
- **Module**: `src/app/(dashboard)/inventory/suppliers/`
- **Hook**: `useSuppliers.ts`

**Cấu trúc dữ liệu**:
```json
{
  "IDNhaCungCap": "NCC001",
  "TenNhaCungCap": "Công ty TNHH ABC",
  "MaSoThue": "0123456789",
  "DiaChi": "123 Đường ABC, Quận 1, TP.HCM",
  "SoDienThoai": "028-1234-5678",
  "Email": "info@abc.com.vn",
  "NguoiDaiDien": "Nguyễn Văn An",
  "SoDienThoaiLienHe": "090-123-4567",
  "EmailLienHe": "an.nguyen@abc.com.vn",
  "NgayHopTac": "01/01/2024",
  "TrangThai": "Đang hợp tác",
  "GhiChu": "Nhà cung cấp chính cho cà phê và sữa",
  "DanhGia": 4.5,
  "ThoiGianGiaoHang": "2-3 ngày",
  "PhuongThucThanhToan": "Chuyển khoản 30 ngày",
  "LichSuDatHang": [
    {
      "NgayDat": "01/08/2025",
      "TongTien": 2500000,
      "TrangThai": "Đã giao"
    }
  ]
}
```

### 3. Giao dịch kho (Inventory Transactions)
- **File nguồn**: `src/data/NHAPXUATKHO.json`
- **Module**: `src/app/(dashboard)/inventory/transactions/`
- **Hook**: `useInventoryTransactions.ts`

**Cấu trúc dữ liệu**:
```json
{
  "IDGiaoDich": "GD001",
  "LoaiGiaoDich": "Nhập kho",
  "NgayGiaoDich": "04/08/2025 08:30:00",
  "NhaCungCap": "Công ty TNHH ABC",
  "NhanVienThucHien": "Nguyễn Văn A",
  "GhiChu": "Nhập hàng định kỳ tháng 8",
  "TongTien": 2500000,
  "TrangThai": "Hoàn thành",
  "ChiTiet": [
    {
      "IDNguyenLieu": "NVL001",
      "TenNguyenLieu": "Cà phê hạt Robusta",
      "SoLuong": 50,
      "DonViTinh": "Kg",
      "DonGia": 45000,
      "ThanhTien": 2250000
    }
  ]
}
```

### 4. Dự báo (Forecast)
- **File nguồn**: `src/data/NGUYENLIEU.json` + `src/data/NHAPXUATKHO.json`
- **Module**: `src/app/(dashboard)/inventory/forecast/`
- **Hook**: `useForecast.ts`

**Tích hợp dữ liệu**:
- Sử dụng dữ liệu nguyên liệu từ `NGUYENLIEU.json`
- Phân tích lịch sử giao dịch từ `NHAPXUATKHO.json`
- Tạo dự báo dựa trên xu hướng nhập/xuất kho

## Utility Functions

### JsonFileManager.fetchDataFromJson<T>(fileName: string)

Hàm utility để đọc dữ liệu từ JSON files:

```typescript
import { JsonFileManager } from '@/utils/jsonFileManager';

// Sử dụng trong hook
const fetchData = async () => {
  try {
    const data = await JsonFileManager.fetchDataFromJson<YourType>('FILENAME');
    setData(data);
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};
```

## Các tính năng đã được cập nhật

### 1. Stocktake Module
- ✅ Lấy dữ liệu kiểm kê từ `KIEMKEKHO.json`
- ✅ Tạo cảnh báo tự động dựa trên dữ liệu thực tế
- ✅ Tính toán thống kê chính xác
- ✅ Xử lý chênh lệch kiểm kê

### 2. Suppliers Module
- ✅ Lấy dữ liệu nhà cung cấp từ `NHACUNGCAP.json`
- ✅ Tính toán thống kê hợp tác
- ✅ Quản lý lịch sử đặt hàng
- ✅ Đánh giá nhà cung cấp

### 3. Transactions Module
- ✅ Lấy dữ liệu giao dịch từ `NHAPXUATKHO.json`
- ✅ Phân tích xu hướng nhập/xuất
- ✅ Tính toán tồn kho
- ✅ Thống kê theo thời gian

### 4. Forecast Module
- ✅ Tích hợp dữ liệu nguyên liệu và giao dịch
- ✅ Tạo dự báo dựa trên lịch sử thực tế
- ✅ Phân tích xu hướng tiêu thụ
- ✅ Đề xuất đặt hàng

## Lợi ích

1. **Tính nhất quán**: Tất cả modules sử dụng cùng nguồn dữ liệu
2. **Độ tin cậy**: Dữ liệu thực tế thay vì mock data
3. **Tích hợp**: Các modules có thể chia sẻ và tham chiếu dữ liệu
4. **Bảo trì**: Dễ dàng cập nhật và quản lý dữ liệu
5. **Hiệu suất**: Tối ưu hóa việc đọc dữ liệu

## Cách sử dụng

1. **Import utility**:
```typescript
import { JsonFileManager } from '@/utils/jsonFileManager';
```

2. **Fetch data**:
```typescript
const data = await JsonFileManager.fetchDataFromJson<YourType>('FILENAME');
```

3. **Transform data** (nếu cần):
```typescript
const transformedData = data.map(item => ({
  // Transform to match your interface
}));
```

4. **Handle errors**:
```typescript
try {
  const data = await JsonFileManager.fetchDataFromJson<YourType>('FILENAME');
  setData(data);
} catch (error) {
  console.error('Error:', error);
  setData([]);
}
```

## Lưu ý

- Đảm bảo file JSON tồn tại trong thư mục `src/data/`
- Xử lý lỗi khi file không tồn tại hoặc có lỗi format
- Transform dữ liệu để phù hợp với interface của component
- Cập nhật type definitions nếu cần thiết 