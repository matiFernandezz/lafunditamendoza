// Pruebas de la API unificada (Route Handlers de Next + Supabase), SIN Express.
//
// Requisitos: Supabase local arriba (`npx supabase start`) con las migraciones
// aplicadas, y el frontend corriendo (`npm run dev`). Uso, desde /frontend:
//
//   npm run test:unificar
//
// Solo corre contra un Supabase LOCAL (se niega si la URL no es localhost).
// Crea sus propios datos (producto, variantes, proveedor, usuario admin de
// prueba) y los borra al terminar. Lo único que no vuelve atrás es el contador
// de códigos de reserva (LF-xxxx), que avanza.

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

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
const MARK = `ZZ TEST UNIFICAR ${RUN}`;
const FAKE_ID = "00000000-0000-4000-8000-000000000000";

const admin = createClient(SUPABASE_URL, SECRET_KEY, { auth: { persistSession: false } });
const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

// --- mini framework --------------------------------------------------------

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
  check(name, actual === expected, `esperado ${JSON.stringify(expected)}, vino ${JSON.stringify(actual)}`);

let cookieHeader = "";

/** Llama a la app. `auth: false` no manda la sesión. Devuelve { status, body }. */
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

async function stockOf(variantId) {
  const { data } = await admin.from("product_variants").select("stock_quantity").eq("id", variantId).single();
  return data.stock_quantity;
}

async function countRows(table, column, value) {
  const { count } = await admin.from(table).select("id", { count: "exact", head: true }).eq(column, value);
  return count;
}

/** Inicia sesión como en el navegador (@supabase/ssr) y arma el header Cookie. */
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

// --- datos de prueba -------------------------------------------------------

const created = { userId: null, productIds: [], supplierId: null, saleIds: [], orderIds: [], storagePaths: [] };

async function cleanup() {
  const variantIds = [];
  for (const productId of created.productIds) {
    const { data } = await admin.from("product_variants").select("id").eq("product_id", productId);
    variantIds.push(...(data ?? []).map((v) => v.id));
  }

  if (created.orderIds.length > 0) {
    const { data } = await admin.from("web_orders").select("sale_id").in("id", created.orderIds);
    created.saleIds.push(...(data ?? []).map((o) => o.sale_id).filter(Boolean));
    await admin.from("web_orders").delete().in("id", created.orderIds);
  }
  if (variantIds.length > 0) {
    // Por si quedó alguna venta/compra de prueba sin registrar (un test que falló a la mitad).
    const { data: items } = await admin.from("sale_items").select("sale_id").in("variant_id", variantIds);
    created.saleIds.push(...(items ?? []).map((i) => i.sale_id));
    await admin.from("purchase_items").delete().in("variant_id", variantIds);
  }
  if (created.saleIds.length > 0) await admin.from("sales").delete().in("id", created.saleIds);
  if (created.supplierId) {
    await admin.from("purchases").delete().eq("supplier_id", created.supplierId);
    await admin.from("suppliers").delete().eq("id", created.supplierId);
  }
  if (created.productIds.length > 0) await admin.from("products").delete().in("id", created.productIds);
  if (created.storagePaths.length > 0) await admin.storage.from(BUCKET).remove(created.storagePaths);
  if (created.userId) await admin.auth.admin.deleteUser(created.userId);
}

// --- pruebas ---------------------------------------------------------------

async function main() {
  console.log(`App: ${BASE_URL} · Supabase: ${SUPABASE_URL} · corrida ${RUN}`);

  group("0. Entorno");
  const expressUp = await fetch("http://localhost:3001/").then(() => true, () => false);
  check("el backend Express NO está corriendo (puerto 3001 cerrado)", !expressUp);
  const home = await page("/").catch(() => null);
  if (!home) throw new Error(`La app no responde en ${BASE_URL}. Levantala con "npm run dev".`);

  // Usuario admin de prueba + sesión.
  const email = `test-unificar-${RUN}@example.com`;
  const password = `Test-${RUN}-${Math.random().toString(36).slice(2)}`;
  const { data: user, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError) throw new Error(`No se pudo crear el usuario de prueba: ${userError.message}`);
  created.userId = user.user.id;
  const accessToken = await signIn(email, password);

  // Categoría hoja y modelo reales (del seed) para colgar el producto de prueba.
  const { data: categories } = await admin.from("categories").select("id, slug, parent_id");
  const parents = new Set(categories.map((c) => c.parent_id).filter(Boolean));
  const category = categories.find((c) => !parents.has(c.id));
  const { data: models } = await admin.from("iphone_models").select("id, slug").order("sort_order").limit(1);
  const model = models[0];

  // ------------------------------------------------------------------------
  group("1. Admin sin sesión -> 401 en todos los endpoints del panel");
  const adminEndpoints = [
    ["GET", "/api/categories"],
    ["GET", "/api/iphone-models"],
    ["GET", "/api/products"],
    ["POST", "/api/products"],
    ["PATCH", `/api/products/${FAKE_ID}`],
    ["PATCH", `/api/products/${FAKE_ID}/price`],
    ["POST", `/api/products/${FAKE_ID}/images/upload-url`],
    ["POST", `/api/products/${FAKE_ID}/images`],
    ["DELETE", `/api/products/${FAKE_ID}/images/${FAKE_ID}`],
    ["PATCH", `/api/products/${FAKE_ID}/images/reorder`],
    ["POST", "/api/product-variants"],
    ["PATCH", `/api/product-variants/${FAKE_ID}`],
    ["GET", "/api/suppliers"],
    ["POST", "/api/suppliers"],
    ["POST", "/api/purchases"],
    ["GET", "/api/sales"],
    ["POST", "/api/sales"],
    ["GET", "/api/sales/summary"],
    ["POST", `/api/sales/${FAKE_ID}/void`],
    ["GET", "/api/web-orders"],
    ["GET", "/api/web-orders/counts"],
    ["POST", `/api/web-orders/${FAKE_ID}/paid`],
    ["POST", `/api/web-orders/${FAKE_ID}/cancel`],
  ];
  for (const [method, path] of adminEndpoints) {
    const res = await api(method, path, method === "GET" || method === "DELETE" ? undefined : {}, { auth: false });
    check(
      `${method} ${path.replaceAll(FAKE_ID, ":id")}`,
      res.status === 401 && typeof res.body?.error === "string",
      `status ${res.status}`,
    );
  }
  const badCookie = await fetch(`${BASE_URL}/api/products`, { headers: { Cookie: "sb-127-auth-token=base64-eyJ4IjoxfQ" } });
  eq("cookie de sesión inventada -> 401", badCookie.status, 401);
  eq("con sesión válida -> 200", (await api("GET", "/api/categories")).status, 200);

  group("1b. Funciones SQL nuevas: solo service_role");
  const authed = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const rpcCalls = {
    create_sale: { p_payment_method: "efectivo", p_channel: null, p_notes: null, p_discount_percent: 0, p_items: [] },
    create_purchase: { p_supplier_id: FAKE_ID, p_purchase_date: null, p_notes: null, p_items: [] },
    reorder_product_images: { p_product_id: FAKE_ID, p_order: [FAKE_ID] },
  };
  for (const [fn, args] of Object.entries(rpcCalls)) {
    for (const [role, client] of [["anon", anon], ["authenticated", authed]]) {
      const { error } = await client.rpc(fn, args);
      check(`${fn} con rol ${role} -> permiso denegado`, error?.code === "42501", `code ${error?.code ?? "sin error"}`);
    }
  }

  // ------------------------------------------------------------------------
  group("Preparación: producto, variantes y proveedor por la API");
  const productRes = await api("POST", "/api/products", {
    category_id: category.id,
    name: MARK,
    description: "Producto de prueba automática",
  });
  eq("POST /api/products -> 201", productRes.status, 201);
  const product = productRes.body.data;
  created.productIds.push(product.id);

  async function newVariant(suffix, price, stock, extra = {}) {
    const res = await api("POST", "/api/product-variants", {
      product_id: product.id,
      iphone_model_id: null,
      sku: `TEST-${RUN}-${suffix}`,
      price,
      stock_quantity: stock,
      ...extra,
    });
    if (res.status !== 201) throw new Error(`No se pudo crear la variante ${suffix}: ${res.text}`);
    return res.body.data;
  }
  const vA = await newVariant("A", 1000, 10, { color: "Negro" });
  const vB = await newVariant("B", 2500, 5, { iphone_model_id: model.id });
  const vC = await newVariant("C", 999, 3);
  check("POST /api/product-variants x3 -> 201", true);
  eq(
    "SKU repetido -> 409",
    (await api("POST", "/api/product-variants", { product_id: product.id, sku: vA.sku, price: 10 })).status,
    409,
  );

  const supplierRes = await api("POST", "/api/suppliers", { name: MARK, contact_info: " 261 000 " });
  eq("POST /api/suppliers -> 201", supplierRes.status, 201);
  created.supplierId = supplierRes.body.data.id;
  check(
    "GET /api/suppliers lo lista",
    (await api("GET", "/api/suppliers")).body.data.some((s) => s.id === created.supplierId),
  );

  // ------------------------------------------------------------------------
  group("2. Venta con descuento 15% -> total correcto, stock descontado");
  const saleRes = await api("POST", "/api/sales", {
    payment_method: "efectivo",
    channel: "feria",
    discount_percent: 15,
    notes: MARK,
    items: [
      { variant_id: vA.id, quantity: 3, unit_price: 1000 },
      { variant_id: vB.id, quantity: 1, unit_price: 2500 },
    ],
  });
  eq("POST /api/sales -> 201", saleRes.status, 201);
  const sale = saleRes.body.data;
  created.saleIds.push(sale.id);
  eq("subtotal = 3x1000 + 1x2500 = 5500", sale.subtotal, 5500);
  eq("discount_amount = 15% = 825", sale.discount_amount, 825);
  eq("total_amount = 4675", sale.total_amount, 4675);
  eq("discount_percent = 15", sale.discount_percent, 15);
  eq("status = completada", sale.status, "completada");
  eq("devuelve los 2 sale_items", sale.sale_items?.length, 2);
  eq("stock A: 10 -> 7", await stockOf(vA.id), 7);
  eq("stock B: 5 -> 4", await stockOf(vB.id), 4);

  const roundRes = await api("POST", "/api/sales", {
    payment_method: "transferencia",
    discount_percent: 15,
    notes: MARK,
    items: [{ variant_id: vC.id, quantity: 1, unit_price: 999 }],
  });
  created.saleIds.push(roundRes.body?.data?.id);
  eq("descuento redondeado a pesos: 15% de 999 = 150", roundRes.body?.data?.discount_amount, 150);
  eq("total 999 - 150 = 849", roundRes.body?.data?.total_amount, 849);

  const tampered = await api("POST", "/api/sales", {
    payment_method: "efectivo",
    notes: MARK,
    items: [{ variant_id: vA.id, quantity: 1, unit_price: 1 }],
  });
  eq("precio manipulado/viejo en el payload -> 409", tampered.status, 409);
  check("…con mensaje del precio actual", /El precio de TEST-.* cambió: ahora es/.test(tampered.body?.error ?? ""), tampered.body?.error);
  eq("…y no descuenta stock", await stockOf(vA.id), 7);

  const invalidSales = [
    ["descuento 101", { payment_method: "efectivo", discount_percent: 101, items: [{ variant_id: vA.id, quantity: 1, unit_price: 1000 }] }],
    ["descuento -1", { payment_method: "efectivo", discount_percent: -1, items: [{ variant_id: vA.id, quantity: 1, unit_price: 1000 }] }],
    ["descuento 12.5", { payment_method: "efectivo", discount_percent: 12.5, items: [{ variant_id: vA.id, quantity: 1, unit_price: 1000 }] }],
    ["cantidad 1.5", { payment_method: "efectivo", items: [{ variant_id: vA.id, quantity: 1.5, unit_price: 1000 }] }],
    ["cantidad 0", { payment_method: "efectivo", items: [{ variant_id: vA.id, quantity: 0, unit_price: 1000 }] }],
    ["cantidad como texto", { payment_method: "efectivo", items: [{ variant_id: vA.id, quantity: "2", unit_price: 1000 }] }],
    ["sin items", { payment_method: "efectivo", items: [] }],
    ["medio de pago inválido", { payment_method: "cheque", items: [{ variant_id: vA.id, quantity: 1, unit_price: 1000 }] }],
    ["canal inválido", { payment_method: "efectivo", channel: "tiktok", items: [{ variant_id: vA.id, quantity: 1, unit_price: 1000 }] }],
    ["variante inexistente", { payment_method: "efectivo", items: [{ variant_id: FAKE_ID, quantity: 1, unit_price: 1000 }] }],
    ["body que no es JSON", undefined],
  ];
  for (const [name, payload] of invalidSales) {
    eq(`validación: ${name} -> 400`, (await api("POST", "/api/sales", payload)).status, 400);
  }
  eq("descuento 100% -> total 0", await (async () => {
    const res = await api("POST", "/api/sales", {
      payment_method: "efectivo", discount_percent: 100, notes: MARK,
      items: [{ variant_id: vC.id, quantity: 1, unit_price: 999 }],
    });
    created.saleIds.push(res.body?.data?.id);
    return res.body?.data?.total_amount;
  })(), 0);

  // ------------------------------------------------------------------------
  group("3. Venta con stock insuficiente -> error claro, nada guardado");
  const salesBefore = await countRows("sales", "notes", MARK);
  const stockBefore = [await stockOf(vA.id), await stockOf(vB.id)];
  // El primer item alcanza y el segundo no: no tiene que quedar nada del primero.
  const noStock = await api("POST", "/api/sales", {
    payment_method: "efectivo",
    notes: MARK,
    items: [
      { variant_id: vA.id, quantity: 2, unit_price: 1000 },
      { variant_id: vB.id, quantity: 99, unit_price: 2500 },
    ],
  });
  eq("POST /api/sales -> 400", noStock.status, 400);
  check("mensaje claro (SKU, cuánto queda, cuánto se pidió)", /No alcanza el stock de TEST-.*-B: quedan 4 y se quieren vender 99/.test(noStock.body?.error ?? ""), noStock.body?.error);
  eq("no se creó ninguna venta", await countRows("sales", "notes", MARK), salesBefore);
  eq("stock A intacto", await stockOf(vA.id), stockBefore[0]);
  eq("stock B intacto", await stockOf(vB.id), stockBefore[1]);
  eq("no quedaron sale_items sueltos de B", await countRows("sale_items", "variant_id", vB.id), 1);
  const splitLines = await api("POST", "/api/sales", {
    payment_method: "efectivo",
    notes: MARK,
    items: [
      { variant_id: vB.id, quantity: 3, unit_price: 2500 },
      { variant_id: vB.id, quantity: 3, unit_price: 2500 },
    ],
  });
  eq("misma variante en dos líneas que juntas superan el stock -> 400", splitLines.status, 400);
  eq("…stock B intacto", await stockOf(vB.id), stockBefore[1]);

  // ------------------------------------------------------------------------
  group("4. Anular venta -> stock restaurado, estado anulada, segunda vez error");
  eq("anular sin motivo -> 400", (await api("POST", `/api/sales/${sale.id}/void`, { reason: "  " })).status, 400);
  const voidRes = await api("POST", `/api/sales/${sale.id}/void`, { reason: "Prueba automática" });
  eq("POST /api/sales/:id/void -> 200", voidRes.status, 200);
  eq("status = anulada", voidRes.body?.data?.status, "anulada");
  eq("guarda el motivo", voidRes.body?.data?.void_reason, "Prueba automática");
  check("guarda la fecha de anulación", !!voidRes.body?.data?.voided_at);
  eq("stock A restaurado: 7 -> 10", await stockOf(vA.id), 10);
  eq("stock B restaurado: 4 -> 5", await stockOf(vB.id), 5);
  const voidAgain = await api("POST", `/api/sales/${sale.id}/void`, { reason: "Otra vez" });
  eq("segunda anulación -> 409", voidAgain.status, 409);
  eq("…con mensaje", voidAgain.body?.error, "Esta venta ya estaba anulada.");
  eq("…y el stock no se devuelve dos veces", await stockOf(vA.id), 10);
  eq("anular venta inexistente -> 404", (await api("POST", `/api/sales/${FAKE_ID}/void`, { reason: "x" })).status, 404);

  group("4b. Historial y resumen");
  const from = new Date(Date.now() - 3600_000).toISOString();
  const to = new Date(Date.now() + 3600_000).toISOString();
  const list = await api("GET", `/api/sales?${new URLSearchParams({ from, to, page: "1", page_size: "100" })}`);
  eq("GET /api/sales -> 200", list.status, 200);
  const listed = list.body.data.find((s) => s.id === sale.id);
  check("la venta aparece en el historial, anulada", listed?.status === "anulada");
  check("con items, producto y modelo embebidos", listed?.sale_items?.[0]?.variant?.product?.name === MARK);
  check("paginación presente", list.body.pagination?.page === 1 && list.body.pagination?.total >= 3);
  const summary = await api("GET", `/api/sales/summary?${new URLSearchParams({ from, to })}`);
  eq("GET /api/sales/summary -> 200", summary.status, 200);
  check("el resumen trae totales y top de productos", typeof summary.body.data?.total_amount === "number" && Array.isArray(summary.body.data?.top_products));
  eq("summary sin rango -> 400", (await api("GET", "/api/sales/summary")).status, 400);
  eq("rango inválido -> 400", (await api("GET", "/api/sales?from=ayer")).status, 400);

  // ------------------------------------------------------------------------
  group("5. Compra -> stock sube");
  const purchaseRes = await api("POST", "/api/purchases", {
    supplier_id: created.supplierId,
    purchase_date: "2026-10-01",
    items: [
      { variant_id: vA.id, quantity: 5, unit_cost: 400 },
      { variant_id: vC.id, quantity: 2, unit_cost: 350.5 },
    ],
  });
  eq("POST /api/purchases -> 201", purchaseRes.status, 201);
  eq("total calculado en el servidor: 5x400 + 2x350.5 = 2701", purchaseRes.body?.data?.total_amount, 2701);
  eq("devuelve los 2 purchase_items", purchaseRes.body?.data?.purchase_items?.length, 2);
  eq("respeta la fecha", purchaseRes.body?.data?.purchase_date, "2026-10-01");
  eq("stock A: 10 -> 15", await stockOf(vA.id), 15);
  eq("stock C: 1 -> 3", await stockOf(vC.id), 3);
  const { data: costRow } = await admin.from("product_variants").select("cost_price").eq("id", vA.id).single();
  eq("actualiza el último costo de A", Number(costRow.cost_price), 400);

  const purchasesBefore = await countRows("purchases", "supplier_id", created.supplierId);
  const badPurchase = await api("POST", "/api/purchases", {
    supplier_id: created.supplierId,
    items: [
      { variant_id: vA.id, quantity: 1, unit_cost: 100 },
      { variant_id: FAKE_ID, quantity: 1, unit_cost: 100 },
    ],
  });
  eq("compra con una variante inexistente -> 400", badPurchase.status, 400);
  eq("…no queda compra a medias", await countRows("purchases", "supplier_id", created.supplierId), purchasesBefore);
  eq("…stock A intacto", await stockOf(vA.id), 15);
  eq("proveedor inexistente -> 400", (await api("POST", "/api/purchases", { supplier_id: FAKE_ID, items: [{ variant_id: vA.id, quantity: 1, unit_cost: 1 }] })).status, 400);
  eq("cantidad negativa -> 400", (await api("POST", "/api/purchases", { supplier_id: created.supplierId, items: [{ variant_id: vA.id, quantity: -2, unit_cost: 1 }] })).status, 400);
  eq("fecha imposible (2026-02-31) -> 400", (await api("POST", "/api/purchases", { supplier_id: created.supplierId, purchase_date: "2026-02-31", items: [{ variant_id: vA.id, quantity: 1, unit_cost: 1 }] })).status, 400);

  // ------------------------------------------------------------------------
  group("6. Edición de stock y precio (individual y bulk)");
  const stockEdit = await api("PATCH", `/api/product-variants/${vA.id}`, { stock_quantity: 20 });
  eq("PATCH stock -> 200", stockEdit.status, 200);
  eq("stock A = 20", await stockOf(vA.id), 20);
  const priceEdit = await api("PATCH", `/api/product-variants/${vA.id}`, { price: 1200 });
  eq("PATCH precio individual -> 200 y devuelve 1200", priceEdit.body?.data?.price, 1200);
  eq("…sin tocar el stock", priceEdit.body?.data?.stock_quantity, 20);
  eq("stock negativo -> 400", (await api("PATCH", `/api/product-variants/${vA.id}`, { stock_quantity: -1 })).status, 400);
  eq("stock decimal -> 400", (await api("PATCH", `/api/product-variants/${vA.id}`, { stock_quantity: 2.5 })).status, 400);
  eq("precio 0 -> 400", (await api("PATCH", `/api/product-variants/${vA.id}`, { price: 0 })).status, 400);
  eq("precio como texto -> 400", (await api("PATCH", `/api/product-variants/${vA.id}`, { price: "100" })).status, 400);
  eq("body vacío -> 400", (await api("PATCH", `/api/product-variants/${vA.id}`, {})).status, 400);
  eq("variante inexistente -> 404", (await api("PATCH", `/api/product-variants/${FAKE_ID}`, { price: 5 })).status, 404);

  const bulk = await api("PATCH", `/api/products/${product.id}/price`, { price: 3000 });
  eq("PATCH precio bulk -> 200", bulk.status, 200);
  check("las 3 variantes quedan en 3000", bulk.body?.data?.length === 3 && bulk.body.data.every((v) => v.price === 3000));
  eq("bulk con precio negativo -> 400", (await api("PATCH", `/api/products/${product.id}/price`, { price: -5 })).status, 400);
  eq("bulk de producto inexistente -> 404", (await api("PATCH", `/api/products/${FAKE_ID}/price`, { price: 5 })).status, 404);

  const rename = await api("PATCH", `/api/products/${product.id}`, { description: "  Nueva descripción  " });
  eq("PATCH descripción (recorta espacios)", rename.body?.data?.description, "Nueva descripción");
  const adminList = await api("GET", "/api/products");
  const adminProduct = adminList.body.data.find((p) => p.id === product.id);
  check("GET /api/products trae el producto con variantes y cost_price", adminProduct?.product_variants?.length === 3 && "cost_price" in adminProduct.product_variants[0]);
  eq("GET /api/products?category_id=mal -> 400", (await api("GET", "/api/products?category_id=x")).status, 400);
  check("GET /api/iphone-models", (await api("GET", "/api/iphone-models")).body.data.length > 0);

  // ------------------------------------------------------------------------
  group("7. Foto por URL firmada -> aparece en el catálogo; borrado -> desaparece");
  eq("upload-url rechaza GIF -> 400", (await api("POST", `/api/products/${product.id}/images/upload-url`, { content_type: "image/gif", size: 100 })).status, 400);
  const tooBig = await api("POST", `/api/products/${product.id}/images/upload-url`, { content_type: "image/png", size: 10 * 1024 * 1024 + 1 });
  eq("upload-url rechaza más de 10MB -> 400", tooBig.status, 400);
  eq("…con mensaje", tooBig.body?.error, "La imagen no puede superar 10MB");
  eq("upload-url de producto inexistente -> 404", (await api("POST", `/api/products/${FAKE_ID}/images/upload-url`, { content_type: "image/png", size: 100 })).status, 404);
  eq("registrar un path que no se subió -> 400", (await api("POST", `/api/products/${product.id}/images`, { path: `${FAKE_ID}.png` })).status, 400);
  eq("registrar un path con carpetas -> 400", (await api("POST", `/api/products/${product.id}/images`, { path: `../x/${FAKE_ID}.png` })).status, 400);
  const noToken = await anon.storage.from(BUCKET).upload(`${FAKE_ID}.png`, PNG, { contentType: "image/png" });
  check("subir a Storage sin URL firmada (anon) -> rechazado", !!noToken.error);

  async function uploadImage(contentType = "image/png") {
    const signed = await api("POST", `/api/products/${product.id}/images/upload-url`, { content_type: contentType, size: PNG.length });
    if (signed.status !== 200) throw new Error(`upload-url falló: ${signed.text}`);
    created.storagePaths.push(signed.body.data.path);
    // Igual que el navegador: sube directo a Storage con la anon key + el token firmado.
    const up = await anon.storage.from(BUCKET).uploadToSignedUrl(signed.body.data.path, signed.body.data.token, PNG, { contentType });
    return { signed: signed.body.data, uploadError: up.error };
  }

  const first = await uploadImage();
  check("subida directa a Storage con el token -> ok", !first.uploadError, first.uploadError?.message);
  const reg = await api("POST", `/api/products/${product.id}/images`, { path: first.signed.path });
  eq("POST /api/products/:id/images (registrar) -> 201", reg.status, 201);
  const image = reg.body.data;
  eq("primera foto: sort_order 0", image?.sort_order, 0);
  eq("registrar dos veces la misma -> 409", (await api("POST", `/api/products/${product.id}/images`, { path: first.signed.path })).status, 409);
  eq("la URL pública de la foto responde 200", (await fetch(image.url)).status, 200);

  const wrongType = await api("POST", `/api/products/${product.id}/images/upload-url`, { content_type: "image/png", size: 10 });
  created.storagePaths.push(wrongType.body.data.path);
  const lie = await anon.storage.from(BUCKET).uploadToSignedUrl(wrongType.body.data.path, wrongType.body.data.token, Buffer.from("<html>"), { contentType: "text/html" });
  check("el bucket rechaza un tipo no permitido aunque tenga token", !!lie.error);

  const { data: anonImages } = await anon.from("product_images").select("id, url").eq("product_id", product.id);
  check("la foto se ve con la anon key (catálogo público)", anonImages?.some((i) => i.id === image.id));
  const detailWithPhoto = await page(`/producto/${product.id}`);
  eq("GET /producto/:id -> 200", detailWithPhoto.status, 200);
  check("el detalle público muestra la foto", detailWithPhoto.html.includes(first.signed.path));

  const second = await uploadImage("image/webp");
  const reg2 = await api("POST", `/api/products/${product.id}/images`, { path: second.signed.path });
  eq("segunda foto: sort_order 1", reg2.body?.data?.sort_order, 1);
  const reorder = await api("PATCH", `/api/products/${product.id}/images/reorder`, { order: [reg2.body.data.id, image.id] });
  eq("PATCH reorder -> 200", reorder.status, 200);
  check("el orden queda invertido", reorder.body?.data?.[0]?.id === reg2.body.data.id && reorder.body.data[0].sort_order === 0 && reorder.body.data[1].sort_order === 1);
  eq("reorder con una foto faltante -> 400", (await api("PATCH", `/api/products/${product.id}/images/reorder`, { order: [image.id] })).status, 400);
  eq("reorder con repetidas -> 400", (await api("PATCH", `/api/products/${product.id}/images/reorder`, { order: [image.id, image.id] })).status, 400);

  const del = await api("DELETE", `/api/products/${product.id}/images/${image.id}`);
  eq("DELETE foto -> 204", del.status, 204);
  eq("la fila desaparece", await countRows("product_images", "id", image.id), 0);
  const gone = await admin.storage.from(BUCKET).exists(first.signed.path);
  check("el archivo se borra de Storage", gone.data === false);
  check("el detalle público ya no la muestra", !(await page(`/producto/${product.id}`)).html.includes(first.signed.path));
  eq("borrarla de nuevo -> 404", (await api("DELETE", `/api/products/${product.id}/images/${image.id}`)).status, 404);

  // ------------------------------------------------------------------------
  group("8. Catálogo público (home, categoría, modelo, detalle)");
  // D: sin stock. E: inactiva. No tienen que aparecer para el público.
  const vD = await newVariant("D", 3000, 0, { color: "SinStockXQ" });
  const vE = await newVariant("E", 3000, 4, { color: "InactivaXQ" });
  await admin.from("product_variants").update({ active: false }).eq("id", vE.id);
  await api("PATCH", `/api/product-variants/${vA.id}`, { price: 1234 });

  eq("GET / -> 200", (await page("/")).status, 200);
  // Un tipo (categoría hija) no tiene página propia: es un filtro de su
  // categoría de tope, y su URL suelta redirige ahí de forma permanente.
  const parentCategory = categories.find((c) => c.id === category.parent_id);
  const listPath = parentCategory
    ? `/categoria/${parentCategory.slug}?tipo=${category.slug}`
    : `/categoria/${category.slug}`;
  if (parentCategory) {
    eq(`GET /categoria/${category.slug} -> 308 (al filtro)`, (await page(`/categoria/${category.slug}`)).status, 308);
    check("el producto aparece en la categoría de tope (sin filtro)", (await page(`/categoria/${parentCategory.slug}`)).html.includes(MARK));
  }
  const cat = await page(listPath);
  eq(`GET ${listPath} -> 200`, cat.status, 200);
  check("el producto con stock aparece en su categoría", cat.html.includes(MARK));
  const mod = await page(`/modelo/${model.slug}`);
  eq(`GET /modelo/${model.slug} -> 200`, mod.status, 200);
  check("aparece en la página del modelo (variante del modelo o universal)", mod.html.includes(MARK));
  const detail = await page(`/producto/${product.id}`);
  eq("GET /producto/:id -> 200", detail.status, 200);
  check("el detalle muestra el nombre", detail.html.includes(MARK));
  check("el detalle muestra el color con stock (Negro)", detail.html.includes("Negro"));
  check("el detalle NO muestra la variante sin stock", !detail.html.includes("SinStockXQ"));
  check("el detalle NO muestra la variante inactiva", !detail.html.includes("InactivaXQ"));

  const { data: anonVariants } = await anon
    .from("products")
    .select("id, product_variants!inner(id, stock_quantity)")
    .eq("id", product.id)
    .eq("product_variants.active", true)
    .gt("product_variants.stock_quantity", 0)
    .maybeSingle();
  const visible = (anonVariants?.product_variants ?? []).map((v) => v.id);
  check("consulta pública: solo variantes activas con stock > 0", visible.includes(vA.id) && !visible.includes(vD.id) && !visible.includes(vE.id));
  const { error: costError } = await anon.from("product_variants").select("cost_price").limit(1);
  check("la anon key sigue sin poder leer cost_price", !!costError);
  const { data: anonSales } = await anon.from("sales").select("id").limit(1);
  eq("la anon key sigue sin ver ventas", anonSales?.length ?? 0, 0);

  // Sin stock en ninguna variante: el producto sale del catálogo.
  for (const v of [vA, vB, vC]) await api("PATCH", `/api/product-variants/${v.id}`, { stock_quantity: 0 });
  check("sin stock en ninguna variante -> desaparece de la categoría", !(await page(`/categoria/${category.slug}`)).html.includes(MARK));
  eq("…y su detalle da 404", (await page(`/producto/${product.id}`)).status, 404);
  await api("PATCH", `/api/product-variants/${vA.id}`, { stock_quantity: 6 });
  await api("PATCH", `/api/product-variants/${vB.id}`, { stock_quantity: 6 });

  // ------------------------------------------------------------------------
  group("Extra: reservas de la tienda (también pasaban por Express)");
  const badOrder = await api("POST", "/api/tienda/reservas", { customer_name: "A", customer_phone: "1", items: [] }, { auth: false });
  eq("reserva inválida -> 400 (pública, no 401)", badOrder.status, 400);
  const orderRes = await api("POST", "/api/tienda/reservas", {
    customer_name: MARK,
    customer_phone: "261 555 0000",
    items: [{ variant_id: vA.id, quantity: 2, unit_price: 1 }],
  }, { auth: false });
  eq("POST /api/tienda/reservas sin sesión -> 201", orderRes.status, 201);
  const order = orderRes.body.data;
  created.orderIds.push(order.id);
  eq("el total usa el precio de la base (2 x 1234), no el del navegador", order.total_amount, 2468);
  eq("reserva el stock: 6 -> 4", await stockOf(vA.id), 4);
  eq("GET /reserva/:token -> 200", (await page(`/reserva/${order.public_token}`)).status, 200);
  check("la página de la reserva muestra el código", (await page(`/reserva/${order.public_token}`)).html.includes(order.code));
  eq("token inexistente -> 404", (await page(`/reserva/${FAKE_ID}`)).status, 404);
  eq("reservar más que el stock -> 409", (await api("POST", "/api/tienda/reservas", { customer_name: MARK, customer_phone: "2615550000", items: [{ variant_id: vA.id, quantity: 9 }] }, { auth: false })).status, 409);
  check("GET /api/web-orders la lista como pendiente", (await api("GET", "/api/web-orders?status=pendiente")).body.data.some((o) => o.id === order.id));
  check("GET /api/web-orders/counts", (await api("GET", "/api/web-orders/counts")).body.data.pendiente >= 1);
  const cancel = await api("POST", `/api/web-orders/${order.id}/cancel`, { reason: "Prueba" });
  eq("cancelar -> status cancelada", cancel.body?.data?.status, "cancelada");
  eq("…y devuelve el stock: 4 -> 6", await stockOf(vA.id), 6);
  eq("cancelar dos veces -> 409", (await api("POST", `/api/web-orders/${order.id}/cancel`, {})).status, 409);

  const order2 = await api("POST", "/api/tienda/reservas", { customer_name: MARK, customer_phone: "2615550000", items: [{ variant_id: vB.id, quantity: 1 }] }, { auth: false });
  created.orderIds.push(order2.body.data.id);
  const paid = await api("POST", `/api/web-orders/${order2.body.data.id}/paid`);
  eq("marcar pagada -> status pagada", paid.body?.data?.status, "pagada");
  check("…genera la venta", !!paid.body?.data?.sale_id);
  eq("…stock B descontado una sola vez: 6 -> 5", await stockOf(vB.id), 5);
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
