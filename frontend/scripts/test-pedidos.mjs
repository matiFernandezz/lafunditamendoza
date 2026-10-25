// Pruebas de Compras como pedidos: estados (armando → pagado → en camino →
// recibido), el stock que entra solo al recibir, envío, borrar, proveedores
// con forma de pago y envío estimado, y el Inicio (admin_dashboard).
//
// Requisitos: Supabase local arriba con las migraciones aplicadas y el
// frontend corriendo (`npm run dev`). Uso, desde /frontend:
//
//   npm run test:pedidos
//
// Solo corre contra un Supabase LOCAL. Crea sus propios datos y los borra al
// terminar (el contador de números de pedido avanza igual).

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

if (!SUPABASE_URL || !ANON_KEY || !SECRET_KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_SECRET_KEY.");
  process.exit(2);
}
if (!["127.0.0.1", "localhost"].includes(new URL(SUPABASE_URL).hostname)) {
  console.error("Este script crea y borra datos: solo corre contra Supabase LOCAL.");
  process.exit(2);
}

const RUN = Date.now().toString(36);
const MARK = `ZZ TEST PEDIDOS ${RUN}`;
const FAKE_ID = "00000000-0000-4000-8000-000000000000";

const admin = createClient(SUPABASE_URL, SECRET_KEY, { auth: { persistSession: false } });

// --- mini framework (igual que test-compras) ---------------------------------

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
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`No se pudo iniciar sesión: ${error.message}`);
  for (let i = 0; i < 50 && jar.size === 0; i++) await new Promise((r) => setTimeout(r, 20));
  if (jar.size === 0) throw new Error("El login no dejó cookies de sesión");
  cookieHeader = [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function stockOf(variantId) {
  const { data } = await admin.from("product_variants").select("stock_quantity, cost_price").eq("id", variantId).single();
  return { stock: data.stock_quantity, cost: Number(data.cost_price) };
}

const created = { userId: null, supplierId: null, productId: null };

async function cleanup() {
  if (created.supplierId) {
    await admin.from("purchases").delete().eq("supplier_id", created.supplierId);
    await admin.from("suppliers").delete().eq("id", created.supplierId);
  }
  if (created.productId) await admin.from("products").delete().eq("id", created.productId);
  if (created.userId) await admin.auth.admin.deleteUser(created.userId);
}

// --- pruebas -----------------------------------------------------------------

async function main() {
  console.log(`App: ${BASE_URL} · Supabase: ${SUPABASE_URL} · corrida ${RUN}`);

  const home = await fetch(BASE_URL).catch(() => null);
  if (!home) throw new Error(`La app no responde en ${BASE_URL}. Levantala con "npm run dev".`);

  const email = `test-pedidos-${RUN}@example.com`;
  const password = `Test-${RUN}-${Math.random().toString(36).slice(2)}`;
  const { data: user, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (userError) throw new Error(`No se pudo crear el usuario de prueba: ${userError.message}`);
  created.userId = user.user.id;
  await signIn(email, password);

  const { data: categories } = await admin.from("categories").select("id, parent_id");
  const parents = new Set(categories.map((c) => c.parent_id).filter(Boolean));
  const category = categories.find((c) => !parents.has(c.id));
  const product = await api("POST", "/api/products", { category_id: category.id, name: `${MARK} P` });
  if (product.status !== 201) throw new Error(`No se pudo crear el producto: ${product.text}`);
  created.productId = product.body.data.id;
  const variantRes = await api("POST", "/api/product-variants", {
    product_id: created.productId,
    iphone_model_id: null,
    color: "Negro",
    sku: `TP-${RUN}`,
    price: 10000,
    stock_quantity: 2,
  });
  if (variantRes.status !== 201) throw new Error(`No se pudo crear la variante: ${variantRes.text}`);
  const variantId = variantRes.body.data.id;

  const orderBody = (status, extra = {}) => ({
    supplier_id: created.supplierId,
    status,
    ...extra,
    products: [{ product_id: created.productId, rows: [{ variant_id: variantId, quantity: 3, unit_cost: 4000 }] }],
  });

  // ------------------------------------------------------------------------
  group("1. Seguridad");
  eq("GET /api/purchases sin sesión -> 401", (await api("GET", "/api/purchases", undefined, { auth: false })).status, 401);
  eq("GET /api/purchases/:id sin sesión -> 401", (await api("GET", `/api/purchases/${FAKE_ID}`, undefined, { auth: false })).status, 401);
  eq("PATCH /api/purchases/:id sin sesión -> 401", (await api("PATCH", `/api/purchases/${FAKE_ID}`, { status: "pagado" }, { auth: false })).status, 401);
  eq("DELETE /api/purchases/:id sin sesión -> 401", (await api("DELETE", `/api/purchases/${FAKE_ID}`, undefined, { auth: false })).status, 401);
  eq("PATCH /api/suppliers/:id sin sesión -> 401", (await api("PATCH", `/api/suppliers/${FAKE_ID}`, { name: "x" }, { auth: false })).status, 401);
  const { error: rpcError } = await createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } }).rpc(
    "set_purchase_status",
    { p_purchase_id: FAKE_ID, p_status: "pagado" },
  );
  check("anon no puede llamar a set_purchase_status", rpcError !== null);

  // ------------------------------------------------------------------------
  group("2. Proveedores");
  const supplier = await api("POST", "/api/suppliers", {
    name: MARK,
    contact_info: "Instagram @test",
    payment_method: "Transferencia",
    shipping_cost: 2500,
    notes: "Mínimo 3 unidades",
  });
  eq("alta con forma de pago, envío y notas -> 201", supplier.status, 201);
  created.supplierId = supplier.body?.data?.id;
  eq("guarda los campos", [supplier.body?.data?.payment_method, Number(supplier.body?.data?.shipping_cost), supplier.body?.data?.notes], ["Transferencia", 2500, "Mínimo 3 unidades"]);
  eq("envío negativo -> 400", (await api("POST", "/api/suppliers", { name: `${MARK} x`, shipping_cost: -1 })).status, 400);
  eq("sin nombre -> 400", (await api("POST", "/api/suppliers", { contact_info: "x" })).status, 400);
  const edited = await api("PATCH", `/api/suppliers/${created.supplierId}`, { shipping_cost: 3000, payment_method: "" });
  eq("editar -> 200", edited.status, 200);
  eq("editar cambia solo lo enviado (texto vacío = sin dato)", [Number(edited.body?.data?.shipping_cost), edited.body?.data?.payment_method, edited.body?.data?.contact_info], [3000, null, "Instagram @test"]);
  eq("editar uno que no existe -> 404", (await api("PATCH", `/api/suppliers/${FAKE_ID}`, { name: "x" })).status, 404);

  // ------------------------------------------------------------------------
  group("3. Pedido armando → pagado → en camino → recibido");
  const start = await stockOf(variantId);
  const order = await api("POST", "/api/purchases", orderBody("armando", { shipping_cost: 1500 }));
  eq("crear armando con envío -> 201", order.status, 201);
  const orderId = order.body?.data?.id;
  check("trae número de pedido", Number.isInteger(order.body?.data?.number));
  eq("armando no suma stock", (await stockOf(variantId)).stock, start.stock);
  eq("estado inválido -> 400", (await api("POST", "/api/purchases", orderBody("perdido"))).status, 400);
  eq("envío negativo -> 400", (await api("POST", "/api/purchases", orderBody("pagado", { shipping_cost: -5 }))).status, 400);

  const list = await api("GET", "/api/purchases");
  const listed = list.body?.data?.find((p) => p.id === orderId);
  eq("aparece en la lista con proveedor y unidades", [listed?.supplier?.name, listed?.units, listed?.status], [MARK, 3, "armando"]);

  const detail = await api("GET", `/api/purchases/${orderId}`);
  eq("detalle: total sin envío, envío y líneas", [Number(detail.body?.data?.total_amount), Number(detail.body?.data?.shipping_cost), detail.body?.data?.purchase_items?.length], [12000, 1500, 1]);
  eq("detalle: precio de venta de la variante", Number(detail.body?.data?.purchase_items?.[0]?.variant?.price), 10000);
  eq("detalle de uno que no existe -> 404", (await api("GET", `/api/purchases/${FAKE_ID}`)).status, 404);

  const paid = await api("PATCH", `/api/purchases/${orderId}`, { status: "pagado" });
  eq("pasar a pagado -> 200 con fecha de pago", [paid.status, paid.body?.data?.status, paid.body?.data?.paid_at !== null], [200, "pagado", true]);
  const shipped = await api("PATCH", `/api/purchases/${orderId}`, { status: "en_camino", shipping_cost: 2000 });
  eq("pasar a en camino y corregir el envío", [shipped.body?.data?.status, Number(shipped.body?.data?.shipping_cost), shipped.body?.data?.shipped_at !== null], ["en_camino", 2000, true]);
  eq("en camino no suma stock", (await stockOf(variantId)).stock, start.stock);
  const back = await api("PATCH", `/api/purchases/${orderId}`, { status: "armando" });
  eq("volver a armando borra las fechas de pago y despacho", [back.body?.data?.status, back.body?.data?.paid_at, back.body?.data?.shipped_at], ["armando", null, null]);

  const received = await api("PATCH", `/api/purchases/${orderId}`, { status: "recibida" });
  eq("recibir (desde armando) -> 200", [received.status, received.body?.data?.status], [200, "recibida"]);
  check("recibir completa las fechas de pago y despacho", received.body?.data?.paid_at && received.body?.data?.shipped_at && received.body?.data?.received_at);
  eq("recibido suma el stock y guarda el costo", await stockOf(variantId), { stock: start.stock + 3, cost: 4000 });
  eq("recibir de nuevo -> 409", (await api("PATCH", `/api/purchases/${orderId}`, { status: "recibida" })).status, 409);
  eq("volver atrás un recibido -> 409", (await api("PATCH", `/api/purchases/${orderId}`, { status: "pagado" })).status, 409);
  eq("el envío de un recibido se puede corregir", (await api("PATCH", `/api/purchases/${orderId}`, { shipping_cost: 2200 })).status, 200);
  eq("borrar un recibido -> 409", (await api("DELETE", `/api/purchases/${orderId}`)).status, 409);

  // ------------------------------------------------------------------------
  group("4. Cargado ya recibido, y borrar uno sin llegar");
  const before = (await stockOf(variantId)).stock;
  const direct = await api("POST", "/api/purchases", orderBody("recibida"));
  eq("crear recibido -> suma el stock al toque", [direct.status, (await stockOf(variantId)).stock], [201, before + 3]);
  const pending = await api("POST", "/api/purchases", orderBody("pagado", { shipping_cost: 500 }));
  eq("crear pagado -> 201", pending.status, 201);
  const dashboard = await api(
    "GET",
    `/api/dashboard?${new URLSearchParams({
      from: new Date(Date.now() - 86400000).toISOString(),
      to: new Date(Date.now() + 60000).toISOString(),
      prev_from: new Date(Date.now() - 2 * 86400000).toISOString(),
      prev_to: new Date(Date.now() - 86400000).toISOString(),
      tz: "America/Argentina/Buenos_Aires",
    })}`,
  );
  eq("Inicio responde", dashboard.status, 200);
  const dashPending = dashboard.body?.data?.purchases?.find((p) => p.id === pending.body?.data?.id);
  eq("Inicio lista el pedido con número y envío", [dashPending?.number, Number(dashPending?.shipping_cost)], [pending.body?.data?.number, 500]);
  check("Inicio cuenta los pagados por recibir", dashboard.body?.data?.alerts?.purchases_on_the_way >= 1);
  eq("borrar un pedido pagado sin llegar -> 200", (await api("DELETE", `/api/purchases/${pending.body?.data?.id}`)).status, 200);
  eq("ya no existe", (await api("GET", `/api/purchases/${pending.body?.data?.id}`)).status, 404);

  const stats = (await api("GET", "/api/suppliers")).body?.data?.find((s) => s.id === created.supplierId);
  eq("proveedor: pedidos y total pagado (mercadería + envío)", [stats?.purchases_count, stats?.total_paid], [2, 12000 + 2200 + 12000]);
}

// La regla de stock compartido (Stock › Stock compartido) crea y sincroniza
// variantes solas: se apaga mientras corren las pruebas y se restaura al final.
const { data: savedStockRule } = await admin.from("stock_share_rule").select("iphone_model_id, group_no");
await admin.from("stock_share_rule").delete().gte("group_no", 0);

let crashed = null;
try {
  await main();
} catch (err) {
  crashed = err;
} finally {
  await cleanup().catch((err) => console.error(`\nNo se pudo limpiar todo: ${err.message}`));
  if (savedStockRule?.length) await admin.from("stock_share_rule").insert(savedStockRule);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${"=".repeat(60)}`);
console.log(`${results.length - failed.length}/${results.length} pruebas OK`);
for (const f of failed) console.log(`  FALLA [${f.group}] ${f.name}`);
if (crashed) console.error(`\nEl script se cortó: ${crashed.stack ?? crashed}`);
process.exit(failed.length > 0 || crashed ? 1 : 0);
