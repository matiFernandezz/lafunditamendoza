-- La Fundita: descontinuar variantes sin borrarlas + proteger historial de compras/ventas

alter table product_variants
  add column active boolean not null default true;

alter table purchase_items
  drop constraint purchase_items_variant_id_fkey,
  add constraint purchase_items_variant_id_fkey
    foreign key (variant_id) references product_variants (id) on delete restrict;

alter table sale_items
  drop constraint sale_items_variant_id_fkey,
  add constraint sale_items_variant_id_fkey
    foreign key (variant_id) references product_variants (id) on delete restrict;
