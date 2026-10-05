-- Datos base de La Fundita. Se cargan con `supabase db reset` y se pueden
-- re-aplicar en cualquier entorno (local, Supabase Cloud): son idempotentes.
-- Solo datos reales de catálogo: sin productos, variantes, proveedores ni
-- movimientos de prueba.

-- Categorías (IDs fijos: las referencian los productos). El menú de la
-- tienda son las dos de tope (Fundas, Accesorios); sus hijas son los "tipos"
-- que se filtran con chips. El on conflict actualiza nombre, slug, padre y
-- orden, para poder reaplicar el seed tras una reestructuración sin perder el
-- id (ni las referencias de productos ya cargados). El slug va explícito: el
-- trigger que lo calcula solo corre al insertar.
-- Resto de una estructura anterior: una "Vidrios templados" de tope con otro id.
-- Si quedó vacía se borra antes, para que no choque el slug con la nueva.
delete from categories
  where id = '11111111-1111-1111-1111-111111111132'
    and not exists (
      select 1 from products where category_id = '11111111-1111-1111-1111-111111111132'
    );

insert into categories (id, name, slug, parent_id, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'Fundas', 'fundas', null, 1),
  ('11111111-1111-1111-1111-111111111112', 'Accesorios', 'accesorios', null, 2),
  ('11111111-1111-1111-1111-111111111123', 'Silicona', 'silicona', '11111111-1111-1111-1111-111111111111', 1),
  ('11111111-1111-1111-1111-111111111121', 'Transparentes', 'transparentes', '11111111-1111-1111-1111-111111111111', 2),
  ('11111111-1111-1111-1111-111111111122', 'Diseño', 'diseno', '11111111-1111-1111-1111-111111111111', 3),
  ('11111111-1111-1111-1111-111111111141', 'Lentes de cámara', 'lentes-de-camara', '11111111-1111-1111-1111-111111111112', 1),
  ('11111111-1111-1111-1111-111111111142', 'Vidrios templados', 'vidrios-templados', '11111111-1111-1111-1111-111111111112', 2),
  ('11111111-1111-1111-1111-111111111143', 'Straps', 'straps', '11111111-1111-1111-1111-111111111112', 3),
  ('11111111-1111-1111-1111-111111111144', 'Soportes', 'soportes', '11111111-1111-1111-1111-111111111112', 4),
  ('11111111-1111-1111-1111-111111111145', 'Auriculares', 'auriculares', '11111111-1111-1111-1111-111111111112', 5),
  ('11111111-1111-1111-1111-111111111131', 'Cargadores y cables', 'cargadores-y-cables', '11111111-1111-1111-1111-111111111112', 6),
  ('11111111-1111-1111-1111-111111111146', 'Protectores de cargador', 'protectores-de-cargador', '11111111-1111-1111-1111-111111111112', 7)
on conflict (id) do update
  set name = excluded.name, slug = excluded.slug, parent_id = excluded.parent_id, sort_order = excluded.sort_order;

-- Modelos de iPhone, de iPhone 11 a iPhone 18 Pro Max, en orden de aparición
-- (dentro de cada línea: base, Air, Pro, Pro Max).
-- Upsert por nombre (unique en la migración iphone_models_unique_name): re-correrlo
-- no duplica y deja el sort_order al día; los ids y las variantes existentes no cambian.
insert into iphone_models (name, sort_order) values
  ('iPhone 11', 1),
  ('iPhone 11 Pro', 2),
  ('iPhone 11 Pro Max', 3),
  ('iPhone 12', 4),
  ('iPhone 12 Pro', 5),
  ('iPhone 12 Pro Max', 6),
  ('iPhone 13', 7),
  ('iPhone 13 Pro', 8),
  ('iPhone 13 Pro Max', 9),
  ('iPhone 14', 10),
  ('iPhone 14 Pro', 11),
  ('iPhone 14 Pro Max', 12),
  ('iPhone 15', 13),
  ('iPhone 15 Pro', 14),
  ('iPhone 15 Pro Max', 15),
  ('iPhone 16', 16),
  ('iPhone 16 Pro', 17),
  ('iPhone 16 Pro Max', 18),
  ('iPhone 17', 19),
  ('iPhone 17 Air', 20),
  ('iPhone 17 Pro', 21),
  ('iPhone 17 Pro Max', 22),
  ('iPhone 18', 23),
  ('iPhone 18 Air', 24),
  ('iPhone 18 Pro', 25),
  ('iPhone 18 Pro Max', 26)
on conflict (name) do update set sort_order = excluded.sort_order;

-- Colores: la paleta base del entorno local. El sistema no crea colores por
-- su cuenta (en producción se crean desde el panel); acá se cargan a mano,
-- como el resto del seed, para que una base nueva tenga con qué enlazar el
-- catálogo importado. Idempotente.
insert into colors (name, slug, hex, assigned)
select initcap(left(n, 1)) || substr(n, 2), slugify(n), color_hex_for(n), true
from unnest(array[
  'negro', 'blanco', 'gris', 'gris oscuro', 'plateado', 'dorado', 'rojo', 'bordó', 'vinotinto', 'cherry', 'cereza',
  'amarillo pastel', 'verde', 'verde oscuro', 'verde agua', 'verde pastel', 'verde plomo', 'celeste', 'celeste pastel',
  'azul', 'azul marino', 'azul oscuro', 'azul petróleo', 'violeta', 'lila', 'morado', 'púrpura', 'rosa', 'rosa pastel',
  'rosa viejo', 'magenta', 'beige', 'crema', 'marrón', 'marrón claro'
]) as n
where color_hex_for(n) is not null
on conflict do nothing;

-- Enlaza las variantes que ya estén cargadas con los colores y motivos que
-- existan (no crea ninguno). El script de importación la vuelve a llamar.
select sync_colors_from_variants();
