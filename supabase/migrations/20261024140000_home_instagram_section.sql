-- Nueva sección de la home: los últimos posts de Instagram (los mismos del
-- carrusel de Nosotros, con la cuenta conectada en el panel). Va al final; se
-- puede mover, ocultar o renombrar en el panel › Tienda › Secciones. Sin la
-- cuenta conectada, no se muestra.
alter table home_sections drop constraint home_sections_key_check;
alter table home_sections add constraint home_sections_key_check
  check (key in ('categorias', 'mas_vendidas', 'ultimos', 'instagram'));

insert into home_sections (key, sort_order, title)
values ('instagram', (select coalesce(max(sort_order), -1) + 1 from home_sections), 'Seguinos en Instagram');
