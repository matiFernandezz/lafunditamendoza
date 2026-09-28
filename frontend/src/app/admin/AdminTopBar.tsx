"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Historial al lado de Ventas: en la feria son las dos que se usan desde el
// celular, así que quedan siempre a la vista sin scrollear las solapas.
const LINKS = [
  { href: "/admin/ventas", label: "Ventas" },
  { href: "/admin/historial", label: "Historial" },
  { href: "/admin/compras", label: "Compras" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/catalogo", label: "Catálogo" },
];

export default function AdminTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const tabsRef = useRef<HTMLDivElement>(null);

  // A 375px las 5 solapas no entran: scroll horizontal, y al cambiar de
  // pantalla se centra la activa para que nunca quede tapada o cortada.
  useEffect(() => {
    const tabs = tabsRef.current;
    const active = tabs?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!tabs || !active) return;
    tabs.scrollLeft = active.offsetLeft - (tabs.clientWidth - active.offsetWidth) / 2;
  }, [pathname]);

  if (pathname === "/admin/login") return null;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <nav
      aria-label="Panel"
      className="flex items-center justify-between gap-2 border-b border-admin-border pb-4"
    >
      <div ref={tabsRef} className="relative -mx-1 flex gap-0.5 overflow-x-auto px-1 sm:gap-1">
        {LINKS.map((link) => {
          const current = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={current ? "page" : undefined}
              className={`flex h-10 shrink-0 items-center rounded-md px-2.5 text-[13px] font-semibold transition-colors sm:px-4 sm:text-sm ${
                current ? "bg-black text-white" : "text-admin-text hover:bg-admin-bg"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <button
        type="button"
        onClick={handleLogout}
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-md text-sm font-semibold text-admin-muted transition-colors hover:bg-admin-bg hover:text-admin-text sm:w-auto sm:px-3"
      >
        <LogOut aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">Salir</span>
      </button>
    </nav>
  );
}
