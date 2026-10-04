-- Gestión de colores por producto y por categoría: agregar un color crea una
-- variante por modelo; quitarlo da de baja sus variantes (nunca las borra,
-- para no romper el historial de ventas y compras).
--
-- No aplica a Accesorios ni a sus tipos: ahí la "variante" no es un color por
-- modelo (un cable "tipo C a C"), y las cuatro funciones lo rechazan.
--
-- Códigos de error propios:
--   CC400 datos inválidos · CC403 la categoría es de Accesorios ·
--   CC404 producto, categoría o color inexistente
--
-- Idempotente: se puede correr más de una vez.

-- ---------------------------------------------------------------------------
-- ¿La categoría es Accesorios o cuelga de Accesorios?
-- ---------------------------------------------------------------------------
create or replace function category_is_accessory(p_category_id uuid)
returns boolean
language sql
stable
set search_path = public, extensions
as $$
  with recursive up as (
    select id, parent_id, slug from categories where id = p_category_id
    union all
    select c.id, c.parent_id, c.slug from categories c join up on c.id = up.parent_id
  )
  select exists (select 1 from up where slug = 'accesorios');
$$;

-- ---------------------------------------------------------------------------
-- suggest_sku: el mismo SKU sugerido que arma el panel al crear una variante
-- (frontend/src/app/admin/productos/sku.ts). Si se cambia uno, cambiar el otro.
--   "Funda de silicona degradé" + "iPhone 14 Pro Max" + "rojo" -> FSD-14PM-ROJ
-- ---------------------------------------------------------------------------
create or replace function suggest_sku(p_product text, p_model text, p_color text)
returns text
language sql
stable
set search_path = public, extensions
as $$
  with
  product_code as (
    select coalesce(string_agg(left(w, 1), '' order by ord), '') as code
    from (
      select w, ord
      from regexp_split_to_table(upper(unaccent(coalesce(p_product, ''))), '[^A-Z0-9]+') with ordinality as t(w, ord)
      where w <> ''
        and lower(w) not in ('de', 'del', 'la', 'el', 'los', 'las', 'para', 'con', 'y', 'en', 'un', 'una')
      order by ord
      limit 4
    ) words
  ),
  model_parts as (
    select array_remove(
      regexp_split_to_array(
        btrim(upper(unaccent(regexp_replace(coalesce(p_model, ''), '^iphone\s*', '', 'i')))),
        '\s+'
      ),
      ''
    ) as parts
  ),
  model_code as (
    select case
      when coalesce(array_length(parts, 1), 0) = 0 then ''
      when parts[1] ~ '^[0-9]+$' then
        parts[1] || coalesce((select string_agg(left(p, 1), '' order by o) from unnest(parts[2:]) with ordinality as u(p, o)), '')
      else left(array_to_string(parts, ''), 4)
    end as code
    from model_parts
  ),
  color_code as (
    select left(regexp_replace(upper(unaccent(coalesce(p_color, ''))), '[^A-Z]', '', 'g'), 3) as code
  )
  select array_to_string(
    array_remove(array[(select code from product_code), (select code from model_code), (select code from color_code)], ''),
    '-'
  );
$$;

-- ---------------------------------------------------------------------------
-- _add_color_to_product: el trabajo de agregar un color a un producto, sin
-- validaciones (las hacen las funciones públicas). Por cada modelo que el
-- producto tiene (o una sola vez si es universal):
--   * ya hay una variante activa de ese color -> no hace nada (existing)
--   * hay una dada de baja -> la reactiva (reactivated)
--   * no hay -> la crea con stock 0, activa, el precio de otra variante del
--     mismo modelo y un SKU único (created)
-- Los modelos son los de todas las variantes del producto, activas o no.
-- ---------------------------------------------------------------------------
create or replace function _add_color_to_product(p_product_id uuid, p_color_id uuid)
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_product_name text;
  v_color_name text;
  v_model record;
  v_existing product_variants;
  v_price numeric(12, 2);
  v_base text;
  v_sku text;
  v_n int;
  v_rows int;
  v_created int := 0;
  v_reactivated int := 0;
  v_already int := 0;
  v_skus text[] := '{}';
begin
  select name into v_product_name from products where id = p_product_id;
  select name into v_color_name from colors where id = p_color_id;

  perform 1 from product_variants where product_id = p_product_id order by id for update;

  for v_model in
    select distinct pv.iphone_model_id, m.name as model_name, m.sort_order
    from product_variants pv
    left join iphone_models m on m.id = pv.iphone_model_id
    where pv.product_id = p_product_id
    order by m.sort_order nulls last
  loop
    select * into v_existing
    from product_variants
    where product_id = p_product_id
      and iphone_model_id is not distinct from v_model.iphone_model_id
      and color_id = p_color_id
    order by active desc
    limit 1;

    if found and v_existing.active then
      v_already := v_already + 1;
    elsif found then
      update product_variants
      set active = true
      where product_id = p_product_id
        and iphone_model_id is not distinct from v_model.iphone_model_id
        and color_id = p_color_id
        and not active;
      get diagnostics v_rows = row_count;
      v_reactivated := v_reactivated + v_rows;
    else
      select price into v_price
      from product_variants
      where product_id = p_product_id and iphone_model_id is not distinct from v_model.iphone_model_id
      order by active desc, price desc
      limit 1;

      v_base := coalesce(nullif(suggest_sku(v_product_name, v_model.model_name, v_color_name), ''), 'SKU');
      v_sku := v_base;
      v_n := 2;
      while exists (select 1 from product_variants where sku = v_sku) loop
        v_sku := v_base || '-' || v_n;
        v_n := v_n + 1;
      end loop;

      -- El trigger de colores completa el texto `color` con el nombre.
      insert into product_variants (product_id, iphone_model_id, color_id, sku, price, stock_quantity, active)
      values (p_product_id, v_model.iphone_model_id, p_color_id, v_sku, v_price, 0, true);
      v_created := v_created + 1;
      v_skus := v_skus || v_sku;
    end if;
  end loop;

  return jsonb_build_object(
    'product_id', p_product_id,
    'product_name', v_product_name,
    'created', v_created,
    'reactivated', v_reactivated,
    'existing', v_already,
    'skus', to_jsonb(v_skus)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- add_color_to_product. Con p_dry_run hace todo y lo deshace: devuelve el
-- mismo resumen sin tocar nada (para mostrar "se van a crear N variantes").
-- ---------------------------------------------------------------------------
create or replace function add_color_to_product(p_product_id uuid, p_color_id uuid, p_dry_run boolean default false)
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_category_id uuid;
  v_result jsonb;
begin
  select category_id into v_category_id from products where id = p_product_id;
  if not found then
    raise exception 'No existe un producto con ese id' using errcode = 'CC404';
  end if;
  if not exists (select 1 from colors where id = p_color_id) then
    raise exception 'No existe un color con ese id' using errcode = 'CC404';
  end if;
  if category_is_accessory(v_category_id) then
    raise exception 'Los colores por modelo no aplican a los productos de Accesorios' using errcode = 'CC403';
  end if;
  if not exists (select 1 from product_variants where product_id = p_product_id) then
    raise exception 'El producto todavía no tiene variantes: no hay modelos a los que sumarle el color'
      using errcode = 'CC400';
  end if;

  begin
    v_result := _add_color_to_product(p_product_id, p_color_id);
    if p_dry_run then
      raise exception 'dry run' using errcode = 'CCDRY';
    end if;
  exception when sqlstate 'CCDRY' then
    -- El bloque se deshizo; el resumen (una variable) se conserva.
    null;
  end;

  return v_result || jsonb_build_object('dry_run', p_dry_run);
end;
$$;

-- ---------------------------------------------------------------------------
-- remove_color_from_product: da de baja (active = false) las variantes activas
-- de ese color. Si alguna tiene stock y p_force es false no hace nada y
-- devuelve blocked = true con el detalle, para que el panel pida confirmación.
-- ---------------------------------------------------------------------------
create or replace function remove_color_from_product(
  p_product_id uuid,
  p_color_id uuid,
  p_force boolean default false,
  p_dry_run boolean default false
)
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_product_name text;
  v_category_id uuid;
  v_count int;
  v_units int;
  v_with_stock jsonb;
  v_blocked boolean;
begin
  select name, category_id into v_product_name, v_category_id from products where id = p_product_id;
  if not found then
    raise exception 'No existe un producto con ese id' using errcode = 'CC404';
  end if;
  if not exists (select 1 from colors where id = p_color_id) then
    raise exception 'No existe un color con ese id' using errcode = 'CC404';
  end if;
  if category_is_accessory(v_category_id) then
    raise exception 'Los colores por modelo no aplican a los productos de Accesorios' using errcode = 'CC403';
  end if;

  perform 1 from product_variants
  where product_id = p_product_id and color_id = p_color_id
  order by id
  for update;

  select count(*), coalesce(sum(stock_quantity), 0) into v_count, v_units
  from product_variants
  where product_id = p_product_id and color_id = p_color_id and active;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', pv.id, 'sku', pv.sku, 'model', m.name, 'stock', pv.stock_quantity
         ) order by m.sort_order nulls last), '[]'::jsonb)
  into v_with_stock
  from product_variants pv
  left join iphone_models m on m.id = pv.iphone_model_id
  where pv.product_id = p_product_id and pv.color_id = p_color_id and pv.active and pv.stock_quantity > 0;

  v_blocked := v_units > 0 and not coalesce(p_force, false);

  if not v_blocked and not coalesce(p_dry_run, false) then
    update product_variants
    set active = false
    where product_id = p_product_id and color_id = p_color_id and active;
  end if;

  return jsonb_build_object(
    'product_id', p_product_id,
    'product_name', v_product_name,
    'variants', v_count,
    'deactivated', case when v_blocked then 0 else v_count end,
    'units', v_units,
    'with_stock', v_with_stock,
    'blocked', v_blocked,
    'dry_run', coalesce(p_dry_run, false)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- add_color_to_category: agrega el color a los productos de la categoría y de
-- sus subcategorías. Solo a los que ya manejan colores; los que no tienen
-- ninguna variante con color (fundas de diseño) o no tienen variantes se
-- omiten y se informan.
-- ---------------------------------------------------------------------------
create or replace function add_color_to_category(p_category_id uuid, p_color_id uuid, p_dry_run boolean default false)
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_category_name text;
  v_product record;
  v_one jsonb;
  v_products int := 0;
  v_created int := 0;
  v_reactivated int := 0;
  v_already int := 0;
  v_changed jsonb := '[]'::jsonb;
  v_skipped jsonb := '[]'::jsonb;
begin
  select name into v_category_name from categories where id = p_category_id;
  if not found then
    raise exception 'No existe una categoría con ese id' using errcode = 'CC404';
  end if;
  if not exists (select 1 from colors where id = p_color_id) then
    raise exception 'No existe un color con ese id' using errcode = 'CC404';
  end if;
  if category_is_accessory(p_category_id) then
    raise exception 'Los colores por modelo no aplican a Accesorios ni a sus tipos' using errcode = 'CC403';
  end if;

  begin
    for v_product in
      with recursive tree as (
        select id from categories where id = p_category_id
        union all
        select c.id from categories c join tree on c.parent_id = tree.id
      )
      select p.id, p.name,
             exists (select 1 from product_variants v where v.product_id = p.id) as has_variants,
             exists (select 1 from product_variants v where v.product_id = p.id and v.color_id is not null) as has_colors
      from products p
      where p.category_id in (select id from tree)
      order by p.name
    loop
      if not v_product.has_variants then
        v_skipped := v_skipped || jsonb_build_object('product_id', v_product.id, 'product_name', v_product.name, 'reason', 'sin variantes');
      elsif not v_product.has_colors then
        v_skipped := v_skipped || jsonb_build_object('product_id', v_product.id, 'product_name', v_product.name, 'reason', 'no maneja colores');
      else
        v_one := _add_color_to_product(v_product.id, p_color_id);
        v_already := v_already + (v_one ->> 'existing')::int;
        if (v_one ->> 'created')::int + (v_one ->> 'reactivated')::int > 0 then
          v_products := v_products + 1;
          v_created := v_created + (v_one ->> 'created')::int;
          v_reactivated := v_reactivated + (v_one ->> 'reactivated')::int;
          v_changed := v_changed || v_one;
        end if;
      end if;
    end loop;

    if p_dry_run then
      raise exception 'dry run' using errcode = 'CCDRY';
    end if;
  exception when sqlstate 'CCDRY' then
    null;
  end;

  return jsonb_build_object(
    'category_id', p_category_id,
    'category_name', v_category_name,
    'products', v_products,
    'created', v_created,
    'reactivated', v_reactivated,
    'existing', v_already,
    'changed', v_changed,
    'skipped', v_skipped,
    'dry_run', p_dry_run
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- remove_color_from_category: da de baja las variantes de ese color con stock
-- 0 en toda la categoría (y subcategorías). Las que tienen stock no se tocan
-- y se devuelven en `omitted` (en bloque no hay "forzar").
-- ---------------------------------------------------------------------------
create or replace function remove_color_from_category(p_category_id uuid, p_color_id uuid, p_dry_run boolean default false)
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_category_name text;
  v_products int;
  v_count int;
  v_omitted jsonb;
  v_omitted_units int;
begin
  select name into v_category_name from categories where id = p_category_id;
  if not found then
    raise exception 'No existe una categoría con ese id' using errcode = 'CC404';
  end if;
  if not exists (select 1 from colors where id = p_color_id) then
    raise exception 'No existe un color con ese id' using errcode = 'CC404';
  end if;
  if category_is_accessory(p_category_id) then
    raise exception 'Los colores por modelo no aplican a Accesorios ni a sus tipos' using errcode = 'CC403';
  end if;

  drop table if exists _color_targets;
  create temp table _color_targets on commit drop as
  with recursive tree as (
    select id from categories where id = p_category_id
    union all
    select c.id from categories c join tree on c.parent_id = tree.id
  )
  select pv.id, pv.sku, pv.stock_quantity, p.id as product_id, p.name as product_name,
         m.name as model_name, m.sort_order
  from product_variants pv
  join products p on p.id = pv.product_id
  left join iphone_models m on m.id = pv.iphone_model_id
  where p.category_id in (select id from tree) and pv.color_id = p_color_id and pv.active;

  perform 1 from product_variants where id in (select id from _color_targets) order by id for update;

  select count(*), count(distinct product_id) into v_count, v_products
  from _color_targets where stock_quantity = 0;

  select coalesce(jsonb_agg(jsonb_build_object(
           'product_id', product_id, 'product_name', product_name, 'sku', sku,
           'model', model_name, 'stock', stock_quantity
         ) order by product_name, sort_order nulls last), '[]'::jsonb),
         coalesce(sum(stock_quantity), 0)
  into v_omitted, v_omitted_units
  from _color_targets where stock_quantity > 0;

  if not coalesce(p_dry_run, false) then
    update product_variants set active = false
    where id in (select id from _color_targets where stock_quantity = 0);
  end if;

  return jsonb_build_object(
    'category_id', p_category_id,
    'category_name', v_category_name,
    'products', v_products,
    'deactivated', v_count,
    'omitted', v_omitted,
    'omitted_units', v_omitted_units,
    'dry_run', coalesce(p_dry_run, false)
  );
end;
$$;

-- Solo el servidor (service_role), igual que el resto de las funciones.
revoke execute on function _add_color_to_product(uuid, uuid) from public, anon, authenticated;
revoke execute on function add_color_to_product(uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function remove_color_from_product(uuid, uuid, boolean, boolean) from public, anon, authenticated;
revoke execute on function add_color_to_category(uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function remove_color_from_category(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function _add_color_to_product(uuid, uuid) to service_role;
grant execute on function add_color_to_product(uuid, uuid, boolean) to service_role;
grant execute on function remove_color_from_product(uuid, uuid, boolean, boolean) to service_role;
grant execute on function add_color_to_category(uuid, uuid, boolean) to service_role;
grant execute on function remove_color_from_category(uuid, uuid, boolean) to service_role;
