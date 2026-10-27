-- Carrusel de la portada: diseño libre de cada foto, armado en el editor del
-- panel (Tienda › Carrusel › Editar diseño). Un JSON con el diseño de la
-- computadora y el del celular por separado: encuadre, oscurecido, sombra y
-- los elementos encima (textos, logo, link, rango de modelos) con su posición
-- y tamaño. La forma la valida la API (src/lib/slideLayout.ts).
-- null = el carrusel de antes (tipo + ubicaciones automáticas).
alter table home_slides
  add column layout jsonb check (
    layout is null or (jsonb_typeof(layout) = 'object' and pg_column_size(layout) < 64000)
  );
