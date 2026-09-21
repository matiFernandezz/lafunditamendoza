-- Datos de prueba para desarrollo local (se cargan con `supabase db reset`).
-- IDs fijos + on conflict do nothing: se puede correr varias veces.

insert into categories (id, name, parent_id) values
  ('11111111-1111-1111-1111-111111111111', 'Fundas', null),
  ('11111111-1111-1111-1111-111111111112', 'Accesorios', null),
  ('11111111-1111-1111-1111-111111111121', 'Transparentes', '11111111-1111-1111-1111-111111111111'),
  ('11111111-1111-1111-1111-111111111122', 'Con diseño', '11111111-1111-1111-1111-111111111111'),
  ('11111111-1111-1111-1111-111111111131', 'Cargadores', '11111111-1111-1111-1111-111111111112'),
  ('11111111-1111-1111-1111-111111111132', 'Vidrios templados', '11111111-1111-1111-1111-111111111112')
on conflict (id) do nothing;

insert into iphone_models (id, name, sort_order) values
  ('22222222-2222-2222-2222-222222222222', 'iPhone 13 Pro Max', 1),
  ('22222222-2222-2222-2222-222222222223', 'iPhone 14', 2),
  ('22222222-2222-2222-2222-222222222224', 'iPhone 15 Pro', 3)
on conflict (id) do nothing;

insert into products (id, category_id, name, description, active) values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111121', 'Funda transparente', 'Silicona flexible, borde reforzado.', true),
  ('33333333-3333-3333-3333-333333333334', '11111111-1111-1111-1111-111111111122', 'Funda con diseño floral', 'Acabado mate con estampa floral.', true),
  ('33333333-3333-3333-3333-333333333335', '11111111-1111-1111-1111-111111111131', 'Cargador USB-C 20W', 'Carga rápida, compatible con todos los iPhone.', true),
  ('33333333-3333-3333-3333-333333333336', '11111111-1111-1111-1111-111111111132', 'Vidrio templado 9H', null, true),
  ('33333333-3333-3333-3333-333333333337', '11111111-1111-1111-1111-111111111121', 'Funda discontinuada', 'No debería verse: producto inactivo.', false)
-- do update: el catálogo muestra productos de subcategorías, no de la categoría padre.
on conflict (id) do update set category_id = excluded.category_id;

insert into product_variants (id, product_id, iphone_model_id, color, sku, price, cost_price, stock_quantity, active) values
  -- Funda transparente: una por modelo, una sin stock
  ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'transparente', 'SKU-TEST-001', 5000, 2000, 10, true),
  ('44444444-4444-4444-4444-444444444445', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222223', 'transparente', 'FT-14-TR', 5000, 2000, 2, true),
  ('44444444-4444-4444-4444-444444444446', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222224', 'transparente', 'FT-15P-TR', 5500, 2200, 0, true),
  -- Funda floral: solo iPhone 14 (stock) y iPhone 15 Pro (sin stock => no aparece para ese modelo)
  ('44444444-4444-4444-4444-444444444447', '33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222223', 'rosa', 'FF-14-RS', 6500, 2500, 5, true),
  ('44444444-4444-4444-4444-444444444448', '33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222224', 'rosa', 'FF-15P-RS', 6500, 2500, 0, true),
  -- Cargador: sin restricción de modelo (iphone_model_id null)
  ('44444444-4444-4444-4444-444444444449', '33333333-3333-3333-3333-333333333335', null, 'blanco', 'CG-20W-BL', 12000, 6000, 8, true),
  -- Vidrio: variante por modelo + una variante descontinuada con stock
  ('44444444-4444-4444-4444-44444444444a', '33333333-3333-3333-3333-333333333336', '22222222-2222-2222-2222-222222222222', null, 'VT-13PM', 3000, 900, 20, true),
  ('44444444-4444-4444-4444-44444444444b', '33333333-3333-3333-3333-333333333336', '22222222-2222-2222-2222-222222222223', null, 'VT-14', 3000, 900, 4, false),
  -- Producto inactivo
  ('44444444-4444-4444-4444-44444444444c', '33333333-3333-3333-3333-333333333337', null, 'negro', 'FD-OLD', 1000, 300, 5, true)
on conflict (id) do nothing;
