-- Conexión con Instagram (API de Instagram con inicio de sesión de Instagram):
-- la clave de acceso de la cuenta, para que Nosotros muestre solos los últimos
-- posts. Una sola fila. La clave dura 60 días y el servidor la renueva antes de
-- que venza. Es secreta: solo la lee el servidor (service_role), nunca la tienda.
create table instagram_connection (
  id smallint primary key default 1 check (id = 1),
  access_token text not null check (btrim(access_token) <> ''),
  username text,
  expires_at timestamptz not null,
  refreshed_at timestamptz not null default now()
);

alter table instagram_connection enable row level security;
grant select, insert, update, delete on instagram_connection to service_role;
