// Pruebas de la compra con grilla: la lógica de la pantalla (purchaseLogic.ts,
// importada directo: Node 24 corre TypeScript sin compilar) y la API real
// (POST /api/purchases con `products`, GET /api/purchases/last-costs).
//
// Mismos requisitos que test-unificar: Supabase LOCAL arriba con las
// migraciones aplicadas y el frontend corriendo (`npm run dev`). Uso:
//
//   npm run test:compras
//
// Crea sus propios datos y los borra al terminar.

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import {
  PRICE_ROUNDING,
  UNIVERSAL,
  blockPricing,
  buildPurchasePayload,
  effectiveCost,
  formatArDate,
  indexLastCosts,
  maskArDate,
  parseArDate,
  productPrevCost,
  quantityState,
  roundPrice,
  suggestPrice,
  summarize,
  unitGain,
  validatePurchase,
  variantPrevCost,
} from "../src/app/admin/compras/purchaseLogic.ts";

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
const MARK = `ZZ TEST COMPRAS ${RUN}`;
const FAKE_ID = "00000000-0000-4000-8000-000000000000";
const TODAY = formatArDate(new Date());

const admin = createClient(SUPABASE_URL, SECRET_KEY, { auth: { persistSession: false } });
const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

// --- mini framework (igual que test-unificar) --------------------------------

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

// --- acceso directo a la base, para verificar ---------------------------------

async function variantsOf(productId) {
  const { data } = await admin
    .from("product_variants")
    .select("id, sku, color, price, cost_price, stock_quantity, iphone_model_id, active")
    .eq("product_id", productId);
  return (data ?? []).map((v) => ({ ...v, price: Number(v.price), cost_price: Number(v.cost_price) }));
}

async function variant(id) {
  const { data } = await admin.from("product_variants").select("price, cost_price, stock_quantity").eq("id", id).single();
  return { price: Number(data.price), cost: Number(data.cost_price), stock: data.stock_quantity };
}

async function countPurchases(supplierId) {
  const { count } = await admin.from("purchases").select("id", { count: "exact", head: true }).eq("supplier_id", supplierId);
  return count;
}

async function countProductsNamed(name) {
  const { count } = await admin.from("products").select("id", { count: "exact", head: true }).eq("name", name);
  return count;
}

async function snapshot(productId) {
  return JSON.stringify((await variantsOf(productId)).sort((a, b) => a.id.localeCompare(b.id)));
}

// --- lo mismo que hace la pantalla al elegir un producto ----------------------

/** Bloque de un producto existente con todas sus variantes y la cantidad vacía. */
async function blockFor(product, key) {
  const lastCosts = (await api("GET", "/api/purchases/last-costs")).body.data;
  const index = indexLastCosts(lastCosts);
  const variants = await variantsOf(product.id);
  const prev = productPrevCost(product.id, variants, index);
  return {
    kind: "existing",
    key,
    productId: product.id,
    name: product.name,
    bulkCost: prev !== null ? String(prev) : "",
    newSalePrice: "",
    productPrevCost: prev,
    rows: variants.map((v) => ({
      key: v.id,
      variantId: v.id,
      modelId: v.iphone_model_id ?? UNIVERSAL,
      color: v.color ?? "",
      quantity: "",
      cost: "",
      costTouched: false,
      currentStock: v.stock_quantity,
      currentPrice: v.price,
      prevCost: variantPrevCost(v, index),
    })),
  };
}

const setRow = (block, variantId, patch) => Object.assign(block.rows.find((r) => r.variantId === variantId), patch);

function newDraftRow(key, modelId, patch = {}) {
  return { key, modelId, color: "", quantity: "", price: "", cost: "", costTouched: false, ...patch };
}

/** Valida como la pantalla y, si pasa, registra. Devuelve { validation, payload, res }. */
async function register(form, existingNames, skuByKey = new Map()) {
  const validation = validatePurchase(form, existingNames);
  const { payload, blockKeys } = buildPurchasePayload(form, skuByKey);
  const res = validation.message === null ? await api("POST", "/api/purchases", payload) : null;
  return { validation, payload, blockKeys, res };
}

// --- datos de prueba ---------------------------------------------------------

const created = { userId: null, productIds: [], supplierId: null };

async function cleanup() {
  // Productos nuevos creados por la compra (se reconocen por el nombre).
  const { data: marked } = await admin.from("products").select("id").like("name", `${MARK}%`);
  const productIds = [...new Set([...created.productIds, ...(marked ?? []).map((p) => p.id)])];

  if (created.supplierId) {
    await admin.from("purchases").delete().eq("supplier_id", created.supplierId);
    await admin.from("suppliers").delete().eq("id", created.supplierId);
  }
  if (productIds.length > 0) await admin.from("products").delete().in("id", productIds);
  if (created.userId) await admin.auth.admin.deleteUser(created.userId);
}

// --- pruebas -----------------------------------------------------------------

async function main() {
  console.log(`App: ${BASE_URL} · Supabase: ${SUPABASE_URL} · corrida ${RUN}`);

  const home = await fetch(BASE_URL).catch(() => null);
  if (!home) throw new Error(`La app no responde en ${BASE_URL}. Levantala con "npm run dev".`);

  const email = `test-compras-${RUN}@example.com`;
  const password = `Test-${RUN}-${Math.random().toString(36).slice(2)}`;
  const { data: user, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (userError) throw new Error(`No se pudo crear el usuario de prueba: ${userError.message}`);
  created.userId = user.user.id;
  const accessToken = await signIn(email, password);

  const { data: categories } = await admin.from("categories").select("id, parent_id");
  const parents = new Set(categories.map((c) => c.parent_id).filter(Boolean));
  const category = categories.find((c) => !parents.has(c.id));
  const { data: models } = await admin.from("iphone_models").select("id, name").order("sort_order").limit(8);
  if (models.length < 8) throw new Error("Hacen falta al menos 8 modelos de iPhone en la base local.");

  async function newProduct(name, variants) {
    const res = await api("POST", "/api/products", { category_id: category.id, name });
    if (res.status !== 201) throw new Error(`No se pudo crear ${name}: ${res.text}`);
    created.productIds.push(res.body.data.id);
    for (const v of variants) {
      const r = await api("POST", "/api/product-variants", { product_id: res.body.data.id, ...v });
      if (r.status !== 201) throw new Error(`No se pudo crear la variante ${v.sku}: ${r.text}`);
    }
    return res.body.data;
  }

  // P1: un producto por modelo, 8 modelos a $10.000. P2: universal, 2 colores a $5.000.
  const p1 = await newProduct(`${MARK} P1`, models.map((m, i) => ({ iphone_model_id: m.id, sku: `TC-${RUN}-P1-${i}`, price: 10000, stock_quantity: 1 })));
  const p2 = await newProduct(`${MARK} P2`, ["Negro", "Rosa"].map((color, i) => ({ iphone_model_id: null, color, sku: `TC-${RUN}-P2-${i}`, price: 5000, stock_quantity: 0 })));
  const byModel = new Map((await variantsOf(p1.id)).map((v) => [v.iphone_model_id, v.id]));
  const v = models.map((m) => byModel.get(m.id)); // v[0..7]: variantes de P1 en orden de modelo
  const p2v = (await variantsOf(p2.id)).sort((a, b) => a.color.localeCompare(b.color));

  const supplierRes = await api("POST", "/api/suppliers", { name: MARK });
  created.supplierId = supplierRes.body.data.id;
  const supplierId = created.supplierId;
  const names = [p1.name, p2.name];

  // ------------------------------------------------------------------------
  group("0. Seguridad de lo nuevo");
  eq("GET /api/purchases/last-costs sin sesión -> 401", (await api("GET", "/api/purchases/last-costs", undefined, { auth: false })).status, 401);
  eq("POST /api/purchases (grilla) sin sesión -> 401", (await api("POST", "/api/purchases", { products: [] }, { auth: false })).status, 401);
  const authed = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const rpcCalls = {
    create_purchase_grid: { p_supplier_id: FAKE_ID, p_purchase_date: null, p_notes: null, p_products: [] },
    last_purchase_costs: {},
  };
  for (const [fn, args] of Object.entries(rpcCalls)) {
    for (const [role, client] of [["anon", anon], ["authenticated", authed]]) {
      const { error } = await client.rpc(fn, args);
      check(`${fn} con rol ${role} -> permiso denegado`, error?.code === "42501", `code ${error?.code ?? "sin error"}`);
    }
  }

  // ------------------------------------------------------------------------
  group("1. Producto existente: 3 modelos con cantidad y 5 vacíos -> solo entran 3");
  const b1 = await blockFor(p1, "b1");
  eq("el bloque precarga las 8 variantes", b1.rows.length, 8);
  check("todas con la cantidad vacía", b1.rows.every((r) => r.quantity === ""));
  eq("sin compras previas no hay costo anterior", b1.productPrevCost, null);
  b1.bulkCost = "4000";
  setRow(b1, v[0], { quantity: "2" });
  setRow(b1, v[1], { quantity: "3" });
  setRow(b1, v[2], { quantity: "5" });
  setRow(b1, v[3], { quantity: "0" }); // 0 se ignora igual que vacío
  const form1 = { supplierId, date: TODAY, blocks: [b1] };
  eq("resumen de la pantalla: 1 producto, 10 unidades, $40.000", summarize(form1.blocks), { products: 1, units: 10, total: 40000 });
  const t1 = await register(form1, names);
  eq("la validación no pide nada (las filas vacías no dan error)", t1.validation.message, null);
  eq("el payload lleva solo 3 filas", t1.payload.products[0].rows.length, 3);
  eq("POST /api/purchases -> 201", t1.res.status, 201);
  eq("la compra tiene 3 items", t1.res.body.data.purchase_items.length, 3);
  eq("total = 10 x 4000", t1.res.body.data.total_amount, 40000);
  eq("stock modelo 1: 1 -> 3", (await variant(v[0])).stock, 3);
  eq("stock modelo 2: 1 -> 4", (await variant(v[1])).stock, 4);
  eq("stock modelo 3: 1 -> 6", (await variant(v[2])).stock, 6);
  for (const i of [3, 4, 5, 6, 7]) eq(`stock modelo ${i + 1} (sin cantidad): sigue en 1`, (await variant(v[i])).stock, 1);
  for (const i of [0, 1, 2]) eq(`costo del modelo ${i + 1} = 4000`, (await variant(v[i])).cost, 4000);
  eq("costo de un modelo no comprado: sigue en 0", (await variant(v[5])).cost, 0);
  eq("ningún precio de venta cambió", (await variantsOf(p1.id)).every((x) => x.price === 10000), true);

  // ------------------------------------------------------------------------
  group("2. Costo para todos + una fila con costo propio");
  const b2 = await blockFor(p1, "b2");
  eq("el costo para todos arranca con el último costo (4000)", b2.bulkCost, "4000");
  b2.bulkCost = "4500";
  setRow(b2, v[0], { quantity: "2" });
  setRow(b2, v[1], { quantity: "1", cost: "5200", costTouched: true });
  eq("la fila sin tocar sigue al costo para todos", effectiveCost(b2.rows.find((r) => r.variantId === v[0]), b2.bulkCost), "4500");
  eq("la fila editada a mano conserva el suyo", effectiveCost(b2.rows.find((r) => r.variantId === v[1]), b2.bulkCost), "5200");
  b2.bulkCost = "4600"; // cambiar el general no pisa la fila editada
  eq("…aunque después cambie el costo para todos", effectiveCost(b2.rows.find((r) => r.variantId === v[1]), b2.bulkCost), "5200");
  b2.bulkCost = "4500";
  const t2 = await register({ supplierId, date: TODAY, blocks: [b2] }, names);
  eq("POST -> 201", t2.res.status, 201);
  eq("total = 2 x 4500 + 1 x 5200", t2.res.body.data.total_amount, 14200);
  eq("costo guardado modelo 1 = 4500", (await variant(v[0])).cost, 4500);
  eq("costo guardado modelo 2 = 5200", (await variant(v[1])).cost, 5200);
  const { data: items2 } = await admin.from("purchase_items").select("variant_id, unit_cost").eq("purchase_id", t2.res.body.data.id);
  eq("items con su costo", items2.map((i) => Number(i.unit_cost)).sort(), [4500, 5200]);

  // ------------------------------------------------------------------------
  group("7. Costo anterior y precio sugerido (números concretos)");
  eq("constante de redondeo = 100", PRICE_ROUNDING, 100);
  eq("sugerido: costo 4000 -> 5000 con precio 10000 = 12500", suggestPrice(5000, 10000, 4000), 12500);
  eq("sugerido: costo 4000 -> 4300 = 10750 -> redondea a 10800", suggestPrice(4300, 10000, 4000), 10800);
  eq("sugerido: costo 4000 -> 4290 = 10725 -> redondea a 10700", suggestPrice(4290, 10000, 4000), 10700);
  eq("sugerido: costo 3000 -> 3300 con precio 7900 = 8690 -> 8700", suggestPrice(3300, 7900, 3000), 8700);
  eq("costo igual al anterior -> sin sugerencia", suggestPrice(4000, 10000, 4000), null);
  eq("sin costo anterior -> sin sugerencia", suggestPrice(4000, 10000, null), null);
  eq("roundPrice(10749) = 10700", roundPrice(10749), 10700);
  eq("ganancia: precio 10000, costo 4000 = $6000 (150%)", unitGain(10000, 4000), { amount: 6000, percent: 150 });

  const lastCosts = (await api("GET", "/api/purchases/last-costs")).body.data;
  const idx = indexLastCosts(lastCosts);
  eq("costo anterior modelo 1 = 4500 (la última de sus 2 compras)", idx.byVariant.get(v[0]), 4500);
  eq("costo anterior modelo 2 = 5200", idx.byVariant.get(v[1]), 5200);
  eq("costo anterior modelo 3 = 4000 (solo la primera compra)", idx.byVariant.get(v[2]), 4000);
  eq("modelo nunca comprado: sin costo anterior", idx.byVariant.get(v[5]), undefined);
  eq("costo anterior del producto = el de su última compra (5200)", idx.byProduct.get(p1.id), 5200);

  const b7 = await blockFor(p1, "b7");
  b7.bulkCost = "5000";
  setRow(b7, v[2], { quantity: "1" });
  const pricing = blockPricing(b7);
  eq("bloque: precio de venta actual 10000", pricing.price, { min: 10000, max: 10000 });
  eq("bloque: costo anterior de la fila cargada 4000", pricing.prevCost, { min: 4000, max: 4000 });
  eq("bloque: ganancia por unidad con costo 5000 = $5000", pricing.gain, { min: 5000, max: 5000 });
  eq("bloque: 100% sobre el costo", pricing.gainPercent, { min: 100, max: 100 });
  eq("bloque: precio sugerido 12500", pricing.suggestion, 12500);
  setRow(b7, v[0], { quantity: "1" }); // costo anterior 4500 -> otra sugerencia
  eq("filas con costos anteriores distintos -> no inventa un único precio", [blockPricing(b7).suggestion, blockPricing(b7).suggestionVaries], [null, true]);

  // ------------------------------------------------------------------------
  group("3. Dos productos distintos en la misma compra");
  const b3a = await blockFor(p1, "b3a");
  b3a.bulkCost = "4000";
  setRow(b3a, v[4], { quantity: "2" });
  const b3b = await blockFor(p2, "b3b");
  eq("producto universal: una fila por color, sin modelo", b3b.rows.map((r) => r.modelId), [UNIVERSAL, UNIVERSAL]);
  b3b.bulkCost = "1500";
  setRow(b3b, p2v[0].id, { quantity: "6" });
  const before3 = await countPurchases(supplierId);
  const t3 = await register({ supplierId, date: "01/10/2026", blocks: [b3a, b3b] }, names);
  eq("POST -> 201", t3.res.status, 201);
  eq("una sola compra nueva", (await countPurchases(supplierId)) - before3, 1);
  eq("con 2 items", t3.res.body.data.purchase_items.length, 2);
  eq("total = 2 x 4000 + 6 x 1500", t3.res.body.data.total_amount, 17000);
  eq("fecha dd/mm/aaaa -> 2026-10-01", t3.res.body.data.purchase_date, "2026-10-01");
  eq("stock P1 modelo 5: 1 -> 3", (await variant(v[4])).stock, 3);
  eq("stock P2 Negro: 0 -> 6", (await variant(p2v[0].id)).stock, 6);
  eq("stock P2 Rosa (sin cantidad): 0", (await variant(p2v[1].id)).stock, 0);
  eq("sin productos nuevos ni precios tocados", [t3.res.body.data.created_products.length, t3.res.body.data.updated_prices], [0, 0]);

  // ------------------------------------------------------------------------
  group("6. Actualizar precio de venta: solo las filas con cantidad");
  eq("antes: sin el campo, P1 sigue todo en 10000", (await variantsOf(p1.id)).every((x) => x.price === 10000), true);
  eq("…y P2 en 5000", (await variantsOf(p2.id)).every((x) => x.price === 5000), true);
  const b6 = await blockFor(p1, "b6");
  b6.bulkCost = "5000";
  b6.newSalePrice = "12500";
  setRow(b6, v[2], { quantity: "1" });
  setRow(b6, v[3], { quantity: "2" });
  const t6 = await register({ supplierId, date: TODAY, blocks: [b6] }, names);
  eq("POST -> 201", t6.res.status, 201);
  eq("avisa 2 precios actualizados", t6.res.body.data.updated_prices, 2);
  eq("modelo 3 (comprado) -> 12500", (await variant(v[2])).price, 12500);
  eq("modelo 4 (comprado) -> 12500", (await variant(v[3])).price, 12500);
  for (const i of [0, 1, 4, 5, 6, 7]) eq(`modelo ${i + 1} (sin cantidad) sigue en 10000`, (await variant(v[i])).price, 10000);
  eq("precio 0 en el campo -> la pantalla no deja registrar", validatePurchase({ supplierId, date: TODAY, blocks: [{ ...b6, newSalePrice: "0" }] }, names).invalid.has("b6:salePrice"), true);

  // ------------------------------------------------------------------------
  group("4. Producto nuevo desde la compra");
  const newName = `${MARK} NUEVO`;
  const nb = {
    kind: "new",
    key: "n1",
    draft: {
      name: newName,
      description: "Creado desde una compra",
      categoryId: category.id,
      bulkPrice: "9000",
      bulkCost: "3000",
      photos: [],
      rows: [
        newDraftRow("r1", models[0].id, { quantity: "4", price: "9000" }),
        newDraftRow("r2", models[1].id, { price: "9000" }), // sin cantidad: no se crea
        newDraftRow("r3", models[2].id, { color: "Lila", quantity: "2", price: "9500", cost: "3500", costTouched: true }),
      ],
    },
  };
  const skus = new Map([["r1", `TC-${RUN}-N-1`], ["r2", `TC-${RUN}-N-2`], ["r3", `TC-${RUN}-N-3`]]);
  const t4 = await register({ supplierId, date: TODAY, blocks: [nb] }, names, skus);
  eq("validación ok", t4.validation.message, null);
  eq("POST -> 201", t4.res.status, 201);
  eq("devuelve 1 producto creado", t4.res.body.data.created_products.length, 1);
  eq("…ubicado en su bloque", t4.blockKeys[t4.res.body.data.created_products[0].block], "n1");
  const newId = t4.res.body.data.created_products[0].id;
  const { data: newProductRow } = await admin.from("products").select("name, description, category_id, active").eq("id", newId).single();
  eq("producto creado con nombre, descripción y categoría", newProductRow, { name: newName, description: "Creado desde una compra", category_id: category.id, active: true });
  const newVariants = (await variantsOf(newId)).sort((a, b) => a.sku.localeCompare(b.sku));
  eq("se crean solo las 2 variantes con cantidad", newVariants.map((x) => x.sku), [`TC-${RUN}-N-1`, `TC-${RUN}-N-3`]);
  eq("stock = lo comprado", newVariants.map((x) => x.stock_quantity), [4, 2]);
  eq("precio de venta de cada una", newVariants.map((x) => x.price), [9000, 9500]);
  eq("costo: el general y el propio", newVariants.map((x) => x.cost_price), [3000, 3500]);
  eq("color guardado", newVariants[1].color, "Lila");
  eq("total = 4 x 3000 + 2 x 3500", t4.res.body.data.total_amount, 19000);
  const adminProduct = (await api("GET", "/api/products")).body.data.find((p) => p.id === newId);
  eq("queda sin fotos (Catálogo lo marca \"Sin foto\")", adminProduct.product_images.length, 0);

  const nbIncomplete = { ...nb, key: "n2", draft: { ...nb.draft, name: `${MARK} OTRO`, categoryId: "", bulkCost: "", rows: [newDraftRow("x1", "", { quantity: "1" })] } };
  const incomplete = validatePurchase({ supplierId, date: TODAY, blocks: [nbIncomplete] }, names);
  check("producto nuevo incompleto: marca categoría, modelo, costo y precio", ["n2:category", "x1:model", "n2:bulkCost", "x1:price"].every((f) => incomplete.invalid.has(f)), [...incomplete.invalid].join(", "));
  eq("…con un solo mensaje (el primero)", incomplete.message, `Elegí la categoría de ${MARK} OTRO.`);
  eq("nombre repetido se avisa antes de mandar", validatePurchase({ supplierId, date: TODAY, blocks: [{ ...nb, key: "n3" }] }, [...names, newName]).message, `Ya existe un producto llamado "${newName}".`);

  // ------------------------------------------------------------------------
  group("5. Falla a mitad -> no queda NADA (ni producto, ni stock, ni compra)");
  const purchasesBefore = await countPurchases(supplierId);
  const p1Before = await snapshot(p1.id);
  const row = (i, extra = {}) => ({ iphone_model_id: models[i].id, sku: `TC-${RUN}-F-${i}`, price: 9000, quantity: 1, unit_cost: 3000, ...extra });
  const failName = `${MARK} FALLA`;
  const existingBlock = { product_id: p1.id, new_sale_price: 99900, rows: [{ variant_id: v[6], quantity: 7, unit_cost: 4000 }] };

  async function nothingLeft(label) {
    eq(`${label}: no se creó el producto`, await countProductsNamed(failName), 0);
    eq(`${label}: no hay compra nueva`, await countPurchases(supplierId), purchasesBefore);
    eq(`${label}: stock, costos y precios de P1 intactos`, await snapshot(p1.id), p1Before);
    const { count } = await admin.from("product_variants").select("id", { count: "exact", head: true }).like("sku", `TC-${RUN}-F-%`);
    eq(`${label}: no quedó ninguna variante suelta`, count, 0);
  }

  const dupSku = await api("POST", "/api/purchases", {
    supplier_id: supplierId,
    products: [existingBlock, { new_product: { category_id: category.id, name: failName }, rows: [row(0), row(1, { sku: `TC-${RUN}-P1-0` })] }],
  });
  eq("SKU que ya existe en la 2ª fila del producto nuevo -> 409", dupSku.status, 409);
  check("…con mensaje claro", /Ya existe una variante con el SKU/.test(dupSku.body?.error ?? ""), dupSku.body?.error);
  await nothingLeft("SKU duplicado");

  const dupName = await api("POST", "/api/purchases", {
    supplier_id: supplierId,
    products: [existingBlock, { new_product: { category_id: category.id, name: failName }, rows: [row(0)] }, { new_product: { category_id: category.id, name: ` ${p1.name.toLowerCase()} ` }, rows: [row(1)] }],
  });
  eq("nombre de producto repetido (aunque cambien mayúsculas y espacios) -> 409", dupName.status, 409);
  eq("…con mensaje claro", dupName.body?.error, `Ya existe un producto llamado "${p1.name.toLowerCase()}"`);
  await nothingLeft("nombre duplicado");

  const dupCombo = await api("POST", "/api/purchases", {
    supplier_id: supplierId,
    products: [{ new_product: { category_id: category.id, name: failName }, rows: [row(0)] }, { product_id: p1.id, rows: [row(1, { price: 10000 })] }],
  });
  eq("modelo + color que el producto ya tiene -> 409", dupCombo.status, 409);
  await nothingLeft("modelo repetido");

  const ghostVariant = await api("POST", "/api/purchases", {
    supplier_id: supplierId,
    products: [{ new_product: { category_id: category.id, name: failName }, rows: [row(0)] }, { product_id: p1.id, rows: [{ variant_id: FAKE_ID, quantity: 1, unit_cost: 100 }] }],
  });
  eq("variante inexistente en el 2º bloque -> 400", ghostVariant.status, 400);
  await nothingLeft("variante inexistente");

  // La validación del costo también vive en la función SQL (no solo en la ruta).
  const { error: sqlCost } = await admin.rpc("create_purchase_grid", {
    p_supplier_id: supplierId,
    p_purchase_date: null,
    p_notes: null,
    p_products: [existingBlock, { new_product: { category_id: category.id, name: failName }, rows: [row(0), row(1, { unit_cost: 0 })] }],
  });
  eq("SQL directo con costo 0 en la última fila -> CP400", sqlCost?.code, "CP400");
  await nothingLeft("costo inválido (SQL)");
  const { error: sqlQty } = await admin.rpc("create_purchase_grid", {
    p_supplier_id: supplierId,
    p_purchase_date: null,
    p_notes: null,
    p_products: [{ new_product: { category_id: category.id, name: failName }, rows: [row(0, { quantity: 1.5 })] }],
  });
  eq("SQL directo con cantidad 1.5 -> CP400", sqlQty?.code, "CP400");
  await nothingLeft("cantidad con decimales (SQL)");

  const invalidBodies = [
    ["costo 0", [{ product_id: p1.id, rows: [{ variant_id: v[6], quantity: 1, unit_cost: 0 }] }]],
    ["cantidad 0", [{ product_id: p1.id, rows: [{ variant_id: v[6], quantity: 0, unit_cost: 100 }] }]],
    ["cantidad con decimales", [{ product_id: p1.id, rows: [{ variant_id: v[6], quantity: 1.5, unit_cost: 100 }] }]],
    ["cantidad como texto", [{ product_id: p1.id, rows: [{ variant_id: v[6], quantity: "2", unit_cost: 100 }] }]],
    ["precio de venta 0", [{ product_id: p1.id, new_sale_price: 0, rows: [{ variant_id: v[6], quantity: 1, unit_cost: 100 }] }]],
    ["bloque sin filas", [{ product_id: p1.id, rows: [] }]],
    ["sin bloques", []],
    ["variante repetida", [{ product_id: p1.id, rows: [{ variant_id: v[6], quantity: 1, unit_cost: 100 }, { variant_id: v[6], quantity: 1, unit_cost: 100 }] }]],
    ["producto nuevo sin nombre", [{ new_product: { category_id: category.id, name: "  " }, rows: [row(0)] }]],
    ["variante nueva sin precio", [{ new_product: { category_id: category.id, name: failName }, rows: [row(0, { price: undefined })] }]],
    ["variante nueva sin SKU", [{ new_product: { category_id: category.id, name: failName }, rows: [row(0, { sku: "" })] }]],
    ["producto inexistente", [{ product_id: FAKE_ID, rows: [row(0)] }]],
    ["categoría inexistente", [{ new_product: { category_id: FAKE_ID, name: failName }, rows: [row(0)] }]],
  ];
  for (const [name, products] of invalidBodies) {
    eq(`servidor: ${name} -> 400`, (await api("POST", "/api/purchases", { supplier_id: supplierId, products })).status, 400);
  }
  await nothingLeft("después de todos los rechazos");

  // ------------------------------------------------------------------------
  group("Pantalla: validación y fecha");
  const bv = await blockFor(p1, "bv");
  eq("pantalla vacía -> pide un producto", validatePurchase({ supplierId, date: TODAY, blocks: [] }, names).message, "Agregá un producto a la compra.");
  eq("producto sin cantidades -> pide una", validatePurchase({ supplierId, date: TODAY, blocks: [bv] }, names).message, "Cargá la cantidad de al menos un modelo.");
  bv.bulkCost = "";
  setRow(bv, v[0], { quantity: "2" });
  const noCost = validatePurchase({ supplierId, date: TODAY, blocks: [bv] }, names);
  check("cantidad sin costo -> marca el costo para todos y la fila", noCost.invalid.has("bv:bulkCost") && noCost.invalid.has(`${v[0]}:cost`), [...noCost.invalid].join(", "));
  eq("…y no marca las filas sin cantidad", noCost.invalid.has(`${v[1]}:cost`), false);
  eq("…con un solo mensaje", noCost.message, `${p1.name}: falta el costo (mayor a 0).`);
  eq("sin proveedor -> lo pide primero", validatePurchase({ supplierId: "", date: TODAY, blocks: [bv] }, names).message, "Elegí un proveedor.");
  eq("cantidad 1.5 -> inválida", quantityState("1.5"), "invalid");
  eq("cantidad -2 -> inválida", quantityState("-2"), "invalid");
  eq("cantidad vacía o 0 -> se ignora", [quantityState(""), quantityState("0")], ["empty", "empty"]);
  eq("fecha 05/10/2026 -> 2026-10-05", parseArDate("05/10/2026"), "2026-10-05");
  eq("fecha 5/1/2026 -> 2026-01-05", parseArDate("5/1/2026"), "2026-01-05");
  eq("fecha imposible 31/02/2026 -> null", parseArDate("31/02/2026"), null);
  eq("fecha en formato yanqui 2026-10-05 -> null", parseArDate("2026-10-05"), null);
  eq("tipeando solo números arma las barras", [maskArDate("0"), maskArDate("0510"), maskArDate("05102026")], ["0", "05/10", "05/10/2026"]);
  eq("fecha por defecto: hoy en dd/mm/aaaa", /^\d{2}\/\d{2}\/\d{4}$/.test(TODAY) && parseArDate(TODAY) !== null, true);
  eq("fecha mal escrita -> la marca", validatePurchase({ supplierId, date: "32/13/2026", blocks: [bv] }, names).invalid.has("date"), true);

  group("Compatibilidad: el formato viejo de items sigue andando");
  const legacy = await api("POST", "/api/purchases", { supplier_id: supplierId, items: [{ variant_id: v[7], quantity: 1, unit_cost: 4000 }] });
  eq("POST con items -> 201", legacy.status, 201);
  eq("stock modelo 8: 1 -> 2", (await variant(v[7])).stock, 2);
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
