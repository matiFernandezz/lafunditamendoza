-- Combos sin stock propio. Un combo (p. ej. funda + protector de cargador) se
-- arma con variantes de otros productos: la variante "iPhone 13 · Cereza" del
-- combo = la Cherry Case del iPhone 13 + el protector Cereza. Su stock es el
-- menor de sus partes; vender o reservar un combo descuenta las partes, y
-- vender una parte suelta baja el stock del combo. Si una parte comparte stock
-- (13/14), se mueve también la del otro modelo.
--
-- bundle_specs: cómo se arma el combo, por diseño o color del combo (null =
-- todos): qué producto va y, si ese producto tiene varios, de qué color o
-- diseño. Si el producto de la parte va por modelo, se usa el del mismo modelo.
-- bundle_components: el resultado, variante por variante (component_variant_id
-- null = no hay esa parte, p. ej. la funda no existe para ese modelo: el combo
-- queda en 0).

create table bundle_specs (
  id uuid primary key default gen_random_uuid(),
  bundle_product_id uuid not null references products (id) on delete cascade,
  bundle_color_id uuid references colors (id) on delete cascade,
  bundle_motif_id uuid references motifs (id) on delete cascade,
  component_product_id uuid not null references products (id) on delete cascade,
  component_color_id uuid references colors (id) on delete set null,
  component_motif_id uuid references motifs (id) on delete set null,
  quantity int not null default 1 check (quantity between 1 and 10),
  sort_order int not null default 0,
  check (component_product_id <> bundle_product_id)
);

create index idx_bundle_specs_bundle on bundle_specs (bundle_product_id);
create index idx_bundle_specs_component on bundle_specs (component_product_id);

create table bundle_components (
  id uuid primary key default gen_random_uuid(),
  bundle_variant_id uuid not null references product_variants (id) on delete cascade,
  component_variant_id uuid references product_variants (id) on delete set null,
  quantity int not null default 1 check (quantity between 1 and 10)
);

create index idx_bundle_components_bundle on bundle_components (bundle_variant_id);
create index idx_bundle_components_component on bundle_components (component_variant_id);

alter table bundle_specs enable row level security;
alter table bundle_components enable row level security;
grant select, insert, update, delete on bundle_specs, bundle_components to service_role;

-- ---------------------------------------------------------------------------
-- Que una variante sea parte de un combo no cuenta como historial: si se la
-- elimina, se borra (y el combo queda sin esa parte), no se archiva.
-- ---------------------------------------------------------------------------
create or replace function variant_reference_count(p_variant_id uuid)
returns int
language plpgsql
stable
set search_path = public, extensions
as $$
declare
  v_fk record;
  v_count int;
  v_total int := 0;
begin
  for v_fk in
    select c.conrelid::regclass as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.confrelid = 'public.product_variants'::regclass
      and c.conrelid <> 'public.bundle_components'::regclass
  loop
    execute format('select count(*) from %s where %I = $1', v_fk.tbl, v_fk.col) into v_count using p_variant_id;
    v_total := v_total + v_count;
  end loop;
  return v_total;
end;
$$;

-- ---------------------------------------------------------------------------
-- recompute_bundles: el stock de esas variantes de combo = el menor de sus
-- partes (dividido la cantidad que lleva de cada una). Una parte que falta o
-- está archivada deja el combo en 0. Mientras corre, la sincronización de
-- combos no reacciona (no es una venta del combo).
-- ---------------------------------------------------------------------------
create or replace function recompute_bundles(p_bundle_variant_ids uuid[])
returns void
language plpgsql
set search_path = public, extensions
as $$
begin
  if coalesce(array_length(p_bundle_variant_ids, 1), 0) = 0 then
    return;
  end if;
  perform set_config('lafundita.bundle_recompute', 'on', true);
  update product_variants b
  set stock_quantity = s.stock
  from (
    select bc.bundle_variant_id,
           min(case when c.id is null or not c.active then 0 else c.stock_quantity / bc.quantity end)::int as stock
    from bundle_components bc
    left join product_variants c on c.id = bc.component_variant_id
    where bc.bundle_variant_id = any (p_bundle_variant_ids)
    group by bc.bundle_variant_id
  ) s
  where b.id = s.bundle_variant_id and b.active and b.stock_quantity <> s.stock;
  perform set_config('lafundita.bundle_recompute', 'off', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- map_bundle_variant: arma una variante de combo según bundle_specs (busca la
-- variante de cada parte: mismo modelo si la parte va por modelo, y el color o
-- diseño indicado). No recalcula el stock.
-- ---------------------------------------------------------------------------
create or replace function map_bundle_variant(p_variant_id uuid)
returns void
language plpgsql
set search_path = public, extensions
as $$
declare
  v_variant product_variants;
  v_spec bundle_specs;
  v_component uuid;
begin
  delete from bundle_components where bundle_variant_id = p_variant_id;
  select * into v_variant from product_variants where id = p_variant_id;
  if v_variant.id is null or not v_variant.active then
    return;
  end if;

  for v_spec in
    select * from bundle_specs
    where bundle_product_id = v_variant.product_id
      and (bundle_color_id is null or bundle_color_id = v_variant.color_id)
      and (bundle_motif_id is null or bundle_motif_id = v_variant.motif_id)
    order by sort_order
  loop
    select c.id into v_component
    from product_variants c
    where c.product_id = v_spec.component_product_id and c.active
      and (v_spec.component_color_id is null or c.color_id = v_spec.component_color_id)
      and (v_spec.component_motif_id is null or c.motif_id = v_spec.component_motif_id)
      and case
            when exists (
              select 1 from product_variants x
              where x.product_id = v_spec.component_product_id and x.active and x.iphone_model_id is not null
            ) then c.iphone_model_id is not distinct from v_variant.iphone_model_id
            else c.iphone_model_id is null
          end
    order by c.stock_quantity desc, c.sku
    limit 1;

    insert into bundle_components (bundle_variant_id, component_variant_id, quantity)
    values (p_variant_id, v_component, v_spec.quantity);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Sincronización de combos (trigger por sentencia en product_variants):
--   * cambia el stock de una variante de combo (venta, reserva, anulación):
--     ese cambio se aplica a sus partes;
--   * cambia el stock o el estado de una parte: se recalculan sus combos;
--   * se carga una variante de un combo, o de un producto que es parte de un
--     combo: se arma y se recalcula.
-- ---------------------------------------------------------------------------
create or replace function sync_bundle_stock()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
declare
  v_ids uuid[];
  v_id uuid;
begin
  if coalesce(current_setting('lafundita.bundle_recompute', true), '') = 'on' then
    return null;
  end if;

  if tg_op = 'UPDATE' then
    -- Ventas y reservas del combo: el cambio va a las partes (y de ahí vuelve,
    -- recalculado, al combo). Solo si hay algo que mover: un trigger por
    -- sentencia corre aunque la sentencia no toque filas, y un UPDATE vacío acá
    -- lo volvería a disparar sin fin.
    if coalesce(current_setting('lafundita.skip_stock_sync', true), '') <> 'on'
       and exists (
         select 1
         from new_rows n
         join old_rows o on o.id = n.id
         join bundle_components bc on bc.bundle_variant_id = n.id
         where n.active and o.active and n.stock_quantity <> o.stock_quantity and bc.component_variant_id is not null
       ) then
      update product_variants c
      set stock_quantity = greatest(c.stock_quantity + d.delta, 0)
      from (
        select bc.component_variant_id as id, sum((n.stock_quantity - o.stock_quantity) * bc.quantity)::int as delta
        from new_rows n
        join old_rows o on o.id = n.id
        join bundle_components bc on bc.bundle_variant_id = n.id
        where n.active and o.active and n.stock_quantity <> o.stock_quantity and bc.component_variant_id is not null
        group by bc.component_variant_id
      ) d
      where c.id = d.id and d.delta <> 0;
    end if;

    -- Partes que cambiaron de stock o de estado: sus combos se recalculan.
    select array_agg(distinct bc.bundle_variant_id) into v_ids
    from new_rows n
    join old_rows o on o.id = n.id
    join bundle_components bc on bc.component_variant_id = n.id
    where n.stock_quantity <> o.stock_quantity or n.active <> o.active;
    perform recompute_bundles(v_ids);
  else
    -- Variantes nuevas de un combo, o de un producto que es parte de uno.
    for v_id in
      select pv.id
      from product_variants pv
      where pv.active
        and (pv.product_id in (select n.product_id from new_rows n join bundle_specs s on s.bundle_product_id = n.product_id)
             or pv.product_id in (select s.bundle_product_id from new_rows n join bundle_specs s on s.component_product_id = n.product_id))
    loop
      perform map_bundle_variant(v_id);
      v_ids := v_ids || v_id;
    end loop;
    perform recompute_bundles(v_ids);
  end if;
  return null;
end;
$$;

create trigger product_variants_bundle_stock_update
  after update on product_variants
  referencing old table as old_rows new table as new_rows
  for each statement execute function sync_bundle_stock();

create trigger product_variants_bundle_stock_insert
  after insert on product_variants
  referencing new table as new_rows
  for each statement execute function sync_bundle_stock();

-- ---------------------------------------------------------------------------
-- ensure_bundle_variants: si un diseño del combo lleva una parte por modelo
-- (una funda), el combo necesita una variante por modelo. Se crean las que
-- faltan, una por cada modelo en el que existe esa parte (mismo precio y costo
-- que las del diseño), y la variante universal vieja de ese diseño se elimina
-- (o queda archivada, si ya tenía ventas). Devuelve cuántas creó.
-- ---------------------------------------------------------------------------
create or replace function ensure_bundle_variants(p_product_id uuid)
returns int
language plpgsql
set search_path = public, extensions
as $$
declare
  v_slot record;
  v_spec bundle_specs;
  v_model uuid;
  v_created int := 0;
  v_universal uuid;
begin
  -- Cada diseño (o color) del combo, con el precio y costo que ya tiene.
  for v_slot in
    select distinct on (color_id, motif_id, color) color_id, motif_id, color, price, cost_price
    from product_variants
    where product_id = p_product_id and active
    order by color_id, motif_id, color, (iphone_model_id is null), price desc
  loop
    -- La primera parte por modelo de ese diseño.
    select s.* into v_spec
    from bundle_specs s
    where s.bundle_product_id = p_product_id
      and (s.bundle_color_id is null or s.bundle_color_id = v_slot.color_id)
      and (s.bundle_motif_id is null or s.bundle_motif_id = v_slot.motif_id)
      and exists (
        select 1 from product_variants x
        where x.product_id = s.component_product_id and x.active and x.iphone_model_id is not null
      )
    order by s.sort_order
    limit 1;
    if v_spec.id is null then
      continue;
    end if;

    for v_model in
      select distinct c.iphone_model_id
      from product_variants c
      where c.product_id = v_spec.component_product_id and c.active and c.iphone_model_id is not null
        and (v_spec.component_color_id is null or c.color_id = v_spec.component_color_id)
        and (v_spec.component_motif_id is null or c.motif_id = v_spec.component_motif_id)
        and not exists (
          select 1 from product_variants b
          where b.product_id = p_product_id and b.active and b.iphone_model_id = c.iphone_model_id
            and b.color_id is not distinct from v_slot.color_id and b.motif_id is not distinct from v_slot.motif_id
            and b.color is not distinct from v_slot.color
        )
    loop
      perform insert_shared_variant(p_product_id, v_model, v_slot.color_id, v_slot.motif_id, v_slot.color,
                                    v_slot.price, v_slot.cost_price, 0);
      v_created := v_created + 1;
    end loop;

    -- La universal de ese diseño ya no sirve (la funda va por modelo).
    for v_universal in
      select id from product_variants
      where product_id = p_product_id and active and iphone_model_id is null
        and color_id is not distinct from v_slot.color_id and motif_id is not distinct from v_slot.motif_id
        and color is not distinct from v_slot.color
    loop
      perform delete_variant(v_universal, true);
    end loop;
    v_spec := null;
  end loop;
  return v_created;
end;
$$;

revoke execute on function ensure_bundle_variants(uuid) from public, anon, authenticated;
grant execute on function ensure_bundle_variants(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- set_bundle_specs: guarda cómo se arma un combo (p_specs: lista de
-- { bundle_color_id?, bundle_motif_id?, component_product_id,
-- component_color_id?, component_motif_id?, quantity? }; [] = deja de ser
-- combo), arma sus variantes y recalcula el stock. El combo sale del stock
-- compartido (su stock ya sale de las partes). Devuelve cómo quedó cada variante.
-- ---------------------------------------------------------------------------
create or replace function set_bundle_specs(p_product_id uuid, p_specs jsonb)
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_spec jsonb;
  v_n int := 0;
  v_variant record;
  v_ids uuid[] := '{}';
begin
  perform 1 from products where id = p_product_id and archived_at is null for update;
  if not found then
    raise exception 'No existe un producto con ese id' using errcode = 'CC404';
  end if;
  if jsonb_typeof(p_specs) is distinct from 'array' then
    raise exception 'specs debe ser una lista de partes' using errcode = 'CC400';
  end if;

  delete from bundle_specs where bundle_product_id = p_product_id;
  for v_spec in select * from jsonb_array_elements(p_specs) loop
    if not exists (
      select 1 from products
      where id = (v_spec ->> 'component_product_id')::uuid and archived_at is null and id <> p_product_id
    ) then
      raise exception 'Una de las partes no es un producto válido' using errcode = 'CC400';
    end if;
    v_n := v_n + 1;
    insert into bundle_specs (bundle_product_id, bundle_color_id, bundle_motif_id, component_product_id,
                              component_color_id, component_motif_id, quantity, sort_order)
    values (
      p_product_id,
      nullif(v_spec ->> 'bundle_color_id', '')::uuid,
      nullif(v_spec ->> 'bundle_motif_id', '')::uuid,
      (v_spec ->> 'component_product_id')::uuid,
      nullif(v_spec ->> 'component_color_id', '')::uuid,
      nullif(v_spec ->> 'component_motif_id', '')::uuid,
      coalesce((v_spec ->> 'quantity')::int, 1),
      v_n
    );
  end loop;

  if v_n > 0 then
    -- El stock del combo sale de sus partes: no comparte stock entre modelos.
    delete from product_stock_links where product_id = p_product_id;
    update products set stock_groups_custom = true where id = p_product_id;
    perform ensure_bundle_variants(p_product_id);
  end if;

  for v_variant in select id from product_variants where product_id = p_product_id loop
    perform map_bundle_variant(v_variant.id);
    v_ids := v_ids || v_variant.id;
  end loop;
  perform recompute_bundles(v_ids);

  return bundle_report(p_product_id);
end;
$$;

-- Cómo quedó armada cada variante del combo (para el panel).
create or replace function bundle_report(p_product_id uuid)
returns jsonb
language sql
stable
set search_path = public, extensions
as $$
  select coalesce(jsonb_agg(r.row order by r.model_order, r.label), '[]')
  from (
    select coalesce(m.sort_order, 999) as model_order,
           coalesce(mo.name, co.name, v.color, '') as label,
           jsonb_build_object(
             'id', v.id,
             'sku', v.sku,
             'model', m.name,
             'label', coalesce(mo.name, co.name, v.color),
             'stock', v.stock_quantity,
             'parts', coalesce((
               select jsonb_agg(jsonb_build_object(
                        'product', cp.name,
                        'sku', c.sku,
                        'model', cm.name,
                        'label', coalesce(cmo.name, cco.name, c.color),
                        'stock', c.stock_quantity,
                        'missing', c.id is null or not c.active,
                        'quantity', bc.quantity
                      ) order by bc.id)
               from bundle_components bc
               left join product_variants c on c.id = bc.component_variant_id
               left join products cp on cp.id = c.product_id
               left join iphone_models cm on cm.id = c.iphone_model_id
               left join motifs cmo on cmo.id = c.motif_id
               left join colors cco on cco.id = c.color_id
               where bc.bundle_variant_id = v.id
             ), '[]')
           ) as row
    from product_variants v
    left join iphone_models m on m.id = v.iphone_model_id
    left join motifs mo on mo.id = v.motif_id
    left join colors co on co.id = v.color_id
    where v.product_id = p_product_id and v.active
  ) r;
$$;

-- ---------------------------------------------------------------------------
-- sync_shared_stock (de 20261025130000) con un cambio: en vez de no correr
-- nunca dentro de otro trigger (pg_trigger_depth), se marca a sí misma mientras
-- corre. Así, cuando un combo descuenta una funda que comparte stock (13/14),
-- la del otro modelo también se mueve.
-- ---------------------------------------------------------------------------
create or replace function sync_shared_stock()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
declare
  v_row record;
  v_applied uuid[] := '{}';
begin
  if coalesce(current_setting('lafundita.in_shared_sync', true), '') = 'on'
     or coalesce(current_setting('lafundita.skip_stock_sync', true), '') = 'on' then
    return null;
  end if;
  perform set_config('lafundita.in_shared_sync', 'on', true);

  if tg_op = 'UPDATE' then
    with changed as (
      select n.product_id, l.group_no, n.color_id, n.motif_id, n.color,
             o.stock_quantity as old_q, n.stock_quantity - o.stock_quantity as delta
      from new_rows n
      join old_rows o on o.id = n.id
      join product_stock_links l on l.product_id = n.product_id and l.iphone_model_id = n.iphone_model_id
      where n.active and o.active and n.stock_quantity <> o.stock_quantity
    ), slots as (
      select product_id, group_no, color_id, motif_id, color, greatest(max(old_q) + sum(delta), 0)::int as shared
      from changed
      group by product_id, group_no, color_id, motif_id, color
    )
    update product_variants pv
    set stock_quantity = s.shared
    from slots s
    join product_stock_links l on l.product_id = s.product_id and l.group_no = s.group_no
    where pv.product_id = s.product_id
      and pv.iphone_model_id = l.iphone_model_id
      and pv.active
      and pv.color_id is not distinct from s.color_id
      and pv.motif_id is not distinct from s.motif_id
      and pv.color is not distinct from s.color
      and pv.stock_quantity <> s.shared;
  else
    for v_row in
      select distinct n.product_id from new_rows n
      join stock_share_rule r on r.iphone_model_id = n.iphone_model_id
      where n.active
    loop
      if apply_stock_rule(v_row.product_id) then
        v_applied := v_applied || v_row.product_id;
      end if;
    end loop;

    with added as (
      select n.id, n.product_id, l.group_no, n.color_id, n.motif_id, n.color, n.stock_quantity
      from new_rows n
      join product_stock_links l on l.product_id = n.product_id and l.iphone_model_id = n.iphone_model_id
      where n.active and n.product_id <> all (v_applied)
    ), slots as (
      select a.product_id, a.group_no, a.color_id, a.motif_id, a.color,
             (sum(a.stock_quantity) + coalesce((
               select max(pv.stock_quantity)
               from product_variants pv
               join product_stock_links l2 on l2.product_id = pv.product_id and l2.iphone_model_id = pv.iphone_model_id
               where pv.product_id = a.product_id and l2.group_no = a.group_no and pv.active
                 and pv.color_id is not distinct from a.color_id
                 and pv.motif_id is not distinct from a.motif_id
                 and pv.color is not distinct from a.color
                 and pv.id not in (select id from added)
             ), 0))::int as shared
      from added a
      group by a.product_id, a.group_no, a.color_id, a.motif_id, a.color
    )
    update product_variants pv
    set stock_quantity = s.shared
    from slots s
    join product_stock_links l on l.product_id = s.product_id and l.group_no = s.group_no
    where pv.product_id = s.product_id
      and pv.iphone_model_id = l.iphone_model_id
      and pv.active
      and pv.color_id is not distinct from s.color_id
      and pv.motif_id is not distinct from s.motif_id
      and pv.color is not distinct from s.color
      and pv.stock_quantity <> s.shared;

    for v_row in
      select distinct on (n.product_id, l2.iphone_model_id, n.color_id, n.motif_id, n.color)
             n.product_id, l2.iphone_model_id, n.color_id, n.motif_id, n.color, n.price, n.cost_price,
             (select pv.stock_quantity from product_variants pv where pv.id = n.id) as shared
      from new_rows n
      join product_stock_links l on l.product_id = n.product_id and l.iphone_model_id = n.iphone_model_id
      join product_stock_links l2 on l2.product_id = n.product_id and l2.group_no = l.group_no
      where n.active and n.product_id <> all (v_applied)
        and not exists (
          select 1 from product_variants pv
          where pv.product_id = n.product_id and pv.active and pv.iphone_model_id = l2.iphone_model_id
            and pv.color_id is not distinct from n.color_id and pv.motif_id is not distinct from n.motif_id
            and pv.color is not distinct from n.color
        )
    loop
      perform insert_shared_variant(v_row.product_id, v_row.iphone_model_id, v_row.color_id, v_row.motif_id,
                                    v_row.color, v_row.price, v_row.cost_price, v_row.shared);
    end loop;
  end if;

  perform set_config('lafundita.in_shared_sync', 'off', true);
  return null;
end;
$$;

-- Un combo no entra en la regla de stock compartido (su stock sale de las partes).
create or replace function stock_groups_for_product(p_product_id uuid, p_groups jsonb)
returns jsonb
language sql
stable
set search_path = public, extensions
as $$
  select case
    when exists (select 1 from bundle_specs where bundle_product_id = p_product_id) then '[]'::jsonb
    else (
      select coalesce(jsonb_agg(grp.list order by grp.n), '[]')
      from jsonb_array_elements(p_groups) with ordinality as grp(list, n)
      where exists (
        select 1
        from jsonb_array_elements_text(grp.list) as m(model)
        join product_variants pv on pv.iphone_model_id::text = m.model
        where pv.product_id = p_product_id and pv.active
      )
    )
  end;
$$;

revoke execute on function recompute_bundles(uuid[]) from public, anon, authenticated;
revoke execute on function map_bundle_variant(uuid) from public, anon, authenticated;
revoke execute on function set_bundle_specs(uuid, jsonb) from public, anon, authenticated;
revoke execute on function bundle_report(uuid) from public, anon, authenticated;
grant execute on function recompute_bundles(uuid[]) to service_role;
grant execute on function map_bundle_variant(uuid) to service_role;
grant execute on function set_bundle_specs(uuid, jsonb) to service_role;
grant execute on function bundle_report(uuid) to service_role;
grant execute on function stock_groups_for_product(uuid, jsonb) to service_role;
grant execute on function variant_reference_count(uuid) to service_role;
