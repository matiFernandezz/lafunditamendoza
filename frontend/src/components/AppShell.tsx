"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { CategoryGroup } from "@/lib/catalog";
import { PAGE_PADDING } from "@/lib/layout";
import Logo from "./Logo";
import SiteFooter from "./SiteFooter";
import CartBar from "./store/CartBar";
import HeaderCartLink from "./store/HeaderCartLink";

const NAV_LINK =
  "text-sm font-semibold tracking-wide text-paper/85 transition-colors duration-200 hover:text-paper";
const DROPDOWN_LINK =
  "flex min-h-11 items-center whitespace-nowrap px-5 text-sm font-medium text-paper/85 transition-colors duration-200 hover:bg-paper/10 hover:text-paper";

type NavLink = {
  key: string;
  label: string;
  href: string;
  // Subcategorías (Fundas: de diseño, de silicona, transparentes).
  children?: { key: string; label: string; href: string }[];
};

// Nav real: las categorías de tope tal cual están en la base (Fundas agrupa
// sus subcategorías, no se listan por separado) + Nosotros, fija. Primero
// las que tienen subcategorías (Fundas, lo principal), como en el diseño.
function toNavLinks(categories: CategoryGroup[]): NavLink[] {
  const fromCategories = [...categories]
    .sort((a, b) => Number(b.children.length > 0) - Number(a.children.length > 0))
    .map((group) => ({
      key: group.id,
      label: group.name,
      href: `/categoria/${group.slug}`,
      children: group.children.map((child) => ({
        key: child.id,
        label: child.name,
        href: `/categoria/${child.slug}`,
      })),
    }));
  return [...fromCategories, { key: "nosotros", label: "Nosotros", href: "/nosotros" }];
}

// Header y contenedor del catálogo público: ocupa el 100% del viewport, sin
// max-width, solo con el padding lateral compartido con las secciones a sangre
// de la home. /admin no pasa por acá: tiene su propio shell.
export default function AppShell({
  children,
  categories,
}: {
  children: React.ReactNode;
  categories: CategoryGroup[];
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const width = `w-full ${PAGE_PADDING}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const navLinks = toNavLinks(categories);
  // Desplegable abierto en el menú de desktop (hover o foco).
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Cerrar el menú móvil al cambiar de página: se ajusta durante el render
  // (comparando contra el pathname anterior), no en un efecto.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (menuOpen) setMenuOpen(false);
    if (openKey) setOpenKey(null);
  }

  // El panel arma su propia barra, navegación y contenedor (app/admin/AdminShell).
  if (isAdmin) return <>{children}</>;

  return (
    <>
      <header className="sticky top-0 z-20 bg-black text-paper">
        {/* El header va más adentro que el contenido: page-pad + 12px en
            mobile y clamp(48px, 9vw, 180px) desde md, como en el diseño. */}
        <div className="flex h-20 w-full items-center justify-between gap-4 px-8 md:px-[clamp(48px,9vw,180px)]">
          <Link
            href="/"
            aria-label="La Fundita — inicio"
            className="flex shrink-0 items-center focus-visible:outline-paper"
          >
            <span className="md:hidden">
              <Logo size={56} />
            </span>
            <span className="hidden md:block">
              <Logo size={60} />
            </span>
          </Link>

          <nav aria-label="Categorías" className="hidden md:flex md:items-center md:gap-8">
            {navLinks.map((link) =>
              link.children?.length ? (
                // Con subcategorías: el nombre lleva a todas y el desplegable
                // (hover o foco con teclado) filtra por tipo.
                <div
                  key={link.key}
                  className="relative flex h-20 items-center"
                  onMouseEnter={() => setOpenKey(link.key)}
                  onMouseLeave={() => setOpenKey(null)}
                  onFocus={() => setOpenKey(link.key)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) setOpenKey(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setOpenKey(null);
                  }}
                >
                  <Link
                    href={link.href}
                    aria-haspopup="true"
                    aria-expanded={openKey === link.key}
                    className={`inline-flex items-center gap-1 ${NAV_LINK}`}
                  >
                    {link.label}
                    <ChevronDown
                      aria-hidden="true"
                      className={`size-4 transition-transform duration-200 ${openKey === link.key ? "rotate-180" : ""}`}
                    />
                  </Link>
                  {openKey === link.key && (
                    <ul className="absolute left-1/2 top-full min-w-[220px] -translate-x-1/2 border-t border-paper/15 bg-black py-2 shadow-[0_16px_32px_rgb(0_0_0/0.25)]">
                      <li>
                        <Link href={link.href} className={DROPDOWN_LINK}>
                          Todas las {link.label.toLowerCase()}
                        </Link>
                      </li>
                      {link.children.map((child) => (
                        <li key={child.key}>
                          <Link href={child.href} className={DROPDOWN_LINK}>
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Link key={link.key} href={link.href} className={NAV_LINK}>
                  {link.label}
                </Link>
              ),
            )}
          </nav>

          {/* Carrito siempre a mano; en mobile, al lado del menú. */}
          <div className="flex items-center gap-1">
            <HeaderCartLink />
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
          </div>
        </div>

        {menuOpen && (
          <nav
            id="menu-movil"
            aria-label="Categorías"
            className="border-t border-paper/15 px-5 py-2 md:hidden"
          >
            <ul>
              {navLinks.map((link) => (
                <li key={link.key} className="border-b border-paper/10 last:border-0">
                  <Link
                    href={link.href}
                    className="flex min-h-14 items-center font-display text-title font-semibold tracking-tight"
                  >
                    {link.label}
                  </Link>
                  {link.children && link.children.length > 0 && (
                    <ul className="-mt-1 pb-3">
                      {link.children.map((child) => (
                        <li key={child.key}>
                          <Link href={child.href} className="flex min-h-11 items-center pl-4 text-paper/75">
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
      <main className={`mx-auto w-full flex-1 ${width} pb-24 pt-8 md:pt-14`}>{children}</main>
      <SiteFooter links={navLinks} />
      <CartBar />
    </>
  );
}
