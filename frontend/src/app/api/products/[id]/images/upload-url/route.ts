import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import {
  MAX_PRODUCT_IMAGE_SIZE,
  MAX_PRODUCT_IMAGE_SIZE_MB,
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_IMAGE_EXTENSIONS,
} from "@/lib/productImages";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { isPositiveInt, isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Paso 1 de la subida de una foto: el archivo NO pasa por acá (Vercel limita
// el tamaño del body). Se valida tipo y tamaño y se devuelve un token firmado
// para que el navegador suba directo a Storage; después POST .../images
// registra la foto. El bucket vuelve a hacer cumplir tipo y tamaño.
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/products/[id]/images/upload-url">,
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { content_type, size } = await readJsonBody(request);

  if (!isUuid(id)) {
    return jsonError(400, "id debe ser un uuid valido");
  }

  const extension = typeof content_type === "string" ? PRODUCT_IMAGE_EXTENSIONS[content_type] : undefined;
  if (!extension) {
    return jsonError(400, "La imagen tiene que ser JPEG, PNG o WEBP");
  }

  if (!isPositiveInt(size)) {
    return jsonError(400, "size debe ser el tamaño del archivo en bytes");
  }

  if (size > MAX_PRODUCT_IMAGE_SIZE) {
    return jsonError(400, `La imagen no puede superar ${MAX_PRODUCT_IMAGE_SIZE_MB}MB`);
  }

  const supabase = supabaseAdmin();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (productError) return jsonError(500, productError.message);
  if (!product) return jsonError(404, "No existe un producto con ese id");

  const { data, error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .createSignedUploadUrl(`${randomUUID()}.${extension}`);

  if (error || !data) {
    return jsonError(500, `No se pudo preparar la subida: ${error?.message ?? "error desconocido"}`);
  }

  return jsonData({ path: data.path, token: data.token, signed_url: data.signedUrl });
}
