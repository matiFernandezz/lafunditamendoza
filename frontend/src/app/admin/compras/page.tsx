"use client";

import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getPurchases, type PurchaseStatus, type PurchaseSummary } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import AdminNotice from "../AdminNotice";
import { ADMIN_EMPTY, ADMIN_PAGE_SUBTITLE, ADMIN_PAGE_TITLE, adminBadge, adminButton } from "../adminStyles";
import { presetRange } from "../periods";
import StatCard from "../StatCard";
import { startNavigationProgress } from "@/components/NavigationProgress";
import {
  PURCHASE_STEPS,
  PURCHASES_CHANGED,
  STATUS_BADGE,
  STATUS_LABEL,
  formatDay,
  pendingPurchases,
  purchaseTotal,
} from "./purchaseStatus";
import AdminLoading from "../AdminLoading";

type Filter = "todos" | PurchaseStatus;

function isFilter(value: string | null): value is Filter {
  return value === "todos" || PURCHASE_STEPS.some((s) => s.status === value);
}

function unitsLabel(units: number) {
  return units === 1 ? "1 unidad" : `${units} unidades`;
}

/** Pedidos a proveedores: lo que está en tránsito, lo pagado en el mes y la lista por estado. */
function PedidosList() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("estado");
  const [filter, setFilter] = useState<Filter>(isFilter(initial) ? initial : "todos");
  const [purchases, setPurchases] = useState<PurchaseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  // El sidebar linkea a ?estado=…: si cambia estando acá, se sigue.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    if (isFilter(initial)) setFilter(initial);
  }

  useEffect(() => {
    let ignore = false;
    getPurchases()
      .then((res) => {
        if (!ignore) {
          setPurchases(res.data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : "No se pudieron cargar los pedidos.");
      });
    const onChange = () => setReload((n) => n + 1);
    window.addEventListener(PURCHASES_CHANGED, onChange);
    return () => {
      ignore = true;
      window.removeEventListener(PURCHASES_CHANGED, onChange);
    };
  }, [reload]);

  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className={ADMIN_PAGE_TITLE}>Pedidos</h1>
        <p className={ADMIN_PAGE_SUBTITLE}>Lo que se le compró a cada proveedor y en qué estado está.</p>
      </div>
      <Link href="/admin/compras/nuevo" className={adminButton("primary")}>
        <Plus aria-hidden="true" className="size-5" />
        Nuevo pedido
      </Link>
    </div>
  );

  if (error) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <div className="flex flex-col items-center gap-4 py-6">
          <AdminNotice kind="danger">{error}</AdminNotice>
          <button type="button" onClick={() => setReload((n) => n + 1)} className={adminButton("primary")}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!purchases) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <AdminLoading />
      </div>
    );
  }

  const pending = pendingPurchases(purchases);
  const building = purchases.filter((p) => p.status === "armando");
  const month = presetRange("month", new Date());
  const paidThisMonth = purchases.filter(
    (p) => p.paid_at && new Date(p.paid_at) >= month.from && new Date(p.paid_at) < month.to,
  );
  const monthName = new Intl.DateTimeFormat("es-AR", { month: "long" }).format(month.from);
  const visible = filter === "todos" ? purchases : purchases.filter((p) => p.status === filter);
  const counts = (status: PurchaseStatus) => purchases.filter((p) => p.status === status).length;

  function selectFilter(next: Filter) {
    setFilter(next);
    startNavigationProgress();
    router.replace(next === "todos" ? "/admin/compras" : `/admin/compras?estado=${next}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-5">
      {header}

      <section aria-label="Resumen" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Por recibir" value={formatPrice(pending.reduce((sum, p) => sum + purchaseTotal(p), 0))}>
          <span>
            {pending.length === 1 ? "1 pedido pagado" : `${pending.length} pedidos pagados`} ·{" "}
            {unitsLabel(pending.reduce((sum, p) => sum + p.units, 0))}
          </span>
        </StatCard>
        <StatCard
          label={`Pagado en ${monthName}`}
          value={formatPrice(paidThisMonth.reduce((sum, p) => sum + purchaseTotal(p), 0))}
        >
          <span>{paidThisMonth.length === 1 ? "1 pedido" : `${paidThisMonth.length} pedidos`}, con el envío</span>
        </StatCard>
        <StatCard label="Armando" value={formatPrice(building.reduce((sum, p) => sum + purchaseTotal(p), 0))}>
          <span>{building.length === 1 ? "1 pedido sin pagar" : `${building.length} pedidos sin pagar`}</span>
        </StatCard>
      </section>

      <div>
        <div role="tablist" aria-label="Estado" className="mb-4 flex overflow-x-auto border-b border-admin-border">
          {(
            [
              ["todos", "Todos", purchases.length],
              ...PURCHASE_STEPS.map((s) => [s.status, s.label, counts(s.status)]),
            ] as [Filter, string, number][]
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => selectFilter(value)}
              className={`-mb-px flex h-12 shrink-0 items-center gap-1.5 border-b-2 px-4 text-[15px] font-semibold transition-colors duration-200 ${
                filter === value
                  ? "border-admin-ink text-admin-text"
                  : "border-transparent text-admin-muted hover:text-admin-text"
              }`}
            >
              {label}
              <span className="font-mono text-[13px] font-medium text-admin-muted">{count}</span>
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className={ADMIN_EMPTY}>
            {purchases.length === 0 ? (
              <>
                Todavía no cargaste pedidos.{" "}
                <Link href="/admin/compras/nuevo" className="font-semibold text-admin-text underline">
                  Cargar el primero
                </Link>
              </>
            ) : (
              "No hay pedidos en este estado."
            )}
          </p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-hidden rounded-md border border-admin-border md:block">
              <table className="w-full border-collapse text-left text-[15px]">
                <thead className="bg-admin-bg text-[13px] text-admin-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Pedido
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Fecha
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">
                      Unidades
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">
                      Mercadería
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">
                      Envío
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">
                      Total
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Estado
                    </th>
                    <th scope="col" className="w-10 px-2 py-3">
                      <span className="sr-only">Abrir</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border bg-admin-surface">
                  {visible.map((p) => {
                    const href = `/admin/compras/pedidos/${p.id}`;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => {
                          startNavigationProgress();
                          router.push(href);
                        }}
                        className="cursor-pointer transition-colors duration-150 hover:bg-admin-bg"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={href}
                            className="block font-semibold text-admin-text"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Pedido {p.number}
                          </Link>
                          <span className="block text-[13px] text-admin-muted">
                            {p.supplier?.name ?? "Sin proveedor"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-admin-text">{formatDay(p.purchase_date)}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-admin-text">{p.units}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-admin-text">
                          {formatPrice(p.total_amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-admin-muted">
                          {formatPrice(p.shipping_cost)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold tabular-nums text-admin-text">
                          {formatPrice(purchaseTotal(p))}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={adminBadge(STATUS_BADGE[p.status])}>{STATUS_LABEL[p.status]}</span>
                        </td>
                        <td className="px-2 py-3 text-admin-muted">
                          <ChevronRight aria-hidden="true" className="size-5" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <ul className="divide-y divide-admin-border overflow-hidden rounded-md border border-admin-border bg-admin-surface md:hidden">
              {visible.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/compras/pedidos/${p.id}`} className="flex items-start gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-admin-text">
                        Pedido {p.number} · {p.supplier?.name ?? "Sin proveedor"}
                      </span>
                      <span className="block text-[13px] text-admin-muted">
                        {formatDay(p.purchase_date)} · {unitsLabel(p.units)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-[15px] font-semibold tabular-nums text-admin-text">
                        {formatPrice(purchaseTotal(p))}
                      </span>
                      <span className={adminBadge(STATUS_BADGE[p.status])}>{STATUS_LABEL[p.status]}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

// useSearchParams necesita un Suspense alrededor para el render del servidor.
export default function PedidosPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <PedidosList />
    </Suspense>
  );
}
