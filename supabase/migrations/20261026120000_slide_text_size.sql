-- Carrusel de la portada (panel › Tienda › Carrusel):
--   text_size: tamaño del texto de cada foto, chico, mediano o grande (los
--     mismos para todos los tipos). null = automático (el de siempre:
--     "iPhone 11 → 18 Pro Max" grande, un titular mediano, uno con etiqueta chico).
--   subtitle: la bajada del rango de modelos ("Fundas y accesorios para tu
--     iPhone…"). Para el rango, label es el "desde" y title el "hasta"; vacíos,
--     se usa el texto de siempre.
--   text_position: dónde va el texto, "arriba-izquierda" … "abajo-derecha".
--     null = automático (el rango abajo, el resto arriba, a la izquierda).
--   logo_position: dónde va el logo de la marca, como text_position. null =
--     sin logo (en el tipo "logo", abajo a la izquierda).
--   position_mobile: encuadre de la foto en el celular (object-position, como
--     position). null = el mismo que en computadora.
alter table home_slides
  add column text_size text check (text_size in ('chico', 'mediano', 'grande')),
  add column subtitle text check (subtitle is null or char_length(subtitle) <= 200),
  add column text_position text check (text_position ~ '^(arriba|centro|abajo)-(izquierda|centro|derecha)$'),
  add column logo_position text check (logo_position ~ '^(arriba|centro|abajo)-(izquierda|centro|derecha)$'),
  add column position_mobile text check (position_mobile is null or char_length(position_mobile) <= 40);
