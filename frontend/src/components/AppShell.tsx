"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Header y contenedor compartidos. /admin usa un ancho generoso (hasta 1400px, centrado) para
// que ventas aproveche la pantalla; las pantallas de formularios se acotan solas.
// El catálogo público usa uno más angosto.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const isAdmin = usePathname().startsWith("/admin");
  const width = isAdmin ? "max-w-[1400px] px-4 md:px-6" : "max-w-5xl px-5 md:px-8";

  return (
    <>
      <header className="sticky top-0 z-10 bg-ink text-paper">
        <div className={`mx-auto flex h-14 w-full items-center ${width}`}>
          <Link
            href="/"
            className="flex h-11 items-center font-display text-lg font-semibold tracking-tight focus-visible:outline-paper"
          >
            La Fundita
          </Link>
        </div>
      </header>
      <main
        className={`mx-auto w-full flex-1 ${width} ${isAdmin ? "py-6" : "pb-20 pt-8 md:pt-14"}`}
      >
        {children}
      </main>
    </>
  );
}
