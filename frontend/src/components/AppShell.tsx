"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { CategoryGroup } from "@/lib/catalog";

type NavLink = { id: string; label: string };

// Categorías reales aplanadas para la nav: las hojas (con productos propios).
// "Fundas" en sí no tiene productos directos, solo sus 3 subcategorías.
function toNavLinks(categories: CategoryGroup[]): NavLink[] {
  return categories.flatMap((group) =>
    group.children.length > 0
      ? group.children.map((c) => ({ id: c.id, label: c.name }))
      : [{ id: group.id, label: group.name }],
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

  return (
    <>
      <header className="sticky top-0 z-20 bg-ink text-paper">
        <div className={`mx-auto flex h-16 w-full items-center justify-between gap-4 ${width}`}>
          <Link href="/" className="flex shrink-0 items-center focus-visible:outline-paper">
            <Image
              src="/logo.jpg"
              alt="La Fundita"
              width={40}
              height={40}
              priority
              className="rounded-lg"
            />
          </Link>

          {!isAdmin && navLinks.length > 0 && (
            <>
              <nav aria-label="Categorías" className="hidden md:flex md:items-center md:gap-7">
                {navLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={`/categoria/${link.id}`}
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
                className="flex h-11 w-11 shrink-0 items-center justify-center focus-visible:outline-paper md:hidden"
              >
                <span className="sr-only">{menuOpen ? "Cerrar menú" : "Abrir menú"}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                  className="size-6"
                >
                  {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
                </svg>
              </button>
            </>
          )}
        </div>

        {!isAdmin && menuOpen && (
          <nav
            id="menu-movil"
            aria-label="Categorías"
            className="border-t border-paper/15 px-5 py-2 md:hidden"
          >
            <ul>
              {navLinks.map((link) => (
                <li key={link.id} className="border-b border-paper/10 last:border-0">
                  <Link
                    href={`/categoria/${link.id}`}
                    className="flex min-h-14 items-center text-base font-semibold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
      <main
        className={`mx-auto w-full flex-1 ${width} ${isAdmin ? "py-6" : "pb-20 pt-8 md:pt-14"}`}
      >
        {children}
      </main>
    </>
  );
}
