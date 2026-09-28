-- Anulación de ventas + resumen del período para el historial del panel.
--
-- Una venta nunca se borra: se anula. La anulada queda registrada con fecha
-- y motivo, devuelve su stock y deja de contar en cualquier total.

alter table sales
  add column status text not null default 'completada'
    check (status in ('completada', 'anulada')),
  add column voided_at timestamptz,
  add column void_reason text;

-- Anulada <=> tiene fecha y motivo. Evita ventas "a medio anular".
alter table sales
  add constraint sales_void_consistency check (
    (status = 'completada' and voided_at is null and void_reason is null)
    or (status = 'anulada' and voided_at is not null and btrim(coalesce(void_reason, '')) <> '')
  );

-- El historial siempre filtra por rango de fechas y ordena por fecha.
create index idx_sales_sale_date on sales (sale_date desc);

-- ---------------------------------------------------------------------------
-- void_sale: todo en una transacción (la de la llamada). El "for update" sobre
-- la venta serializa dos anulaciones simultáneas: la segunda espera, ve el
-- estado 'anulada' y falla, así que el stock nunca se devuelve dos veces.
--
-- Códigos de error propios para que el backend responda el HTTP correcto:
--   VS400 motivo vacío · VS404 la venta no existe · VS409 ya estaba anulada
-- ---------------------------------------------------------------------------
create function void_sale(p_sale_id uuid, p_reason text)
returns sales
language plpgsql
set search_path = public
as $$
declare
  v_sale sales;
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'El motivo de la anulación es obligatorio' using errcode = 'VS400';
  end if;

  select * into v_sale from sales where id = p_sale_id for update;

  if not found then
    raise exception 'No existe una venta con id %', p_sale_id using errcode = 'VS404';
  end if;

  if v_sale.status = 'anulada' then
    raise exception 'La venta ya está anulada (desde %)', v_sale.voided_at using errcode = 'VS409';
  end if;

  update product_variants pv
  set stock_quantity = pv.stock_quantity + returned.quantity
  from (
    select variant_id, sum(quantity) as quantity
    from sale_items
    where sale_id = p_sale_id
    group by variant_id
  ) as returned
  where pv.id = returned.variant_id;

  update sales
  set status = 'anulada', voided_at = now(), void_reason = btrim(p_reason)
  where id = p_sale_id
  returning * into v_sale;

  return v_sale;
end;
$$;

-- ---------------------------------------------------------------------------
-- sales_summary: números del período [p_from, p_to), calculados acá y no en JS.
-- Solo ventas completadas: las anuladas no suman en nada.
-- ---------------------------------------------------------------------------
create function sales_summary(p_from timestamptz, p_to timestamptz)
returns json
language sql
stable
set search_path = public
as $$
  with period_sales as (
    select id, total_amount, payment_method
    from sales
    where status = 'completada'
      and sale_date >= p_from
      and sale_date < p_to
  )
  select json_build_object(
    'total_amount', coalesce((select sum(total_amount) from period_sales), 0),
    'sales_count', (select count(*) from period_sales),
    'average_ticket', coalesce((select round(avg(total_amount), 2) from period_sales), 0),
    'by_payment_method', coalesce((
      select json_agg(pm order by pm.total_amount desc)
      from (
        select payment_method, sum(total_amount) as total_amount, count(*) as sales_count
        from period_sales
        group by payment_method
      ) as pm
    ), '[]'::json),
    'top_products', coalesce((
      select json_agg(tp order by tp.units desc, tp.revenue desc)
      from (
        select p.id as product_id,
               p.name as product_name,
               sum(si.quantity)::int as units,
               sum(si.quantity * si.unit_price) as revenue
        from period_sales ps
        join sale_items si on si.sale_id = ps.id
        join product_variants pv on pv.id = si.variant_id
        join products p on p.id = pv.product_id
        group by p.id, p.name
        order by units desc, revenue desc
        limit 10
      ) as tp
    ), '[]'::json)
  );
$$;

-- Las funciones de public se pueden llamar por /rest/v1/rpc y Supabase le da
-- EXECUTE a anon/authenticated por defecto: sin esto cualquiera con la anon
-- key podría anular ventas o leer la facturación. Solo el backend.
revoke execute on function void_sale(uuid, text) from public, anon, authenticated;
revoke execute on function sales_summary(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function void_sale(uuid, text) to service_role;
grant execute on function sales_summary(timestamptz, timestamptz) to service_role;
