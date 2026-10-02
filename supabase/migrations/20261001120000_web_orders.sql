-- Ventas web (design/ui_kits/storefront/CartScreens.jsx + admin/WebVentasScreen.jsx).
--
-- La tienda arma un carrito y, al comprar, crea una RESERVA:
--   · entra "pendiente" y descuenta el stock en el momento (así nadie más
--     compra esas fundas mientras se espera la transferencia);
--   · vence a las 24 h, pero NO se cancela sola: el panel la muestra
--     "vencida" y la cancela una persona (como en el diseño);
--   · "pagada": pasa al historial como venta por transferencia, canal web;
--   · "cancelada": devuelve el stock.
-- Todo el movimiento de stock vive en funciones (una transacción cada una),
-- igual que void_sale.

create sequence web_order_number_seq start 1001;

create table web_orders (
  id uuid primary key default gen_random_uuid(),
  number int not null unique default nextval('web_order_number_seq'),
  code text generated always as ('LF-' || number) stored,
  -- El cliente ve su reserva en /reserva/<token>: no se adivina como el código.
  public_token uuid not null unique default gen_random_uuid(),
  customer_name text not null check (btrim(customer_name) <> ''),
  customer_phone text not null check (btrim(customer_phone) <> ''),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'pagada', 'cancelada')),
  total_amount numeric(12, 2) not null check (total_amount > 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  paid_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  sale_id uuid unique references sales (id),
  constraint web_orders_status_consistency check (
    (status = 'pendiente' and paid_at is null and cancelled_at is null and sale_id is null)
    or (status = 'pagada' and paid_at is not null and cancelled_at is null and sale_id is not null)
    or (status = 'cancelada' and cancelled_at is not null and paid_at is null and sale_id is null)
  )
);

alter sequence web_order_number_seq owned by web_orders.number;

create table web_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references web_orders (id) on delete cascade,
  variant_id uuid not null references product_variants (id),
  quantity int not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price > 0)
);

create index idx_web_orders_status_created on web_orders (status, created_at);
create index idx_web_order_items_order_id on web_order_items (order_id);

-- Nada público: la tienda pasa por el backend (service_role).
alter table web_orders enable row level security;
alter table web_order_items enable row level security;
revoke all on web_orders, web_order_items from anon, authenticated;
grant select, insert, update, delete on web_orders, web_order_items to service_role;
grant usage, select on sequence web_order_number_seq to service_role;

-- ---------------------------------------------------------------------------
-- create_web_order: precios de la base (nunca los del navegador), stock
-- descontado con lock por variante (en orden de id, sin deadlocks).
-- p_items: [{ "variant_id": uuid, "quantity": int }, ...]; repetidos se suman.
-- Errores: WO400 datos inválidos · WO404 variante inexistente o inactiva ·
--          WO409 no alcanza el stock.
-- ---------------------------------------------------------------------------
create function create_web_order(p_customer_name text, p_customer_phone text, p_items jsonb)
returns web_orders
language plpgsql
set search_path = public
as $$
declare
  v_order web_orders;
  v_line record;
  v_total numeric(12, 2) := 0;
begin
  if p_customer_name is null or btrim(p_customer_name) = ''
     or p_customer_phone is null or btrim(p_customer_phone) = '' then
    raise exception 'Faltan el nombre o el WhatsApp' using errcode = 'WO400';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío' using errcode = 'WO400';
  end if;

  drop table if exists _wo_lines;
  create temp table _wo_lines on commit drop as
  select (e ->> 'variant_id')::uuid as variant_id, sum((e ->> 'quantity')::int) as quantity
  from jsonb_array_elements(p_items) as e
  group by 1;

  if exists (select 1 from _wo_lines where quantity is null or quantity <= 0) then
    raise exception 'Cantidad inválida' using errcode = 'WO400';
  end if;

  for v_line in
    select l.variant_id, l.quantity, pv.sku, pv.price, pv.stock_quantity,
           pv.active and p.active as available
    from _wo_lines l
    left join product_variants pv on pv.id = l.variant_id
    left join products p on p.id = pv.product_id
    order by l.variant_id
  loop
    if v_line.sku is null or not v_line.available then
      raise exception 'Uno de los productos ya no está disponible' using errcode = 'WO404';
    end if;

    perform 1 from product_variants where id = v_line.variant_id for update;

    update product_variants
    set stock_quantity = stock_quantity - v_line.quantity
    where id = v_line.variant_id and stock_quantity >= v_line.quantity;

    if not found then
      raise exception 'No alcanza el stock de % (quedan %)', v_line.sku,
        (select stock_quantity from product_variants where id = v_line.variant_id)
        using errcode = 'WO409';
    end if;

    v_total := v_total + v_line.quantity * v_line.price;
  end loop;

  insert into web_orders (customer_name, customer_phone, total_amount)
  values (btrim(p_customer_name), btrim(p_customer_phone), v_total)
  returning * into v_order;

  insert into web_order_items (order_id, variant_id, quantity, unit_price)
  select v_order.id, l.variant_id, l.quantity, pv.price
  from _wo_lines l
  join product_variants pv on pv.id = l.variant_id;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- mark_web_order_paid: la reserva pasa al historial como venta por
-- transferencia, canal web. El stock ya estaba descontado desde la reserva y
-- el trigger de sale_items lo vuelve a descontar: por eso se devuelve antes,
-- dentro de la misma transacción (el neto es cero).
-- Errores: WO404 no existe · WO409 ya no está pendiente.
-- ---------------------------------------------------------------------------
create function mark_web_order_paid(p_order_id uuid)
returns web_orders
language plpgsql
set search_path = public
as $$
declare
  v_order web_orders;
  v_sale_id uuid;
begin
  select * into v_order from web_orders where id = p_order_id for update;

  if not found then
    raise exception 'No existe la reserva %', p_order_id using errcode = 'WO404';
  end if;

  if v_order.status <> 'pendiente' then
    raise exception 'La reserva % ya está %', v_order.code, v_order.status using errcode = 'WO409';
  end if;

  insert into sales (payment_method, channel, notes, subtotal, total_amount, discount_percent, discount_amount)
  values ('transferencia', 'web',
          'Venta web ' || v_order.code || ' · ' || v_order.customer_name || ' · ' || v_order.customer_phone,
          v_order.total_amount, v_order.total_amount, 0, 0)
  returning id into v_sale_id;

  update product_variants pv
  set stock_quantity = pv.stock_quantity + i.quantity
  from (
    select variant_id, sum(quantity) as quantity
    from web_order_items where order_id = p_order_id group by variant_id
  ) as i
  where pv.id = i.variant_id;

  insert into sale_items (sale_id, variant_id, quantity, unit_price)
  select v_sale_id, variant_id, quantity, unit_price
  from web_order_items where order_id = p_order_id;

  update web_orders
  set status = 'pagada', paid_at = now(), sale_id = v_sale_id
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_web_order: devuelve el stock reservado. Motivo opcional.
-- Errores: WO404 no existe · WO409 ya no está pendiente.
-- ---------------------------------------------------------------------------
create function cancel_web_order(p_order_id uuid, p_reason text)
returns web_orders
language plpgsql
set search_path = public
as $$
declare
  v_order web_orders;
begin
  select * into v_order from web_orders where id = p_order_id for update;

  if not found then
    raise exception 'No existe la reserva %', p_order_id using errcode = 'WO404';
  end if;

  if v_order.status <> 'pendiente' then
    raise exception 'La reserva % ya está %', v_order.code, v_order.status using errcode = 'WO409';
  end if;

  update product_variants pv
  set stock_quantity = pv.stock_quantity + i.quantity
  from (
    select variant_id, sum(quantity) as quantity
    from web_order_items where order_id = p_order_id group by variant_id
  ) as i
  where pv.id = i.variant_id;

  update web_orders
  set status = 'cancelada', cancelled_at = now(), cancel_reason = nullif(btrim(coalesce(p_reason, '')), '')
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

revoke execute on function create_web_order(text, text, jsonb) from public, anon, authenticated;
revoke execute on function mark_web_order_paid(uuid) from public, anon, authenticated;
revoke execute on function cancel_web_order(uuid, text) from public, anon, authenticated;
grant execute on function create_web_order(text, text, jsonb) to service_role;
grant execute on function mark_web_order_paid(uuid) to service_role;
grant execute on function cancel_web_order(uuid, text) to service_role;
