import { Request, Router } from 'express';
import { supabase } from '../lib/supabaseClient';
import { isUuid, isPositiveInt, isPositiveNumber } from '../lib/validate';

const PAYMENT_METHODS = ['efectivo', 'transferencia'] as const;
const MAX_DISCOUNT_PERCENT = 99;
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
  const { payment_method, channel, notes, items, discount_percent } = req.body ?? {};

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

  const discountPercent = discount_percent ?? 0;
  if (
    typeof discountPercent !== 'number' ||
    !Number.isInteger(discountPercent) ||
    discountPercent < 0 ||
    discountPercent > MAX_DISCOUNT_PERCENT
  ) {
    return res.status(400).json({
      error: `discount_percent debe ser un entero entre 0 y ${MAX_DISCOUNT_PERCENT} (o no enviarse)`,
    });
  }

  // El descuento se redondea a pesos enteros: en la feria no se cobran
  // centavos. total_amount es lo que realmente se cobra.
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const discount_amount = Math.round((subtotal * discountPercent) / 100);
  const total_amount = subtotal - discount_amount;

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      payment_method,
      channel: channel ?? null,
      notes: notes ?? null,
      total_amount,
      discount_percent: discountPercent,
      discount_amount,
    })
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

/**
 * Rango [from, to) de query params ISO 8601 (instantes con zona, p. ej. los
 * que arma el panel desde la hora local del celular). Los dos son opcionales
 * por separado; si vienen ambos, from tiene que ser anterior a to.
 */
function parseRange(query: Request['query']): { from?: string; to?: string } | { error: string } {
  const parse = (value: unknown, name: string) => {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
      throw new Error(`${name} debe ser una fecha ISO 8601 valida`);
    }
    return new Date(value).toISOString();
  };
  try {
    const from = parse(query.from, 'from');
    const to = parse(query.to, 'to');
    if (from && to && from >= to) return { error: 'from tiene que ser anterior a to' };
    return { from, to };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

const SALE_SELECT = `id, sale_date, payment_method, channel, total_amount, discount_percent, discount_amount,
  notes, status, voided_at, void_reason,
  sale_items (
    id, variant_id, quantity, unit_price,
    variant:product_variants (
      id, sku, color,
      product:products ( id, name ),
      iphone_model:iphone_models ( id, name )
    )
  )`;

router.get('/', async (req, res) => {
  const range = parseRange(req.query);
  if ('error' in range) {
    return res.status(400).json({ error: range.error });
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.page_size) || 20));
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('sales')
    .select(SALE_SELECT, { count: 'exact' })
    .order('sale_date', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (range.from) query = query.gte('sale_date', range.from);
  if (range.to) query = query.lt('sale_date', range.to);

  const { data, error, count } = await query;

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

// Todo el cálculo vive en la función SQL sales_summary: acá no se traen filas.
router.get('/summary', async (req, res) => {
  const range = parseRange(req.query);
  if ('error' in range) {
    return res.status(400).json({ error: range.error });
  }
  if (!range.from || !range.to) {
    return res.status(400).json({ error: 'from y to son obligatorios' });
  }

  const { data, error } = await supabase.rpc('sales_summary', { p_from: range.from, p_to: range.to });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ data });
});

const MAX_VOID_REASON_LENGTH = 300;

// Códigos propios que levanta la función SQL void_sale, con un mensaje para
// mostrar tal cual en el panel (el de Postgres trae timestamps crudos).
const VOID_ERRORS: Record<string, { status: number; message: string }> = {
  VS400: { status: 400, message: 'El motivo de la anulación es obligatorio.' },
  VS404: { status: 404, message: 'Esa venta no existe.' },
  VS409: { status: 409, message: 'Esta venta ya estaba anulada.' },
};

router.post('/:id/void', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body ?? {};

  if (!isUuid(id)) {
    return res.status(400).json({ error: 'id debe ser un uuid valido' });
  }

  if (typeof reason !== 'string' || reason.trim() === '' || reason.trim().length > MAX_VOID_REASON_LENGTH) {
    return res.status(400).json({
      error: `reason es obligatorio (texto de hasta ${MAX_VOID_REASON_LENGTH} caracteres)`,
    });
  }

  const { data, error } = await supabase.rpc('void_sale', { p_sale_id: id, p_reason: reason.trim() });

  if (error) {
    const known = VOID_ERRORS[error.code];
    return res.status(known?.status ?? 500).json({ error: known?.message ?? error.message });
  }

  res.json({ data });
});

export default router;
