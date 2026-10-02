import { Router } from 'express';
import { supabase } from '../lib/supabaseClient';
import { isUuid, isPositiveInt } from '../lib/validate';

// Reservas hechas desde la tienda. El stock se mueve solo en las funciones
// SQL (create_web_order, mark_web_order_paid, cancel_web_order): acá se valida
// la entrada y se traducen los errores.
//
// La tienda solo usa POST / y GET /public/:token (el proxy de Next no deja
// pasar el resto sin sesión de admin).

const STATUSES = ['pendiente', 'pagada', 'cancelada'] as const;
type Status = (typeof STATUSES)[number];

// Topes para que un carrito no reserve medio depósito.
const MAX_LINES = 20;
const MAX_QUANTITY = 10;
const MAX_NAME_LENGTH = 80;
const MAX_REASON_LENGTH = 120;

const ITEMS_SELECT = `items:web_order_items (
    id, quantity, unit_price,
    variant:product_variants (
      id, sku, color,
      product:products ( id, name ),
      iphone_model:iphone_models ( id, name )
    )
  )`;

const ORDER_SELECT = `id, code, public_token, customer_name, customer_phone, status, total_amount,
  created_at, expires_at, paid_at, cancelled_at, cancel_reason, sale_id, ${ITEMS_SELECT}`;

// Lo que ve el cliente: sin su teléfono ni ids internos de la venta.
const PUBLIC_SELECT = `code, customer_name, status, total_amount, created_at, expires_at, ${ITEMS_SELECT}`;

const ERRORS: Record<string, { status: number; message?: string }> = {
  WO400: { status: 400 },
  WO404: { status: 404 },
  WO409: { status: 409 },
};

function rpcError(error: { code: string; message: string }) {
  const known = ERRORS[error.code];
  return { status: known?.status ?? 500, body: { error: known?.message ?? error.message } };
}

type ItemInput = { variant_id: string; quantity: number };

function validateItems(items: unknown): items is ItemInput[] {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) return false;
  return items.every((item) => {
    if (typeof item !== 'object' || item === null) return false;
    const { variant_id, quantity } = item as Record<string, unknown>;
    return isUuid(variant_id) && isPositiveInt(quantity) && (quantity as number) <= MAX_QUANTITY;
  });
}

const router = Router();

router.post('/', async (req, res) => {
  const { customer_name, customer_phone, items } = req.body ?? {};

  const name = typeof customer_name === 'string' ? customer_name.trim() : '';
  const phone = typeof customer_phone === 'string' ? customer_phone.trim() : '';
  const digits = phone.replace(/\D/g, '');

  if (name.length < 2 || name.length > MAX_NAME_LENGTH) {
    return res.status(400).json({ error: 'Escribí tu nombre.' });
  }
  if (digits.length < 8 || digits.length > 15) {
    return res.status(400).json({ error: 'Revisá tu WhatsApp: tiene que tener entre 8 y 15 números.' });
  }
  if (!validateItems(items)) {
    return res.status(400).json({
      error: `El carrito tiene que tener entre 1 y ${MAX_LINES} productos, con hasta ${MAX_QUANTITY} unidades cada uno.`,
    });
  }

  const { data: order, error } = await supabase.rpc('create_web_order', {
    p_customer_name: name,
    p_customer_phone: phone,
    p_items: items.map(({ variant_id, quantity }) => ({ variant_id, quantity })),
  });

  if (error) {
    const { status, body } = rpcError(error);
    return res.status(status).json(body);
  }

  const { data, error: readError } = await supabase
    .from('web_orders')
    .select(ORDER_SELECT)
    .eq('id', order.id)
    .single();

  if (readError) {
    return res.status(500).json({ error: readError.message });
  }

  res.status(201).json({ data });
});

router.get('/public/:token', async (req, res) => {
  const { token } = req.params;
  if (!isUuid(token)) {
    return res.status(404).json({ error: 'No encontramos esa reserva.' });
  }

  const { data, error } = await supabase
    .from('web_orders')
    .select(PUBLIC_SELECT)
    .eq('public_token', token)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!data) {
    return res.status(404).json({ error: 'No encontramos esa reserva.' });
  }

  res.json({ data });
});

// Cantidad por estado: el panel la usa para el contador rojo de la solapa.
router.get('/counts', async (_req, res) => {
  const results = await Promise.all(
    STATUSES.map((status) =>
      supabase.from('web_orders').select('id', { count: 'exact', head: true }).eq('status', status),
    ),
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return res.status(500).json({ error: failed.error.message });
  }

  const counts = Object.fromEntries(STATUSES.map((s, i) => [s, results[i].count ?? 0]));
  res.json({ data: counts });
});

router.get('/', async (req, res) => {
  const status = (req.query.status ?? 'pendiente') as Status;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `status debe ser uno de: ${STATUSES.join(', ')}` });
  }

  // Pendientes: primero las que vencen antes. El resto: lo más nuevo arriba.
  const { data, error } = await supabase
    .from('web_orders')
    .select(ORDER_SELECT)
    .eq('status', status)
    .order('created_at', { ascending: status === 'pendiente' })
    .limit(200);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ data });
});

router.post('/:id/paid', async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) {
    return res.status(400).json({ error: 'id debe ser un uuid valido' });
  }

  const { error } = await supabase.rpc('mark_web_order_paid', { p_order_id: id });
  if (error) {
    const { status, body } = rpcError(error);
    return res.status(status).json(body);
  }

  const { data, error: readError } = await supabase.from('web_orders').select(ORDER_SELECT).eq('id', id).single();
  if (readError) {
    return res.status(500).json({ error: readError.message });
  }

  res.json({ data });
});

router.post('/:id/cancel', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body ?? {};

  if (!isUuid(id)) {
    return res.status(400).json({ error: 'id debe ser un uuid valido' });
  }
  if (reason !== undefined && reason !== null && (typeof reason !== 'string' || reason.length > MAX_REASON_LENGTH)) {
    return res.status(400).json({ error: `reason tiene que ser un texto de hasta ${MAX_REASON_LENGTH} caracteres` });
  }

  const { error } = await supabase.rpc('cancel_web_order', { p_order_id: id, p_reason: reason ?? null });
  if (error) {
    const { status, body } = rpcError(error);
    return res.status(status).json(body);
  }

  const { data, error: readError } = await supabase.from('web_orders').select(ORDER_SELECT).eq('id', id).single();
  if (readError) {
    return res.status(500).json({ error: readError.message });
  }

  res.json({ data });
});

export default router;
