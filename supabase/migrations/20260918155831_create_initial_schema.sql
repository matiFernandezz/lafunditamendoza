-- La Fundita: esquema inicial (catálogo, stock, compras y ventas)

create extension if not exists pgcrypto;

-- =========================================================
-- Tablas de catálogo
-- =========================================================

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references categories (id) on delete set null
);

create table iphone_models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0
);

create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories (id),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  iphone_model_id uuid references iphone_models (id) on delete set null,
  color text,
  sku text not null unique,
  price numeric(12, 2) not null,
  cost_price numeric(12, 2) not null default 0,
  stock_quantity int not null default 0 check (stock_quantity >= 0)
);

-- =========================================================
-- Proveedores y compras
-- =========================================================

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_info text
);

create table purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers (id),
  purchase_date date not null default current_date,
  total_amount numeric(12, 2) not null,
  notes text
);

create table purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases (id) on delete cascade,
  variant_id uuid not null references product_variants (id),
  quantity int not null,
  unit_cost numeric(12, 2) not null
);

-- =========================================================
-- Ventas
-- =========================================================

create table sales (
  id uuid primary key default gen_random_uuid(),
  sale_date timestamptz not null default now(),
  payment_method text not null check (payment_method in ('efectivo', 'transferencia')),
  channel text check (channel in ('feria', 'whatsapp', 'web')),
  total_amount numeric(12, 2) not null,
  notes text
);

create table sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales (id) on delete cascade,
  variant_id uuid not null references product_variants (id),
  quantity int not null,
  unit_price numeric(12, 2) not null
);

-- =========================================================
-- Índices en las FK más consultadas
-- =========================================================

create index idx_product_variants_product_id on product_variants (product_id);
create index idx_product_variants_iphone_model_id on product_variants (iphone_model_id);
create index idx_sale_items_sale_id on sale_items (sale_id);
create index idx_sale_items_variant_id on sale_items (variant_id);

-- =========================================================
-- Trigger: compras incrementan stock y actualizan el último costo
-- =========================================================

create function increment_stock_on_purchase_item()
returns trigger
language plpgsql
as $$
begin
  update product_variants
  set stock_quantity = stock_quantity + new.quantity,
      cost_price = new.unit_cost
  where id = new.variant_id;

  if not found then
    raise exception 'product_variants.id % no existe', new.variant_id;
  end if;

  return new;
end;
$$;

create trigger trg_purchase_items_increment_stock
after insert on purchase_items
for each row
execute function increment_stock_on_purchase_item();

-- =========================================================
-- Trigger: ventas decrementan stock y fallan si quedaría negativo
-- =========================================================

create function decrement_stock_on_sale_item()
returns trigger
language plpgsql
as $$
declare
  current_stock int;
begin
  select stock_quantity into current_stock
  from product_variants
  where id = new.variant_id
  for update;

  if not found then
    raise exception 'product_variants.id % no existe', new.variant_id;
  end if;

  if current_stock - new.quantity < 0 then
    raise exception 'Stock insuficiente para variant_id %: stock actual %, cantidad solicitada %',
      new.variant_id, current_stock, new.quantity;
  end if;

  update product_variants
  set stock_quantity = stock_quantity - new.quantity
  where id = new.variant_id;

  return new;
end;
$$;

create trigger trg_sale_items_decrement_stock
after insert on sale_items
for each row
execute function decrement_stock_on_sale_item();
