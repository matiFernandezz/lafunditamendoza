import { Router } from 'express';
import { supabase } from '../lib/supabaseClient';
import { isUuid, isPositiveNumber } from '../lib/validate';

const MAX_COLOR_LENGTH = 60;
const MAX_SKU_LENGTH = 64;

const router = Router();

router.post('/', async (req, res) => {
  const { product_id, iphone_model_id, color, sku, price, cost_price, stock_quantity } =
    req.body ?? {};

  if (!isUuid(product_id)) {
    return res.status(400).json({ error: 'product_id debe ser un uuid valido' });
  }

  if (iphone_model_id !== undefined && iphone_model_id !== null && !isUuid(iphone_model_id)) {
    return res.status(400).json({
      error: 'iphone_model_id debe ser un uuid valido (o null si no depende del modelo)',
    });
  }

  if (
    color !== undefined &&
    color !== null &&
    (typeof color !== 'string' || color.trim().length > MAX_COLOR_LENGTH)
  ) {
    return res.status(400).json({
      error: `color debe ser texto de hasta ${MAX_COLOR_LENGTH} caracteres (o no enviarse)`,
    });
  }

  if (typeof sku !== 'string' || sku.trim() === '' || sku.trim().length > MAX_SKU_LENGTH) {
    return res.status(400).json({
      error: `sku es obligatorio (texto de hasta ${MAX_SKU_LENGTH} caracteres)`,
    });
  }

  if (!isPositiveNumber(price)) {
    return res.status(400).json({ error: 'price debe ser un numero mayor a 0' });
  }

  if (
    cost_price !== undefined &&
    (typeof cost_price !== 'number' || !Number.isFinite(cost_price) || cost_price < 0)
  ) {
    return res.status(400).json({ error: 'cost_price debe ser un numero mayor o igual a 0' });
  }

  if (
    stock_quantity !== undefined &&
    (typeof stock_quantity !== 'number' ||
      !Number.isInteger(stock_quantity) ||
      stock_quantity < 0)
  ) {
    return res.status(400).json({ error: 'stock_quantity debe ser un entero mayor o igual a 0' });
  }

  const trimmedColor = typeof color === 'string' ? color.trim() : '';
  const trimmedSku = sku.trim();

  const { data, error } = await supabase
    .from('product_variants')
    .insert({
      product_id,
      iphone_model_id: iphone_model_id ?? null,
      color: trimmedColor === '' ? null : trimmedColor,
      sku: trimmedSku,
      price,
      cost_price: cost_price ?? 0,
      stock_quantity: stock_quantity ?? 0,
    })
    .select('id, product_id, iphone_model_id, color, sku, price, cost_price, stock_quantity, active')
    .single();

  if (error?.code === '23505') {
    return res.status(409).json({ error: `Ya existe una variante con el SKU "${trimmedSku}"` });
  }

  if (error?.code === '23503') {
    return res.status(400).json({ error: 'El producto o el modelo de iPhone indicado no existe' });
  }

  if (error || !data) {
    return res.status(500).json({ error: error?.message ?? 'No se pudo crear la variante' });
  }

  res.status(201).json({ data });
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { stock_quantity, price } = req.body ?? {};

  if (!isUuid(id)) {
    return res.status(400).json({ error: 'id debe ser un uuid valido' });
  }

  if (stock_quantity === undefined && price === undefined) {
    return res.status(400).json({ error: 'Envia stock_quantity, price o ambos' });
  }

  if (
    stock_quantity !== undefined &&
    (typeof stock_quantity !== 'number' ||
      !Number.isInteger(stock_quantity) ||
      stock_quantity < 0)
  ) {
    return res.status(400).json({ error: 'stock_quantity debe ser un entero mayor o igual a 0' });
  }

  if (price !== undefined && !isPositiveNumber(price)) {
    return res.status(400).json({ error: 'price debe ser un numero mayor a 0' });
  }

  const { data, error } = await supabase
    .from('product_variants')
    .update({
      ...(stock_quantity !== undefined ? { stock_quantity } : {}),
      ...(price !== undefined ? { price } : {}),
    })
    .eq('id', id)
    .select('id, product_id, iphone_model_id, color, sku, price, cost_price, stock_quantity, active')
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: 'No existe una variante con ese id' });
  }

  res.json({ data });
});

export default router;
