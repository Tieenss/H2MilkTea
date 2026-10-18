-- Phase 1: Core POS transaction safety (Pay order & Transfer table cart)
-- Ensures single-transaction checkout and race-condition free table transfer.

-- 1. Thêm cột idempotency_key vào HOADON để chống thanh toán trùng lặp
alter table public."HOADON" add column if not exists idempotency_key text;
create unique index if not exists hoadon_idempotency_key_idx
  on public."HOADON" (idempotency_key)
  where idempotency_key is not null;

-- 2. Hàm RPC thanh toán nguyên tử (Single-transaction checkout)
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

  -- 2.1 Kiểm tra Idempotency để chống thanh toán lặp
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

  -- 2.2 Khóa bàn chống race condition nếu có bàn
  if v_table_id is not null then
    perform 1 from public."DSBAN" where "IDBAN" = v_table_id for update;
  end if;

  -- 2.3 Insert hóa đơn chính
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
    coalesce(v_invoice->>'Nhân viên', ''),
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

  -- 2.4 Insert các chi tiết hóa đơn
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

  -- 2.5 Cập nhật trạng thái bàn về 'Trống'
  if v_table_id is not null and v_table_id <> 'Khách mua về' then
    update public."DSBAN"
    set "Trạng thái" = 'Trống'
    where "IDBAN" = v_table_id;
  end if;

  -- 2.6 Xóa draft giỏ hàng của bàn
  if v_table_id is not null then
    delete from public.pos_cart_drafts
    where table_id = v_table_id;
  end if;

  -- 2.7 Đồng bộ đơn bếp sang paid nếu có linked_order_ids
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
    'invoice_id', v_invoice_id
  );
exception when others then
  return jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
end;
$$;

-- 3. Hàm RPC chuyển bàn nguyên tử (Deadlock-free atomic table cart transfer)
create or replace function public.pos_transfer_table_cart(
  p_source_table_id text,
  p_target_table_id text,
  p_staff_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_id text := trim(p_source_table_id);
  v_target_id text := trim(p_target_table_id);
  v_source_draft record;
  v_target_draft record;
  v_merged_cart jsonb;
begin
  if v_source_id is null or v_target_id is null or v_source_id = '' or v_target_id = '' then
    return jsonb_build_object('success', false, 'error', 'Mã bàn nguồn và bàn đích không được để trống.');
  end if;

  if v_source_id = v_target_id then
    return jsonb_build_object('success', false, 'error', 'Bàn nguồn và bàn đích phải khác nhau.');
  end if;

  -- 3.1 Khóa hàng theo thứ tự alphabet cố định để chống deadlock
  if v_source_id < v_target_id then
    perform 1 from public."DSBAN" where "IDBAN" in (v_source_id, v_target_id) order by "IDBAN" for update;
    perform 1 from public.pos_cart_drafts where table_id in (v_source_id, v_target_id) order by table_id for update;
  else
    perform 1 from public."DSBAN" where "IDBAN" in (v_target_id, v_source_id) order by "IDBAN" for update;
    perform 1 from public.pos_cart_drafts where table_id in (v_target_id, v_source_id) order by table_id for update;
  end if;

  -- 3.2 Đọc giỏ draft hiện tại của cả 2 bàn
  select * into v_source_draft from public.pos_cart_drafts where table_id = v_source_id;
  select * into v_target_draft from public.pos_cart_drafts where table_id = v_target_id;

  if v_source_draft.table_id is not null then
    if v_target_draft.table_id is null then
      -- Bàn đích chưa có giỏ -> Chuyển toàn bộ giỏ sang bàn đích
      update public.pos_cart_drafts
      set table_id = v_target_id,
          version = version + 1,
          updated_by = coalesce(p_staff_id, updated_by),
          updated_at = now()
      where table_id = v_source_id;
    else
      -- Bàn đích đã có giỏ -> Gộp giỏ của nguồn vào đích và xóa nguồn
      v_merged_cart := coalesce(v_target_draft.cart, '[]'::jsonb) || coalesce(v_source_draft.cart, '[]'::jsonb);
      update public.pos_cart_drafts
      set cart = v_merged_cart,
          version = greatest(v_target_draft.version, v_source_draft.version) + 1,
          updated_by = coalesce(p_staff_id, updated_by),
          updated_at = now()
      where table_id = v_target_id;

      delete from public.pos_cart_drafts where table_id = v_source_id;
    end if;
  end if;

  -- 3.3 Cập nhật trạng thái bàn trong DSBAN
  if v_source_id <> 'Khách mua về' then
    update public."DSBAN" set "Trạng thái" = 'Trống' where "IDBAN" = v_source_id;
  end if;

  if v_target_id <> 'Khách mua về' then
    update public."DSBAN" set "Trạng thái" = 'Đang sử dụng' where "IDBAN" = v_target_id;
  end if;

  -- 3.4 Chuyển liên kết pos_orders chưa thanh toán từ bàn cũ sang bàn mới
  update public.pos_orders
  set table_id = v_target_id,
      updated_at = now()
  where table_id = v_source_id
    and payment_status = 'unpaid'
    and order_status in ('awaiting_confirmation', 'accepted');

  return jsonb_build_object(
    'success', true,
    'source_table_id', v_source_id,
    'target_table_id', v_target_id
  );
exception when others then
  return jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
end;
$$;

-- 4. Phân quyền thực thi hẹp
grant execute on function public.pos_pay_order(jsonb) to authenticated;
grant execute on function public.pos_pay_order(jsonb) to service_role;
grant execute on function public.pos_transfer_table_cart(text, text, uuid) to authenticated;
grant execute on function public.pos_transfer_table_cart(text, text, uuid) to service_role;
