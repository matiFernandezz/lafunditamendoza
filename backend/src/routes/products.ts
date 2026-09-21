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

export default router;
