-- Rollback Phase 1: Core POS transaction safety
drop function if exists public.pos_pay_order(jsonb);
drop function if exists public.pos_transfer_table_cart(text, text, uuid);
drop index if exists public.hoadon_idempotency_key_idx;
alter table public."HOADON" drop column if exists idempotency_key;
