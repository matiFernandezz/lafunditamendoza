"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SubnavSection = {
  href: string;
  label: string;
  hint: string;
  count?: number;
  /** Además de su href exacto, queda marcada en estas rutas (p. ej. el detalle de un pedido). */
  matchPrefix?: string;
};

export function isSectionCurrent(section: SubnavSection, pathname: string) {
  return pathname === section.href || (section.matchPrefix !== undefined && pathname.startsWith(section.matchPrefix));
}

/**
 * Segundo sidebar de una sección del panel (solo desktop): se abre pegado al
 * principal, que se pliega a íconos. Título, secciones, un bloque opcional
 * debajo y una tarjeta al pie.
 */
export default function SubnavSidebar({
  title,
  subtitle,
  sections,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  sections: SubnavSection[];
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <aside
      aria-label={`Secciones de ${title}`}
      className="hidden lg:sticky lg:top-0 lg:z-20 lg:flex lg:h-screen lg:w-[208px] lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-r lg:border-admin-border lg:bg-admin-surface lg:px-2.5 lg:pb-3 lg:pt-5 motion-safe:lg:animate-[lf-subnav-in_200ms_cubic-bezier(0.22,1,0.36,1)]"
    >
      <div className="px-2.5 pb-4">
        <p className="font-display text-xl font-semibold text-admin-text">{title}</p>
        <p className="text-[13px] text-admin-muted">{subtitle}</p>
      </div>

      <nav aria-label={title} className="flex flex-col gap-1">
        {sections.map((section) => {
          const current = isSectionCurrent(section, pathname);
          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={current ? "page" : undefined}
              className={`flex items-start justify-between gap-2 rounded-md border-l-[3px] px-2.5 py-2 transition-colors duration-200 ${
                current ? "border-admin-ink bg-admin-bg" : "border-transparent hover:bg-admin-bg"
              }`}
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-admin-text">{section.label}</span>
                <span className="block text-[12px] text-admin-muted">{section.hint}</span>
              </span>
              {section.count !== undefined && section.count > 0 && (
                <span className="mt-0.5 rounded-full bg-admin-bg px-2 py-0.5 font-mono text-xs font-semibold text-admin-text">
                  {section.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {children}

      {footer && <div className="mt-auto pt-4">{footer}</div>}
    </aside>
  );
}

/** Pestañas de las secciones en mobile y tablet (el sidebar es solo desktop). */
export function SubnavTabs({ title, sections }: { title: string; sections: SubnavSection[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label={title} className="-mx-4 flex gap-1 overflow-x-auto border-b border-admin-border px-4 lg:hidden">
      {sections.map((section) => {
        const current = isSectionCurrent(section, pathname);
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={current ? "page" : undefined}
            className={`-mb-px flex h-12 shrink-0 items-center border-b-2 px-4 text-[15px] font-semibold transition-colors duration-200 ${
              current ? "border-admin-ink text-admin-text" : "border-transparent text-admin-muted hover:text-admin-text"
            }`}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
