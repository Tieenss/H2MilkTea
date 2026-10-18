-- Rollback Phase 2: QR Order Lifecycle
drop function if exists public.expire_stale_qr_orders();
drop index if exists public.pos_orders_expiry_idx;
alter table public.pos_orders drop column if exists expires_at;

alter table public.pos_orders drop constraint if exists pos_orders_order_status_check;
alter table public.pos_orders add constraint pos_orders_order_status_check
  check (order_status in ('awaiting_confirmation', 'accepted', 'rejected', 'completed', 'cancelled'));
