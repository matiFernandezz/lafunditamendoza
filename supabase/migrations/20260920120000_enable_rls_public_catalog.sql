-- La Fundita: RLS + acceso público de solo lectura al catálogo (rol anon)
--
-- Sin RLS, la anon key (pública por diseño) podía leer y escribir todas las tablas,
-- incluidas compras, ventas y cost_price. El backend usa service_role, que ignora RLS.

alter table categories       enable row level security;
alter table iphone_models    enable row level security;
alter table products         enable row level security;
alter table product_variants enable row level security;
alter table suppliers        enable row level security;
alter table purchases        enable row level security;
alter table purchase_items   enable row level security;
alter table sales            enable row level security;
alter table sale_items       enable row level security;

-- Sin policies en suppliers/purchases/purchase_items/sales/sale_items: anon y authenticated no ven nada.

-- TODO: agregar rol 'authenticated' a estas policies cuando se
-- implemente login del panel de administración, para que un usuario
-- logueado también pueda ver el catálogo.
create policy "catalogo publico: categorias" on categories
  for select to anon using (true);

create policy "catalogo publico: modelos" on iphone_models
  for select to anon using (true);

create policy "catalogo publico: productos activos" on products
  for select to anon using (active);

create policy "catalogo publico: variantes activas" on product_variants
  for select to anon using (active);

-- anon solo puede leer (nunca escribir) y sin cost_price.
revoke all on categories, iphone_models, products, product_variants,
              suppliers, purchases, purchase_items, sales, sale_items
  from anon;

grant select on categories, iphone_models, products to anon;
grant select (id, product_id, iphone_model_id, color, sku, price, stock_quantity, active)
  on product_variants to anon;
