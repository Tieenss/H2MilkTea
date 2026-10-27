-- Phase 2: Automatic BOM Inventory Deduction on POS Checkout
-- Automatically calculates ingredient consumption and logs export in NHAPXUATKHO

create or replace function public.pos_pay_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_idempotency_key text;
  v_invoice jsonb;
  v_details jsonb;
  v_table_id text;
  v_invoice_id text;
  v_existing_id text;
  v_detail record;
  v_linked_orders jsonb;
  v_order_id text;
  v_staff_name text;
  v_consumed_materials jsonb := '[]'::jsonb;
begin
  v_idempotency_key := trim(payload->>'idempotency_key');
  v_invoice := payload->'invoice';
  v_details := payload->'details';
  v_table_id := nullif(trim(payload->>'table_id'), '');
  v_linked_orders := payload->'linked_order_ids';

  if v_invoice is null then
    return jsonb_build_object('success', false, 'error', 'Thiếu thông tin hóa đơn');
  end if;

  v_invoice_id := trim(v_invoice->>'IDHOADON');
  if v_invoice_id is null or v_invoice_id = '' then
    return jsonb_build_object('success', false, 'error', 'Thiếu mã hóa đơn IDHOADON');
  end if;

  v_staff_name := coalesce(v_invoice->>'Nhân viên', 'POS Tự động');

  -- 1. Kiểm tra Idempotency
  if v_idempotency_key is not null and v_idempotency_key <> '' then
    select "IDHOADON" into v_existing_id
    from public."HOADON"
    where idempotency_key = v_idempotency_key
    limit 1;

    if v_existing_id is not null then
      return jsonb_build_object(
        'success', true,
        'invoice_id', v_existing_id,
        'idempotent', true,
        'message', 'Hóa đơn đã được xử lý trước đó'
      );
    end if;
  end if;

  -- 2. Khóa bàn nếu có
  if v_table_id is not null then
    perform 1 from public."DSBAN" where "IDBAN" = v_table_id for update;
  end if;

  -- 3. Insert hóa đơn
  insert into public."HOADON" (
    "IDHOADON",
    "IDBAN",
    "Nhân viên",
    "Khách hàng",
    "Ngày",
    "Tổng tiền",
    "VAT",
    "Giảm giá",
    "Khách trả",
    "Tiền thừa",
    "Ghi chú",
    "Trạng thái",
    "Trạng thái sự dụng bàn",
    "Loại thanh toán",
    "Hóa đơn chi tiết",
    idempotency_key
  ) values (
    v_invoice_id,
    coalesce(v_invoice->>'IDBAN', v_table_id, ''),
    v_staff_name,
    coalesce(v_invoice->>'Khách hàng', 'Khách lẻ'),
    coalesce(v_invoice->>'Ngày', to_char(now(), 'MM/DD/YYYY HH24:MI:SS')),
    coalesce((v_invoice->>'Tổng tiền')::numeric, 0),
    coalesce((v_invoice->>'VAT')::numeric, 0),
    coalesce((v_invoice->>'Giảm giá')::numeric, 0),
    coalesce((v_invoice->>'Khách trả')::numeric, 0),
    coalesce((v_invoice->>'Tiền thừa')::numeric, 0),
    v_invoice->>'Ghi chú',
    coalesce(v_invoice->>'Trạng thái', 'Đã thanh toán'),
    coalesce(v_invoice->>'Trạng thái sự dụng bàn', v_invoice->>'Trạng thái sử dụng bàn', 'Tại bàn'),
    coalesce(v_invoice->>'Loại thanh toán', 'Tiền mặt'),
    v_invoice->>'Hóa đơn chi tiết',
    nullif(v_idempotency_key, '')
  );

  -- 4. Insert chi tiết hóa đơn
  if v_details is not null and jsonb_typeof(v_details) = 'array' then
    for v_detail in
      select * from jsonb_to_recordset(v_details) as x(
        "IDHOADONDETAIL" text,
        "IDSP" text,
        "Tên sản phẩm" text,
        "Đơn vị tính" text,
        "Đơn giá" numeric,
        "Số lượng" numeric,
        "Thành tiền" numeric,
        "Ghi chú" text
      )
    loop
      insert into public."HOADONDETAIL" (
        "IDHOADONDETAIL",
        "IDHOADON",
        "IDSP",
        "Tên sản phẩm",
        "Đơn vị tính",
        "Đơn giá",
        "Số lượng",
        "Thành tiền",
        "Ghi chú"
      ) values (
        coalesce(v_detail."IDHOADONDETAIL", v_invoice_id || '_' || coalesce(v_detail."IDSP", gen_random_uuid()::text)),
        v_invoice_id,
        coalesce(v_detail."IDSP", ''),
        coalesce(v_detail."Tên sản phẩm", ''),
        coalesce(v_detail."Đơn vị tính", 'Cái'),
        coalesce(v_detail."Đơn giá", 0),
        coalesce(v_detail."Số lượng", 1),
        coalesce(v_detail."Thành tiền", 0),
        v_detail."Ghi chú"
      );
    end loop;
  end if;

  -- 5. Tính toán định lượng BOM và tạo phiếu xuất kho NHAPXUATKHO
  begin
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'IDNguyenLieu', sub."IDNguyenLieu",
          'TenNguyenLieu', coalesce(nl."Tên nguyên liệu", sub."IDNguyenLieu"),
          'SoLuong', sub.total_qty,
          'DonViTinh', coalesce(nl."Đơn vị tính", 'Đơn vị'),
          'DonGia', 0,
          'ThanhTien', 0
        )
      ),
      '[]'::jsonb
    )
    into v_consumed_materials
    from (
      select 
        cfg."IDNguyenLieu",
        sum(
          coalesce(d."Số lượng", 1) * coalesce(nullif(cfg."Số lượng quy đổi", 0), cfg."Số lượng cần", 1)
        ) as total_qty
      from jsonb_to_recordset(v_details) as d("IDSP" text, "Số lượng" numeric)
      join public."CAUHINH" cfg on cfg."IDSP" = d."IDSP"
      where cfg."Trạng thái" not in ('Tạm ngừng', 'Ngừng hoạt động')
      group by cfg."IDNguyenLieu"
    ) sub
    left join public."NGUYENLIEU" nl on nl."IDNguyenLieu" = sub."IDNguyenLieu";

    if jsonb_array_length(v_consumed_materials) > 0 then
      insert into public."NHAPXUATKHO" (
        "IDGiaoDich",
        "LoaiGiaoDich",
        "NgayGiaoDich",
        "NhaCungCap",
        "NhanVienThucHien",
        "GhiChu",
        "TongTien",
        "TrangThai",
        "ChiTiet"
      ) values (
        'XK_' || v_invoice_id,
        'Xuất kho',
        to_char(now(), 'MM/DD/YYYY HH24:MI:SS'),
        '',
        v_staff_name,
        'Xuất kho tự động từ hóa đơn ' || v_invoice_id,
        0,
        'Hoàn thành',
        v_consumed_materials
      )
      on conflict ("IDGiaoDich") do update
      set "ChiTiet" = excluded."ChiTiet";
    end if;
  exception when others then
    -- Nếu bảng CAUHINH hoặc NHAPXUATKHO chưa được cài đặt, không làm gián đoạn thanh toán
    null;
  end;

  -- 6. Cập nhật bàn về 'Trống'
  if v_table_id is not null and v_table_id <> 'Khách mua về' then
    update public."DSBAN"
    set "Trạng thái" = 'Trống'
    where "IDBAN" = v_table_id;
  end if;

  -- 7. Xóa draft giỏ hàng
  if v_table_id is not null then
    delete from public.pos_cart_drafts
    where table_id = v_table_id;
  end if;

  -- 8. Đồng bộ đơn bếp sang paid
  if v_linked_orders is not null and jsonb_typeof(v_linked_orders) = 'array' then
    for v_order_id in select jsonb_array_elements_text(v_linked_orders)
    loop
      update public.pos_orders
      set payment_status = 'paid',
          payment_method = coalesce(v_invoice->>'Loại thanh toán', 'Tiền mặt'),
          invoice_id = v_invoice_id,
          updated_at = now()
      where id::text = v_order_id or tracking_token = v_order_id;
    end loop;
  end if;

  return jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'consumed_materials', v_consumed_materials
  );
exception when others then
  return jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
end;
$$;
