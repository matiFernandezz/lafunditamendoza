-- Carrusel de la portada (panel › Tienda › Carrusel):
--   logo_size: tamaño del logo de la marca encima de la foto, chico, mediano
--     o grande. null = automático (mediano, el de siempre).
alter table home_slides
  add column logo_size text check (logo_size in ('chico', 'mediano', 'grande'));
