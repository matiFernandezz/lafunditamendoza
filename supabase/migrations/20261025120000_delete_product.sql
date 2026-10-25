-- Eliminar un producto desde el panel (p. ej. uno cargado dos veces por error).
-- Igual que con las variantes (delete_variant): si ninguna de sus variantes
-- tiene ventas, compras ni reservas, se borra entero (variantes, fotos y su
-- lugar en "más vendidas"). Si tiene historial, queda archivado: oculto en la
-- tienda y en todo el panel, pero las ventas y compras viejas lo siguen
-- nombrando. archived_at distingue "archivado" de "oculto en la web" (active).
alter table products add column archived_at timestamptz;

create or replace function delete_product(p_product_id uuid, p_force boolean default false, p_dry_run boolean default false)
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_product products;
  v_units int;
  v_references int;
  v_blocked boolean;
  v_images text[];
begin
  select * into v_product from products where id = p_product_id for update;
  if not found or v_product.archived_at is not null then
    raise exception 'No existe un producto con ese id' using errcode = 'CC404';
  end if;

  select coalesce(sum(stock_quantity) filter (where active), 0), coalesce(sum(variant_reference_count(id)), 0)
  into v_units, v_references
  from product_variants
  where product_id = p_product_id;

  -- Con unidades en stock pide confirmación (p_force), como al eliminar una variante.
  v_blocked := v_units > 0 and not coalesce(p_force, false);

  if not v_blocked and not coalesce(p_dry_run, false) then
    if v_references = 0 then
      select coalesce(array_agg(url), '{}') into v_images from product_images where product_id = p_product_id;
      delete from products where id = p_product_id;
    else
      update products set archived_at = now(), active = false where id = p_product_id;
      update product_variants set active = false, stock_quantity = 0 where product_id = p_product_id;
      delete from home_new_arrivals where product_id = p_product_id;
    end if;
  end if;

  return jsonb_build_object(
    'id', p_product_id,
    'name', v_product.name,
    'units', v_units,
    'references', v_references,
    'blocked', v_blocked,
    'deleted', not v_blocked and not coalesce(p_dry_run, false) and v_references = 0,
    'archived', not v_blocked and not coalesce(p_dry_run, false) and v_references > 0,
    'dry_run', coalesce(p_dry_run, false),
    -- Fotos del producto borrado: el servidor las saca del bucket.
    'images', coalesce(to_jsonb(v_images), '[]'::jsonb)
  );
end;
$$;

revoke execute on function delete_product(uuid, boolean, boolean) from public, anon, authenticated;
grant execute on function delete_product(uuid, boolean, boolean) to service_role;
