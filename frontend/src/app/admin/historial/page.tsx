"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getSales,
  getSalesSummary,
  type Pagination,
  type Sale,
  type SalesSummary,
} from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import {
  ADMIN_ALERT_OK,
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_SECONDARY,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_PAGE_TITLE,
  ADMIN_TEXT_MUTED,
} from "../adminStyles";
import {
  customRange,
  describeRange,
  presetRange,
  spansSeveralDays,
  toDayValue,
  type PeriodKind,
  type Range,
} from "./periods";
import SaleRow from "./SaleRow";
import VoidSaleDialog from "./VoidSaleDialog";

const PAGE_SIZE = 50;

const PERIODS: { kind: PeriodKind; label: string }[] = [
  { kind: "today", label: "Hoy" },
  { kind: "week", label: "Esta semana" },
  { kind: "month", label: "Este mes" },
  { kind: "custom", label: "Personalizado" },
];

type Loaded = {
  key: string;
  summary: SalesSummary;
  sales: Sale[];
  pagination: Pagination;
};

function rangeKey(range: Range, reload: number) {
  return `${range.from.toISOString()}|${range.to.toISOString()}|${reload}`;
}

function methodTotals(summary: SalesSummary, method: string) {
  const row = summary.by_payment_method.find((m) => m.payment_method === method);
  return { amount: row?.total_amount ?? 0, count: row?.sales_count ?? 0 };
}

export default function HistorialPage() {
  const [kind, setKind] = useState<PeriodKind>("today");
  // El rango vive en estado y se recalcula en los handlers (con la fecha de
  // ese momento), no en el render: así "Hoy" pasa al día siguiente cuando
  // se vuelve a tocar o se actualiza, sin depender de un render impuro.
  const [range, setRange] = useState<Range>(() => presetRange("today", new Date()));
  const [customFrom, setCustomFrom] = useState(() => toDayValue(new Date()));
  const [customTo, setCustomTo] = useState(() => toDayValue(new Date()));
  const [reload, setReload] = useState(0);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [tab, setTab] = useState<"ventas" | "top">("ventas");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<Sale | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const key = rangeKey(range, reload);
  const loading = loaded?.key !== key && failed?.key !== key;

  useEffect(() => {
    let ignore = false;
    const apiRange = { from: range.from.toISOString(), to: range.to.toISOString() };
    const requestKey = rangeKey(range, reload);

    Promise.all([getSalesSummary(apiRange), getSales(apiRange, 1, PAGE_SIZE)])
      .then(([summary, list]) => {
        if (ignore) return;
        setLoaded({ key: requestKey, summary: summary.data, sales: list.data, pagination: list.pagination });
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
    if (!loaded) return;
    setLoadingMore(true);
    try {
      const next = await getSales(
        { from: range.from.toISOString(), to: range.to.toISOString() },
        loaded.pagination.page + 1,
        PAGE_SIZE,
      );
      setLoaded((prev) =>
        prev && prev.key === key
          ? { ...prev, sales: [...prev.sales, ...next.data], pagination: next.pagination }
          : prev,
      );
    } finally {
      setLoadingMore(false);
    }
  }

  const customInvalid = kind === "custom" && customRange(customFrom, customTo) === null;
  const summary = loaded?.summary;
  const cash = summary ? methodTotals(summary, "efectivo") : null;
  const transfer = summary ? methodTotals(summary, "transferencia") : null;
  const showDay = spansSeveralDays(range);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className={ADMIN_PAGE_TITLE}>Historial de ventas</h1>

      <section aria-label="Período" className="space-y-3">
        <div role="radiogroup" aria-label="Período" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PERIODS.map((period) => {
            const active = kind === period.kind;
            return (
              <button
                key={period.kind}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => selectPeriod(period.kind)}
                className={`h-10 rounded-md border text-sm font-semibold transition-colors ${
                  active
                    ? "border-black bg-black text-white"
                    : "border-admin-border bg-white text-admin-text hover:bg-admin-bg"
                }`}
              >
                {period.label}
              </button>
            );
          })}
        </div>

        {kind === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="historial-desde" className={ADMIN_LABEL}>
                Desde
              </label>
              <input
                id="historial-desde"
                type="date"
                value={customFrom}
                onChange={(e) => updateCustom(e.target.value, customTo)}
                className={ADMIN_INPUT}
              />
            </div>
            <div>
              <label htmlFor="historial-hasta" className={ADMIN_LABEL}>
                Hasta
              </label>
              <input
                id="historial-hasta"
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

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-admin-text">
            {describeRange(kind, range).replace(/^./, (c) => c.toUpperCase())}
          </p>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            title="Actualizar"
            aria-label="Actualizar"
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-admin-muted transition-colors hover:bg-white hover:text-admin-text disabled:opacity-50"
          >
            <RefreshCw aria-hidden="true" className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </section>

      {failed?.key === key ? (
        <div className="space-y-4 py-6 text-center">
          <p role="alert" className="text-sm text-admin-text">
            {failed.message}
          </p>
          <button type="button" onClick={refresh} className={ADMIN_BUTTON_PRIMARY}>
            Reintentar
          </button>
        </div>
      ) : !loaded ? (
        <p className={`py-10 text-center ${ADMIN_TEXT_MUTED}`}>Cargando…</p>
      ) : (
        <div className={`space-y-6 transition-opacity ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
          <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="col-span-2 rounded-md bg-black p-4 text-white lg:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Total ingresado</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{formatPrice(summary!.total_amount)}</p>
              <p className="mt-1 text-xs text-white/70">
                Ticket promedio {formatPrice(summary!.average_ticket)}
              </p>
            </div>
            <SummaryCard label="Efectivo" amount={cash!.amount} detail={salesLabel(cash!.count)} />
            <SummaryCard label="Transferencia" amount={transfer!.amount} detail={salesLabel(transfer!.count)} />
            {/* En mobile ocupa el ancho entero: fila compacta en vez de una
                tarjeta alta con un solo número. */}
            <div className={`${SUMMARY_CARD} col-span-2 flex items-center justify-between lg:col-span-1 lg:block`}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-admin-muted">Ventas</p>
                <p className="mt-1 text-xs text-admin-muted lg:hidden">sin contar anuladas</p>
              </div>
              <p className="font-mono text-2xl font-bold tabular-nums text-admin-text lg:mt-1">
                {summary!.sales_count}
              </p>
              <p className="mt-1 hidden text-xs text-admin-muted lg:block">sin contar anuladas</p>
            </div>
          </section>

          {notice && <p role="status" className={ADMIN_ALERT_OK}>{notice}</p>}

          <div role="tablist" aria-label="Detalle del período" className="flex border-b border-admin-border">
            {(
              [
                ["ventas", `Ventas (${loaded.pagination.total})`],
                ["top", "Más vendidos"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={`-mb-px h-10 border-b-2 px-4 text-sm font-semibold transition-colors ${
                  tab === value
                    ? "border-black text-admin-text"
                    : "border-transparent text-admin-muted hover:text-admin-text"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "ventas" ? (
            loaded.sales.length === 0 ? (
              <p className="rounded-md border border-dashed border-admin-border p-6 text-center text-sm text-admin-muted">
                No hubo ventas en este período.
              </p>
            ) : (
              <div className="space-y-3">
                <ul className="divide-y divide-admin-border overflow-hidden rounded-md border border-admin-border">
                  {loaded.sales.map((sale) => (
                    <SaleRow
                      key={sale.id}
                      sale={sale}
                      showDay={showDay}
                      expanded={expandedId === sale.id}
                      onToggle={() => setExpandedId((id) => (id === sale.id ? null : sale.id))}
                      onVoid={() => {
                        setNotice(null);
                        setVoidTarget(sale);
                      }}
                    />
                  ))}
                </ul>
                {loaded.pagination.page < loaded.pagination.total_pages && (
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className={`${ADMIN_BUTTON_SECONDARY} w-full`}
                  >
                    {loadingMore
                      ? "Cargando…"
                      : `Ver más (${loaded.pagination.total - loaded.sales.length} restantes)`}
                  </button>
                )}
              </div>
            )
          ) : summary!.top_products.length === 0 ? (
            <p className="rounded-md border border-dashed border-admin-border p-6 text-center text-sm text-admin-muted">
              Todavía no hay productos vendidos en este período.
            </p>
          ) : (
            <ol className="divide-y divide-admin-border overflow-hidden rounded-md border border-admin-border bg-white">
              {summary!.top_products.map((product, index) => (
                <li key={product.product_id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-6 shrink-0 font-mono text-sm font-bold tabular-nums text-admin-muted">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-sm font-semibold text-admin-text">
                    {product.product_name}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-sm font-semibold tabular-nums text-admin-text">
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
          }}
        />
      )}
    </div>
  );
}

function salesLabel(count: number) {
  return count === 1 ? "1 venta" : `${count} ventas`;
}

// Como ADMIN_CARD pero con padding fijo de 16px: tarjetas chicas en grilla.
const SUMMARY_CARD = "rounded-md border border-admin-border bg-white p-4";

function SummaryCard({ label, amount, detail }: { label: string; amount: number; detail: string }) {
  return (
    <div className={SUMMARY_CARD}>
      <p className="text-xs font-semibold uppercase tracking-wide text-admin-muted">{label}</p>
      <p className="mt-1 break-all font-mono text-xl font-bold tabular-nums text-admin-text">{formatPrice(amount)}</p>
      <p className="mt-1 text-xs text-admin-muted">{detail}</p>
    </div>
  );
}
