// Sube las fotos iniciales de los 41 productos (recortadas del catalogo
// original de WhatsApp Business, ver supabase/catalogo_import/) al bucket
// "product-images" y actualiza products.image_url. Idempotente: usa el id
// resuelto del producto como nombre de archivo fijo (upsert), asi que volver
// a correrlo reemplaza la misma imagen en vez de duplicarla.
//
// El manifest.id es solo el nombre del archivo en product_photos/ (el id que
// tenia el producto en la base donde se generaron los recortes) -- el
// producto real se resuelve por NAME en el ambiente donde corra el script,
// porque local y produccion tienen ids distintos (cada import genero sus
// propios uuids con gen_random_uuid()).
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Faltan las variables de entorno SUPABASE_URL y/o SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = 'product-images';
const CATALOGO_DIR = path.join(__dirname, '..', '..', 'supabase', 'catalogo_import');
const PHOTOS_DIR = path.join(CATALOGO_DIR, 'product_photos');
const MANIFEST_PATH = path.join(CATALOGO_DIR, 'product_photos_manifest.json');

type ManifestEntry = { id: string; name: string; page: number; row: number };

async function main() {
  const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  let uploaded = 0;
  const failed: string[] = [];

  for (const entry of manifest) {
    const filePath = path.join(PHOTOS_DIR, `${entry.id}.png`);
    if (!fs.existsSync(filePath)) {
      failed.push(`${entry.name}: no se encontro el archivo ${filePath}`);
      continue;
    }

    const { data: product, error: findError } = await supabase
      .from('products')
      .select('id')
      .eq('name', entry.name)
      .maybeSingle();

    if (findError) {
      failed.push(`${entry.name}: ${findError.message}`);
      continue;
    }

    if (!product) {
      failed.push(`${entry.name}: no existe un producto con ese nombre en este ambiente`);
      continue;
    }

    const productId = product.id;
    const buffer = fs.readFileSync(filePath);
    const storagePath = `${productId}.png`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: 'image/png', upsert: true });

    if (uploadError) {
      failed.push(`${entry.name}: ${uploadError.message}`);
      continue;
    }

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    const { data: updated, error: updateError } = await supabase
      .from('products')
      .update({ image_url: publicUrlData.publicUrl })
      .eq('id', productId)
      .select('id');

    if (updateError) {
      failed.push(`${entry.name}: ${updateError.message}`);
      continue;
    }

    if (!updated || updated.length === 0) {
      failed.push(`${entry.name}: el update no afecto ninguna fila (id ${productId})`);
      continue;
    }

    uploaded++;
    console.log(`OK  ${entry.name} -> ${publicUrlData.publicUrl}`);
  }

  console.log(`\n${uploaded}/${manifest.length} imagenes subidas y asociadas.`);
  if (failed.length > 0) {
    console.log('Fallaron:');
    failed.forEach((f) => console.log(' -', f));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('FALLO el import de imagenes:', err);
  process.exit(1);
});
