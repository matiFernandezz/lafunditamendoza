import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { PRODUCT_SELECT } from "@/lib/server/selects";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH } from "./limits";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const categoryId = request.nextUrl.searchParams.get("category_id");

  if (categoryId !== null && !isUuid(categoryId)) {
    return jsonError(400, "category_id debe ser un uuid valido");
  }

  let query = supabaseAdmin()
    .from("products")
    .select(
      `${PRODUCT_SELECT},
       product_variants ( id, sku, color, color_id, price, cost_price, stock_quantity, active, iphone_model_id ),
       product_images ( id, url, sort_order, color_id )`,
    )
    .order("name", { ascending: true })
    .order("sort_order", { referencedTable: "product_images", ascending: true });

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;

  if (error) return jsonError(500, error.message);
  return jsonData(data);
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { category_id, name, description, active } = await readJsonBody(request);

  if (!isUuid(category_id)) {
    return jsonError(400, "category_id debe ser un uuid valido");
  }

  if (typeof name !== "string" || name.trim() === "" || name.trim().length > MAX_NAME_LENGTH) {
    return jsonError(400, `name es obligatorio (texto de hasta ${MAX_NAME_LENGTH} caracteres)`);
  }

  if (
    description !== undefined &&
    description !== null &&
    (typeof description !== "string" || description.length > MAX_DESCRIPTION_LENGTH)
  ) {
    return jsonError(
      400,
      `description debe ser texto de hasta ${MAX_DESCRIPTION_LENGTH} caracteres (o no enviarse)`,
    );
  }

  if (active !== undefined && typeof active !== "boolean") {
    return jsonError(400, "active debe ser true o false (o no enviarse)");
  }

  const trimmedDescription = typeof description === "string" ? description.trim() : "";

  const { data, error } = await supabaseAdmin()
    .from("products")
    .insert({
      category_id,
      name: name.trim(),
      description: trimmedDescription === "" ? null : trimmedDescription,
      active: active ?? true,
    })
    .select(PRODUCT_SELECT)
    .single();

  if (error?.code === "23503") {
    return jsonError(400, "La categoria indicada no existe");
  }

  if (error || !data) return jsonError(500, error?.message ?? "No se pudo crear el producto");
  return jsonData(data, 201);
}
