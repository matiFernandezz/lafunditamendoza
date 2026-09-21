---
version: 1
slug: "frontend-src-app-page-tsx"
primary_target: "frontend/src/app/page.tsx"
related_targets: ["frontend/src/app/categoria/[id]/page.tsx"]
---

## Scope and mode
Catálogo público (home, /categoria/*, filtro de modelo). Modo: Operate ligero (encontrar la funda de mi modelo). /admin fuera de alcance.

## Direction contract

THESIS: El catálogo es una ficha técnica de un objeto: la forma del iPhone (radio ~28px) y el rango real "iPhone 11 → 17 Pro Max" como protagonista tipográfico. Rechaza el hero de marketing y las cards con sombra suave.

OWN-WORLD: Papel #FAFAF8, tinta #121212, grafito #6B6B68, regla #E5E3DD; nada más. Space Grotesk (display), IBM Plex Sans (cuerpo), IBM Plex Mono (precios, SKU, modelos). Sin sombras: borde de 1px y hover que invierte a tinta. Radio 28px en contenedores (tarjetas, mosaicos), 16px en controles (select, botones).

STORY: El visitante entiende en un vistazo qué modelos cubrimos, elige categoría y ve variantes con precio/stock/SKU claros.

FIRST VIEWPORT: h1 "iPhone 11 →" / "17 Pro Max" a 6rem máx., alineado a la izquierda; en desktop, texto de apoyo a la derecha abajo. Justo debajo, mosaicos 4/5 de categorías, ya visibles en mobile. Animación única: las dos líneas suben desde una máscara y la flecha se dibuja al cargar.

FORM: Brief fijado por el usuario, sin sorteo (sin seed key). Lista tipográfica + mosaicos + fichas de variantes.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
