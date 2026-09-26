-- Supabase Cloud usa un default privilege distinto al del stack local: las
-- tablas creadas por el rol "postgres" (como las de nuestras migraciones)
-- heredan solo TRUNCATE/REFERENCES/TRIGGER para anon/authenticated/service_role,
-- no SELECT/INSERT/UPDATE/DELETE (a diferencia de local, donde el default es
-- más permisivo). Esto pasó inadvertido porque:
--   - anon ya tenía grants explícitos en 20260920120000_enable_rls_public_catalog.sql
--     (no depende del default), así que el catálogo público no se vio afectado.
--   - service_role -- el que usa el backend para todo, incluido bypasear RLS --
--     nunca recibió un grant explícito y quedó sin acceso a ninguna tabla de
--     la app en producción (confirmado: "permission denied for table categories"
--     al correr el import del catálogo contra Supabase Cloud).

grant select, insert, update, delete on
  categories, iphone_models, products, product_variants,
  suppliers, purchases, purchase_items, sales, sale_items
to service_role;

-- Para que las tablas que se creen en el futuro no repitan el problema.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;
