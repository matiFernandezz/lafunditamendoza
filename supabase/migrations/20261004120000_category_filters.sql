-- Navegación por filtros: el menú queda en Fundas · Accesorios · Nosotros y
-- las subcategorías pasan a ser "tipos" (chips) dentro de cada una.
--
-- Idempotente: se puede correr más de una vez. Todo se busca por slug (o por
-- nombre de producto), no por id, para que valga igual en local y en producción.

-- Orden de los chips (antes las categorías solo se ordenaban por nombre).
alter table categories add column if not exists sort_order int not null default 0;

-- 1. Tipos de funda: nombres cortos. El trigger de slug solo corre al
--    insertar, así que el slug nuevo se fija a mano.
update categories set name = 'Silicona', slug = 'silicona' where slug = 'de-silicona';
update categories set name = 'Diseño', slug = 'diseno' where slug = 'de-diseno';

-- 2. "Cargadores y cables" pasa a ser un tipo de Accesorios (mismo slug).
update categories
set parent_id = (select id from categories where slug = 'accesorios')
where slug = 'cargadores-y-cables'
  and exists (select 1 from categories where slug = 'accesorios');

-- 3. Tipos nuevos de Accesorios (ids fijos, como el resto del seed).
insert into categories (id, name, slug, parent_id)
select v.id::uuid, v.name, v.slug, a.id
from (values
  ('11111111-1111-1111-1111-111111111141', 'Lentes de cámara', 'lentes-de-camara'),
  ('11111111-1111-1111-1111-111111111142', 'Vidrios templados', 'vidrios-templados'),
  ('11111111-1111-1111-1111-111111111143', 'Straps', 'straps'),
  ('11111111-1111-1111-1111-111111111144', 'Soportes', 'soportes'),
  ('11111111-1111-1111-1111-111111111145', 'Auriculares', 'auriculares'),
  ('11111111-1111-1111-1111-111111111146', 'Protectores de cargador', 'protectores-de-cargador')
) as v (id, name, slug)
cross join (select id from categories where slug = 'accesorios') as a
where not exists (select 1 from categories c where c.slug = v.slug or c.id = v.id::uuid);

-- 4. Cada producto a su tipo. Los que no estén en esta lista se quedan donde
--    están (en "Accesorios" a secas): la tienda los sigue mostrando en "Todos".
update products p
set category_id = c.id
from (values
  ('Lentes de cámara con Glitter', 'lentes-de-camara'),
  ('Lentes de cámara metalizados', 'lentes-de-camara'),
  ('Vidrio templado 9D/SD', 'vidrios-templados'),
  ('Vidrio templado Anti Espía', 'vidrios-templados'),
  ('Straps/Correas perlas', 'straps'),
  ('Soporte Ventosa Doble', 'soportes'),
  ('AirPods Pro 2da Generación', 'auriculares'),
  ('Cabezal 20W Apple Certificado', 'cargadores-y-cables'),
  ('Cables Certificados Apple', 'cargadores-y-cables'),
  ('COMBO Funda + Funda Cargador', 'protectores-de-cargador'),
  ('Funda Cargador + Comecable', 'protectores-de-cargador'),
  ('Funda cargador + comecables', 'protectores-de-cargador'),
  ('Funda Cargador STRASS', 'protectores-de-cargador')
) as m (product_name, category_slug)
join categories c on c.slug = m.category_slug
where p.name = m.product_name
  and p.category_id is distinct from c.id;

-- 5. Orden: del menú (Fundas, Accesorios) y de los chips de cada una.
update categories c
set sort_order = o.sort_order
from (values
  ('fundas', 1), ('accesorios', 2),
  ('silicona', 1), ('transparentes', 2), ('diseno', 3),
  ('lentes-de-camara', 1), ('vidrios-templados', 2), ('straps', 3), ('soportes', 4),
  ('auriculares', 5), ('cargadores-y-cables', 6), ('protectores-de-cargador', 7)
) as o (slug, sort_order)
where c.slug = o.slug;
