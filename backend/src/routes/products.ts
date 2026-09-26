import { randomUUID } from 'crypto';
import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { supabase } from '../lib/supabaseClient';
import { isUuid } from '../lib/validate';

const router = Router();

const PRODUCT_SELECT = 'id, name, description, active, category_id, image_url, created_at';

router.get('/', async (req, res) => {
  const { category_id } = req.query;

  if (category_id !== undefined && !isUuid(category_id)) {
    return res.status(400).json({ error: 'category_id debe ser un uuid valido' });
  }

  let query = supabase
    .from('products')
    .select(
      `${PRODUCT_SELECT},
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
    .select(PRODUCT_SELECT)
    .single();

  if (error?.code === '23503') {
    return res.status(400).json({ error: 'La categoria indicada no existe' });
  }

  if (error || !data) {
    return res.status(500).json({ error: error?.message ?? 'No se pudo crear el producto' });
  }

  res.status(201).json({ data });
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body ?? {};

  if (!isUuid(id)) {
    return res.status(400).json({ error: 'id debe ser un uuid valido' });
  }

  if (typeof name !== 'string' || name.trim() === '' || name.trim().length > MAX_NAME_LENGTH) {
    return res.status(400).json({
      error: `name es obligatorio (texto de hasta ${MAX_NAME_LENGTH} caracteres)`,
    });
  }

  const { data, error } = await supabase
    .from('products')
    .update({ name: name.trim() })
    .eq('id', id)
    .select(PRODUCT_SELECT)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: 'No existe un producto con ese id' });
  }

  res.json({ data });
});

const IMAGE_BUCKET = 'product-images';
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB: fotos de celular, no profesionales.
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE },
});

function handleImageUpload(req: Request, res: Response, next: NextFunction) {
  upload.single('image')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: `La imagen no puede superar ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`,
      });
    }
    if (err) {
      return res.status(400).json({ error: 'No se pudo procesar la imagen' });
    }
    next();
  });
}

router.post('/:id/image', handleImageUpload, async (req, res) => {
  const { id } = req.params;

  if (!isUuid(id)) {
    return res.status(400).json({ error: 'id debe ser un uuid valido' });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'Falta el archivo "image"' });
  }

  const extension = ALLOWED_IMAGE_TYPES[file.mimetype];
  if (!extension) {
    return res.status(400).json({
      error: 'La imagen tiene que ser JPEG, PNG o WEBP',
    });
  }

  const path = `${randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file.buffer, { contentType: file.mimetype });

  if (uploadError) {
    return res.status(500).json({ error: `No se pudo subir la imagen: ${uploadError.message}` });
  }

  const { data: publicUrlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);

  const { data, error } = await supabase
    .from('products')
    .update({ image_url: publicUrlData.publicUrl })
    .eq('id', id)
    .select(PRODUCT_SELECT)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: 'No existe un producto con ese id' });
  }

  res.json({ data });
});

export default router;
