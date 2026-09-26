"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { CategoryGroup } from "@/lib/catalog";

type NavLink = { key: string; label: string; href: string };

// Nav real: las 3 categorías de tope tal cual están en la base (Fundas
// agrupa sus 3 subcategorías, no se listan por separado) + Nosotros, fija.
function toNavLinks(categories: CategoryGroup[]): NavLink[] {
  const fromCategories = categories.map((group) => ({
    key: group.id,
    label: group.name,
    href: `/categoria/${group.id}`,
  }));
  return [...fromCategories, { key: "nosotros", label: "Nosotros", href: "/nosotros" }];
}

// El isotipo se recrea en texto (no como imagen) para que el fondo siempre
// coincida exactamente con el del header, sin recuadro ni borde de logo.
function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-black tracking-tight ${className}`}>
      La <em className="italic">fun</em> dita.
    </span>
  );
}

// Header y contenedor compartidos. /admin usa un ancho generoso (hasta 1400px, centrado) para
// que ventas aproveche la pantalla; las pantallas de formularios se acotan solas.
// El catálogo público usa uno más angosto.
export default function AppShell({
  children,
  categories,
}: {
  children: React.ReactNode;
  categories: CategoryGroup[];
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const width = isAdmin ? "max-w-[1400px] px-4 md:px-6" : "max-w-5xl px-5 md:px-8";
  const [menuOpen, setMenuOpen] = useState(false);
  const navLinks = toNavLinks(categories);

  // Cerrar el menú móvil al cambiar de página: se ajusta durante el render
  // (comparando contra el pathname anterior), no en un efecto.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (menuOpen) setMenuOpen(false);
  }

  if (isAdmin) {
    return (
      <>
        <header className="sticky top-0 z-20 bg-ink text-paper">
          <div className={`mx-auto flex h-14 w-full items-center ${width}`}>
            <Link href="/" className="flex h-11 items-center focus-visible:outline-paper">
              <Wordmark className="text-lg leading-none" />
            </Link>
          </div>
        </header>
        <main className={`mx-auto w-full flex-1 ${width} py-6`}>{children}</main>
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-20 bg-ink text-paper">
        <div className={`mx-auto flex w-full flex-col items-center gap-3 py-4 md:py-6 ${width}`}>
          <Link href="/" className="focus-visible:outline-paper">
            <Wordmark className="text-2xl leading-none md:text-3xl" />
          </Link>

          <nav aria-label="Categorías" className="hidden md:flex md:items-center md:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="text-sm font-semibold tracking-wide text-paper/85 transition-colors duration-200 hover:text-paper"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="menu-movil"
            className="flex h-11 items-center gap-2 text-sm font-semibold tracking-wide text-paper/85 focus-visible:outline-paper md:hidden"
          >
            {menuOpen ? "Cerrar" : "Menú"}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
              className="size-4"
            >
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <nav
            id="menu-movil"
            aria-label="Categorías"
            className="border-t border-paper/15 px-5 py-2 text-center md:hidden"
          >
            <ul>
              {navLinks.map((link) => (
                <li key={link.key} className="border-b border-paper/10 last:border-0">
                  <Link href={link.href} className="flex min-h-14 items-center justify-center text-base font-semibold">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
      <main
        className={`mx-auto w-full flex-1 ${width} pb-20 pt-8 md:pt-14`}
      >
        {children}
      </main>
    </>
  );
}
