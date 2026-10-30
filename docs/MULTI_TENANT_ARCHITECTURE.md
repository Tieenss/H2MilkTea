# KIẾN TRÚC PHÂN TÁCH CƠ SỞ DỮ LIỆU ĐA DOANH NGHIỆP (MULTI-TENANT SAAS ARCHITECTURE)
## Dự án: H2MilkTea POS System

---

### 1. Bối cảnh & Yêu cầu nghiệp vụ
Khi đưa hệ thống H2MilkTea POS từ một cửa hàng đơn lẻ lên mô hình SaaS (Software-as-a-Service) cho nhiều cửa hàng hoặc chuỗi kinh doanh đăng ký sử dụng:
1. **Không dùng chung dữ liệu với cửa hàng H2MilkTea mẫu**: Khi một chủ quán mới đăng ký tài khoản, dữ liệu của họ (danh mục món ăn, giá tiền, công thức BOM, hóa đơn, báo cáo doanh thu, tồn kho) phải được cách ly hoàn toàn, không được trộn lẫn hoặc nhìn thấy dữ liệu của cửa hàng khác.
2. **Tuân thủ quy định bảo mật & Pháp lý F&B**: Mỗi doanh nghiệp có Mã số thuế (MST), Tên pháp nhân, Người đại diện, và Tài khoản ngân hàng nhận tiền riêng biệt (SePay / VietQR).
3. **Hiệu năng & Chi phí vận hành tối ưu**: Không làm phình to chi phí hạ tầng cơ sở dữ liệu khi số lượng cửa hàng tăng lên.

---

### 2. So sánh các mô hình kiến trúc Multi-Tenant

| Tiêu chí | Mô hình 1: Database-per-Tenant | Mô hình 2: Schema-per-Tenant | Mô hình 3: Shared Database + RLS (Được chọn) |
| :--- | :--- | :--- | :--- |
| **Cấu trúc** | Mỗi cửa hàng 1 Database/Project Supabase riêng | Chung Database, mỗi cửa hàng 1 PostgreSQL Schema riêng (`tenant_01`, `tenant_02`) | Chung Database, chung Schema, cô lập bằng cột `store_id` + Row-Level Security |
| **Mức độ cô lập** | Tối đa (Vật lý) | Cao (Logic schema) | Rất cao (Được bảo đảm bởi PostgreSQL Kernel) |
| **Chi phí hạ tầng** | Rất cao (Mỗi quán 1 project có tính phí) | Trung bình (Tăng metadata catalog của DB) | **Tối ưu nhất (1 Project phục vụ hàng nghìn cửa hàng)** |
| **Bảo trì & Migration** | Cực kỳ phức tạp (Chạy migration N lần) | Phức tạp (Migration từng schema) | **Dễ dàng nhất (Chạy 1 lần migration cho tất cả)** |
| **Khả năng đối soát** | Khó tổng hợp báo cáo toàn hệ thống | Khó query cross-schema | **Dễ dàng quản trị tập trung cho SuperAdmin** |

---

### 3. Thiết kế kỹ thuật chi tiết: Shared Database với Row-Level Security (RLS)

#### 3.1. Thêm cột định danh cửa hàng (`store_id` / `tenant_id`)
Toàn bộ các bảng cốt lõi trong hệ thống được bổ sung khóa ngoại phân vùng:
- `DMHH` (Danh mục hàng hóa / sản phẩm)
- `DSBAN` (Danh sách phòng bàn)
- `DSNV` (Danh sách nhân viên)
- `HOADON` (Hóa đơn bán hàng)
- `HOADONDETAIL` (Chi tiết hóa đơn)
- `pos_orders` (Đơn hàng nhà bếp KDS)
- `pos_cart_drafts` (Giỏ hàng nháp realtime)
- `KHACHHANG` (Danh bạ khách hàng & công nợ)

```sql
-- Ví dụ SQL Migration bổ sung store_id:
ALTER TABLE "HOADON" ADD COLUMN IF NOT EXISTS store_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "HOADONDETAIL" ADD COLUMN IF NOT EXISTS store_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "DMHH" ADD COLUMN IF NOT EXISTS store_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "DSBAN" ADD COLUMN IF NOT EXISTS store_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "pos_orders" ADD COLUMN IF NOT EXISTS store_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "pos_cart_drafts" ADD COLUMN IF NOT EXISTS store_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';

-- Tạo Index tăng tốc truy vấn lọc theo cửa hàng
CREATE INDEX IF NOT EXISTS idx_hoadon_store_id ON "HOADON"(store_id);
CREATE INDEX IF NOT EXISTS idx_dmhh_store_id ON "DMHH"(store_id);
CREATE INDEX IF NOT EXISTS idx_dsban_store_id ON "DSBAN"(store_id);
```

#### 3.2. Thiết lập chính sách bảo mật tầng hàng (Row-Level Security)
PostgreSQL tự động lọc dữ liệu ngay tại kernel DB, trình duyệt hay API client không thể can thiệp hoặc truy xuất dữ liệu ngoài phạm vi cửa hàng của mình:

```sql
-- Kích hoạt RLS
ALTER TABLE "HOADON" ENABLE ROW LEVEL SECURITY;

-- Tạo hàm lấy store_id từ JWT Session Token của user đang đăng nhập
CREATE OR REPLACE FUNCTION auth.get_current_store_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID;
$$ LANGUAGE SQL STABLE;

-- Áp dụng Policy chỉ cho phép đọc/ghi dữ liệu của chính store đó
CREATE POLICY tenant_isolation_policy ON "HOADON"
FOR ALL
USING (store_id = auth.get_current_store_id())
WITH CHECK (store_id = auth.get_current_store_id());
```

---

### 4. Hồ sơ Doanh nghiệp Bán hàng (Store & Business Legal Profile)
Mỗi tài khoản chủ quán khi đăng ký sở hữu một bản ghi pháp nhân gồm:
1. **Thông tin pháp lý:**
   - Tên đăng ký kinh doanh (Hộ kinh doanh / Công ty)
   - Mã số thuế (MST) / Giấy phép ĐKKD
   - Địa chỉ trụ sở chính thức
   - Người đại diện theo pháp luật
2. **Cấu hình bán hàng & Ngân hàng:**
   - Tên thương hiệu hiển thị trên tem ly và hóa đơn
   - Hotline và Email kế toán nhận hóa đơn điện tử
   - Tài khoản ngân hàng SePay nhận tiền tự động (Số TK, Ngân hàng, Chủ TK)
3. **Mã định danh CSDL (Tenant ID):**
   - Khóa duy nhất (vd: `STORE-H2-VN01`) đại diện cho phân vùng dữ liệu riêng biệt.

---

### 5. Lộ trình triển khai an toàn (Expand → Contract)
1. **Bước 1 (Expand):** Bổ sung trường thông tin Doanh nghiệp tại trang Cài đặt & Profile; cung cấp mã `tenant_id` mặc định cho cửa hàng hiện tại (`STORE-H2-VN01`).
2. **Bước 2 (Migration):** Chạy migration gắn `store_id` cho dữ liệu hiện hữu và tạo index.
3. **Bước 3 (Onboarding):** Khi người dùng mới đăng ký, API tự động cấp `store_id` mới và seed bộ danh mục mẫu riêng biệt.
4. **Bước 4 (RLS Enforce):** Bật chính sách RLS trên môi trường Production.
