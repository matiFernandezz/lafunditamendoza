import { Router } from 'express';
import { supabase } from '../lib/supabaseClient';
import { isUuid, isPositiveInt, isPositiveNumber } from '../lib/validate';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type PurchaseItemInput = {
  variant_id: string;
  quantity: number;
  unit_cost: number;
};

function validateItems(items: unknown): items is PurchaseItemInput[] {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.every((item) => {
    if (typeof item !== 'object' || item === null) return false;
    const { variant_id, quantity, unit_cost } = item as Record<string, unknown>;
    return isUuid(variant_id) && isPositiveInt(quantity) && isPositiveNumber(unit_cost);
  });
}

const router = Router();

router.post('/', async (req, res) => {
  const { supplier_id, purchase_date, notes, items } = req.body ?? {};

  if (!isUuid(supplier_id)) {
    return res.status(400).json({ error: 'supplier_id debe ser un uuid valido' });
  }

  if (purchase_date !== undefined && !DATE_REGEX.test(purchase_date)) {
    return res.status(400).json({
      error: 'purchase_date debe tener formato YYYY-MM-DD (o no enviarse)',
    });
  }

  if (!validateItems(items)) {
    return res.status(400).json({
      error:
        'items debe ser un array no vacio de { variant_id (uuid), quantity (entero > 0), unit_cost (numero > 0) }',
    });
  }

  const total_amount = items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);

  const { data: purchase, error: purchaseError } = await supabase
    .from('purchases')
    .insert({
      supplier_id,
      ...(purchase_date ? { purchase_date } : {}),
      notes: notes ?? null,
      total_amount,
    })
    .select()
    .single();

  if (purchaseError?.code === '23503') {
    return res.status(400).json({ error: 'El proveedor indicado no existe' });
  }

  if (purchaseError || !purchase) {
    return res.status(500).json({ error: purchaseError?.message ?? 'No se pudo crear la compra' });
  }

  const { data: purchaseItems, error: itemsError } = await supabase
    .from('purchase_items')
    .insert(items.map((item) => ({ ...item, purchase_id: purchase.id })))
    .select();

  if (itemsError) {
    // Compensar: la compra ya se creo pero los items fallaron.
    await supabase.from('purchases').delete().eq('id', purchase.id);
    return res.status(400).json({ error: itemsError.message });
  }

  res.status(201).json({ data: { ...purchase, purchase_items: purchaseItems } });
});

export default router;
