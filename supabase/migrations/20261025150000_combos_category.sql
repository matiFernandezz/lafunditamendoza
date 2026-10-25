-- Accesorios › Combos: productos que traen una funda (p. ej. funda + protector
-- de cargador), así que se eligen por modelo de iPhone y por diseño. Hasta
-- ahora el combo estaba en Protectores de cargador, que no pide modelo porque
-- los protectores sirven para cualquier cargador.
insert into categories (name, slug, parent_id, sort_order, variant_kind, by_model)
select 'Combos', 'combos', id, 8, 'motif', true
from categories
where slug = 'accesorios'
on conflict do nothing;

-- El combo pasa a Combos. Sus variantes actuales (sin modelo) quedan; desde su
-- ficha se agregan los modelos y después se eliminan las que no tienen modelo.
update products
set category_id = (select id from categories where slug = 'combos')
where category_id = (select id from categories where slug = 'protectores-de-cargador')
  and name ilike 'combo%';
