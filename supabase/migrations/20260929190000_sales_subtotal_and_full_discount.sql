-- La venta guarda también el subtotal (precio de lista de todos sus items,
-- antes del descuento), y el descuento puede llegar al 100%.
--
-- Ventas existentes: subtotal = total + descuento, que es exactamente lo que
-- se cobró más lo que se descontó.

alter table sales add column subtotal numeric(12, 2);
update sales set subtotal = total_amount + discount_amount;
alter table sales alter column subtotal set not null;

-- Los tres montos siempre cierran entre sí, y nunca se cobra en negativo.
alter table sales
  add constraint sales_totals_consistency check (total_amount = subtotal - discount_amount),
  add constraint sales_total_not_negative check (total_amount >= 0);

-- 0 a 100 (antes 0 a 99).
alter table sales
  drop constraint sales_discount_percent_check,
  add constraint sales_discount_percent_check check (discount_percent between 0 and 100);
