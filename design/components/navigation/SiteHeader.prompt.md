Header de la tienda: fondo #000 exacto (para que el logo JPG se funda), 80px, logo recortado a la izquierda (56px mobile / 60px desktop), categorías (desktop) o hamburguesa (mobile) a la derecha, space-between.
```jsx
<SiteHeader logoSrc="assets/logo-black.jpg" links={[{label:'Fundas'},{label:'Accesorios'},{label:'Cargadores y cables'},{label:'Nosotros'}]} />
```
- `layout="mobile"` fuerza la hamburguesa (útil en mocks de 390px).
- El menú mobile abre filas de 56px separadas por reglas al 10%.
