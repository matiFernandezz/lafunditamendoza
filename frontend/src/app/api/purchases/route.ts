import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { isOptionalText, isPositiveInt, isPositiveNumber, isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH } from "../products/limits";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NOTES_LENGTH = 1000;
const MAX_COLOR_LENGTH = 60;
const MAX_SKU_LENGTH = 64;

type PurchaseItemInput = { variant_id: string; quantity: number; unit_cost: number };

function validateItems(items: unknown): items is PurchaseItemInput[] {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const { variant_id, quantity, unit_cost } = item as Record<string, unknown>;
    return isUuid(variant_id) && isPositiveInt(quantity) && isPositiveNumber(unit_cost);
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Formato grilla (ver create_purchase_grid): bloques por producto, existente
 * o nuevo, con sus filas. Devuelve los bloques limpios para la función SQL, o
 * el mensaje del primer problema.
 */
function parseProducts(products: unknown): { blocks: Record<string, unknown>[] } | { error: string } {
  if (!Array.isArray(products) || products.length === 0) {
    return { error: "products debe ser un array no vacio de bloques de producto" };
  }

  const blocks: Record<string, unknown>[] = [];
  const seenVariants = new Set<string>();
  const seenSkus = new Set<string>();

  for (const [index, block] of products.entries()) {
    const where = `products[${index}]`;
    if (!isObject(block)) return { error: `${where} debe ser un objeto` };

    const clean: Record<string, unknown> = {};
    const isNew = block.new_product !== undefined && block.new_product !== null;

    if (isNew) {
      if (!isObject(block.new_product)) return { error: `${where}.new_product debe ser un objeto` };
      const { category_id, name, description } = block.new_product;
      if (!isUuid(category_id)) return { error: `${where}.new_product.category_id debe ser un uuid valido` };
      if (typeof name !== "string" || name.trim() === "" || name.trim().length > MAX_NAME_LENGTH) {
        return { error: `${where}.new_product.name es obligatorio (texto de hasta ${MAX_NAME_LENGTH} caracteres)` };
      }
      if (!isOptionalText(description, MAX_DESCRIPTION_LENGTH)) {
        return {
          error: `${where}.new_product.description debe ser texto de hasta ${MAX_DESCRIPTION_LENGTH} caracteres`,
        };
      }
      clean.new_product = { category_id, name: name.trim(), description: description ?? null };
    } else {
      if (!isUuid(block.product_id)) return { error: `${where}.product_id debe ser un uuid valido` };
      clean.product_id = block.product_id;
    }

    if (block.new_sale_price !== undefined && block.new_sale_price !== null) {
      if (isNew) return { error: `${where}.new_sale_price no aplica a un producto nuevo` };
      if (!isPositiveNumber(block.new_sale_price)) {
        return { error: `${where}.new_sale_price debe ser un numero mayor a 0 (o no enviarse)` };
      }
      clean.new_sale_price = block.new_sale_price;
    }

    if (!Array.isArray(block.rows) || block.rows.length === 0) {
      return { error: `${where}.rows debe ser un array no vacio` };
    }

    const rows: Record<string, unknown>[] = [];
    for (const [rowIndex, row] of block.rows.entries()) {
      const rowWhere = `${where}.rows[${rowIndex}]`;
      if (!isObject(row)) return { error: `${rowWhere} debe ser un objeto` };
      if (!isPositiveInt(row.quantity)) return { error: `${rowWhere}.quantity debe ser un entero mayor a 0` };
      if (!isPositiveNumber(row.unit_cost)) return { error: `${rowWhere}.unit_cost debe ser un numero mayor a 0` };

      if (row.variant_id !== undefined && row.variant_id !== null) {
        if (isNew) return { error: `${rowWhere}.variant_id no aplica a un producto nuevo` };
        if (!isUuid(row.variant_id)) return { error: `${rowWhere}.variant_id debe ser un uuid valido` };
        if (seenVariants.has(row.variant_id)) return { error: `${rowWhere}: la variante esta repetida en la compra` };
        seenVariants.add(row.variant_id);
        rows.push({ variant_id: row.variant_id, quantity: row.quantity, unit_cost: row.unit_cost });
        continue;
      }

      const { iphone_model_id, color, sku, price } = row;
      if (iphone_model_id !== undefined && iphone_model_id !== null && !isUuid(iphone_model_id)) {
        return { error: `${rowWhere}.iphone_model_id debe ser un uuid valido (o null)` };
      }
      if (!isOptionalText(color, MAX_COLOR_LENGTH)) {
        return { error: `${rowWhere}.color debe ser texto de hasta ${MAX_COLOR_LENGTH} caracteres` };
      }
      if (typeof sku !== "string" || sku.trim() === "" || sku.trim().length > MAX_SKU_LENGTH) {
        return { error: `${rowWhere}.sku es obligatorio (texto de hasta ${MAX_SKU_LENGTH} caracteres)` };
      }
      if (seenSkus.has(sku.trim())) return { error: `${rowWhere}: el SKU "${sku.trim()}" esta repetido en la compra` };
      seenSkus.add(sku.trim());
      if (!isPositiveNumber(price)) return { error: `${rowWhere}.price debe ser un numero mayor a 0` };

      rows.push({
        iphone_model_id: iphone_model_id ?? null,
        color: color ?? null,
        sku: sku.trim(),
        price,
        quantity: row.quantity,
        unit_cost: row.unit_cost,
      });
    }

    clean.rows = rows;
    blocks.push(clean);
  }

  return { blocks };
}

/** YYYY-MM-DD que además existe en el calendario (2026-02-31 no). */
function isRealDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_REGEX.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Errores de las funciones SQL de compras que son culpa de los datos enviados.
const BAD_REQUEST_CODES = new Set(["CP400", "CP404", "P0001"]);
// Nombre de producto, SKU o modelo+color que ya existen (CP409), o un SKU que
// alguien creó entre la validación y el insert (23505).
const CONFLICT_CODES = new Set(["CP409", "23505"]);

function statusFor(code: string | undefined) {
  if (code && CONFLICT_CODES.has(code)) return 409;
  return code && BAD_REQUEST_CODES.has(code) ? 400 : 500;
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { supplier_id, purchase_date, notes, items, products } = await readJsonBody(request);

  if (!isUuid(supplier_id)) {
    return jsonError(400, "supplier_id debe ser un uuid valido");
  }

  if (purchase_date !== undefined && !isRealDate(purchase_date)) {
    return jsonError(400, "purchase_date debe tener formato YYYY-MM-DD (o no enviarse)");
  }

  if (!isOptionalText(notes, MAX_NOTES_LENGTH)) {
    return jsonError(400, `notes debe ser texto de hasta ${MAX_NOTES_LENGTH} caracteres (o no enviarse)`);
  }

  // Formato grilla: productos (existentes o nuevos) con sus filas. Productos y
  // variantes nuevas + compra + stock + precios en una sola transacción.
  if (products !== undefined) {
    const parsed = parseProducts(products);
    if ("error" in parsed) return jsonError(400, parsed.error);

    const { data, error } = await supabaseAdmin().rpc("create_purchase_grid", {
      p_supplier_id: supplier_id,
      p_purchase_date: purchase_date ?? null,
      p_notes: notes ?? null,
      p_products: parsed.blocks,
    });

    if (error) return jsonError(statusFor(error.code), error.message);
    return jsonData(data, 201);
  }

  if (!validateItems(items)) {
    return jsonError(
      400,
      "items debe ser un array no vacio de { variant_id (uuid), quantity (entero > 0), unit_cost (numero > 0) }",
    );
  }

  // Compra + items + stock en una sola transacción (función SQL create_purchase).
  const { data, error } = await supabaseAdmin().rpc("create_purchase", {
    p_supplier_id: supplier_id,
    p_purchase_date: purchase_date ?? null,
    p_notes: notes ?? null,
    p_items: items.map(({ variant_id, quantity, unit_cost }) => ({ variant_id, quantity, unit_cost })),
  });

  if (error) {
    return jsonError(statusFor(error.code), error.message);
  }

  return jsonData(data, 201);
}
