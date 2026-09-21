import { Router } from 'express';
import { supabase } from '../lib/supabaseClient';

const MAX_NAME_LENGTH = 120;
const MAX_CONTACT_LENGTH = 500;

const router = Router();

router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name, contact_info')
    .order('name', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ data });
});

router.post('/', async (req, res) => {
  const { name, contact_info } = req.body ?? {};

  if (typeof name !== 'string' || name.trim() === '' || name.trim().length > MAX_NAME_LENGTH) {
    return res.status(400).json({
      error: `name es obligatorio (texto de hasta ${MAX_NAME_LENGTH} caracteres)`,
    });
  }

  if (
    contact_info !== undefined &&
    contact_info !== null &&
    (typeof contact_info !== 'string' || contact_info.length > MAX_CONTACT_LENGTH)
  ) {
    return res.status(400).json({
      error: `contact_info debe ser texto de hasta ${MAX_CONTACT_LENGTH} caracteres (o no enviarse)`,
    });
  }

  const contact = typeof contact_info === 'string' ? contact_info.trim() : '';

  const { data, error } = await supabase
    .from('suppliers')
    .insert({ name: name.trim(), contact_info: contact === '' ? null : contact })
    .select('id, name, contact_info')
    .single();

  if (error || !data) {
    return res.status(500).json({ error: error?.message ?? 'No se pudo crear el proveedor' });
  }

  res.status(201).json({ data });
});

export default router;
