-- Compras como pedidos: número de pedido, cuatro estados (armando, pagado,
-- en camino, recibido) con su fecha, envío aparte, y datos del proveedor
-- (cómo se le paga, envío estimado, notas). El stock entra solo al recibir.

-- ---------------------------------------------------------------------------
-- Proveedores
-- ---------------------------------------------------------------------------
alter table suppliers
  add column payment_method text check (payment_method is null or char_length(payment_method) <= 120),
  add column shipping_cost numeric(12, 2) not null default 0 check (shipping_cost >= 0),
  add column notes text check (notes is null or char_length(notes) <= 1000);

-- ---------------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------------
alter table purchases drop constraint purchases_status_consistency;
alter table purchases drop constraint purchases_status_check;

update purchases set status = 'recibida' where status <> 'en_camino';

alter table purchases
  add column number int,
  add column shipping_cost numeric(12, 2) not null default 0 check (shipping_cost >= 0),
  add column paid_at timestamptz,
  add column shipped_at timestamptz;

-- Los pedidos que ya había se numeran por orden de carga.
create sequence purchase_number_seq start 1;
update purchases p
set number = n.rn
from (select id, row_number() over (order by created_at, id) as rn from purchases) as n
where n.id = p.id;
select setval('purchase_number_seq', coalesce((select max(number) from purchases), 0) + 1, false);
alter sequence purchase_number_seq owned by purchases.number;
alter table purchases
  alter column number set default nextval('purchase_number_seq'),
  alter column number set not null,
  add constraint purchases_number_key unique (number);
grant usage, select on sequence purchase_number_seq to service_role;

-- Ya pagados: todo lo cargado hasta hoy se pagó al registrarse.
update purchases set paid_at = created_at;
update purchases set shipped_at = coalesce(received_at, created_at) where status = 'recibida';

-- create_purchase (formato por ítems) inserta sin fechas: es una compra ya
-- recibida y pagada. create_purchase_grid las manda explícitas según el estado.
alter table purchases
  alter column paid_at set default now(),
  alter column shipped_at set default now();

alter table purchases
  add constraint purchases_status_check
    check (status in ('armando', 'pagado', 'en_camino', 'recibida')),
  add constraint purchases_status_consistency check (
    (status = 'recibida') = (received_at is not null)
    and (status = 'armando' or paid_at is not null)
  );

create index idx_purchases_status on purchases (status, created_at desc);

-- El stock (y el último costo) entra solo con el pedido recibido.
create or replace function increment_stock_on_purchase_item()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from purchases where id = new.purchase_id and status = 'recibida') then
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

-- Recibir: desde cualquier estado anterior. Suma el stock y guarda el último costo.
-- Errores: RP404 no existe · RP409 ya estaba recibido.
create or replace function receive_purchase(p_purchase_id uuid)
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

  if v_purchase.status = 'recibida' then
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
  set status = 'recibida',
      received_at = now(),
      paid_at = coalesce(paid_at, now()),
      shipped_at = coalesce(shipped_at, now())
  where id = p_purchase_id
  returning * into v_purchase;

  return v_purchase;
end;
$$;

-- Mover entre armando, pagado y en camino (para adelante o para corregir).
-- Recibir va por receive_purchase: es el paso que toca el stock.
-- Errores: PS400 estado inválido · RP404 no existe · RP409 ya recibido.
create function set_purchase_status(p_purchase_id uuid, p_status text)
returns purchases
language plpgsql
set search_path = public
as $$
declare
  v_purchase purchases;
begin
  if p_status is null or p_status not in ('armando', 'pagado', 'en_camino') then
    raise exception 'El estado tiene que ser armando, pagado o en camino' using errcode = 'PS400';
  end if;

  select * into v_purchase from purchases where id = p_purchase_id for update;

  if not found then
    raise exception 'No existe el pedido %', p_purchase_id using errcode = 'RP404';
  end if;

  if v_purchase.status = 'recibida' then
    raise exception 'El pedido ya está recibido: su stock ya entró' using errcode = 'RP409';
  end if;

  update purchases
  set status = p_status,
      paid_at = case when p_status = 'armando' then null else coalesce(paid_at, now()) end,
      shipped_at = case when p_status = 'en_camino' then coalesce(shipped_at, now()) else null end
  where id = p_purchase_id
  returning * into v_purchase;

  return v_purchase;
end;
$$;

-- Borrar un pedido que todavía no llegó (sus ítems se van en cascada). Los
-- productos y variantes que se crearon con él quedan en el catálogo.
-- Errores: RP404 no existe · RP409 ya recibido.
create function delete_purchase(p_purchase_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from purchases where id = p_purchase_id for update;

  if not found then
    raise exception 'No existe el pedido %', p_purchase_id using errcode = 'RP404';
  end if;

  if v_status = 'recibida' then
    raise exception 'Un pedido recibido no se puede borrar: su stock ya entró' using errcode = 'RP409';
  end if;

  delete from purchases where id = p_purchase_id;
end;
$$;

revoke execute on function set_purchase_status(uuid, text) from public, anon, authenticated;
revoke execute on function delete_purchase(uuid) from public, anon, authenticated;
grant execute on function set_purchase_status(uuid, text) to service_role;
grant execute on function delete_purchase(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- create_purchase_grid: los cuatro estados y el envío del pedido.
-- ---------------------------------------------------------------------------
drop function create_purchase_grid(uuid, date, text, jsonb, text);

CREATE FUNCTION public.create_purchase_grid(p_supplier_id uuid, p_purchase_date date, p_notes text, p_products jsonb, p_status text DEFAULT 'recibida'::text, p_shipping_cost numeric DEFAULT 0)
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
  if p_status is null or p_status not in ('armando', 'pagado', 'en_camino', 'recibida') then
    raise exception 'status debe ser armando, pagado, en_camino o recibida' using errcode = 'CP400';
  end if;

  if p_shipping_cost is null or p_shipping_cost < 0 then
    raise exception 'El envío no puede ser negativo' using errcode = 'CP400';
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

  insert into purchases (supplier_id, purchase_date, notes, total_amount, status, shipping_cost,
                         paid_at, shipped_at, received_at)
  values (p_supplier_id, coalesce(p_purchase_date, current_date), p_notes, v_total, p_status, p_shipping_cost,
          case when p_status <> 'armando' then now() end,
          case when p_status in ('en_camino', 'recibida') then now() end,
          case when p_status = 'recibida' then now() end)
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

revoke execute on function create_purchase_grid(uuid, date, text, jsonb, text, numeric) from public, anon, authenticated;
grant execute on function create_purchase_grid(uuid, date, text, jsonb, text, numeric) to service_role;

-- ---------------------------------------------------------------------------
-- admin_dashboard: la caja descuenta envíos y no cuenta pedidos que se están armando.
-- ---------------------------------------------------------------------------
create or replace function admin_dashboard(
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
        'purchases', (
          select coalesce(sum(total_amount + shipping_cost), 0) from purchases where status <> 'armando'
        )
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
      'purchases_on_the_way', (select count(*) from purchases where status in ('pagado', 'en_camino'))
    ),
    'purchases', coalesce((
      select json_agg(pu order by pu.created_at desc)
      from (
        select pu.id, pu.number, pu.purchase_date, pu.created_at, pu.total_amount, pu.shipping_cost,
               pu.status, pu.received_at,
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
