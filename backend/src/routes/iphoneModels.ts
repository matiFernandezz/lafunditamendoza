import { Router } from 'express';
import { supabase } from '../lib/supabaseClient';

const router = Router();

router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('iphone_models')
    .select('id, name, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ data });
});

export default router;
