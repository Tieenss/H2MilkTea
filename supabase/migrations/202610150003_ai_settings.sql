create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "authenticated users can read app settings" on public.app_settings;
create policy "authenticated users can read app settings"
  on public.app_settings for select to authenticated using (auth.uid() is not null);

insert into public.app_settings (key, value)
values ('ai_assistant_enabled', 'true'::jsonb)
on conflict (key) do nothing;
