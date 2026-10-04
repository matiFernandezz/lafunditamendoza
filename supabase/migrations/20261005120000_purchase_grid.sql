-- Compras con grilla: una compra puede traer varios productos, variantes
-- nuevas e incluso productos nuevos, y todo se registra en una transacción.

-- Dos compras del mismo día no se podían ordenar: hace falta para saber cuál
-- fue el último costo de un producto.
alter table purchases add column created_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- create_purchase_grid
-- p_products: [
--   {
--     "product_id": uuid,                 -- producto existente, o bien:
--     "new_product": { "category_id": uuid, "name": text, "description": text? },
--     "new_sale_price": numeric?,         -- opcional: nuevo precio de venta para
--                                         -- las variantes EXISTENTES de las filas
--                                         -- de este bloque (no para el resto)
--     "rows": [
--       { "variant_id": uuid, "quantity": int, "unit_cost": numeric }
--       -- o una variante que todavía no existe:
--       { "iphone_model_id": uuid|null, "color": text?, "sku": text,
--         "price": numeric, "quantity": int, "unit_cost": numeric }
--     ]
--   }
-- ]
--
-- Crea productos y variantes nuevas, la compra y sus items (el trigger de
-- purchase_items suma el stock y guarda el último costo) y actualiza los
-- precios pedidos. Si algo falla no queda nada: ni producto, ni stock, ni compra.
--
-- Códigos de error propios:
--   CP400 datos inválidos · CP404 algo no existe · CP409 nombre, SKU o
--   modelo+color repetido
-- ---------------------------------------------------------------------------
create function create_purchase_grid(
  p_supplier_id uuid,
  p_purchase_date date,
  p_notes text,
  p_products jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
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
begin
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
        if exists (select 1 from product_variants where sku = v_sku) then
          raise exception 'Ya existe una variante con el SKU "%"', v_sku using errcode = 'CP409';
        end if;
        if exists (
          select 1 from product_variants
          where product_id = v_product_id
            and iphone_model_id is not distinct from v_model_id
            and lower(coalesce(btrim(color), '')) = lower(coalesce(v_color, ''))
        ) then
          raise exception '"%" ya tiene una variante con ese modelo y color', v_name using errcode = 'CP409';
        end if;

        -- Stock 0: lo suma el trigger de purchase_items, igual que en una compra común.
        insert into product_variants (product_id, iphone_model_id, color, sku, price)
        values (v_product_id, v_model_id, v_color, v_sku, v_price)
        returning id into v_variant_id;
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

  insert into purchases (supplier_id, purchase_date, notes, total_amount)
  values (p_supplier_id, coalesce(p_purchase_date, current_date), p_notes, v_total)
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
$$;

-- ---------------------------------------------------------------------------
-- last_purchase_costs: el costo unitario de la última compra de cada variante,
-- ordenado de la compra más nueva a la más vieja (la primera fila de un
-- producto es entonces el último costo del producto).
-- ---------------------------------------------------------------------------
create function last_purchase_costs()
returns table (variant_id uuid, product_id uuid, unit_cost numeric, purchase_date date)
language sql
stable
set search_path = public
as $$
  select variant_id, product_id, unit_cost, purchase_date
  from (
    select distinct on (pi.variant_id)
      pi.variant_id, pv.product_id, pi.unit_cost, p.purchase_date, p.created_at
    from purchase_items pi
    join purchases p on p.id = pi.purchase_id
    join product_variants pv on pv.id = pi.variant_id
    order by pi.variant_id, p.purchase_date desc, p.created_at desc
  ) latest
  -- Dentro de una misma compra no hay orden entre items: gana el costo más alto.
  order by purchase_date desc, created_at desc, unit_cost desc;
$$;

-- Igual que create_sale / create_purchase: solo el servidor (service_role).
revoke execute on function create_purchase_grid(uuid, date, text, jsonb) from public, anon, authenticated;
revoke execute on function last_purchase_costs() from public, anon, authenticated;
grant execute on function create_purchase_grid(uuid, date, text, jsonb) to service_role;
grant execute on function last_purchase_costs() to service_role;
