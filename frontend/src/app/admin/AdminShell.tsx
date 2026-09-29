"use client";

import {
  LogOut,
  Package,
  PackagePlus,
  ReceiptText,
  ShoppingCart,
  Truck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_CAP_BASE } from "./adminStyles";

type Tab = { href: string; label: string; long?: string; icon: LucideIcon };

// Mismas solapas y orden que design/ui_kits/admin (sin "Web": ventas web no
// existe todavía). "Nuevo producto" es la pantalla /admin/productos.
const TABS: Tab[] = [
  { href: "/admin/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/admin/historial", label: "Historial", icon: ReceiptText },
  { href: "/admin/compras", label: "Compras", icon: Truck },
  { href: "/admin/productos", label: "Nuevo", long: "Nuevo producto", icon: PackagePlus },
  { href: "/admin/catalogo", label: "Catálogo", icon: Package },
];

/**
 * Shell del panel según el diseño. Desktop (lg+): barra negra de 64px con
 * logo, "Panel", solapas con ícono y "Salir". Mobile y tablet: barra negra de
 * 56px arriba y navegación fija abajo, al alcance del pulgar en la feria.
 * El login no lleva shell: arma su propia pantalla.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/admin/login") return <>{children}</>;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen w-full bg-admin-bg pb-[calc(4rem+env(safe-area-inset-bottom)+1.5rem)] lg:pb-0">
      {/* Desktop */}
      <header className="sticky top-0 z-30 hidden h-16 items-center gap-10 bg-admin-ink px-8 lg:flex">
        <div className="flex items-center gap-3.5">
          <Logo size={50} />
          <span className={`${ADMIN_CAP_BASE} text-white/60`}>Panel</span>
        </div>
        <nav aria-label="Panel" className="flex flex-1 gap-1">
          {TABS.map((tab) => {
            const current = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={`flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors duration-200 ${
                  current ? "bg-white text-black" : "text-white/78 hover:text-white"
                }`}
              >
                <tab.icon aria-hidden="true" className="size-[18px]" />
                {tab.long ?? tab.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-white/78 transition-colors duration-200 hover:text-white"
        >
          <LogOut aria-hidden="true" className="size-[18px]" />
          Salir
        </button>
      </header>

      {/* Mobile / tablet */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-admin-ink pl-4 pr-2 lg:hidden">
        <Logo size={42} />
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="flex size-11 items-center justify-center text-white/78"
        >
          <LogOut aria-hidden="true" className="size-5" />
        </button>
      </header>

      <main className="mx-auto w-full max-w-[1240px] px-4 pb-2 pt-5 lg:px-8 lg:pb-18 lg:pt-8">{children}</main>

      <nav
        aria-label="Panel"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-admin-border bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {TABS.map((tab) => {
          const current = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={current ? "page" : undefined}
              className={`relative flex h-16 flex-col items-center justify-center gap-1 text-xs ${
                current ? "font-bold text-admin-ink" : "font-medium text-admin-muted"
              }`}
            >
              {current && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-[22%] top-0 h-[3px] rounded-b-sm bg-admin-ink"
                />
              )}
              <tab.icon aria-hidden="true" className="size-[22px]" strokeWidth={current ? 2.1 : 1.75} />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
