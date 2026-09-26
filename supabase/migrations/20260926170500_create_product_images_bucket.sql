-- Bucket publico para las fotos de producto. "public = true" habilita la URL
-- publica de lectura (/storage/v1/object/public/...) sin pasar por RLS.
-- La escritura (subida/reemplazo) solo la hace el backend con service_role,
-- que bypasea RLS igual que en el resto del sistema -- por eso no hace falta
-- una policy de insert/update para ningun rol: sin una que lo permita,
-- anon/authenticated no pueden escribir.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product-images: lectura publica"
  on storage.objects for select
  to public
  using (bucket_id = 'product-images');
