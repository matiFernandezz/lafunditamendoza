// Pruebas de Tienda (contenido editable de la home): carrusel, foto de cada
// mosaico de categoría y "Nuevos ingresos". Permisos, altas, cambios, orden,
// lectura pública (la tienda usa la clave pública) y que la home lo muestre.
//
// Requisitos: Supabase local arriba con las migraciones aplicadas y el
// frontend corriendo (`npm run dev`). Uso, desde /frontend:
//
//   npm run test:tienda
//
// Solo corre contra un Supabase LOCAL. Deja el carrusel, las fotos de
// categorías y los nuevos ingresos como estaban.

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
const FAKE_ID = "00000000-0000-4000-8000-000000000000";
const admin = createClient(SUPABASE_URL, SECRET_KEY, { auth: { persistSession: false } });
const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

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
  cookieHeader = [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

// Lo que había antes, para dejarlo igual.
const saved = {
  slides: null,
  arrivals: null,
  latest: null,
  categories: null,
  sections: null,
  products: [],
  userId: null,
  uploaded: [],
};

async function cleanup() {
  if (saved.slides) {
    await admin
      .from("home_slides")
      .delete()
      .not("id", "in", `(${saved.slides.map((s) => s.id).join(",") || FAKE_ID})`);
    for (const s of saved.slides) await admin.from("home_slides").update(s).eq("id", s.id);
  }
  if (saved.arrivals) {
    await admin
      .from("home_new_arrivals")
      .delete()
      .not("id", "in", `(${saved.arrivals.map((a) => a.id).join(",") || FAKE_ID})`);
    for (const a of saved.arrivals) await admin.from("home_new_arrivals").update(a).eq("id", a.id);
  }
  // Productos de prueba (al borrarlos, también salen de Últimos ingresos) y la lista como estaba.
  if (saved.products.length) await admin.from("products").delete().in("id", saved.products);
  if (saved.latest) {
    await admin.from("home_latest_products").delete().not("id", "is", null);
    if (saved.latest.length) await admin.from("home_latest_products").insert(saved.latest);
  }
  if (saved.categories) {
    for (const c of saved.categories)
      await admin.from("categories").update({ home_image_url: c.home_image_url }).eq("id", c.id);
  }
  if (saved.sections) {
    for (const sec of saved.sections) await admin.from("home_sections").update(sec).eq("key", sec.key);
  }
  if (saved.uploaded.length) await admin.storage.from("product-images").remove(saved.uploaded);
  if (saved.userId) await admin.auth.admin.deleteUser(saved.userId);
}

async function main() {
  const home = await fetch(BASE_URL).catch(() => null);
  if (!home) throw new Error(`La app no responde en ${BASE_URL}. Levantala con "npm run dev".`);

  saved.slides = (await admin.from("home_slides").select("*")).data;
  saved.arrivals = (await admin.from("home_new_arrivals").select("*")).data;
  saved.latest = (await admin.from("home_latest_products").select("*")).data;
  saved.categories = (await admin.from("categories").select("id, home_image_url")).data;
  saved.sections = (await admin.from("home_sections").select("*")).data;

  const email = `test-tienda-${RUN}@example.com`;
  const password = `Test-${RUN}-${Math.random().toString(36).slice(2)}`;
  const { data: user, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (userError) throw new Error(`No se pudo crear el usuario de prueba: ${userError.message}`);
  saved.userId = user.user.id;
  await signIn(email, password);

  group("1. Seguridad");
  for (const [method, path] of [
    ["GET", "/api/store/slides"],
    ["POST", "/api/store/slides"],
    ["PATCH", `/api/store/slides/${FAKE_ID}`],
    ["DELETE", `/api/store/slides/${FAKE_ID}`],
    ["POST", "/api/store/slides/reorder"],
    ["GET", "/api/store/new-arrivals"],
    ["POST", "/api/store/new-arrivals/reorder"],
    ["POST", "/api/store/upload-url"],
  ]) {
    eq(
      `${method} ${path} sin sesión -> 401`,
      (await api(method, path, method === "GET" ? undefined : {}, { auth: false })).status,
      401,
    );
  }
  const anonInsert = await anon.from("home_slides").insert({ image_url: "/x.jpg" });
  check("la clave pública no puede escribir el carrusel", anonInsert.error !== null);
  const anonRead = await anon.from("home_slides").select("id");
  check(
    "la clave pública puede leer el carrusel (la home lo necesita)",
    !anonRead.error && anonRead.data.length === saved.slides.length,
  );
  check("…y los nuevos ingresos", !(await anon.from("home_new_arrivals").select("id")).error);

  group("2. Subida de fotos");
  const up = await api("POST", "/api/store/upload-url", { content_type: "image/png", size: 1000 });
  eq(
    "pide subida -> 200 con URL pública en tienda/",
    [
      up.status,
      up.body?.data?.path?.startsWith("tienda/"),
      up.body?.data?.public_url?.includes("/product-images/tienda/"),
    ],
    [200, true, true],
  );
  eq(
    "tipo inválido -> 400",
    (await api("POST", "/api/store/upload-url", { content_type: "image/gif", size: 10 })).status,
    400,
  );
  eq(
    "demasiado grande -> 400",
    (await api("POST", "/api/store/upload-url", { content_type: "image/png", size: 50 * 1024 * 1024 })).status,
    400,
  );
  // Un PNG de 1x1 subido de verdad, para probar que se borra al quitarlo.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  );
  const { error: upError } = await admin.storage
    .from("product-images")
    .uploadToSignedUrl(up.body.data.path, up.body.data.token, png, { contentType: "image/png" });
  check("el navegador puede subir con ese token", !upError, upError?.message);
  const uploadedUrl = up.body.data.public_url;

  group("3. Carrusel");
  const before = (await api("GET", "/api/store/slides")).body.data;
  eq(
    "lista en orden",
    before.map((s) => s.id),
    [...saved.slides].sort((a, b) => a.sort_order - b.sort_order).map((s) => s.id),
  );
  eq(
    "foto que no es de Tienda -> 400",
    (await api("POST", "/api/store/slides", { image_url: "https://otro-sitio.com/x.jpg" })).status,
    400,
  );
  eq("ruta con .. -> 400", (await api("POST", "/api/store/slides", { image_url: "/../secreto.jpg" })).status, 400);
  const created = await api("POST", "/api/store/slides", { image_url: uploadedUrl, kind: "foto" });
  eq(
    "agregar -> 201, queda al final",
    [created.status, created.body?.data?.sort_order > Math.max(...before.map((s) => s.sort_order))],
    [201, true],
  );
  const slideId = created.body?.data?.id;
  const patched = await api("PATCH", `/api/store/slides/${slideId}`, {
    kind: "titulo",
    title: " Hola ",
    cta_label: "Ver",
    cta_href: "/categoria/fundas",
    dim: 0.35,
    position: "center 25%",
  });
  eq(
    "editar textos y encuadre",
    [patched.status, patched.body?.data?.title, patched.body?.data?.kind, Number(patched.body?.data?.dim)],
    [200, "Hola", "titulo", 0.35],
  );
  const withMobile = await api("PATCH", `/api/store/slides/${slideId}`, {
    mobile_image_url: "/photos/cherry-cases.jpg",
  });
  eq(
    "foto de celular -> 200",
    [withMobile.status, withMobile.body?.data?.mobile_image_url],
    [200, "/photos/cherry-cases.jpg"],
  );
  check(
    "la home usa <picture> con la foto de computadora desde md",
    (await (await fetch(BASE_URL)).text()).includes('media="(min-width: 768px)"'),
  );
  eq(
    "foto de celular de otro sitio -> 400",
    (await api("PATCH", `/api/store/slides/${slideId}`, { mobile_image_url: "https://x.com/a.jpg" })).status,
    400,
  );
  eq(
    "sacar la foto de celular (null) -> 200",
    (await api("PATCH", `/api/store/slides/${slideId}`, { mobile_image_url: null })).body?.data?.mobile_image_url,
    null,
  );
  eq(
    "link que no empieza con / ni https -> 400",
    (await api("PATCH", `/api/store/slides/${slideId}`, { cta_href: "javascript:alert(1)" })).status,
    400,
  );
  eq("tipo inválido -> 400", (await api("PATCH", `/api/store/slides/${slideId}`, { kind: "video" })).status, 400);
  // Diseño del editor: computadora y celular por separado.
  const device = (elements) => ({ focusX: 30, focusY: 60, dim: 0.25, shade: "abajo", elements });
  const title = {
    id: "t1",
    type: "texto",
    style: "titulo",
    text: "Hola\nmundo",
    x: 4.4,
    y: 30,
    h: 18,
    size: 5,
    align: "left",
    color: "claro",
  };
  const logo = { id: "l1", type: "logo", x: 95, y: 6, h: 20, size: 9, align: "right", color: "claro" };
  const link = {
    id: "k1",
    type: "link",
    text: "Ver todo",
    href: "/categoria/todo",
    x: 50,
    y: 80,
    h: 3,
    size: 1,
    align: "center",
    color: "oscuro",
  };
  const layout = { desktop: device([title, logo, link]), mobile: device([{ ...title, size: 10, w: 60 }]) };
  const designed = await api("PATCH", `/api/store/slides/${slideId}`, { layout });
  // jsonb guarda las claves en otro orden: se comparan ordenadas.
  const sorted = (v) =>
    Array.isArray(v)
      ? v.map(sorted)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, sorted(v[k])]),
          )
        : v;
  eq("guardar un diseño -> 200 y vuelve igual", sorted(designed.body?.data?.layout), sorted(layout));
  eq(
    "diseño con un link a javascript: -> 400",
    (
      await api("PATCH", `/api/store/slides/${slideId}`, {
        layout: { ...layout, desktop: device([{ ...link, href: "javascript:alert(1)" }]) },
      })
    ).status,
    400,
  );
  eq(
    "texto con ancho de caja fuera de rango -> 400",
    (
      await api("PATCH", `/api/store/slides/${slideId}`, {
        layout: { ...layout, mobile: device([{ ...title, w: 900 }]) },
      })
    ).status,
    400,
  );
  eq(
    "diseño sin el celular -> 400",
    (await api("PATCH", `/api/store/slides/${slideId}`, { layout: { desktop: layout.desktop } })).status,
    400,
  );
  eq(
    "elemento de tipo desconocido -> 400",
    (
      await api("PATCH", `/api/store/slides/${slideId}`, {
        layout: { ...layout, mobile: device([{ ...logo, type: "video" }]) },
      })
    ).status,
    400,
  );
  eq(
    "volver al diseño automático (null) -> 200",
    (await api("PATCH", `/api/store/slides/${slideId}`, { layout: null })).body?.data?.layout,
    null,
  );
  const ids = (await api("GET", "/api/store/slides")).body.data.map((s) => s.id);
  const reversed = [...ids].reverse();
  eq("reordenar -> 200", (await api("POST", "/api/store/slides/reorder", { ids: reversed })).status, 200);
  eq(
    "…y queda en ese orden",
    (await api("GET", "/api/store/slides")).body.data.map((s) => s.id),
    reversed,
  );
  eq(
    "reordenar con ids de menos -> 409",
    (await api("POST", "/api/store/slides/reorder", { ids: reversed.slice(1) })).status,
    409,
  );
  eq(
    "reordenar con repetidos -> 400",
    (await api("POST", "/api/store/slides/reorder", { ids: [reversed[0], reversed[0]] })).status,
    400,
  );
  const homeHtml = await (await fetch(BASE_URL)).text();
  check("la home muestra el titular nuevo", homeHtml.includes(">Hola</h2>"));
  eq("quitar -> 200", (await api("DELETE", `/api/store/slides/${slideId}`)).status, 200);
  const { data: gone } = await admin.storage
    .from("product-images")
    .list("tienda", { search: up.body.data.path.split("/")[1] });
  eq("…y borra su foto del bucket", gone?.length ?? 0, 0);
  eq("quitar uno que no existe -> 404", (await api("DELETE", `/api/store/slides/${FAKE_ID}`)).status, 404);

  group("4. Foto de cada mosaico de categoría");
  const { data: diseno } = await admin.from("categories").select("id, home_image_url").eq("slug", "diseno").single();
  const catPatch = await api("PATCH", `/api/categories/${diseno.id}`, { home_image_url: "/photos/cherry-cases.jpg" });
  eq(
    "cambiar la foto -> 200",
    [catPatch.status, catPatch.body?.data?.home_image_url],
    [200, "/photos/cherry-cases.jpg"],
  );
  eq(
    "foto de otro sitio -> 400",
    (await api("PATCH", `/api/categories/${diseno.id}`, { home_image_url: "https://x.com/a.jpg" })).status,
    400,
  );
  eq(
    "quitarla (null) -> 200",
    (await api("PATCH", `/api/categories/${diseno.id}`, { home_image_url: null })).body?.data?.home_image_url,
    null,
  );
  const tilesHtml = await (await fetch(BASE_URL)).text();
  check(
    "la home sigue cargando con un mosaico sin foto",
    tilesHtml.includes(`aria-label="${saved.sections.find((s) => s.key === "categorias").title}"`),
  );

  group("5. Nuevos ingresos");
  const list = await api("GET", "/api/store/new-arrivals");
  eq(
    "lista con precio y stock",
    [list.status, list.body?.data?.length, typeof list.body?.data?.[0]?.units],
    [200, saved.arrivals.length, "number"],
  );
  const { data: someProduct } = await admin.from("products").select("id").eq("active", true).limit(1).single();
  const up2 = (await api("POST", "/api/store/upload-url", { content_type: "image/png", size: png.length })).body.data;
  await admin.storage.from("product-images").uploadToSignedUrl(up2.path, up2.token, png, { contentType: "image/png" });
  saved.uploaded.push(up2.path);
  eq(
    "color de canto inválido -> 400",
    (
      await api("POST", "/api/store/new-arrivals", {
        product_id: someProduct.id,
        image_url: up2.public_url,
        edge_color: "rojo",
      })
    ).status,
    400,
  );
  eq(
    "producto que no existe -> 404",
    (await api("POST", "/api/store/new-arrivals", { product_id: FAKE_ID, image_url: up2.public_url })).status,
    404,
  );
  const added = await api("POST", "/api/store/new-arrivals", {
    product_id: someProduct.id,
    image_url: up2.public_url,
    edge_color: "#ABCDEF",
  });
  eq("agregar -> 201 (color en minúsculas)", [added.status, added.body?.data?.edge_color], [201, "#abcdef"]);
  const arrivalId = added.body?.data?.id;
  eq(
    "cambiar el canto -> 200",
    (await api("PATCH", `/api/store/new-arrivals/${arrivalId}`, { edge_color: "#123456" })).body?.data?.edge_color,
    "#123456",
  );
  const aIds = (await api("GET", "/api/store/new-arrivals")).body.data.map((a) => a.id);
  const aRev = [...aIds].reverse();
  eq("reordenar -> 200", (await api("POST", "/api/store/new-arrivals/reorder", { ids: aRev })).status, 200);
  eq(
    "…y queda en ese orden",
    (await api("GET", "/api/store/new-arrivals")).body.data.map((a) => a.id),
    aRev,
  );
  eq("quitar -> 200", (await api("DELETE", `/api/store/new-arrivals/${arrivalId}`)).status, 200);
  saved.uploaded = saved.uploaded.filter((p) => p !== up2.path);
  const { data: gone2 } = await admin.storage.from("product-images").list("tienda", { search: up2.path.split("/")[1] });
  eq("…y borra su foto del bucket", gone2?.length ?? 0, 0);
  const homeNow = await (await fetch(BASE_URL)).text();
  check(
    "la home muestra las funditas que giran",
    homeNow.includes(`aria-label="${saved.sections.find((s) => s.key === "mas_vendidas").title}"`),
  );

  group("6. Secciones de la home");
  eq(
    "GET /api/store/sections sin sesión -> 401",
    (await api("GET", "/api/store/sections", undefined, { auth: false })).status,
    401,
  );
  const secs = await api("GET", "/api/store/sections");
  eq(
    "lista las secciones en orden",
    secs.body?.data?.map((s) => s.key),
    [...saved.sections].sort((a, b) => a.sort_order - b.sort_order).map((s) => s.key),
  );
  eq("título vacío -> 400", (await api("PATCH", "/api/store/sections/categorias", { title: "  " })).status, 400);
  eq("sección que no existe -> 404", (await api("PATCH", "/api/store/sections/otra", { title: "x" })).status, 404);
  eq(
    "cambiar el título -> 200",
    (await api("PATCH", "/api/store/sections/categorias", { title: " Probando títulos " })).body?.data?.title,
    "Probando títulos",
  );
  eq(
    "ocultar -> 200",
    (await api("PATCH", "/api/store/sections/ultimos", { visible: false })).body?.data?.visible,
    false,
  );
  eq(
    "reordenar -> 200",
    (await api("POST", "/api/store/sections/reorder", { keys: ["ultimos", "mas_vendidas", "categorias", "instagram"] }))
      .status,
    200,
  );
  eq(
    "reordenar con una de menos -> 400",
    (await api("POST", "/api/store/sections/reorder", { keys: ["ultimos", "categorias"] })).status,
    400,
  );
  const html = await (await fetch(BASE_URL)).text();
  check("la home usa el título nuevo", html.includes('aria-label="Probando títulos"'));
  check(
    "…y no muestra la oculta",
    !html.includes(`aria-label="${saved.sections.find((s) => s.key === "ultimos").title}"`),
  );
  check(
    "…y respeta el orden (las funditas antes que las categorías)",
    html.indexOf(`aria-label="${saved.sections.find((s) => s.key === "mas_vendidas").title}"`) <
      html.indexOf('aria-label="Probando títulos"'),
  );

  group("8. Últimos ingresos");
  for (const [method, path] of [
    ["GET", "/api/store/latest"],
    ["POST", "/api/store/latest"],
    ["DELETE", `/api/store/latest/${FAKE_ID}`],
    ["POST", "/api/store/latest/reorder"],
  ]) {
    eq(
      `${method} ${path} sin sesión -> 401`,
      (await api(method, path, method === "GET" ? undefined : {}, { auth: false })).status,
      401,
    );
  }
  const latest_anonLatest = await anon.from("home_latest_products").insert({ product_id: FAKE_ID });
  check("la clave pública no puede escribir Últimos ingresos", latest_anonLatest.error !== null);

  // Lista de prueba: 3 productos activos, en un orden que no es el de carga.
  const { data: latest_pool } = await admin
    .from("products")
    .select("id")
    .eq("active", true)
    .order("created_at")
    .limit(4);
  await admin.from("home_latest_products").delete().not("id", "is", null);
  await admin
    .from("home_latest_products")
    .insert(latest_pool.slice(0, 3).map((p, i) => ({ product_id: p.id, sort_order: i })));
  let latest_latestList = (await api("GET", "/api/store/latest")).body.data;
  eq(
    "lista en orden",
    latest_latestList.map((l) => l.product_id),
    latest_pool.slice(0, 3).map((p) => p.id),
  );
  const latest_added = await api("POST", "/api/store/latest", { product_id: latest_pool[3].id });
  eq("agregar -> 201", latest_added.status, 201);
  latest_latestList = (await api("GET", "/api/store/latest")).body.data;
  eq("…y entra primero", latest_latestList[0].product_id, latest_pool[3].id);
  eq(
    "agregar uno que ya está -> 409",
    (await api("POST", "/api/store/latest", { product_id: latest_pool[3].id })).status,
    409,
  );
  eq("producto que no existe -> 404", (await api("POST", "/api/store/latest", { product_id: FAKE_ID })).status, 404);
  const latest_reversedLatest = [...latest_latestList.map((l) => l.id)].reverse();
  eq("reordenar -> 200", (await api("POST", "/api/store/latest/reorder", { ids: latest_reversedLatest })).status, 200);
  eq(
    "…y queda en ese orden",
    (await api("GET", "/api/store/latest")).body.data.map((l) => l.id),
    latest_reversedLatest,
  );
  eq("quitar -> 200", (await api("DELETE", `/api/store/latest/${latest_latestList[0].id}`)).status, 200);
  eq("quitar uno que no está -> 404", (await api("DELETE", `/api/store/latest/${FAKE_ID}`)).status, 404);

  // La home muestra la lista en su orden (los de stock y activos).
  const latest_homeList = (await api("GET", "/api/store/latest")).body.data.map((l) => l.product_id);
  const latest_homeHtml = await (await fetch(BASE_URL)).text();
  const latest_positions = latest_homeList
    .map((id) => latest_homeHtml.indexOf(`/producto/${id}`))
    .filter((i) => i >= 0);
  check(
    "la home los muestra en el orden de la lista",
    latest_positions.length > 0 && latest_positions.every((p, i) => i === 0 || p > latest_positions[i - 1]),
  );

  // Lista llena: no se agrega a mano; un producto nuevo entra primero y sale el último.
  const { data: latest_many } = await admin
    .from("products")
    .select("id")
    .eq("active", true)
    .order("created_at")
    .limit(10);
  await admin.from("home_latest_products").delete().not("id", "is", null);
  await admin.from("home_latest_products").insert(latest_many.map((p, i) => ({ product_id: p.id, sort_order: i })));
  const { data: latest_other } = await admin
    .from("products")
    .select("id")
    .not("id", "in", `(${latest_many.map((p) => p.id).join(",")})`)
    .limit(1)
    .single();
  eq(
    "con 10, agregar a mano -> 409",
    (await api("POST", "/api/store/latest", { product_id: latest_other.id })).status,
    409,
  );
  const { data: latest_category } = await admin.from("categories").select("id").limit(1).single();
  const { data: latest_fresh, error: latest_freshError } = await admin
    .from("products")
    .insert({ name: `Prueba últimos ${RUN}`, category_id: latest_category.id })
    .select("id")
    .single();
  if (latest_freshError) throw new Error(`No se pudo crear el producto de prueba: ${latest_freshError.message}`);
  saved.products.push(latest_fresh.id);
  const { data: latest_after } = await admin.from("home_latest_products").select("product_id").order("sort_order");
  eq("producto nuevo: entra primero", latest_after[0]?.product_id, latest_fresh.id);
  eq("…la lista sigue en 10", latest_after.length, 10);
  check("…y salió el último", !latest_after.some((l) => l.product_id === latest_many[9].id));

  group("7. Buscador");
  const search = await (await fetch(`${BASE_URL}/buscar?q=${encodeURIComponent("cherry")}`)).text();
  check("buscar un nombre encuentra productos", /\d+ productos?/.test(search) && !search.includes(">0 productos<"));
  const none = await (await fetch(`${BASE_URL}/buscar?q=zzzqqq`)).text();
  check("sin resultados avisa", none.includes("No encontramos nada"));
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
