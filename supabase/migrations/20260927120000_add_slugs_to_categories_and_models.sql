-- URLs legibles para categorías y modelos ("/categoria/cargadores-y-cables"
-- en vez de un uuid). slugify() vive en la base para que cualquier fila
-- nueva (hoy solo se crean por seed.sql, pero esto no depende de eso) reciba
-- su slug automáticamente via trigger, sin que la app tenga que calcularlo.

create extension if not exists unaccent;

create or replace function slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(unaccent(input)), '[^a-z0-9]+', '-', 'g'));
$$;

-- categories --------------------------------------------------------------

alter table categories add column slug text;
update categories set slug = slugify(name) where slug is null;
alter table categories alter column slug set not null;
alter table categories add constraint categories_slug_key unique (slug);

create or replace function categories_set_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null then
    new.slug := slugify(new.name);
  end if;
  return new;
end;
$$;

create trigger categories_set_slug_trigger
  before insert on categories
  for each row
  execute function categories_set_slug();

-- iphone_models -------------------------------------------------------------

alter table iphone_models add column slug text;
update iphone_models set slug = slugify(name) where slug is null;
alter table iphone_models alter column slug set not null;
alter table iphone_models add constraint iphone_models_slug_key unique (slug);

create or replace function iphone_models_set_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null then
    new.slug := slugify(new.name);
  end if;
  return new;
end;
$$;

create trigger iphone_models_set_slug_trigger
  before insert on iphone_models
  for each row
  execute function iphone_models_set_slug();
