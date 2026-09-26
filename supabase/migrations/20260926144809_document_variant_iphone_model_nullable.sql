-- product_variants.iphone_model_id ya era nullable desde el esquema inicial
-- (20260918155831_create_initial_schema.sql: "no todos los productos dependen
-- del modelo"). El drop not null de abajo es un no-op sobre el estado actual,
-- se deja explícito para que la migración sea correcta igual si alguna vez
-- se agrega la restricción por error. Lo que sí es nuevo es el comentario,
-- para documentar en el propio esquema qué significa NULL acá.
--
-- Revisado antes de aplicar: ni la política RLS de catálogo público
-- ("catalogo publico: variantes activas", en 20260920120000) ni el índice
-- idx_product_variants_iphone_model_id dependen de que la columna sea NOT
-- NULL — ambos funcionan igual con valores NULL.
alter table product_variants
  alter column iphone_model_id drop not null;

comment on column product_variants.iphone_model_id is
  'Modelo de iPhone al que aplica esta variante. NULL = variante universal, no atada a un modelo de iPhone (ej. cables, cabezales, auriculares, combos funda+accesorio).';
