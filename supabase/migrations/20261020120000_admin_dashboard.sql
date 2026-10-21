-- Inicio del panel: cliente en la venta, costo en cada línea vendida (para la
-- ganancia), pedidos en camino y la función que arma el resumen.

-- ---------------------------------------------------------------------------
-- Cliente de la venta (opcional). Las ventas web lo toman de la reserva.
-- ---------------------------------------------------------------------------
alter table sales
  add column customer_name text
    check (customer_name is null or (btrim(customer_name) <> '' and char_length(customer_name) <= 120));

update sales s
set customer_name = w.customer_name
from web_orders w
where w.sale_id = s.id;

-- ---------------------------------------------------------------------------
-- Costo de cada línea vendida: el cost_price de la variante en el momento de
-- la venta. Lo completa un trigger, así create_sale y mark_web_order_paid no
-- cambian. Las ventas viejas toman el costo de hoy (no había otro dato).
-- ---------------------------------------------------------------------------
alter table sale_items add column unit_cost numeric(12, 2);

update sale_items si
set unit_cost = pv.cost_price
from product_variants pv
where pv.id = si.variant_id;

alter table sale_items alter column unit_cost set not null;

create function set_sale_item_unit_cost()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.unit_cost is null then
    select cost_price into new.unit_cost from product_variants where id = new.variant_id;
    new.unit_cost := coalesce(new.unit_cost, 0);
  end if;
  return new;
end;
$$;

create trigger trg_sale_items_unit_cost
before insert on sale_items
for each row
execute function set_sale_item_unit_cost();

-- ---------------------------------------------------------------------------
-- Pedidos en camino: la compra se registra (y se paga) antes de que llegue.
-- El stock y el último costo entran recién al marcarla recibida.
-- ---------------------------------------------------------------------------
alter table purchases
  add column status text not null default 'recibida' check (status in ('recibida', 'en_camino')),
  add column received_at timestamptz;

update purchases set received_at = created_at;

alter table purchases
  add constraint purchases_status_consistency check (
    (status = 'recibida' and received_at is not null) or (status = 'en_camino' and received_at is null)
  );

alter table purchases alter column received_at set default now();

create or replace function increment_stock_on_purchase_item()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- En camino: el stock entra con receive_purchase.
  if exists (select 1 from purchases where id = new.purchase_id and status = 'en_camino') then
    return new;
  end if;

  update product_variants
  set stock_quantity = stock_quantity + new.quantity,
      cost_price = new.unit_cost
  where id = new.variant_id;

  if not found then
    raise exception 'product_variants.id % no existe', new.variant_id;
  end if;

  return new;
end;
$$;

-- Errores: RP404 no existe · RP409 ya estaba recibida.
create function receive_purchase(p_purchase_id uuid)
returns purchases
language plpgsql
set search_path = public
as $$
declare
  v_purchase purchases;
begin
  select * into v_purchase from purchases where id = p_purchase_id for update;

  if not found then
    raise exception 'No existe el pedido %', p_purchase_id using errcode = 'RP404';
  end if;

  if v_purchase.status <> 'en_camino' then
    raise exception 'El pedido ya estaba recibido' using errcode = 'RP409';
  end if;

  -- Mismo orden de locks que create_sale.
  perform 1 from product_variants
  where id in (select variant_id from purchase_items where purchase_id = p_purchase_id)
  order by id
  for update;

  update product_variants pv
  set stock_quantity = pv.stock_quantity + i.quantity,
      cost_price = i.unit_cost
  from (
    select distinct on (variant_id) variant_id,
           sum(quantity) over (partition by variant_id) as quantity,
           unit_cost
    from purchase_items
    where purchase_id = p_purchase_id
    order by variant_id, id
  ) as i
  where pv.id = i.variant_id;

  update purchases
  set status = 'recibida', received_at = now()
  where id = p_purchase_id
  returning * into v_purchase;

  return v_purchase;
end;
$$;

-- ---------------------------------------------------------------------------
-- Resumen con ganancia bruta: lo cobrado menos el costo de lo vendido.
-- ---------------------------------------------------------------------------
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
    'gross_profit', coalesce((select sum(total_amount) from period_sales), 0) - coalesce((
      select sum(si.quantity * si.unit_cost)
      from period_sales ps join sale_items si on si.sale_id = ps.id
    ), 0),
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

-- ---------------------------------------------------------------------------
-- admin_dashboard: todo lo del Inicio en una llamada.
--   p_from/p_to: el período elegido (Hoy, Semana, Mes) · p_prev_*: el tramo
--   equivalente del período anterior, para comparar · p_tz: zona del panel,
--   para cortar los días (o las horas, si el período es un día).
-- Alertas por producto: sin stock, poco stock (3 o menos en total) o con
-- algunos modelos agotados.
-- La caja, el stock, las alertas y los pedidos no dependen del período.
-- ---------------------------------------------------------------------------
create function admin_dashboard(
  p_from timestamptz,
  p_to timestamptz,
  p_prev_from timestamptz,
  p_prev_to timestamptz,
  p_tz text default 'America/Argentina/Buenos_Aires'
)
returns json
language sql
stable
set search_path = public
as $$
  with period_sales as (
    select s.id, s.sale_date, s.total_amount,
           coalesce((select sum(si.quantity * si.unit_cost) from sale_items si where si.sale_id = s.id), 0) as cost
    from sales s
    where s.status = 'completada' and s.sale_date >= p_from and s.sale_date < p_to
  ),
  step as (
    select case when p_to - p_from <= interval '25 hours' then 'hour' else 'day' end as unit
  ),
  buckets as (
    select b
    from step,
         generate_series(
           date_trunc(step.unit, p_from at time zone p_tz),
           (p_to at time zone p_tz) - interval '1 second',
           ('1 ' || step.unit)::interval
         ) as b
  ),
  product_stock as (
    select p.id, p.name,
           sum(pv.stock_quantity)::int as stock,
           count(*)::int as variants,
           count(*) filter (where pv.stock_quantity = 0)::int as empty_variants
    from products p
    join product_variants pv on pv.product_id = p.id and pv.active
    where p.active
    group by p.id, p.name
  ),
  stock_alerts as (
    select id, name, stock, variants, empty_variants,
           case when stock = 0 then 'sin_stock' when stock <= 3 then 'poco_stock' else 'modelos' end as kind
    from product_stock
    where stock <= 3 or empty_variants > 0
  )
  select json_build_object(
    'sales', json_build_object(
      'total_amount', coalesce((select sum(total_amount) from period_sales), 0),
      'sales_count', (select count(*) from period_sales),
      'gross_profit', coalesce((select sum(total_amount - cost) from period_sales), 0),
      'prev_total_amount', coalesce((
        select sum(total_amount) from sales
        where status = 'completada' and sale_date >= p_prev_from and sale_date < p_prev_to
      ), 0)
    ),
    'series', json_build_object(
      'unit', (select unit from step),
      'points', coalesce((
        select json_agg(json_build_object(
                 'bucket', to_char(b.b, 'YYYY-MM-DD"T"HH24:MI'),
                 'total_amount', coalesce(agg.total, 0),
                 'sales_count', coalesce(agg.cnt, 0)
               ) order by b.b)
        from buckets b
        left join (
          select date_trunc((select unit from step), ps.sale_date at time zone p_tz) as b,
                 sum(ps.total_amount) as total, count(*) as cnt
          from period_sales ps
          group by 1
        ) as agg on agg.b = b.b
      ), '[]'::json)
    ),
    'cash', (
      select json_build_object(
        'efectivo', coalesce(sum(total_amount) filter (where payment_method = 'efectivo'), 0),
        'transferencia', coalesce(sum(total_amount) filter (where payment_method = 'transferencia'), 0),
        'purchases', (select coalesce(sum(total_amount), 0) from purchases)
      )
      from sales
      where status = 'completada'
    ),
    'stock', (
      select json_build_object(
        'cost_value', coalesce(sum(pv.stock_quantity * pv.cost_price), 0),
        'retail_value', coalesce(sum(pv.stock_quantity * pv.price), 0),
        'units', coalesce(sum(pv.stock_quantity), 0),
        'without_cost', count(*) filter (where pv.cost_price = 0)
      )
      from product_variants pv
      where pv.stock_quantity > 0
    ),
    'alerts', json_build_object(
      'out_of_stock', (select count(*) from stock_alerts where kind = 'sin_stock'),
      'low_stock', (select count(*) from stock_alerts where kind = 'poco_stock'),
      'missing_models', (select count(*) from stock_alerts where kind = 'modelos'),
      'products', coalesce((
        select json_agg(a order by a.kind desc, a.stock, a.name)
        from (select * from stock_alerts order by kind desc, stock, name limit 50) as a
      ), '[]'::json),
      'web_pending', (select count(*) from web_orders where status = 'pendiente'),
      'purchases_on_the_way', (select count(*) from purchases where status = 'en_camino')
    ),
    'purchases', coalesce((
      select json_agg(pu order by pu.created_at desc)
      from (
        select pu.id, pu.purchase_date, pu.created_at, pu.total_amount, pu.status, pu.received_at,
               s.name as supplier_name,
               (select coalesce(sum(quantity), 0) from purchase_items where purchase_id = pu.id)::int as units
        from purchases pu
        join suppliers s on s.id = pu.supplier_id
        order by pu.created_at desc
        limit 6
      ) as pu
    ), '[]'::json)
  );
$$;

revoke execute on function receive_purchase(uuid) from public, anon, authenticated;
revoke execute on function admin_dashboard(timestamptz, timestamptz, timestamptz, timestamptz, text)
  from public, anon, authenticated;
revoke execute on function set_sale_item_unit_cost() from public, anon, authenticated;
grant execute on function receive_purchase(uuid) to service_role;
grant execute on function admin_dashboard(timestamptz, timestamptz, timestamptz, timestamptz, text) to service_role;

-- ---------------------------------------------------------------------------
-- create_sale: suma el cliente (opcional). Mismo cuerpo que antes.
-- ---------------------------------------------------------------------------
drop function create_sale(text, text, text, int, jsonb);

CREATE FUNCTION public.create_sale(p_payment_method text, p_channel text, p_notes text, p_discount_percent integer, p_items jsonb, p_customer_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_sale sales;
  v_line record;
  v_price numeric(12, 2);
  v_stock int;
  v_discount_percent int := coalesce(p_discount_percent, 0);
  v_subtotal numeric(12, 2);
  v_discount numeric(12, 2);
  v_items jsonb;
begin
  if p_payment_method is null or p_payment_method not in ('efectivo', 'transferencia') then
    raise exception 'payment_method debe ser uno de: efectivo, transferencia' using errcode = 'CS400';
  end if;

  if p_channel is not null and p_channel not in ('feria', 'whatsapp', 'web') then
    raise exception 'channel debe ser uno de: feria, whatsapp, web (o no enviarse)' using errcode = 'CS400';
  end if;

  if v_discount_percent < 0 or v_discount_percent > 100 then
    raise exception 'discount_percent debe ser un entero entre 0 y 100' using errcode = 'CS400';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene items' using errcode = 'CS400';
  end if;

  drop table if exists _sale_lines;
  create temp table _sale_lines on commit drop as
  select t.ord as line_no,
         (t.e ->> 'variant_id')::uuid as variant_id,
         (t.e ->> 'quantity')::numeric as quantity,
         (t.e ->> 'unit_price')::numeric as unit_price
  from jsonb_array_elements(p_items) with ordinality as t(e, ord);

  if exists (
    select 1 from _sale_lines
    where variant_id is null or quantity is null or quantity <= 0 or quantity <> trunc(quantity)
  ) then
    raise exception 'Cada item necesita variant_id y una cantidad entera mayor a 0' using errcode = 'CS400';
  end if;

  -- Lock por variante en orden de id (sin deadlocks entre ventas simultáneas):
  -- desde acá el precio y el stock no pueden cambiar hasta el commit.
  for v_line in
    select l.variant_id, sum(l.quantity) as quantity, pv.sku
    from _sale_lines l
    left join product_variants pv on pv.id = l.variant_id
    group by l.variant_id, pv.sku
    order by l.variant_id
  loop
    if v_line.sku is null then
      raise exception 'Alguna de las variantes de la venta no existe' using errcode = 'CS404';
    end if;

    select price, stock_quantity into v_price, v_stock
    from product_variants where id = v_line.variant_id for update;

    if exists (
      select 1 from _sale_lines
      where variant_id = v_line.variant_id and unit_price is not null and unit_price <> v_price
    ) then
      raise exception 'El precio de % cambió', v_line.sku
        using errcode = 'CS409',
              detail = json_build_object('sku', v_line.sku, 'price', v_price)::text;
    end if;

    if v_stock < v_line.quantity then
      raise exception 'No alcanza el stock de %: quedan % y se quieren vender %',
        v_line.sku, v_stock, v_line.quantity
        using errcode = 'CS410';
    end if;
  end loop;

  select sum(l.quantity * pv.price) into v_subtotal
  from _sale_lines l
  join product_variants pv on pv.id = l.variant_id;

  v_discount := round(v_subtotal * v_discount_percent / 100);

  insert into sales (payment_method, channel, notes, subtotal, total_amount, discount_percent, discount_amount, customer_name)
  values (p_payment_method, p_channel, p_notes, v_subtotal, v_subtotal - v_discount, v_discount_percent, v_discount,
          nullif(btrim(coalesce(p_customer_name, '')), ''))
  returning * into v_sale;

  -- El trigger de sale_items descuenta el stock (y vuelve a validar que alcance).
  insert into sale_items (sale_id, variant_id, quantity, unit_price)
  select v_sale.id, l.variant_id, l.quantity::int, pv.price
  from _sale_lines l
  join product_variants pv on pv.id = l.variant_id
  order by l.line_no;

  select coalesce(jsonb_agg(to_jsonb(si)), '[]'::jsonb) into v_items
  from sale_items si where si.sale_id = v_sale.id;

  return to_jsonb(v_sale) || jsonb_build_object('sale_items', v_items);
end;
$function$;

revoke execute on function create_sale(text, text, text, int, jsonb, text) from public, anon, authenticated;
grant execute on function create_sale(text, text, text, int, jsonb, text) to service_role;

-- ---------------------------------------------------------------------------
-- mark_web_order_paid: la venta lleva el nombre de quien reservó.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_web_order_paid(p_order_id uuid)
 RETURNS web_orders
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_order web_orders;
  v_sale_id uuid;
begin
  select * into v_order from web_orders where id = p_order_id for update;

  if not found then
    raise exception 'No existe la reserva %', p_order_id using errcode = 'WO404';
  end if;

  if v_order.status <> 'pendiente' then
    raise exception 'La reserva % ya está %', v_order.code, v_order.status using errcode = 'WO409';
  end if;

  insert into sales (payment_method, channel, notes, subtotal, total_amount, discount_percent, discount_amount, customer_name)
  values ('transferencia', 'web',
          'Venta web ' || v_order.code || ' · ' || v_order.customer_name || ' · ' || v_order.customer_phone,
          v_order.total_amount, v_order.total_amount, 0, 0, v_order.customer_name)
  returning id into v_sale_id;

  update product_variants pv
  set stock_quantity = pv.stock_quantity + i.quantity
  from (
    select variant_id, sum(quantity) as quantity
    from web_order_items where order_id = p_order_id group by variant_id
  ) as i
  where pv.id = i.variant_id;

  insert into sale_items (sale_id, variant_id, quantity, unit_price)
  select v_sale_id, variant_id, quantity, unit_price
  from web_order_items where order_id = p_order_id;

  update web_orders
  set status = 'pagada', paid_at = now(), sale_id = v_sale_id
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$function$;

-- ---------------------------------------------------------------------------
-- create_purchase_grid: p_status elige si el pedido ya llegó o está en camino.
-- ---------------------------------------------------------------------------
drop function create_purchase_grid(uuid, date, text, jsonb);

CREATE FUNCTION public.create_purchase_grid(p_supplier_id uuid, p_purchase_date date, p_notes text, p_products jsonb, p_status text DEFAULT 'recibida'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_purchase purchases;
  v_block record;
  v_row record;
  v_product_id uuid;
  v_variant_id uuid;
  v_new jsonb;
  v_name text;
  v_category_id uuid;
  v_description text;
  v_sale_price numeric;
  v_quantity numeric;
  v_cost numeric;
  v_price numeric;
  v_sku text;
  v_color text;
  v_model_id uuid;
  v_total numeric(12, 2);
  v_items jsonb;
  v_created_products jsonb := '[]'::jsonb;
  v_created_variants int := 0;
  v_updated_prices int := 0;
  v_old product_variants;
begin
  if p_status is null or p_status not in ('recibida', 'en_camino') then
    raise exception 'status debe ser recibida o en_camino' using errcode = 'CP400';
  end if;

  if p_supplier_id is null or not exists (select 1 from suppliers where id = p_supplier_id) then
    raise exception 'El proveedor indicado no existe' using errcode = 'CP404';
  end if;

  if p_products is null or jsonb_typeof(p_products) <> 'array' or jsonb_array_length(p_products) = 0 then
    raise exception 'La compra no tiene productos' using errcode = 'CP400';
  end if;

  drop table if exists _grid_lines;
  create temp table _grid_lines (
    line_no serial,
    variant_id uuid not null,
    quantity int not null,
    unit_cost numeric(12, 2) not null,
    new_price numeric(12, 2)
  ) on commit drop;

  for v_block in
    select t.e, t.ord from jsonb_array_elements(p_products) with ordinality as t(e, ord) order by t.ord
  loop
    v_new := v_block.e -> 'new_product';

    if v_new is not null and jsonb_typeof(v_new) = 'object' then
      v_name := btrim(coalesce(v_new ->> 'name', ''));
      v_category_id := (v_new ->> 'category_id')::uuid;
      v_description := nullif(btrim(coalesce(v_new ->> 'description', '')), '');

      if v_name = '' then
        raise exception 'El producto nuevo necesita un nombre' using errcode = 'CP400';
      end if;
      if v_category_id is null or not exists (select 1 from categories where id = v_category_id) then
        raise exception 'La categoría de "%" no existe', v_name using errcode = 'CP404';
      end if;
      -- También agarra dos productos nuevos con el mismo nombre en la misma
      -- compra: el primero ya está insertado cuando se revisa el segundo.
      if exists (select 1 from products where lower(btrim(name)) = lower(v_name)) then
        raise exception 'Ya existe un producto llamado "%"', v_name using errcode = 'CP409';
      end if;

      insert into products (category_id, name, description)
      values (v_category_id, v_name, v_description)
      returning id into v_product_id;

      v_created_products := v_created_products
        || jsonb_build_object('block', v_block.ord - 1, 'id', v_product_id, 'name', v_name);
    else
      v_product_id := (v_block.e ->> 'product_id')::uuid;
      select name into v_name from products where id = v_product_id;
      if v_product_id is null or v_name is null then
        raise exception 'Alguno de los productos de la compra no existe' using errcode = 'CP404';
      end if;
    end if;

    v_sale_price := (v_block.e ->> 'new_sale_price')::numeric;
    if v_sale_price is not null and v_sale_price <= 0 then
      raise exception 'El nuevo precio de venta de "%" tiene que ser mayor a 0', v_name using errcode = 'CP400';
    end if;

    if jsonb_typeof(v_block.e -> 'rows') is distinct from 'array' or jsonb_array_length(v_block.e -> 'rows') = 0 then
      raise exception '"%" no tiene modelos con cantidad', v_name using errcode = 'CP400';
    end if;

    for v_row in
      select t.e from jsonb_array_elements(v_block.e -> 'rows') with ordinality as t(e, ord) order by t.ord
    loop
      v_quantity := (v_row.e ->> 'quantity')::numeric;
      v_cost := (v_row.e ->> 'unit_cost')::numeric;

      if v_quantity is null or v_quantity <= 0 or v_quantity <> trunc(v_quantity) then
        raise exception 'Cada fila de "%" necesita una cantidad entera mayor a 0', v_name using errcode = 'CP400';
      end if;
      if v_cost is null or v_cost <= 0 then
        raise exception 'Cada fila de "%" necesita un costo mayor a 0', v_name using errcode = 'CP400';
      end if;

      v_variant_id := (v_row.e ->> 'variant_id')::uuid;

      if v_variant_id is not null then
        if not exists (select 1 from product_variants where id = v_variant_id and product_id = v_product_id) then
          raise exception 'Alguna de las variantes de "%" no existe', v_name using errcode = 'CP404';
        end if;

        insert into _grid_lines (variant_id, quantity, unit_cost, new_price)
        values (v_variant_id, v_quantity::int, v_cost, v_sale_price);
      else
        v_sku := btrim(coalesce(v_row.e ->> 'sku', ''));
        v_color := nullif(btrim(coalesce(v_row.e ->> 'color', '')), '');
        v_model_id := (v_row.e ->> 'iphone_model_id')::uuid;
        v_price := (v_row.e ->> 'price')::numeric;

        if v_sku = '' then
          raise exception 'Cada variante nueva de "%" necesita un SKU', v_name using errcode = 'CP400';
        end if;
        if v_price is null or v_price <= 0 then
          raise exception 'Cada variante nueva de "%" necesita un precio de venta mayor a 0', v_name
            using errcode = 'CP400';
        end if;
        if v_model_id is not null and not exists (select 1 from iphone_models where id = v_model_id) then
          raise exception 'Alguno de los modelos de "%" no existe', v_name using errcode = 'CP404';
        end if;
        select * into v_old
        from product_variants
        where product_id = v_product_id
          and iphone_model_id is not distinct from v_model_id
          and lower(coalesce(btrim(color), '')) = lower(coalesce(v_color, ''))
        order by active desc
        limit 1;

        if found and v_old.active then
          raise exception '"%" ya tiene una variante con ese modelo y color', v_name using errcode = 'CP409';
        elsif found then
          -- Estaba archivada (se eliminó teniendo historial): vuelve, con su
          -- SKU de siempre y el precio que se carga ahora. El stock lo suma la compra.
          update product_variants set active = true, price = v_price where id = v_old.id;
          v_variant_id := v_old.id;
        else
          if exists (select 1 from product_variants where sku = v_sku) then
            raise exception 'Ya existe una variante con el SKU "%"', v_sku using errcode = 'CP409';
          end if;

          -- Stock 0: lo suma el trigger de purchase_items, igual que en una compra común.
          insert into product_variants (product_id, iphone_model_id, color, sku, price)
          values (v_product_id, v_model_id, v_color, v_sku, v_price)
          returning id into v_variant_id;
        end if;
        v_created_variants := v_created_variants + 1;

        insert into _grid_lines (variant_id, quantity, unit_cost, new_price)
        values (v_variant_id, v_quantity::int, v_cost, null);
      end if;
    end loop;
  end loop;

  if exists (select 1 from _grid_lines group by variant_id having count(*) > 1) then
    raise exception 'Una misma variante aparece dos veces en la compra' using errcode = 'CP400';
  end if;

  -- Mismo orden de locks que create_sale, para no cruzarse con una venta.
  perform 1 from product_variants
  where id in (select variant_id from _grid_lines)
  order by id
  for update;

  select sum(quantity * unit_cost) into v_total from _grid_lines;

  insert into purchases (supplier_id, purchase_date, notes, total_amount, status, received_at)
  values (p_supplier_id, coalesce(p_purchase_date, current_date), p_notes, v_total,
          p_status, case when p_status = 'recibida' then now() end)
  returning * into v_purchase;

  insert into purchase_items (purchase_id, variant_id, quantity, unit_cost)
  select v_purchase.id, variant_id, quantity, unit_cost
  from _grid_lines
  order by line_no;

  -- Solo las variantes compradas de los bloques que pidieron precio nuevo.
  update product_variants pv
  set price = l.new_price
  from _grid_lines l
  where pv.id = l.variant_id and l.new_price is not null and pv.price <> l.new_price;
  get diagnostics v_updated_prices = row_count;

  select coalesce(jsonb_agg(to_jsonb(pi)), '[]'::jsonb) into v_items
  from purchase_items pi where pi.purchase_id = v_purchase.id;

  return to_jsonb(v_purchase) || jsonb_build_object(
    'purchase_items', v_items,
    'created_products', v_created_products,
    'created_variants', v_created_variants,
    'updated_prices', v_updated_prices
  );
end;
$function$;

revoke execute on function create_purchase_grid(uuid, date, text, jsonb, text) from public, anon, authenticated;
grant execute on function create_purchase_grid(uuid, date, text, jsonb, text) to service_role;
