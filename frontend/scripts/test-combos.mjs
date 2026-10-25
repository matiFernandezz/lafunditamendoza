// Pruebas de combos (Accesorios › Combos): un combo no tiene stock propio, sale
// de sus partes. Arma un combo de prueba (funda por modelo + protector) desde el
// panel y prueba que su stock sea el menor de las partes, que reservar, cancelar,
// vender y anular muevan las partes (y la funda del otro modelo, si comparten
// stock) y que el stock del combo no se pueda editar a mano.
//
// Requisitos: Supabase local arriba con las migraciones aplicadas y el
// frontend corriendo (`npm run dev`). Uso, desde /frontend:
//
//   npm run test:combos
//
// Solo corre contra un Supabase LOCAL. Crea sus propios productos y los borra.

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
const admin = createClient(SUPABASE_URL, SECRET_KEY, { auth: { persistSession: false } });

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
  check(name, JSON.stringify(actual) === JSON.stringify(expected), `esperado ${JSON.stringify(expected)}, vino ${JSON.stringify(actual)}`);

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
  cookieHeader = [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

const created = { userId: null, products: [], orders: [], sales: [] };

async function cleanup() {
  if (created.orders.length) await admin.from("web_orders").delete().in("id", created.orders);
  if (created.sales.length) await admin.from("sales").delete().in("id", created.sales);
  if (created.products.length) await admin.from("products").delete().in("id", created.products);
  if (created.userId) await admin.auth.admin.deleteUser(created.userId);
}

async function newProduct(name, categorySlug, variants) {
  const { data: category } = await admin.from("categories").select("id").eq("slug", categorySlug).single();
  const { data: product, error } = await admin.from("products").insert({ name, category_id: category.id }).select("id").single();
  if (error) throw new Error(error.message);
  created.products.push(product.id);
  created.skuCount = (created.skuCount ?? 0) + 1;
  const rows = variants.map((v, i) => ({ product_id: product.id, sku: `TCB-${RUN}-${created.skuCount}-${i}`, price: 1000, ...v }));
  const { data: inserted, error: vError } = await admin.from("product_variants").insert(rows).select("id, iphone_model_id");
  if (vError) throw new Error(vError.message);
  return { id: product.id, variants: inserted };
}

async function stocks(ids) {
  const { data } = await admin.from("product_variants").select("id, stock_quantity").in("id", Object.values(ids));
  const byId = new Map(data.map((r) => [r.id, r.stock_quantity]));
  return Object.fromEntries(Object.entries(ids).map(([k, id]) => [k, byId.get(id)]));
}

async function main() {
  const home = await fetch(BASE_URL).catch(() => null);
  if (!home) throw new Error(`La app no responde en ${BASE_URL}. Levantala con "npm run dev".`);

  const email = `test-combos-${RUN}@example.com`;
  const password = `Test-${RUN}-${Math.random().toString(36).slice(2)}`;
  const { data: user, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (userError) throw new Error(`No se pudo crear el usuario de prueba: ${userError.message}`);
  created.userId = user.user.id;
  await signIn(email, password);

  const { data: models } = await admin.from("iphone_models").select("id, name").in("name", ["iPhone 13", "iPhone 14"]);
  const m13 = models.find((m) => m.name === "iPhone 13").id;
  const m14 = models.find((m) => m.name === "iPhone 14").id;

  const funda = await newProduct(`Funda Combo ${RUN}`, "diseno", [
    { iphone_model_id: m13, color: "Único", stock_quantity: 3 },
    { iphone_model_id: m14, color: "Único", stock_quantity: 3 },
  ]);
  const protector = await newProduct(`Protector Combo ${RUN}`, "protectores-de-cargador", [
    { iphone_model_id: null, color: "Rojo", stock_quantity: 2 },
  ]);
  const combo = await newProduct(`Combo ${RUN}`, "combos", [
    { iphone_model_id: m13, color: "Rojo", stock_quantity: 0 },
    { iphone_model_id: m14, color: "Rojo", stock_quantity: 0 },
  ]);
  const ids = {
    funda13: funda.variants.find((v) => v.iphone_model_id === m13).id,
    funda14: funda.variants.find((v) => v.iphone_model_id === m14).id,
    protector: protector.variants[0].id,
    combo13: combo.variants.find((v) => v.iphone_model_id === m13).id,
    combo14: combo.variants.find((v) => v.iphone_model_id === m14).id,
  };

  group("1. Seguridad y validaciones");
  eq("GET sin sesión -> 401", (await api("GET", `/api/products/${combo.id}/bundle`, undefined, { auth: false })).status, 401);
  eq("PUT sin sesión -> 401", (await api("PUT", `/api/products/${combo.id}/bundle`, { specs: [] }, { auth: false })).status, 401);
  eq("specs inválidas -> 400", (await api("PUT", `/api/products/${combo.id}/bundle`, { specs: [{ component_product_id: "x" }] })).status, 400);
  eq(
    "el combo no puede ser parte de sí mismo -> 400",
    (await api("PUT", `/api/products/${combo.id}/bundle`, { specs: [{ component_product_id: combo.id }] })).status,
    400,
  );

  group("2. Armar el combo");
  // La funda del 13 y la del 14 comparten stock (como con la regla 13 + 14).
  eq(
    "la funda comparte stock 13 + 14",
    (await api("PUT", `/api/products/${funda.id}/stock-groups`, { groups: [[m13, m14]] })).status,
    200,
  );
  const armed = await api("PUT", `/api/products/${combo.id}/bundle`, {
    specs: [{ component_product_id: funda.id }, { component_product_id: protector.id }],
  });
  eq("guardar las partes -> 200", armed.status, 200);
  eq("cada variante queda con 2 partes", armed.body?.data?.map((r) => r.parts.length), [2, 2]);
  eq("stock del combo = el menor de sus partes (funda 3, protector 2)", await stocks(ids), {
    funda13: 3,
    funda14: 3,
    protector: 2,
    combo13: 2,
    combo14: 2,
  });
  const read = await api("GET", `/api/products/${combo.id}/bundle`);
  eq("GET devuelve las partes guardadas", read.body?.data?.specs?.length, 2);
  eq(
    "el stock del combo no se edita a mano -> 400",
    (await api("PATCH", `/api/product-variants/${ids.combo13}`, { stock_quantity: 9 })).status,
    400,
  );
  eq("…pero el precio sí", (await api("PATCH", `/api/product-variants/${ids.combo13}`, { price: 1500 })).status, 200);

  group("3. Reservas y ventas");
  const order = await api(
    "POST",
    "/api/tienda/reservas",
    { customer_name: "Prueba Combo", customer_phone: "2610000000", items: [{ variant_id: ids.combo13, quantity: 1 }] },
    { auth: false },
  );
  eq("reservar 1 combo del 13 -> 201", order.status, 201);
  const orderId = order.body?.data?.id;
  if (orderId) created.orders.push(orderId);
  eq("descuenta la funda (13 y 14) y el protector", await stocks(ids), {
    funda13: 2,
    funda14: 2,
    protector: 1,
    combo13: 1,
    combo14: 1,
  });
  eq("cancelar la reserva -> 200", (await api("POST", `/api/web-orders/${orderId}/cancel`, { reason: "prueba" })).status, 200);
  eq("devuelve todo", await stocks(ids), { funda13: 3, funda14: 3, protector: 2, combo13: 2, combo14: 2 });

  const sale = await api("POST", "/api/sales", {
    payment_method: "efectivo",
    items: [{ variant_id: ids.combo14, quantity: 2, unit_price: 1000 }],
  });
  eq("vender 2 combos del 14 -> 201", sale.status, 201);
  const saleId = sale.body?.data?.id;
  if (saleId) created.sales.push(saleId);
  eq("el protector se agota y los combos quedan en 0", await stocks(ids), {
    funda13: 1,
    funda14: 1,
    protector: 0,
    combo13: 0,
    combo14: 0,
  });
  eq(
    "vender otro combo sin stock -> rechazado",
    (await api("POST", "/api/sales", { payment_method: "efectivo", items: [{ variant_id: ids.combo13, quantity: 1, unit_price: 1500 }] })).status >= 400,
    true,
  );
  eq("anular la venta -> 200", (await api("POST", `/api/sales/${saleId}/void`, { reason: "prueba" })).status, 200);
  eq("devuelve todo", await stocks(ids), { funda13: 3, funda14: 3, protector: 2, combo13: 2, combo14: 2 });

  group("4. Partes sueltas");
  eq(
    "cargar 5 protectores a mano -> 200",
    (await api("PATCH", `/api/product-variants/${ids.protector}`, { stock_quantity: 5 })).status,
    200,
  );
  eq("ahora limita la funda (3)", await stocks(ids), { funda13: 3, funda14: 3, protector: 5, combo13: 3, combo14: 3 });
  const single = await api("POST", "/api/sales", { payment_method: "efectivo", items: [{ variant_id: ids.funda14, quantity: 1, unit_price: 1000 }] });
  if (single.body?.data?.id) created.sales.push(single.body.data.id);
  eq("vender 1 funda del 14 suelta baja los dos combos", await stocks(ids), {
    funda13: 2,
    funda14: 2,
    protector: 5,
    combo13: 2,
    combo14: 2,
  });

  group("5. Dejar de ser combo");
  const cleared = await api("PUT", `/api/products/${combo.id}/bundle`, { specs: [] });
  eq("sin partes -> 200 y sin variantes armadas", cleared.body?.data?.map((r) => r.parts.length), [0, 0]);
  eq(
    "el stock vuelve a editarse a mano",
    (await api("PATCH", `/api/product-variants/${ids.combo13}`, { stock_quantity: 7 })).body?.data?.stock_quantity,
    7,
  );
  eq("…y no toca las partes", await stocks(ids), { funda13: 2, funda14: 2, protector: 5, combo13: 7, combo14: 2 });

  group("6. Combo que solo tenía una variante universal");
  const plain = await newProduct(`Combo Universal ${RUN}`, "combos", [{ iphone_model_id: null, color: "Azul", stock_quantity: 4 }]);
  const res = await api("PUT", `/api/products/${plain.id}/bundle`, {
    specs: [{ component_product_id: funda.id }, { component_product_id: protector.id }],
  });
  eq("guardar -> 200", res.status, 200);
  const { data: plainVariants } = await admin
    .from("product_variants")
    .select("iphone_model_id, stock_quantity, active")
    .eq("product_id", plain.id)
    .eq("active", true);
  eq(
    "crea una variante por cada modelo de la funda (13 y 14)",
    plainVariants.map((v) => v.iphone_model_id).sort(),
    [m13, m14].sort(),
  );
  eq("…con el stock de sus partes (funda 2, protector 5)", plainVariants.map((v) => v.stock_quantity), [2, 2]);
  eq("…y saca la universal vieja", plainVariants.some((v) => v.iphone_model_id === null), false);
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
