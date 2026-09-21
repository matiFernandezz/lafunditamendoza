-- Datos base de La Fundita. Se cargan con `supabase db reset` y se pueden
-- re-aplicar en cualquier entorno (local, Supabase Cloud): son idempotentes.
-- Solo datos reales de catálogo: sin productos, variantes, proveedores ni
-- movimientos de prueba.

-- Categorías (IDs fijos: las referencian los productos).
insert into categories (id, name, parent_id) values
  ('11111111-1111-1111-1111-111111111111', 'Fundas', null),
  ('11111111-1111-1111-1111-111111111112', 'Accesorios', null),
  ('11111111-1111-1111-1111-111111111121', 'Transparentes', '11111111-1111-1111-1111-111111111111'),
  ('11111111-1111-1111-1111-111111111122', 'Con diseño', '11111111-1111-1111-1111-111111111111'),
  ('11111111-1111-1111-1111-111111111131', 'Cargadores', '11111111-1111-1111-1111-111111111112'),
  ('11111111-1111-1111-1111-111111111132', 'Vidrios templados', '11111111-1111-1111-1111-111111111112')
on conflict (id) do nothing;

-- Modelos de iPhone, de iPhone 11 a iPhone Air, en orden de aparición.
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
  ('iPhone 17 Pro', 20),
  ('iPhone 17 Pro Max', 21),
  ('iPhone Air', 22)
on conflict (name) do update set sort_order = excluded.sort_order;
