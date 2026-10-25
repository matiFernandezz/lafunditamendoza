-- Página Nosotros editable desde el panel › Tienda: el texto, las fotos del
-- carrusel que va al lado y las publicaciones de Instagram y TikTok que se
-- muestran (se pegan los links; la página las embebe).

-- ---------------------------------------------------------------------------
-- Texto: una sola fila. body va en párrafos separados por una línea en blanco.
-- ---------------------------------------------------------------------------
create table about_page (
  id smallint primary key default 1 check (id = 1),
  title text not null check (btrim(title) <> '' and char_length(title) <= 60),
  body text not null check (btrim(body) <> '' and char_length(body) <= 2000)
);

insert into about_page (title, body) values (
  'Nosotros',
  E'En La Fundita elegimos fundas y accesorios para iPhone que nos gustan de verdad: lindos, que protejan y a buen precio.\n\nSomos de Mendoza. En la web ves lo que hay en stock para tu modelo y lo reservás en el momento. Hacemos envíos flash durante el día y también podés retirar tu fundita en un punto de encuentro.'
);

-- ---------------------------------------------------------------------------
-- Fotos del carrusel de al lado del texto (vertical 4:5), en orden.
-- ---------------------------------------------------------------------------
create table about_photos (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  image_url text not null check (btrim(image_url) <> ''),
  created_at timestamptz not null default now()
);

insert into about_photos (sort_order, image_url) values
  (0, '/photos/coleccion-flatlay-a.jpg'),
  (1, '/photos/star-cases.jpg'),
  (2, '/photos/cherry-cases.jpg');

-- ---------------------------------------------------------------------------
-- Publicaciones de las redes: el link de un post o reel de Instagram, o de un
-- video de TikTok. sort_order ordena dentro de toda la lista.
-- ---------------------------------------------------------------------------
create table social_posts (
  id uuid primary key default gen_random_uuid(),
  network text not null check (network in ('instagram', 'tiktok')),
  url text not null check (char_length(url) <= 300 and url ~ '^https://'),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- La tienda las lee con la clave pública; el panel escribe con la secreta.
-- ---------------------------------------------------------------------------
alter table about_page enable row level security;
alter table about_photos enable row level security;
alter table social_posts enable row level security;

create policy "tienda publica: nosotros" on about_page for select to anon using (true);
create policy "tienda publica: fotos de nosotros" on about_photos for select to anon using (true);
create policy "tienda publica: publicaciones" on social_posts for select to anon using (true);

grant select on about_page, about_photos, social_posts to anon;
grant select, update on about_page to service_role;
grant select, insert, update, delete on about_photos, social_posts to service_role;
