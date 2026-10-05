// Pruebas de la gestión de variantes: "Eliminar" (borra, o archiva si hay
// historial), re-agregar una combinación archivada, la limpieza única,
// "Agregar variante" (varios modelos, duplicados, reglas según el producto),
// la búsqueda dentro de la lista y el rótulo "Universal".
//
// Mismos requisitos que los otros scripts: Supabase LOCAL arriba con las
// migraciones aplicadas y el frontend corriendo (`npm run dev`). Uso:
//
//   npm run test:variantes
//
// Crea sus propios datos y los borra al terminar.

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { missingToAdd, suggestedPrice, variantRules } from "../src/app/admin/catalogo/addVariantRules.ts";
import { suggestSku } from "../src/app/admin/productos/sku.ts";
import {
  UNIVERSAL_LABEL,
  filterBySearch,
  matchesSearch,
  searchTokens,
  variantHaystack,
} from "../src/lib/variantSearch.ts";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin .env.local: se usan las variables del entorno.
}

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SECRET_KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_SECRET_KEY.");
  process.exit(2);
}
if (!["127.0.0.1", "localhost"].includes(new URL(SUPABASE_URL).hostname)) {
  console.error("Este script crea y borra datos: solo corre contra Supabase LOCAL.");
  process.exit(2);
}

const RUN = Date.now().toString(36);
const MARK = `ZZ TEST VARIANTES ${RUN}`;
const FAKE_ID = "00000000-0000-4000-8000-000000000000";

const admin = createClient(SUPABASE_URL, SECRET_KEY, { auth: { persistSession: false } });
const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

// --- mini framework ----------------------------------------------------------

const results = [];
let currentGroup = "";

function group(name) {
  currentGroup = name;
  console.log(`\n${name}`);
}

function check(name, ok, detail = "") {
  results.push({ group: currentGroup, name, ok: !!ok });
  console.log(`  ${ok ? "OK  " : "FALLA"} ${name}${!ok && detail ? ` -> ${detail}` : ""}`);
}

const eq = (name, actual, expected) =>
  check(
    name,
    JSON.stringify(actual) === JSON.stringify(expected),
    `esperado ${JSON.stringify(expected)}, vino ${JSON.stringify(actual)}`,
  );

let cookieHeader = "";

async function api(method, path, body, { auth = true } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    redirect: "manual",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(auth ? { Cookie: cookieHeader } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // No es JSON.
  }
  return { status: res.status, body: json, text };
}

async function signIn(email, password) {
  const jar = new Map();
  const client = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`No se pudo iniciar sesión: ${error.message}`);
  for (let i = 0; i < 50 && jar.size === 0; i++) await new Promise((r) => setTimeout(r, 20));
  if (jar.size === 0) throw new Error("El login no dejó cookies de sesión");
  cookieHeader = [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
  return data.session.access_token;
}

/** Todas las variantes de un producto (también las archivadas), directo de la base. */
async function variantsOf(productId) {
  const { data } = await admin
    .from("product_variants")
    .select("id, sku, color, color_id, motif_id, price, stock_quantity, active, iphone_model_id, iphone_models(name, sort_order)")
    .eq("product_id", productId);
  return (data ?? [])
    .map((v) => ({ ...v, price: Number(v.price) }))
    .sort((a, b) => (a.iphone_models?.sort_order ?? 999) - (b.iphone_models?.sort_order ?? 999) || a.sku.localeCompare(b.sku));
}

const row = async (id) => (await admin.from("product_variants").select("id, active, stock_quantity, price, sku").eq("id", id).maybeSingle()).data;

/** El producto como lo ve el panel (GET /api/products). */
const adminProduct = async (id) => (await api("GET", "/api/products")).body.data.find((p) => p.id === id);

// --- datos de prueba ---------------------------------------------------------

const created = { userId: null, categoryIds: [], supplierId: null, saleIds: [], orderIds: [] };

async function cleanup() {
  if (created.orderIds.length > 0) {
    const { data } = await admin.from("web_orders").select("sale_id").in("id", created.orderIds);
    created.saleIds.push(...(data ?? []).map((o) => o.sale_id).filter(Boolean));
    await admin.from("web_orders").delete().in("id", created.orderIds);
  }
  if (created.saleIds.length > 0) await admin.from("sales").delete().in("id", created.saleIds.filter(Boolean));
  if (created.supplierId) {
    await admin.from("purchases").delete().eq("supplier_id", created.supplierId);
    await admin.from("suppliers").delete().eq("id", created.supplierId);
  }
  await admin.from("products").delete().like("name", `${MARK}%`);
  await admin.from("colors").delete().like("name", `${MARK}%`);
  await admin.from("motifs").delete().like("name", `${MARK}%`);
  for (const id of [...created.categoryIds].reverse()) await admin.from("categories").delete().eq("id", id);
  if (created.userId) await admin.auth.admin.deleteUser(created.userId);
}

// --- pruebas -----------------------------------------------------------------

async function main() {
  console.log(`App: ${BASE_URL} · Supabase: ${SUPABASE_URL} · corrida ${RUN}`);

  const home = await fetch(BASE_URL).catch(() => null);
  if (!home) throw new Error(`La app no responde en ${BASE_URL}. Levantala con "npm run dev".`);

  const email = `test-variantes-${RUN}@example.com`;
  const password = `Test-${RUN}-${Math.random().toString(36).slice(2)}`;
  const { data: user, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (userError) throw new Error(`No se pudo crear el usuario de prueba: ${userError.message}`);
  created.userId = user.user.id;
  const accessToken = await signIn(email, password);

  const { data: modelRows } = await admin.from("iphone_models").select("id, name").in("name", ["iPhone 13", "iPhone 15", "iPhone 16", "iPhone 16 Pro"]);
  const model = (name) => modelRows.find((m) => m.name === name);
  const [m13, m15, m16, m16p] = ["iPhone 13", "iPhone 15", "iPhone 16", "iPhone 16 Pro"].map(model);
  if (!m13 || !m15 || !m16 || !m16p) throw new Error("Hacen falta los modelos iPhone 13, 15, 16 y 16 Pro en la base local.");

  async function newCategory(name, parentId = null) {
    const { data, error } = await admin.from("categories").insert({ name, parent_id: parentId }).select("id, name, slug").single();
    if (error) throw new Error(`No se pudo crear la categoría ${name}: ${error.message}`);
    created.categoryIds.push(data.id);
    return data;
  }
  const { data: accessories } = await admin.from("categories").select("id").eq("slug", "accesorios").single();
  const fundas = await newCategory(`${MARK} Fundas`);
  const fundasTipo = await newCategory(`${MARK} Tipo`, fundas.id);
  const cables = await newCategory(`${MARK} Cables`, accessories.id);

  const newColor = async (name, hex) => (await api("POST", "/api/colors", { name: `${MARK} ${name}`, hex })).body.data;
  const azul = await newColor("Azul", "#2563eb");
  const rojo = await newColor("Rojo", "#d92d20");
  const verde = await newColor("Verde", "#2e9e5b");
  const motif = (await api("POST", "/api/motifs", { name: `${MARK} Dragón` })).body.data;

  let skuSeq = 0;
  async function newProduct(name, categoryId, variants) {
    const res = await api("POST", "/api/products", { category_id: categoryId, name: `${MARK} ${name}` });
    if (res.status !== 201) throw new Error(`No se pudo crear ${name}: ${res.text}`);
    for (const v of variants) {
      skuSeq += 1;
      const r = await api("POST", "/api/product-variants", { product_id: res.body.data.id, sku: `TV-${RUN}-${skuSeq}`, stock_quantity: 0, ...v });
      if (r.status !== 201) throw new Error(`No se pudo crear una variante de ${name}: ${r.text}`);
    }
    return res.body.data;
  }
  const add = (productId, body) => api("POST", `/api/products/${productId}/variants`, body);
  const del = (variantId, query = "") => api("DELETE", `/api/product-variants/${variantId}${query}`);
  const supplier = (await api("POST", "/api/suppliers", { name: MARK })).body.data;
  created.supplierId = supplier.id;

  // ------------------------------------------------------------------------
  group("0. Sin sesión y permisos");
  eq("POST /api/products/:id/variants sin sesión -> 401", (await api("POST", `/api/products/${FAKE_ID}/variants`, {}, { auth: false })).status, 401);
  eq("DELETE /api/product-variants/:id sin sesión -> 401", (await api("DELETE", `/api/product-variants/${FAKE_ID}`, undefined, { auth: false })).status, 401);
  const authed = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } } });
  const rpcCalls = {
    add_product_variants: { p_product_id: FAKE_ID, p_kind: "text", p_attr_id: null, p_text: null, p_models: [null] },
    delete_variant: { p_variant_id: FAKE_ID },
    purge_archived_variants: {},
    variant_reference_count: { p_variant_id: FAKE_ID },
  };
  for (const [fn, args] of Object.entries(rpcCalls)) {
    for (const [role, client] of [["anon", anon], ["authenticated", authed]]) {
      const { error } = await client.rpc(fn, args);
      check(`${fn} con rol ${role} -> permiso denegado`, error?.code === "42501", `code ${error?.code ?? "sin error"}`);
    }
  }
  const { data: gone } = await admin.rpc("add_color_to_category", { p_category_id: fundas.id, p_color_id: azul.id, p_dry_run: true });
  check("las funciones de la matriz ya no existen en la base", (await admin.rpc("apply_attribute_cells", { p_product_id: FAKE_ID, p_kind: "color", p_attr_id: FAKE_ID, p_models: [null], p_active: true })).error?.code === "PGRST202" && gone !== undefined);
  eq("…ni su endpoint", (await api("POST", `/api/products/${FAKE_ID}/cells`, {})).status, 404);

  // ------------------------------------------------------------------------
  group("1. Agregar variante con varios modelos");
  const funda = await newProduct("Funda", fundasTipo.id, [
    { iphone_model_id: m13.id, color: azul.name, price: 9000, stock_quantity: 4 },
    { iphone_model_id: m15.id, color: azul.name, price: 9500, stock_quantity: 0 },
  ]);
  const dry = await add(funda.id, { kind: "color", attr_id: rojo.id, models: [m13.id, m15.id, m16.id], stock: 2, dry_run: true });
  eq("vista previa: crearía 3", [dry.status, dry.body?.data?.created, dry.body?.data?.dry_run], [200, 3, true]);
  eq("…sin crear nada", (await variantsOf(funda.id)).length, 2);
  const many = await add(funda.id, { kind: "color", attr_id: rojo.id, models: [m13.id, m15.id, m16.id], stock: 2 });
  eq("POST -> 200: una variante por modelo elegido", [many.status, many.body?.data?.created, many.body?.data?.reactivated, many.body?.data?.existing], [200, 3, 0, 0]);
  const rojos = (await variantsOf(funda.id)).filter((v) => v.color_id === rojo.id);
  eq("…una por modelo", rojos.map((v) => v.iphone_model_id), [m13.id, m15.id, m16.id]);
  eq("…con el stock cargado", rojos.map((v) => v.stock_quantity), [2, 2, 2]);
  eq("precio sin indicar: el de otra variante del mismo modelo; modelo nuevo, el de otra del producto", rojos.map((v) => v.price), [9000, 9500, 9500]);
  eq("SKU armado solo, con la lógica de siempre", rojos.map((v) => v.sku), [m13, m15, m16].map((m) => suggestSku(funda.name, m.name, rojo.name)));
  eq("la respuesta trae los SKU", many.body.data.skus, rojos.map((v) => v.sku));
  const priced = await add(funda.id, { kind: "color", attr_id: verde.id, models: [m13.id], stock: 1, price: 12345, sku: `TV-${RUN}-PROPIO` });
  const verde13 = (await variantsOf(funda.id)).find((v) => v.color_id === verde.id);
  eq("con precio y SKU indicados (un solo modelo) los respeta", [priced.status, verde13.price, verde13.sku, verde13.stock_quantity], [200, 12345, `TV-${RUN}-PROPIO`, 1]);
  eq("SKU indicado que ya existe -> 400", (await add(funda.id, { kind: "color", attr_id: verde.id, models: [m15.id], sku: `TV-${RUN}-PROPIO` })).status, 400);

  group("1b. Duplicados");
  const dup = await add(funda.id, { kind: "color", attr_id: rojo.id, models: [m13.id], stock: 9 });
  eq("misma combinación que ya existe: no duplica y avisa en qué modelo", [dup.status, dup.body?.data?.created, dup.body?.data?.existing, dup.body?.data?.already], [200, 0, 1, ["iPhone 13"]]);
  eq("…y no toca el stock de la que ya estaba", rojos[0].stock_quantity === (await row(rojos[0].id)).stock_quantity, true);
  const partial = await add(funda.id, { kind: "color", attr_id: rojo.id, models: [m13.id, m16p.id], stock: 1 });
  eq("parte existe y parte no: crea solo lo que falta", [partial.body?.data?.created, partial.body?.data?.existing, partial.body?.data?.already], [1, 1, ["iPhone 13"]]);
  eq("…sin duplicar filas", (await variantsOf(funda.id)).filter((v) => v.color_id === rojo.id && v.iphone_model_id === m13.id).length, 1);

  group("1c. Validación");
  eq("sin modelos -> 400", (await add(funda.id, { kind: "color", attr_id: rojo.id, models: [] })).status, 400);
  eq("modelo repetido -> 400", (await add(funda.id, { kind: "color", attr_id: rojo.id, models: [m13.id, m13.id] })).status, 400);
  eq("modelo inexistente -> 404", (await add(funda.id, { kind: "color", attr_id: rojo.id, models: [FAKE_ID] })).status, 404);
  eq("kind inválido -> 400", (await add(funda.id, { kind: "talle", attr_id: rojo.id, models: [m13.id] })).status, 400);
  eq("color sin attr_id -> 400", (await add(funda.id, { kind: "color", models: [m13.id] })).status, 400);
  eq("stock negativo -> 400", (await add(funda.id, { kind: "color", attr_id: rojo.id, models: [m13.id], stock: -1 })).status, 400);
  eq("stock con decimales -> 400", (await add(funda.id, { kind: "color", attr_id: rojo.id, models: [m13.id], stock: 1.5 })).status, 400);
  eq("precio 0 -> 400", (await add(funda.id, { kind: "color", attr_id: rojo.id, models: [m13.id], price: 0 })).status, 400);
  eq("producto inexistente -> 404", (await add(FAKE_ID, { kind: "color", attr_id: rojo.id, models: [m13.id] })).status, 404);
  eq("color inexistente -> 404", (await add(funda.id, { kind: "color", attr_id: FAKE_ID, models: [m13.id] })).status, 404);
  const noColor = await add(funda.id, { kind: "text", text: "sin color", models: [m16p.id] });
  eq("una funda que usa colores no acepta una variante sin color -> 400", [noColor.status, /usa colores/.test(noColor.body?.error ?? "")], [400, true]);
  const withMotif = await add(funda.id, { kind: "motif", attr_id: motif.id, models: [m13.id] });
  eq("ni un motivo (usa colores)", [withMotif.status, withMotif.body?.error], [400, "Este producto usa colores: no puede tener motivos"]);

  // ------------------------------------------------------------------------
  group("2. La ventana según el tipo de producto");
  const fundaAdmin = await adminProduct(funda.id);
  eq("funda con colores: siempre 'Un iPhone' y pide Color", variantRules(fundaAdmin.product_variants, false), { fixedTarget: "iphone", kind: "color", firstAttribute: null });
  const cable = await newProduct("Cable", cables.id, [{ iphone_model_id: null, color: "Tipo C a C", price: 3000, stock_quantity: 5 }]);
  const cableAdmin = await adminProduct(cable.id);
  eq("cable (accesorio sin motivos): siempre 'Universal' y pide Descripción", variantRules(cableAdmin.product_variants, true), { fixedTarget: "universal", kind: "text", firstAttribute: null });
  const protector = await newProduct("Protector", cables.id, [{ iphone_model_id: null, price: 6500, stock_quantity: 3 }]);
  await add(protector.id, { kind: "motif", attr_id: motif.id, models: [null] });
  eq("protector con motivos: 'Universal' y pide Motivo", variantRules((await adminProduct(protector.id)).product_variants, true), { fixedTarget: "universal", kind: "motif", firstAttribute: null });
  const empty = await newProduct("Vacío", fundas.id, []);
  eq("funda sin variantes: hay que preguntar 'Para' y pide Color", variantRules([], false), { fixedTarget: null, kind: "color", firstAttribute: null });
  eq("accesorio sin variantes: hay que preguntar 'Para' y pide Descripción", variantRules([], true), { fixedTarget: null, kind: "text", firstAttribute: null });
  const plain = await newProduct("Lisa", fundas.id, [
    { iphone_model_id: m13.id, price: 8000, stock_quantity: 3 },
    { iphone_model_id: m15.id, price: 8000, stock_quantity: 2 },
  ]);
  eq("funda sin color: el primer color va a sus variantes actuales (aviso con cantidad y stock)", variantRules((await adminProduct(plain.id)).product_variants, false), { fixedTarget: "iphone", kind: "color", firstAttribute: { variants: 2, units: 5 } });

  eq("precio sugerido: el de otra variante del mismo modelo", suggestedPrice(fundaAdmin.product_variants, [m13.id]), 12345);
  eq("…con varios modelos, el más frecuente del producto", suggestedPrice([{ iphone_model_id: "a", price: 100 }, { iphone_model_id: "b", price: 200 }, { iphone_model_id: "c", price: 200 }], ["a", "b"]), 200);
  eq("…modelo que el producto no tiene: el más frecuente", suggestedPrice([{ iphone_model_id: "a", price: 100 }, { iphone_model_id: "b", price: 200 }, { iphone_model_id: "c", price: 200 }], ["z"]), 200);
  eq("…producto sin variantes: sin sugerencia", suggestedPrice([], ["a"]), null);
  const form = { productChosen: true, target: "iphone", modelCount: 1, kind: "color", attributeChosen: true, usesAttribute: true, stock: "", price: "9000" };
  eq("botón: con todo cargado no falta nada", missingToAdd(form), null);
  eq("botón: sin producto", missingToAdd({ ...form, productChosen: false }), "Elegí el producto.");
  eq("botón: sin 'Para'", missingToAdd({ ...form, target: null }), "Elegí si es para un iPhone o universal.");
  eq("botón: sin modelos", missingToAdd({ ...form, modelCount: 0 }), "Elegí al menos un modelo.");
  eq("botón: universal no pide modelos", missingToAdd({ ...form, target: "universal", modelCount: 0 }), null);
  eq("botón: sin color en un producto que usa colores", missingToAdd({ ...form, attributeChosen: false }), "Elegí el color.");
  eq("botón: sin motivo en uno que usa motivos", missingToAdd({ ...form, kind: "motif", attributeChosen: false }), "Elegí el motivo.");
  eq("botón: el color es opcional si el producto todavía no usa colores", missingToAdd({ ...form, attributeChosen: false, usesAttribute: false }), null);
  eq("botón: sin precio", missingToAdd({ ...form, price: "" }), "Poné el precio (mayor a 0).");
  eq("botón: stock inválido", missingToAdd({ ...form, stock: "1.5" }), "El stock tiene que ser un entero mayor o igual a 0.");

  group("2b. Las reglas que se mantienen, contra el servidor");
  const describe = await add(cable.id, { kind: "text", text: "Tipo C a Lightning", models: [null], stock: 2 });
  eq("cable: agrega una variante con descripción libre", [describe.status, describe.body?.data?.created], [200, 1]);
  const cableRows = await variantsOf(cable.id);
  eq("…universal, con su texto, sin color ni motivo, y el precio copiado", cableRows.filter((v) => v.color === "Tipo C a Lightning").map((v) => [v.iphone_model_id, v.color_id, v.motif_id, v.price, v.stock_quantity]), [[null, null, null, 3000, 2]]);
  eq("…la misma descripción con otra mayúscula no duplica", (await add(cable.id, { kind: "text", text: "tipo c a lightning", models: [null] })).body?.data?.already, ["Universal"]);
  const colorInAccessory = await add(cable.id, { kind: "color", attr_id: rojo.id, models: [null] });
  eq("los colores no se ofrecen en Accesorios: el servidor los rechaza", [colorInAccessory.status, /Accesorios/.test(colorInAccessory.body?.error ?? "")], [400, true]);
  const motifOnText = await add(cable.id, { kind: "motif", attr_id: motif.id, models: [null] });
  eq("un producto con descripción libre no acepta un motivo", [motifOnText.status, /descripción libre/.test(motifOnText.body?.error ?? "")], [400, true]);
  eq("un producto con motivos no acepta una variante de texto", (await add(protector.id, { kind: "text", text: "x", models: [null] })).body?.error, "Este producto usa motivos: elegí el motivo de la variante");
  const firstDry = await add(plain.id, { kind: "color", attr_id: azul.id, models: [m13.id], stock: 7, dry_run: true });
  eq("primer color (vista previa): 2 variantes pasan a ese color, 5 u., nada nuevo", [firstDry.body?.data?.assigned, firstDry.body?.data?.units, firstDry.body?.data?.created], [2, 5, 0]);
  const plainBefore = await variantsOf(plain.id);
  const first = await add(plain.id, { kind: "color", attr_id: azul.id, models: [m13.id], stock: 7 });
  eq("primer color: se asigna a las variantes existentes, sin crear", [first.body?.data?.assigned, first.body?.data?.created], [2, 0]);
  eq("…que conservan stock, precio y SKU", (await variantsOf(plain.id)).map((v) => [v.id, v.color_id, v.stock_quantity, v.price, v.sku]), plainBefore.map((v) => [v.id, azul.id, v.stock_quantity, v.price, v.sku]));
  const emptyAdd = await add(empty.id, { kind: "text", text: "", models: [m13.id], stock: 1 });
  eq("producto sin variantes y sin precio -> 400 (no hay de dónde copiarlo)", [emptyAdd.status, /Poné el precio/.test(emptyAdd.body?.error ?? "")], [400, true]);
  eq("…con precio, crea la primera", (await add(empty.id, { kind: "text", text: "", models: [m13.id], stock: 1, price: 5000 })).body?.data?.created, 1);

  // ------------------------------------------------------------------------
  group("3. Eliminar una variante sin referencias");
  const noStock = rojos[1]; // iPhone 15 Rojo: lo dejamos sin stock
  await api("PATCH", `/api/product-variants/${noStock.id}`, { stock_quantity: 0 });
  const delDry = await del(noStock.id, "?dry_run=1");
  eq("vista previa: se borraría, sin tocar nada", [delDry.status, delDry.body?.data?.deleted, delDry.body?.data?.archived, !!(await row(noStock.id))], [200, true, false, true]);
  const delRes = await del(noStock.id);
  eq("DELETE -> 200: eliminada", [delRes.status, delRes.body?.data?.deleted, delRes.body?.data?.archived, delRes.body?.data?.references], [200, true, false, 0]);
  eq("…la fila ya no existe", await row(noStock.id), null);
  eq("eliminarla de nuevo -> 404", (await del(noStock.id)).status, 404);
  eq("id que no es uuid -> 400", (await del("x")).status, 400);

  const withStock = rojos[0]; // iPhone 13 Rojo, 2 u.
  const blocked = await del(withStock.id);
  eq("con stock y sin confirmar: no hace nada y avisa las unidades", [blocked.status, blocked.body?.data?.blocked, blocked.body?.data?.units, blocked.body?.data?.deleted], [200, true, 2, false]);
  eq("…sigue ahí", (await row(withStock.id))?.active, true);
  const forced = await del(withStock.id, "?force=1");
  eq("confirmado: se elimina (se pierden las 2 u.)", [forced.body?.data?.deleted, await row(withStock.id)], [true, null]);

  // ------------------------------------------------------------------------
  group("4. Eliminar una variante con historial: queda archivada y oculta");
  const sold = (await variantsOf(funda.id)).find((v) => v.color_id === azul.id && v.iphone_model_id === m13.id); // 4 u.
  const bought = (await variantsOf(funda.id)).find((v) => v.color_id === rojo.id && v.iphone_model_id === m16.id); // 2 u.
  const reserved = (await variantsOf(funda.id)).find((v) => v.color_id === rojo.id && v.iphone_model_id === m16p.id); // 1 u.

  const sale = await api("POST", "/api/sales", { payment_method: "efectivo", notes: MARK, items: [{ variant_id: sold.id, quantity: 1, unit_price: sold.price }] });
  created.saleIds.push(sale.body?.data?.id);
  const purchase = await api("POST", "/api/purchases", { supplier_id: supplier.id, items: [{ variant_id: bought.id, quantity: 3, unit_cost: 3000 }] });
  const order = await api("POST", "/api/tienda/reservas", { customer_name: MARK, customer_phone: "261 555 0000", items: [{ variant_id: reserved.id, quantity: 1 }] }, { auth: false });
  created.orderIds.push(order.body?.data?.id);
  eq("preparación: venta, compra y reserva web -> 201", [sale.status, purchase.status, order.status], [201, 201, 201]);
  await api("POST", `/api/web-orders/${order.body.data.id}/cancel`, { reason: "Prueba" });

  const cases = [
    ["con una venta", sold, 1],
    ["con una compra", bought, 1],
    ["con una reserva web", reserved, 1],
  ];
  for (const [label, v, refs] of cases) {
    const res = await del(v.id, "?force=1");
    eq(`${label}: se archiva, no se borra`, [res.status, res.body?.data?.archived, res.body?.data?.deleted, res.body?.data?.references], [200, true, false, refs]);
    const after = await row(v.id);
    eq(`${label}: la fila sigue, inactiva y con stock 0`, [after?.active, after?.stock_quantity], [false, 0]);
  }
  const archivedIds = cases.map(([, v]) => v.id);
  const panel = await adminProduct(funda.id);
  eq("no aparecen en las listas del panel (Catálogo, Ventas)", panel.product_variants.filter((v) => archivedIds.includes(v.id)).length, 0);
  check("…y lo que se ve está todo activo", panel.product_variants.length > 0 && panel.product_variants.every((v) => v.active));
  eq("no cuentan en los chips de colores (Azul queda con 1 variante)", panel.product_variants.filter((v) => v.color_id === azul.id).length, 1);
  eq("no se ven en la tienda", (await anon.from("product_variants").select("id").in("id", archivedIds)).data.length, 0);
  const lastCosts = (await api("GET", "/api/purchases/last-costs")).body.data;
  check("Compras sigue teniendo su costo en el historial", lastCosts.some((c) => c.variant_id === bought.id && c.unit_cost === 3000));
  eq("eliminar una archivada otra vez -> 404 (ya no existe para el panel)", (await del(sold.id)).status, 404);
  const { data: saleItems } = await admin.from("sale_items").select("quantity").eq("variant_id", sold.id);
  eq("el item de venta sigue en el historial", saleItems.map((i) => i.quantity), [1]);
  const from = new Date(Date.now() - 3600_000).toISOString();
  const to = new Date(Date.now() + 3600_000).toISOString();
  const history = (await api("GET", `/api/sales?${new URLSearchParams({ from, to, page: "1", page_size: "100" })}`)).body.data.find((s) => s.id === sale.body.data.id);
  eq("…y el historial muestra producto, modelo y color", [history?.sale_items?.[0]?.variant?.product?.name, history?.sale_items?.[0]?.variant?.iphone_model?.name, history?.sale_items?.[0]?.variant?.color], [funda.name, "iPhone 13", azul.name]);
  const { error: hardDelete } = await admin.from("product_variants").delete().eq("id", sold.id);
  eq("la base no deja borrar a mano una variante con ventas", hardDelete?.code, "23503");
  eq("cuenta de referencias por las claves foráneas", [(await admin.rpc("variant_reference_count", { p_variant_id: sold.id })).data, (await admin.rpc("variant_reference_count", { p_variant_id: bought.id })).data, (await admin.rpc("variant_reference_count", { p_variant_id: reserved.id })).data], [1, 1, 1]);

  // ------------------------------------------------------------------------
  group("5. Re-agregar una combinación archivada");
  const back = await add(funda.id, { kind: "color", attr_id: azul.id, models: [m13.id], stock: 6, price: 9900 });
  eq("se reactiva sola (no crea otra)", [back.status, back.body?.data?.reactivated, back.body?.data?.created], [200, 1, 0]);
  const revived = await row(sold.id);
  eq("…la misma fila, con su SKU, el stock y el precio que se cargan ahora", [revived.active, revived.sku, revived.stock_quantity, revived.price], [true, sold.sku, 6, 9900]);
  eq("…y su historial", (await admin.rpc("variant_reference_count", { p_variant_id: sold.id })).data, 1);
  eq("sin filas duplicadas para esa combinación", (await variantsOf(funda.id)).filter((v) => v.color_id === azul.id && v.iphone_model_id === m13.id).length, 1);
  check("vuelve a verse en el panel", (await adminProduct(funda.id)).product_variants.some((v) => v.id === sold.id));

  const buyBack = await api("POST", "/api/purchases", {
    supplier_id: supplier.id,
    products: [{ product_id: funda.id, rows: [{ iphone_model_id: m16.id, color: rojo.name, sku: `TV-${RUN}-NUEVO`, price: 9700, quantity: 5, unit_cost: 3100 }] }],
  });
  eq("desde Compras, cargar como nueva una combinación archivada -> 201", buyBack.status, 201);
  const boughtBack = await row(bought.id);
  eq("…la reactiva con su SKU de siempre, el precio nuevo y el stock de la compra", [boughtBack.active, boughtBack.sku, boughtBack.price, boughtBack.stock_quantity], [true, bought.sku, 9700, 5]);
  eq("…sin crear una variante con el SKU nuevo", (await admin.from("product_variants").select("id").eq("sku", `TV-${RUN}-NUEVO`)).data.length, 0);
  const buyDup = await api("POST", "/api/purchases", {
    supplier_id: supplier.id,
    products: [{ product_id: funda.id, rows: [{ iphone_model_id: m16.id, color: rojo.name, sku: `TV-${RUN}-NUEVO2`, price: 9700, quantity: 1, unit_cost: 3100 }] }],
  });
  eq("…y si la combinación está activa, sigue rechazando el duplicado", buyDup.status, 409);

  // ------------------------------------------------------------------------
  group("6. Limpieza única de las que estaban dadas de baja");
  const legacy = await newProduct("Legado", fundas.id, [
    { iphone_model_id: m13.id, color: azul.name, price: 5000, stock_quantity: 1 },
    { iphone_model_id: m15.id, color: azul.name, price: 5000, stock_quantity: 0 },
    { iphone_model_id: m16.id, color: azul.name, price: 5000, stock_quantity: 0 },
  ]);
  const [keepActive, inactiveFree, inactiveUsed] = await variantsOf(legacy.id);
  await api("POST", "/api/purchases", { supplier_id: supplier.id, items: [{ variant_id: inactiveUsed.id, quantity: 1, unit_cost: 2000 }] });
  // Como quedaban antes: dadas de baja a mano, con y sin historial.
  await admin.from("product_variants").update({ active: false }).in("id", [inactiveFree.id, inactiveUsed.id]);
  const { data: purged, error: purgeError } = await admin.rpc("purge_archived_variants");
  check("la limpieza corre", !purgeError, purgeError?.message);
  check("borra la dada de baja sin referencias", purged >= 1 && (await row(inactiveFree.id)) === null, `borró ${purged}`);
  eq("la que tiene historial queda archivada", (await row(inactiveUsed.id))?.active, false);
  eq("no toca las activas", (await row(keepActive.id))?.active, true);
  eq("idempotente: la segunda vez no borra nada", (await admin.rpc("purge_archived_variants")).data, 0);
  eq("no queda ninguna inactiva sin referencias en toda la base", (await admin.from("product_variants").select("id").eq("active", false)).data.length >= 1 && (await admin.rpc("purge_archived_variants")).data, 0);

  // ------------------------------------------------------------------------
  group("7. Búsqueda dentro de la lista de variantes");
  const list = [
    { model: "iPhone 16", label: "Azul", sku: "S-16-AZU" },
    { model: "iPhone 16 Plus", label: "Azul marino", sku: "S-16P-AZU" },
    { model: "iPhone 16 Pro", label: "Azul", sku: "S-16P-AZU-2" },
    { model: "iPhone 16 Pro Max", label: "Bordó", sku: "S-16PM-BOR" },
    { model: "iPhone 15", label: "Azul", sku: "S-15-AZU" },
    { model: "iPhone 13", label: "Rojo", sku: "S-13-ROJ" },
    { model: null, label: "Tipo C a C", sku: "CAB-CC" },
  ];
  const hay = (v) => variantHaystack(v.model, v.label, v.sku);
  const find = (q) => filterBySearch(list, q, hay).map((v) => v.sku);
  eq("búsqueda vacía: todas", find("  ").length, list.length);
  eq('"iphone 16" trae 16, 16 Plus, 16 Pro y 16 Pro Max', find("iphone 16"), ["S-16-AZU", "S-16P-AZU", "S-16P-AZU-2", "S-16PM-BOR"]);
  eq('"16 pro azul": tienen que cumplirse todas las palabras', find("16 pro azul"), ["S-16P-AZU-2"]);
  eq("el orden de las palabras no importa", find("azul pro 16"), ["S-16P-AZU-2"]);
  eq("ignora mayúsculas", find("AZUL MARINO"), ["S-16P-AZU"]);
  eq('ignora tildes: "bordo" encuentra Bordó', find("bordo"), ["S-16PM-BOR"]);
  eq('…y "BORDÓ" también', find("BORDÓ"), ["S-16PM-BOR"]);
  eq("busca por SKU", find("s-13"), ["S-13-ROJ"]);
  eq("busca por descripción libre", find("c a c"), ["CAB-CC"]);
  eq('"universal" encuentra la que no tiene modelo', find("universal"), ["CAB-CC"]);
  eq("sin coincidencias: ninguna", find("fucsia"), []);
  eq("espacios de más no molestan", searchTokens("  16   Pro "), ["16", "pro"]);
  eq("una palabra que no está descarta la fila", matchesSearch("iPhone 16 Pro Azul", searchTokens("16 max")), false);
  const big = Array.from({ length: 139 }, (_, i) => ({ model: `iPhone ${11 + (i % 8)}`, label: `Color ${i}`, sku: `S-${i}` }));
  const t0 = performance.now();
  for (let i = 0; i < 200; i++) filterBySearch(big, "iphone 16 color 7", hay);
  const perFilter = (performance.now() - t0) / 200;
  check(`con 139 variantes cada filtrado tarda menos de 5 ms (tardó ${perFilter.toFixed(3)} ms)`, perFilter < 5);

  group("8. \"Universal\" en vez de \"Sin modelo\"");
  eq("rótulo de una variante sin modelo", UNIVERSAL_LABEL, "Universal");
  eq("el servidor también lo llama así al avisar un duplicado", (await add(cable.id, { kind: "text", text: "Tipo C a C", models: [null] })).body?.data?.already, ["Universal"]);

  // ------------------------------------------------------------------------
  group("9. Colores por categoría (se mantiene) y SKU");
  const catProduct = await newProduct("De categoría", fundasTipo.id, [{ iphone_model_id: m13.id, color: azul.name, price: 4000 }]);
  const catDry = await api("POST", `/api/categories/${fundas.id}/colors`, { color_id: verde.id, dry_run: true });
  check("vista previa por categoría incluye los productos de su tipo", catDry.status === 200 && catDry.body.data.changed.some((c) => c.product_id === catProduct.id));
  eq("…y no crea nada", (await variantsOf(catProduct.id)).length, 1);
  await api("POST", `/api/categories/${fundas.id}/colors`, { color_id: verde.id });
  eq("agrega el color en los modelos de cada producto, con stock 0", (await variantsOf(catProduct.id)).filter((v) => v.color_id === verde.id).map((v) => [v.iphone_model_id, v.stock_quantity, v.price]), [[m13.id, 0, 4000]]);
  eq("Accesorios sigue rechazado", (await api("POST", `/api/categories/${accessories.id}/colors`, { color_id: verde.id })).status, 400);
  eq("…y un tipo de Accesorios también", (await api("DELETE", `/api/categories/${cables.id}/colors/${verde.id}`)).status, 400);
  for (const [product, modelName, colorName] of [["Funda de silicona degradé", "iPhone 14 Pro Max", "rojo"], ["Colour Case", "iPhone 17 Air", "Azul marino"], ["Silicona", "", "Bordó"]]) {
    const { data } = await admin.rpc("suggest_sku", { p_product: product, p_model: modelName, p_color: colorName });
    eq(`el SKU en SQL es el del panel: "${product}" + "${modelName}" + "${colorName}"`, data, suggestSku(product, modelName, colorName));
  }
}

let crashed = null;
try {
  await main();
} catch (err) {
  crashed = err;
} finally {
  await cleanup().catch((err) => console.error(`\nNo se pudo limpiar todo: ${err.message}`));
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${"=".repeat(60)}`);
console.log(`${results.length - failed.length}/${results.length} pruebas OK`);
for (const f of failed) console.log(`  FALLA [${f.group}] ${f.name}`);
if (crashed) console.error(`\nEl script se cortó: ${crashed.stack ?? crashed}`);
process.exit(failed.length > 0 || crashed ? 1 : 0);
