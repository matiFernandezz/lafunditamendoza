-- Motivos + colores por modelo.
--
-- * motifs: el dibujo o personaje de un producto (BATMAN, BOB…). Es un
--   atributo de la variante distinto del color: lista propia, selector propio.
--   Un producto usa colores O motivos, nunca los dos.
-- * product_variants.motif_id y product_images.motif_id (una foto es de un
--   color, de un motivo, o general).
-- * El texto product_variants.color sigue siendo "lo que distingue a la
--   variante": el nombre del color, el del motivo, o una descripción libre.
-- * Los "colores" que no eran colores pasan a ser motivos o descripciones.
-- * Funciones para la matriz modelo × color (o motivo): cada celda es una
--   variante que se crea, se da de baja o se reactiva.
-- * Unir dos colores (o dos motivos).
--
-- Códigos de error propios (los mismos de 20261007120000):
--   CC400 datos inválidos · CC403 colores en Accesorios · CC404 no existe
--
-- Idempotente: se puede correr más de una vez.

-- ---------------------------------------------------------------------------
-- motifs
-- ---------------------------------------------------------------------------
create table if not exists motifs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists motifs_name_key on motifs (lower(name));
create unique index if not exists motifs_slug_key on motifs (slug);

create or replace function motifs_set_slug()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  new.name := btrim(new.name);
  if new.slug is null or (tg_op = 'UPDATE' and new.name is distinct from old.name and new.slug = old.slug) then
    new.slug := slugify(new.name);
  end if;
  return new;
end;
$$;

drop trigger if exists motifs_set_slug_trigger on motifs;
create trigger motifs_set_slug_trigger
  before insert or update of name on motifs
  for each row
  execute function motifs_set_slug();

alter table product_variants
  add column if not exists motif_id uuid references motifs (id) on delete set null;
create index if not exists idx_product_variants_motif_id on product_variants (motif_id);

alter table product_images
  add column if not exists motif_id uuid references motifs (id) on delete set null;
create index if not exists idx_product_images_motif_id on product_images (motif_id);

-- ---------------------------------------------------------------------------
-- El texto `color` siempre coherente con color_id / motif_id.
--   * hay motif_id -> el texto es el nombre del motivo (y no hay color_id)
--   * hay color_id -> el texto es el nombre del color (y no hay motif_id)
--   * llega o cambia solo el texto (compras, importación) -> se busca un color
--     con ese nombre y, si no, un motivo; si no hay ninguno, queda como
--     descripción libre. Un mismo nombre puede ser color y motivo ("Rosa"): si
--     el producto ya usa motivos, se busca primero el motivo.
-- ---------------------------------------------------------------------------
create or replace function product_variants_sync_color()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
declare
  v_color colors;
  v_motif motifs;
  v_motif_changed boolean := tg_op = 'INSERT' or new.motif_id is distinct from old.motif_id;
  v_color_changed boolean := tg_op = 'INSERT' or new.color_id is distinct from old.color_id;
  v_text_changed boolean := tg_op = 'INSERT' or new.color is distinct from old.color;
  v_uses_motifs boolean;
begin
  if v_motif_changed and new.motif_id is not null then
    new.color_id := null;
    select name into new.color from motifs where id = new.motif_id;
  elsif v_color_changed and new.color_id is not null then
    new.motif_id := null;
    select name into new.color from colors where id = new.color_id;
  elsif (tg_op = 'INSERT' and new.color_id is null and new.motif_id is null)
     or (tg_op = 'UPDATE' and v_text_changed and not v_motif_changed and not v_color_changed)
  then
    new.color_id := null;
    new.motif_id := null;
    if nullif(btrim(new.color), '') is not null then
      v_uses_motifs := exists (
        select 1 from product_variants
        where product_id = new.product_id and motif_id is not null and id is distinct from new.id
      );
      select * into v_color from colors where lower(name) = lower(color_canonical_name(new.color));
      select * into v_motif from motifs where lower(name) = lower(btrim(new.color));
      if v_motif.id is not null and (v_uses_motifs or v_color.id is null) then
        new.motif_id := v_motif.id;
        new.color := v_motif.name;
      elsif v_color.id is not null then
        new.color_id := v_color.id;
        new.color := v_color.name;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists product_variants_sync_color_trigger on product_variants;
create trigger product_variants_sync_color_trigger
  before insert or update of color, color_id, motif_id on product_variants
  for each row
  execute function product_variants_sync_color();

-- Renombrar un motivo renombra el texto de sus variantes.
create or replace function motifs_rename_variants()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  update product_variants set color = new.name where motif_id = new.id and color is distinct from new.name;
  return null;
end;
$$;

drop trigger if exists motifs_rename_variants_trigger on motifs;
create trigger motifs_rename_variants_trigger
  after update of name on motifs
  for each row
  when (new.name is distinct from old.name)
  execute function motifs_rename_variants();

-- ---------------------------------------------------------------------------
-- Los no-colores salen de `colors`.
--   * BATMAN, BOB, CAP AMÉRICA, IRON MAN -> motivos. Se crean siempre (aunque
--     no estén en `colors`), así una importación desde cero los enlaza sola.
--   * "Tipo C a …" (cables) -> descripción libre: se borra el color y la
--     variante conserva el texto (la FK es on delete set null).
-- El resto de los "sin color asignado" no se toca.
-- ---------------------------------------------------------------------------
insert into motifs (name, slug)
select m.name, slugify(m.name)
from (values ('BATMAN'), ('BOB'), ('CAP AMÉRICA'), ('IRON MAN')) as m(name)
on conflict do nothing;

-- motif_id pisa al color_id (trigger): la variante conserva stock, precio y SKU.
update product_variants pv
set motif_id = m.id
from colors c
join motifs m on lower(unaccent(m.name)) = lower(unaccent(c.name))
where pv.color_id = c.id
  and lower(unaccent(c.name)) in ('batman', 'bob', 'cap america', 'iron man');

update product_images pi
set motif_id = m.id, color_id = null
from colors c
join motifs m on lower(unaccent(m.name)) = lower(unaccent(c.name))
where pi.color_id = c.id
  and lower(unaccent(c.name)) in ('batman', 'bob', 'cap america', 'iron man');

delete from colors
where lower(unaccent(name)) in ('batman', 'bob', 'cap america', 'iron man')
   or (not assigned and lower(unaccent(name)) ~ '^tipo [a-z] a ');

-- Una variante o una foto tiene color o motivo, no los dos.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'product_variants_color_or_motif') then
    alter table product_variants
      add constraint product_variants_color_or_motif check (color_id is null or motif_id is null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'product_images_color_or_motif') then
    alter table product_images
      add constraint product_images_color_or_motif check (color_id is null or motif_id is null);
  end if;
end;
$$;

-- sync_colors_from_variants: el sistema NUNCA crea colores por su cuenta. Los
-- colores (y los motivos) los crea una persona desde el panel. Esta función
-- solo ENLAZA: a las variantes sin color ni motivo cuyo texto coincide con un
-- motivo o un color que ya existe. Devuelve cuántas variantes enlazó.
create or replace function sync_colors_from_variants()
returns int
language plpgsql
set search_path = public, extensions
as $$
declare
  v_motifs int;
  v_colors int;
begin
  -- Un texto que coincide con un motivo se enlaza al motivo.
  update product_variants pv
  set motif_id = m.id
  from motifs m
  where pv.color_id is null and pv.motif_id is null
    and nullif(btrim(pv.color), '') is not null
    and lower(m.name) = lower(btrim(pv.color));
  get diagnostics v_motifs = row_count;

  update product_variants pv
  set color_id = c.id
  from colors c
  where pv.color_id is null
    and pv.motif_id is null
    and nullif(btrim(pv.color), '') is not null
    and lower(c.name) = lower(color_canonical_name(pv.color));
  get diagnostics v_colors = row_count;

  return v_motifs + v_colors;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos de motifs: igual que colors.
-- ---------------------------------------------------------------------------
alter table motifs enable row level security;

drop policy if exists "catalogo publico: motivos" on motifs;
create policy "catalogo publico: motivos" on motifs
  for select to anon using (true);

revoke all on motifs from anon, authenticated;
grant select on motifs to anon;
grant select, insert, update, delete on motifs to service_role;
grant select (motif_id) on product_variants to anon;

-- ---------------------------------------------------------------------------
-- _apply_attribute_cells: el trabajo de la matriz, sin validaciones.
-- p_kind: 'color' | 'motif'. p_models: array JSON de ids de modelo (null = la
-- variante sin modelo). Cada (modelo, atributo) es una celda = una variante.
--
-- p_active true  -> tildar: crea la variante (stock 0, precio de otra del mismo
--   modelo o, si no hay, de otra del producto, SKU único) o reactiva la que
--   estaba dada de baja, con su stock.
-- p_active false -> destildar: la da de baja, nunca la borra. Si alguna tiene
--   stock y p_force es false no hace nada y devuelve blocked = true.
--
-- Primer atributo de un producto que no tiene ni colores ni motivos: no crea
-- nada; se lo asigna a TODAS sus variantes actuales (assigned, units), que
-- conservan stock, precio y SKU. Después se destilda lo que no corresponda.
-- ---------------------------------------------------------------------------
create or replace function _apply_attribute_cells(
  p_product_id uuid,
  p_kind text,
  p_attr_id uuid,
  p_models jsonb,
  p_active boolean,
  p_force boolean
)
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_product_name text;
  v_attr_name text;
  v_el jsonb;
  v_model_id uuid;
  v_model_name text;
  v_existing product_variants;
  v_price numeric(12, 2);
  v_base text;
  v_sku text;
  v_n int;
  v_created int := 0;
  v_reactivated int := 0;
  v_already int := 0;
  v_assigned int := 0;
  v_units int := 0;
  v_off uuid[] := '{}';
  v_with_stock jsonb := '[]'::jsonb;
  v_blocked boolean := false;
  v_skus text[] := '{}';
begin
  select name into v_product_name from products where id = p_product_id;
  if p_kind = 'color' then
    select name into v_attr_name from colors where id = p_attr_id;
  else
    select name into v_attr_name from motifs where id = p_attr_id;
  end if;

  perform 1 from product_variants where product_id = p_product_id order by id for update;

  if p_active
     and exists (select 1 from product_variants where product_id = p_product_id)
     and not exists (
       select 1 from product_variants
       where product_id = p_product_id and (color_id is not null or motif_id is not null)
     )
  then
    if exists (
      select 1 from product_variants
      where product_id = p_product_id
        and nullif(btrim(color), '') is not null
        and lower(unaccent(btrim(color))) <> 'unico'
    ) then
      raise exception 'Las variantes de "%" tienen una descripción libre: no se le puede agregar un %', v_product_name,
        case when p_kind = 'color' then 'color' else 'motivo' end
        using errcode = 'CC400';
    end if;

    select count(*), coalesce(sum(stock_quantity), 0) into v_assigned, v_units
    from product_variants where product_id = p_product_id;

    -- El trigger completa el texto con el nombre.
    if p_kind = 'color' then
      update product_variants set color_id = p_attr_id where product_id = p_product_id;
    else
      update product_variants set motif_id = p_attr_id where product_id = p_product_id;
    end if;

    return jsonb_build_object(
      'product_id', p_product_id, 'product_name', v_product_name,
      'created', 0, 'reactivated', 0, 'existing', 0, 'assigned', v_assigned,
      'deactivated', 0, 'units', v_units, 'with_stock', '[]'::jsonb, 'blocked', false, 'skus', '[]'::jsonb
    );
  end if;

  for v_el in select value from jsonb_array_elements(coalesce(p_models, '[]'::jsonb))
  loop
    v_model_id := nullif(v_el #>> '{}', '')::uuid;
    v_model_name := null;
    if v_model_id is not null then
      select name into v_model_name from iphone_models where id = v_model_id;
      if not found then
        raise exception 'Alguno de los modelos indicados no existe' using errcode = 'CC404';
      end if;
    end if;

    select * into v_existing
    from product_variants
    where product_id = p_product_id
      and iphone_model_id is not distinct from v_model_id
      and case when p_kind = 'color' then color_id = p_attr_id else motif_id = p_attr_id end
    order by active desc, stock_quantity desc
    limit 1;

    if p_active then
      if found and v_existing.active then
        v_already := v_already + 1;
      elsif found then
        update product_variants set active = true where id = v_existing.id;
        v_reactivated := v_reactivated + 1;
      else
        select price into v_price
        from product_variants
        where product_id = p_product_id
        order by (iphone_model_id is not distinct from v_model_id) desc, active desc, price desc
        limit 1;
        if v_price is null then
          raise exception '"%" todavía no tiene variantes: no hay de dónde copiar el precio', v_product_name
            using errcode = 'CC400';
        end if;

        v_base := coalesce(nullif(suggest_sku(v_product_name, v_model_name, v_attr_name), ''), 'SKU');
        v_sku := v_base;
        v_n := 2;
        while exists (select 1 from product_variants where sku = v_sku) loop
          v_sku := v_base || '-' || v_n;
          v_n := v_n + 1;
        end loop;

        insert into product_variants (product_id, iphone_model_id, color_id, motif_id, sku, price, stock_quantity, active)
        values (
          p_product_id, v_model_id,
          case when p_kind = 'color' then p_attr_id end,
          case when p_kind = 'motif' then p_attr_id end,
          v_sku, v_price, 0, true
        );
        v_created := v_created + 1;
        v_skus := v_skus || v_sku;
      end if;
    elsif found and v_existing.active then
      v_off := v_off || v_existing.id;
      if v_existing.stock_quantity > 0 then
        v_units := v_units + v_existing.stock_quantity;
        v_with_stock := v_with_stock || jsonb_build_object(
          'id', v_existing.id, 'sku', v_existing.sku, 'model', v_model_name, 'stock', v_existing.stock_quantity
        );
      end if;
    end if;
  end loop;

  if not p_active then
    v_blocked := v_units > 0 and not coalesce(p_force, false);
    if not v_blocked then
      update product_variants set active = false where id = any (v_off);
    end if;
  end if;

  return jsonb_build_object(
    'product_id', p_product_id, 'product_name', v_product_name,
    'created', v_created, 'reactivated', v_reactivated, 'existing', v_already, 'assigned', 0,
    'deactivated', case when p_active or v_blocked then 0 else coalesce(array_length(v_off, 1), 0) end,
    'variants', coalesce(array_length(v_off, 1), 0),
    'units', v_units, 'with_stock', v_with_stock, 'blocked', v_blocked, 'skus', to_jsonb(v_skus)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- apply_attribute_cells: la versión pública, con validaciones y vista previa.
--   * colores: no en Accesorios (CC403). Motivos: en cualquier categoría.
--   * un producto usa colores o motivos, no los dos (se mira lo activo).
-- ---------------------------------------------------------------------------
create or replace function apply_attribute_cells(
  p_product_id uuid,
  p_kind text,
  p_attr_id uuid,
  p_models jsonb,
  p_active boolean,
  p_force boolean default false,
  p_dry_run boolean default false
)
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_category_id uuid;
  v_result jsonb;
begin
  if p_kind is null or p_kind not in ('color', 'motif') then
    raise exception 'kind debe ser color o motif' using errcode = 'CC400';
  end if;
  if p_models is null or jsonb_typeof(p_models) <> 'array' or jsonb_array_length(p_models) = 0 then
    raise exception 'models debe ser un array no vacío de modelos' using errcode = 'CC400';
  end if;

  select category_id into v_category_id from products where id = p_product_id;
  if not found then
    raise exception 'No existe un producto con ese id' using errcode = 'CC404';
  end if;

  if p_kind = 'color' then
    if not exists (select 1 from colors where id = p_attr_id) then
      raise exception 'No existe un color con ese id' using errcode = 'CC404';
    end if;
    if category_is_accessory(v_category_id) then
      raise exception 'Los colores por modelo no aplican a los productos de Accesorios' using errcode = 'CC403';
    end if;
    if coalesce(p_active, false) and exists (
      select 1 from product_variants where product_id = p_product_id and active and motif_id is not null
    ) then
      raise exception 'Este producto usa motivos: no puede tener colores' using errcode = 'CC400';
    end if;
  else
    if not exists (select 1 from motifs where id = p_attr_id) then
      raise exception 'No existe un motivo con ese id' using errcode = 'CC404';
    end if;
    if coalesce(p_active, false) and exists (
      select 1 from product_variants where product_id = p_product_id and active and color_id is not null
    ) then
      raise exception 'Este producto usa colores: no puede tener motivos' using errcode = 'CC400';
    end if;
  end if;

  begin
    v_result := _apply_attribute_cells(p_product_id, p_kind, p_attr_id, p_models, coalesce(p_active, false), p_force);
    if p_dry_run then
      raise exception 'dry run' using errcode = 'CCDRY';
    end if;
  exception when sqlstate 'CCDRY' then
    null;
  end;

  return v_result || jsonb_build_object('dry_run', coalesce(p_dry_run, false));
end;
$$;

-- ---------------------------------------------------------------------------
-- Colores por categoría, ahora eligiendo los modelos. p_model_ids null = todos
-- los modelos de cada producto (incluida la variante sin modelo).
-- ---------------------------------------------------------------------------
create or replace function add_color_to_category_models(
  p_category_id uuid,
  p_color_id uuid,
  p_model_ids uuid[] default null,
  p_dry_run boolean default false
)
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_category_name text;
  v_product record;
  v_models jsonb;
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
             exists (select 1 from product_variants v where v.product_id = p.id and v.color_id is not null) as has_colors,
             exists (select 1 from product_variants v where v.product_id = p.id and v.active and v.motif_id is not null) as has_motifs
      from products p
      where p.category_id in (select id from tree)
      order by p.name
    loop
      if not v_product.has_variants then
        v_skipped := v_skipped || jsonb_build_object('product_id', v_product.id, 'product_name', v_product.name, 'reason', 'sin variantes');
      elsif v_product.has_motifs then
        v_skipped := v_skipped || jsonb_build_object('product_id', v_product.id, 'product_name', v_product.name, 'reason', 'usa motivos');
      elsif not v_product.has_colors then
        v_skipped := v_skipped || jsonb_build_object('product_id', v_product.id, 'product_name', v_product.name, 'reason', 'no maneja colores');
      else
        -- Los modelos del producto que entran en la selección.
        select coalesce(jsonb_agg(to_jsonb(d.iphone_model_id)), '[]'::jsonb) into v_models
        from (
          select distinct iphone_model_id from product_variants
          where product_id = v_product.id
            and (p_model_ids is null or iphone_model_id = any (p_model_ids))
        ) d;

        if jsonb_array_length(v_models) > 0 then
          v_one := _apply_attribute_cells(v_product.id, 'color', p_color_id, v_models, true, false);
          v_already := v_already + (v_one ->> 'existing')::int;
          if (v_one ->> 'created')::int + (v_one ->> 'reactivated')::int > 0 then
            v_products := v_products + 1;
            v_created := v_created + (v_one ->> 'created')::int;
            v_reactivated := v_reactivated + (v_one ->> 'reactivated')::int;
            v_changed := v_changed || v_one;
          end if;
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
    'category_id', p_category_id, 'category_name', v_category_name,
    'products', v_products, 'created', v_created, 'reactivated', v_reactivated, 'existing', v_already,
    'changed', v_changed, 'skipped', v_skipped, 'dry_run', coalesce(p_dry_run, false)
  );
end;
$$;

create or replace function remove_color_from_category_models(
  p_category_id uuid,
  p_color_id uuid,
  p_model_ids uuid[] default null,
  p_dry_run boolean default false
)
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
  where p.category_id in (select id from tree)
    and pv.color_id = p_color_id
    and pv.active
    and (p_model_ids is null or pv.iphone_model_id = any (p_model_ids));

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
    'category_id', p_category_id, 'category_name', v_category_name,
    'products', v_products, 'deactivated', v_count,
    'omitted', v_omitted, 'omitted_units', v_omitted_units,
    'dry_run', coalesce(p_dry_run, false)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- merge_attributes: "Unir colores" / "Unir motivos". Pasa todas las variantes
-- y fotos de p_from a p_into y borra p_from. Si un producto ya tenía una
-- variante de p_into para el mismo modelo, esa es la que queda: recibe el
-- stock de la otra, que se da de baja (no se borra: puede tener historial).
-- ---------------------------------------------------------------------------
create or replace function merge_attributes(p_kind text, p_from uuid, p_into uuid)
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_from_name text;
  v_into_name text;
  v_dup record;
  v_moved int;
  v_merged int := 0;
  v_images int;
begin
  if p_kind is null or p_kind not in ('color', 'motif') then
    raise exception 'kind debe ser color o motif' using errcode = 'CC400';
  end if;
  if p_from is null or p_into is null or p_from = p_into then
    raise exception 'Elegí dos distintos para unir' using errcode = 'CC400';
  end if;

  if p_kind = 'color' then
    select name into v_from_name from colors where id = p_from;
    select name into v_into_name from colors where id = p_into;
  else
    select name into v_from_name from motifs where id = p_from;
    select name into v_into_name from motifs where id = p_into;
  end if;
  if v_from_name is null or v_into_name is null then
    raise exception 'Alguno de los dos no existe' using errcode = 'CC404';
  end if;

  perform 1 from product_variants
  where case when p_kind = 'color' then color_id in (p_from, p_into) else motif_id in (p_from, p_into) end
  order by id
  for update;

  -- Misma celda (producto, modelo) en los dos: se queda la de p_into.
  for v_dup in
    select f.id as from_id, f.stock_quantity as from_stock, f.active as from_active,
           (select t.id from product_variants t
            where t.product_id = f.product_id
              and t.iphone_model_id is not distinct from f.iphone_model_id
              and case when p_kind = 'color' then t.color_id = p_into else t.motif_id = p_into end
            order by t.active desc, t.stock_quantity desc
            limit 1) as into_id
    from product_variants f
    where case when p_kind = 'color' then f.color_id = p_from else f.motif_id = p_from end
  loop
    if v_dup.into_id is not null then
      update product_variants
      set stock_quantity = stock_quantity + v_dup.from_stock,
          active = active or v_dup.from_active
      where id = v_dup.into_id;
      update product_variants set stock_quantity = 0, active = false where id = v_dup.from_id;
      v_merged := v_merged + 1;
    end if;
  end loop;

  if p_kind = 'color' then
    update product_variants set color_id = p_into where color_id = p_from;
    get diagnostics v_moved = row_count;
    update product_images set color_id = p_into where color_id = p_from;
    get diagnostics v_images = row_count;
    delete from colors where id = p_from;
  else
    update product_variants set motif_id = p_into where motif_id = p_from;
    get diagnostics v_moved = row_count;
    update product_images set motif_id = p_into where motif_id = p_from;
    get diagnostics v_images = row_count;
    delete from motifs where id = p_from;
  end if;

  return jsonb_build_object(
    'from', v_from_name, 'into', v_into_name,
    'variants', v_moved, 'merged', v_merged, 'images', v_images
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- color_to_motif: "Pasar a motivo". Mueve TODAS las variantes y fotos de un
-- color a un motivo con el mismo nombre (lo crea si no existe). Las variantes
-- conservan stock, precio y SKU. El color no se borra: queda en la lista, sin
-- uso, para eliminarlo a mano si corresponde. Con p_dry_run solo cuenta.
-- ---------------------------------------------------------------------------
create or replace function color_to_motif(p_color_id uuid, p_dry_run boolean default false)
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_name text;
  v_motif_id uuid;
  v_variants int;
  v_products int;
  v_images int;
  v_units int;
  v_existed boolean;
begin
  select name into v_name from colors where id = p_color_id;
  if not found then
    raise exception 'No existe un color con ese id' using errcode = 'CC404';
  end if;

  perform 1 from product_variants where color_id = p_color_id order by id for update;

  select count(*), count(distinct product_id), coalesce(sum(stock_quantity), 0)
  into v_variants, v_products, v_units
  from product_variants where color_id = p_color_id;
  select count(*) into v_images from product_images where color_id = p_color_id;

  select id into v_motif_id from motifs where lower(name) = lower(v_name);
  v_existed := v_motif_id is not null;

  if not coalesce(p_dry_run, false) then
    if v_motif_id is null then
      insert into motifs (name) values (v_name) returning id into v_motif_id;
    end if;
    update product_images set motif_id = v_motif_id, color_id = null where color_id = p_color_id;
    -- motif_id pisa al color_id (trigger): stock, precio y SKU no se tocan.
    update product_variants set motif_id = v_motif_id where color_id = p_color_id;
  end if;

  return jsonb_build_object(
    'name', v_name, 'variants', v_variants, 'products', v_products, 'units', v_units, 'images', v_images,
    'motif_existed', v_existed,
    'dry_run', coalesce(p_dry_run, false)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- accessory_colors_to_motifs: en Accesorios (y sus tipos) no hay colores por
-- modelo, hay motivos. Pasa a motivo, con el mismo nombre, las variantes de
-- productos de Accesorios que tengan color (ej. los protectores de cargador
-- "Cereza" y "Rosa"), y sus fotos. Conservan stock, precio y SKU.
--   * El color NO se borra de la lista: puede usarlo una funda (Rosa). Si
--     queda sin uso, se ve como "sin uso" en "Editar colores".
--   * Un producto que ya tiene variantes con color Y con motivo no se toca:
--     se devuelve en `skipped` para decidirlo a mano.
-- Idempotente: la segunda vez no encuentra nada que pasar.
-- ---------------------------------------------------------------------------
create or replace function accessory_colors_to_motifs()
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_color record;
  v_motif_id uuid;
  v_rows int;
  v_variants int := 0;
  v_images int := 0;
  v_touched jsonb;
  v_skipped jsonb;
begin
  drop table if exists _accessory_targets;
  create temp table _accessory_targets on commit drop as
  select p.id as product_id, p.name as product_name,
         exists (select 1 from product_variants x where x.product_id = p.id and x.motif_id is not null) as mixed
  from products p
  where category_is_accessory(p.category_id)
    and exists (select 1 from product_variants v where v.product_id = p.id and v.color_id is not null);

  select coalesce(jsonb_agg(jsonb_build_object('product_id', product_id, 'product_name', product_name) order by product_name), '[]'::jsonb)
  into v_skipped from _accessory_targets where mixed;
  select coalesce(jsonb_agg(jsonb_build_object('product_id', product_id, 'product_name', product_name) order by product_name), '[]'::jsonb)
  into v_touched from _accessory_targets where not mixed;

  for v_color in
    select distinct c.id, c.name
    from product_variants pv
    join colors c on c.id = pv.color_id
    where pv.product_id in (select product_id from _accessory_targets where not mixed)
  loop
    insert into motifs (name) values (v_color.name) on conflict do nothing;
    select id into v_motif_id from motifs where lower(name) = lower(v_color.name);
    -- Sin motivo (chocó el slug con otro nombre): ese color se deja como está.
    continue when v_motif_id is null;

    update product_images set motif_id = v_motif_id, color_id = null
    where color_id = v_color.id and product_id in (select product_id from _accessory_targets where not mixed);
    get diagnostics v_rows = row_count;
    v_images := v_images + v_rows;

    update product_variants set motif_id = v_motif_id
    where color_id = v_color.id and product_id in (select product_id from _accessory_targets where not mixed);
    get diagnostics v_rows = row_count;
    v_variants := v_variants + v_rows;
  end loop;

  return jsonb_build_object('variants', v_variants, 'images', v_images, 'products', v_touched, 'skipped', v_skipped);
end;
$$;

select accessory_colors_to_motifs();

revoke execute on function color_to_motif(uuid, boolean) from public, anon, authenticated;
revoke execute on function accessory_colors_to_motifs() from public, anon, authenticated;
grant execute on function color_to_motif(uuid, boolean) to service_role;
grant execute on function accessory_colors_to_motifs() to service_role;

-- Solo el servidor (service_role).
revoke execute on function _apply_attribute_cells(uuid, text, uuid, jsonb, boolean, boolean) from public, anon, authenticated;
revoke execute on function apply_attribute_cells(uuid, text, uuid, jsonb, boolean, boolean, boolean) from public, anon, authenticated;
revoke execute on function add_color_to_category_models(uuid, uuid, uuid[], boolean) from public, anon, authenticated;
revoke execute on function remove_color_from_category_models(uuid, uuid, uuid[], boolean) from public, anon, authenticated;
revoke execute on function merge_attributes(text, uuid, uuid) from public, anon, authenticated;
revoke execute on function sync_colors_from_variants() from public, anon, authenticated;
grant execute on function _apply_attribute_cells(uuid, text, uuid, jsonb, boolean, boolean) to service_role;
grant execute on function apply_attribute_cells(uuid, text, uuid, jsonb, boolean, boolean, boolean) to service_role;
grant execute on function add_color_to_category_models(uuid, uuid, uuid[], boolean) to service_role;
grant execute on function remove_color_from_category_models(uuid, uuid, uuid[], boolean) to service_role;
grant execute on function merge_attributes(text, uuid, uuid) to service_role;
grant execute on function sync_colors_from_variants() to service_role;
