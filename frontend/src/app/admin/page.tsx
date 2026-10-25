"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDashboard, getSales, type Dashboard, type Sale } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import AdminNotice from "./AdminNotice";
import { ADMIN_PAGE_SUBTITLE, ADMIN_PAGE_TITLE, adminButton } from "./adminStyles";
import AttentionPanel from "./inicio/AttentionPanel";
import PurchasesPanel from "./inicio/PurchasesPanel";
import SalesChart from "./inicio/SalesChart";
import PeriodSwitch from "./PeriodSwitch";
import { describePrevious, presetRange, previousRange, type PresetKind, type Range } from "./periods";
import StatCard, { Panel } from "./StatCard";
import SalesTable from "./ventas/listado/SalesTable";
import AdminLoading from "./AdminLoading";

const PERIODS = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
] as const satisfies readonly { value: PresetKind; label: string }[];

// Últimas ventas: las más nuevas de todo el historial, no solo del período.
const ALL_TIME = { from: new Date(2000, 0, 1).toISOString() };

type Loaded = { key: string; dashboard: Dashboard; recent: Sale[] };

const longDay = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" });
const shortDay = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" });
const monthYear = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Octubre de 2026, del 1 al 20" · "Semana del 19 al 25 de octubre" · "Martes, 20 de octubre". */
function describePeriod(kind: PresetKind, range: Range, now: Date) {
  if (kind === "today") return capitalize(longDay.format(range.from));
  if (kind === "week") {
    const last = new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate() - 1);
    return `Semana del ${shortDay.formatRange(range.from, last)}`;
  }
  return `${capitalize(monthYear.format(range.from))}, del 1 al ${now.getDate()}`;
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export default function InicioPage() {
  const [kind, setKind] = useState<PresetKind>("month");
  // El rango y el "ahora" se fijan al elegir el período (no en el render).
  const [now, setNow] = useState(() => new Date());
  const [range, setRange] = useState<Range>(() => presetRange("month", new Date()));
  const [reload, setReload] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null);

  const key = `${kind}|${range.from.toISOString()}|${reload}`;
  const loading = loaded?.key !== key && failed?.key !== key;
  const previous = previousRange(kind, range, now);

  useEffect(() => {
    let ignore = false;
    const requestKey = `${kind}|${range.from.toISOString()}|${reload}`;
    const prev = previousRange(kind, range, now);
    Promise.all([
      getDashboard({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        prev_from: prev.from.toISOString(),
        prev_to: prev.to.toISOString(),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
      getSales({ ...ALL_TIME, to: new Date(now.getTime() + 60_000).toISOString() }, 1, 6),
    ])
      .then(([dashboard, recent]) => {
        if (!ignore) setLoaded({ key: requestKey, dashboard: dashboard.data, recent: recent.data });
      })
      .catch((err) => {
        if (!ignore) setFailed({ key: requestKey, message: err instanceof Error ? err.message : "No se pudo cargar." });
      });
    return () => {
      ignore = true;
    };
  }, [kind, range, now, reload]);

  function selectPeriod(next: PresetKind) {
    const at = new Date();
    setKind(next);
    setNow(at);
    setRange(presetRange(next, at));
  }

  function refresh() {
    const at = new Date();
    setNow(at);
    setRange(presetRange(kind, at));
    setReload((n) => n + 1);
  }

  const data = loaded?.dashboard;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={ADMIN_PAGE_TITLE}>Inicio</h1>
          <p className={ADMIN_PAGE_SUBTITLE}>{describePeriod(kind, range, now)}</p>
        </div>
        <PeriodSwitch options={PERIODS} value={kind} onChange={selectPeriod} />
      </div>

      {failed?.key === key ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <AdminNotice kind="danger">{failed.message}</AdminNotice>
          <button type="button" onClick={refresh} className={adminButton("primary")}>
            Reintentar
          </button>
        </div>
      ) : !data || !loaded ? (
        <AdminLoading />
      ) : (
        <div
          aria-busy={loading}
          className={`flex flex-col gap-5 transition-opacity duration-200 ${loading ? "opacity-50" : ""}`}
        >
          <section aria-label="Resumen" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={kind === "today" ? "Ventas de hoy" : kind === "week" ? "Ventas de la semana" : "Ventas del mes"}
              value={formatPrice(data.sales.total_amount)}
            >
              <span>{data.sales.sales_count === 1 ? "1 venta" : `${data.sales.sales_count} ventas`}</span>
              <span>
                {capitalize(describePrevious(kind, previous))}: {formatPrice(data.sales.prev_total_amount)}
              </span>
            </StatCard>
            <StatCard label="Ganancia bruta" value={formatPrice(data.sales.gross_profit)}>
              <span>{percent(data.sales.gross_profit, data.sales.total_amount)}% de lo vendido</span>
            </StatCard>
            <StatCard
              label="En caja"
              value={formatPrice(data.cash.efectivo + data.cash.transferencia - data.cash.purchases)}
            >
              <span>
                Efectivo {formatPrice(data.cash.efectivo)} · Transferencia {formatPrice(data.cash.transferencia)}
              </span>
              {data.cash.purchases > 0 && <span>Menos {formatPrice(data.cash.purchases)} en pedidos</span>}
            </StatCard>
            <StatCard label="Plata en stock" value={formatPrice(data.stock.cost_value)}>
              <span>
                {data.stock.units} unidades · a precio de venta {formatPrice(data.stock.retail_value)}
              </span>
              {data.stock.without_cost > 0 && (
                <span className="text-admin-warn">
                  {data.stock.without_cost === 1
                    ? "1 variante con stock no tiene costo cargado"
                    : `${data.stock.without_cost} variantes con stock no tienen costo cargado`}
                </span>
              )}
            </StatCard>
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Panel title={data.series.unit === "hour" ? "Ventas por hora" : "Ventas por día"} className="lg:col-span-2">
              <SalesChart series={data.series} />
            </Panel>
            <Panel title="Caja">
              <dl className="flex flex-col divide-y divide-admin-border text-[15px]">
                <div className="flex justify-between gap-3 pb-3">
                  <dt className="text-admin-text">Cobrado en efectivo</dt>
                  <dd className="font-mono tabular-nums text-admin-text">{formatPrice(data.cash.efectivo)}</dd>
                </div>
                <div className="flex justify-between gap-3 py-3">
                  <dt className="text-admin-text">Cobrado por transferencia</dt>
                  <dd className="font-mono tabular-nums text-admin-text">{formatPrice(data.cash.transferencia)}</dd>
                </div>
                <div className="flex justify-between gap-3 py-3">
                  <dt className="text-admin-text">Pagado en pedidos</dt>
                  <dd className="font-mono tabular-nums text-admin-text">
                    {data.cash.purchases > 0 ? `− ${formatPrice(data.cash.purchases)}` : formatPrice(0)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 pt-3 font-semibold">
                  <dt className="text-admin-text">Total</dt>
                  <dd className="font-mono tabular-nums text-admin-text">
                    {formatPrice(data.cash.efectivo + data.cash.transferencia - data.cash.purchases)}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-[13px] text-admin-muted">
                Todo lo cobrado desde el primer registro, menos lo pagado en pedidos. No incluye otros gastos ni
                retiros.
              </p>
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AttentionPanel alerts={data.alerts} />
            </div>
            <PurchasesPanel purchases={data.purchases} onReceived={() => setReload((n) => n + 1)} />
          </div>

          <Panel
            title="Últimas ventas"
            action={
              <Link href="/admin/ventas/listado" className="text-sm font-semibold text-admin-text hover:underline">
                Ver todas
              </Link>
            }
          >
            {loaded.recent.length === 0 ? (
              <p className="text-sm text-admin-muted">Todavía no hay ventas registradas.</p>
            ) : (
              <SalesTable sales={loaded.recent} />
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
