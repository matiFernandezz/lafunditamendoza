-- Ventas y compras en una sola transacción + límites del bucket de fotos.
--
-- Hasta ahora el backend hacía dos inserts sueltos (venta, después items) y
-- si el segundo fallaba borraba la venta a mano. Con estas funciones todo
-- pasa dentro de la transacción de la llamada: o queda todo o no queda nada.
-- El stock lo siguen moviendo los triggers de sale_items / purchase_items.

-- ---------------------------------------------------------------------------
-- create_sale
-- p_items: [{ "variant_id": uuid, "quantity": int, "unit_price": numeric? }]
--
-- Los montos salen de los precios guardados, nunca de lo que manda el
-- navegador. unit_price es opcional y solo sirve de control: si viene y no
-- coincide con el precio actual, la venta falla (CS409) en vez de cobrar un
-- precio viejo. El descuento se redondea a pesos enteros.
--
-- Códigos de error propios:
--   CS400 datos inválidos · CS404 variante inexistente ·
--   CS409 el precio cambió (detail: {"sku","price"}) · CS410 no alcanza el stock
-- ---------------------------------------------------------------------------
create function create_sale(
  p_payment_method text,
  p_channel text,
  p_notes text,
  p_discount_percent int,
  p_items jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_sale sales;
  v_line record;
  v_price numeric(12, 2);
  v_stock int;
  v_discount_percent int := coalesce(p_discount_percent, 0);
  v_subtotal numeric(12, 2);
  v_discount numeric(12, 2);
  v_items jsonb;
begin
  if p_payment_method is null or p_payment_method not in ('efectivo', 'transferencia') then
    raise exception 'payment_method debe ser uno de: efectivo, transferencia' using errcode = 'CS400';
  end if;

  if p_channel is not null and p_channel not in ('feria', 'whatsapp', 'web') then
    raise exception 'channel debe ser uno de: feria, whatsapp, web (o no enviarse)' using errcode = 'CS400';
  end if;

  if v_discount_percent < 0 or v_discount_percent > 100 then
    raise exception 'discount_percent debe ser un entero entre 0 y 100' using errcode = 'CS400';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene items' using errcode = 'CS400';
  end if;

  drop table if exists _sale_lines;
  create temp table _sale_lines on commit drop as
  select t.ord as line_no,
         (t.e ->> 'variant_id')::uuid as variant_id,
         (t.e ->> 'quantity')::numeric as quantity,
         (t.e ->> 'unit_price')::numeric as unit_price
  from jsonb_array_elements(p_items) with ordinality as t(e, ord);

  if exists (
    select 1 from _sale_lines
    where variant_id is null or quantity is null or quantity <= 0 or quantity <> trunc(quantity)
  ) then
    raise exception 'Cada item necesita variant_id y una cantidad entera mayor a 0' using errcode = 'CS400';
  end if;

  -- Lock por variante en orden de id (sin deadlocks entre ventas simultáneas):
  -- desde acá el precio y el stock no pueden cambiar hasta el commit.
  for v_line in
    select l.variant_id, sum(l.quantity) as quantity, pv.sku
    from _sale_lines l
    left join product_variants pv on pv.id = l.variant_id
    group by l.variant_id, pv.sku
    order by l.variant_id
  loop
    if v_line.sku is null then
      raise exception 'Alguna de las variantes de la venta no existe' using errcode = 'CS404';
    end if;

    select price, stock_quantity into v_price, v_stock
    from product_variants where id = v_line.variant_id for update;

    if exists (
      select 1 from _sale_lines
      where variant_id = v_line.variant_id and unit_price is not null and unit_price <> v_price
    ) then
      raise exception 'El precio de % cambió', v_line.sku
        using errcode = 'CS409',
              detail = json_build_object('sku', v_line.sku, 'price', v_price)::text;
    end if;

    if v_stock < v_line.quantity then
      raise exception 'No alcanza el stock de %: quedan % y se quieren vender %',
        v_line.sku, v_stock, v_line.quantity
        using errcode = 'CS410';
    end if;
  end loop;

  select sum(l.quantity * pv.price) into v_subtotal
  from _sale_lines l
  join product_variants pv on pv.id = l.variant_id;

  v_discount := round(v_subtotal * v_discount_percent / 100);

  insert into sales (payment_method, channel, notes, subtotal, total_amount, discount_percent, discount_amount)
  values (p_payment_method, p_channel, p_notes, v_subtotal, v_subtotal - v_discount, v_discount_percent, v_discount)
  returning * into v_sale;

  -- El trigger de sale_items descuenta el stock (y vuelve a validar que alcance).
  insert into sale_items (sale_id, variant_id, quantity, unit_price)
  select v_sale.id, l.variant_id, l.quantity::int, pv.price
  from _sale_lines l
  join product_variants pv on pv.id = l.variant_id
  order by l.line_no;

  select coalesce(jsonb_agg(to_jsonb(si)), '[]'::jsonb) into v_items
  from sale_items si where si.sale_id = v_sale.id;

  return to_jsonb(v_sale) || jsonb_build_object('sale_items', v_items);
end;
$$;

-- ---------------------------------------------------------------------------
-- create_purchase
-- p_items: [{ "variant_id": uuid, "quantity": int, "unit_cost": numeric }]
-- El total se calcula acá. El trigger de purchase_items suma el stock y
-- actualiza el último costo.
--
-- Códigos de error propios:
--   CP400 datos inválidos · CP404 proveedor o variante inexistente
-- ---------------------------------------------------------------------------
create function create_purchase(
  p_supplier_id uuid,
  p_purchase_date date,
  p_notes text,
  p_items jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_purchase purchases;
  v_total numeric(12, 2);
  v_items jsonb;
begin
  if p_supplier_id is null or not exists (select 1 from suppliers where id = p_supplier_id) then
    raise exception 'El proveedor indicado no existe' using errcode = 'CP404';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La compra no tiene items' using errcode = 'CP400';
  end if;

  drop table if exists _purchase_lines;
  create temp table _purchase_lines on commit drop as
  select t.ord as line_no,
         (t.e ->> 'variant_id')::uuid as variant_id,
         (t.e ->> 'quantity')::numeric as quantity,
         (t.e ->> 'unit_cost')::numeric as unit_cost
  from jsonb_array_elements(p_items) with ordinality as t(e, ord);

  if exists (
    select 1 from _purchase_lines
    where variant_id is null
       or quantity is null or quantity <= 0 or quantity <> trunc(quantity)
       or unit_cost is null or unit_cost <= 0
  ) then
    raise exception 'Cada item necesita variant_id, una cantidad entera mayor a 0 y un costo mayor a 0'
      using errcode = 'CP400';
  end if;

  if exists (
    select 1 from _purchase_lines l
    left join product_variants pv on pv.id = l.variant_id
    where pv.id is null
  ) then
    raise exception 'Alguna de las variantes de la compra no existe' using errcode = 'CP404';
  end if;

  -- Mismo orden de locks que create_sale, para no cruzarse con una venta.
  perform 1 from product_variants
  where id in (select variant_id from _purchase_lines)
  order by id
  for update;

  select sum(quantity * unit_cost) into v_total from _purchase_lines;

  insert into purchases (supplier_id, purchase_date, notes, total_amount)
  values (p_supplier_id, coalesce(p_purchase_date, current_date), p_notes, v_total)
  returning * into v_purchase;

  insert into purchase_items (purchase_id, variant_id, quantity, unit_cost)
  select v_purchase.id, variant_id, quantity::int, unit_cost
  from _purchase_lines
  order by line_no;

  select coalesce(jsonb_agg(to_jsonb(pi)), '[]'::jsonb) into v_items
  from purchase_items pi where pi.purchase_id = v_purchase.id;

  return to_jsonb(v_purchase) || jsonb_build_object('purchase_items', v_items);
end;
$$;

-- ---------------------------------------------------------------------------
-- reorder_product_images: el orden completo en un solo UPDATE (antes era uno
-- por foto: si fallaba a la mitad, quedaba un orden mezclado).
-- p_order tiene que traer exactamente las fotos actuales del producto.
-- Error propio: PI400.
-- ---------------------------------------------------------------------------
create function reorder_product_images(p_product_id uuid, p_order uuid[])
returns void
language plpgsql
set search_path = public
as $$
begin
  perform 1 from product_images where product_id = p_product_id order by id for update;

  if coalesce(array_length(p_order, 1), 0) = 0
     or (select count(distinct o) from unnest(p_order) as o) <> array_length(p_order, 1)
     or (select count(*) from product_images where product_id = p_product_id) <> array_length(p_order, 1)
     or exists (
       select 1 from unnest(p_order) as o
       where o not in (select id from product_images where product_id = p_product_id)
     )
  then
    raise exception 'order tiene que incluir exactamente las imagenes actuales del producto, sin repetir'
      using errcode = 'PI400';
  end if;

  update product_images pi
  set sort_order = o.ord - 1
  from unnest(p_order) with ordinality as o(id, ord)
  where pi.id = o.id;
end;
$$;

-- Las funciones de public se pueden llamar por /rest/v1/rpc y Supabase le da
-- EXECUTE a anon/authenticated por defecto: sin esto, cualquiera con la anon
-- key podría crear ventas o compras. Solo el servidor (service_role).
revoke execute on function create_sale(text, text, text, int, jsonb) from public, anon, authenticated;
revoke execute on function create_purchase(uuid, date, text, jsonb) from public, anon, authenticated;
revoke execute on function reorder_product_images(uuid, uuid[]) from public, anon, authenticated;
grant execute on function create_sale(text, text, text, int, jsonb) to service_role;
grant execute on function create_purchase(uuid, date, text, jsonb) to service_role;
grant execute on function reorder_product_images(uuid, uuid[]) to service_role;

-- ---------------------------------------------------------------------------
-- Fotos de producto: ahora el navegador sube directo a Storage con una URL
-- firmada, así que el límite de tamaño y de formato lo tiene que hacer cumplir
-- el bucket (antes lo hacía multer en el backend).
-- ---------------------------------------------------------------------------
update storage.buckets
set file_size_limit = 10485760, -- 10MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'product-images';
