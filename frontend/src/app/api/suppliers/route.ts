import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { isOptionalText } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_NAME_LENGTH = 120;
const MAX_CONTACT_LENGTH = 500;

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await supabaseAdmin()
    .from("suppliers")
    .select("id, name, contact_info")
    .order("name", { ascending: true });

  if (error) return jsonError(500, error.message);
  return jsonData(data);
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { name, contact_info } = await readJsonBody(request);

  if (typeof name !== "string" || name.trim() === "" || name.trim().length > MAX_NAME_LENGTH) {
    return jsonError(400, `name es obligatorio (texto de hasta ${MAX_NAME_LENGTH} caracteres)`);
  }

  if (!isOptionalText(contact_info, MAX_CONTACT_LENGTH)) {
    return jsonError(
      400,
      `contact_info debe ser texto de hasta ${MAX_CONTACT_LENGTH} caracteres (o no enviarse)`,
    );
  }

  const contact = typeof contact_info === "string" ? contact_info.trim() : "";

  const { data, error } = await supabaseAdmin()
    .from("suppliers")
    .insert({ name: name.trim(), contact_info: contact === "" ? null : contact })
    .select("id, name, contact_info")
    .single();

  if (error || !data) return jsonError(500, error?.message ?? "No se pudo crear el proveedor");
  return jsonData(data, 201);
}
