// Pruebas de la gestión de colores: agregar y quitar un color en un producto
// (una variante por modelo) y en todos los productos de una categoría.
//
// Mismos requisitos que los otros scripts: Supabase LOCAL arriba con las
// migraciones aplicadas y el frontend corriendo (`npm run dev`). Uso:
//
//   npm run test:colores-gestion
//
// Crea sus propias categorías, productos y colores, y los borra al terminar.

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { suggestSku } from "../src/app/admin/productos/sku.ts";

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
const MARK = `ZZ TEST GESTION ${RUN}`;
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

/** Variantes de un producto con ese color, en orden de modelo. */
async function variantsOf(productId, colorId) {
  let query = admin
    .from("product_variants")
    .select("id, sku, color, color_id, price, stock_quantity, active, iphone_model_id, iphone_models(name, sort_order)")
    .eq("product_id", productId);
  if (colorId) query = query.eq("color_id", colorId);
  const { data } = await query;
  return (data ?? [])
    .map((v) => ({ ...v, price: Number(v.price) }))
    .sort((a, b) => (a.iphone_models?.sort_order ?? 999) - (b.iphone_models?.sort_order ?? 999));
}

// --- datos de prueba ---------------------------------------------------------

const created = { userId: null, categoryIds: [], supplierId: null, saleIds: [] };

async function cleanup() {
  if (created.saleIds.length > 0) await admin.from("sales").delete().in("id", created.saleIds.filter(Boolean));
  if (created.supplierId) {
    await admin.from("purchases").delete().eq("supplier_id", created.supplierId);
    await admin.from("suppliers").delete().eq("id", created.supplierId);
  }
  await admin.from("products").delete().like("name", `${MARK}%`);
  await admin.from("colors").delete().like("name", `${MARK}%`);
  // Los hijos primero.
  for (const id of [...created.categoryIds].reverse()) await admin.from("categories").delete().eq("id", id);
  if (created.userId) await admin.auth.admin.deleteUser(created.userId);
}

// --- pruebas -----------------------------------------------------------------

async function main() {
  console.log(`App: ${BASE_URL} · Supabase: ${SUPABASE_URL} · corrida ${RUN}`);

  const home = await fetch(BASE_URL).catch(() => null);
  if (!home) throw new Error(`La app no responde en ${BASE_URL}. Levantala con "npm run dev".`);

  const email = `test-gestion-${RUN}@example.com`;
  const password = `Test-${RUN}-${Math.random().toString(36).slice(2)}`;
  const { data: user, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (userError) throw new Error(`No se pudo crear el usuario de prueba: ${userError.message}`);
  created.userId = user.user.id;
  const accessToken = await signIn(email, password);

  const { data: models } = await admin.from("iphone_models").select("id, name").order("sort_order").limit(3);
  const [m1, m2, m3] = models;

  // Categorías propias: una de tope con un tipo, y un tipo colgado de Accesorios.
  async function newCategory(name, parentId = null) {
    const { data, error } = await admin.from("categories").insert({ name, parent_id: parentId }).select("id, name").single();
    if (error) throw new Error(`No se pudo crear la categoría ${name}: ${error.message}`);
    created.categoryIds.push(data.id);
    return data;
  }
  const { data: accessories } = await admin.from("categories").select("id").eq("slug", "accesorios").single();
  const top = await newCategory(`${MARK} Fundas`);
  const child = await newCategory(`${MARK} Tipo`, top.id);
  const accessoryChild = await newCategory(`${MARK} Cables`, accessories.id);

  const color = async (name, hex) => (await api("POST", "/api/colors", { name: `${MARK} ${name}`, hex })).body.data;
  const rojo = await color("Rojo", "#d92d20");
  const azul = await color("Azul", "#2563eb");
  const verde = await color("Verde", "#2e9e5b");

  let skuSeq = 0;
  async function newProduct(name, categoryId, variants) {
    const res = await api("POST", "/api/products", { category_id: categoryId, name: `${MARK} ${name}` });
    if (res.status !== 201) throw new Error(`No se pudo crear ${name}: ${res.text}`);
    for (const v of variants) {
      skuSeq += 1;
      const r = await api("POST", "/api/product-variants", { product_id: res.body.data.id, sku: `TG-${RUN}-${skuSeq}`, stock_quantity: 0, ...v });
      if (r.status !== 201) throw new Error(`No se pudo crear una variante de ${name}: ${r.text}`);
    }
    return res.body.data;
  }
  // A: 3 modelos, cada uno con su precio. En el tipo.
  const a = await newProduct("Case A", child.id, [
    { iphone_model_id: m1.id, color: rojo.name, price: 9000 },
    { iphone_model_id: m2.id, color: rojo.name, price: 9500 },
    { iphone_model_id: m3.id, color: rojo.name, price: 10000 },
  ]);

  // ------------------------------------------------------------------------
  group("7. Sin sesión de admin -> 401");
  const endpoints = [
    ["POST", `/api/products/${FAKE_ID}/colors`],
    ["DELETE", `/api/products/${FAKE_ID}/colors/${FAKE_ID}`],
    ["POST", `/api/categories/${FAKE_ID}/colors`],
    ["DELETE", `/api/categories/${FAKE_ID}/colors/${FAKE_ID}`],
  ];
  for (const [method, path] of endpoints) {
    const res = await api(method, path, method === "POST" ? { color_id: FAKE_ID } : undefined, { auth: false });
    check(`${method} ${path.replaceAll(FAKE_ID, ":id")}`, res.status === 401 && typeof res.body?.error === "string", `status ${res.status}`);
  }
  const authed = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const rpcCalls = {
    add_color_to_product: { p_product_id: a.id, p_color_id: azul.id },
    remove_color_from_product: { p_product_id: a.id, p_color_id: rojo.id },
    add_color_to_category: { p_category_id: top.id, p_color_id: azul.id },
    remove_color_from_category: { p_category_id: top.id, p_color_id: rojo.id },
    _add_color_to_product: { p_product_id: a.id, p_color_id: azul.id },
  };
  for (const [fn, args] of Object.entries(rpcCalls)) {
    for (const [role, client] of [["anon", anon], ["authenticated", authed]]) {
      const { error } = await client.rpc(fn, args);
      check(`${fn} con rol ${role} -> permiso denegado`, error?.code === "42501", `code ${error?.code ?? "sin error"}`);
    }
  }
  eq("…y nada de eso creó variantes", (await variantsOf(a.id)).length, 3);

  // ------------------------------------------------------------------------
  group("0. El SKU en SQL es el mismo que arma el panel");
  const skuCases = [
    ["Funda de silicona degradé", "iPhone 14 Pro Max", "rojo"],
    ["Colour Case", "iPhone 17 Air", "Azul marino"],
    ["MagCase", "iPhone 11", ""],
    ["Silicona", "", "Bordó"],
    ["Funda para el cargador y los cables de la casa", "iPhone Air", "Verde agua"],
    [`${MARK} Case A`, m1.name, azul.name],
  ];
  for (const [product, model, colorName] of skuCases) {
    const { data } = await admin.rpc("suggest_sku", { p_product: product, p_model: model, p_color: colorName });
    eq(`suggest_sku("${product}", "${model}", "${colorName}")`, data, suggestSku(product, model, colorName));
  }

  // ------------------------------------------------------------------------
  group("1. Agregar un color a un producto con 3 modelos");
  const dry = await api("POST", `/api/products/${a.id}/colors`, { color_id: azul.id, dry_run: true });
  eq("vista previa -> 200", dry.status, 200);
  eq("…avisa que se van a crear 3 variantes", [dry.body?.data?.created, dry.body?.data?.reactivated, dry.body?.data?.existing, dry.body?.data?.dry_run], [3, 0, 0, true]);
  eq("…y no crea nada", (await variantsOf(a.id, azul.id)).length, 0);

  const add = await api("POST", `/api/products/${a.id}/colors`, { color_id: azul.id });
  eq("POST /api/products/:id/colors -> 200", add.status, 200);
  eq("crea 3 variantes", [add.body?.data?.created, add.body?.data?.reactivated, add.body?.data?.existing], [3, 0, 0]);
  const azulA = await variantsOf(a.id, azul.id);
  eq("una por modelo", azulA.map((v) => v.iphone_model_id), [m1.id, m2.id, m3.id]);
  eq("con stock 0", azulA.map((v) => v.stock_quantity), [0, 0, 0]);
  eq("activas", azulA.map((v) => v.active), [true, true, true]);
  eq("con el precio de la variante del mismo modelo", azulA.map((v) => v.price), [9000, 9500, 10000]);
  eq("el texto es el nombre del color", azulA.map((v) => v.color), [azul.name, azul.name, azul.name]);
  check("SKU únicos", new Set(azulA.map((v) => v.sku)).size === 3);
  eq("SKU con la lógica del alta de variantes", azulA.map((v) => v.sku), [m1, m2, m3].map((m) => suggestSku(a.name, m.name, azul.name)));
  eq("la respuesta devuelve los SKU creados", add.body.data.skus, azulA.map((v) => v.sku));

  // Mismo SKU sugerido que otro producto: se desambigua con -2.
  const twin = await newProduct("Case A", top.id, [{ iphone_model_id: m1.id, color: rojo.name, price: 5000 }]);
  await api("POST", `/api/products/${twin.id}/colors`, { color_id: azul.id });
  eq("si el SKU sugerido ya existe, le suma -2", (await variantsOf(twin.id, azul.id))[0]?.sku, `${suggestSku(twin.name, m1.name, azul.name)}-2`);

  // ------------------------------------------------------------------------
  group("2. Agregar un color que ya existe");
  const again = await api("POST", `/api/products/${a.id}/colors`, { color_id: azul.id });
  eq("no duplica: 0 creadas, 3 ya existentes", [again.body?.data?.created, again.body?.data?.reactivated, again.body?.data?.existing], [0, 0, 3]);
  eq("siguen siendo 3 variantes", (await variantsOf(a.id, azul.id)).length, 3);
  await admin.from("product_variants").update({ active: false }).in("id", [azulA[0].id, azulA[1].id]);
  const react = await api("POST", `/api/products/${a.id}/colors`, { color_id: azul.id });
  eq("reactiva las dadas de baja: 2 reactivadas, 1 ya existente", [react.body?.data?.created, react.body?.data?.reactivated, react.body?.data?.existing], [0, 2, 1]);
  const azulAfter = await variantsOf(a.id, azul.id);
  eq("mismas 3 filas (no crea otras), todas activas", [azulAfter.map((v) => v.id), azulAfter.every((v) => v.active)], [azulA.map((v) => v.id), true]);

  // ------------------------------------------------------------------------
  group("3. Quitar un color");
  const rmDry = await api("DELETE", `/api/products/${a.id}/colors/${azul.id}?dry_run=1`);
  eq("vista previa: 3 variantes, 0 unidades, sin bloqueo", [rmDry.body?.data?.variants, rmDry.body?.data?.units, rmDry.body?.data?.blocked], [3, 0, false]);
  eq("…y no da de baja nada", (await variantsOf(a.id, azul.id)).filter((v) => v.active).length, 3);
  const rm = await api("DELETE", `/api/products/${a.id}/colors/${azul.id}`);
  eq("DELETE sin stock -> 200, 3 dadas de baja", [rm.status, rm.body?.data?.deactivated, rm.body?.data?.blocked], [200, 3, false]);
  const gone = await variantsOf(a.id, azul.id);
  eq("las variantes siguen existiendo en la base", gone.map((v) => v.id), azulA.map((v) => v.id));
  eq("…dadas de baja", gone.map((v) => v.active), [false, false, false]);
  eq("las de otro color no se tocan", (await variantsOf(a.id, rojo.id)).map((v) => v.active), [true, true, true]);

  await api("POST", `/api/products/${a.id}/colors`, { color_id: azul.id });
  await api("PATCH", `/api/product-variants/${azulA[1].id}`, { stock_quantity: 4 });
  const blocked = await api("DELETE", `/api/products/${a.id}/colors/${azul.id}`);
  eq("con stock y sin force -> 200 pero bloqueado", [blocked.status, blocked.body?.data?.blocked, blocked.body?.data?.deactivated], [200, true, 0]);
  eq("…devuelve cuántas unidades", blocked.body?.data?.units, 4);
  eq("…y qué variantes tienen stock", blocked.body?.data?.with_stock, [{ id: azulA[1].id, sku: azulA[1].sku, model: m2.name, stock: 4 }]);
  eq("…y no hace nada", (await variantsOf(a.id, azul.id)).map((v) => v.active), [true, true, true]);
  const forceDry = await api("DELETE", `/api/products/${a.id}/colors/${azul.id}?force=1&dry_run=1`);
  eq("vista previa con force: diría 3, sin tocar nada", [forceDry.body?.data?.deactivated, (await variantsOf(a.id, azul.id)).filter((v) => v.active).length], [3, 3]);
  const forced = await api("DELETE", `/api/products/${a.id}/colors/${azul.id}?force=1`);
  eq("con force las da de baja igual", [forced.body?.data?.deactivated, forced.body?.data?.blocked], [3, false]);
  const forcedRows = await variantsOf(a.id, azul.id);
  eq("…sin borrarlas ni tocar su stock", [forcedRows.map((v) => v.active), forcedRows.map((v) => v.stock_quantity)], [[false, false, false], [0, 4, 0]]);
  eq("quitar un color que el producto no tiene -> 0 variantes", (await api("DELETE", `/api/products/${a.id}/colors/${verde.id}`)).body?.data?.deactivated, 0);

  group("3b. Producto universal (sin modelo)");
  const uni = await newProduct("Universal", child.id, [{ iphone_model_id: null, color: rojo.name, price: 4000 }]);
  const uniAdd = await api("POST", `/api/products/${uni.id}/colors`, { color_id: azul.id });
  eq("crea una sola variante", uniAdd.body?.data?.created, 1);
  const uniAzul = await variantsOf(uni.id, azul.id);
  eq("…sin modelo y con el mismo precio", [uniAzul[0]?.iphone_model_id, uniAzul[0]?.price], [null, 4000]);
  await api("DELETE", `/api/products/${uni.id}/colors/${azul.id}`);

  // ------------------------------------------------------------------------
  group("3c. Primer color de un producto que no tenía ninguno");
  const plain = await newProduct("Sin color", child.id, [
    { iphone_model_id: m1.id, price: 8000, stock_quantity: 3 },
    { iphone_model_id: m2.id, price: 8500, stock_quantity: 2 },
  ]);
  const plainBefore = await variantsOf(plain.id);
  eq("arranca con 2 variantes sin color", plainBefore.map((v) => [v.color, v.color_id]), [[null, null], [null, null]]);
  const firstDry = await api("POST", `/api/products/${plain.id}/colors`, { color_id: rojo.id, dry_run: true });
  eq("vista previa: 2 variantes pasan al color, 5 unidades, nada nuevo", [firstDry.body?.data?.assigned, firstDry.body?.data?.units, firstDry.body?.data?.created], [2, 5, 0]);
  eq("…y no cambia nada", (await variantsOf(plain.id)).map((v) => v.color_id), [null, null]);

  const first = await api("POST", `/api/products/${plain.id}/colors`, { color_id: rojo.id });
  eq("primer color -> 200, 2 asignadas y 0 creadas", [first.status, first.body?.data?.assigned, first.body?.data?.created], [200, 2, 0]);
  const plainAfter = await variantsOf(plain.id);
  eq("son las mismas 2 variantes (no se crea ninguna)", plainAfter.map((v) => v.id), plainBefore.map((v) => v.id));
  eq("ahora con el color (id y texto)", plainAfter.map((v) => [v.color, v.color_id]), [[rojo.name, rojo.id], [rojo.name, rojo.id]]);
  eq("conservan stock, precio y SKU", plainAfter.map((v) => [v.stock_quantity, v.price, v.sku]), plainBefore.map((v) => [v.stock_quantity, v.price, v.sku]));

  const second = await api("POST", `/api/products/${plain.id}/colors`, { color_id: azul.id });
  eq("segundo color: una variante nueva por modelo, ninguna asignada", [second.body?.data?.created, second.body?.data?.assigned], [2, 0]);
  const plainAzul = await variantsOf(plain.id, azul.id);
  eq("…con stock 0 y el precio de su modelo", plainAzul.map((v) => [v.stock_quantity, v.price]), [[0, 8000], [0, 8500]]);
  eq("…y las del primer color siguen con su stock", (await variantsOf(plain.id, rojo.id)).map((v) => v.stock_quantity), [3, 2]);
  eq("el producto queda con 4 variantes", (await variantsOf(plain.id)).length, 4);

  // Con una descripción que no es un color, no se ofrece (y el servidor lo rechaza).
  const described = await newProduct("Con descripcion", child.id, [
    { iphone_model_id: null, color: "Tipo C a C prueba", price: 3000, stock_quantity: 1 },
    { iphone_model_id: null, price: 3000, stock_quantity: 1 },
  ]);
  const refused = await api("POST", `/api/products/${described.id}/colors`, { color_id: rojo.id });
  eq("producto con una descripción libre -> 400", refused.status, 400);
  check("…con un mensaje que lo explica", /descripción que no es un color/.test(refused.body?.error ?? ""), refused.body?.error);
  eq("…también en vista previa", (await api("POST", `/api/products/${described.id}/colors`, { color_id: rojo.id, dry_run: true })).status, 400);
  eq("…y sus variantes quedan como estaban", (await variantsOf(described.id)).map((v) => [v.color, v.color_id]).sort(), [["Tipo C a C prueba", null], [null, null]].sort());
  await admin.from("products").delete().in("id", [plain.id, described.id]);

  // ------------------------------------------------------------------------
  group("4. Por categoría");
  // B: en la categoría de tope, 2 modelos. D: sin colores. E: sin variantes.
  const b = await newProduct("Case B", top.id, [
    { iphone_model_id: m1.id, color: rojo.name, price: 7000 },
    { iphone_model_id: m2.id, color: rojo.name, price: 7000 },
  ]);
  const d = await newProduct("Diseño D", child.id, [{ iphone_model_id: m1.id, price: 8000 }]);
  const e = await newProduct("Vacío E", child.id, []);
  // Productos de la categoría y su tipo: A (3 modelos), twin (1), uni (1), B (2), D y E.
  const catDry = await api("POST", `/api/categories/${top.id}/colors`, { color_id: verde.id, dry_run: true });
  eq("vista previa -> 200", catDry.status, 200);
  eq("…4 productos, 7 variantes (categoría + su tipo)", [catDry.body?.data?.products, catDry.body?.data?.created], [4, 7]);
  eq("…omite el que no maneja colores y el que no tiene variantes", catDry.body?.data?.skipped.map((s) => [s.product_id, s.reason]).sort(), [[d.id, "no maneja colores"], [e.id, "sin variantes"]].sort());
  const { count: verdeBefore } = await admin.from("product_variants").select("id", { count: "exact", head: true }).eq("color_id", verde.id);
  eq("…y no crea nada", verdeBefore, 0);

  const cat = await api("POST", `/api/categories/${top.id}/colors`, { color_id: verde.id });
  eq("POST /api/categories/:id/colors -> 200", cat.status, 200);
  eq("agrega a los 4 productos: 7 variantes", [cat.body?.data?.products, cat.body?.data?.created, cat.body?.data?.reactivated], [4, 7, 0]);
  eq("producto del tipo (subcategoría): 3 variantes", (await variantsOf(a.id, verde.id)).length, 3);
  eq("producto de la categoría de tope: 2 variantes", (await variantsOf(b.id, verde.id)).length, 2);
  eq("el que no maneja colores no se toca", (await variantsOf(d.id)).length, 1);
  eq("aplicado solo al tipo: no toca los de la categoría de tope", (await api("POST", `/api/categories/${child.id}/colors`, { color_id: verde.id, dry_run: true })).body?.data?.existing, 4);
  const catAgain = await api("POST", `/api/categories/${top.id}/colors`, { color_id: verde.id });
  eq("otra vez: no duplica", [catAgain.body?.data?.products, catAgain.body?.data?.created, catAgain.body?.data?.existing], [0, 0, 7]);

  const verdeA = await variantsOf(a.id, verde.id);
  await api("PATCH", `/api/product-variants/${verdeA[0].id}`, { stock_quantity: 6 });
  const catRmDry = await api("DELETE", `/api/categories/${top.id}/colors/${verde.id}?dry_run=1`);
  eq("vista previa de quitar: 6 variantes, 1 omitida con 6 u.", [catRmDry.body?.data?.deactivated, catRmDry.body?.data?.omitted.length, catRmDry.body?.data?.omitted_units], [6, 1, 6]);
  const catRm = await api("DELETE", `/api/categories/${top.id}/colors/${verde.id}`);
  eq("DELETE /api/categories/:id/colors/:colorId -> 200", catRm.status, 200);
  eq("da de baja solo las de stock 0", [catRm.body?.data?.deactivated, catRm.body?.data?.products], [6, 4]);
  eq("reporta la omitida por tener stock", catRm.body?.data?.omitted.map((o) => [o.product_id, o.sku, o.model, o.stock]), [[a.id, verdeA[0].sku, m1.name, 6]]);
  eq("la que tiene stock sigue activa", (await variantsOf(a.id, verde.id)).map((v) => v.active), [true, false, false]);
  eq("las de B quedaron dadas de baja, no borradas", (await variantsOf(b.id, verde.id)).map((v) => v.active), [false, false]);

  // ------------------------------------------------------------------------
  group("5. Accesorios y sus tipos: se rechaza");
  const reject = (res) => [res.status, /Accesorios/.test(res.body?.error ?? "")];
  eq("agregar a Accesorios -> 400", reject(await api("POST", `/api/categories/${accessories.id}/colors`, { color_id: verde.id })), [400, true]);
  eq("agregar a un tipo de Accesorios -> 400", reject(await api("POST", `/api/categories/${accessoryChild.id}/colors`, { color_id: verde.id })), [400, true]);
  eq("quitar de Accesorios -> 400", reject(await api("DELETE", `/api/categories/${accessories.id}/colors/${verde.id}`)), [400, true]);
  eq("quitar de un tipo de Accesorios -> 400", reject(await api("DELETE", `/api/categories/${accessoryChild.id}/colors/${verde.id}`)), [400, true]);
  eq("ni siquiera en vista previa", reject(await api("POST", `/api/categories/${accessories.id}/colors`, { color_id: verde.id, dry_run: true })), [400, true]);
  const cable = await newProduct("Cable", accessoryChild.id, [{ iphone_model_id: null, color: rojo.name, price: 3000 }]);
  eq("agregar color a un producto de Accesorios -> 400", reject(await api("POST", `/api/products/${cable.id}/colors`, { color_id: verde.id })), [400, true]);
  eq("quitar color de un producto de Accesorios -> 400", reject(await api("DELETE", `/api/products/${cable.id}/colors/${rojo.id}`)), [400, true]);
  eq("…y el producto queda igual", (await variantsOf(cable.id)).map((v) => v.active), [true]);

  group("5b. Validación");
  eq("producto inexistente -> 404", (await api("POST", `/api/products/${FAKE_ID}/colors`, { color_id: verde.id })).status, 404);
  eq("color inexistente -> 404", (await api("POST", `/api/products/${a.id}/colors`, { color_id: FAKE_ID })).status, 404);
  eq("categoría inexistente -> 404", (await api("POST", `/api/categories/${FAKE_ID}/colors`, { color_id: verde.id })).status, 404);
  eq("color_id que no es uuid -> 400", (await api("POST", `/api/products/${a.id}/colors`, { color_id: "rojo" })).status, 400);
  eq("sin color_id -> 400", (await api("POST", `/api/categories/${top.id}/colors`, {})).status, 400);
  eq("id de producto que no es uuid -> 400", (await api("DELETE", `/api/products/x/colors/${verde.id}`)).status, 400);
  eq("producto sin variantes -> 400", (await api("POST", `/api/products/${e.id}/colors`, { color_id: verde.id })).status, 400);

  // ------------------------------------------------------------------------
  group("6. Dar de baja una variante con ventas y compras no rompe el historial");
  const rojoA = await variantsOf(a.id, rojo.id);
  const sold = rojoA[0];
  const supplier = (await api("POST", "/api/suppliers", { name: MARK })).body.data;
  created.supplierId = supplier.id;
  const purchase = await api("POST", "/api/purchases", { supplier_id: supplier.id, items: [{ variant_id: sold.id, quantity: 5, unit_cost: 3000 }] });
  eq("compra de la variante -> 201", purchase.status, 201);
  const sale = await api("POST", "/api/sales", { payment_method: "efectivo", notes: MARK, items: [{ variant_id: sold.id, quantity: 2, unit_price: sold.price }] });
  eq("venta de la variante -> 201", sale.status, 201);
  created.saleIds.push(sale.body?.data?.id);

  const off = await api("DELETE", `/api/products/${a.id}/colors/${rojo.id}?force=1`);
  eq("quitar el color (con stock, forzado) -> 3 dadas de baja", off.body?.data?.deactivated, 3);
  const { data: saleItems } = await admin.from("sale_items").select("quantity, unit_price").eq("variant_id", sold.id);
  eq("el item de venta sigue ahí", saleItems.map((i) => [i.quantity, Number(i.unit_price)]), [[2, sold.price]]);
  const { data: purchaseItems } = await admin.from("purchase_items").select("quantity, unit_cost").eq("variant_id", sold.id);
  eq("el item de compra sigue ahí", purchaseItems.map((i) => [i.quantity, Number(i.unit_cost)]), [[5, 3000]]);
  const from = new Date(Date.now() - 3600_000).toISOString();
  const to = new Date(Date.now() + 3600_000).toISOString();
  const history = await api("GET", `/api/sales?${new URLSearchParams({ from, to, page: "1", page_size: "100" })}`);
  const listed = history.body?.data?.find((s) => s.id === sale.body.data.id);
  eq("el historial sigue mostrando la venta con su producto, modelo y color", [listed?.sale_items?.[0]?.variant?.product?.name, listed?.sale_items?.[0]?.variant?.iphone_model?.name, listed?.sale_items?.[0]?.variant?.color], [a.name, m1.name, rojo.name]);
  eq("el resumen de ventas sigue respondiendo", (await api("GET", `/api/sales/summary?${new URLSearchParams({ from, to })}`)).status, 200);
  const voided = await api("POST", `/api/sales/${sale.body.data.id}/void`, { reason: "Prueba" });
  eq("anular esa venta sigue funcionando y devuelve el stock a la variante dada de baja", [voided.status, (await variantsOf(a.id, rojo.id))[0].stock_quantity], [200, 5]);
  const { error: deleteError } = await admin.from("product_variants").delete().eq("id", sold.id);
  check("la base no deja borrar una variante con historial", deleteError?.code === "23503", deleteError?.code ?? "se borró");
  const { data: anonSees } = await anon.from("product_variants").select("id").eq("id", sold.id);
  eq("la variante dada de baja deja de verse en la tienda", anonSees?.length ?? 0, 0);
  const back = await api("POST", `/api/products/${a.id}/colors`, { color_id: rojo.id });
  eq("volver a agregar el color la reactiva con su stock e historial", [back.body?.data?.reactivated, (await variantsOf(a.id, rojo.id))[0].stock_quantity], [3, 5]);
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
