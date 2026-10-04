# Informe: selector de color con círculos

Rama `colores` (sale de `main` en `8f71ac2`; se verificó que `compras-grilla` ya estaba mergeada). Todo en local: no se pusheó ni se aplicó nada a producción.

## Qué cambió

### Datos
- Tabla `colors` (nombre único, slug, hex, `assigned`, sort_order). Lectura pública, escritura solo `service_role`.
- `product_variants.color_id` y `product_images.color_id` (null = foto general).
- La columna de texto `color` se conserva. Un trigger la mantiene igual al nombre del color, y si alguien escribe solo el texto (la función de compras, el script de importación, la API vieja) busca el color por nombre y lo enlaza.
- Función `sync_colors_from_variants()`: crea los colores que falten a partir de los textos y enlaza las variantes. La llaman la migración, `seed.sql` y el script de importación.

### Panel
- **`/admin/colores`** (nueva, en el menú lateral): lista con el selector de color y el nombre de cada uno, alta de color nuevo, etiqueta "Sin color asignado" y un solo Guardar para todo lo tocado. Cada color tiene "No es un color".
- **Catálogo**: la galería de cada producto tiene "Fotos de: General · Azul · Rojo…" con los colores de ese producto y la cantidad de fotos de cada uno. Subir, mover y quitar actúan sobre el grupo elegido; la subida sigue yendo directo a Storage con URL firmada.
- **Etiqueta "Color sin foto"** en la tarjeta del producto, y debajo de la galería el detalle de qué colores faltan.
- **Selector de color** (combobox con el círculo al lado y "Crear color nuevo") en agregar variante, Nuevo producto y Compras.

### Tienda
- **Ficha**: con 2 colores o más, círculos de 32px con anillo en el elegido y la etiqueta "Color — Rojo". Son radios nativos: Tab entra al grupo y las flechas cambian de color. Se acomodan en varias líneas.
- **Galería por color**: fotos del color elegido; si no tiene, las generales; si tampoco hay, la primera del producto. Cambia con un fundido y sin cambiar de tamaño.
- **Disponibilidad por modelo**: un color sin stock para el modelo elegido se ve apagado con una raya diagonal, no se puede elegir y avisa "Sin stock para iPhone X". Si al cambiar de modelo el color elegido deja de estar, salta al primero disponible.
- **`?color=<slug>`** en la URL, compartible. El color inicial es el primero con stock.
- **Tarjetas del listado**: puntitos de color (máximo 5 y "+N"). En desktop, pasar el mouse por un puntito muestra la foto de ese color, si tiene.
- Con un solo color o ninguno, la ficha queda como antes.

## Commits

| Commit | Qué |
|---|---|
| `cc0b92e` | Migración: `colors`, `color_id`, trigger, backfill; seed y script de importación |
| `63301d8` | API de colores, fotos por color, lógica pura (`lib/productColors.ts`) |
| `e4f6840` | Panel: pantalla Colores, selector de color, fotos por color en Catálogo |
| `0c834ad` | Tienda: círculos, galería por color, `?color=`, puntitos en las tarjetas |
| `9c8edc7` | `npm run test:colores` |

## Pruebas

| Comando | Resultado |
|---|---|
| `npm run test:colores` (nuevo) | 115/115 OK |
| `npm run test:unificar` | 180/180 OK |
| `npm run test:compras` | 162/162 OK |
| `npm run build` | OK |
| `npm run lint` | 0 errores, 1 advertencia que ya estaba (`adminApi.ts:27`) |

Qué cubre `test:colores`:

- **Migración**: la tabla tiene colores, hex válidos, slugs únicos, "Único" no se sembró, backfill completo (ninguna variante con texto de color y sin `color_id`), texto igual al nombre del color. La migración se corrió dos veces seguidas a mano: la segunda no crea nada ni falla.
- **Fotos viejas**: al aplicar la migración, las 43 fotos existentes quedaron con `color_id` null (generales).
- **Permisos**: `anon` lee `colors` y `color_id`, no puede escribir y sigue sin ver `cost_price`; `sync_colors_from_variants` rechaza a `anon` y `authenticated`; los endpoints devuelven 401 sin sesión.
- **Coherencia**: texto en mayúsculas o con espacios se enlaza; un texto que no es color queda como descripción; renombrar un color renombra sus variantes; borrar un color deja el texto.
- **Fotos por color**: alta con y sin color, reordenar dentro de un color sin mover las generales.
- **Lógica**: fotos por color y caída a generales, disponibilidad por modelo, cambio de modelo con el color sin stock, color inicial y `?color=`.
- **Ficha** (sobre el HTML que devuelve el servidor): un radio por color, el color sin stock para el modelo viene deshabilitado con su aviso, `?color=` elige el color y cambia el `src` de la foto grande, el precio es el de la variante modelo + color, y un producto de un solo color no tiene selector.

### Lo que no está probado
**No hice la prueba en navegador a 390px y 1280px.** Tengo anotado de antes que no querés que corra Playwright ni saque capturas, y eso pisa lo que pedía el brief. Lo que quedó sin ver con los ojos:
- que los círculos se acomoden en varias líneas sin scroll horizontal (están con `flex-wrap`),
- el fundido al cambiar de color y que la foto no salte de tamaño,
- la raya diagonal y el anillo del color elegido,
- el hover de los puntitos en las tarjetas,
- el cambio de color por click. Lo que sí está probado es el mismo cambio entrando por `?color=`, que usa la misma lógica.

## Decisiones

- **Color y descripción conviven.** Ayer el campo pasó a llamarse "Descripción" porque se usa para cosas que no son colores (cables). Con esto, una variante tiene color (de la lista) o, si no, una descripción libre: en el selector está "Otra descripción (no es un color)". En la ficha, las descripciones siguen saliendo como chips con "Elegí una opción".
- **Los cinco "colores" que no son colores** (BATMAN, BOB, CAP AMÉRICA, IRON MAN, Tipo C a Lightning) se sembraron como pedía el brief: grises y "sin color asignado". Para sacarlos de la lista está "No es un color" en `/admin/colores`; el texto queda como descripción. No los saqué yo porque el brief pedía dejarlos marcados para que los corrijas.
- **Se unificaron por género**: "negra" → Negro, "blanca" → Blanco, "morada" → Morado, y "bordo" → Bordó. Quedaron 39 colores de 41 textos.
- **"Color sin foto" solo en productos con 2 colores o más.** Con un solo color la ficha usa las fotos generales y no falta nada.
- **Colores sin stock en ningún modelo no aparecen en la ficha.** La tienda solo recibe variantes con stock, así que un color agotado en todos los modelos no se muestra (ni apagado).
- **La foto de portada de las tarjetas** es la primera foto general; si todas son de algún color, la primera que haya.
- **El orden de las fotos sigue siendo uno solo por producto.** Reordenar dentro de un color mueve solo las de ese color.
- **El mensaje de WhatsApp** ya incluía producto, modelo y color (sale del detalle de la reserva); no hizo falta cambiarlo. No hay botón de WhatsApp en la ficha: el mensaje se arma en la página de la reserva.
- **Los formularios siguen mandando el nombre del color como texto** y la base lo enlaza. Así no hubo que tocar la función SQL de compras ni el formato de la API.

## Lo que quedó sin hacer

- **La matriz modelo × color en Compras.** La grilla sigue por filas, con el color elegible de la lista en las variantes nuevas. La matriz implica crear variantes nuevas dentro de celdas y decidir a qué fila pertenece el costo; preferí no meterla junto con todo lo demás. El brief lo permitía.
- **La prueba en navegador** (ver arriba).
- **Editar el color de una variante existente** desde Catálogo: hoy se elige al crearla.
- **Ordenar los colores a mano**: `sort_order` existe pero no hay forma de editarlo; salen por nombre.

## Fotos faltantes por producto y color

De la **base local** (puede diferir de producción). Son los productos con 2 colores o más cuyos colores no tienen ninguna foto propia; hoy ninguna foto tiene color, así que son todos.

| Producto | Colores sin foto propia |
|---|---|
| COMBO Funda + Funda Cargador | Cereza, Rosa |
| Fire Case Mate | Negro, Plateado |
| Funda Cargador + Comecable | BATMAN, BOB, CAP AMÉRICA, IRON MAN (no son colores) |
| Funda cargador + comecables | Cereza, Rosa |
| Lentes de cámara con Glitter | Dorado, Negro, Plateado |
| MagCase | Blanco, Bordó, Negro, Rosa, Rosa pastel |
| MagMatte | Azul, Blanco, Celeste, Negro, Rosa, Violeta |
| Rave Case | Azul, Blanco, Negro, Rosa, Violeta |
| Silicona | Amarillo pastel, Azul, Azul marino, Azul oscuro, Azul petróleo, Beige, Blanco, Bordó, Celeste, Celeste pastel, Crema, Gris, Gris oscuro, Lila, Magenta, Marrón, Marrón claro, Morado, Negro, Púrpura, Rosa, Rosa pastel, Rosa viejo, Verde, Verde agua, Verde oscuro, Verde pastel, Verde plomo, Vinotinto, Violeta |
| Smoky Case | Gris, Verde |
| Star Case | Negro, Plateado |
| Wave Case | Beige, Bordó, Cherry, Marrón, Rosa |

Mientras falten, la ficha muestra las fotos generales al elegir esos colores.

## Migraciones para producción

Una sola, y no está aplicada:

1. `supabase/migrations/20261006120000_colors.sql`

Es idempotente y hay que aplicarla **antes** de desplegar el frontend de esta rama: la tienda pide `color_id` y la tabla `colors` en cada listado y ficha, y sin la migración esas consultas fallan.

Al aplicarla en producción siembra los colores desde los textos que haya ahí, que pueden no ser los mismos 41 de local. Conviene pasar por `/admin/colores` después para revisar los "sin color asignado".
