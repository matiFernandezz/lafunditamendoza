-- Contenido editable de la home (panel › Tienda): el carrusel de arriba, la
-- foto de cada mosaico de categoría y las fundas de "Nuevos ingresos". Hasta
-- ahora estaba fijo en el código; se carga con lo mismo que se veía.

-- ---------------------------------------------------------------------------
-- Carrusel de la portada. kind decide qué va encima de la foto:
--   rango  → "iPhone 11 → 18 Pro Max" (texto fijo de la marca)
--   titulo → etiqueta chica + titular + link opcional
--   logo   → el logo grande
--   foto   → solo la foto
-- image_url: una ruta del sitio (/photos/...) o una URL pública de Storage.
-- mobile_image_url: foto propia para el celular (vertical 4:5); sin ella, el
-- celular recorta la de computadora (apaisada) con el encuadre elegido.
-- dim: brillo de la foto debajo del texto (0.55 = bastante más oscura; null = automático).
-- ---------------------------------------------------------------------------
create table home_slides (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  image_url text not null check (btrim(image_url) <> ''),
  mobile_image_url text check (mobile_image_url is null or btrim(mobile_image_url) <> ''),
  alt text not null default '',
  kind text not null default 'foto' check (kind in ('rango', 'titulo', 'logo', 'foto')),
  label text,
  title text,
  cta_label text,
  cta_href text,
  position text,
  dim numeric(3, 2) check (dim is null or (dim >= 0 and dim <= 1)),
  created_at timestamptz not null default now()
);

insert into home_slides (sort_order, image_url, alt, kind, label, title, cta_label, cta_href, position, dim) values
  (0, '/photos/marble-cases.jpg', 'Fundas tornasoladas sobre una mesa de madera', 'rango', null, null, null, null, null, null),
  (1, '/photos/magsafe-colores-mesa.jpg', 'Fundas de colores sobre una mesa', 'titulo',
      'Fundas de diseño', 'Fundas con diseño para vos.', 'Ver más', '/categoria/fundas?tipo=diseno', null, null),
  (2, '/photos/coleccion-flatlay-a.jpg', 'Colección de fundas sobre una mesa', 'titulo',
      null, 'Tu iPhone, pero más vos.', 'Ver todo', '/categoria/fundas', null, null),
  (3, '/photos/wave-cases-mesa.jpg', 'Fundas con olas sobre una mesa de madera', 'logo',
      null, null, null, null, 'center 40%', 0.55);

-- ---------------------------------------------------------------------------
-- Foto del mosaico de cada categoría en la home (null = grafito liso).
-- ---------------------------------------------------------------------------
alter table categories add column home_image_url text;

update categories c
set home_image_url = v.url
from (values
  ('diseno', '/photos/star-cases.jpg'),
  ('transparentes', '/photos/cherry-cases.jpg'),
  ('silicona', '/photos/magsafe-colores-mesa.jpg')
) as v (slug, url)
where c.slug = v.slug;

-- ---------------------------------------------------------------------------
-- "Nuevos ingresos": qué fundas, en qué orden y con qué foto recortada (PNG
-- sin fondo, para el teléfono que gira) y color de canto. Nombre, precio y
-- descripción salen del producto.
-- ---------------------------------------------------------------------------
create table home_new_arrivals (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  sort_order int not null default 0,
  image_url text not null check (btrim(image_url) <> ''),
  edge_color text not null default '#121212' check (edge_color ~ '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now()
);

create index idx_home_new_arrivals_product on home_new_arrivals (product_id);

insert into home_new_arrivals (product_id, sort_order, image_url, edge_color)
select p.id, v.ord, v.url, v.edge
from (values
  (0, 'Cherry Case', '/nuevos/cherry.png', '#716c63'),
  (1, 'Chessy Case', '/nuevos/chessy.png', '#121212'),
  (2, 'MagCase', '/nuevos/magcase.png', '#723f4b'),
  (3, 'Smoky Case', '/nuevos/smoky.png', '#716561')
) as v (ord, name, url, edge)
join lateral (select id from products where lower(btrim(name)) = lower(v.name) order by created_at limit 1) as p on true;

-- ---------------------------------------------------------------------------
-- La tienda las lee con la clave pública; el panel escribe con la secreta.
-- ---------------------------------------------------------------------------
alter table home_slides enable row level security;
alter table home_new_arrivals enable row level security;

create policy "tienda publica: carrusel" on home_slides for select to anon using (true);
create policy "tienda publica: nuevos ingresos" on home_new_arrivals for select to anon using (true);

grant select on home_slides, home_new_arrivals to anon;
grant select, insert, update, delete on home_slides, home_new_arrivals to service_role;

-- ---------------------------------------------------------------------------
-- Secciones de la home debajo de "Elegí tu iPhone" (el carrusel y la franja
-- de modelos van siempre arriba): en qué orden van, si se ven y su título.
-- ---------------------------------------------------------------------------
create table home_sections (
  key text primary key check (key in ('categorias', 'mas_vendidas', 'ultimos')),
  sort_order int not null default 0,
  visible boolean not null default true,
  title text not null check (btrim(title) <> '' and char_length(title) <= 60)
);

insert into home_sections (key, sort_order, title) values
  ('categorias', 0, '¿Qué estás buscando?'),
  ('mas_vendidas', 1, 'Las funditas más vendidas'),
  ('ultimos', 2, 'Últimos ingresos');

alter table home_sections enable row level security;
create policy "tienda publica: secciones" on home_sections for select to anon using (true);
grant select on home_sections to anon;
grant select, update on home_sections to service_role;
