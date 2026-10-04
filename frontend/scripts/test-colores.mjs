// Pruebas de los colores: migración (tabla, backfill, permisos, trigger), API
// del panel, fotos por color, la lógica de la tienda (lib/productColors.ts,
// importada directo: Node 24 corre TypeScript sin compilar) y el HTML que
// devuelve la ficha del producto.
//
// Mismos requisitos que los otros scripts: Supabase LOCAL arriba con las
// migraciones aplicadas y el frontend corriendo (`npm run dev`). Uso:
//
//   npm run test:colores
//
// Crea sus propios datos y los borra al terminar.

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import {
  MAX_TILE_DOTS,
  availableColorIds,
  colorsWithoutPhotos,
  contrastOn,
  firstImageOfColor,
  hasColorSelector,
  imagesForColor,
  initialColor,
  productColors,
  resolveColor,
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
const MARK = `ZZ TEST COLORES ${RUN}`;
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
    // No es JSON (204, HTML).
  }
  return { status: res.status, body: json, text };
}

async function page(path) {
  const res = await fetch(`${BASE_URL}${path}`, { redirect: "manual" });
  return { status: res.status, html: await res.text() };
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

async function variantRow(id) {
  const { data } = await admin.from("product_variants").select("color, color_id").eq("id", id).single();
  return data;
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

/** ¿La foto grande de la ficha (la que va sin optimizar, con su URL tal cual) es esta? */
const hasMainPhoto = (html, url) => html.includes(`src="${url}"`);

// --- datos de prueba ---------------------------------------------------------

const created = { userId: null, productIds: [], colorIds: [], supplierId: null, storagePaths: [] };

async function cleanup() {
  if (created.supplierId) {
    await admin.from("purchases").delete().eq("supplier_id", created.supplierId);
    await admin.from("suppliers").delete().eq("id", created.supplierId);
  }
  const { data: marked } = await admin.from("products").select("id").like("name", `${MARK}%`);
  const productIds = [...new Set([...created.productIds, ...(marked ?? []).map((p) => p.id)])];
  if (productIds.length > 0) await admin.from("products").delete().in("id", productIds);
  await admin.from("colors").delete().like("name", `${MARK}%`);
  if (created.storagePaths.length > 0) await admin.storage.from(BUCKET).remove(created.storagePaths);
  if (created.userId) await admin.auth.admin.deleteUser(created.userId);
}

// --- pruebas -----------------------------------------------------------------

async function main() {
  console.log(`App: ${BASE_URL} · Supabase: ${SUPABASE_URL} · corrida ${RUN}`);

  const home = await fetch(BASE_URL).catch(() => null);
  if (!home) throw new Error(`La app no responde en ${BASE_URL}. Levantala con "npm run dev".`);

  const email = `test-colores-${RUN}@example.com`;
  const password = `Test-${RUN}-${Math.random().toString(36).slice(2)}`;
  const { data: user, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (userError) throw new Error(`No se pudo crear el usuario de prueba: ${userError.message}`);
  created.userId = user.user.id;
  const accessToken = await signIn(email, password);

  const { data: categories } = await admin.from("categories").select("id, slug, parent_id");
  const parents = new Set(categories.map((c) => c.parent_id).filter(Boolean));
  const category = categories.find((c) => !parents.has(c.id));
  const parentCategory = categories.find((c) => c.id === category.parent_id);
  const { data: models } = await admin.from("iphone_models").select("id, name").order("sort_order").limit(2);
  const [m1, m2] = models;

  // ------------------------------------------------------------------------
  group("1. Migración: tabla, backfill y fotos viejas");
  const { data: allColors, error: colorsError } = await admin.from("colors").select("id, name, slug, hex, assigned");
  check("la tabla colors existe y tiene colores", !colorsError && allColors.length > 0, colorsError?.message);
  check("todos los hex son #rrggbb", allColors.every((c) => /^#[0-9a-f]{6}$/.test(c.hex)));
  check("los slugs son únicos", new Set(allColors.map((c) => c.slug)).size === allColors.length);
  const names = new Set(allColors.map((c) => c.name.toLowerCase()));
  check('"Único" no se sembró como color', !names.has("único") && !names.has("unico"));
  check('"negra" y "blanca" se unificaron con Negro y Blanco', !names.has("negra") && !names.has("blanca"));
  const negro = allColors.find((c) => c.name === "Negro");
  if (negro) eq("un nombre conocido recibe su hex y queda asignado", [negro.hex, negro.assigned], ["#111111", true]);
  const unassigned = allColors.filter((c) => !c.assigned);
  check("los nombres desconocidos quedan en gris y sin asignar", unassigned.every((c) => c.hex === "#9ca3af"));

  const { data: variants } = await admin.from("product_variants").select("color, color_id");
  const colorNameById = new Map(allColors.map((c) => [c.id, c.name]));
  eq(
    "backfill: ninguna variante quedó con un texto que es un color y sin color_id",
    variants.filter((v) => v.color_id === null && v.color && names.has(v.color.trim().toLowerCase())).length,
    0,
  );
  eq(
    "el texto de cada variante con color es el nombre del color",
    variants.filter((v) => v.color_id !== null && v.color !== colorNameById.get(v.color_id)).length,
    0,
  );
  eq("las variantes sin texto quedaron sin color", variants.filter((v) => !v.color && v.color_id !== null).length, 0);
  const { data: syncAgain } = await admin.rpc("sync_colors_from_variants");
  eq("sync_colors_from_variants es idempotente (segunda vez crea 0)", syncAgain, 0);

  group("1b. Permisos");
  const { data: anonColors, error: anonColorsError } = await anon.from("colors").select("id, name, slug, hex").limit(3);
  check("anon puede leer colors", !anonColorsError && anonColors.length > 0, anonColorsError?.message);
  const anonInsert = await anon.from("colors").insert({ name: `${MARK} anon`, slug: `anon-${RUN}`, hex: "#000000" });
  check("anon no puede crear colores", !!anonInsert.error);
  const anonUpdate = await anon.from("colors").update({ hex: "#000000" }).eq("id", allColors[0].id).select("id");
  check("anon no puede editar colores", !!anonUpdate.error || anonUpdate.data.length === 0);
  const { error: anonVariantError } = await anon.from("product_variants").select("id, color_id").limit(1);
  check("anon puede leer product_variants.color_id", !anonVariantError, anonVariantError?.message);
  const { error: anonCostError } = await anon.from("product_variants").select("cost_price").limit(1);
  check("…y sigue sin poder leer cost_price", !!anonCostError);
  const { error: anonImageError } = await anon.from("product_images").select("id, color_id").limit(1);
  check("anon puede leer product_images.color_id", !anonImageError, anonImageError?.message);
  const authed = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  for (const [role, client] of [["anon", anon], ["authenticated", authed]]) {
    const { error } = await client.rpc("sync_colors_from_variants");
    check(`sync_colors_from_variants con rol ${role} -> permiso denegado`, error?.code === "42501", `code ${error?.code ?? "sin error"}`);
  }
  for (const [method, path] of [["GET", "/api/colors"], ["POST", "/api/colors"], ["PATCH", `/api/colors/${FAKE_ID}`], ["DELETE", `/api/colors/${FAKE_ID}`]]) {
    eq(`${method} ${path.replace(FAKE_ID, ":id")} sin sesión -> 401`, (await api(method, path, method === "GET" || method === "DELETE" ? undefined : {}, { auth: false })).status, 401);
  }

  // ------------------------------------------------------------------------
  group("2. API de colores");
  const azulRes = await api("POST", "/api/colors", { name: `${MARK} Azul`, hex: "#2563EB" });
  eq("POST /api/colors -> 201", azulRes.status, 201);
  const azul = azulRes.body.data;
  eq("guarda el hex en minúsculas y queda asignado", [azul.hex, azul.assigned], ["#2563eb", true]);
  check("genera el slug", /^zz-test-colores-.*-azul$/.test(azul.slug), azul.slug);
  const rojo = (await api("POST", "/api/colors", { name: `${MARK} Rojo`, hex: "#d92d20" })).body.data;
  const verde = (await api("POST", "/api/colors", { name: `${MARK} Verde`, hex: "#2e9e5b" })).body.data;
  created.colorIds.push(azul.id, rojo.id, verde.id);
  eq("nombre repetido (otra mayúscula) -> 409", (await api("POST", "/api/colors", { name: `${MARK} AZUL`, hex: "#000000" })).status, 409);
  eq("hex inválido -> 400", (await api("POST", "/api/colors", { name: `${MARK} X`, hex: "azul" })).status, 400);
  eq("sin nombre -> 400", (await api("POST", "/api/colors", { name: "  ", hex: "#000000" })).status, 400);
  const listed = (await api("GET", "/api/colors")).body.data.find((c) => c.id === azul.id);
  eq("GET /api/colors lo lista con variant_count 0", listed?.variant_count, 0);

  // Un color "sin asignar" se asigna al elegirle un hex.
  const { data: gris } = await admin.from("colors").insert({ name: `${MARK} Raro`, slug: `raro-${RUN}` }).select("id, hex, assigned").single();
  eq("un color creado sin hex nace gris y sin asignar", [gris.hex, gris.assigned], ["#9ca3af", false]);
  const patched = await api("PATCH", `/api/colors/${gris.id}`, { hex: "#ABCDEF" });
  eq("PATCH hex -> queda asignado", [patched.status, patched.body?.data?.hex, patched.body?.data?.assigned], [200, "#abcdef", true]);
  eq("PATCH sin campos -> 400", (await api("PATCH", `/api/colors/${gris.id}`, {})).status, 400);
  eq("PATCH color inexistente -> 404", (await api("PATCH", `/api/colors/${FAKE_ID}`, { hex: "#000000" })).status, 404);

  // ------------------------------------------------------------------------
  group("3. Variantes: el texto y el color siempre coherentes");
  const productRes = await api("POST", "/api/products", { category_id: category.id, name: `${MARK} Funda` });
  const product = productRes.body.data;
  created.productIds.push(product.id);

  async function newVariant(suffix, extra) {
    const res = await api("POST", "/api/product-variants", { product_id: product.id, sku: `TCOL-${RUN}-${suffix}`, price: 9000, ...extra });
    if (res.status !== 201) throw new Error(`No se pudo crear la variante ${suffix}: ${res.text}`);
    return res.body.data;
  }
  // M1: Azul (1) y Rojo (2). M2: Rojo (3) y Azul sin stock. Verde: sin stock en todos.
  const vM1Azul = await newVariant("M1A", { iphone_model_id: m1.id, color: `${MARK} azul`.toUpperCase(), stock_quantity: 1 });
  const vM1Rojo = await newVariant("M1R", { iphone_model_id: m1.id, color: `  ${MARK} Rojo `, stock_quantity: 2 });
  const vM2Rojo = await newVariant("M2R", { iphone_model_id: m2.id, color: `${MARK} Rojo`, stock_quantity: 3, price: 9500 });
  await newVariant("M2A", { iphone_model_id: m2.id, color: `${MARK} Azul`, stock_quantity: 0 });
  await newVariant("M1V", { iphone_model_id: m1.id, color: `${MARK} Verde`, stock_quantity: 0 });
  eq("texto en mayúsculas -> se enlaza al color y toma su nombre", await variantRow(vM1Azul.id), { color: azul.name, color_id: azul.id });
  eq("texto con espacios -> idem", await variantRow(vM1Rojo.id), { color: rojo.name, color_id: rojo.id });
  check("la API devuelve color_id", vM1Azul.color_id === azul.id, vM1Azul.color_id);

  const vDesc = await newVariant("DESC", { color: "Tipo C a C de prueba", stock_quantity: 0 });
  eq("un texto que no es un color queda como descripción, sin color_id", await variantRow(vDesc.id), { color: "Tipo C a C de prueba", color_id: null });
  const vNone = await newVariant("NONE", { stock_quantity: 0 });
  eq("sin texto: sin color", await variantRow(vNone.id), { color: null, color_id: null });
  const vNegra = await newVariant("NEG", { color: "negra", stock_quantity: 0 });
  if (negro) eq('"negra" se enlaza a Negro', await variantRow(vNegra.id), { color: "Negro", color_id: negro.id });

  await admin.from("product_variants").update({ color_id: verde.id }).eq("id", vDesc.id);
  eq("asignar color_id pisa el texto con el nombre del color", await variantRow(vDesc.id), { color: verde.name, color_id: verde.id });
  await admin.from("product_variants").update({ color: `${MARK} Rojo` }).eq("id", vDesc.id);
  eq("cambiar solo el texto a otro color re-enlaza", await variantRow(vDesc.id), { color: rojo.name, color_id: rojo.id });
  await admin.from("product_variants").update({ color: "Otra cosa" }).eq("id", vDesc.id);
  eq("cambiar el texto a algo que no es color lo desenlaza", await variantRow(vDesc.id), { color: "Otra cosa", color_id: null });

  const renamed = await api("PATCH", `/api/colors/${verde.id}`, { name: `${MARK} Verde menta` });
  eq("renombrar un color -> 200 y cambia el slug", [renamed.status, /verde-menta$/.test(renamed.body?.data?.slug ?? "")], [200, true]);
  const { data: verdeVariants } = await admin.from("product_variants").select("color").eq("color_id", verde.id);
  check("…y renombra el texto de sus variantes", verdeVariants.length === 1 && verdeVariants[0].color === `${MARK} Verde menta`, JSON.stringify(verdeVariants));
  eq("variant_count cuenta las variantes", (await api("GET", "/api/colors")).body.data.find((c) => c.id === rojo.id)?.variant_count, 2);

  // ------------------------------------------------------------------------
  group("4. Fotos por color");
  async function upload(colorId) {
    const signed = await api("POST", `/api/products/${product.id}/images/upload-url`, { content_type: "image/png", size: PNG.length });
    if (signed.status !== 200) throw new Error(`upload-url falló: ${signed.text}`);
    created.storagePaths.push(signed.body.data.path);
    const up = await anon.storage.from(BUCKET).uploadToSignedUrl(signed.body.data.path, signed.body.data.token, PNG, { contentType: "image/png" });
    if (up.error) throw new Error(`subida falló: ${up.error.message}`);
    return api("POST", `/api/products/${product.id}/images`, { path: signed.body.data.path, ...(colorId !== undefined ? { color_id: colorId } : {}) });
  }
  const general1 = await upload(undefined);
  eq("foto sin color -> 201 y queda como general (color_id null)", [general1.status, general1.body?.data?.color_id], [201, null]);
  const azul1 = await upload(azul.id);
  eq("foto con color_id -> 201 y queda de ese color", [azul1.status, azul1.body?.data?.color_id], [201, azul.id]);
  const general2 = await upload(null);
  const azul2 = await upload(azul.id);
  eq("color_id que no es uuid -> 400", (await upload("azul")).status, 400);
  eq("color inexistente -> 404", (await upload(FAKE_ID)).status, 404);
  const gImg = general1.body.data;
  const aImg = azul1.body.data;
  const adminProduct = (await api("GET", "/api/products")).body.data.find((p) => p.id === product.id);
  eq("GET /api/products trae color_id en las fotos", adminProduct.product_images.map((i) => i.color_id), [null, azul.id, null, azul.id]);
  check("…y en las variantes", adminProduct.product_variants.every((v) => "color_id" in v));

  // Reordenar dentro de un color: el servidor recibe el orden completo y las generales no se mueven.
  const reorder = await api("PATCH", `/api/products/${product.id}/images/reorder`, {
    order: [gImg.id, azul2.body.data.id, general2.body.data.id, aImg.id],
  });
  eq("reordenar las fotos de un color -> 200", reorder.status, 200);
  eq("las del color cambian de lugar entre sí", reorder.body.data.filter((i) => i.color_id === azul.id).map((i) => i.id), [azul2.body.data.id, aImg.id]);
  eq("las generales quedan en su orden", reorder.body.data.filter((i) => i.color_id === null).map((i) => i.id), [gImg.id, general2.body.data.id]);
  await api("PATCH", `/api/products/${product.id}/images/reorder`, { order: [gImg.id, aImg.id, general2.body.data.id, azul2.body.data.id] });

  const missing = colorsWithoutPhotos(adminProduct.product_variants, adminProduct.product_images);
  check('panel: "Color sin foto" marca los colores sin foto propia (Rojo y Verde, no Azul)', missing.includes(rojo.id) && missing.includes(verde.id) && !missing.includes(azul.id), missing.join(","));
  eq("panel: un producto de un solo color no se marca", colorsWithoutPhotos([{ color_id: azul.id }, { color_id: azul.id }], []), []);

  // ------------------------------------------------------------------------
  group("5. Lógica de la tienda (lib/productColors.ts)");
  const cAzul = { id: "a", name: "Azul", slug: "azul", hex: "#2563eb", sort_order: 0 };
  const cRojo = { id: "r", name: "Rojo", slug: "rojo", hex: "#d92d20", sort_order: 0 };
  const cVerde = { id: "v", name: "Verde", slug: "verde", hex: "#2e9e5b", sort_order: 0 };
  const fx = [
    { iphone_model_id: "m1", stock_quantity: 1, color_ref: cRojo },
    { iphone_model_id: "m1", stock_quantity: 4, color_ref: cAzul },
    { iphone_model_id: "m2", stock_quantity: 3, color_ref: cRojo },
    { iphone_model_id: "m2", stock_quantity: 0, color_ref: cAzul },
    { iphone_model_id: null, stock_quantity: 2, color_ref: cVerde },
    { iphone_model_id: "m1", stock_quantity: 5, color_ref: null },
  ];
  const fxColors = productColors(fx);
  eq("colores distintos, ordenados por nombre", fxColors.map((c) => c.name), ["Azul", "Rojo", "Verde"]);
  eq("con 2 o más colores hay selector", hasColorSelector(fxColors), true);
  eq("con 1 color no", hasColorSelector([cAzul]), false);
  eq("sin colores no", hasColorSelector(productColors([{ color_ref: null }])), false);
  eq("m1: Azul, Rojo y Verde (la universal sirve para todos)", [...availableColorIds(fx, "m1")].sort(), ["a", "r", "v"]);
  eq("m2: Azul no (stock 0)", [...availableColorIds(fx, "m2")].sort(), ["r", "v"]);
  eq("sin modelo: los que tengan stock en alguno", [...availableColorIds(fx, null)].sort(), ["a", "r", "v"]);
  eq("color inicial: el primero con stock", initialColor(fxColors, availableColorIds(fx, "m1"), undefined), "a");
  eq("color inicial con ?color=rojo", initialColor(fxColors, availableColorIds(fx, "m1"), "rojo"), "r");
  eq("?color= de un color sin stock para el modelo -> el primero disponible", initialColor(fxColors, availableColorIds(fx, "m2"), "azul"), "r");
  eq("?color= desconocido -> el primero disponible", initialColor(fxColors, availableColorIds(fx, "m1"), "fucsia"), "a");
  eq("cambio de modelo con el color elegido sin stock -> salta al primero disponible", resolveColor(fxColors, availableColorIds(fx, "m2"), "a"), "r");
  eq("cambio de modelo con el color elegido disponible -> se mantiene", resolveColor(fxColors, availableColorIds(fx, "m2"), "v"), "v");
  eq("ningún color disponible -> null", resolveColor(fxColors, new Set(), "a"), null);

  const imgs = [
    { id: "g2", url: "g2", sort_order: 3, color_id: null },
    { id: "a1", url: "a1", sort_order: 1, color_id: "a" },
    { id: "g1", url: "g1", sort_order: 0, color_id: null },
    { id: "a2", url: "a2", sort_order: 2, color_id: "a" },
  ];
  eq("fotos de un color con fotos propias, en orden", imagesForColor(imgs, "a").map((i) => i.id), ["a1", "a2"]);
  eq("color sin fotos -> las generales", imagesForColor(imgs, "r").map((i) => i.id), ["g1", "g2"]);
  eq("sin color elegido -> las generales", imagesForColor(imgs, null).map((i) => i.id), ["g1", "g2"]);
  const onlyColor = imgs.filter((i) => i.color_id === "a");
  eq("sin fotos del color ni generales -> la primera del producto", imagesForColor(onlyColor, "r").map((i) => i.id), ["a1"]);
  eq("producto sin fotos -> vacío", imagesForColor([], "a"), []);
  eq("primera foto de un color (hover de la tarjeta)", firstImageOfColor(imgs, "a"), "a1");
  eq("…o null si no tiene", firstImageOfColor(imgs, "r"), null);
  const seven = Array.from({ length: 7 }, (_, i) => ({ id: `c${i}`, name: `C${i}`, slug: `c${i}`, hex: "#000000", sort_order: i }));
  eq(`tarjeta: como mucho ${MAX_TILE_DOTS} puntitos y "+2"`, [tileDots(seven).shown.length, tileDots(seven).extra], [5, 2]);
  eq("tarjeta de un solo color: sin puntitos", tileDots([cAzul]), { shown: [], extra: 0 });
  eq("contraste: negro sobre blanco, blanco sobre negro", [contrastOn("#ffffff"), contrastOn("#111111")], ["#000000", "#ffffff"]);

  // ------------------------------------------------------------------------
  group("6. Ficha pública (HTML que devuelve el servidor)");
  const base = `/producto/${product.id}`;
  const pM1 = await page(`${base}?modelo=${m1.id}`);
  eq("GET ficha -> 200", pM1.status, 200);
  check('tiene role="radiogroup" con aria-label "Color"', /role="radiogroup"[^>]*aria-label="Color"|aria-label="Color"[^>]*role="radiogroup"/.test(pM1.html));
  const rM1 = radios(pM1.html);
  eq("un radio por color con stock en algún modelo (Azul y Rojo; Verde no tiene stock)", rM1.map((r) => r.value).sort(), [azul.slug, rojo.slug].sort());
  eq("modelo 1: los dos se pueden elegir", rM1.map((r) => r.disabled), [false, false]);
  eq("color inicial: el primero con stock (Azul)", rM1.find((r) => r.checked)?.value, azul.slug);
  check('la etiqueta dice "Color — <nombre>"', pM1.html.includes(`Color<span class="font-normal text-graphite"> — <!-- -->${azul.name}</span>`) || pM1.html.replace(/<!-- -->/g, "").includes(` — ${azul.name}</span>`));
  check("cada radio tiene aria-label con el nombre del color", rM1.every((r) => r.label?.includes(MARK)), JSON.stringify(rM1.map((r) => r.label)));
  check("Azul elegido -> la foto grande es la de Azul", hasMainPhoto(pM1.html, aImg.url));
  check("…y no la general", !hasMainPhoto(pM1.html, gImg.url));

  const pRojo = await page(`${base}?modelo=${m1.id}&color=${rojo.slug}`);
  eq("?color=<slug de Rojo> -> Rojo elegido", radios(pRojo.html).find((r) => r.checked)?.value, rojo.slug);
  check("Rojo no tiene fotos propias -> la foto grande es la general", hasMainPhoto(pRojo.html, gImg.url));
  check("elegir otro color cambia el src de la foto grande", hasMainPhoto(pM1.html, aImg.url) && !hasMainPhoto(pRojo.html, aImg.url));
  check("el precio es el de la variante modelo 1 + Rojo ($ 9.000)", pRojo.html.includes("9.000"));

  const pM2 = await page(`${base}?modelo=${m2.id}`);
  const rM2 = radios(pM2.html);
  const azulM2 = rM2.find((r) => r.value === azul.slug);
  eq("modelo 2: Azul (sin stock ahí) no se puede elegir", azulM2?.disabled, true);
  check(`…y avisa "Sin stock para ${m2.name}"`, azulM2?.label?.includes(`Sin stock para ${m2.name}`) && pM2.html.includes(`title="Sin stock para ${m2.name}"`), azulM2?.label);
  eq("modelo 2: queda elegido Rojo", rM2.find((r) => r.checked)?.value, rojo.slug);
  check("el precio es el de la variante modelo 2 + Rojo ($ 9.500)", pM2.html.includes("9.500"));
  const pM2Azul = await page(`${base}?modelo=${m2.id}&color=${azul.slug}`);
  eq("modelo 2 con ?color=azul (sin stock) -> salta a Rojo", radios(pM2Azul.html).find((r) => r.checked)?.value, rojo.slug);

  // Un solo color: sin selector de círculos, como antes.
  const singleRes = await api("POST", "/api/products", { category_id: category.id, name: `${MARK} Un color` });
  created.productIds.push(singleRes.body.data.id);
  await api("POST", "/api/product-variants", { product_id: singleRes.body.data.id, iphone_model_id: m1.id, color: `${MARK} Azul`, sku: `TCOL-${RUN}-S1`, price: 5000, stock_quantity: 2 });
  const pSingle = await page(`/producto/${singleRes.body.data.id}`);
  eq("producto con un solo color -> 200", pSingle.status, 200);
  eq("…sin radios de color", radios(pSingle.html).length, 0);
  check("…muestra el color como chip, igual que antes", pSingle.html.includes(azul.name));

  group("7. Tarjetas del listado");
  const listPath = parentCategory ? `/categoria/${parentCategory.slug}?tipo=${category.slug}` : `/categoria/${category.slug}`;
  const list = await page(listPath);
  eq(`GET ${listPath} -> 200`, list.status, 200);
  check("la tarjeta del producto con 2 colores anuncia sus colores", list.html.replace(/<!-- -->/g, "").includes(`2 colores: ${azul.name}, ${rojo.name}`));
  check("…con un puntito por color", list.html.includes(`title="${azul.name}"`) && list.html.includes(`title="${rojo.name}"`));
  check("la tarjeta de un solo color no lleva puntitos", !list.html.replace(/<!-- -->/g, "").includes("1 colores"));
  check("la portada de la tarjeta es la foto general", list.html.includes(encodeURIComponent(gImg.url)));

  // ------------------------------------------------------------------------
  group("8. Compras: el color sale de la lista");
  const supplier = (await api("POST", "/api/suppliers", { name: MARK })).body.data;
  created.supplierId = supplier.id;
  const purchase = await api("POST", "/api/purchases", {
    supplier_id: supplier.id,
    products: [{ product_id: product.id, rows: [{ iphone_model_id: m2.id, color: `${MARK} Verde menta`, sku: `TCOL-${RUN}-BUY`, price: 9000, quantity: 2, unit_cost: 3000 }] }],
  });
  eq("compra con una variante nueva de un color de la lista -> 201", purchase.status, 201);
  const { data: bought } = await admin.from("product_variants").select("color, color_id, stock_quantity").eq("sku", `TCOL-${RUN}-BUY`).single();
  eq("la variante nueva queda enlazada al color", bought, { color: `${MARK} Verde menta`, color_id: verde.id, stock_quantity: 2 });
  const dup = await api("POST", "/api/purchases", {
    supplier_id: supplier.id,
    products: [{ product_id: product.id, rows: [{ iphone_model_id: m2.id, color: `${MARK} verde MENTA`, sku: `TCOL-${RUN}-BUY2`, price: 9000, quantity: 1, unit_cost: 3000 }] }],
  });
  eq("mismo modelo y color otra vez -> 409", dup.status, 409);

  // ------------------------------------------------------------------------
  group('9. "No es un color"');
  const del = await api("DELETE", `/api/colors/${rojo.id}`);
  eq("DELETE /api/colors/:id -> 204", del.status, 204);
  eq("sus variantes conservan el texto como descripción", await variantRow(vM2Rojo.id), { color: rojo.name, color_id: null });
  await admin.from("product_images").update({ color_id: verde.id }).eq("id", general2.body.data.id);
  await api("DELETE", `/api/colors/${verde.id}`);
  const { data: orphan } = await admin.from("product_images").select("color_id").eq("id", general2.body.data.id).single();
  eq("las fotos de un color borrado pasan a ser generales", orphan.color_id, null);
  eq("borrar de nuevo -> 404", (await api("DELETE", `/api/colors/${rojo.id}`)).status, 404);
  const after = await page(`${base}?modelo=${m1.id}`);
  eq("con un solo color restante la ficha vuelve a no tener selector", radios(after.html).length, 0);
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
