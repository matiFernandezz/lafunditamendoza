"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getSales,
  getSalesSummary,
  type Pagination,
  type Sale,
  type SaleStatus,
  type SalesSummary,
} from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import AdminNotice from "../../AdminNotice";
import {
  ADMIN_EMPTY,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_PAGE_TITLE,
  ADMIN_ROW_LIST,
  ADMIN_TEXT_MUTED,
  adminButton,
} from "../../adminStyles";
import PeriodSwitch from "../../PeriodSwitch";
import { customRange, describeRange, presetRange, toDayValue, type PeriodKind, type Range } from "../../periods";
import StatCard from "../../StatCard";
import { SALES_CHANGED } from "../salesEvents";
import SalesTable from "./SalesTable";
import VoidSaleDialog from "./VoidSaleDialog";

const PAGE_SIZE = 50;

const PERIODS = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "custom", label: "Fechas" },
] as const satisfies readonly { value: PeriodKind; label: string }[];

type Tab = "todas" | "anuladas" | "top";
type SalesPage = { sales: Sale[]; pagination: Pagination };
type Loaded = { key: string; summary: SalesSummary; all: SalesPage; voided: SalesPage };

function rangeKey(range: Range, reload: number) {
  return `${range.from.toISOString()}|${range.to.toISOString()}|${reload}`;
}

function methodTotals(summary: SalesSummary, method: string) {
  const row = summary.by_payment_method.find((m) => m.payment_method === method);
  return { amount: row?.total_amount ?? 0, count: row?.sales_count ?? 0 };
}

function salesLabel(count: number) {
  return count === 1 ? "1 venta" : `${count} ventas`;
}

export default function ListadoVentasPage() {
  const [kind, setKind] = useState<PeriodKind>("month");
  // El rango se recalcula en los handlers (con la fecha de ese momento), no en el render.
  const [range, setRange] = useState<Range>(() => presetRange("month", new Date()));
  const [customFrom, setCustomFrom] = useState(() => toDayValue(new Date()));
  const [customTo, setCustomTo] = useState(() => toDayValue(new Date()));
  const [reload, setReload] = useState(0);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [tab, setTab] = useState<Tab>("todas");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<Sale | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const key = rangeKey(range, reload);
  const loading = loaded?.key !== key && failed?.key !== key;

  useEffect(() => {
    let ignore = false;
    const apiRange = { from: range.from.toISOString(), to: range.to.toISOString() };
    const requestKey = rangeKey(range, reload);

    Promise.all([
      getSalesSummary(apiRange),
      getSales(apiRange, 1, PAGE_SIZE),
      getSales(apiRange, 1, PAGE_SIZE, "anulada"),
    ])
      .then(([summary, all, voided]) => {
        if (ignore) return;
        setLoaded({
          key: requestKey,
          summary: summary.data,
          all: { sales: all.data, pagination: all.pagination },
          voided: { sales: voided.data, pagination: voided.pagination },
        });
      })
      .catch((err) => {
        if (ignore) return;
        setFailed({ key: requestKey, message: err instanceof Error ? err.message : "No se pudo cargar." });
      });

    return () => {
      ignore = true;
    };
  }, [range, reload]);

  function selectPeriod(next: PeriodKind) {
    setKind(next);
    setExpandedId(null);
    if (next === "custom") {
      const custom = customRange(customFrom, customTo);
      if (custom) setRange(custom);
    } else {
      setRange(presetRange(next, new Date()));
    }
  }

  function updateCustom(from: string, to: string) {
    setCustomFrom(from);
    setCustomTo(to);
    const custom = customRange(from, to);
    if (custom) setRange(custom);
  }

  function refresh() {
    if (kind !== "custom") setRange(presetRange(kind, new Date()));
    setReload((n) => n + 1);
  }

  async function loadMore() {
    if (!loaded || tab === "top") return;
    const which = tab === "todas" ? "all" : "voided";
    const status: SaleStatus | undefined = tab === "anuladas" ? "anulada" : undefined;
    setLoadingMore(true);
    try {
      const next = await getSales(
        { from: range.from.toISOString(), to: range.to.toISOString() },
        loaded[which].pagination.page + 1,
        PAGE_SIZE,
        status,
      );
      setLoaded((prev) =>
        prev && prev.key === key
          ? {
              ...prev,
              [which]: { sales: [...prev[which].sales, ...next.data], pagination: next.pagination },
            }
          : prev,
      );
    } finally {
      setLoadingMore(false);
    }
  }

  const customInvalid = kind === "custom" && customRange(customFrom, customTo) === null;
  const summary = loaded?.summary;
  const current = loaded && tab !== "top" ? loaded[tab === "todas" ? "all" : "voided"] : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className={ADMIN_PAGE_TITLE}>Listado de ventas</h1>
          <p className="mt-1 text-sm text-admin-muted">
            {describeRange(kind, range).replace(/^./, (c) => c.toUpperCase())}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSwitch options={PERIODS} value={kind} onChange={selectPeriod} />
          <Link href="/admin/ventas" className={adminButton("primary")}>
            <Plus aria-hidden="true" className="size-5" />
            Nueva venta
          </Link>
        </div>
      </div>

      {kind === "custom" && (
        <div className="grid max-w-md grid-cols-2 gap-2">
          <div>
            <label htmlFor="listado-desde" className={ADMIN_LABEL}>
              Desde
            </label>
            <input
              id="listado-desde"
              type="date"
              value={customFrom}
              onChange={(e) => updateCustom(e.target.value, customTo)}
              className={ADMIN_INPUT}
            />
          </div>
          <div>
            <label htmlFor="listado-hasta" className={ADMIN_LABEL}>
              Hasta
            </label>
            <input
              id="listado-hasta"
              type="date"
              value={customTo}
              onChange={(e) => updateCustom(customFrom, e.target.value)}
              className={ADMIN_INPUT}
            />
          </div>
          {customInvalid && (
            <p className={`col-span-2 ${ADMIN_TEXT_MUTED}`}>
              &ldquo;Desde&rdquo; tiene que ser igual o anterior a &ldquo;Hasta&rdquo;.
            </p>
          )}
        </div>
      )}

      {failed?.key === key ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <AdminNotice kind="danger">{failed.message}</AdminNotice>
          <button type="button" onClick={refresh} className={adminButton("primary")}>
            Reintentar
          </button>
        </div>
      ) : !loaded || !summary ? (
        <p className={`py-10 text-center ${ADMIN_TEXT_MUTED}`}>Cargando…</p>
      ) : (
        <div
          className={`flex flex-col gap-5 transition-opacity duration-200 ${loading ? "opacity-50" : ""}`}
          aria-busy={loading}
        >
          <section aria-label="Resumen" className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            <StatCard label="Vendido" value={formatPrice(summary.total_amount)}>
              <span>
                {salesLabel(summary.sales_count)}
                {summary.sales_count > 0 && ` · promedio ${formatPrice(summary.average_ticket)}`}
              </span>
              {summary.discount_total > 0 && <span>Descuentos − {formatPrice(summary.discount_total)}</span>}
            </StatCard>
            <StatCard label="Ganancia bruta" value={formatPrice(summary.gross_profit)}>
              <span>
                {summary.total_amount > 0 ? Math.round((summary.gross_profit / summary.total_amount) * 100) : 0}% de lo
                vendido
              </span>
            </StatCard>
            <StatCard label="Efectivo" value={formatPrice(methodTotals(summary, "efectivo").amount)}>
              <span>{salesLabel(methodTotals(summary, "efectivo").count)}</span>
            </StatCard>
            <StatCard label="Transferencia" value={formatPrice(methodTotals(summary, "transferencia").amount)}>
              <span>{salesLabel(methodTotals(summary, "transferencia").count)}</span>
            </StatCard>
          </section>

          {notice && (
            <AdminNotice kind="ink" onClose={() => setNotice(null)}>
              {notice}
            </AdminNotice>
          )}

          <div>
            <div role="tablist" aria-label="Ventas del período" className="mb-4 flex overflow-x-auto border-b border-admin-border">
              {(
                [
                  ["todas", "Todas", loaded.all.pagination.total],
                  ["anuladas", "Anuladas", loaded.voided.pagination.total],
                  ["top", "Más vendidos", null],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => {
                    setTab(value);
                    setExpandedId(null);
                  }}
                  className={`-mb-px flex h-12 shrink-0 items-center gap-1.5 border-b-2 px-4 text-[15px] font-semibold transition-colors duration-200 ${
                    tab === value
                      ? "border-admin-ink text-admin-text"
                      : "border-transparent text-admin-muted hover:text-admin-text"
                  }`}
                >
                  {label}
                  {count !== null && <span className="font-mono text-[13px] font-medium text-admin-muted">{count}</span>}
                </button>
              ))}
            </div>

            {current ? (
              current.sales.length === 0 ? (
                <p className={ADMIN_EMPTY}>
                  {tab === "anuladas" ? "No hay ventas anuladas en este período." : "No hubo ventas en este período."}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <SalesTable
                    sales={current.sales}
                    showProfit
                    expandedId={expandedId}
                    onToggle={(sale) => setExpandedId((id) => (id === sale.id ? null : sale.id))}
                    onVoid={(sale) => {
                      setNotice(null);
                      setVoidTarget(sale);
                    }}
                  />
                  {current.pagination.page < current.pagination.total_pages && (
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className={`${adminButton("secondary")} w-full`}
                    >
                      {loadingMore
                        ? "Cargando…"
                        : `Ver más (${current.pagination.total - current.sales.length} restantes)`}
                    </button>
                  )}
                </div>
              )
            ) : summary.top_products.length === 0 ? (
              <p className={ADMIN_EMPTY}>Todavía no hay productos vendidos en este período.</p>
            ) : (
              <ol className={ADMIN_ROW_LIST}>
                {summary.top_products.map((product, index) => (
                  <li key={product.product_id} className="flex items-center gap-3 px-4 py-3.5">
                    <span
                      className={`w-7 shrink-0 font-display text-xl font-semibold ${
                        index < 3 ? "text-admin-text" : "text-admin-muted"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-[15px] font-semibold text-admin-text">
                      {product.product_name}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-[15px] font-semibold tabular-nums text-admin-text">
                        {product.units} u.
                      </span>
                      <span className="block font-mono text-[13px] tabular-nums text-admin-muted">
                        {formatPrice(product.revenue)}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      {voidTarget && (
        <VoidSaleDialog
          key={voidTarget.id}
          sale={voidTarget}
          onClose={() => setVoidTarget(null)}
          onVoided={() => {
            const units = voidTarget.sale_items.reduce((sum, item) => sum + item.quantity, 0);
            setVoidTarget(null);
            setNotice(
              `Venta anulada. ${units === 1 ? "Se devolvió 1 unidad" : `Se devolvieron ${units} unidades`} al stock.`,
            );
            setTimeout(() => setNotice(null), 5000);
            setReload((n) => n + 1);
            window.dispatchEvent(new Event(SALES_CHANGED));
          }}
        />
      )}
    </div>
  );
}
