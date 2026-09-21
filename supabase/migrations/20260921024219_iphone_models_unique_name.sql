-- Nombre único en iphone_models: permite que el seed de modelos sea re-aplicable
-- en cualquier entorno (upsert por nombre) sin duplicar filas.

alter table iphone_models
  add constraint iphone_models_name_key unique (name);
