Pegá esto en Claude Code, parado en la raíz del repo lafunditamendoza:

---

Leé `design_handoff_nuevos_ingresos/README.md` y la referencia `design_handoff_nuevos_ingresos/reference/NuevosApilado.jsx.txt`.

Implementá la sección "Nuevos ingresos" apilada en la home de `frontend/`, reemplazando la grilla actual de nuevos ingresos:
- Creá un componente cliente `NuevosIngresosApilado` en la carpeta de componentes de la home, con los patrones del proyecto (Tailwind y los tokens existentes).
- Que reciba los 4 productos de fundas más recientes desde la misma fuente de datos que usa hoy la home.
- Respetá exactamente los valores del README: alturas, top sticky, sombras, curvas (easeOutCubic), giro de 360°, canto, sombra de apoyo, línea SVG con stroke-dashoffset y fade del texto.
- Mobile primero. Desktop desde lg.
- Respetá `prefers-reduced-motion`.
- Copiá las imágenes de `design_handoff_nuevos_ingresos/assets/nuevos/` a `frontend/public/` mientras no haya fotos recortadas en la base, y dejá un TODO para tomar `cutoutUrl` y `edgeColor` del producto.
- No agregues dependencias: alcanza con React, `requestAnimationFrame` y CSS 3D.

Cuando termines, mostrame qué archivos cambiaste.
