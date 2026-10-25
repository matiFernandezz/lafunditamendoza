-- Respaldo de Instagram: los últimos posts que se trajeron bien, para
-- mostrarlos si Meta falla o bloquea el acceso, y el último error que dio, para
-- avisarlo en el panel (Tienda › Nosotros).
alter table instagram_connection
  add column cached_posts jsonb,
  add column cached_at timestamptz,
  add column last_error text,
  add column last_error_at timestamptz;
