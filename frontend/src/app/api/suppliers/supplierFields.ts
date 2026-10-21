import "server-only";
import { isOptionalText } from "@/lib/server/validate";

export const MAX_NAME_LENGTH = 120;
const MAX_CONTACT_LENGTH = 500;
const MAX_PAYMENT_LENGTH = 120;
const MAX_NOTES_LENGTH = 1000;

const clean = (value: unknown) => (typeof value === "string" && value.trim() !== "" ? value.trim() : null);

/**
 * Valida los campos editables de un proveedor. `partial`: solo los que vienen
 * (PATCH); si no, el nombre es obligatorio (alta). Devuelve las columnas
 * limpias para guardar, o el mensaje del primer problema.
 */
export function parseSupplierFields(
  body: Record<string, unknown>,
  partial: boolean,
): { fields: Record<string, unknown> } | { error: string } {
  const { name, contact_info, payment_method, shipping_cost, notes } = body;
  const fields: Record<string, unknown> = {};

  if (name !== undefined || !partial) {
    if (typeof name !== "string" || name.trim() === "" || name.trim().length > MAX_NAME_LENGTH) {
      return { error: `name es obligatorio (texto de hasta ${MAX_NAME_LENGTH} caracteres)` };
    }
    fields.name = name.trim();
  }
  if (!isOptionalText(contact_info, MAX_CONTACT_LENGTH)) {
    return { error: `contact_info debe ser texto de hasta ${MAX_CONTACT_LENGTH} caracteres` };
  }
  if (!isOptionalText(payment_method, MAX_PAYMENT_LENGTH)) {
    return { error: `payment_method debe ser texto de hasta ${MAX_PAYMENT_LENGTH} caracteres` };
  }
  if (!isOptionalText(notes, MAX_NOTES_LENGTH)) {
    return { error: `notes debe ser texto de hasta ${MAX_NOTES_LENGTH} caracteres` };
  }
  if (
    shipping_cost !== undefined &&
    shipping_cost !== null &&
    (typeof shipping_cost !== "number" || !Number.isFinite(shipping_cost) || shipping_cost < 0)
  ) {
    return { error: "shipping_cost debe ser un numero mayor o igual a 0" };
  }

  if (contact_info !== undefined) fields.contact_info = clean(contact_info);
  if (payment_method !== undefined) fields.payment_method = clean(payment_method);
  if (notes !== undefined) fields.notes = clean(notes);
  if (shipping_cost !== undefined) fields.shipping_cost = shipping_cost ?? 0;
  return { fields };
}
