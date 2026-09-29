Selector de modelo de iPhone (select nativo de 56px, borde grafito → tinta en hover); filtro de categoría y "Elegí tu modelo" en el producto.
```jsx
<Select label="Elegí tu iPhone" placeholder="Todos los modelos" options={['iPhone 15','iPhone 15 Pro']} value={m} onChange={setM} />
```
Siempre con label visible. Nativo a propósito: en celular abre el picker del sistema.
