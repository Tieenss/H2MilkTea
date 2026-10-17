do $$
begin
  alter publication supabase_realtime drop table if exists public.pos_cart_drafts;
exception when undefined_object then null;
end $$;

drop table if exists public.pos_cart_drafts cascade;
