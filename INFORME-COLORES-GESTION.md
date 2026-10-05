# Informe: colores por modelo y motivos

Rama `colores`. Esta tanda corrige la gestión de colores y agrega los motivos. Todo en local: no se pusheó ni se aplicó nada a producción.

Las migraciones `20261006120000` y `20261007120000` ya estaban aplicadas en producción (lo verifiqué con `supabase migration list --linked`), así que no se tocaron: todo lo nuevo va en una migración aparte.

## Qué cambió

### 1. Se fue la pestaña "Colores"
- "Colores" ya no está en el menú lateral y la página `/admin/colores` se borró.
- Los colores se gestionan desde el selector de color: "Crear color nuevo" (nombre + tono) y **"Editar colores"**, que abre un modal para renombrar, cambiar el tono, eliminar los que no tienen uso, **unir** dos colores y "No es un color".
- **Unir colores** pasa todas las variantes y fotos de uno al otro y borra el que sobra. Si un producto tenía los dos para el mismo modelo, queda una sola variante con el stock sumado; la otra se da de baja en 0, sin borrarse.

### 2. Motivos
- Tabla `motifs`, `product_variants.motif_id` y `product_images.motif_id`, con las mismas reglas de acceso que los colores. Una variante o una foto tiene color o motivo, nunca los dos (lo impide la base).
- **BATMAN, BOB, CAP AMÉRICA e IRON MAN** pasaron de colores a motivos, con sus variantes intactas (mismo stock, precio y SKU).
- **"Tipo C a Lightning"** salió de la lista de colores y quedó como descripción libre, con su texto.
- El texto de la variante sigue siendo "lo que la distingue": el nombre del color, el del motivo o una descripción libre. Por eso el carrito, el historial y el mensaje de WhatsApp muestran el motivo sin cambios.

### 3. Colores por modelo (matriz), solo fundas
En Catálogo, cada producto que no es de Accesorios tiene "Colores por modelo":
- Filas = modelos del producto, con "+ Agregar modelo". Columnas = sus colores. Cada celda es un tilde: tildada si existe la variante activa.
- "+ Agregar color" suma una columna con todas las celdas sin tildar, con los accesos "Todos" y "Ninguno".
- **Tildar** crea la variante (stock 0, precio de otra del mismo modelo o, si no hay, de otra del producto, SKU con la lógica de siempre) o reactiva la que estaba dada de baja, con su stock. **Destildar** la da de baja, nunca la borra; si tiene stock, pide confirmación mostrando las unidades.
- **Producto sin color**: el primer color se asigna a todas sus variantes actuales, con confirmación; después se destildan los modelos que no lo tienen.
- En el celular la matriz se desplaza hacia el costado dentro de su recuadro, con la columna de modelos fija.
- **Por categoría**: se mantiene, y ahora permite elegir los modelos (todos por defecto).

### 4. Motivos en el panel
- Sección "Motivos" en cada producto, en cualquier categoría.
- Sin modelos de iPhone (protectores de cargador): lista simple, un motivo = una variante con su stock y precio. "+ Agregar motivo" la crea con stock 0 y el precio copiado; la "x" la da de baja.
- Con modelos de iPhone: la misma matriz, modelo × motivo.
- Un producto con colores no puede tener motivos y viceversa: la sección que no corresponde lo explica. Lo mismo si sus variantes tienen una descripción libre.
- Etiqueta "Motivo sin foto".

### 5. Fotos con buscador
"Fotos de:" pasó de una fila de botones a un selector con buscador por nombre: "General" arriba y después los colores (con círculo) o los motivos del producto, cada uno con su cantidad de fotos.

### 6. Tienda
- Colores: sin cambios.
- Motivos: una lista desplegable con la etiqueta "Motivo", igual que "Elegí tu modelo". Aparece con 2 motivos o más. Los agotados salen deshabilitados con "(sin stock)". Al elegir uno cambia la galería a sus fotos, con caída a las generales. `?motivo=<slug>` es compartible y por defecto queda el primero con stock.
- Sin círculos ni puntitos para motivos en las tarjetas.

### 7. Compras
Las filas muestran el color o el motivo de cada variante, y una variante nueva elige color o motivo según lo que use el producto. La grilla no se rehízo.

## Commits de esta tanda

| Commit | Qué |
|---|---|
| `4e4e749` | Migración: `motifs`, `motif_id`, no-colores migrados, celdas de la matriz, unir |
| `236cb31` | API: motivos, celdas, unir, eliminar sin uso, categoría con modelos |
| `087be88` | Panel: matriz, motivos, modal "Editar colores", fotos con buscador; se va la pestaña |
| `3a4ed96` | Tienda: selector de motivo, galería por motivo, `?motivo=` |
| `f1bf9fd` | Pruebas de colores adaptadas al nuevo borrado |
| (este) | `npm run test:motivos` e informe |

## Pruebas

| Comando | Resultado |
|---|---|
| `npm run test:motivos` (nuevo) | 170/170 OK |
| `npm run test:colores` | 119/119 OK |
| `npm run test:colores-gestion` | 113/113 OK |
| `npm run test:compras` | 162/162 OK |
| `npm run test:unificar` | 180/180 OK |
| `npm run build` | OK |
| `npm run lint` | 0 errores, 1 advertencia que ya estaba (`adminApi.ts:27`) |

Qué cubre `test:motivos`:
- **No-colores migrados**: los cuatro personajes son motivos y no colores; el cable quedó como descripción libre; ninguna variante perdió stock, precio ni SKU (lo verifiqué además comparando contra una copia tomada antes de migrar). `sync_colors_from_variants` no los vuelve a crear como colores.
- **Matriz**: tildar crea, destildar da de baja, retildar reactiva la misma variante; con stock, bloquea sin confirmación y conserva el stock al forzar; "Todos" y "Ninguno".
- **Producto sin color**: el primero se asigna a todas las variantes; el segundo ya crea.
- **Motivos en un protector**: alta, baja y reactivación; primer motivo asignado a la variante existente.
- **Exclusión mutua**: motivo en un producto con colores y color en uno con motivos, ambos rechazados con su aviso.
- **Accesorios**: colores rechazados, motivos aceptados.
- **Unir colores**: variantes y fotos pasan, la celda repetida se fusiona sumando stock, no se pierde ninguna unidad.
- **Categoría con modelos elegidos**: agrega y quita solo en los modelos indicados.
- **Tienda**, con los dos ejemplos pedidos:
  - *Silicone*: en iPhone 15 se pueden elegir Azul, Gris y Verde, con Rojo y Amarillo apagados; en iPhone 13, Rojo, Amarillo y Azul. El Azul muestra la misma foto en los dos modelos.
  - *Protector con 3 motivos*: lista "Motivo" con los tres, el agotado deshabilitado con "(sin stock)", y al elegir otro cambia la foto grande.
- La migración se corrió dos veces seguidas en local sin errores.

### Lo que no está probado
- **La interfaz en el navegador**, incluida la matriz a 390px: no corro Playwright ni saco capturas. Verifiqué el servidor, la base, la compilación y, para la tienda, el HTML que devuelve cada URL.
- **El modal "Editar colores"** y la matriz no tienen prueba propia de clicks; sí están probadas todas las llamadas que hacen.
- **El mensaje de WhatsApp** se arma en el navegador. Verifiqué que la página de la reserva, de donde sale, trae el producto y el motivo.

## Decisiones

- **Migración nueva, sin tocar las anteriores**, porque ya estaban en producción.
- **El texto de la variante lleva el nombre del motivo**, igual que ya llevaba el del color. Así todo lo que mostraba "el color" (carrito, reservas, historial, compras) muestra el motivo sin tocar esas pantallas.
- **"Usa colores" y "usa motivos" se deciden por las variantes activas.** Si a un producto se le dan de baja todos los colores, puede pasar a motivos.
- **Eliminar un color o motivo en uso ya no se permite directo** (responde 409): hay que unirlo con otro. "No es un color" sigue existiendo en el modal para sacarlo de la lista dejando el texto como descripción.
- **Tildar no pide confirmación**; crea la variante con stock 0 y es reversible destildando. Piden confirmación solo dar de baja algo con stock y el primer color de un producto.
- **El primer color va a todas las variantes** aunque se haya tildado un solo modelo, como pedía el brief.
- **Por categoría, con una lista de modelos, no entran las variantes sin modelo.** Sin lista ("todos") sí. Y los productos sin color o que usan motivos se omiten, con el motivo.
- **Los motivos agotados se ven en la ficha; los colores agotados en todos los modelos, no.** Para los motivos hago una consulta aparte de las variantes activas; los colores quedaron como estaban porque el brief pedía no cambiarlos.
- **"Cereza" y "Rosa" de los protectores quedaron como colores.** El brief menciona "Cerezas" como ejemplo de motivo, pero la lista a migrar eran solo los cuatro personajes. Si son motivos, se cambian desde el panel: no hay un botón que convierta un color en motivo, hay que dar de baja el color y agregar el motivo.
- **"Nuevo producto" sigue ofreciendo solo color** (y descripción libre). Los motivos se agregan después desde Catálogo.
- **Las funciones viejas** (`add_color_to_product` y las otras tres) quedaron en la base y con sus endpoints: no las usa el panel, pero siguen funcionando y tienen sus pruebas.

## "Sin color asignado" pendientes

**En la base local no queda ninguno**: los cinco que había eran los cuatro personajes (ahora motivos) y el cable (ahora descripción).

**En producción no lo sé.** La migración anterior sembró los colores con los datos de allá y no los consulté. Lo que haga esta migración allá:
- Los cuatro personajes y cualquier "Tipo X a …" se resuelven solos.
- Cualquier otro "sin color asignado" **no se toca**.

Para verlos después de aplicarla: en cualquier selector de color, "Editar colores"; aparecen con la etiqueta "Sin color asignado" y la cantidad de variantes. Ahí se les elige un tono, se unen con otro, o "No es un color".

## Lo que quedó sin hacer

- La prueba en navegador (ver arriba).
- Convertir un color existente en motivo con un click.
- Ordenar a mano colores o motivos (`sort_order` existe, no hay cómo editarlo).
- Cambiar el color o motivo de una variante ya creada.
- Sigue pendiente de antes: la matriz modelo × color en la pantalla de Compras.

## Migraciones para producción

Una sola pendiente:

1. `supabase/migrations/20261008120000_motifs_and_matrix.sql`

Es idempotente y tiene que aplicarse **antes** de desplegar el frontend de esta rama: la tienda y el panel piden `motif_id` y la tabla `motifs`, y sin la migración esas consultas fallan.

Ya aplicadas en producción (no hay que hacer nada): `20261006120000_colors.sql` y `20261007120000_color_management.sql`.

**Atención**: el preview de Vercel de la rama `colores` que está publicado corre el código anterior. Cuando se pushee esta tanda, el preview nuevo va a necesitar esta migración en la base a la que apunte.
