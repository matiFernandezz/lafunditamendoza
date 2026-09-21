---
name: La Fundita
description: Catálogo público de fundas y accesorios de iPhone, planteado como una ficha técnica en papel y tinta.
colors:
  paper: "#fafaf8"
  ink: "#121212"
  graphite: "#6b6b68"
  rule: "#e5e3dd"
typography:
  display-hero:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(3rem, 14.5vw, 8rem)"
    fontWeight: 600
    lineHeight: 0.92
    letterSpacing: "-0.035em"
  display-page:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 10vw, 4.5rem)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 500
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  data:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 500
rounded:
  control: "16px"
  container: "28px"
  dot: "9999px"
spacing:
  tile-gap: "12px"
  tile-gap-md: "16px"
  card-padding: "20px"
  card-padding-sm: "24px"
  section-gap: "64px"
  section-gap-md: "96px"
components:
  tile:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.container}"
    padding: "20px"
  tile-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  product-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.container}"
    padding: "20px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    height: "56px"
    padding: "0 24px"
  select-model:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "56px"
  header:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    height: "56px"
---

# Design System: La Fundita

## Overview

**Creative North Star: "La ficha técnica"**

El catálogo se lee como la ficha de un objeto: papel casi blanco, tinta casi negra, un gris para lo secundario y una regla fina para separar. La forma del iPhone aparece en el radio de 28px de tarjetas y mosaicos, y el rango real de modelos, "iPhone 11 → 17 Pro Max", es el protagonista tipográfico de la home. No hay fotos ni acento de color: la jerarquía sale de la escala, el peso y la inversión papel/tinta.

La densidad es baja en la home (pocos elementos, grandes) y de tabla en las fichas (filas de variantes separadas por reglas, precio y SKU en mono). Todo se piensa para el celular: objetivos de 56px, poco scroll.

**Key Characteristics:**
- Cuatro colores y nada más; la interacción invierte papel y tinta.
- Sin sombras: profundidad por borde de 1px y por inversión.
- Radio 28px en contenedores, 16px en controles.
- Display comprimido (tracking negativo, interlínea menor a 1) contra cuerpo neutro y datos en mono.
- Una única animación, la del hero al cargar.

## Colors

Paleta monocroma cálida-neutra de cuatro valores; el contraste lo da la tinta, no un acento.

### Neutral
- **Papel** (`{colors.paper}`): fondo de página y texto sobre superficies de tinta.
- **Tinta** (`{colors.ink}`): texto, header, botón primario, foco, selección y estado hover/active de los mosaicos.
- **Grafito** (`{colors.graphite}`): texto secundario (conteos, descripciones, SKU, breadcrumb) y borde del select.
- **Regla** (`{colors.rule}`): bordes de 1px de mosaicos y fichas, y divisores entre variantes.

### Named Rules
**The Four Colors Rule.** No entra ningún color fuera de papel, tinta, grafito y regla. El estado (poco stock, hover, activo) se expresa con peso, un punto de tinta o inversión, no con color.

**The Inversion Rule.** Hover y active de una superficie interactiva grande la invierten a tinta con texto papel (el grafito pasa a papel al 70%).

## Typography

**Display Font:** Space Grotesk (con system-ui, sans-serif)
**Body Font:** IBM Plex Sans 400/500/600 (con system-ui, sans-serif)
**Label/Mono Font:** IBM Plex Mono 400/500 (con ui-monospace, monospace)

**Character:** Un grotesco geométrico y apretado para titular, un humanista técnico para leer y un mono para datos que se comparan.

### Hierarchy
- **Display hero** (600, `clamp(3rem, 14.5vw, 8rem)`, 0.92, -0.035em): solo el h1 de la home, dos líneas con la flecha.
- **Display page** (600, `clamp(2.5rem, 10vw, 4.5rem)`, 0.98, -0.03em): h1 de categoría; el nombre del padre va en grafito con " / ".
- **Headline** (500, 1.5rem, -0.025em): nombres de grupo en la home.
- **Title** (500-600, 1.25rem-1.875rem, tracking -0.025em): etiqueta de mosaico (500), nombre de producto (600), títulos de error y 404 (600, 1.875rem).
- **Body** (400, 1rem; 1.25rem en el texto de apoyo del hero desde md; 15px en descripción de producto): en Plex Sans; el texto de apoyo se limita a 34ch (20ch en desktop).
- **Data** (Plex Mono, 500, 1rem, tabular-nums): precios; SKU en 0.75rem.
- **Small** (Plex Sans, 0.875rem, tabular-nums): conteos de productos y breadcrumb en grafito. Mayúsculas y tracking no se usan.

### Named Rules
**The Mono For Data Rule.** Precio y SKU van en Plex Mono con cifras tabulares; el resto es sans o display.

## Layout

Contenedor de `max-w-5xl` con padding lateral de 20px (32px desde md) y header sticky de 56px. Ritmo vertical: 64px entre secciones de la home (96px desde md), 40px (56px desde md) en categoría; el contenido arranca 32px (56px desde md) bajo el header y cierra con 80px.

Home: hero en una columna; en lg pasa a dos (`1fr auto`) con el texto de apoyo abajo a la derecha. Debajo, mosaicos de proporción 4/5 en 2 columnas (4 desde md), separación 12px (16px desde md), agrupados por categoría padre. Categoría: encabezado, luego grilla de 17rem para el filtro (sticky, top 80px, desde md) y una lista de fichas con 16px de separación; en mobile todo en una columna. /admin hereda header, paleta y fuentes pero conserva su ancho `max-w-3xl` y su propio layout.

## Elevation & Depth

Plano. No existe ninguna sombra. La separación se logra con borde de 1px en regla, con la inversión papel/tinta al interactuar y con el header sólido de tinta. Los estados vacíos usan borde discontinuo en regla.

### Named Rules
**The No Shadow Rule.** Ninguna superficie lleva box-shadow; si necesita jerarquía, usa borde, escala o inversión.

## Shapes

Dos radios con significado. 28px (el cuerpo de un iPhone) en mosaicos, fichas de producto y estados vacíos; 16px en controles (select, botones). Punto de stock circular de 6px. Las flechas son de trazo cuadrado con junta en inglete, para que su grosor acompañe al display; el chevron del select usa terminal cuadrada. Sin íconos de fuente ni glifos.

## Components

### Buttons
- **Shape:** 16px (`rounded-2xl`), alto 56px.
- **Primary:** fondo tinta, texto papel, padding lateral 24px, peso 500. Vale igual como `<button>` (reintentar) y como enlace (volver al inicio).
- **Hover / Focus:** al presionar escala a 0.98 en 200ms. El foco es el global: contorno de 2px en tinta con offset de 3px (en papel sobre el header).

### Cards / Containers (Ficha de producto)
- **Corner Style:** 28px. **Background:** el del papel, sin relleno. **Border:** 1px regla. **Padding:** 20px (24px desde sm). **Shadow:** ninguna.
- Título, descripción opcional en grafito, y variantes como filas separadas por reglas (sin paneles anidados): modelo en peso 500, color y SKU en grafito debajo, precio en mono a la derecha y, con 3 unidades o menos, punto de tinta más "Última unidad" o "Quedan N".

### Tile de categoría
- Proporción 4/5, 28px, borde regla, padding 20px; conteo arriba a la izquierda en grafito, flecha arriba a la derecha, etiqueta abajo en Space Grotesk 500.
- **Hover / Active:** fondo y borde tinta, texto papel, la flecha se corre 2px; active además escala a 0.98. Transición de 200ms.

### Inputs / Fields (Filtro de modelo)
- Select nativo de 56px, 16px de radio, borde 1px grafito y fondo transparente; en hover el borde pasa a tinta. Etiqueta visible encima ("Elegí tu iPhone"), chevron dibujado a la derecha, anuncio aria-live al filtrar.

### Navigation
- Header sticky de 56px, fondo tinta, solo el nombre "La Fundita" en display 600. En categoría, un enlace "Inicio" con flecha girada, en grafito y hover a tinta, con área táctil de al menos 36px de alto.

### Hero de rango (componente firma)
- Dos líneas enmascaradas: suben 105% a 0 en 700ms con `cubic-bezier(0.22, 1, 0.36, 1)`, la segunda con 90ms de retraso; la flecha se dibuja por trazo en 600ms con 300ms de retraso. El estado por defecto es el final, y con `prefers-reduced-motion` no hay animación. Un texto solo para lectores de pantalla reemplaza el contenido oculto.

## Do's and Don'ts

### Do:
- **Do** limitar los colores a papel #FAFAF8, tinta #121212, grafito #6B6B68 y regla #E5E3DD.
- **Do** usar 28px para contenedores y 16px para controles, y 56px de alto en botones y select.
- **Do** poner precios y SKU en Plex Mono con `tabular-nums`.
- **Do** expresar hover y active invirtiendo a tinta, con transición de 200ms.
- **Do** mantener el foco visible (2px tinta, offset 3px) y respetar `prefers-reduced-motion`.
- **Do** dejar que la animación del hero sea la única del catálogo.

### Don't:
- **Don't** añadir sombras, ni siquiera suaves.
- **Don't** introducir un acento de color ni un fondo crema.
- **Don't** usar mayúsculas con tracking, eyebrows ni kickers sobre los títulos.
- **Don't** usar animaciones de aparición al hacer scroll.
- **Don't** anidar paneles dentro de una ficha; las variantes son filas con reglas.
- **Don't** inventar fotos ni claims comerciales (no hay imágenes en el repo).
