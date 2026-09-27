-- Varias fotos por producto (antes products.image_url guardaba una sola).
-- Se deja image_url sin borrar por compatibilidad, pero de aca en mas se lee
-- de product_images ordenado por sort_order (la primera fila = portada).
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_product_images_product_id on product_images (product_id);

-- Migra las fotos ya cargadas: una fila por producto, sort_order 0.
insert into product_images (product_id, url, sort_order)
select id, image_url, 0
from products
where image_url is not null;

-- Mismo criterio de RLS que el resto del catalogo publico: lectura para
-- anon, escritura solo service_role. service_role necesita el grant
-- explicito porque las tablas que crea nuestro rol de migraciones (postgres)
-- no lo heredan por default en Supabase Cloud (ver 20260926160000).
alter table product_images enable row level security;

create policy "catalogo publico: imagenes de producto" on product_images
  for select to anon using (true);

revoke all on product_images from anon;
grant select on product_images to anon;

grant select, insert, update, delete on product_images to service_role;
