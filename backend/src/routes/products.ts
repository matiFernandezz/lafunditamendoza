import { randomUUID } from 'crypto';
import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { supabase } from '../lib/supabaseClient';
import { isPositiveNumber, isUuid } from '../lib/validate';

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
       product_variants ( id, sku, color, price, cost_price, stock_quantity, active, iphone_model_id ),
       product_images ( id, url, sort_order )`
    )
    .order('name', { ascending: true })
    .order('sort_order', { referencedTable: 'product_images', ascending: true });

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

// Mismo precio para todas las variantes del producto (todos los modelos y
// colores), en un solo UPDATE: o cambian todas o ninguna.
router.patch('/:id/price', async (req, res) => {
  const { id } = req.params;
  const { price } = req.body ?? {};

  if (!isUuid(id)) {
    return res.status(400).json({ error: 'id debe ser un uuid valido' });
  }

  if (!isPositiveNumber(price)) {
    return res.status(400).json({ error: 'price debe ser un numero mayor a 0' });
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (productError) {
    return res.status(500).json({ error: productError.message });
  }

  if (!product) {
    return res.status(404).json({ error: 'No existe un producto con ese id' });
  }

  const { data, error } = await supabase
    .from('product_variants')
    .update({ price })
    .eq('product_id', id)
    .select('id, product_id, iphone_model_id, color, sku, price, cost_price, stock_quantity, active');

  if (error) {
    return res.status(500).json({ error: error.message });
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

/** Extrae el path dentro del bucket a partir de la URL publica que guardamos. */
function storagePathFromUrl(url: string): string | null {
  const marker = `/object/public/${IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
}

router.post('/:id/images', handleImageUpload, async (req, res) => {
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

  const { data: existing, error: existingError } = await supabase
    .from('product_images')
    .select('sort_order')
    .eq('product_id', id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return res.status(500).json({ error: existingError.message });
  }

  const nextSortOrder = existing ? existing.sort_order + 1 : 0;
  const path = `${randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file.buffer, { contentType: file.mimetype });

  if (uploadError) {
    return res.status(500).json({ error: `No se pudo subir la imagen: ${uploadError.message}` });
  }

  const { data: publicUrlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);

  const { data, error } = await supabase
    .from('product_images')
    .insert({ product_id: id, url: publicUrlData.publicUrl, sort_order: nextSortOrder })
    .select('id, url, sort_order')
    .single();

  if (error?.code === '23503') {
    return res.status(404).json({ error: 'No existe un producto con ese id' });
  }

  if (error || !data) {
    return res.status(500).json({ error: error?.message ?? 'No se pudo guardar la imagen' });
  }

  res.status(201).json({ data });
});

router.delete('/:id/images/:imageId', async (req, res) => {
  const { id, imageId } = req.params;

  if (!isUuid(id) || !isUuid(imageId)) {
    return res.status(400).json({ error: 'id e imageId deben ser uuids validos' });
  }

  const { data, error } = await supabase
    .from('product_images')
    .delete()
    .eq('id', imageId)
    .eq('product_id', id)
    .select('url')
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: 'No existe esa imagen para ese producto' });
  }

  const storagePath = storagePathFromUrl(data.url);
  if (storagePath) {
    // Si falla el borrado en Storage no hacemos fallar el request: la fila ya
    // se borro y es lo que importa para el catalogo; el archivo huerfano no
    // es visible para nadie.
    await supabase.storage.from(IMAGE_BUCKET).remove([storagePath]);
  }

  res.status(204).end();
});

router.patch('/:id/images/reorder', async (req, res) => {
  const { id } = req.params;
  const { order } = req.body ?? {};

  if (!isUuid(id)) {
    return res.status(400).json({ error: 'id debe ser un uuid valido' });
  }

  if (!Array.isArray(order) || order.length === 0 || !order.every(isUuid)) {
    return res.status(400).json({ error: 'order debe ser un array de uuids' });
  }

  const { data: current, error: currentError } = await supabase
    .from('product_images')
    .select('id')
    .eq('product_id', id);

  if (currentError) {
    return res.status(500).json({ error: currentError.message });
  }

  const currentIds = new Set(current.map((row) => row.id));
  const sameSet = order.length === currentIds.size && order.every((imgId) => currentIds.has(imgId));
  if (!sameSet) {
    return res.status(400).json({
      error: 'order tiene que incluir exactamente las imagenes actuales del producto, sin repetir',
    });
  }

  for (const [index, imageId] of order.entries()) {
    const { error } = await supabase
      .from('product_images')
      .update({ sort_order: index })
      .eq('id', imageId);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  const { data, error } = await supabase
    .from('product_images')
    .select('id, url, sort_order')
    .eq('product_id', id)
    .order('sort_order', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ data });
});

export default router;
