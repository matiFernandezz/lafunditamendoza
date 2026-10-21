-- Cada categoría configura cómo son las variantes de sus productos:
--   variant_kind: 'color' (fundas por color), 'motif' (diseño: dibujos,
--                 personajes) o 'none' (sin variante: se distinguen solo por
--                 modelo o por una descripción libre).
--   by_model:     true = una variante por modelo de iPhone; false = universal.
-- null = hereda de la categoría de arriba. Reemplaza la regla fija "en
-- Accesorios no hay colores" (category_is_accessory).

alter table categories
  add column variant_kind text check (variant_kind in ('color', 'motif', 'none')),
  add column by_model boolean;

-- Las de tope: Fundas por color y por modelo; Accesorios sin variante y universales.
update categories set variant_kind = 'color', by_model = true where slug = 'fundas';
update categories set variant_kind = 'none', by_model = false where slug = 'accesorios';

-- El resto de las de tope (si hubiera) y los tipos: lo que usan hoy sus
-- productos, guardado solo cuando difiere de lo que heredarían.
with usage as (
  select c.id, c.parent_id,
         bool_or(pv.motif_id is not null) as motifs,
         bool_or(pv.color_id is not null) as colors,
         bool_or(pv.iphone_model_id is not null) as models,
         count(pv.id) as variants
  from categories c
  left join products p on p.category_id = c.id
  left join product_variants pv on pv.product_id = p.id and pv.active
  group by c.id, c.parent_id
)
update categories c
set variant_kind = case
      when u.motifs and coalesce(parent.variant_kind, 'none') <> 'motif' then 'motif'
      when u.colors and coalesce(parent.variant_kind, 'none') <> 'color' then 'color'
      when c.parent_id is null then coalesce(c.variant_kind, case when u.motifs then 'motif' when u.colors then 'color' else 'none' end)
      else c.variant_kind
    end,
    by_model = case
      when u.variants > 0 and u.models is distinct from coalesce(parent.by_model, false) then u.models
      when c.parent_id is null then coalesce(c.by_model, coalesce(u.models, false))
      else c.by_model
    end
from usage u
left join categories parent on parent.id = u.parent_id
where u.id = c.id
  and c.slug not in ('fundas', 'accesorios');

-- Configuración efectiva: la propia o la de la primera categoría de arriba que
-- la tenga. Sin nada en toda la rama: color y por modelo, como se comportaba
-- cualquier categoría fuera de Accesorios antes de esta configuración.
create function category_settings(p_category_id uuid)
returns table (variant_kind text, by_model boolean)
language sql
stable
set search_path = public
as $$
  with recursive up as (
    select id, parent_id, variant_kind, by_model, 0 as depth from categories where id = p_category_id
    union all
    select c.id, c.parent_id, c.variant_kind, c.by_model, up.depth + 1
    from categories c join up on c.id = up.parent_id
    where up.depth < 10
  )
  select
    coalesce((select u.variant_kind from up u where u.variant_kind is not null order by u.depth limit 1), 'color'),
    coalesce((select u.by_model from up u where u.by_model is not null order by u.depth limit 1), true);
$$;

-- Las funciones de variantes y colores siguen preguntando "¿es accesorio?"
-- para decidir si se permiten colores: ahora la respuesta sale de la
-- configuración de la categoría (los colores solo donde la variante es color).
create or replace function category_is_accessory(p_category_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select (select variant_kind from category_settings(p_category_id)) <> 'color';
$$;

revoke execute on function category_settings(uuid) from public, anon, authenticated;
grant execute on function category_settings(uuid) to service_role;
