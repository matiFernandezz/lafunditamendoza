import type { NextConfig } from "next";

// Fotos de producto: vienen del bucket de Supabase Storage, cuyo host (y
// puerto, en local) cambia entre local (127.0.0.1:54321) y producción
// (https, sin puerto explícito). Se deriva de la misma env var que ya usa
// el cliente, en vez de hardcodear un dominio. Sin "port", remotePatterns
// solo matchea el puerto default (80/443) y rechaza todo lo demás con 400
// "url parameter is not allowed" -- por eso hace falta explicitarlo.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const parsedSupabaseUrl = supabaseUrl ? new URL(supabaseUrl) : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: parsedSupabaseUrl
      ? [
          {
            protocol: parsedSupabaseUrl.protocol === "https:" ? "https" : "http",
            hostname: parsedSupabaseUrl.hostname,
            port: parsedSupabaseUrl.port,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
    // Next 16 bloquea por default que el optimizador de imagenes pida a IPs
    // privadas (proteccion SSRF). En local, Supabase Storage vive en
    // 127.0.0.1 -- remotePatterns ya restringe el host+puerto exactos, asi
    // que no hay URL arbitraria que explotar. En producción el host es
    // publico (https, sin IP privada) y esta bandera queda inerte.
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;
