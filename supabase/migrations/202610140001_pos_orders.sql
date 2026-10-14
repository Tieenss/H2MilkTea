-- Shared order source for POS counter orders and customer QR orders.
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

alter table public.pos_orders enable row level security;

-- Realtime subscriptions for staff require an authenticated Supabase session.
drop policy if exists "staff can read pos orders" on public.pos_orders;
create policy "staff can read pos orders" on public.pos_orders
  for select to authenticated using (auth.uid() is not null);

drop policy if exists "staff can update pos orders" on public.pos_orders;
create policy "staff can update pos orders" on public.pos_orders
  for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

alter table public.pos_orders replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.pos_orders;
exception when duplicate_object then null;
when undefined_object then
  raise notice 'Publication supabase_realtime not found; add public.pos_orders to Realtime publication in Supabase.';
end $$;
