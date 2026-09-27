import type { NextConfig } from "next";

// Fotos de producto: vienen del bucket de Supabase Storage, cuyo host
// cambia entre local (127.0.0.1) y producción. Se deriva de la misma env
// var que ya usa el cliente, en vez de hardcodear un dominio.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: supabaseHostname === "127.0.0.1" ? "http" : "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
