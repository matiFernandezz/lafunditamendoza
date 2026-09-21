import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requireEnv } from "@/lib/requireEnv";

const url = requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
const anonKey = requireEnv(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
);

const PUBLIC_ADMIN_PATHS = ["/admin/login"];

// Se llama "Proxy" (antes "Middleware") desde Next.js 16; misma función.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getClaims() verifica el JWT localmente (sin ir al servidor de Auth) y
  // de paso refresca la sesión si el access token venció.
  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && !!data?.claims;

  const { pathname } = request.nextUrl;
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.includes(pathname);

  if (!isPublicAdminPath && !isAuthenticated) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (isPublicAdminPath && isAuthenticated) {
    return NextResponse.redirect(new URL("/admin/ventas", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
