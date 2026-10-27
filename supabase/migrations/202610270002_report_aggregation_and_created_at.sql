-- Phase 3: Database Optimization for Reports & Timestamps
-- Adds TIMESTAMPTZ created_at column with B-Tree indexes and Server-Side RPC aggregation

-- 1. Bổ sung created_at cho bảng HOADON và HOADONDETAIL
alter table public."HOADON" add column if not exists created_at timestamptz default now();
create index if not exists hoadon_created_at_idx on public."HOADON" (created_at);
create index if not exists hoadon_status_idx on public."HOADON" ("Trạng thái");

alter table public."HOADONDETAIL" add column if not exists created_at timestamptz default now();
create index if not exists hoadondetail_idhoadon_idx on public."HOADONDETAIL" ("IDHOADON");
create index if not exists hoadondetail_idsp_idx on public."HOADONDETAIL" ("IDSP");

-- 2. Hàm RPC tính nhanh tổng hợp KPI doanh thu bằng SQL
create or replace function public.get_sales_kpi_summary(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_revenue numeric := 0;
  v_orders integer := 0;
  v_avg_order numeric := 0;
begin
  select 
    coalesce(sum("Tổng tiền"), 0),
    count(*)
  into v_revenue, v_orders
  from public."HOADON"
  where "Trạng thái" = 'Đã thanh toán'
    and created_at >= p_from 
    and created_at <= p_to;

  if v_orders > 0 then
    v_avg_order := v_revenue / v_orders;
  end if;

  return jsonb_build_object(
    'revenue', v_revenue,
    'orders', v_orders,
    'averageOrderValue', round(v_avg_order, 2)
  );
end;
$$;

grant execute on function public.get_sales_kpi_summary(timestamptz, timestamptz) to authenticated;
grant execute on function public.get_sales_kpi_summary(timestamptz, timestamptz) to service_role;
