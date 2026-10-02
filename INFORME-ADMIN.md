# Informe — admin con el diseño de `design/`

Trabajo hecho de corrido, **solo en local**: nada aplicado a la base de producción, sin push, sin tocar Vercel ni Railway. Cada parte tiene su commit para poder revisarla o revertirla por separado.

---

## Parte 1 — Relevamiento de las pantallas del admin en `design/`

Fuente: `design/ui_kits/admin/` (`AdminShell.jsx`, `VentasScreen.jsx`, `HistorialScreen.jsx`, `CatalogoScreen.jsx`, `ComprasScreens.jsx`, `WebVentasScreen.jsx`, `adminUI.jsx`, `README.md`) y `design/tokens/admin.css`.

Referencias: **(a)** ya existe, solo cambia la apariencia · **(b)** hay que construirla.

### Estructura general (shell)
| Función del diseño | Estado |
|---|---|
| Barra negra con el logo recortado y la etiqueta "Panel" | (a) |
| Desktop: solapas con ícono dentro de la barra negra, "Salir" a la derecha | (a) |
| Mobile: barra inferior fija con las solapas e íconos (al alcance del pulgar) + barra negra arriba con logo y "Salir" | (a) |
| Controles de 48px (botones principales de 56px), texto de inputs de 16px, radio 6px, títulos en Space Grotesk | (a) |
| Solapa "Web" con contador rojo de reservas pendientes | **(b)** — depende de "Ventas web" |
| Solapa "Nuevo producto" (en el repo se llama "Productos") | (a) — mismo destino, cambia el nombre |

### Login
| Función | Estado |
|---|---|
| Email + contraseña, error, botón "Entrar" | (a) |
| Cabecera negra con el logo grande y "Panel de administración" | (a) |
| Botón para mostrar/ocultar la contraseña | **(b)** |

### Ventas
| Función | Estado |
|---|---|
| Buscador de productos | (a) |
| Filtro con chips | (a) — el repo filtra **por categoría** |
| Filtro con chips **por línea de iPhone** (11…18) y búsqueda por modelo ("cherry 15 pro") | **(b)** |
| Tarjeta por producto con miniatura y categoría; filas por variante con stock ("Stock 5", "Quedan 2", "Sin stock", "2 en la venta") | (a) |
| Carrito con sumar/restar (restar hasta 0 quita el producto) | (a) |
| Descuento Sin / 10% / 15% / **20%** / Otro, con subtotal, descuento y total a cobrar | (a) — existía sin el 20% |
| Medio de pago con íconos, botón "Cobrar $ X" | (a) |
| Mobile: barra flotante "Ver venta" y la venta en una hoja desde abajo | (a) |
| Aviso "Venta registrada" con total, medio y descuento | (a) |

### Historial
| Función | Estado |
|---|---|
| Período Hoy / Semana / Mes / Personalizado | (a) |
| Tarjetas: total ingresado (con ticket promedio), efectivo, transferencia, cantidad de ventas | (a) |
| Lista de ventas desplegable con el detalle y el desglose del descuento | (a) |
| Anular con motivo obligatorio y confirmación de unidades | (a) |
| Anuladas apagadas y tachadas, con su motivo, sin sumar | (a) |
| Pestaña "Más vendidos" | (a) |
| **Motivos rápidos** (chips "Se cargó dos veces", "El cliente devolvió la funda", "Error de precio") | **(b)** |
| Etiqueta "Web" en ventas que vienen de la tienda | **(b)** — depende de "Ventas web" |

### Catálogo
| Función | Estado |
|---|---|
| Filtros: buscador, modelo, stock (Todos / Con stock / Sin stock) | (a) |
| Buscador que también encuentra por modelo, color o categoría | **(b)** — el repo busca por nombre |
| Productos como acordeón (miniatura, variantes, unidades, "N sin stock") | (a) — misma información, otro layout |
| Editar nombre | (a) |
| Fotos: subir, reordenar, quitar, la primera es la principal | (a) |
| Fotos: **subir varias a la vez** y **arrastrar para reordenar** | **(b)** |
| Cambiar el precio de todos los modelos con confirmación | (a) |
| Fila de variante con stock y precio y un solo "Guardar" | (a) — la API ya acepta los dos juntos |
| Agregar variante (modal) | (a) |

### Compras
| Función | Estado |
|---|---|
| Proveedor + alta de proveedor | (a) |
| Buscar y agregar productos; cantidad, costo, quitar; "hoy hay X → quedan Y" | (a) |
| Resumen con unidades y costo total + "Registrar compra" | (a) |

### Nuevo producto
| Función | Estado |
|---|---|
| Datos: nombre, descripción, categoría | (a) |
| Armar **todas las variantes modelo × color de una** (grilla por línea, colores, precio y stock por fila) | **(b)** — el repo crea el producto y agrega las variantes de a una |

### Ventas web
| Función | Estado |
|---|---|
| Reservas hechas desde la tienda (pendiente / pagada / cancelada, vencimiento de 24 h, marcar pagada, cancelar devolviendo stock, WhatsApp al cliente) | **(b)** — no existe; requiere carrito/checkout en la tienda |

---

## Migraciones de producción

**Ya aplicadas** (el 1/10, antes del push `ebd2858`):
1. `20260929180000_iphone_17_air_and_18_line.sql`
2. `20260929190000_sales_subtotal_and_full_discount.sql`

**Pendiente, a aplicar ANTES del próximo push:**
3. `supabase/migrations/20261001120000_web_orders.sql` (ventas web). Sin ella, la compra desde la tienda y la pestaña Ventas web fallan; el resto del sitio sigue andando.

Antes de aplicarla, `npx supabase migration list --linked` tiene que mostrar pendiente solo esa; después, `npx supabase db push --linked`.

---

## Parte 0 — Foto del detalle de producto · commit `2bdd939`

- **Foto**: rectángulo con esquinas de 12px (`rounded-xl`), `object-cover`, sin formas ovaladas en el CSS.
  - Desktop: tope de 440×440.
  - Mobile: ancho completo con alto máximo de 360px.
- **Columnas**: la grilla del detalle quedó en `440px | resto`. La descripción pasó después del precio y del botón de WhatsApp. Así, a 1440×800 entran sin scroll la foto, el nombre, el selector de modelo y el precio (el precio termina cerca de los 600px de alto).
- Archivos: `frontend/src/components/ProductGallery.tsx` y `ProductDetail.tsx`.
- **Si alguna foto se sigue viendo ovalada, viene del archivo.** Lo revisé: hay imágenes subidas que ya son un recorte ovalado (sacado de un PDF). Se arregla volviendo a subir esa foto desde Catálogo.

## Parte 1 — Relevamiento · commit `d3da11f`

Son las tablas de arriba.

## Parte 2 — Funciones · commit `bf157db`

- **Anular venta**: ya estaba construido y lo verifiqué contra la base local. Nunca borra: guarda `status = 'anulada'`, `voided_at` y `void_reason`. `void_sale` corre en una sola transacción con bloqueo de la fila. Si la venta ya estaba anulada da error 409. El motivo es obligatorio (400 si falta).
- **Descuento**:
  - Nueva columna `subtotal`. `discount_percent` va de 0 a 100 y `discount_amount` se guarda aparte.
  - El total guardado es el total con descuento, y la base exige `total = subtotal − descuento`.
  - El servidor calcula todo con los **precios de la base**: si el precio que manda el navegador no coincide, responde 409 con un mensaje claro y la pantalla trae los precios nuevos al carrito.
  - En la pantalla: botones Sin / 10% / 15% / 20% / Otro (campo libre de 1 a 100), y se ven subtotal, descuento y total a cobrar.
- **Historial y resumen**: sin cambios de lógica. La fila de la venta ahora muestra el subtotal guardado.
- **Precios**: sin cambios. Se sigue usando lo que ya estaba (precio por variante y "cambiar precio a todos los modelos").

## Parte 3 — Apariencia del diseño en todas las pantallas

Un commit por pantalla. No cambia qué guarda cada pantalla ni a qué endpoint llama.

| Commit | Pantalla | Qué cambió |
|---|---|---|
| `af97884` | Base, shell y login | <ul><li>Tokens del admin en `globals.css`</li><li>Helpers de estilo con variantes de tamaño en `adminStyles.ts`, para no pisar clases</li><li>`AdminNotice` (avisos con ícono)</li><li>Barra negra con logo y "Panel", solapas con ícono y "Salir" en desktop; barra inferior fija en mobile</li><li>Login con la cabecera negra del diseño</li></ul> |
| `25103ca` | Ventas | <ul><li>Tarjetas con miniatura y categoría; filas de 60px con stock ("Stock 5", "Quedan 2", "Sin stock")</li><li>Precio en mono y botón "+" de 40px</li><li>Carrito con stepper de 44px: bajar a 0 quita el producto</li><li>Resumen con "TOTAL A COBRAR" y medio de pago con íconos</li><li>Botón "Cobrar $ X"; barra "Ver venta" arriba de la navegación en mobile</li><li>Aviso de venta registrada con ícono (sin emoji)</li></ul> |
| `f6a691c` | Historial | <ul><li>Períodos segmentados</li><li>Tarjetas de resumen (la de total en negro)</li><li>Filas con etiquetas "−15%" y "ANULADA"</li><li>Botón "Anular venta" con ícono y diálogo de anulación con el estilo del diseño</li></ul> |
| `441d633` | Catálogo | <ul><li>Productos como tarjetas desplegables: miniatura, variantes, unidades y "N sin stock"</li><li>Adentro, las secciones Nombre, Fotos y Precio a la izquierda y Variantes a la derecha</li><li>Stock con "u." y precio con "$"</li><li>Fotos con "Principal" y Antes / Después / Quitar</li><li>"Agregar variante" también desde cada tarjeta, con el producto ya elegido</li></ul> |
| `02cc478` | Compras | <ul><li>Título "Cargar compra"</li><li>Resumen (productos, unidades, costo total y "Registrar compra") al costado en desktop y abajo en mobile</li><li>Ya no queda fijo al fondo, que en mobile quedaba tapado por la navegación</li><li>Stepper de cantidad y costo con "$"</li></ul> |
| `f473ab2` | Nuevo producto | <ul><li>Título "Nuevo producto"</li><li>Tarjetas "1. Datos del producto" y "2. Agregar variante"</li><li>Combobox de 48px, precio con "$" y stock con "u."</li></ul> |

---

## Verificación

- `npx tsc --noEmit` (frontend): OK.
- `npx eslint src` (frontend): 0 errores. Queda un warning que ya existía: `src/lib/adminApi.ts:28`, `window.location.assign` al vencer la sesión.
- `npx tsc --noEmit` (backend): OK.
- `npx next build`: OK, compilan todas las rutas.

### Pruebas reales contra la base LOCAL

Las corrí con un script temporal que llamaba al backend local (`localhost:3001`) y leía la base local. Se negaba a correr si `SUPABASE_URL` no era local. El script **ya está borrado**. Lo corrí después de la Parte 2 y de nuevo al terminar la Parte 3: las dos veces dio 14/14 OK.

Variante usada: `FUNDACEREC-IP13-UNICO`, precio $10.000, stock inicial 5.

| Prueba | Resultado |
|---|---|
| Registrar una venta | OK: HTTP 201 |
| El stock baja | OK: 5 → 4 |
| Anular | OK: queda "anulada" |
| El stock vuelve exacto | OK: 4 → 5 |
| Anular otra vez da error | OK: 409 "Esta venta ya estaba anulada." |
| No devuelve stock dos veces | OK: sigue en 5 |
| Anular sin motivo | OK: 400 |
| Venta de $10.000 con 20% | OK: guarda subtotal 10.000, descuento 2.000, total **8.000** |
| El resumen suma $8.000 (no cuenta la anulada de $10.000) | OK: total 8.000 · 1 venta · descuentos 2.000 |
| La venta anulada no suma | OK: al anular la de $8.000 el resumen queda en $0 y 0 ventas |
| Extra: 100% se acepta | OK: total $0 |
| Extra: 101% se rechaza | OK: 400 |
| Extra: precio adulterado desde el navegador | OK: 409 con el precio real |
| Extra: stock final igual al inicial | OK |

Además, las 27 ventas que ya había en la base local cumplen `total = subtotal − descuento` después de la migración.

---

## Funciones del diseño que NO construí

Tal como pediste, solo las anoto.

- ~~**Ventas web**~~: construida después, a pedido (ver "Ventas web" más abajo).
- **Login**: botón para mostrar u ocultar la contraseña.
- **Ventas**:
  - chips por línea de iPhone (11…18) en lugar de por categoría;
  - búsqueda por modelo tipo "cherry 15 pro".
- **Historial**: motivos rápidos para anular (chips).
- **Catálogo**:
  - buscador que también encuentre por modelo, color o categoría;
  - subir varias fotos a la vez y arrastrar para reordenar;
  - un solo "Guardar" por fila de variante, para stock y precio juntos.
- **Nuevo producto**: armar la grilla modelo × color de una sola vez.

---

## Decisiones que tomé solo (la opción más conservadora)

1. **Precio del lado del servidor.** Al registrar una venta, el backend usa el precio de la base. Si el navegador manda otro, responde 409 en lugar de cobrar cualquiera de los dos, y la pantalla actualiza el carrito.
2. **Borrado compensatorio.** Se mantiene el borrado compensatorio de la venta si falla la carga de sus productos: es el comportamiento que ya existía.
3. **Descripción del producto** después del precio y del botón de WhatsApp, para que a 1440×800 entre todo lo pedido sin scroll.
4. **Fotos ovaladas.** No las toqué: vienen de los archivos subidos y se arreglan volviendo a subirlas.
5. **"Productos" pasó a llamarse "Nuevo producto"** (solapa y título), como en el diseño. La ruta sigue siendo `/admin/productos`.
6. **Ventas mantiene los chips por categoría.** Los de línea de iPhone son una función nueva (ver arriba).
7. **Catálogo guarda stock y precio por separado**, con un "Guardar" cada uno, como hasta ahora. No lo junté en un solo guardado porque eso cambia cómo se guarda.
8. **Catálogo abre la primera tarjeta** de la página al entrar, como el diseño.
9. **Paginación del catálogo.** Se mantiene: 40 variantes por página.
10. **Compras y Nuevo producto conservan lo que el diseño no muestra**: la fecha opcional de la compra, el proveedor elegido desde una lista con "+ Nuevo proveedor", la descripción y la categoría del producto, y el SKU sugerido.
11. **La barra de arriba con solapas aparece desde 1024px.** En tablet se usa la navegación de abajo, como en mobile.
12. **`/logo.jpg` quedó sin uso** (el admin usa el logo del diseño). No lo borré.
13. **`design/` quedó en el repo** (commit `634cfb9`); `design/uploads` está en `.gitignore`.
14. **Ventas de prueba.** Las que crearon las pruebas quedaron en la base local **anuladas**, con motivo, sin borrar: el stock volvió a su valor.
15. **Usuario admin local.** Para las pruebas se usó un usuario admin creado solo en la base local (sus datos no se guardan en el repo).

## Ventas web (pedido del 1/10)

Construida según `design/ui_kits/storefront/CartScreens.jsx`, `design/ui_kits/admin/WebVentasScreen.jsx` y `design/ui_kits/shared/reservas.js`.

| Commit | Qué |
|---|---|
| `435b453` | Migración `20261001120000_web_orders.sql`: reservas, sus productos y las funciones que mueven el stock en una sola transacción |
| `fc633d2` | Backend `/api/web-orders`: crear, ver por link, contar, listar, pagada y cancelar. Código "Web LF-…" en el historial |
| `9ce735c` | Tienda: "Agregar al carrito", barra "Ver carrito", `/carrito`, `/carrito/finalizar` y `/reserva/<link>` |
| `e94c49d` | Panel: solapa "Ventas web" con contador rojo, filtros, Pagada, Cancelar con motivo y WhatsApp al cliente |

**Cómo funciona el stock**
- La reserva descuenta el stock al confirmarse. Durante esas 24 h nadie más puede comprar esas unidades, ni en la web ni en la feria.
- **Pagada**: la reserva pasa al historial como venta por transferencia, canal web. El stock no se vuelve a descontar.
- **Cancelada**: el stock vuelve.
- Los precios salen siempre de la base, nunca del navegador.

**Decisiones que tomé solo**
- **Vencimiento.** A las 24 h la reserva no se cancela sola: queda "Vencida" y la cancela una persona, como en el diseño.
- **Link de la reserva.** El cliente la ve en `/reserva/<código largo>`. Es imposible de adivinar, así que nadie puede ver la reserva de otro, y la vista no muestra el teléfono.
- **Topes por compra.** Hasta 20 productos distintos y 10 unidades de cada uno. Sirven para que alguien no reserve todo el stock de una. No hay límite por persona ni por IP.
- **Datos de cobro de prueba** hasta cargar `NEXT_PUBLIC_TRANSFER_ALIAS`, `NEXT_PUBLIC_TRANSFER_CBU`, `NEXT_PUBLIC_TRANSFER_HOLDER` y `NEXT_PUBLIC_TRANSFER_BANK`. Mientras tanto, la pantalla de la reserva avisa "datos de prueba". El WhatsApp de la tienda sale de `NEXT_PUBLIC_WHATSAPP_NUMBER`, o de uno de prueba si no está cargado.
- **Botón de la ficha.** "Consultar por WhatsApp" se reemplazó por "Agregar al carrito", como en el diseño.
- **Botón "Actualizar"** en la pestaña Ventas web, que no está en el diseño, para traer las reservas nuevas sin recargar la página.
- **Anular una venta web.** Si después se anula en el historial una venta web ya pagada, el stock vuelve, pero la reserva sigue figurando "pagada" en la pestaña Web.

**Pruebas contra la base LOCAL** (script temporal, ya borrado): 25 de 25 OK.
- La reserva entra pendiente, con vencimiento a 24 h, el total con el precio de la base, y descuenta el stock (5 → 3).
- El link del cliente muestra la reserva sin el teléfono; un link inexistente da 404.
- El contador suma las pendientes.
- **Pagada:**
  - el stock no se descuenta dos veces (sigue en 3);
  - queda como venta por transferencia, canal web, de $20.000;
  - el historial la muestra como "Web LF-…" y el resumen la suma;
  - marcarla pagada de nuevo o cancelarla da 409.
- **Cancelada:**
  - devuelve el stock y guarda el motivo;
  - cancelarla de nuevo da 409 y no devuelve dos veces;
  - marcarla pagada da 409.
- **Límites:**
  - pedir más que el stock da 409 y no reserva nada;
  - más de 10 unidades, un WhatsApp inválido o un carrito vacío dan 400.
- **Limpieza:** anular la venta web devolvió el stock a 5.
- **Por la tienda (Next):**
  - la compra calcula con el precio de la base aunque el navegador mande otro;
  - la página de la reserva carga con el alias, el CBU y el botón de WhatsApp;
  - las rutas del panel sin sesión dan 401.

Typecheck del frontend y del backend, lint (0 errores) y `next build`: OK.

---

## Pendiente de tu revisión antes de pushear

1. Probar con `npm run dev`:
   - agregar al carrito, comprar y ver la reserva;
   - en el panel, la pestaña Web: Pagada y Cancelar.
2. Aplicar en producción la migración `20261001120000_web_orders.sql`.
3. Cargar en Vercel el alias, el CBU, el titular y el banco reales (o dejar los de prueba por ahora).
4. Hacer el push.

Cada parte se revierte con `git revert <commit>`.
