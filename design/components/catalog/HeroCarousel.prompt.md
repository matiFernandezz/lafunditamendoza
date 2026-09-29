Render central de la home: carrusel a sangre. Orden fijo: 1) "iPhone 11 → 18 Pro Max" en tinta sobre fondo claro con los números de línea 11…18 en contorno (sin foto), 2) Fundas con diseño para vos, 3) Tu iPhone, pero más vos, 4) logo abajo a la izquierda. Crossfade 700ms cada 6s; flechas a los costados, centradas verticalmente, contador abajo a la derecha.
```jsx
<HeroCarousel aspect="4/5" slides={[
  { src:'assets/photos/marble-cases.jpg', dim:.55, content:<img src="assets/logo-transparent.png" /> },
  { background:'var(--paper)', tone:'light', content:<RangeHero to="18 Pro Max" animate={false} /> },
  { src:'assets/photos/coleccion-flatlay-a.jpg', content:<h1>Tu iPhone, pero más vos.</h1> },
]} />
```
- `tone:'light'` pasa contador y flechas a tinta en slides claros.
- `dim` oscurece la foto (0.5–0.6) cuando lleva logo o texto encima; nunca cápsulas detrás del texto.
