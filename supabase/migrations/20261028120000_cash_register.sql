-- Caja: el libro de todas las entradas y salidas de plata, en dos cuentas
-- (efectivo y banco). El saldo es la suma de los movimientos vigentes.
--
-- Movimientos manuales (los carga el panel › Caja):
--   aporte         ingreso   plata que ponen los socios (el saldo inicial es uno)
--   retiro         egreso    plata que sacan los socios
--   gasto          egreso    obra social, comidas, packaging, publicidad…
--   transferencia  par       mueve plata de una cuenta a la otra (no cambia el total)
--   ajuste         ingreso o egreso, para cuadrar la caja después de contar
-- Movimientos automáticos (no se editan: se corrigen en su origen):
--   venta          ingreso   una venta cobrada; si la venta se anula, se anula sola
--   compra         egreso    un pedido a proveedor, desde que se marca como pagado
--
-- Nada se borra: un movimiento se anula con un motivo y deja de sumar.
-- La caja arranca vacía: solo registra lo que pase de acá en adelante.

create table cash_movements (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  kind text not null
    check (kind in ('aporte', 'retiro', 'gasto', 'transferencia', 'venta', 'compra', 'ajuste')),
  direction text not null check (direction in ('ingreso', 'egreso')),
  account text not null check (account in ('efectivo', 'banco')),
  amount numeric(12, 2) not null check (amount > 0),
  category text check (category is null or (btrim(category) <> '' and char_length(category) <= 60)),
  description text not null default '' check (char_length(description) <= 300),
  sale_id uuid unique references sales (id) on delete cascade,
  purchase_id uuid unique references purchases (id) on delete set null,
  transfer_group uuid,
  voided_at timestamptz,
  void_reason text check (void_reason is null or char_length(void_reason) <= 300),
  created_at timestamptz not null default now(),
  constraint cash_direction_matches_kind check (
    (kind in ('aporte', 'venta') and direction = 'ingreso')
    or (kind in ('retiro', 'gasto', 'compra') and direction = 'egreso')
    or kind in ('transferencia', 'ajuste')
  ),
  constraint cash_sale_link check (kind <> 'venta' or sale_id is not null),
  constraint cash_transfer_link check ((kind = 'transferencia') = (transfer_group is not null)),
  constraint cash_void_consistency check ((voided_at is null) = (void_reason is null))
);

create index idx_cash_movements_occurred on cash_movements (occurred_at desc);
create index idx_cash_movements_transfer on cash_movements (transfer_group) where transfer_group is not null;

alter table cash_movements enable row level security;
-- Sin policies: anon y authenticated no ven nada. Solo el panel (service_role).
grant select, insert, update on cash_movements to service_role;

-- ---------------------------------------------------------------------------
-- Ventas → ingreso (en efectivo, o en banco si fue transferencia)
-- ---------------------------------------------------------------------------
create function cash_on_sale_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completada' and new.total_amount > 0 then
    insert into cash_movements (occurred_at, kind, direction, account, amount, category, description, sale_id)
    values (
      new.sale_date, 'venta', 'ingreso',
      case new.payment_method when 'efectivo' then 'efectivo' else 'banco' end,
      new.total_amount, 'Ventas',
      'Venta' || coalesce(' a ' || nullif(btrim(new.customer_name), ''), ''),
      new.id
    );
  end if;
  return new;
end;
$$;

create function cash_on_sale_void()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'anulada' and old.status is distinct from new.status then
    update cash_movements
    set voided_at = now(), void_reason = 'Venta anulada'
    where sale_id = new.id and voided_at is null;
  end if;
  return new;
end;
$$;

create trigger trg_sales_cash_insert after insert on sales
  for each row execute function cash_on_sale_insert();
create trigger trg_sales_cash_void after update of status on sales
  for each row execute function cash_on_sale_void();

-- ---------------------------------------------------------------------------
-- Pedidos a proveedores → egreso desde que se marcan como pagados
-- (mercadería + envío). La cuenta es efectivo si al proveedor se le paga en
-- efectivo y banco si no; se puede cambiar desde la caja.
-- Si el pedido vuelve a "armando" o se elimina, el egreso se anula.
-- Los pedidos que ya estaban pagados antes de la caja no se tocan.
-- ---------------------------------------------------------------------------
create function cash_sync_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric(12, 2);
  v_account text;
begin
  if tg_op = 'UPDATE'
     and old.paid_at is not distinct from new.paid_at
     and old.total_amount is not distinct from new.total_amount
     and old.shipping_cost is not distinct from new.shipping_cost then
    return new;
  end if;

  if new.paid_at is null then
    update cash_movements
    set voided_at = now(), void_reason = 'El pedido volvió a "armando"'
    where purchase_id = new.id and voided_at is null;
    return new;
  end if;

  v_amount := new.total_amount + new.shipping_cost;
  if v_amount <= 0 then
    return new;
  end if;

  select case when coalesce(s.payment_method, '') ilike '%efectivo%' then 'efectivo' else 'banco' end
  into v_account
  from suppliers s
  where s.id = new.supplier_id;

  insert into cash_movements (occurred_at, kind, direction, account, amount, category, description, purchase_id)
  values (new.paid_at, 'compra', 'egreso', coalesce(v_account, 'banco'), v_amount, 'Mercadería',
          'Pedido #' || new.number, new.id)
  on conflict (purchase_id) do update
    set amount = excluded.amount,
        occurred_at = excluded.occurred_at,
        voided_at = null,
        void_reason = null;
  return new;
end;
$$;

create function cash_on_purchase_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update cash_movements
  set voided_at = now(), void_reason = 'Pedido eliminado'
  where purchase_id = old.id and voided_at is null;
  return old;
end;
$$;

create trigger trg_purchases_cash_sync after insert or update on purchases
  for each row execute function cash_sync_purchase();
create trigger trg_purchases_cash_delete before delete on purchases
  for each row execute function cash_on_purchase_delete();

-- ---------------------------------------------------------------------------
-- create_cash_movement: un movimiento manual (o los dos de una transferencia).
-- Errores: CM400 datos inválidos.
-- ---------------------------------------------------------------------------
create function create_cash_movement(
  p_kind text,
  p_direction text,
  p_account text,
  p_to_account text,
  p_amount numeric,
  p_category text,
  p_description text,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_direction text;
  v_category text;
  v_description text := btrim(coalesce(p_description, ''));
  v_when timestamptz := coalesce(p_occurred_at, now());
  v_group uuid;
  v_out cash_movements;
  v_in cash_movements;
begin
  if p_kind is null or p_kind not in ('aporte', 'retiro', 'gasto', 'transferencia', 'ajuste') then
    raise exception 'El tipo de movimiento no es válido' using errcode = 'CM400';
  end if;
  if p_account is null or p_account not in ('efectivo', 'banco') then
    raise exception 'La cuenta tiene que ser efectivo o banco' using errcode = 'CM400';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) or p_amount >= 10000000000 then
    raise exception 'El monto tiene que ser mayor a 0, con hasta 2 decimales' using errcode = 'CM400';
  end if;
  if v_description = '' or char_length(v_description) > 300 then
    raise exception 'La descripción es obligatoria (hasta 300 caracteres)' using errcode = 'CM400';
  end if;
  if p_category is not null and char_length(btrim(p_category)) > 60 then
    raise exception 'La categoría va hasta 60 caracteres' using errcode = 'CM400';
  end if;

  if p_kind = 'transferencia' then
    if p_to_account is null or p_to_account not in ('efectivo', 'banco') or p_to_account = p_account then
      raise exception 'Una transferencia va de una cuenta a la otra' using errcode = 'CM400';
    end if;
    v_group := gen_random_uuid();
    insert into cash_movements (occurred_at, kind, direction, account, amount, category, description, transfer_group)
    values (v_when, 'transferencia', 'egreso', p_account, p_amount, 'Transferencia entre cuentas', v_description, v_group)
    returning * into v_out;
    insert into cash_movements (occurred_at, kind, direction, account, amount, category, description, transfer_group)
    values (v_when, 'transferencia', 'ingreso', p_to_account, p_amount, 'Transferencia entre cuentas', v_description, v_group)
    returning * into v_in;
    return jsonb_build_array(to_jsonb(v_out), to_jsonb(v_in));
  end if;

  v_direction := case p_kind
    when 'aporte' then 'ingreso'
    when 'retiro' then 'egreso'
    when 'gasto' then 'egreso'
    else p_direction
  end;
  if v_direction is null or v_direction not in ('ingreso', 'egreso') then
    raise exception 'Un ajuste tiene que ser un ingreso o un egreso' using errcode = 'CM400';
  end if;

  v_category := coalesce(nullif(btrim(p_category), ''), case p_kind
    when 'aporte' then 'Aportes'
    when 'retiro' then 'Retiros'
    when 'gasto' then 'Otros'
    else 'Ajuste de caja'
  end);

  insert into cash_movements (occurred_at, kind, direction, account, amount, category, description)
  values (v_when, p_kind, v_direction, p_account, p_amount, v_category, v_description)
  returning * into v_out;
  return jsonb_build_array(to_jsonb(v_out));
end;
$$;

-- ---------------------------------------------------------------------------
-- void_cash_movement: anula un movimiento manual (una transferencia, los dos
-- lados). Las ventas y compras se corrigen en su origen.
-- Errores: CM400 falta el motivo · CM404 no existe · CM409 ya anulado ·
--          CM422 es automático.
-- ---------------------------------------------------------------------------
create function void_cash_movement(p_id uuid, p_reason text)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_row cash_movements;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_reason = '' or char_length(v_reason) > 300 then
    raise exception 'El motivo es obligatorio (hasta 300 caracteres)' using errcode = 'CM400';
  end if;

  select * into v_row from cash_movements where id = p_id for update;
  if not found then
    raise exception 'Ese movimiento no existe' using errcode = 'CM404';
  end if;
  if v_row.voided_at is not null then
    raise exception 'Ese movimiento ya estaba anulado' using errcode = 'CM409';
  end if;
  if v_row.kind in ('venta', 'compra') then
    raise exception 'Este movimiento viene de una venta o un pedido: se corrige ahí' using errcode = 'CM422';
  end if;

  update cash_movements
  set voided_at = now(), void_reason = v_reason
  where voided_at is null
    and (id = p_id or (transfer_group is not null and transfer_group = v_row.transfer_group));
end;
$$;

-- ---------------------------------------------------------------------------
-- set_cash_movement_account: cambia la cuenta de un pedido pagado (la caja
-- supone efectivo o banco según el proveedor; acá se corrige).
-- Errores: CM400 cuenta inválida · CM404 no existe · CM422 no es un pedido o está anulado.
-- ---------------------------------------------------------------------------
create function set_cash_movement_account(p_id uuid, p_account text)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_row cash_movements;
begin
  if p_account is null or p_account not in ('efectivo', 'banco') then
    raise exception 'La cuenta tiene que ser efectivo o banco' using errcode = 'CM400';
  end if;

  select * into v_row from cash_movements where id = p_id for update;
  if not found then
    raise exception 'Ese movimiento no existe' using errcode = 'CM404';
  end if;
  if v_row.kind <> 'compra' or v_row.voided_at is not null then
    raise exception 'Solo se puede cambiar la cuenta de un pedido pagado' using errcode = 'CM422';
  end if;

  update cash_movements set account = p_account where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- cash_summary: saldos actuales por cuenta y, del período [from, to), los
-- totales por tipo, los egresos por categoría y la serie por día.
-- Las transferencias entre cuentas no cuentan como entrada ni salida.
-- ---------------------------------------------------------------------------
create function cash_summary(p_from timestamptz, p_to timestamptz)
returns json
language sql
stable
set search_path = public
as $$
  with live as (
    select * from cash_movements where voided_at is null
  ), period as (
    select * from live where occurred_at >= p_from and occurred_at < p_to and kind <> 'transferencia'
  )
  select json_build_object(
    'balance', json_build_object(
      'efectivo', coalesce((select sum(case direction when 'ingreso' then amount else -amount end)
                            from live where account = 'efectivo'), 0),
      'banco', coalesce((select sum(case direction when 'ingreso' then amount else -amount end)
                         from live where account = 'banco'), 0)
    ),
    'by_kind', coalesce((
      select json_agg(json_build_object('kind', kind, 'direction', direction, 'total', total) order by kind, direction)
      from (select kind, direction, sum(amount) as total from period group by kind, direction) k
    ), '[]'::json),
    'by_category', coalesce((
      select json_agg(json_build_object('category', category, 'total', total) order by total desc)
      from (
        select coalesce(category, 'Sin categoría') as category, sum(amount) as total
        from period where direction = 'egreso' and kind <> 'ajuste'
        group by 1
      ) c
    ), '[]'::json),
    'series', coalesce((
      select json_agg(json_build_object('day', day, 'ingresos', ingresos, 'egresos', egresos) order by day)
      from (
        select (occurred_at at time zone 'America/Argentina/Mendoza')::date as day,
               coalesce(sum(amount) filter (where direction = 'ingreso'), 0) as ingresos,
               coalesce(sum(amount) filter (where direction = 'egreso'), 0) as egresos
        from period where kind <> 'ajuste'
        group by 1
      ) s
    ), '[]'::json)
  );
$$;

revoke execute on function create_cash_movement(text, text, text, text, numeric, text, text, timestamptz)
  from public, anon, authenticated;
revoke execute on function void_cash_movement(uuid, text) from public, anon, authenticated;
revoke execute on function set_cash_movement_account(uuid, text) from public, anon, authenticated;
revoke execute on function cash_summary(timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function cash_on_sale_insert() from public, anon, authenticated;
revoke execute on function cash_on_sale_void() from public, anon, authenticated;
revoke execute on function cash_sync_purchase() from public, anon, authenticated;
revoke execute on function cash_on_purchase_delete() from public, anon, authenticated;

grant execute on function create_cash_movement(text, text, text, text, numeric, text, text, timestamptz) to service_role;
grant execute on function void_cash_movement(uuid, text) to service_role;
grant execute on function set_cash_movement_account(uuid, text) to service_role;
grant execute on function cash_summary(timestamptz, timestamptz) to service_role;
grant execute on function cash_on_sale_insert() to service_role;
grant execute on function cash_on_sale_void() to service_role;
grant execute on function cash_sync_purchase() to service_role;
grant execute on function cash_on_purchase_delete() to service_role;
