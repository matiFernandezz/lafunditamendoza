import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { colorRpc } from "@/lib/server/colorManagement";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

const SPEC_SELECT =
  "bundle_color_id, bundle_motif_id, component_product_id, component_color_id, component_motif_id, quantity";

/** Cómo se arma el combo (sus partes) y cómo quedó cada variante. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/products/[id]/bundle">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  const supabase = supabaseAdmin();
  const [specs, report] = await Promise.all([
    supabase.from("bundle_specs").select(SPEC_SELECT).eq("bundle_product_id", id).order("sort_order"),
    supabase.rpc("bundle_report", { p_product_id: id }),
  ]);
  const error = specs.error ?? report.error;
  if (error) return jsonError(500, error.message);
  return jsonData({ specs: specs.data, report: report.data });
}

// Guarda las partes del combo: { specs } con { bundle_color_id?, bundle_motif_id?,
// component_product_id, component_color_id?, component_motif_id?, quantity? };
// [] deja de ser combo. Arma cada variante y recalcula su stock (el menor de sus partes).
export async function PUT(request: NextRequest, ctx: RouteContext<"/api/products/[id]/bundle">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  const { specs } = await readJsonBody(request);
  const optionalUuid = (value: unknown) => value === undefined || value === null || isUuid(value);
  if (
    !Array.isArray(specs) ||
    specs.length > 20 ||
    !specs.every(
      (s) =>
        s &&
        typeof s === "object" &&
        isUuid(s.component_product_id) &&
        optionalUuid(s.bundle_color_id) &&
        optionalUuid(s.bundle_motif_id) &&
        optionalUuid(s.component_color_id) &&
        optionalUuid(s.component_motif_id) &&
        (s.quantity === undefined || (Number.isInteger(s.quantity) && s.quantity >= 1 && s.quantity <= 10)),
    )
  ) {
    return jsonError(400, "specs debe ser una lista de partes (producto y, si hace falta, color o diseño)");
  }

  return colorRpc("set_bundle_specs", { p_product_id: id, p_specs: specs });
}
