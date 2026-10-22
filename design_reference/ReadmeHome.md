# Handoff: "Nuevos ingresos" apilado con teléfono que gira

## Overview
Sección de la **home** de La Fundita (lafunditamendoza). Muestra las 4 últimas fundas como paneles que se **apilan** al hacer scroll. Cada panel nuevo sube y se apoya sobre el anterior, que queda debajo con una sombra suave. Mientras el panel entra, el teléfono con la funda **da una vuelta completa (360°)** y una **línea negra fina** se va dibujando, como si siguiera el giro. Cuando el panel queda apoyado aparecen el nombre, la descripción y el precio.

Va en la home, debajo de "Elegí por categoría". Reemplaza la grilla actual de "Nuevos ingresos".

## About the Design Files
Los archivos de `reference/` son **referencias de diseño hechas en HTML/React con Babel en el navegador**: prototipos que muestran el aspecto y el comportamiento buscados. **No es código de producción para copiar tal cual.** Hay que **recrear la sección en el código real** (`frontend/`, Next.js + React + Tailwind) siguiendo sus patrones: un componente cliente (`"use client"`), clases de Tailwind o estilos del proyecto y datos reales de la API de productos.

## Fidelity
**Alta fidelidad.** Colores, tipografías, tamaños, sombras y curvas de animación son los finales. Hay que recrearla igual.

## Layout

### Estructura
```
<section aria-label="Nuevos ingresos">
  <header>  h2 "Nuevos ingresos"  ·  "04 fundas" (mono, gris)
  <div>     (contenedor relativo)
    <article sticky> panel 1 (Cherry Case)
    <article sticky> panel 2 (Chessy Case)
    <article sticky> panel 3 (MagCase)
    <article sticky> panel 4 (Smoky Case) + link "Descubrí todas las fundas"
```

### Panel (article)
- `position: sticky`. `top = header-h + i × step`, donde **header-h = 80px**, **step = 10px en mobile y 14px en desktop**. Cada panel queda unos píxeles más abajo que el anterior y se ve el borde del de atrás, como un mazo de cartas.
- **Alto:** `100svh − 80px − (n−1)×step` (desktop: `100vh`).
- **Separación con el panel anterior:** `margin-top` de 18svh en mobile y 22vh en desktop, salvo el primero. Es el recorrido de scroll en el que el panel sube.
- **Fondo:** `#fafaf8` (--paper), el mismo de la página. **No son cards de colores**: se distinguen solo por la sombra y un borde superior.
- **Borde superior:** `1px solid #e5e3dd` (--rule).
- **Sombra (desde el panel 2):** `0 -18px 40px -12px rgb(18 18 18 / .16)`. Va hacia arriba y cae sobre el panel de abajo.
- `overflow: hidden`, `transform-origin: 50% 0`.
- **Sin radios.** La marca usa rectángulos simples.

### Contenido del panel
**Mobile (diseñar primero esta):** columna con `justify-content: space-between` y padding `28px 20px 24px`.
1. Teléfono centrado arriba, de alto `min(40svh, 340px)` y `aspect-ratio: 0.5`.
2. Bloque de texto abajo.

**Desktop (≥1024px):** grilla de 2 columnas iguales con gap de 48px y padding horizontal de --page-pad. Texto a la izquierda y teléfono a la derecha, centrado y corrido +8% en X. El teléfono mide `min(62vh, 480px)` de alto.

### Bloque de texto
- **Etiqueta:** `01 / 04 · Transparentes`. IBM Plex Sans, 12px, peso 600, tracking .1em, mayúsculas, color #6b6b68.
- **Nombre (h3):** Space Grotesk 600, lh .95, tracking −.03em, #121212. 40px en mobile y `clamp(3rem, 5.6vw, 6rem)` en desktop.
- **Descripción** (si existe): IBM Plex Sans 400, 15px (desktop 18px), lh 1.5, #6b6b68, ancho máximo 32ch, `text-wrap: pretty`.
- **Fila de precio:** gap de 24px.
  - Precio: IBM Plex Mono, 18px (desktop 22px), #121212, en formato `$ 18.500` (es-AR, ARS, sin decimales).
  - Link **"Ver funda →"** con el estilo de la etiqueta en #121212 y alto mínimo de 44px. Lleva a `/productos/[slug]`.
- **Solo en el último panel:** link **"Descubrí todas las fundas →"**, con el mismo estilo, separado por `border-top 1px #e5e3dd` y `padding-top 12px`. Lleva a `/fundas` o a la categoría de fundas.

## Interactions & Behavior

### Progreso por panel
Por cada panel `i > 0`, en cada frame de scroll (con `requestAnimationFrame`, listener `passive`):
```
stick = 80 + i*step
h     = innerHeight - stick
p[i]  = clamp(1 - (article.top - stick) / (h*0.9), 0, 1)   // 0 = entrando por abajo · 1 = ya pegado
e     = easeOutCubic(p[i]) = 1 - (1-p)^3
```
El panel 0 empieza con `p = 1`, de frente y quieto. `cover` es el progreso del panel siguiente (`easeOutCubic(p[i+1])`).

### Teléfono que gira
- `rotateY = (1 − e) × 360° + base`. La base es −6° en mobile y −10° en desktop, una inclinación leve para que se vea en 3D. Entra girado 360° y termina de frente.
- **Elevación:** `lift = sin((1 − e) × π)`. Arriba de la rotación se aplica `translateY(−lift × 16px)` y `scale(1 − lift × .05)`.
- El contenedor tiene `perspective` de 1100px en mobile y 1600px en desktop, y el interior `transform-style: preserve-3d`.
- **Caras:** la misma foto recortada al frente (`translateZ(4px)`) y atrás (`rotateY(180deg) translateZ(4px)`, `brightness(.9)`), con `backface-visibility: hidden` en las dos. Además se muestra **solo la que mira al frente** según `cos(rotY) < 0`, porque Safari a veces ignora `backface-visibility`.
- **Canto:** dos tiras de 8px de ancho, del 7% al 93% del alto, ubicadas en left y right −4px con `rotateY(90deg)` y radio de 4px. Su color es el del marco de cada funda (`edge`) con `brightness(.85)`. Se ven cuando el teléfono está de perfil.
- **Sombra de apoyo:** elipse debajo del teléfono, del 6% al 94% del ancho, en `bottom −5%` y de 5% de alto, con `rgb(18 18 18 / .28)` y `blur(10px)`. Se achica con `scaleX(1 − lift × .5)` y baja con `opacity 1 − lift × .6` mientras el teléfono está levantado.

### Línea que sigue el giro
- Un SVG que cubre todo el panel, con `viewBox 0 0 100 100`, `preserveAspectRatio="none"` y `pointer-events: none`, detrás del teléfono y del texto (z-index menor).
- El path tiene `pathLength="1"`, `stroke #121212`, `stroke-width 1.25` con `vector-effect: non-scaling-stroke` y `stroke-linecap round`.
- Se dibuja con `stroke-dasharray: 1` y `stroke-dashoffset: 1 − e`, así la línea se completa justo cuando el panel queda apoyado.
- Recorridos (baja desde arriba, rodea el teléfono y termina en su base):
  - **Mobile:** `M 50 0 C 50 7 10 5 10 20 C 10 36 92 24 90 41 C 88 52 64 55 50 54`
  - **Desktop:** `M 70 0 C 70 10 44 6 44 28 C 44 54 99 40 97 64 C 95 84 80 90 70 90`

### Panel de abajo (cuando el siguiente lo tapa)
- `transform: scale(1 − cover × .05)`: se achica hasta un 5%.
- Encima se le pone un velo `#121212` con `opacity: cover × .14`, que oscurece un poco lo que queda abajo.

### Texto
`opacity = clamp((e − .55) / .45, 0, 1)` y `translateY((1 − e) × 24px)`. Aparece en el último tramo, cuando el teléfono ya casi terminó de girar.

### Accesibilidad
- Con `prefers-reduced-motion: reduce` se usa `e = 1` y `cover = 0`: no hay giro, ni escala, ni línea animada. Los paneles se apilan igual.
- El wrapper del teléfono lleva `role="img"` y `aria-label` con el nombre de la funda, y cada article su `aria-label`.
- Todos los links tienen un área táctil de 44px o más.

## State Management
- `p: number[]`, el progreso de cada panel, que se recalcula en scroll y resize.
- No hay fetch propio: recibe `products` (los 4 más recientes de la categoría fundas, ordenados por fecha de alta descendente).
- **Datos por producto:** `id/slug`, `name`, `category`, `description`, `price`, `cutoutUrl` (PNG con fondo transparente) y `edgeColor` (hex del marco).
  - Si en la base no está la foto recortada ni el color del canto, se pueden cargar a mano en el admin o calcular al subir la foto (ver Assets).

## Design Tokens
- **Colores:**
  - paper `#fafaf8` (fondo)
  - ink `#121212` (texto y línea)
  - graphite `#6b6b68` (texto secundario)
  - rule `#e5e3dd` (bordes)
- **Tipografías:**
  - Space Grotesk 600 para el nombre y el título de la sección.
  - IBM Plex Sans 400/600 para el texto.
  - IBM Plex Mono 400 para los precios.
- **Título de la sección:** 30px en mobile y `clamp(1.875rem, 6vw, 2.25rem)` en desktop, tracking −.025em.
- **Espaciado:**
  - page-pad 20px en mobile y 40px en desktop.
  - Gap de 20px entre el título y la pila (28px en desktop).
  - Header de 80px.
- **Sombras:**
  - Panel: `0 -18px 40px -12px rgb(18 18 18/.16)`.
  - Teléfono: elipse con `blur(10px)` y `rgb(18 18 18/.28)`.
- **Easing:** easeOutCubic. Todo va atado al scroll, sin duraciones fijas.

## Assets
`assets/nuevos/`: `cherry.png`, `chessy.png`, `magcase.png`, `smoky.png`. Son PNG con fondo transparente, recortados al contorno de la funda (relación ≈ 0.5). Salen de las fotos originales de 400×480 con fondo #fafaf8, recortado con un relleno desde los bordes (tolerancia 14).
- **Las fotos son chicas** (unos 370 px de alto). Para producción conviene usar fotos de 1200 px de alto o más, mismo encuadre y fondo liso, o PNG ya sin fondo.
- **Color de canto usado:** cherry `#716c63`, chessy `#121212`, magcase `#723f4b`, smoky `#716561`.

## Files
- `reference/NuevosApilado.jsx.txt`: la implementación de referencia completa, unas 120 líneas.
- `reference/NuevosIngresos.jsx.txt`: la versión alternativa, con el teléfono fijo y el texto cambiando al costado, por si se quiere comparar.
- `reference/HomeScreen.jsx.txt`: muestra dónde se monta la sección y cómo se arma la lista `nuevos` con `cut` y `edge`.
- `reference/styles/`: los tokens CSS del sistema de diseño.

En el proyecto de diseño, el prototipo navegable es `ui_kits/storefront/index.html` (mobile) y `desktop.html`. Desde el panel de ajustes se elige Nuevos ingresos → Apilado.
