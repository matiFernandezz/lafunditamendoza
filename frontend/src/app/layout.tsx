import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import AppShell from "@/components/AppShell";
import { getCategoryGroups, type CategoryGroup } from "@/lib/catalog";
import "./globals.css";

// Tipografías del sistema de diseño (design/tokens/fonts.css), servidas por
// next/font en vez del @import de Google Fonts: sin salto de texto al cargar.
// Space Grotesk: títulos y números de modelo.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Plex Sans: texto de apoyo. El 700 no lo pide el diseño, pero el admin usa
// font-bold y sin cargarlo el navegador lo simularía.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// Plex Mono: precios, SKU y contadores.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "La Fundita",
  description: "Fundas y accesorios para tu iPhone. Elegí tu modelo y mirá lo que hay en stock.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // La nav del header necesita las categorías reales en todas las páginas
  // (incluida /admin, que las ignora). Si falla, el header queda sin links
  // de categoría en vez de tirar abajo el layout entero.
  let categories: CategoryGroup[] = [];
  try {
    categories = await getCategoryGroups();
  } catch {
    categories = [];
  }

  return (
    <html
      lang="es"
      className={`${spaceGrotesk.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell categories={categories}>{children}</AppShell>
      </body>
    </html>
  );
}
