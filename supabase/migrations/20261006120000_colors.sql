-- Colores como lista (antes: texto libre en product_variants.color).
--
-- * colors: nombre, slug y hex de cada color. Lectura pública, escritura solo
--   service_role.
-- * product_variants.color_id: el color de la variante. La columna de texto
--   `color` se conserva y un trigger la mantiene igual al nombre del color.
--   Una variante sin color_id puede seguir teniendo texto en `color`: es una
--   descripción que no es un color ("Tipo C a Lightning").
-- * product_images.color_id: null = foto general del producto.
--
-- Idempotente: se puede correr más de una vez.

create extension if not exists unaccent;
-- unaccent puede vivir en el esquema extensions (Supabase Cloud) o en public
-- (local): por eso las funciones de acá fijan search_path = public, extensions.

create table if not exists colors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  hex text not null default '#9ca3af' check (hex ~ '^#[0-9a-f]{6}$'),
  -- false = "sin color asignado": el hex es el gris por defecto y hay que
  -- elegirlo en /admin/colores.
  assigned boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists colors_name_key on colors (lower(name));
create unique index if not exists colors_slug_key on colors (slug);

create or replace function colors_set_slug()
returns trigger
language plpgsql
as $$
begin
  new.name := btrim(new.name);
  if new.slug is null or (tg_op = 'UPDATE' and new.name is distinct from old.name and new.slug = old.slug) then
    new.slug := slugify(new.name);
  end if;
  return new;
end;
$$;

drop trigger if exists colors_set_slug_trigger on colors;
create trigger colors_set_slug_trigger
  before insert or update of name on colors
  for each row
  execute function colors_set_slug();

-- ---------------------------------------------------------------------------
-- Nombre "oficial" de un color escrito a mano: sin espacios de más, con
-- mayúscula inicial y unificando el género ("negra" -> "Negro"). Un texto que
-- no está en el mapa de colores se deja como está ("BATMAN").
-- ---------------------------------------------------------------------------
create or replace function color_hex_for(p_name text)
returns text
language sql
stable
as $$
  select m.hex
  from (values
    ('negro', '#111111'), ('blanco', '#ffffff'), ('gris', '#9aa0a6'), ('gris oscuro', '#4b4f54'),
    ('gris claro', '#d1d5db'), ('plateado', '#c0c0c0'), ('dorado', '#d4af37'), ('transparente', '#f2f2f2'),
    ('rojo', '#d92d20'), ('bordo', '#6d1a2b'), ('vinotinto', '#5e1224'), ('cherry', '#9b1b30'),
    ('cereza', '#a11d33'), ('coral', '#ff7f6b'), ('naranja', '#f97316'), ('amarillo', '#f5c518'),
    ('amarillo pastel', '#f9eeb0'), ('mostaza', '#d4a017'), ('verde', '#2e9e5b'), ('verde oscuro', '#1f5c3a'),
    ('verde agua', '#8fd9c4'), ('verde pastel', '#bfe6c8'), ('verde plomo', '#5f6f63'), ('verde militar', '#4b5320'),
    ('turquesa', '#2bb8b0'), ('celeste', '#7cc4ee'), ('celeste pastel', '#bfe3f5'), ('azul', '#2563eb'),
    ('azul marino', '#1e2a4a'), ('azul oscuro', '#1e3a8a'), ('azul petroleo', '#1f4e5f'), ('violeta', '#7c3aed'),
    ('lila', '#c4a7e7'), ('lavanda', '#b9a9e0'), ('morado', '#6b3fa0'), ('purpura', '#6a2c91'),
    ('rosa', '#f4a6c0'), ('rosa pastel', '#f9d3e0'), ('rosa viejo', '#c98b93'), ('fucsia', '#e0218a'),
    ('magenta', '#c2187a'), ('beige', '#e3d5b8'), ('crema', '#f3ead3'), ('nude', '#e6c7b0'),
    ('marron', '#6f4e37'), ('marron claro', '#a67b5b')
  ) as m(name, hex)
  where m.name = lower(unaccent(btrim(p_name)));
$$;

create or replace function color_canonical_name(p_text text)
returns text
language sql
stable
as $$
  with base as (
    select btrim(p_text) as raw,
           case lower(unaccent(btrim(p_text)))
             when 'negra' then 'negro'
             when 'blanca' then 'blanco'
             when 'roja' then 'rojo'
             when 'amarilla' then 'amarillo'
             when 'morada' then 'morado'
             when 'bordo' then 'bordó'
             else lower(btrim(p_text))
           end as normal
  )
  select case
           when color_hex_for(normal) is not null then upper(left(normal, 1)) || substr(normal, 2)
           else raw
         end
  from base;
$$;

-- ---------------------------------------------------------------------------
-- product_variants.color_id + el texto `color` siempre coherente con él.
-- ---------------------------------------------------------------------------
alter table product_variants
  add column if not exists color_id uuid references colors (id) on delete set null;
create index if not exists idx_product_variants_color_id on product_variants (color_id);

-- Quien escribe puede mandar el color por id o por texto (las pantallas, la
-- función de compras y el script de importación mandan texto):
--   * llega o cambia solo el texto -> se busca el color con ese nombre; si
--     existe se enlaza, si no la variante queda sin color y el texto vale
--     como descripción.
--   * hay color_id -> el texto pasa a ser el nombre del color.
create or replace function product_variants_sync_color()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
declare
  v_color colors;
begin
  if (tg_op = 'INSERT' and new.color_id is null)
     or (tg_op = 'UPDATE' and new.color is distinct from old.color and new.color_id is not distinct from old.color_id)
  then
    new.color_id := null;
    if nullif(btrim(new.color), '') is not null then
      select * into v_color from colors where lower(name) = lower(color_canonical_name(new.color));
      if found then
        new.color_id := v_color.id;
        new.color := v_color.name;
      end if;
    end if;
  elsif new.color_id is not null then
    select name into new.color from colors where id = new.color_id;
  end if;
  return new;
end;
$$;

drop trigger if exists product_variants_sync_color_trigger on product_variants;
create trigger product_variants_sync_color_trigger
  before insert or update of color, color_id on product_variants
  for each row
  execute function product_variants_sync_color();

-- Renombrar un color renombra el texto de sus variantes.
create or replace function colors_rename_variants()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  update product_variants set color = new.name where color_id = new.id and color is distinct from new.name;
  return null;
end;
$$;

drop trigger if exists colors_rename_variants_trigger on colors;
create trigger colors_rename_variants_trigger
  after update of name on colors
  for each row
  when (new.name is distinct from old.name)
  execute function colors_rename_variants();

-- ---------------------------------------------------------------------------
-- product_images.color_id: null = foto general. Las fotos existentes quedan
-- como generales.
-- ---------------------------------------------------------------------------
alter table product_images
  add column if not exists color_id uuid references colors (id) on delete set null;
create index if not exists idx_product_images_color_id on product_images (color_id);

-- ---------------------------------------------------------------------------
-- sync_colors_from_variants: crea los colores que falten a partir de los textos
-- de las variantes sin color (menos vacío y "Único") y las enlaza. Los nombres
-- conocidos reciben su hex; el resto queda gris y "sin color asignado".
-- La usan esta migración, seed.sql y el script de importación. Devuelve
-- cuántos colores creó.
-- ---------------------------------------------------------------------------
create or replace function sync_colors_from_variants()
returns int
language plpgsql
set search_path = public, extensions
as $$
declare
  v_created int;
begin
  insert into colors (name, slug, hex, assigned)
  select d.name, slugify(d.name), coalesce(color_hex_for(d.name), '#9ca3af'), color_hex_for(d.name) is not null
  from (
    select distinct on (lower(color_canonical_name(color))) color_canonical_name(color) as name
    from product_variants
    where color_id is null
      and nullif(btrim(color), '') is not null
      and lower(unaccent(btrim(color))) <> 'unico'
    order by lower(color_canonical_name(color)), color
  ) d
  on conflict do nothing;
  get diagnostics v_created = row_count;

  update product_variants pv
  set color_id = c.id
  from colors c
  where pv.color_id is null
    and nullif(btrim(pv.color), '') is not null
    and lower(c.name) = lower(color_canonical_name(pv.color));

  return v_created;
end;
$$;

select sync_colors_from_variants();

-- ---------------------------------------------------------------------------
-- Permisos: mismo criterio que el resto del catálogo público.
-- ---------------------------------------------------------------------------
alter table colors enable row level security;

drop policy if exists "catalogo publico: colores" on colors;
create policy "catalogo publico: colores" on colors
  for select to anon using (true);

revoke all on colors from anon, authenticated;
grant select on colors to anon;
grant select, insert, update, delete on colors to service_role;

-- anon lee product_variants por columnas (sin cost_price): se suma color_id.
grant select (color_id) on product_variants to anon;

revoke execute on function sync_colors_from_variants() from public, anon, authenticated;
grant execute on function sync_colors_from_variants() to service_role;
