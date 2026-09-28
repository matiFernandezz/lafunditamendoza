-- Descuento porcentual sobre el total de la venta (p. ej. 10% / 15% a amigos).
--
-- total_amount pasa a ser siempre lo que realmente se cobró (con el
-- descuento ya aplicado): así "Total ingresado" en el historial es plata
-- real. Los items conservan su precio de lista; el descuento vive en la venta.
-- Ventas existentes: 0% y $0 de descuento, su total no cambia.

alter table sales
  add column discount_percent smallint not null default 0
    check (discount_percent between 0 and 99),
  add column discount_amount numeric(12, 2) not null default 0
    check (discount_amount >= 0);

-- Sin porcentaje no puede haber monto descontado.
alter table sales
  add constraint sales_discount_consistency check (discount_percent > 0 or discount_amount = 0);

-- Mismo resumen que antes, más dos cambios:
-- · discount_total: cuánto se descontó en el período (ventas completadas).
-- · top_products.revenue reparte el descuento de cada venta entre sus
--   productos (proporción cobrado / precio de lista), para que la
--   facturación por producto también sea plata real.
create or replace function sales_summary(p_from timestamptz, p_to timestamptz)
returns json
language sql
stable
set search_path = public
as $$
  with period_sales as (
    select id, total_amount, discount_amount, payment_method,
           total_amount / nullif(total_amount + discount_amount, 0) as charged_ratio
    from sales
    where status = 'completada'
      and sale_date >= p_from
      and sale_date < p_to
  )
  select json_build_object(
    'total_amount', coalesce((select sum(total_amount) from period_sales), 0),
    'discount_total', coalesce((select sum(discount_amount) from period_sales), 0),
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
               round(sum(si.quantity * si.unit_price * coalesce(ps.charged_ratio, 1)), 2) as revenue
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

-- create or replace conserva los permisos, pero se reafirman por las dudas:
-- solo el backend puede leer la facturación.
revoke execute on function sales_summary(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function sales_summary(timestamptz, timestamptz) to service_role;
