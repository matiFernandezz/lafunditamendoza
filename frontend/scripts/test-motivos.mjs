// Pruebas de los motivos y de la matriz de colores por modelo: migración de los
// no-colores, celdas (tildar / destildar / retildar), motivos en un protector de
// cargador, exclusión mutua color/motivo, "Unir colores", colores por categoría
// con modelos elegidos y la tienda con los dos ejemplos del pedido.
//
// Mismos requisitos que los otros scripts: Supabase LOCAL arriba con las
// migraciones aplicadas y el frontend corriendo (`npm run dev`). Uso:
//
//   npm run test:motivos
//
// Crea sus propias categorías, productos, colores y motivos, y los borra al terminar.

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { suggestSku } from "../src/app/admin/productos/sku.ts";
import { findSimilar, similarity } from "../src/app/admin/similarNames.ts";
import {
  availableMotifIds,
  imagesForColor,
  imagesForMotif,
  initialMotif,
  motifsWithoutPhotos,
  productColors,
  productMotifs,
  resolveMotif,
  tileDots,
} from "../src/lib/productColors.ts";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin .env.local: se usan las variables del entorno.
}

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const BUCKET = "product-images";

if (!SUPABASE_URL || !ANON_KEY || !SECRET_KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_SECRET_KEY.");
  process.exit(2);
}
if (!["127.0.0.1", "localhost"].includes(new URL(SUPABASE_URL).hostname)) {
  console.error("Este script crea y borra datos: solo corre contra Supabase LOCAL.");
  process.exit(2);
}

const RUN = Date.now().toString(36);
const MARK = `ZZ TEST MOTIVOS ${RUN}`;
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

async function page(path) {
  const res = await fetch(`${BASE_URL}${path}`, { redirect: "manual" });
  return { status: res.status, html: (await res.text()).replace(/<!-- -->/g, "") };
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

// PNG de 1x1 válido.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

/** Variantes de un producto (opcionalmente de un color o motivo), en orden de modelo. */
async function variantsOf(productId, { colorId, motifId } = {}) {
  let query = admin
    .from("product_variants")
    .select("id, sku, color, color_id, motif_id, price, stock_quantity, active, iphone_model_id, iphone_models(name, sort_order)")
    .eq("product_id", productId);
  if (colorId) query = query.eq("color_id", colorId);
  if (motifId) query = query.eq("motif_id", motifId);
  const { data } = await query;
  return (data ?? [])
    .map((v) => ({ ...v, price: Number(v.price) }))
    .sort((a, b) => (a.iphone_models?.sort_order ?? 999) - (b.iphone_models?.sort_order ?? 999) || a.sku.localeCompare(b.sku));
}

/** Los <input type="radio"> del selector de color en el HTML de la ficha. */
function radios(html) {
  return [...html.matchAll(/<input\b[^>]*type="radio"[^>]*>/g)].map(([tag]) => ({
    value: /value="([^"]*)"/.exec(tag)?.[1],
    checked: /\schecked(=|\s|\/|>)/.test(tag),
    disabled: /\sdisabled(=|\s|\/|>)/.test(tag),
    label: /aria-label="([^"]*)"/.exec(tag)?.[1],
  }));
}

/** Las opciones del <select id="motivo-detalle"> de la ficha. */
function motifOptions(html) {
  const select = /<select\b[^>]*id="motivo-detalle"[^>]*>([\s\S]*?)<\/select>/.exec(html);
  if (!select) return null;
  return [...select[1].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(([, attrs, text]) => ({
    value: /value="([^"]*)"/.exec(attrs)?.[1],
    selected: /\sselected(=|\s|$)/.test(` ${attrs} `),
    disabled: /\sdisabled(=|\s|$)/.test(` ${attrs} `),
    text: text.trim(),
  }));
}

const hasMainPhoto = (html, url) => html.includes(`src="${url}"`);

// --- datos de prueba ---------------------------------------------------------

const created = { userId: null, categoryIds: [], supplierId: null, storagePaths: [], orderIds: [] };

async function cleanup() {
  if (created.orderIds.length > 0) await admin.from("web_orders").delete().in("id", created.orderIds);
  if (created.supplierId) {
    await admin.from("purchases").delete().eq("supplier_id", created.supplierId);
    await admin.from("suppliers").delete().eq("id", created.supplierId);
  }
  await admin.from("products").delete().like("name", `${MARK}%`);
  await admin.from("colors").delete().like("name", `${MARK}%`);
  await admin.from("motifs").delete().like("name", `${MARK}%`);
  for (const id of [...created.categoryIds].reverse()) await admin.from("categories").delete().eq("id", id);
  if (created.storagePaths.length > 0) await admin.storage.from(BUCKET).remove(created.storagePaths);
  if (created.userId) await admin.auth.admin.deleteUser(created.userId);
}

// --- pruebas -----------------------------------------------------------------

async function main() {
  console.log(`App: ${BASE_URL} · Supabase: ${SUPABASE_URL} · corrida ${RUN}`);

  const home = await fetch(BASE_URL).catch(() => null);
  if (!home) throw new Error(`La app no responde en ${BASE_URL}. Levantala con "npm run dev".`);

  const email = `test-motivos-${RUN}@example.com`;
  const password = `Test-${RUN}-${Math.random().toString(36).slice(2)}`;
  const { data: user, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (userError) throw new Error(`No se pudo crear el usuario de prueba: ${userError.message}`);
  created.userId = user.user.id;
  const accessToken = await signIn(email, password);

  const { data: modelRows } = await admin.from("iphone_models").select("id, name").in("name", ["iPhone 13", "iPhone 15", "iPhone 16"]);
  const m13 = modelRows.find((m) => m.name === "iPhone 13");
  const m15 = modelRows.find((m) => m.name === "iPhone 15");
  const m16 = modelRows.find((m) => m.name === "iPhone 16");
  if (!m13 || !m15 || !m16) throw new Error("Hacen falta los modelos iPhone 13, 15 y 16 en la base local.");

  async function newCategory(name, parentId = null) {
    const { data, error } = await admin.from("categories").insert({ name, parent_id: parentId }).select("id, name, slug").single();
    if (error) throw new Error(`No se pudo crear la categoría ${name}: ${error.message}`);
    created.categoryIds.push(data.id);
    return data;
  }
  const { data: accessories } = await admin.from("categories").select("id").eq("slug", "accesorios").single();
  const fundas = await newCategory(`${MARK} Fundas`);
  const protectores = await newCategory(`${MARK} Protectores`, accessories.id);

  const newColor = async (name, hex) => (await api("POST", "/api/colors", { name: `${MARK} ${name}`, hex })).body.data;
  const [azul, gris, verde, rojo, amarillo] = [
    await newColor("Azul", "#2563eb"),
    await newColor("Gris", "#9aa0a6"),
    await newColor("Verde", "#2e9e5b"),
    await newColor("Rojo", "#d92d20"),
    await newColor("Amarillo", "#f5c518"),
  ];

  let skuSeq = 0;
  async function newProduct(name, categoryId, variants) {
    const res = await api("POST", "/api/products", { category_id: categoryId, name: `${MARK} ${name}` });
    if (res.status !== 201) throw new Error(`No se pudo crear ${name}: ${res.text}`);
    for (const v of variants) {
      skuSeq += 1;
      const r = await api("POST", "/api/product-variants", { product_id: res.body.data.id, sku: `TM-${RUN}-${skuSeq}`, stock_quantity: 0, ...v });
      if (r.status !== 201) throw new Error(`No se pudo crear una variante de ${name}: ${r.text}`);
    }
    return res.body.data;
  }
  const cells = (productId, body) => api("POST", `/api/products/${productId}/cells`, body);
  const summary = (res) => [res.body?.data?.created, res.body?.data?.reactivated, res.body?.data?.existing, res.body?.data?.deactivated];

  async function upload(productId, extra = {}) {
    const signed = await api("POST", `/api/products/${productId}/images/upload-url`, { content_type: "image/png", size: PNG.length });
    if (signed.status !== 200) throw new Error(`upload-url falló: ${signed.text}`);
    created.storagePaths.push(signed.body.data.path);
    const up = await anon.storage.from(BUCKET).uploadToSignedUrl(signed.body.data.path, signed.body.data.token, PNG, { contentType: "image/png" });
    if (up.error) throw new Error(`subida falló: ${up.error.message}`);
    return api("POST", `/api/products/${productId}/images`, { path: signed.body.data.path, ...extra });
  }

  // ------------------------------------------------------------------------
  group("1. Migración: motivos y no-colores");
  const { data: motifRows, error: motifError } = await admin.from("motifs").select("id, name, slug");
  check("la tabla motifs existe", !motifError, motifError?.message);
  const motifNames = new Set((motifRows ?? []).map((m) => m.name));
  eq("BATMAN, BOB, CAP AMÉRICA e IRON MAN son motivos", ["BATMAN", "BOB", "CAP AMÉRICA", "IRON MAN"].filter((n) => !motifNames.has(n)), []);
  const { data: colorRows } = await admin.from("colors").select("name, assigned");
  const colorNames = colorRows.map((c) => c.name.toLowerCase());
  eq("…y ya no son colores", ["batman", "bob", "cap américa", "iron man"].filter((n) => colorNames.includes(n)), []);
  eq('"Tipo C a …" tampoco es un color', colorNames.filter((n) => /^tipo [a-z] a /.test(n)), []);
  const { data: allVariants } = await admin.from("product_variants").select("sku, color, color_id, motif_id, stock_quantity, price, active");
  const motifNameById = new Map(motifRows.map((m) => [m.id, m.name]));
  const withMotif = allVariants.filter((v) => v.motif_id !== null);
  eq("toda variante con motivo no tiene color", withMotif.filter((v) => v.color_id !== null).length, 0);
  eq("…y su texto es el nombre del motivo", withMotif.filter((v) => v.color !== motifNameById.get(v.motif_id)).length, 0);
  const batman = allVariants.filter((v) => v.color === "BATMAN");
  if (batman.length > 0) check("la variante BATMAN quedó como motivo, con su precio y SKU", batman.every((v) => v.motif_id !== null && v.color_id === null && v.sku && Number(v.price) > 0));
  const cable = allVariants.filter((v) => /^tipo [a-z] a /i.test(v.color ?? ""));
  if (cable.length > 0) check('"Tipo C a Lightning" quedó como descripción libre (sin color ni motivo), con su texto', cable.every((v) => v.color_id === null && v.motif_id === null));
  // Un nombre puede ser color y motivo a la vez (Rosa): esas variantes están enlazadas al color.
  eq("ningún texto de variante coincide con un motivo sin estar enlazado a nada", allVariants.filter((v) => v.motif_id === null && v.color_id === null && v.color && motifNames.has(v.color)).length, 0);
  const { data: syncAgain } = await admin.rpc("sync_colors_from_variants");
  eq("sync_colors_from_variants no vuelve a crear como color lo que es motivo o descripción", syncAgain, 0);
  eq("…y siguen sin estar en colors", (await admin.from("colors").select("name")).data.filter((c) => ["BATMAN", "BOB", "CAP AMÉRICA", "IRON MAN"].includes(c.name) || /^tipo [a-z] a /i.test(c.name)).length, 0);

  group("1b. Permisos");
  const anonMotifs = await anon.from("motifs").select("id, name, slug").limit(3);
  check("anon puede leer motifs", !anonMotifs.error && anonMotifs.data.length > 0, anonMotifs.error?.message);
  check("anon no puede crear motivos", !!(await anon.from("motifs").insert({ name: `${MARK} anon`, slug: `anon-${RUN}` })).error);
  check("anon puede leer product_variants.motif_id", !(await anon.from("product_variants").select("id, motif_id").limit(1)).error);
  check("anon puede leer product_images.motif_id", !(await anon.from("product_images").select("id, motif_id").limit(1)).error);
  check("anon sigue sin poder leer cost_price", !!(await anon.from("product_variants").select("cost_price").limit(1)).error);
  const authed = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } } });
  const rpcCalls = {
    apply_attribute_cells: { p_product_id: FAKE_ID, p_kind: "color", p_attr_id: FAKE_ID, p_models: [null], p_active: true },
    _apply_attribute_cells: { p_product_id: FAKE_ID, p_kind: "color", p_attr_id: FAKE_ID, p_models: [null], p_active: true, p_force: false },
    add_color_to_category_models: { p_category_id: FAKE_ID, p_color_id: FAKE_ID },
    remove_color_from_category_models: { p_category_id: FAKE_ID, p_color_id: FAKE_ID },
    merge_attributes: { p_kind: "color", p_from: FAKE_ID, p_into: FAKE_ID },
  };
  for (const [fn, args] of Object.entries(rpcCalls)) {
    for (const [role, client] of [["anon", anon], ["authenticated", authed]]) {
      const { error } = await client.rpc(fn, args);
      check(`${fn} con rol ${role} -> permiso denegado`, error?.code === "42501", `code ${error?.code ?? "sin error"}`);
    }
  }
  const endpoints = [
    ["GET", "/api/motifs"], ["POST", "/api/motifs"], ["PATCH", `/api/motifs/${FAKE_ID}`], ["DELETE", `/api/motifs/${FAKE_ID}`],
    ["POST", `/api/motifs/${FAKE_ID}/merge`], ["POST", `/api/colors/${FAKE_ID}/merge`], ["POST", `/api/products/${FAKE_ID}/cells`],
  ];
  for (const [method, path] of endpoints) {
    eq(`${method} ${path.replaceAll(FAKE_ID, ":id")} sin sesión -> 401`, (await api(method, path, method === "GET" || method === "DELETE" ? undefined : {}, { auth: false })).status, 401);
  }

  // ------------------------------------------------------------------------
  group("2. Matriz de colores: Silicone con iPhone 15 {Azul, Gris, Verde} e iPhone 13 {Rojo, Amarillo, Azul}");
  const silicone = await newProduct("Silicone", fundas.id, [{ iphone_model_id: m15.id, color: azul.name, price: 9000, stock_quantity: 2 }]);
  const colorCell = (colorId, models, active, extra = {}) => cells(silicone.id, { kind: "color", attr_id: colorId, models, active, ...extra });

  const dryGris = await colorCell(gris.id, [m15.id], true, { dry_run: true });
  eq("vista previa de tildar: crearía 1", [dryGris.status, ...summary(dryGris)], [200, 1, 0, 0, 0]);
  eq("…sin crear nada", (await variantsOf(silicone.id)).length, 1);

  const tGris = await colorCell(gris.id, [m15.id], true);
  eq("tildar (iPhone 15, Gris) crea la variante", [tGris.status, ...summary(tGris)], [200, 1, 0, 0, 0]);
  const grisV = (await variantsOf(silicone.id, { colorId: gris.id }))[0];
  eq("…con stock 0, activa y el precio de otra variante del mismo modelo", [grisV.stock_quantity, grisV.active, grisV.price, grisV.iphone_model_id], [0, true, 9000, m15.id]);
  eq("…y el SKU con la lógica del alta de variantes", grisV.sku, suggestSku(silicone.name, m15.name, gris.name));
  eq("…y el texto es el nombre del color", grisV.color, gris.name);
  await colorCell(verde.id, [m15.id], true);

  // iPhone 13 es un modelo nuevo para el producto: el precio sale de otra variante del producto.
  const tRojo = await colorCell(rojo.id, [m13.id], true);
  eq("tildar un modelo que el producto no tenía: crea la variante", summary(tRojo), [1, 0, 0, 0]);
  eq("…con el precio de otra variante del producto", (await variantsOf(silicone.id, { colorId: rojo.id }))[0].price, 9000);
  await colorCell(amarillo.id, [m13.id], true);
  await colorCell(azul.id, [m13.id], true);

  const matrix = async () => {
    const out = {};
    for (const v of (await variantsOf(silicone.id)).filter((x) => x.active)) (out[v.iphone_models.name] ??= []).push(v.color.replace(`${MARK} `, ""));
    for (const k of Object.keys(out)) out[k].sort();
    return out;
  };
  eq("la matriz quedó como el ejemplo", await matrix(), { "iPhone 13": ["Amarillo", "Azul", "Rojo"], "iPhone 15": ["Azul", "Gris", "Verde"] });
  eq("Gris no se creó para iPhone 13 (los colores son por modelo)", (await variantsOf(silicone.id, { colorId: gris.id })).length, 1);
  check("todos los SKU son distintos", new Set((await variantsOf(silicone.id)).map((v) => v.sku)).size === 6);
  eq("tildar una celda ya tildada no duplica", summary(await colorCell(gris.id, [m15.id], true)), [0, 0, 1, 0]);

  const off = await colorCell(gris.id, [m15.id], false);
  eq("destildar da de baja", summary(off), [0, 0, 0, 1]);
  const grisOff = (await variantsOf(silicone.id, { colorId: gris.id }))[0];
  eq("…la variante sigue en la base, dada de baja", [grisOff.id, grisOff.active], [grisV.id, false]);
  const on = await colorCell(gris.id, [m15.id], true);
  eq("retildar reactiva la misma variante (no crea otra)", [summary(on), (await variantsOf(silicone.id, { colorId: gris.id })).map((v) => [v.id, v.active])], [[0, 1, 0, 0], [[grisV.id, true]]]);

  const azul15 = (await variantsOf(silicone.id, { colorId: azul.id })).find((v) => v.iphone_model_id === m15.id);
  const blocked = await colorCell(azul.id, [m15.id], false);
  eq("destildar algo con stock, sin confirmar: no hace nada", [blocked.body?.data?.blocked, blocked.body?.data?.deactivated, blocked.body?.data?.units], [true, 0, 2]);
  eq("…y devuelve qué variante tiene stock", blocked.body?.data?.with_stock, [{ id: azul15.id, sku: azul15.sku, model: m15.name, stock: 2 }]);
  eq("…la celda sigue tildada", (await variantsOf(silicone.id, { colorId: azul.id })).find((v) => v.id === azul15.id).active, true);
  const forced = await colorCell(azul.id, [m15.id], false, { force: true });
  eq("confirmado: la da de baja sin tocar el stock", [forced.body?.data?.deactivated, (await variantsOf(silicone.id, { colorId: azul.id })).find((v) => v.id === azul15.id).stock_quantity], [1, 2]);
  eq("retildar la reactiva con su stock", [summary(await colorCell(azul.id, [m15.id], true)), (await variantsOf(silicone.id, { colorId: azul.id })).find((v) => v.id === azul15.id).stock_quantity], [[0, 1, 0, 0], 2]);

  eq('"Tildar todos los modelos" de Verde: crea el que falta', summary(await colorCell(verde.id, [m13.id, m15.id], true)), [1, 0, 1, 0]);
  eq('"Ninguno" de Verde: da de baja los dos', summary(await colorCell(verde.id, [m13.id, m15.id], false)), [0, 0, 0, 2]);
  await colorCell(verde.id, [m15.id], true);
  eq("la matriz vuelve a ser la del ejemplo", await matrix(), { "iPhone 13": ["Amarillo", "Azul", "Rojo"], "iPhone 15": ["Azul", "Gris", "Verde"] });

  group("2b. Validación de las celdas");
  eq("sin modelos -> 400", (await colorCell(gris.id, [], true)).status, 400);
  eq("modelo repetido -> 400", (await colorCell(gris.id, [m15.id, m15.id], true)).status, 400);
  eq("modelo que no es uuid -> 400", (await colorCell(gris.id, ["iphone"], true)).status, 400);
  eq("modelo inexistente -> 404", (await colorCell(gris.id, [FAKE_ID], true)).status, 404);
  eq("kind inválido -> 400", (await cells(silicone.id, { kind: "talle", attr_id: gris.id, models: [m15.id], active: true })).status, 400);
  eq("active que no es booleano -> 400", (await cells(silicone.id, { kind: "color", attr_id: gris.id, models: [m15.id], active: "si" })).status, 400);
  eq("color inexistente -> 404", (await colorCell(FAKE_ID, [m15.id], true)).status, 404);
  eq("producto inexistente -> 404", (await cells(FAKE_ID, { kind: "color", attr_id: gris.id, models: [m15.id], active: true })).status, 404);

  // ------------------------------------------------------------------------
  group("3. Producto sin color");
  const plain = await newProduct("Lisa", fundas.id, [
    { iphone_model_id: m13.id, price: 8000, stock_quantity: 3 },
    { iphone_model_id: m15.id, price: 8500, stock_quantity: 2 },
  ]);
  const before = await variantsOf(plain.id);
  const firstDry = await cells(plain.id, { kind: "color", attr_id: rojo.id, models: [m13.id, m15.id], active: true, dry_run: true });
  eq("vista previa: las 2 variantes pasan a ser el color (5 u.), nada nuevo", [firstDry.body?.data?.assigned, firstDry.body?.data?.units, firstDry.body?.data?.created], [2, 5, 0]);
  eq("…sin cambiar nada", (await variantsOf(plain.id)).map((v) => v.color_id), [null, null]);
  // Aunque se pida un solo modelo, el primer color va a TODAS las variantes.
  const first = await cells(plain.id, { kind: "color", attr_id: rojo.id, models: [m13.id], active: true });
  eq("el primer color se asigna a todas las variantes actuales", [first.body?.data?.assigned, first.body?.data?.created], [2, 0]);
  const after = await variantsOf(plain.id);
  eq("son las mismas variantes, con stock, precio y SKU intactos", after.map((v) => [v.id, v.stock_quantity, v.price, v.sku]), before.map((v) => [v.id, v.stock_quantity, v.price, v.sku]));
  eq("…ahora con el color", after.map((v) => [v.color, v.color_id]), [[rojo.name, rojo.id], [rojo.name, rojo.id]]);
  await cells(plain.id, { kind: "color", attr_id: rojo.id, models: [m15.id], active: false, force: true });
  eq("después se destilda el modelo que no lo tiene", (await variantsOf(plain.id)).map((v) => v.active), [true, false]);
  const second = await cells(plain.id, { kind: "color", attr_id: azul.id, models: [m15.id], active: true });
  eq("el segundo color ya es una variante nueva con stock 0", [second.body?.data?.created, second.body?.data?.assigned], [1, 0]);

  const described = await newProduct("Cable", fundas.id, [{ iphone_model_id: null, color: "Tipo C a C de prueba", price: 3000 }]);
  const refusedColor = await cells(described.id, { kind: "color", attr_id: rojo.id, models: [null], active: true });
  eq("producto con descripción libre: no acepta color -> 400", refusedColor.status, 400);
  check("…con mensaje", /descripción libre/.test(refusedColor.body?.error ?? ""), refusedColor.body?.error);

  // ------------------------------------------------------------------------
  group("4. Motivos");
  const motif = async (name) => (await api("POST", "/api/motifs", { name: `${MARK} ${name}` })).body.data;
  const mA = await motif("Araña");
  const mB = await motif("Búho");
  const mC = await motif("Cactus");
  check("POST /api/motifs crea el motivo con slug", /arana$/.test(mA.slug), mA.slug);
  eq("nombre repetido -> 409", (await api("POST", "/api/motifs", { name: `${MARK} ARAÑA` })).status, 409);
  eq("sin nombre -> 400", (await api("POST", "/api/motifs", { name: " " })).status, 400);
  eq("GET /api/motifs lo lista con variant_count 0", (await api("GET", "/api/motifs")).body.data.find((m) => m.id === mA.id)?.variant_count, 0);
  eq("un producto de protector sin motivo no acepta descripción libre", (await cells(described.id, { kind: "motif", attr_id: mA.id, models: [null], active: true })).status, 400);

  // Protector de cargador: Accesorios, sin modelo de iPhone.
  const protector = await newProduct("Protector", protectores.id, [{ iphone_model_id: null, price: 6500, stock_quantity: 3 }]);
  const motifCell = (motifId, active, extra = {}) => cells(protector.id, { kind: "motif", attr_id: motifId, models: [null], active, ...extra });
  const pBefore = (await variantsOf(protector.id))[0];
  const firstMotif = await motifCell(mA.id, true);
  eq("Accesorios acepta motivos; el primero se asigna a la variante actual", [firstMotif.status, firstMotif.body?.data?.assigned, firstMotif.body?.data?.created], [200, 1, 0]);
  const pAfter = (await variantsOf(protector.id))[0];
  eq("…que conserva stock, precio y SKU", [pAfter.id, pAfter.stock_quantity, pAfter.price, pAfter.sku], [pBefore.id, 3, 6500, pBefore.sku]);
  eq("…con motif_id, sin color_id y el texto del motivo", [pAfter.motif_id, pAfter.color_id, pAfter.color], [mA.id, null, mA.name]);

  const addB = await motifCell(mB.id, true);
  eq('"+ Agregar motivo": una variante nueva', summary(addB), [1, 0, 0, 0]);
  const vB = (await variantsOf(protector.id, { motifId: mB.id }))[0];
  eq("…sin modelo, con stock 0 y el precio copiado", [vB.iphone_model_id, vB.stock_quantity, vB.price, vB.active], [null, 0, 6500, true]);
  eq("…y SKU con la lógica del alta", vB.sku, suggestSku(protector.name, "", mB.name));
  await motifCell(mC.id, true);
  eq("el protector queda con 3 motivos, uno por variante", (await variantsOf(protector.id)).map((v) => v.color).sort(), [mA.name, mB.name, mC.name].sort());

  eq("quitar un motivo sin stock: la da de baja", summary(await motifCell(mB.id, false)), [0, 0, 0, 1]);
  eq("…sin borrarla", (await variantsOf(protector.id, { motifId: mB.id })).map((v) => [v.id, v.active]), [[vB.id, false]]);
  eq("volver a agregarlo la reactiva", [summary(await motifCell(mB.id, true)), (await variantsOf(protector.id, { motifId: mB.id })).map((v) => [v.id, v.active])], [[0, 1, 0, 0], [[vB.id, true]]]);
  const stockBlocked = await motifCell(mA.id, false);
  eq("quitar un motivo con stock pide confirmación", [stockBlocked.body?.data?.blocked, stockBlocked.body?.data?.units], [true, 3]);
  eq("…y confirmado lo da de baja", (await motifCell(mA.id, false, { force: true })).body?.data?.deactivated, 1);
  await motifCell(mA.id, true);

  group("4b. Colores en Accesorios y exclusión mutua");
  const colorInAccessory = await cells(protector.id, { kind: "color", attr_id: rojo.id, models: [null], active: true });
  eq("colores en un producto de Accesorios -> 400", [colorInAccessory.status, /Accesorios/.test(colorInAccessory.body?.error ?? "")], [400, true]);
  const motifOnColors = await cells(silicone.id, { kind: "motif", attr_id: mA.id, models: [m15.id], active: true });
  eq("motivo en un producto con colores -> 400", motifOnColors.status, 400);
  eq("…con un aviso claro", motifOnColors.body?.error, "Este producto usa colores: no puede tener motivos");
  eq("…y el producto sigue sin motivos", (await variantsOf(silicone.id)).filter((v) => v.motif_id !== null).length, 0);

  // Funda con modelos que usa motivos: la misma matriz, modelo × motivo.
  const design = await newProduct("Diseño", fundas.id, [
    { iphone_model_id: m13.id, price: 7000, stock_quantity: 1 },
    { iphone_model_id: m15.id, price: 7500, stock_quantity: 1 },
  ]);
  const designCell = (motifId, models, active) => cells(design.id, { kind: "motif", attr_id: motifId, models, active });
  eq("primer motivo en una funda con modelos: se asigna a sus 2 variantes", (await designCell(mA.id, [m13.id, m15.id], true)).body?.data?.assigned, 2);
  eq("segundo motivo, solo en iPhone 15: una variante nueva con el precio de ese modelo", [summary(await designCell(mB.id, [m15.id], true)), (await variantsOf(design.id, { motifId: mB.id })).map((v) => [v.iphone_model_id, v.price, v.stock_quantity])], [[1, 0, 0, 0], [[m15.id, 7500, 0]]]);
  const colorOnMotifs = await cells(design.id, { kind: "color", attr_id: rojo.id, models: [m15.id], active: true });
  eq("color en un producto con motivos -> 400", [colorOnMotifs.status, colorOnMotifs.body?.error], [400, "Este producto usa motivos: no puede tener colores"]);
  const { error: bothError } = await admin.from("product_images").insert({ product_id: design.id, url: `https://example.com/${RUN}.png`, color_id: rojo.id, motif_id: mA.id });
  eq("la base no deja una foto con color y motivo a la vez", bothError?.code, "23514");
  await admin.from("product_variants").update({ color_id: rojo.id, motif_id: mA.id }).eq("id", vB.id);
  const bothVariant = (await variantsOf(protector.id)).find((v) => v.id === vB.id);
  eq("ni una variante: si llegan los dos, queda uno solo", [bothVariant.color_id === null, bothVariant.motif_id === null].filter(Boolean).length, 1);
  await admin.from("product_variants").update({ motif_id: mB.id }).eq("id", vB.id);

  // ------------------------------------------------------------------------
  group("5. Fotos por motivo");
  const gPhoto = (await upload(protector.id)).body.data;
  const aPhotoRes = await upload(protector.id, { motif_id: mA.id });
  eq("foto con motif_id -> 201", [aPhotoRes.status, aPhotoRes.body?.data?.motif_id, aPhotoRes.body?.data?.color_id], [201, mA.id, null]);
  const aPhoto = aPhotoRes.body.data;
  const bPhoto = (await upload(protector.id, { motif_id: mB.id })).body.data;
  eq("foto con color y motivo a la vez -> 400", (await upload(protector.id, { motif_id: mA.id, color_id: rojo.id })).status, 400);
  eq("motivo inexistente -> 404", (await upload(protector.id, { motif_id: FAKE_ID })).status, 404);
  const adminProtector = (await api("GET", "/api/products")).body.data.find((p) => p.id === protector.id);
  eq("GET /api/products trae motif_id en fotos y variantes", [adminProtector.product_images.map((i) => i.motif_id), adminProtector.product_variants.every((v) => "motif_id" in v)], [[null, mA.id, mB.id], true]);
  eq('panel: "Motivo sin foto" marca solo el que no tiene (Cactus)', motifsWithoutPhotos(adminProtector.product_variants, adminProtector.product_images), [mC.id]);
  eq("lógica: fotos del motivo; sin fotos propias, las generales", [imagesForMotif(adminProtector.product_images, mB.id).map((i) => i.id), imagesForMotif(adminProtector.product_images, mC.id).map((i) => i.id)], [[bPhoto.id], [gPhoto.id]]);
  eq("lógica: las fotos de un motivo no cuentan como generales para un color", imagesForColor(adminProtector.product_images, null).map((i) => i.id), [gPhoto.id]);

  // ------------------------------------------------------------------------
  group("6. Tienda: protector con 3 motivos");
  await api("PATCH", `/api/product-variants/${vB.id}`, { stock_quantity: 1 }); // Araña 3, Búho 1, Cactus 0
  const pPath = `/producto/${protector.id}`;
  const pPage = await page(pPath);
  eq("GET ficha -> 200", pPage.status, 200);
  const opts = motifOptions(pPage.html);
  check('hay una lista "Motivo" (un <select>, no círculos)', opts !== null && /<label[^>]*for="motivo-detalle"[^>]*>Motivo<\/label>/.test(pPage.html));
  eq("…con los 3 motivos, también el agotado", opts?.map((o) => o.value), [mA.id, mB.id, mC.id]);
  eq("el motivo sin stock está deshabilitado y dice (sin stock)", opts?.find((o) => o.value === mC.id), { value: mC.id, selected: false, disabled: true, text: `${mC.name} (sin stock)` });
  eq("por defecto, el primero con stock", opts?.find((o) => o.selected)?.value, mA.id);
  eq("sin círculos de color", radios(pPage.html).length, 0);
  check("la foto grande es la del motivo elegido", hasMainPhoto(pPage.html, aPhoto.url) && !hasMainPhoto(pPage.html, bPhoto.url));

  const thumb = (html, url) => html.includes(encodeURIComponent(url));
  check("las miniaturas muestran las fotos de todos los motivos y la general", thumb(pPage.html, aPhoto.url) && thumb(pPage.html, bPhoto.url) && thumb(pPage.html, gPhoto.url));
  eq("…una miniatura por foto", (pPage.html.match(/aria-label="Ver la foto \d+"/g) ?? []).length, 3);

  const pB = await page(`${pPath}?motivo=${mB.slug}`);
  eq("?motivo=<slug> elige ese motivo", motifOptions(pB.html)?.find((o) => o.selected)?.value, mB.id);
  check("al elegir otro motivo cambia la foto", hasMainPhoto(pB.html, bPhoto.url) && !hasMainPhoto(pB.html, aPhoto.url));
  const pC = await page(`${pPath}?motivo=${mC.slug}`);
  eq("?motivo= de uno agotado -> vuelve al primero con stock", motifOptions(pC.html)?.find((o) => o.selected)?.value, mA.id);

  const fx = [
    { iphone_model_id: "x", stock_quantity: 1, motif_ref: { id: "a", name: "A", slug: "a", sort_order: 0 } },
    { iphone_model_id: "y", stock_quantity: 2, motif_ref: { id: "b", name: "B", slug: "b", sort_order: 0 } },
    { iphone_model_id: "y", stock_quantity: 0, motif_ref: { id: "a", name: "A", slug: "a", sort_order: 0 } },
  ];
  const fxMotifs = productMotifs(fx);
  eq("lógica: con modelos, el motivo disponible depende del modelo", [[...availableMotifIds(fx, "x")], [...availableMotifIds(fx, "y")]], [["a"], ["b"]]);
  eq("lógica: al cambiar de modelo, un motivo sin stock salta al disponible", resolveMotif(fxMotifs, availableMotifIds(fx, "y"), "a"), "b");
  eq("lógica: motivo inicial por slug", initialMotif(fxMotifs, availableMotifIds(fx, "x"), "a"), "a");
  eq("lógica: los motivos no generan puntitos en las tarjetas", tileDots(productColors(fx.map(() => ({ color_ref: null })))), { shown: [], extra: 0 });

  const list = await page(`/categoria/accesorios`);
  eq("GET /categoria/accesorios -> 200", list.status, 200);
  check("la tarjeta del protector aparece", list.html.includes(protector.name));
  check("…sin puntitos ni nombres de motivo", !list.html.includes(`title="${mA.name}"`) && !list.html.includes(`title="${mB.name}"`));

  // El mensaje de WhatsApp se arma con el detalle de la reserva: tiene que traer el motivo.
  const order = await api("POST", "/api/tienda/reservas", { customer_name: MARK, customer_phone: "261 555 0000", items: [{ variant_id: vB.id, quantity: 1 }] }, { auth: false });
  eq("reservar la variante de un motivo -> 201", order.status, 201);
  created.orderIds.push(order.body.data.id);
  const reserva = await page(`/reserva/${order.body.data.public_token}`);
  check("la reserva (de donde sale el mensaje de WhatsApp) nombra el producto y el motivo", reserva.html.includes(protector.name) && reserva.html.includes(mB.name));
  await api("POST", `/api/web-orders/${order.body.data.id}/cancel`, { reason: "Prueba" });

  // ------------------------------------------------------------------------
  group("7. Tienda: Silicone con colores por modelo");
  for (const v of await variantsOf(silicone.id)) if (v.active) await api("PATCH", `/api/product-variants/${v.id}`, { stock_quantity: 2 });
  const sGeneral = (await upload(silicone.id)).body.data;
  const sAzul = (await upload(silicone.id, { color_id: azul.id })).body.data;
  const sPath = `/producto/${silicone.id}`;
  const slug = (c) => c.slug;
  const s15 = await page(`${sPath}?modelo=${m15.id}`);
  const r15 = radios(s15.html);
  eq("un círculo por cada color del producto (5)", r15.map((r) => r.value).sort(), [azul, gris, verde, rojo, amarillo].map(slug).sort());
  eq("iPhone 15: se pueden elegir Azul, Gris y Verde", r15.filter((r) => !r.disabled).map((r) => r.value).sort(), [azul, gris, verde].map(slug).sort());
  check("…Rojo y Amarillo apagados con el aviso", r15.filter((r) => r.disabled).every((r) => r.label.includes("Sin stock para iPhone 15")) && r15.filter((r) => r.disabled).length === 2);
  const s13 = await page(`${sPath}?modelo=${m13.id}`);
  const r13 = radios(s13.html);
  eq("iPhone 13: se pueden elegir Rojo, Amarillo y Azul", r13.filter((r) => !r.disabled).map((r) => r.value).sort(), [rojo, amarillo, azul].map(slug).sort());
  eq("…Gris y Verde apagados", r13.filter((r) => r.disabled).map((r) => r.value).sort(), [gris, verde].map(slug).sort());
  eq("sin lista de motivos", motifOptions(s15.html), null);
  const a15 = await page(`${sPath}?modelo=${m15.id}&color=${azul.slug}`);
  const a13 = await page(`${sPath}?modelo=${m13.id}&color=${azul.slug}`);
  check("el Azul comparte foto entre iPhone 15 e iPhone 13", hasMainPhoto(a15.html, sAzul.url) && hasMainPhoto(a13.html, sAzul.url));
  const rj = await page(`${sPath}?modelo=${m13.id}&color=${rojo.slug}`);
  check("Rojo (sin foto propia) muestra la general", hasMainPhoto(rj.html, sGeneral.url) && !hasMainPhoto(rj.html, sAzul.url));
  const g13 = await page(`${sPath}?modelo=${m13.id}&color=${gris.slug}`);
  check("?color=gris en iPhone 13 (no existe ahí) salta a uno disponible", !radios(g13.html).find((r) => r.checked)?.disabled && radios(g13.html).find((r) => r.checked)?.value !== gris.slug);

  // ------------------------------------------------------------------------
  group("8. Unir colores");
  const celeste = await newColor("Celeste", "#7cc4ee");
  const pastel = await newColor("Celeste pastel", "#bfe3f5");
  const merged = await newProduct("Para unir", fundas.id, [
    { iphone_model_id: m15.id, color: celeste.name, price: 5000, stock_quantity: 2 },
    { iphone_model_id: m15.id, color: pastel.name, price: 5000, stock_quantity: 3 },
    { iphone_model_id: m13.id, color: pastel.name, price: 5000, stock_quantity: 1 },
  ]);
  const pastelPhoto = (await upload(merged.id, { color_id: pastel.id })).body.data;
  const pastel15 = (await variantsOf(merged.id, { colorId: pastel.id })).find((v) => v.iphone_model_id === m15.id);
  eq("unir un color consigo mismo -> 400", (await api("POST", `/api/colors/${pastel.id}/merge`, { into: pastel.id })).status, 400);
  eq("unir con uno inexistente -> 404", (await api("POST", `/api/colors/${pastel.id}/merge`, { into: FAKE_ID })).status, 404);
  eq("sin destino -> 400", (await api("POST", `/api/colors/${pastel.id}/merge`, {})).status, 400);
  const merge = await api("POST", `/api/colors/${pastel.id}/merge`, { into: celeste.id });
  eq("POST /api/colors/:id/merge -> 200", merge.status, 200);
  eq("pasa las 2 variantes y la foto; 1 celda repetida se fusiona", [merge.body?.data?.variants, merge.body?.data?.merged, merge.body?.data?.images], [2, 1, 1]);
  eq("el color que sobra se borra", (await admin.from("colors").select("id").eq("id", pastel.id)).data.length, 0);
  const afterMerge = await variantsOf(merged.id);
  eq("todas las variantes quedan en el color que queda", afterMerge.map((v) => [v.color_id, v.color]), afterMerge.map(() => [celeste.id, celeste.name]));
  const active15 = afterMerge.filter((v) => v.iphone_model_id === m15.id && v.active);
  eq("iPhone 15 tenía los dos: queda una sola variante activa con el stock sumado (2 + 3)", active15.map((v) => v.stock_quantity), [5]);
  eq("…la otra queda dada de baja y en 0, no borrada", afterMerge.filter((v) => v.id === pastel15.id).map((v) => [v.active, v.stock_quantity]), [[false, 0]]);
  eq("iPhone 13 solo tenía el que sobra: pasa con su stock", afterMerge.filter((v) => v.iphone_model_id === m13.id).map((v) => [v.active, v.stock_quantity]), [[true, 1]]);
  eq("la foto pasa al color que queda", (await admin.from("product_images").select("color_id").eq("id", pastelPhoto.id).single()).data.color_id, celeste.id);
  eq("no se pierde stock en total", afterMerge.reduce((s, v) => s + v.stock_quantity, 0), 6);

  group("8b. Editar motivos: renombrar, unir, eliminar");
  const renamed = await api("PATCH", `/api/motifs/${mC.id}`, { name: `${MARK} Cactus verde` });
  eq("renombrar un motivo -> 200", renamed.status, 200);
  eq("…renombra el texto de sus variantes", (await variantsOf(protector.id, { motifId: mC.id })).map((v) => v.color), [`${MARK} Cactus verde`]);
  eq("eliminar un motivo en uso -> 409", (await api("DELETE", `/api/motifs/${mC.id}`)).status, 409);
  const spare = await motif("De sobra");
  eq("eliminar un motivo sin uso -> 204", (await api("DELETE", `/api/motifs/${spare.id}`)).status, 204);
  const mergeMotif = await api("POST", `/api/motifs/${mC.id}/merge`, { into: mA.id });
  eq("unir motivos -> 200", [mergeMotif.status, mergeMotif.body?.data?.variants, mergeMotif.body?.data?.merged], [200, 1, 1]);
  eq("…el protector queda con 2 motivos activos", (await variantsOf(protector.id)).filter((v) => v.active).map((v) => v.motif_id).sort(), [mA.id, mB.id].sort());
  const keep = await api("DELETE", `/api/motifs/${mB.id}?keep_text=1`);
  eq('"no es un motivo" (keep_text) -> 204 y la variante conserva el texto', [keep.status, (await variantsOf(protector.id)).find((v) => v.id === vB.id).color, (await variantsOf(protector.id)).find((v) => v.id === vB.id).motif_id], [204, mB.name, null]);
  eq("…y su foto pasa a general", (await admin.from("product_images").select("motif_id").eq("id", bPhoto.id).single()).data.motif_id, null);

  // ------------------------------------------------------------------------
  group("9. Colores por categoría, con modelos elegidos");
  const catA = await newProduct("Cat A", fundas.id, [
    { iphone_model_id: m13.id, color: celeste.name, price: 4000 },
    { iphone_model_id: m15.id, color: celeste.name, price: 4500 },
    { iphone_model_id: m16.id, color: celeste.name, price: 4800 },
  ]);
  const only15 = await api("POST", `/api/categories/${fundas.id}/colors`, { color_id: amarillo.id, model_ids: [m15.id], dry_run: true });
  eq("vista previa con un modelo elegido -> 200", only15.status, 200);
  const changedA = only15.body?.data?.changed.find((c) => c.product_id === catA.id);
  eq("…solo crearía la variante de ese modelo en cada producto", changedA?.created, 1);
  eq("…y avisa los que omite (usa motivos)", only15.body?.data?.skipped.some((s) => s.product_id === design.id && s.reason === "usa motivos"), true);
  eq("…sin crear nada", (await variantsOf(catA.id, { colorId: amarillo.id })).length, 0);
  await api("POST", `/api/categories/${fundas.id}/colors`, { color_id: amarillo.id, model_ids: [m15.id, m16.id] });
  eq("agregar a iPhone 15 y 16: solo esos modelos", (await variantsOf(catA.id, { colorId: amarillo.id })).map((v) => [v.iphone_model_id, v.price]), [[m15.id, 4500], [m16.id, 4800]]);
  eq("…y no toca iPhone 13", (await variantsOf(catA.id, { colorId: amarillo.id })).some((v) => v.iphone_model_id === m13.id), false);
  const allModels = await api("POST", `/api/categories/${fundas.id}/colors`, { color_id: amarillo.id });
  eq("sin model_ids: todos los modelos (completa iPhone 13)", (await variantsOf(catA.id, { colorId: amarillo.id })).length, 3);
  check("…sin duplicar los que ya estaban", allModels.body?.data?.existing >= 2);
  const rmOnly16 = await api("DELETE", `/api/categories/${fundas.id}/colors/${amarillo.id}?models=${m16.id}`);
  eq("quitar solo en iPhone 16 -> 200", rmOnly16.status, 200);
  eq("…da de baja solo ese modelo", (await variantsOf(catA.id, { colorId: amarillo.id })).map((v) => [v.iphone_models.name, v.active]), [["iPhone 13", true], ["iPhone 15", true], ["iPhone 16", false]]);
  eq("model_ids inválido -> 400", (await api("POST", `/api/categories/${fundas.id}/colors`, { color_id: amarillo.id, model_ids: ["x"] })).status, 400);
  eq("model_ids vacío -> 400", (await api("POST", `/api/categories/${fundas.id}/colors`, { color_id: amarillo.id, model_ids: [] })).status, 400);
  eq("Accesorios sigue rechazado", (await api("POST", `/api/categories/${accessories.id}/colors`, { color_id: amarillo.id, model_ids: [m15.id] })).status, 400);

  // ------------------------------------------------------------------------
  group("10. Compras: color o motivo según el producto");
  const supplier = (await api("POST", "/api/suppliers", { name: MARK })).body.data;
  created.supplierId = supplier.id;
  const mD = await motif("Dragón");
  const buy = await api("POST", "/api/purchases", {
    supplier_id: supplier.id,
    products: [
      { product_id: protector.id, rows: [{ iphone_model_id: null, color: mD.name, sku: `TM-${RUN}-BUY-M`, price: 6500, quantity: 4, unit_cost: 2000 }] },
      { product_id: catA.id, rows: [{ iphone_model_id: m13.id, color: verde.name, sku: `TM-${RUN}-BUY-C`, price: 4000, quantity: 2, unit_cost: 1500 }] },
    ],
  });
  eq("compra con una variante nueva de motivo y otra de color -> 201", buy.status, 201);
  const { data: boughtMotif } = await admin.from("product_variants").select("color, color_id, motif_id, stock_quantity").eq("sku", `TM-${RUN}-BUY-M`).single();
  eq("la del protector queda enlazada al motivo", boughtMotif, { color: mD.name, color_id: null, motif_id: mD.id, stock_quantity: 4 });
  const { data: boughtColor } = await admin.from("product_variants").select("color, color_id, motif_id, stock_quantity").eq("sku", `TM-${RUN}-BUY-C`).single();
  eq("la de la funda, al color", boughtColor, { color: verde.name, color_id: verde.id, motif_id: null, stock_quantity: 2 });

  // ------------------------------------------------------------------------
  group("11. El sistema nunca crea colores por su cuenta");
  const invented = `${MARK} Inventado`;
  const colorCount = async () => (await admin.from("colors").select("id", { count: "exact", head: true })).count;
  const colorsBefore = await colorCount();
  const loose = await api("POST", "/api/product-variants", { product_id: catA.id, iphone_model_id: m13.id, color: invented, sku: `TM-${RUN}-INV`, price: 4000 });
  eq("variante con un texto que no es un color existente -> queda como descripción", [loose.status, loose.body?.data?.color, loose.body?.data?.color_id], [201, invented, null]);
  const buyUnknown = await api("POST", "/api/purchases", {
    supplier_id: supplier.id,
    products: [{ product_id: catA.id, rows: [{ iphone_model_id: m15.id, color: `${invented} 2`, sku: `TM-${RUN}-INV2`, price: 4000, quantity: 1, unit_cost: 1500 }] }],
  });
  eq("compra con un color que no existe -> 201, sin crearlo", buyUnknown.status, 201);
  const { data: syncResult } = await admin.rpc("sync_colors_from_variants");
  eq("sync_colors_from_variants (seed e importación) no enlaza nada nuevo", syncResult, 0);
  eq("…y la lista de colores no creció", await colorCount(), colorsBefore);
  eq("…ni hay un color con ese nombre", (await admin.from("colors").select("id").like("name", `${invented}%`)).data.length, 0);
  await admin.from("product_variants").delete().in("sku", [`TM-${RUN}-INV`]);

  group("11b. Aviso de nombre igual o parecido al crear");
  eq("mismo nombre con otra mayúscula -> exacto", similarity("celeste", "Celeste"), "exact");
  eq("mismo nombre sin tilde -> exacto", similarity("Bordo", "Bordó"), "exact");
  eq("con espacios de más -> exacto", similarity(" Rosa  viejo ", "Rosa viejo"), "exact");
  eq("plural -> parecido", similarity("Rosas", "Rosa"), "close");
  eq("una letra cambiada -> parecido", similarity("Negra", "Negro"), "close");
  eq("letras cruzadas -> parecido", similarity("Voileta", "Violeta"), "close");
  eq("una letra de más en un nombre largo -> parecido", similarity("Celeste pastell", "Celeste pastel"), "close");
  eq("Rojo y Rosa no se confunden", similarity("Rojo", "Rosa"), null);
  eq("Azul y Azul marino no se confunden", similarity("Azul", "Azul marino"), null);
  eq("Verde y Verde agua no se confunden", similarity("Verde", "Verde agua"), null);
  eq("Celeste y Celeste pastel no se confunden", similarity("Celeste", "Celeste pastel"), null);
  const palette = [{ name: "Rosa" }, { name: "Rosa viejo" }, { name: "Celeste" }];
  eq("busca primero el exacto", findSimilar("ROSA", palette), { item: { name: "Rosa" }, kind: "exact" });
  eq("…y si no, el parecido", findSimilar("Celestee", palette), { item: { name: "Celeste" }, kind: "close" });
  eq("nombre nuevo de verdad -> sin aviso", findSimilar("Verde menta", palette), null);

  // ------------------------------------------------------------------------
  group("12. Accesorios: las variantes con color pasan a motivo");
  const soloAcc = await newColor("Solo accesorio", "#aa5500");
  const accProduct = await newProduct("Protector con color", protectores.id, [
    { iphone_model_id: null, color: azul.name, price: 3000, stock_quantity: 4 },
    { iphone_model_id: null, color: soloAcc.name, price: 3200, stock_quantity: 0 },
  ]);
  const accPhoto = (await upload(accProduct.id, { color_id: azul.id })).body.data;
  const mMix = await motif("Mixto");
  const mixed = await newProduct("Protector mixto", protectores.id, [
    { iphone_model_id: null, color: rojo.name, price: 3000, stock_quantity: 1 },
    { iphone_model_id: null, color: mMix.name, price: 3000, stock_quantity: 1 },
  ]);
  const accBefore = await variantsOf(accProduct.id);
  eq("antes: el protector tiene variantes con color", accBefore.map((v) => v.color_id !== null), [true, true]);
  const fundasAzulBefore = (await variantsOf(silicone.id, { colorId: azul.id })).map((v) => v.id);

  for (const [role, client] of [["anon", anon], ["authenticated", authed]]) {
    const { error } = await client.rpc("accessory_colors_to_motifs");
    check(`accessory_colors_to_motifs con rol ${role} -> permiso denegado`, error?.code === "42501", `code ${error?.code ?? "sin error"}`);
  }
  const { data: migration, error: migrationError } = await admin.rpc("accessory_colors_to_motifs");
  check("la migración corre", !migrationError, migrationError?.message);
  eq("pasa las 2 variantes y la foto del protector", [migration?.variants, migration?.images], [2, 1]);
  eq("…e informa qué producto tocó", migration?.products.map((x) => x.product_id), [accProduct.id]);
  const accAfter = await variantsOf(accProduct.id);
  eq("son las mismas variantes, con stock, precio y SKU intactos", accAfter.map((v) => [v.id, v.stock_quantity, v.price, v.sku, v.active]), accBefore.map((v) => [v.id, v.stock_quantity, v.price, v.sku, v.active]));
  eq("ahora sin color y con motivo", accAfter.map((v) => [v.color_id, v.motif_id !== null]), [[null, true], [null, true]]);
  eq("el texto no cambia (mismo nombre)", accAfter.map((v) => v.color).sort(), [azul.name, soloAcc.name].sort());
  const { data: newMotifs } = await admin.from("motifs").select("id, name").in("name", [azul.name, soloAcc.name]);
  eq("se crearon los motivos con el mismo nombre", newMotifs.map((m) => m.name).sort(), [azul.name, soloAcc.name].sort());
  eq("la foto pasó al motivo", (await admin.from("product_images").select("color_id, motif_id").eq("id", accPhoto.id).single()).data, { color_id: null, motif_id: newMotifs.find((m) => m.name === azul.name).id });
  const colorsNow = (await api("GET", "/api/colors")).body.data;
  check("el color que también usan las fundas sigue en la lista, en uso", colorsNow.find((c) => c.id === azul.id)?.variant_count > 0);
  eq("el que solo usaba el accesorio NO se borra: queda sin uso", colorsNow.find((c) => c.id === soloAcc.id)?.variant_count, 0);
  eq("las fundas con ese color no se tocan", (await variantsOf(silicone.id, { colorId: azul.id })).map((v) => v.id), fundasAzulBefore);
  eq("el producto con color Y motivo a la vez no se toca: va a 'skipped'", [migration?.skipped.map((x) => x.product_id), (await variantsOf(mixed.id)).filter((v) => v.color_id !== null).length], [[mixed.id], 1]);
  // Azul ahora es color (fundas) y motivo (protector): el texto solo se enlaza según el producto.
  const sameNameMotif = await api("POST", "/api/product-variants", { product_id: accProduct.id, iphone_model_id: m13.id, color: azul.name, sku: `TM-${RUN}-SAME-M`, price: 3000 });
  eq("un nombre que es color y motivo, en un producto con motivos -> se enlaza al motivo", [sameNameMotif.body?.data?.color_id, sameNameMotif.body?.data?.motif_id !== null], [null, true]);
  const sameNameColor = await api("POST", "/api/product-variants", { product_id: catA.id, iphone_model_id: m16.id, color: azul.name, sku: `TM-${RUN}-SAME-C`, price: 4000 });
  eq("…y en una funda con colores -> al color", [sameNameColor.body?.data?.color_id, sameNameColor.body?.data?.motif_id], [azul.id, null]);
  await admin.from("product_variants").delete().in("sku", [`TM-${RUN}-SAME-M`, `TM-${RUN}-SAME-C`]);
  const { data: again } = await admin.rpc("accessory_colors_to_motifs");
  eq("idempotente: la segunda vez no pasa nada (y vuelve a informar el mixto)", [again?.variants, again?.products, again?.skipped.map((x) => x.product_id)], [0, [], [mixed.id]]);
  const accPage = await page(`/producto/${accProduct.id}`);
  check("en la tienda ya no muestra círculos de color", accPage.status === 200 && radios(accPage.html).length === 0);

  // ------------------------------------------------------------------------
  group("13. Editar colores: Pasar a motivo");
  const lunares = await newColor("Lunares", "#333333");
  const dotted = await newProduct("Lunares", fundas.id, [
    { iphone_model_id: m13.id, color: lunares.name, price: 6000, stock_quantity: 2 },
    { iphone_model_id: m15.id, color: lunares.name, price: 6200, stock_quantity: 3 },
  ]);
  const dotPhoto = (await upload(dotted.id, { color_id: lunares.id })).body.data;
  const dottedBefore = await variantsOf(dotted.id);
  eq("sin sesión -> 401", (await api("POST", `/api/colors/${lunares.id}/to-motif`, {}, { auth: false })).status, 401);
  for (const [role, client] of [["anon", anon], ["authenticated", authed]]) {
    const { error } = await client.rpc("color_to_motif", { p_color_id: lunares.id });
    check(`color_to_motif con rol ${role} -> permiso denegado`, error?.code === "42501", `code ${error?.code ?? "sin error"}`);
  }
  const toDry = await api("POST", `/api/colors/${lunares.id}/to-motif`, { dry_run: true });
  eq("vista previa -> 200 con el conteo para confirmar", [toDry.status, toDry.body?.data?.variants, toDry.body?.data?.products, toDry.body?.data?.units, toDry.body?.data?.images, toDry.body?.data?.motif_existed], [200, 2, 1, 5, 1, false]);
  eq("…sin mover nada", (await variantsOf(dotted.id)).map((v) => [v.color_id, v.motif_id]), [[lunares.id, null], [lunares.id, null]]);
  eq("…ni crear el motivo", (await admin.from("motifs").select("id").eq("name", lunares.name)).data.length, 0);
  const to = await api("POST", `/api/colors/${lunares.id}/to-motif`, {});
  eq("POST /api/colors/:id/to-motif -> 200", [to.status, to.body?.data?.variants, to.body?.data?.images], [200, 2, 1]);
  const lunaresMotif = (await admin.from("motifs").select("id").eq("name", lunares.name).single()).data;
  const dottedAfter = await variantsOf(dotted.id);
  eq("las variantes pasan al motivo del mismo nombre", dottedAfter.map((v) => [v.color_id, v.motif_id, v.color]), dottedAfter.map(() => [null, lunaresMotif.id, lunares.name]));
  eq("…con stock, precio y SKU intactos", dottedAfter.map((v) => [v.id, v.stock_quantity, v.price, v.sku]), dottedBefore.map((v) => [v.id, v.stock_quantity, v.price, v.sku]));
  eq("la foto también", (await admin.from("product_images").select("color_id, motif_id").eq("id", dotPhoto.id).single()).data, { color_id: null, motif_id: lunaresMotif.id });
  eq("el color queda en la lista, sin uso", (await api("GET", "/api/colors")).body.data.find((c) => c.id === lunares.id)?.variant_count, 0);
  eq("…y entonces se puede eliminar de a uno", (await api("DELETE", `/api/colors/${lunares.id}`)).status, 204);
  const dottedPage = await page(`/producto/${dotted.id}?modelo=${m13.id}`);
  check("en la tienda el producto ya no tiene círculos", dottedPage.status === 200 && radios(dottedPage.html).length === 0);
  const again2 = await newColor("Rayas", "#444444");
  await motif("Rayas");
  await api("POST", "/api/product-variants", { product_id: dotted.id, iphone_model_id: m16.id, color: "x", sku: `TM-${RUN}-RAY`, price: 6000 });
  await admin.from("product_variants").update({ color_id: again2.id }).eq("sku", `TM-${RUN}-RAY`);
  const existed = await api("POST", `/api/colors/${again2.id}/to-motif`, { dry_run: true });
  eq("si ya hay un motivo con ese nombre, lo avisa y usa ese", existed.body?.data?.motif_existed, true);
  await api("POST", `/api/colors/${again2.id}/to-motif`, {});
  eq("…sin crear otro", (await admin.from("motifs").select("id").eq("name", again2.name)).data.length, 1);
  eq("color sin variantes: nada que pasar", (await api("POST", `/api/colors/${again2.id}/to-motif`, {})).body?.data?.variants, 0);
  eq("color inexistente -> 404", (await api("POST", `/api/colors/${FAKE_ID}/to-motif`, {})).status, 404);
  eq("id que no es uuid -> 400", (await api("POST", "/api/colors/x/to-motif", {})).status, 400);
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
