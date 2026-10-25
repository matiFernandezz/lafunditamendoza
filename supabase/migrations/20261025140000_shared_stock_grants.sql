-- Permisos que le faltaron a 20261025130000_shared_stock: estas funciones
-- internas las llaman set_all_stock_groups, set_custom_stock_groups y la
-- sincronización (al cargar variantes desde el panel, que corre como
-- service_role). Sin el grant, producción respondía "permission denied".
grant execute on function stock_groups_for_product(uuid, jsonb) to service_role;
grant execute on function apply_stock_rule(uuid) to service_role;
grant execute on function insert_shared_variant(uuid, uuid, uuid, uuid, text, numeric, numeric, int) to service_role;
grant execute on function set_product_stock_groups(uuid, jsonb, boolean) to service_role;
