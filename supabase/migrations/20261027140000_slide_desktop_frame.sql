-- El editor del carrusel pasa a dibujar la compu como un carrusel de 1920 x 818
-- (lo que ocupa en una pantalla de 1920 x 1080, sin el navegador, el header y
-- la barra de avisos) en vez de 1440 x 791, que era menos apaisado.
--
-- Los tamaños se guardan en % del ancho: para que los diseños ya hechos se vean
-- igual de grandes respecto del alto, se achican en la misma proporción
-- (1440/791) / (1920/818). Las posiciones (en % de la foto) no cambian.

update home_slides s
set layout = jsonb_set(
  s.layout,
  '{desktop,elements}',
  (
    select coalesce(jsonb_agg(
      case when e ? 'w'
        then jsonb_set(e, '{w}', to_jsonb(round((e->>'w')::numeric * 0.7756, 3)))
        else e
      end
      || jsonb_build_object('size', round((e->>'size')::numeric * 0.7756, 3))
      order by ord
    ), '[]'::jsonb)
    from jsonb_array_elements(s.layout->'desktop'->'elements') with ordinality as t(e, ord)
  )
)
where s.layout is not null
  and jsonb_typeof(s.layout->'desktop'->'elements') = 'array';
