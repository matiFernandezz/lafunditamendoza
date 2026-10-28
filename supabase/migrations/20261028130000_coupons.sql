-- Cupones de descuento para la tienda web. Un cupón es un código (sin importar
-- mayúsculas) con un porcentaje, que vale entre starts_at y expires_at y se
-- aplica al total del carrito al reservar. El descuento queda fijo en la
-- reserva: si se paga después de que el cupón venció, igual se respeta.
-- Al marcar la reserva como pagada, la venta queda con su subtotal, el
-- porcentaje y el monto descontado, igual que un descuento en el mostrador.

create table coupons (
  code text primary key check (code = upper(btrim(code)) and char_length(code) between 3 and 40),
  percent int not null check (percent between 1 and 99),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (expires_at > starts_at)
);

alter table coupons enable row level security;
revoke all on coupons from anon, authenticated;
grant select, insert, update on coupons to service_role;

-- Lanzamiento de la web: HOLALAFUNDITA10, 10% por 48 horas, desde las 20:00 del
-- 28/10/2026 hasta las 20:00 del 30/10/2026 (hora de Argentina, UTC-3).
insert into coupons (code, percent, starts_at, expires_at)
values ('HOLALAFUNDITA10', 10, timestamptz '2026-10-28 20:00:00-03', timestamptz '2026-10-30 20:00:00-03');

-- ---------------------------------------------------------------------------
-- Reservas: subtotal, cupón y descuento. Las que ya había quedan sin descuento.
-- ---------------------------------------------------------------------------
alter table web_orders
  add column subtotal_amount numeric(12, 2),
  add column coupon_code text references coupons (code),
  add column discount_percent int not null default 0 check (discount_percent between 0 and 99),
  add column discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0);

update web_orders set subtotal_amount = total_amount;

alter table web_orders
  alter column subtotal_amount set not null,
  add constraint web_orders_totals_consistency check (total_amount = subtotal_amount - discount_amount),
  add constraint web_orders_discount_consistency check (
    (coupon_code is null and discount_percent = 0 and discount_amount = 0)
    or (coupon_code is not null and discount_percent > 0)
  );

-- ---------------------------------------------------------------------------
-- validate_coupon: el cupón vigente con ese código, o nada. Lo usa la tienda
-- para mostrar el descuento en el carrito y create_web_order para aplicarlo.
-- ---------------------------------------------------------------------------
create function valid_coupon(p_code text)
returns coupons
language sql
stable
set search_path = public
as $$
  select c.*
  from coupons c
  where c.code = upper(btrim(coalesce(p_code, '')))
    and c.active
    and now() >= c.starts_at
    and now() < c.expires_at;
$$;

-- ---------------------------------------------------------------------------
-- create_web_order, ahora con cupón opcional.
-- Errores: WO400 datos inválidos · WO404 variante inexistente o inactiva ·
--          WO409 no alcanza el stock · WO410 el cupón no existe o venció.
-- ---------------------------------------------------------------------------
drop function create_web_order(text, text, jsonb);

create function create_web_order(
  p_customer_name text,
  p_customer_phone text,
  p_items jsonb,
  p_coupon_code text default null
)
returns web_orders
language plpgsql
set search_path = public
as $$
declare
  v_order web_orders;
  v_line record;
  v_subtotal numeric(12, 2) := 0;
  v_coupon coupons;
  v_discount numeric(12, 2) := 0;
begin
  if p_customer_name is null or btrim(p_customer_name) = ''
     or p_customer_phone is null or btrim(p_customer_phone) = '' then
    raise exception 'Faltan el nombre o el WhatsApp' using errcode = 'WO400';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío' using errcode = 'WO400';
  end if;

  if p_coupon_code is not null and btrim(p_coupon_code) <> '' then
    v_coupon := valid_coupon(p_coupon_code);
    if v_coupon.code is null then
      raise exception 'El cupón no existe o ya venció' using errcode = 'WO410';
    end if;
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

    v_subtotal := v_subtotal + v_line.quantity * v_line.price;
  end loop;

  if v_coupon.code is not null then
    v_discount := round(v_subtotal * v_coupon.percent / 100);
  end if;

  insert into web_orders (customer_name, customer_phone, subtotal_amount, total_amount,
                          coupon_code, discount_percent, discount_amount)
  values (btrim(p_customer_name), btrim(p_customer_phone), v_subtotal, v_subtotal - v_discount,
          v_coupon.code, coalesce(v_coupon.percent, 0), v_discount)
  returning * into v_order;

  insert into web_order_items (order_id, variant_id, quantity, unit_price)
  select v_order.id, l.variant_id, l.quantity, pv.price
  from _wo_lines l
  join product_variants pv on pv.id = l.variant_id;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- mark_web_order_paid: la venta lleva el subtotal, el porcentaje y el monto
-- descontados, y el cupón en las notas.
-- ---------------------------------------------------------------------------
create or replace function mark_web_order_paid(p_order_id uuid)
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

  insert into sales (payment_method, channel, notes, subtotal, total_amount, discount_percent, discount_amount, customer_name)
  values ('transferencia', 'web',
          'Venta web ' || v_order.code || ' · ' || v_order.customer_name || ' · ' || v_order.customer_phone
            || coalesce(' · cupón ' || v_order.coupon_code, ''),
          v_order.subtotal_amount, v_order.total_amount, v_order.discount_percent, v_order.discount_amount,
          v_order.customer_name)
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

revoke execute on function valid_coupon(text) from public, anon, authenticated;
revoke execute on function create_web_order(text, text, jsonb, text) from public, anon, authenticated;
grant execute on function valid_coupon(text) to service_role;
grant execute on function create_web_order(text, text, jsonb, text) to service_role;
grant execute on function mark_web_order_paid(uuid) to service_role;
