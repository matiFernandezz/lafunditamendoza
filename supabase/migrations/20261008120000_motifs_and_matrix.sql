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
-- * "Agregar variante": una función que crea una variante por modelo elegido
--   (o reactiva la que estaba archivada).
-- * "Eliminar" una variante: se borra si no tiene historial; si lo tiene,
--   queda archivada y oculta.
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
-- _add_product_variants: el trabajo de "Agregar variante" (y de los colores
-- por categoría), sin validaciones. Crea UNA variante por modelo elegido.
--
-- p_kind: 'color' | 'motif' | 'text'. Con 'text', p_text es la descripción
--   libre ("tipo C a C"), que puede venir vacía (variante única).
-- p_models: array JSON de ids de modelo; null es la variante universal.
-- p_stock: stock inicial. p_price: precio; null = se copia de otra variante
--   del mismo modelo o, si no hay, de otra del producto. p_sku: null = se arma
--   solo (suggest_sku + sufijo si choca); solo se usa con un único modelo.
--
-- Por cada modelo:
--   * ya existe activa (mismo modelo + mismo color/motivo/descripción) -> no
--     duplica (existing; el modelo va en `already`)
--   * existe archivada (se había eliminado teniendo historial) -> se reactiva
--     con su historial, y toma el stock y el precio que se cargan ahora
--   * no existe -> se crea
--
-- Primer color/motivo de un producto que no tiene ninguno: no crea nada; se lo
-- asigna a TODAS sus variantes actuales (assigned, units), que conservan
-- stock, precio y SKU.
-- ---------------------------------------------------------------------------
create or replace function _add_product_variants(
  p_product_id uuid,
  p_kind text,
  p_attr_id uuid,
  p_text text,
  p_models jsonb,
  p_stock int,
  p_price numeric,
  p_sku text
)
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_product_name text;
  v_label text;
  v_text text := nullif(btrim(coalesce(p_text, '')), '');
  v_el jsonb;
  v_model_id uuid;
  v_model_name text;
  v_existing product_variants;
  v_price numeric(12, 2);
  v_base text;
  v_sku text;
  v_n int;
  v_single boolean := jsonb_array_length(coalesce(p_models, '[]'::jsonb)) = 1;
  v_exists boolean;
  v_created int := 0;
  v_reactivated int := 0;
  v_already int := 0;
  v_assigned int := 0;
  v_units int := 0;
  v_already_models jsonb := '[]'::jsonb;
  v_skus text[] := '{}';
begin
  select name into v_product_name from products where id = p_product_id;
  if p_kind = 'color' then
    select name into v_label from colors where id = p_attr_id;
  elsif p_kind = 'motif' then
    select name into v_label from motifs where id = p_attr_id;
  else
    v_label := v_text;
  end if;

  perform 1 from product_variants where product_id = p_product_id order by id for update;

  if p_kind in ('color', 'motif')
     and exists (select 1 from product_variants where product_id = p_product_id and active)
     and not exists (
       select 1 from product_variants
       where product_id = p_product_id and active and (color_id is not null or motif_id is not null)
     )
  then
    if exists (
      select 1 from product_variants
      where product_id = p_product_id and active
        and nullif(btrim(color), '') is not null
        and lower(unaccent(btrim(color))) <> 'unico'
    ) then
      raise exception 'Las variantes de "%" tienen una descripción libre: no se le puede agregar un %', v_product_name,
        case when p_kind = 'color' then 'color' else 'motivo' end
        using errcode = 'CC400';
    end if;

    select count(*), coalesce(sum(stock_quantity), 0) into v_assigned, v_units
    from product_variants where product_id = p_product_id and active;

    -- El trigger completa el texto con el nombre.
    if p_kind = 'color' then
      update product_variants set color_id = p_attr_id where product_id = p_product_id and active;
    else
      update product_variants set motif_id = p_attr_id where product_id = p_product_id and active;
    end if;

    return jsonb_build_object(
      'product_id', p_product_id, 'product_name', v_product_name,
      'created', 0, 'reactivated', 0, 'existing', 0, 'assigned', v_assigned, 'units', v_units,
      'already', '[]'::jsonb, 'skus', '[]'::jsonb
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
      and case p_kind
            when 'color' then color_id = p_attr_id
            when 'motif' then motif_id = p_attr_id
            else color_id is null and motif_id is null
                 and lower(coalesce(btrim(color), '')) = lower(coalesce(v_text, ''))
          end
    order by active desc
    limit 1;
    -- Se guarda ya: el SELECT del precio, más abajo, vuelve a pisar FOUND.
    v_exists := found;

    -- Precio: el indicado; si no, el de otra variante del mismo modelo; si no, de otra del producto.
    v_price := p_price;
    if v_price is null then
      select price into v_price
      from product_variants
      where product_id = p_product_id and active
      order by (iphone_model_id is not distinct from v_model_id) desc, price desc
      limit 1;
    end if;

    if v_exists and v_existing.active then
      v_already := v_already + 1;
      v_already_models := v_already_models || to_jsonb(coalesce(v_model_name, 'Universal'));
    elsif v_exists then
      update product_variants
      set active = true, stock_quantity = coalesce(p_stock, 0), price = coalesce(v_price, price)
      where id = v_existing.id;
      v_reactivated := v_reactivated + 1;
      v_skus := v_skus || v_existing.sku;
    else
      if v_price is null then
        raise exception 'Poné el precio: "%" todavía no tiene variantes de dónde copiarlo', v_product_name
          using errcode = 'CC400';
      end if;

      if v_single and nullif(btrim(coalesce(p_sku, '')), '') is not null then
        v_sku := btrim(p_sku);
        if exists (select 1 from product_variants where sku = v_sku) then
          raise exception 'Ya existe una variante con el SKU "%"', v_sku using errcode = 'CC400';
        end if;
      else
        v_base := coalesce(nullif(suggest_sku(v_product_name, v_model_name, v_label), ''), 'SKU');
        v_sku := v_base;
        v_n := 2;
        while exists (select 1 from product_variants where sku = v_sku) loop
          v_sku := v_base || '-' || v_n;
          v_n := v_n + 1;
        end loop;
      end if;

      insert into product_variants (product_id, iphone_model_id, color_id, motif_id, color, sku, price, stock_quantity, active)
      values (
        p_product_id, v_model_id,
        case when p_kind = 'color' then p_attr_id end,
        case when p_kind = 'motif' then p_attr_id end,
        case when p_kind = 'text' then v_text end,
        v_sku, v_price, coalesce(p_stock, 0), true
      );
      v_created := v_created + 1;
      v_skus := v_skus || v_sku;
    end if;
  end loop;

  return jsonb_build_object(
    'product_id', p_product_id, 'product_name', v_product_name,
    'created', v_created, 'reactivated', v_reactivated, 'existing', v_already, 'assigned', 0, 'units', 0,
    'already', v_already_models, 'skus', to_jsonb(v_skus)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- add_product_variants: la versión pública de "Agregar variante", con
-- validaciones y vista previa (p_dry_run hace todo y lo deshace).
--   * colores: no en Accesorios (CC403). Motivos y descripción: en cualquiera.
--   * un producto usa colores O motivos O descripción libre (se mira lo activo).
-- ---------------------------------------------------------------------------
create or replace function add_product_variants(
  p_product_id uuid,
  p_kind text,
  p_attr_id uuid,
  p_text text,
  p_models jsonb,
  p_stock int default 0,
  p_price numeric default null,
  p_sku text default null,
  p_dry_run boolean default false
)
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_category_id uuid;
  v_uses_colors boolean;
  v_uses_motifs boolean;
  v_result jsonb;
begin
  if p_kind is null or p_kind not in ('color', 'motif', 'text') then
    raise exception 'kind debe ser color, motif o text' using errcode = 'CC400';
  end if;
  if p_models is null or jsonb_typeof(p_models) <> 'array' or jsonb_array_length(p_models) = 0 then
    raise exception 'Elegí al menos un modelo' using errcode = 'CC400';
  end if;
  if coalesce(p_stock, 0) < 0 then
    raise exception 'El stock tiene que ser un entero mayor o igual a 0' using errcode = 'CC400';
  end if;
  if p_price is not null and p_price <= 0 then
    raise exception 'El precio tiene que ser mayor a 0' using errcode = 'CC400';
  end if;

  select category_id into v_category_id from products where id = p_product_id;
  if not found then
    raise exception 'No existe un producto con ese id' using errcode = 'CC404';
  end if;

  select coalesce(bool_or(color_id is not null), false), coalesce(bool_or(motif_id is not null), false)
  into v_uses_colors, v_uses_motifs
  from product_variants where product_id = p_product_id and active;

  if p_kind = 'color' then
    if not exists (select 1 from colors where id = p_attr_id) then
      raise exception 'No existe un color con ese id' using errcode = 'CC404';
    end if;
    if category_is_accessory(v_category_id) then
      raise exception 'Los colores por modelo no aplican a los productos de Accesorios' using errcode = 'CC403';
    end if;
    if v_uses_motifs then
      raise exception 'Este producto usa motivos: no puede tener colores' using errcode = 'CC400';
    end if;
  elsif p_kind = 'motif' then
    if not exists (select 1 from motifs where id = p_attr_id) then
      raise exception 'No existe un motivo con ese id' using errcode = 'CC404';
    end if;
    if v_uses_colors then
      raise exception 'Este producto usa colores: no puede tener motivos' using errcode = 'CC400';
    end if;
  else
    if v_uses_colors then
      raise exception 'Este producto usa colores: elegí el color de la variante' using errcode = 'CC400';
    end if;
    if v_uses_motifs then
      raise exception 'Este producto usa motivos: elegí el motivo de la variante' using errcode = 'CC400';
    end if;
  end if;

  begin
    v_result := _add_product_variants(p_product_id, p_kind, p_attr_id, p_text, p_models, p_stock, p_price, p_sku);
    if p_dry_run then
      raise exception 'dry run' using errcode = 'CCDRY';
    end if;
  exception when sqlstate 'CCDRY' then
    null;
  end;

  return v_result || jsonb_build_object('dry_run', coalesce(p_dry_run, false));
end;
$$;

-- La matriz modelo × color se reemplazó por "Agregar variante": sus funciones se van.
drop function if exists apply_attribute_cells(uuid, text, uuid, jsonb, boolean, boolean, boolean);
drop function if exists _apply_attribute_cells(uuid, text, uuid, jsonb, boolean, boolean);

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
          v_one := _add_product_variants(v_product.id, 'color', p_color_id, null, v_models, 0, null, null);
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

  -- Igual que "Eliminar" una variante: las que no tienen historial se borran;
  -- las que tienen ventas, compras o reservas quedan archivadas y ocultas.
  if not coalesce(p_dry_run, false) then
    update product_variants set active = false
    where id in (select id from _color_targets where stock_quantity = 0)
      and variant_reference_count(id) > 0;
    delete from product_variants
    where id in (select id from _color_targets where stock_quantity = 0)
      and variant_reference_count(id) = 0;
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

-- ---------------------------------------------------------------------------
-- Eliminar variantes (reemplaza a "dar de baja").
--
-- variant_reference_count: cuántas filas de OTRAS tablas apuntan a la variante.
-- Las tablas salen de las claves foráneas que referencian a product_variants
-- (hoy sale_items, purchase_items y web_order_items): si mañana se agrega
-- otra, entra sola.
-- ---------------------------------------------------------------------------
create or replace function variant_reference_count(p_variant_id uuid)
returns int
language plpgsql
stable
set search_path = public, extensions
as $$
declare
  v_fk record;
  v_count int;
  v_total int := 0;
begin
  for v_fk in
    select c.conrelid::regclass as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.confrelid = 'public.product_variants'::regclass
  loop
    execute format('select count(*) from %s where %I = $1', v_fk.tbl, v_fk.col) into v_count using p_variant_id;
    v_total := v_total + v_count;
  end loop;
  return v_total;
end;
$$;

-- ---------------------------------------------------------------------------
-- delete_variant: "Eliminar".
--   * sin ninguna referencia -> BORRA la fila.
--   * con referencias (ventas, compras, reservas) -> queda ARCHIVADA: active =
--     false y stock 0. No se muestra en ningún lado; solo vive en el historial.
--   * con stock > 0 y sin p_force -> no hace nada y devuelve blocked = true con
--     las unidades, para pedir confirmación.
-- Las fotos son del producto (por color o motivo), no de una variante: no hay
-- fotos "de la variante" que borrar.
-- ---------------------------------------------------------------------------
create or replace function delete_variant(p_variant_id uuid, p_force boolean default false, p_dry_run boolean default false)
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_variant product_variants;
  v_references int;
  v_blocked boolean;
begin
  select * into v_variant from product_variants where id = p_variant_id for update;
  if not found or not v_variant.active then
    raise exception 'No existe una variante con ese id' using errcode = 'CC404';
  end if;

  v_references := variant_reference_count(p_variant_id);
  v_blocked := v_variant.stock_quantity > 0 and not coalesce(p_force, false);

  if not v_blocked and not coalesce(p_dry_run, false) then
    if v_references = 0 then
      delete from product_variants where id = p_variant_id;
    else
      update product_variants set active = false, stock_quantity = 0 where id = p_variant_id;
    end if;
  end if;

  return jsonb_build_object(
    'id', p_variant_id,
    'sku', v_variant.sku,
    'units', v_variant.stock_quantity,
    'references', v_references,
    'blocked', v_blocked,
    'deleted', not v_blocked and v_references = 0,
    'archived', not v_blocked and v_references > 0,
    'dry_run', coalesce(p_dry_run, false)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- purge_archived_variants: borra las variantes inactivas que NO tienen ninguna
-- referencia (las que se "daban de baja" antes de que existiera Eliminar). Las
-- que tienen historial quedan archivadas. No toca variantes activas.
-- Idempotente. Devuelve cuántas borró.
-- ---------------------------------------------------------------------------
create or replace function purge_archived_variants()
returns int
language plpgsql
set search_path = public, extensions
as $$
declare
  v_deleted int;
begin
  delete from product_variants
  where not active and variant_reference_count(id) = 0;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- Limpieza única (la segunda vez no encuentra nada).
select purge_archived_variants();

revoke execute on function variant_reference_count(uuid) from public, anon, authenticated;
revoke execute on function delete_variant(uuid, boolean, boolean) from public, anon, authenticated;
revoke execute on function purge_archived_variants() from public, anon, authenticated;
grant execute on function variant_reference_count(uuid) to service_role;
grant execute on function delete_variant(uuid, boolean, boolean) to service_role;
grant execute on function purge_archived_variants() to service_role;

-- ---------------------------------------------------------------------------
-- create_purchase_grid (de 20261005120000), con un cambio: una variante
-- "nueva" cuya combinación modelo + color ya existía ARCHIVADA no se rechaza:
-- se reactiva. Si existe activa, sigue siendo CP409.
-- ---------------------------------------------------------------------------
create or replace function create_purchase_grid(
  p_supplier_id uuid,
  p_purchase_date date,
  p_notes text,
  p_products jsonb
)
returns jsonb
language plpgsql
set search_path = public, extensions
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
  v_old product_variants;
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

-- Solo el servidor (service_role).
revoke execute on function _add_product_variants(uuid, text, uuid, text, jsonb, int, numeric, text) from public, anon, authenticated;
revoke execute on function add_product_variants(uuid, text, uuid, text, jsonb, int, numeric, text, boolean) from public, anon, authenticated;
revoke execute on function add_color_to_category_models(uuid, uuid, uuid[], boolean) from public, anon, authenticated;
revoke execute on function remove_color_from_category_models(uuid, uuid, uuid[], boolean) from public, anon, authenticated;
revoke execute on function merge_attributes(text, uuid, uuid) from public, anon, authenticated;
revoke execute on function sync_colors_from_variants() from public, anon, authenticated;
grant execute on function _add_product_variants(uuid, text, uuid, text, jsonb, int, numeric, text) to service_role;
grant execute on function add_product_variants(uuid, text, uuid, text, jsonb, int, numeric, text, boolean) to service_role;
grant execute on function add_color_to_category_models(uuid, uuid, uuid[], boolean) to service_role;
grant execute on function remove_color_from_category_models(uuid, uuid, uuid[], boolean) to service_role;
grant execute on function merge_attributes(text, uuid, uuid) to service_role;
grant execute on function sync_colors_from_variants() to service_role;
