-- ====================================================================
-- H2MilkTea - Toàn bộ Schema Database cho STAGING (staging_schema_init.sql)
-- Chạy toàn bộ file này trong Supabase Dashboard -> SQL Editor của Staging
-- ====================================================================

-- 1. Bảng Danh mục hàng hóa / Menu (DMHH)
create table if not exists public."DMHH" (
  "_RowNumber" text,
  "IDSP" text primary key,
  "Tên sản phẩm" text not null,
  "Hình ảnh" text,
  "Loại sản phẩm" text,
  "Đơn vị tính" text,
  "Giá vốn" numeric,
  "Đơn giá" numeric not null default 0,
  "Mô tả" text,
  "Trạng thái" text default 'Hoạt động',
  "Lịch sử bán" jsonb
);

-- 2. Bảng Danh sách bàn (DSBAN)
create table if not exists public."DSBAN" (
  "_RowNumber" text,
  "IDBAN" text primary key,
  "Tên bàn" text not null,
  "Sức chứa tối đa" numeric default 4,
  "Trạng thái" text default 'Trống',
  "Lịch sử  bàn" jsonb
);

-- 3. Bảng Danh sách nhân viên (DSNV)
create table if not exists public."DSNV" (
  "_RowNumber" text,
  "username" text primary key,
  "password" text,
  "Họ và Tên" text not null,
  "Chức vụ" text,
  "Phòng" text,
  "Phân quyền" text default 'Nhân viên',
  "Email" text,
  "Image" text,
  "Quyền View" text,
  "Số điện thoại" text,
  "Địa chỉ" text,
  "Ngày sinh" text,
  "Ngày vào làm" text,
  "Ghi chú" text
);

-- 4. Bảng Hóa đơn (HOADON)
create table if not exists public."HOADON" (
  "_RowNumber" text,
  "IDHOADON" text primary key,
  "IDBAN" text,
  "Nhân viên" text,
  "Khách hàng" text,
  "Ngày" text,
  "Tổng tiền" numeric default 0,
  "VAT" numeric default 0,
  "Giảm giá" numeric default 0,
  "Khách trả" numeric default 0,
  "Tiền thừa" numeric default 0,
  "Ghi chú" text,
  "Trạng thái" text default 'Hoàn thành',
  "Trạng thái sự dụng bàn" text,
  "Loại thanh toán" text,
  "Hóa đơn chi tiết" jsonb
);

-- 5. Bảng Chi tiết hóa đơn (HOADONDETAIL)
create table if not exists public."HOADONDETAIL" (
  "_RowNumber" text,
  "IDHOADONDETAIL" text primary key,
  "IDHOADON" text,
  "IDSP" text,
  "Tên sản phẩm" text,
  "Đơn vị tính" text,
  "Đơn giá" numeric default 0,
  "Số lượng" numeric default 1,
  "Thành tiền" numeric default 0,
  "Ghi chú" text
);

-- 6. Bảng Khách hàng (KHACHHANG)
create table if not exists public."KHACHHANG" (
  "_RowNumber" text,
  "IDKHACHHANG" text primary key,
  "Tên khách hàng" text not null,
  "Số điện thoại" text,
  "Email" text,
  "Địa chỉ" text,
  "Ngày sinh" text,
  "Giới tính" text,
  "Loại khách hàng" text default 'Thường',
  "Điểm tích lũy" numeric default 0,
  "Tổng chi tiêu" numeric default 0,
  "Lần mua cuối" text,
  "Ghi chú" text,
  "Trạng thái" text default 'Hoạt động',
  "Ngày tạo" text,
  "Ngày cập nhật" text,
  "Hóa đơn liên quan" jsonb,
  "Ưu đãi hiện tại" jsonb
);

-- 7. Bảng Nguyên liệu (NGUYENLIEU)
create table if not exists public."NGUYENLIEU" (
  "_RowNumber" text,
  "IDNguyenLieu" text primary key,
  "Tên nguyên liệu" text not null,
  "Đơn vị tính" text,
  "Ghi chú" text,
  "Số lượng cảnh báo" numeric default 10,
  "Đơn vị cơ sở" text,
  "Hệ số quy đổi" numeric default 1
);

-- 8. Bảng Cấu hình công thức pha chế (CAUHINH)
create table if not exists public."CAUHINH" (
  "_RowNumber" text,
  "IDCauHinh" text primary key,
  "IDSP" text,
  "IDNguyenLieu" text,
  "Tên sản phẩm" text,
  "Tên nguyên liệu" text,
  "Số lượng cần" numeric default 0,
  "Đơn vị sử dụng" text,
  "Đơn vị gốc" text,
  "Hệ số quy đổi" numeric default 1,
  "Số lượng quy đổi" numeric default 0,
  "Ghi chú" text,
  "Trạng thái" text default 'Hoạt động',
  "Ngày tạo" text,
  "Ngày cập nhật" text,
  "Loại cấu hình" text
);

-- 9. Bảng Kiểm kê kho (KIEMKEKHO)
create table if not exists public."KIEMKEKHO" (
  "IDKiemKe" text primary key,
  "NgayKiemKe" text,
  "LoaiKiemKe" text,
  "NhanVienThucHien" text,
  "TrangThai" text,
  "GhiChu" text,
  "TongMatHang" numeric default 0,
  "TongGiaTri" numeric default 0,
  "ChiTiet" jsonb
);

-- 10. Bảng Nhà cung cấp (NHACUNGCAP)
create table if not exists public."NHACUNGCAP" (
  "IDNhaCungCap" text primary key,
  "TenNhaCungCap" text not null,
  "MaSoThue" text,
  "DiaChi" text,
  "SoDienThoai" text,
  "Email" text,
  "NguoiDaiDien" text,
  "SoDienThoaiLienHe" text,
  "EmailLienHe" text,
  "NgayHopTac" text,
  "TrangThai" text default 'Đang hợp tác',
  "GhiChu" text,
  "DanhGia" numeric default 5,
  "ThoiGianGiaoHang" text,
  "PhuongThucThanhToan" text,
  "LichSuDatHang" jsonb
);

-- 11. Bảng Nhập xuất kho (NHAPXUATKHO)
create table if not exists public."NHAPXUATKHO" (
  "IDGiaoDich" text primary key,
  "LoaiGiaoDich" text,
  "NgayGiaoDich" text,
  "NhaCungCap" text,
  "NhanVienThucHien" text,
  "GhiChu" text,
  "TongTien" numeric default 0,
  "TrangThai" text,
  "ChiTiet" jsonb
);

-- 12. Bảng Đơn POS / QR đặt món (pos_orders)
create table if not exists public.pos_orders (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('POS_COUNTER', 'QR_TABLE')),
  table_id text not null,
  table_name text not null,
  employee text,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  vat_amount numeric(12,2) not null default 0 check (vat_amount >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  notes text not null default '',
  order_status text not null check (order_status in ('awaiting_confirmation', 'accepted', 'rejected', 'completed', 'cancelled')),
  kitchen_status text not null check (kitchen_status in ('queued', 'preparing', 'ready', 'served')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  payment_method text,
  invoice_id text,
  tracking_token text unique,
  idempotency_key text not null unique,
  rejection_reason text,
  accepted_by text,
  status_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pos_orders_kitchen_queue_idx
  on public.pos_orders (order_status, kitchen_status, created_at);
create index if not exists pos_orders_table_idx
  on public.pos_orders (table_id, created_at desc);

-- 13. Bảng Giỏ hàng nháp POS (pos_cart_drafts)
create table if not exists public.pos_cart_drafts (
  table_id text primary key,
  cart jsonb not null default '[]'::jsonb check (jsonb_typeof(cart) = 'array'),
  selected_customer jsonb,
  version bigint not null default 1,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

-- 14. Bảng Cấu hình hệ thống & AI (app_settings)
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

-- ====================================================================
-- RLS (ROW LEVEL SECURITY) POLICIES
-- ====================================================================

-- Kích hoạt RLS cho toàn bộ các bảng
alter table public."DMHH" enable row level security;
alter table public."DSBAN" enable row level security;
alter table public."DSNV" enable row level security;
alter table public."HOADON" enable row level security;
alter table public."HOADONDETAIL" enable row level security;
alter table public."KHACHHANG" enable row level security;
alter table public."NGUYENLIEU" enable row level security;
alter table public."CAUHINH" enable row level security;
alter table public."KIEMKEKHO" enable row level security;
alter table public."NHACUNGCAP" enable row level security;
alter table public."NHAPXUATKHO" enable row level security;
alter table public.pos_orders enable row level security;
alter table public.pos_cart_drafts enable row level security;
alter table public.app_settings enable row level security;

-- Cho phép đọc công khai danh mục món & bàn để khách xem menu QR
drop policy if exists "public read DMHH" on public."DMHH";
create policy "public read DMHH" on public."DMHH" for select using (true);

drop policy if exists "public read DSBAN" on public."DSBAN";
create policy "public read DSBAN" on public."DSBAN" for select using (true);

-- Cấp quyền toàn diện cho Service Role Key (mặc định Supabase tự bypass RLS cho service role)
-- Cấp quyền đọc/ghi cho người dùng đã đăng nhập (authenticated)
create policy "authenticated read DSNV" on public."DSNV" for select to authenticated using (true);
create policy "authenticated all HOADON" on public."HOADON" for all to authenticated using (true) with check (true);
create policy "authenticated all HOADONDETAIL" on public."HOADONDETAIL" for all to authenticated using (true) with check (true);
create policy "authenticated all KHACHHANG" on public."KHACHHANG" for all to authenticated using (true) with check (true);
create policy "authenticated all NGUYENLIEU" on public."NGUYENLIEU" for all to authenticated using (true) with check (true);
create policy "authenticated all CAUHINH" on public."CAUHINH" for all to authenticated using (true) with check (true);
create policy "authenticated all KIEMKEKHO" on public."KIEMKEKHO" for all to authenticated using (true) with check (true);
create policy "authenticated all NHACUNGCAP" on public."NHACUNGCAP" for all to authenticated using (true) with check (true);
create policy "authenticated all NHAPXUATKHO" on public."NHAPXUATKHO" for all to authenticated using (true) with check (true);

-- Policies cho pos_orders
create policy "staff can read pos orders" on public.pos_orders
  for select to authenticated using (auth.uid() is not null);
create policy "staff can update pos orders" on public.pos_orders
  for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

-- Policies cho pos_cart_drafts
create policy "staff can read cart drafts" on public.pos_cart_drafts
  for select to authenticated using (auth.uid() is not null);
create policy "staff can write cart drafts" on public.pos_cart_drafts
  for insert to authenticated with check (auth.uid() is not null);
create policy "staff can update cart drafts" on public.pos_cart_drafts
  for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

-- Policy cho app_settings
create policy "authenticated users can read app settings" on public.app_settings
  for select to authenticated using (auth.uid() is not null);

-- Thiết lập Realtime Publication
alter table public.pos_orders replica identity full;
alter table public.pos_cart_drafts replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.pos_orders;
exception when duplicate_object then null;
when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.pos_cart_drafts;
exception when duplicate_object then null;
when undefined_object then null;
end $$;
