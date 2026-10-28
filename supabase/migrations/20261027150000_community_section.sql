-- Comunidad La Fundita: las capturas de clientes que van en la sección de
-- Instagram de la home (debajo de los últimos posts). Se suben y se ordenan
-- desde el panel › Tienda › Comunidad; sin tope de fotos.

-- Textos editables: una sola fila.
create table community_content (
  id smallint primary key default 1 check (id = 1),
  title text not null check (btrim(title) <> '' and char_length(title) <= 60),
  subtitle text not null default '' check (char_length(subtitle) <= 120),
  cta_label text not null check (btrim(cta_label) <> '' and char_length(cta_label) <= 40)
);

insert into community_content (title, subtitle, cta_label) values
  ('Comunidad La Fundita', 'Ustedes, nuestros mejores influencers', 'Etiquetanos en tus historias');

-- Fotos del carrusel (verticales, como las historias), en orden.
create table community_photos (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  image_url text not null check (btrim(image_url) <> ''),
  created_at timestamptz not null default now()
);

-- La tienda las lee con la clave pública; el panel escribe con la secreta.
alter table community_content enable row level security;
alter table community_photos enable row level security;

create policy "tienda publica: comunidad" on community_content for select to anon using (true);
create policy "tienda publica: fotos de la comunidad" on community_photos for select to anon using (true);

grant select on community_content, community_photos to anon;
grant select, update on community_content to service_role;
grant select, insert, update, delete on community_photos to service_role;
