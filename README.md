# lafunditamendoza
Sistema de catálogo, stock y ventas para La Fundita

## Cómo está armado

Todo corre en una sola app de Next.js (`/frontend`): la tienda pública, el panel
de administración y la API (`frontend/src/app/api/*`, Route Handlers). La base
de datos, el login y las fotos están en Supabase.

```
navegador ──> Next.js (páginas + /api/*) ──> Supabase (Postgres, Auth, Storage)
```

- **Tienda pública**: lee el catálogo con la anon key; RLS solo deja ver
  productos y variantes activos.
- **Panel (`/admin`)**: cada endpoint de `/api/*` exige sesión de Supabase Auth
  (`requireAdmin`) y habla con la base con la secret key, que nunca sale del
  servidor.
- **Ventas, compras y reservas**: son funciones SQL transaccionales
  (`supabase/migrations`), así nunca queda una operación a medias.
- **Fotos**: el navegador las sube directo a Supabase Storage con una URL
  firmada que entrega la API.

La carpeta `/backend` (Express) ya no se usa: queda solo como respaldo.

## Correr todo en local

Hace falta Node 20+ y Docker Desktop abierto (lo usa Supabase local).

```bash
# 1. Base de datos local (una vez por sesión; deja los datos como estaban)
npx supabase start
npx supabase migration up        # aplica migraciones nuevas, si hay

# 2. Variables de entorno (solo la primera vez)
cd frontend
cp .env.example .env.local       # completar con los valores de `npx supabase status`

# 3. La app completa: tienda, panel y API
npm install
npm run dev
```

Abrir http://localhost:3000 (tienda) y http://localhost:3000/admin (panel).
No hay que levantar nada más.

Variables de `frontend/.env.local`:

| Variable | Qué es | En local (`npx supabase status`) |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase | API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon) | anon key |
| `SUPABASE_SECRET_KEY` | Clave secreta, solo servidor | service_role key |

`SUPABASE_SECRET_KEY` nunca lleva el prefijo `NEXT_PUBLIC_` ni se commitea.

## Pruebas

Con Supabase local y `npm run dev` corriendo, desde `/frontend`:

```bash
npm run test:unificar   # API completa: permisos, ventas, compras, stock, fotos, catálogo
npm run lint
npm run build
```

`test:unificar` solo corre contra Supabase local, crea sus propios datos y los
borra al terminar.

Si `npm run dev` devuelve 500 en todas las páginas con un error de
`next/font/google`, es la caché de Turbopack: borrar `frontend/.next` y volver
a levantar.
