-- Stock compartido entre modelos de un mismo producto. En la vida real algunas
-- fundas le van a más de un iPhone (13 y 14; toda la línea 18): son las mismas
-- unidades. Sin unir los modelos, en cada producto se arman grupos de modelos
-- que comparten stock; dentro de un grupo, las variantes del mismo color o
-- diseño tienen siempre el mismo número. Vender, reservar, anular o comprar
-- una mueve a todas.
--
-- product_stock_links: un modelo de un producto pertenece a lo sumo a un grupo
-- (group_no). Mismo group_no = comparten.

create table product_stock_links (
  product_id uuid not null references products (id) on delete cascade,
  iphone_model_id uuid not null references iphone_models (id) on delete cascade,
  group_no int not null check (group_no >= 1),
  primary key (product_id, iphone_model_id)
);

alter table product_stock_links enable row level security;
grant select, insert, update, delete on product_stock_links to service_role;

-- ---------------------------------------------------------------------------
-- insert_shared_variant: crea la variante de un modelo del grupo al que le
-- falta un color/diseño que sí tienen los otros (mismo precio y costo, el stock
-- compartido). Si existía archivada, la reactiva. El SKU sale de suggest_sku.
-- ---------------------------------------------------------------------------
create or replace function insert_shared_variant(
  p_product_id uuid, p_model_id uuid, p_color_id uuid, p_motif_id uuid, p_color text,
  p_price numeric, p_cost numeric, p_stock int
)
returns void
language plpgsql
set search_path = public, extensions
as $$
declare
  v_base text;
  v_sku text;
  v_n int := 2;
begin
  update product_variants pv
  set active = true, stock_quantity = p_stock, price = p_price, cost_price = p_cost
  where pv.id = (
    select id from product_variants
    where product_id = p_product_id and not active and iphone_model_id = p_model_id
      and color_id is not distinct from p_color_id and motif_id is not distinct from p_motif_id
      and color is not distinct from p_color
    limit 1
  );
  if found then
    return;
  end if;

  select coalesce(nullif(suggest_sku(p.name, m.name, coalesce(p_color, mo.name, '')), ''), 'SKU')
  into v_base
  from products p
  join iphone_models m on m.id = p_model_id
  left join motifs mo on mo.id = p_motif_id
  where p.id = p_product_id;

  v_sku := v_base;
  while exists (select 1 from product_variants where sku = v_sku) loop
    v_sku := v_base || '-' || v_n;
    v_n := v_n + 1;
  end loop;

  insert into product_variants (product_id, iphone_model_id, color_id, motif_id, color, sku, price, cost_price, stock_quantity, active)
  values (p_product_id, p_model_id, p_color_id, p_motif_id, p_color, v_sku, p_price, p_cost, p_stock, true);
end;
$$;

revoke execute on function insert_shared_variant(uuid, uuid, uuid, uuid, text, numeric, numeric, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Sincronización. Es un trigger por sentencia (con las filas viejas y nuevas)
-- para que funcione igual cuando una sola sentencia toca varias variantes
-- (p. ej. una compra con el 13 y el 14): por cada color/diseño de cada grupo,
-- el stock compartido = el que tenían + la suma de lo que cambió cada una. Al
-- agregar una variante a un grupo, sus unidades se suman a las del grupo y,
-- si es un color nuevo, se crea también en los otros modelos del grupo.
-- lafundita.skip_stock_sync lo apaga mientras se arman los grupos.
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
  if pg_trigger_depth() > 1 or coalesce(current_setting('lafundita.skip_stock_sync', true), '') = 'on' then
    return null;
  end if;

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
    -- Primero la regla general: a un producto nuevo (o con un modelo nuevo) se
    -- le arman sus grupos, y eso ya iguala el stock y crea lo que falte; esos
    -- productos no siguen por la suma de abajo.
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

    -- Color/diseño nuevo en un modelo del grupo: se crea en los otros modelos.
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
  return null;
end;
$$;

create trigger product_variants_shared_stock_update
  after update on product_variants
  referencing old table as old_rows new table as new_rows
  for each statement execute function sync_shared_stock();

create trigger product_variants_shared_stock_insert
  after insert on product_variants
  referencing new table as new_rows
  for each statement execute function sync_shared_stock();

-- ---------------------------------------------------------------------------
-- set_product_stock_groups: reemplaza los grupos de un producto. p_groups es
-- una lista de listas de ids de modelo ([[13, 14], [18, 18 Pro, …]]), cada
-- una de 2 o más modelos, sin repetir entre grupos; al menos uno de cada grupo
-- tiene que tener variantes en el producto.
-- Al armar un grupo, cada color/diseño queda con el stock más alto de sus
-- variantes (es el que se cargó). Si a algún modelo del grupo le falta un
-- color que tienen los otros, se le crea (mismo precio y costo, el stock
-- compartido).
-- Devuelve qué variantes cambian y cuáles se crean; con p_dry_run solo lo informa.
-- ---------------------------------------------------------------------------
create or replace function set_product_stock_groups(p_product_id uuid, p_groups jsonb, p_dry_run boolean default false)
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_product products;
  v_group jsonb;
  v_no int := 0;
  v_model text;
  v_seen uuid[] := '{}';
  v_changes jsonb;
  v_created jsonb;
  v_new record;
begin
  select * into v_product from products where id = p_product_id and archived_at is null for update;
  if not found then
    raise exception 'No existe un producto con ese id' using errcode = 'CC404';
  end if;
  if jsonb_typeof(p_groups) is distinct from 'array' then
    raise exception 'groups debe ser una lista de grupos de modelos' using errcode = 'CC400';
  end if;

  drop table if exists _links;
  create temp table _links (iphone_model_id uuid primary key, group_no int not null) on commit drop;

  for v_group in select * from jsonb_array_elements(p_groups) loop
    if jsonb_typeof(v_group) is distinct from 'array' or jsonb_array_length(v_group) < 2 then
      raise exception 'Cada grupo necesita al menos 2 modelos' using errcode = 'CC400';
    end if;
    v_no := v_no + 1;
    for v_model in select * from jsonb_array_elements_text(v_group) loop
      if v_model !~* '^[0-9a-f-]{36}$' or not exists (select 1 from iphone_models where id = v_model::uuid) then
        raise exception 'Modelo inválido' using errcode = 'CC400';
      end if;
      if v_model::uuid = any (v_seen) then
        raise exception 'Un modelo no puede estar en dos grupos' using errcode = 'CC400';
      end if;
      v_seen := v_seen || v_model::uuid;
      insert into _links values (v_model::uuid, v_no);
    end loop;
    if not exists (
      select 1 from product_variants pv join _links l on l.iphone_model_id = pv.iphone_model_id
      where pv.product_id = p_product_id and pv.active and l.group_no = v_no
    ) then
      raise exception 'Ninguno de los modelos de un grupo tiene variantes cargadas en este producto' using errcode = 'CC400';
    end if;
  end loop;

  -- Cada color/diseño de cada grupo, con su stock compartido (el más alto) y la
  -- variante que sirve de molde para crear las que faltan (precio y costo).
  drop table if exists _slots;
  create temp table _slots on commit drop as
  select distinct on (l.group_no, pv.color_id, pv.motif_id, pv.color)
         l.group_no, pv.color_id, pv.motif_id, pv.color, pv.price, pv.cost_price,
         max(pv.stock_quantity) over (partition by l.group_no, pv.color_id, pv.motif_id, pv.color) as shared
  from product_variants pv
  join _links l on l.iphone_model_id = pv.iphone_model_id
  where pv.product_id = p_product_id and pv.active
  order by l.group_no, pv.color_id, pv.motif_id, pv.color, pv.stock_quantity desc;

  -- Variantes existentes que cambian de stock.
  select coalesce(jsonb_agg(jsonb_build_object('id', pv.id, 'sku', pv.sku, 'from', pv.stock_quantity, 'to', s.shared) order by pv.sku), '[]')
  into v_changes
  from product_variants pv
  join _links l on l.iphone_model_id = pv.iphone_model_id
  join _slots s on s.group_no = l.group_no
    and s.color_id is not distinct from pv.color_id and s.motif_id is not distinct from pv.motif_id
    and s.color is not distinct from pv.color
  where pv.product_id = p_product_id and pv.active and pv.stock_quantity <> s.shared;

  -- Variantes que faltan: modelos del grupo sin ese color/diseño.
  drop table if exists _missing;
  create temp table _missing on commit drop as
  select s.*, l.iphone_model_id, m.name as model_name, m.sort_order,
         coalesce(s.color, mo.name, '') as label
  from _slots s
  join _links l on l.group_no = s.group_no
  join iphone_models m on m.id = l.iphone_model_id
  left join motifs mo on mo.id = s.motif_id
  where not exists (
    select 1 from product_variants pv
    where pv.product_id = p_product_id and pv.active and pv.iphone_model_id = l.iphone_model_id
      and pv.color_id is not distinct from s.color_id and pv.motif_id is not distinct from s.motif_id
      and pv.color is not distinct from s.color
  );

  select coalesce(jsonb_agg(jsonb_build_object('model', model_name, 'label', label, 'stock', shared) order by sort_order, label), '[]')
  into v_created
  from _missing;

  if not coalesce(p_dry_run, false) then
    delete from product_stock_links where product_id = p_product_id;
    insert into product_stock_links (product_id, iphone_model_id, group_no)
    select p_product_id, iphone_model_id, group_no from _links;

    perform set_config('lafundita.skip_stock_sync', 'on', true);

    update product_variants pv
    set stock_quantity = (c ->> 'to')::int
    from jsonb_array_elements(v_changes) c
    where pv.id = (c ->> 'id')::uuid;

    for v_new in select * from _missing loop
      perform insert_shared_variant(p_product_id, v_new.iphone_model_id, v_new.color_id, v_new.motif_id,
                                    v_new.color, v_new.price, v_new.cost_price, v_new.shared);
    end loop;

    perform set_config('lafundita.skip_stock_sync', 'off', true);
  end if;

  return jsonb_build_object('groups', v_no, 'changes', v_changes, 'created', v_created, 'dry_run', coalesce(p_dry_run, false));
end;
$$;

revoke execute on function set_product_stock_groups(uuid, jsonb, boolean) from public, anon, authenticated;
grant execute on function set_product_stock_groups(uuid, jsonb, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- Regla general (Stock › Stock compartido): qué modelos comparten stock en
-- todos los productos. Queda guardada y se aplica sola: a los productos que
-- ya existen al guardarla, y a los productos o modelos que se carguen después.
-- Un producto configurado a mano en su ficha (stock_groups_custom) es una
-- excepción: la regla no lo toca hasta que se lo vuelva a la regla.
-- ---------------------------------------------------------------------------
create table stock_share_rule (
  iphone_model_id uuid primary key references iphone_models (id) on delete cascade,
  group_no int not null check (group_no >= 1)
);

alter table stock_share_rule enable row level security;
grant select, insert, update, delete on stock_share_rule to service_role;

alter table products add column stock_groups_custom boolean not null default false;

-- La regla como lista de grupos ([[13, 14], [18, …]]), en el orden de los modelos.
create or replace function stock_rule_groups()
returns jsonb
language sql
stable
set search_path = public, extensions
as $$
  select coalesce(jsonb_agg(g.models order by g.group_no), '[]')
  from (
    select r.group_no, jsonb_agg(r.iphone_model_id order by m.sort_order) as models
    from stock_share_rule r
    join iphone_models m on m.id = r.iphone_model_id
    group by r.group_no
  ) g;
$$;

-- Los grupos de la regla que corresponden a un producto: los que tienen al
-- menos un modelo cargado en él (el grupo entero: si le falta un modelo, al
-- aplicarlo se le crean esas variantes).
create or replace function stock_groups_for_product(p_product_id uuid, p_groups jsonb)
returns jsonb
language sql
stable
set search_path = public, extensions
as $$
  select coalesce(jsonb_agg(grp.list order by grp.n), '[]')
  from jsonb_array_elements(p_groups) with ordinality as grp(list, n)
  where exists (
    select 1
    from jsonb_array_elements_text(grp.list) as m(model)
    join product_variants pv on pv.iphone_model_id::text = m.model
    where pv.product_id = p_product_id and pv.active
  );
$$;

-- ---------------------------------------------------------------------------
-- set_all_stock_groups: guarda la regla y la aplica a todos los productos que
-- no son excepción. Devuelve cuántos productos quedan con stock compartido,
-- cuántas variantes cambian de stock y cuántas se crean; con p_dry_run solo
-- lo informa (no guarda la regla).
-- ---------------------------------------------------------------------------
create or replace function set_all_stock_groups(p_groups jsonb, p_dry_run boolean default false)
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_group jsonb;
  v_no int := 0;
  v_model text;
  v_seen uuid[] := '{}';
  v_product record;
  v_result jsonb;
  v_products int := 0;
  v_changes int := 0;
  v_created int := 0;
begin
  if jsonb_typeof(p_groups) is distinct from 'array' then
    raise exception 'groups debe ser una lista de grupos de modelos' using errcode = 'CC400';
  end if;
  for v_group in select * from jsonb_array_elements(p_groups) loop
    if jsonb_typeof(v_group) is distinct from 'array' or jsonb_array_length(v_group) < 2 then
      raise exception 'Cada grupo necesita al menos 2 modelos' using errcode = 'CC400';
    end if;
    for v_model in select * from jsonb_array_elements_text(v_group) loop
      if v_model !~* '^[0-9a-f-]{36}$' or not exists (select 1 from iphone_models where id = v_model::uuid) then
        raise exception 'Modelo inválido' using errcode = 'CC400';
      end if;
      if v_model::uuid = any (v_seen) then
        raise exception 'Un modelo no puede estar en dos grupos' using errcode = 'CC400';
      end if;
      v_seen := v_seen || v_model::uuid;
    end loop;
  end loop;

  if not coalesce(p_dry_run, false) then
    -- Con WHERE: Supabase bloquea los DELETE sin condición que vienen desde la API.
    delete from stock_share_rule where true;
    for v_group in select * from jsonb_array_elements(p_groups) loop
      v_no := v_no + 1;
      insert into stock_share_rule (iphone_model_id, group_no)
      select m::uuid, v_no from jsonb_array_elements_text(v_group) as m;
    end loop;
  end if;

  for v_product in
    select p.id from products p
    where p.archived_at is null and not p.stock_groups_custom
      and (exists (select 1 from product_variants pv where pv.product_id = p.id and pv.active and pv.iphone_model_id is not null)
           or exists (select 1 from product_stock_links l where l.product_id = p.id))
  loop
    v_result := set_product_stock_groups(v_product.id, stock_groups_for_product(v_product.id, p_groups), p_dry_run);
    if (v_result ->> 'groups')::int > 0 then
      v_products := v_products + 1;
    end if;
    v_changes := v_changes + jsonb_array_length(v_result -> 'changes');
    v_created := v_created + jsonb_array_length(v_result -> 'created');
  end loop;

  return jsonb_build_object('products', v_products, 'changes', v_changes, 'created', v_created,
                            'dry_run', coalesce(p_dry_run, false));
end;
$$;

-- ---------------------------------------------------------------------------
-- set_custom_stock_groups: grupos puestos a mano en la ficha de un producto
-- (queda como excepción a la regla). Con p_groups null vuelve a la regla.
-- ---------------------------------------------------------------------------
create or replace function set_custom_stock_groups(p_product_id uuid, p_groups jsonb, p_dry_run boolean default false)
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_result jsonb;
begin
  v_result := set_product_stock_groups(
    p_product_id,
    coalesce(p_groups, stock_groups_for_product(p_product_id, stock_rule_groups())),
    p_dry_run
  );
  if not coalesce(p_dry_run, false) then
    update products set stock_groups_custom = (p_groups is not null) where id = p_product_id;
  end if;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- La regla, sola: apply_stock_rule le pone a un producto que no es excepción
-- los grupos de la regla que le correspondan, si no los tiene ya. La llama la
-- sincronización al cargar variantes (un producto nuevo, o un modelo nuevo en
-- uno que ya existe). Devuelve si cambió algo.
create or replace function apply_stock_rule(p_product_id uuid)
returns boolean
language plpgsql
set search_path = public, extensions
as $$
declare
  v_groups jsonb;
  v_current jsonb;
begin
  perform 1 from products where id = p_product_id and not stock_groups_custom and archived_at is null;
  if not found then
    return false;
  end if;

  v_groups := stock_groups_for_product(p_product_id, stock_rule_groups());
  select coalesce(jsonb_agg(g.models order by g.group_no), '[]')
  into v_current
  from (
    select l.group_no, jsonb_agg(l.iphone_model_id order by m.sort_order) as models
    from product_stock_links l
    join iphone_models m on m.id = l.iphone_model_id
    where l.product_id = p_product_id
    group by l.group_no
  ) g;
  if v_groups = v_current then
    return false;
  end if;
  perform set_product_stock_groups(p_product_id, v_groups);
  return true;
end;
$$;

revoke execute on function stock_rule_groups() from public, anon, authenticated;
revoke execute on function stock_groups_for_product(uuid, jsonb) from public, anon, authenticated;
revoke execute on function set_all_stock_groups(jsonb, boolean) from public, anon, authenticated;
revoke execute on function set_custom_stock_groups(uuid, jsonb, boolean) from public, anon, authenticated;
revoke execute on function apply_stock_rule(uuid) from public, anon, authenticated;
grant execute on function stock_rule_groups() to service_role;
grant execute on function set_all_stock_groups(jsonb, boolean) to service_role;
grant execute on function set_custom_stock_groups(uuid, jsonb, boolean) to service_role;
