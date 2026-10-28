-- Interruptor de la sección de TikTok en Nosotros (panel › Tienda › Nosotros).
-- Arranca oculta; se muestra de nuevo desde el panel cuando se quiera.
alter table about_page
  add column show_tiktok boolean not null default false;
