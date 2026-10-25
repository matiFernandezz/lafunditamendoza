"use client";

import {
  Globe,
  House,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingCart,
  Store,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getWebOrderCounts } from "@/lib/adminApi";
import NavigationProgress from "@/components/NavigationProgress";
import { createClient } from "@/lib/supabase/client";
import AdminLogo from "./AdminLogo";
import ComprasSidebar from "./compras/ComprasSidebar";
import StockSidebar from "./stock/StockSidebar";
import TiendaSidebar from "./tienda/TiendaSidebar";
import VentasSidebar from "./ventas/VentasSidebar";
import { ADMIN_CAP_BASE } from "./adminStyles";

type Tab = { href: string; label: string; icon: LucideIcon };

// El historial de ventas vive en Ventas › Listado; Nuevo producto, en Stock.
const TABS: Tab[] = [
  { href: "/admin", label: "Inicio", icon: House },
  { href: "/admin/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/admin/web", label: "Ventas web", icon: Globe },
  { href: "/admin/compras", label: "Compras", icon: Truck },
  { href: "/admin/stock", label: "Stock", icon: Package },
  { href: "/admin/tienda", label: "Tienda", icon: Store },
];

/** Avisa al shell que cambiaron las reservas web (para refrescar el contador). */
export const WEB_ORDERS_CHANGED = "lf-web-orders-changed";

// El sidebar plegado se recuerda en el navegador. Se lee con
// useSyncExternalStore para que el primer render coincida con el del servidor.
const COLLAPSED_KEY = "lf-admin-sidebar-collapsed";
const COLLAPSED_CHANGED = "lf-admin-sidebar-changed";

function subscribeCollapsed(callback: () => void) {
  window.addEventListener(COLLAPSED_CHANGED, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(COLLAPSED_CHANGED, callback);
    window.removeEventListener("storage", callback);
  };
}

function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed: boolean) {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // Sin almacenamiento (modo privado): el sidebar queda desplegado.
  }
  window.dispatchEvent(new Event(COLLAPSED_CHANGED));
}

// Círculo rojo con las reservas web sin cobrar.
function PendingDot({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} sin cobrar`}
      className={`h-[18px] min-w-[18px] items-center justify-center rounded-full bg-admin-danger px-[5px] text-[11px] font-bold leading-none text-white ${className}`}
    >
      {count}
    </span>
  );
}

const NAV_ITEM =
  "flex h-12 w-full items-center gap-3 rounded-md px-3 text-[15px] font-semibold transition-colors duration-200 lg:h-10 lg:gap-2.5 lg:px-2.5 lg:text-sm";
const NAV_ICON_BUTTON =
  "size-11 shrink-0 items-center justify-center rounded-md text-admin-on-ink/78 transition-colors duration-200 hover:bg-admin-on-ink/10 hover:text-admin-on-ink";

/**
 * Shell del panel: navegación lateral negra. En desktop (lg+) el sidebar queda
 * fijo a la izquierda y se pliega a una columna de íconos; en mobile y tablet
 * es un cajón que se abre con el botón de menú de la barra de arriba.
 * El login no lleva shell: arma su propia pantalla.
 *
 * Ventas, Compras, Stock y Tienda abren un segundo sidebar pegado al principal; el principal se pliega
 * solo para hacerle lugar (se puede volver a desplegar mientras se está ahí).
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [pendingWeb, setPendingWeb] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const storedCollapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  // Secciones con segundo sidebar.
  const subnav = pathname.startsWith("/admin/ventas")
    ? "ventas"
    : pathname.startsWith("/admin/compras")
      ? "compras"
      : pathname.startsWith("/admin/stock")
        ? "stock"
        : pathname.startsWith("/admin/tienda")
          ? "tienda"
          : null;
  const hasSubnav = subnav !== null;
  // Desplegado a mano dentro de Ventas; se olvida al salir de la sección.
  const [mainOpenInSubnav, setMainOpenInSubnav] = useState(false);
  const [prevSubnav, setPrevSubnav] = useState(subnav);
  if (prevSubnav !== subnav) {
    setPrevSubnav(subnav);
    setMainOpenInSubnav(false);
  }
  const collapsed = hasSubnav ? !mainOpenInSubnav : storedCollapsed;

  function toggleCollapsed() {
    if (hasSubnav) setMainOpenInSubnav((open) => !open);
    else writeCollapsed(!storedCollapsed);
  }

  // Se pide al entrar, al cambiar de pantalla y cuando la pestaña Web avisa
  // que marcó o canceló una reserva. Si falla, el contador no se muestra.
  useEffect(() => {
    if (isLogin) return;
    let ignore = false;
    const load = () =>
      getWebOrderCounts()
        .then((res) => {
          if (!ignore) setPendingWeb(res.data.pendiente);
        })
        .catch(() => {});
    load();
    window.addEventListener(WEB_ORDERS_CHANGED, load);
    return () => {
      ignore = true;
      window.removeEventListener(WEB_ORDERS_CHANGED, load);
    };
  }, [isLogin, pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  // Campos numéricos de todo el panel: al entrar se selecciona el contenido
  // (escribir "1" sobre un "0" da 1, no 01) y la rueda del mouse no cambia el
  // valor: suelta el campo y la página se desplaza normal.
  useEffect(() => {
    const isNumberInput = (el: EventTarget | null): el is HTMLInputElement =>
      el instanceof HTMLInputElement && el.type === "number";

    function onFocusIn(e: FocusEvent) {
      const target = e.target;
      // En el próximo frame: el click que da el foco todavía no terminó y
      // ubicaría el cursor, deshaciendo la selección.
      if (isNumberInput(target)) requestAnimationFrame(() => target.select());
    }
    function onWheel() {
      const active = document.activeElement;
      if (isNumberInput(active)) active.blur();
    }

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("wheel", onWheel);
    };
  }, []);

  if (isLogin) return <>{children}</>;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  // Plegado solo aplica en desktop: el cajón de mobile siempre muestra los textos.
  const labelClass = collapsed ? "lg:hidden" : "";
  const itemLayout = collapsed ? "lg:justify-center lg:px-0" : "";

  return (
    <div className="min-h-screen w-full bg-admin-bg lg:flex">
      {/* Mobile / tablet: barra de arriba con el botón que abre el cajón */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-admin-ink pl-1.5 pr-4 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={drawerOpen}
          aria-controls="admin-sidebar"
          className={`relative flex ${NAV_ICON_BUTTON}`}
        >
          <Menu aria-hidden="true" className="size-6" />
          <PendingDot count={pendingWeb} className="absolute right-0.5 top-0.5 inline-flex" />
        </button>
        <AdminLogo size={40} />
      </header>

      {drawerOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/45 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside
        id="admin-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-admin-ink transition-[transform,visibility,width] duration-200 ease-out motion-reduce:transition-none lg:visible lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:shrink-0 lg:translate-x-0 ${
          collapsed ? "lg:w-16" : "lg:w-52"
        } ${drawerOpen ? "visible translate-x-0" : "invisible -translate-x-full"}`}
      >
        {/* Plegado: el logo queda (más chico) con el botón de desplegar al lado. */}
        <div
          className={`flex h-16 shrink-0 items-center justify-between pl-4 pr-2.5 ${
            collapsed ? "lg:h-14 lg:justify-center lg:gap-0.5 lg:px-1" : "lg:h-14 lg:pl-3.5 lg:pr-2"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className={collapsed ? "lg:hidden" : ""}>
              <AdminLogo size={38} />
            </span>
            <span className={collapsed ? "hidden lg:block" : "hidden"}>
              <AdminLogo size={26} />
            </span>
            <span className={`${ADMIN_CAP_BASE} text-admin-on-ink/60 ${labelClass}`}>Panel</span>
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Desplegar menú" : "Plegar menú"}
            title={collapsed ? "Desplegar menú" : "Plegar menú"}
            aria-expanded={!collapsed}
            className={`hidden lg:flex ${NAV_ICON_BUTTON} ${collapsed ? "lg:size-7" : "lg:size-9"}`}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-[18px]" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-[18px]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
            className={`flex lg:hidden ${NAV_ICON_BUTTON}`}
          >
            <X aria-hidden="true" className="size-6" />
          </button>
        </div>

        <nav
          aria-label="Panel"
          className={`flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2 ${collapsed ? "lg:px-2" : "lg:px-2.5"}`}
        >
          {TABS.map((tab) => {
            const current = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
            const pending = tab.href === "/admin/web" ? pendingWeb : 0;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setDrawerOpen(false)}
                aria-current={current ? "page" : undefined}
                title={collapsed ? tab.label : undefined}
                className={`${NAV_ITEM} ${itemLayout} ${
                  current
                    ? "bg-admin-bg text-admin-text"
                    : "text-admin-on-ink/78 hover:bg-admin-on-ink/10 hover:text-admin-on-ink"
                }`}
              >
                <span className="relative flex shrink-0">
                  <tab.icon aria-hidden="true" className="size-5 lg:size-[18px]" />
                  <PendingDot
                    count={pending}
                    className={`absolute -right-2.5 -top-2 hidden ${collapsed ? "lg:inline-flex" : ""}`}
                  />
                </span>
                <span className={`min-w-0 flex-1 truncate ${labelClass}`}>{tab.label}</span>
                <PendingDot count={pending} className={`inline-flex ${labelClass}`} />
              </Link>
            );
          })}
        </nav>

        <div
          className={`shrink-0 border-t border-admin-on-ink/15 px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] ${collapsed ? "lg:px-2" : "lg:px-2.5"}`}
        >
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? "Salir" : undefined}
            className={`${NAV_ITEM} ${itemLayout} text-admin-on-ink/78 hover:bg-admin-on-ink/10 hover:text-admin-on-ink`}
          >
            <LogOut aria-hidden="true" className="size-5 shrink-0 lg:size-[18px]" />
            <span className={labelClass}>Salir</span>
          </button>
        </div>
      </aside>

      {subnav === "ventas" && <VentasSidebar />}
      {subnav === "compras" && <ComprasSidebar />}
      {subnav === "stock" && <StockSidebar />}
      {subnav === "tienda" && <TiendaSidebar />}

      {/* Barrita de progreso arriba de todo: crema sobre el header oscuro del
          celular, tinta sobre el fondo claro en la compu. */}
      <div className="fixed inset-x-0 top-0 z-[60] h-[3px]">
        <NavigationProgress className="bg-admin-on-ink lg:bg-admin-ink" />
      </div>
      <main className="mx-auto w-full min-w-0 max-w-[1440px] flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-5 lg:px-6 lg:pb-18 lg:pt-6 xl:px-8 xl:pt-8">
        {children}
      </main>
    </div>
  );
}
