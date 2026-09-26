import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import AppShell from "@/components/AppShell";
import { getCategoryGroups, type CategoryGroup } from "@/lib/catalog";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

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
      className={`${archivo.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell categories={categories}>{children}</AppShell>
      </body>
    </html>
  );
}
