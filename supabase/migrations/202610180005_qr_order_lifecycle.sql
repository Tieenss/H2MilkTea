-- Phase 2: QR Order Lifecycle & Auto-Expiry
-- Adds 'expired' and 'cancelled_by_customer' statuses, expiry index, and auto-expire function.

-- 1. Mở rộng check constraint cho order_status
alter table public.pos_orders drop constraint if exists pos_orders_order_status_check;
alter table public.pos_orders add constraint pos_orders_order_status_check
  check (order_status in (
    'awaiting_confirmation',
    'accepted',
    'rejected',
    'completed',
    'cancelled',
    'expired',
    'cancelled_by_customer'
  ));

-- 2. Thêm cột expires_at (thời điểm hết hạn tự động của đơn QR)
alter table public.pos_orders add column if not exists expires_at timestamptz;

-- 3. Tạo index phục vụ tìm kiếm đơn hết hạn
create index if not exists pos_orders_expiry_idx
  on public.pos_orders (order_status, created_at)
  where order_status = 'awaiting_confirmation';

-- 4. Hàm quét và tự động chuyển các đơn QR quá hạn sang 'expired'
create or replace function public.expire_stale_qr_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.pos_orders
  set order_status = 'expired',
      updated_at = now()
  where source = 'QR_TABLE'
    and order_status = 'awaiting_confirmation'
    and (
      (expires_at is not null and expires_at < now())
      or
      (expires_at is null and created_at < now() - interval '15 minutes')
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.expire_stale_qr_orders() to authenticated;
grant execute on function public.expire_stale_qr_orders() to service_role;
