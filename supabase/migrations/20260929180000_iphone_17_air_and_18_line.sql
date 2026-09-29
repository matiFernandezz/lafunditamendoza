-- Modelos según el diseño (design/README.md): el Air va dentro de la línea 17
-- como "iPhone 17 Air", y se suma la línea 18 completa (18, 18 Air, 18 Pro,
-- 18 Pro Max). Orden dentro de cada línea: base, Air, Pro, Pro Max.

-- El trigger de slug solo corre al insertar: al renombrar se fija a mano.
update iphone_models
set name = 'iPhone 17 Air', slug = 'iphone-17-air'
where name = 'iPhone Air';

update iphone_models
set sort_order = case name
  when 'iPhone 17' then 19
  when 'iPhone 17 Air' then 20
  when 'iPhone 17 Pro' then 21
  when 'iPhone 17 Pro Max' then 22
end
where name in ('iPhone 17', 'iPhone 17 Air', 'iPhone 17 Pro', 'iPhone 17 Pro Max');

insert into iphone_models (name, sort_order) values
  ('iPhone 18', 23),
  ('iPhone 18 Air', 24),
  ('iPhone 18 Pro', 25),
  ('iPhone 18 Pro Max', 26)
on conflict (name) do update set sort_order = excluded.sort_order;
