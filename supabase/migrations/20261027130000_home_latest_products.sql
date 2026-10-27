-- "Últimos ingresos" de la home, elegidos a mano (panel › Tienda › Últimos
-- ingresos) en vez de salir de la fecha de carga: los productos no siempre se
-- cargan en el orden en que entran.
--
-- Al crear un producto, entra primero en la lista y, si pasa de 10, sale el
-- último: así se mantiene sola. El orden y qué productos van se ajustan a mano.

create table home_latest_products (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references products (id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_home_latest_products_order on home_latest_products (sort_order);

-- Arranca con lo que la home mostraba hasta ahora: los 10 activos con stock
-- más nuevos por fecha de carga.
insert into home_latest_products (product_id, sort_order)
select id, (row_number() over (order by created_at desc))::int - 1
from (
  select p.id, p.created_at
  from products p
  where p.active
    and exists (select 1 from product_variants v where v.product_id = p.id and v.active and v.stock_quantity > 0)
  order by p.created_at desc
  limit 10
) as latest;

-- Producto nuevo: primero de la lista; los de más allá del 10 salen.
create function home_latest_add_product() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update home_latest_products set sort_order = sort_order + 1 where true;
  insert into home_latest_products (product_id, sort_order) values (new.id, 0)
  on conflict (product_id) do nothing;
  delete from home_latest_products
  where id in (select id from home_latest_products order by sort_order, created_at desc offset 10);
  return null;
end;
$$;

revoke execute on function home_latest_add_product() from public, anon, authenticated;
grant execute on function home_latest_add_product() to service_role;

create trigger trg_home_latest_new_product
after insert on products
for each row execute function home_latest_add_product();

-- La tienda la lee con la clave pública; el panel escribe con la secreta.
alter table home_latest_products enable row level security;
create policy "tienda publica: ultimos ingresos" on home_latest_products for select to anon using (true);
grant select on home_latest_products to anon;
grant select, insert, update, delete on home_latest_products to service_role;
