import { Router } from 'express';
import { supabase } from '../lib/supabaseClient';
import { isUuid, isPositiveInt, isPositiveNumber } from '../lib/validate';

const PAYMENT_METHODS = ['efectivo', 'transferencia'] as const;
const CHANNELS = ['feria', 'whatsapp', 'web'] as const;

type SaleItemInput = {
  variant_id: string;
  quantity: number;
  unit_price: number;
};

function validateItems(items: unknown): items is SaleItemInput[] {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.every((item) => {
    if (typeof item !== 'object' || item === null) return false;
    const { variant_id, quantity, unit_price } = item as Record<string, unknown>;
    return isUuid(variant_id) && isPositiveInt(quantity) && isPositiveNumber(unit_price);
  });
}

const router = Router();

router.post('/', async (req, res) => {
  const { payment_method, channel, notes, items } = req.body ?? {};

  if (!PAYMENT_METHODS.includes(payment_method)) {
    return res.status(400).json({
      error: `payment_method debe ser uno de: ${PAYMENT_METHODS.join(', ')}`,
    });
  }

  if (channel !== undefined && channel !== null && !CHANNELS.includes(channel)) {
    return res.status(400).json({
      error: `channel debe ser uno de: ${CHANNELS.join(', ')} (o no enviarse)`,
    });
  }

  if (!validateItems(items)) {
    return res.status(400).json({
      error:
        'items debe ser un array no vacio de { variant_id (uuid), quantity (entero > 0), unit_price (numero > 0) }',
    });
  }

  const total_amount = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({ payment_method, channel: channel ?? null, notes: notes ?? null, total_amount })
    .select()
    .single();

  if (saleError || !sale) {
    return res.status(500).json({ error: saleError?.message ?? 'No se pudo crear la venta' });
  }

  const { data: saleItems, error: itemsError } = await supabase
    .from('sale_items')
    .insert(items.map((item) => ({ ...item, sale_id: sale.id })))
    .select();

  if (itemsError) {
    // Compensar: la venta ya se creo pero los items fallaron (p.ej. stock insuficiente).
    await supabase.from('sales').delete().eq('id', sale.id);
    return res.status(400).json({ error: itemsError.message });
  }

  res.status(201).json({ data: { ...sale, sale_items: saleItems } });
});

router.get('/', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.page_size) || 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('sales')
    .select(
      'id, sale_date, payment_method, channel, total_amount, notes, sale_items(id, variant_id, quantity, unit_price)',
      { count: 'exact' }
    )
    .order('sale_date', { ascending: false })
    .range(from, to);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({
    data,
    pagination: {
      page,
      page_size: pageSize,
      total: count ?? 0,
      total_pages: count !== null ? Math.ceil((count ?? 0) / pageSize) : 0,
    },
  });
});

export default router;
