# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Personas que buscan una funda o accesorio para su iPhone, casi siempre desde el celular. Llegan sabiendo su modelo (iPhone 11 a 17 Pro Max) y quieren ver rápido qué hay en stock y a qué precio. (Inferido del brief.)

## Product Purpose
La Fundita vende fundas y accesorios de iPhone: fundas de silicona, fundas de diseño, vidrios templados, cargadores, cables, fundas para cargador y protectores de cámara. El catálogo público muestra categorías, productos, variantes por modelo y color, precio y stock. Éxito: que el visitante encuentre su modelo y vea lo disponible sin fricción.

## Positioning
El catálogo está organizado por modelo de iPhone, de iPhone 11 a 17 Pro Max, y muestra el stock real de cada variante.

## Capabilities and Constraints
- Stack existente: Next.js 16 App Router, Tailwind v4, Supabase (lectura pública con anon key, solo productos/variantes activos y con stock).
- Las variantes se ordenan por precio; se filtra por modelo con `?modelo=`.
- Aún no hay fotos de producto ni imagen de logo en el repo. No inventar imágenes ni claims comerciales.
- Todo lo bajo /admin es una herramienta interna (Operate): prioriza velocidad, no se rediseña.

## Brand Commitments
- El logo de la marca es blanco y negro.
- Dirección visual fijada por el usuario: fondo #FAFAF8, tinta #121212, grafito #6B6B68, reglas #E5E3DD; Space Grotesk (títulos), IBM Plex Sans (cuerpo), IBM Plex Mono (precios, SKUs, specs); tarjetas con radio de iPhone (~28px); hero tipográfico "iPhone 11 → 17 Pro Max".
- Evitar: fondo crema, labels en mayúsculas con tracking, eyebrows, sombras suaves idénticas, un único acento terracota, fade-ins repetidos al scrollear.

## Evidence on Hand
Sin testimonios, métricas ni fotos de producto. Los datos de catálogo salen de Supabase.

## Product Principles
1. Lo primero es el modelo del iPhone: todo ayuda a llegar a "lo que le sirve a mi teléfono".
2. Datos como ficha técnica: precio, SKU y stock claros y comparables.
3. Rápido en el celular: objetivos táctiles grandes, poco scroll, sin decoración que compita con el contenido.
4. Solo se muestra lo real: nada de claims ni imágenes inventadas.

## Accessibility & Inclusion
Contraste AA mínimo, foco visible, `prefers-reduced-motion` respetado.
