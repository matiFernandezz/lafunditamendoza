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
import { STORE_FOLDER } from "@/lib/server/storeContent";
import { isPositiveInt } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Subida de una foto de la tienda, igual que las de producto: el navegador
// sube directo a Storage con este token firmado y después guarda public_url
// donde corresponda (carrusel, mosaico o nuevo ingreso).
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { content_type, size } = await readJsonBody(request);
  const extension = typeof content_type === "string" ? PRODUCT_IMAGE_EXTENSIONS[content_type] : undefined;
  if (!extension) return jsonError(400, "La imagen tiene que ser JPEG, PNG o WEBP");
  if (!isPositiveInt(size)) return jsonError(400, "size debe ser el tamaño del archivo en bytes");
  if (size > MAX_PRODUCT_IMAGE_SIZE) return jsonError(400, `La imagen no puede superar ${MAX_PRODUCT_IMAGE_SIZE_MB}MB`);

  const supabase = supabaseAdmin();
  const path = `${STORE_FOLDER}/${randomUUID()}.${extension}`;
  const { data, error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return jsonError(500, `No se pudo preparar la subida: ${error?.message ?? "error desconocido"}`);
  }
  const publicUrl = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  return jsonData({ path: data.path, token: data.token, public_url: publicUrl });
}
