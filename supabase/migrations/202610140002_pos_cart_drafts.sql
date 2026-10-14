-- Shared POS cart drafts for multi-device cashier testing.
create table if not exists public.pos_cart_drafts (
  table_id text primary key,
  cart jsonb not null default '[]'::jsonb check (jsonb_typeof(cart) = 'array'),
  selected_customer jsonb,
  version bigint not null default 1,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.pos_cart_drafts enable row level security;

drop policy if exists "staff can read cart drafts" on public.pos_cart_drafts;
create policy "staff can read cart drafts" on public.pos_cart_drafts
  for select to authenticated using (auth.uid() is not null);

drop policy if exists "staff can write cart drafts" on public.pos_cart_drafts;
create policy "staff can write cart drafts" on public.pos_cart_drafts
  for insert to authenticated with check (auth.uid() is not null);

drop policy if exists "staff can update cart drafts" on public.pos_cart_drafts;
create policy "staff can update cart drafts" on public.pos_cart_drafts
  for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

alter table public.pos_cart_drafts replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.pos_cart_drafts;
exception when duplicate_object then null;
when undefined_object then
  raise notice 'Publication supabase_realtime not found; add public.pos_cart_drafts to Realtime publication in Supabase.';
end $$;
