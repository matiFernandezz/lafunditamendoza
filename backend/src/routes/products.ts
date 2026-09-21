import { Router } from 'express';
import { supabase } from '../lib/supabaseClient';
import { isUuid } from '../lib/validate';

const router = Router();

router.get('/', async (req, res) => {
  const { category_id } = req.query;

  if (category_id !== undefined && !isUuid(category_id)) {
    return res.status(400).json({ error: 'category_id debe ser un uuid valido' });
  }

  let query = supabase
    .from('products')
    .select(
      `id, name, description, active, category_id, created_at,
       product_variants ( id, sku, color, price, cost_price, stock_quantity, active, iphone_model_id )`
    )
    .order('name', { ascending: true });

  if (category_id) {
    query = query.eq('category_id', category_id);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ data });
});

const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1000;

router.post('/', async (req, res) => {
  const { category_id, name, description, active } = req.body ?? {};

  if (!isUuid(category_id)) {
    return res.status(400).json({ error: 'category_id debe ser un uuid valido' });
  }

  if (typeof name !== 'string' || name.trim() === '' || name.trim().length > MAX_NAME_LENGTH) {
    return res.status(400).json({
      error: `name es obligatorio (texto de hasta ${MAX_NAME_LENGTH} caracteres)`,
    });
  }

  if (
    description !== undefined &&
    description !== null &&
    (typeof description !== 'string' || description.length > MAX_DESCRIPTION_LENGTH)
  ) {
    return res.status(400).json({
      error: `description debe ser texto de hasta ${MAX_DESCRIPTION_LENGTH} caracteres (o no enviarse)`,
    });
  }

  if (active !== undefined && typeof active !== 'boolean') {
    return res.status(400).json({ error: 'active debe ser true o false (o no enviarse)' });
  }

  const trimmedDescription = typeof description === 'string' ? description.trim() : '';

  const { data, error } = await supabase
    .from('products')
    .insert({
      category_id,
      name: name.trim(),
      description: trimmedDescription === '' ? null : trimmedDescription,
      active: active ?? true,
    })
    .select('id, category_id, name, description, active, created_at')
    .single();

  if (error?.code === '23503') {
    return res.status(400).json({ error: 'La categoria indicada no existe' });
  }

  if (error || !data) {
    return res.status(500).json({ error: error?.message ?? 'No se pudo crear el producto' });
  }

  res.status(201).json({ data });
});

export default router;
