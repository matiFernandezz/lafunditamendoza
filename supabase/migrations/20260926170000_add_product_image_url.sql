-- Las fotos son por PRODUCTO (el diseño), no por variante: un mismo diseño
-- comparte una sola foto entre todos sus modelos/colores, como en el
-- catálogo original de WhatsApp Business (una miniatura por diseño).
alter table products
  add column image_url text;

comment on column products.image_url is
  'URL publica de la foto del producto en el bucket de Storage "product-images". NULL = todavia no tiene foto cargada.';
