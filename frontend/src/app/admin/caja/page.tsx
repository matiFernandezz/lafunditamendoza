"use client";

import { ArrowLeftRight, Banknote, Calculator, HandCoins, Plus, Receipt } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AdminApiError,
  getCash,
  setCashMovementAccount,
  type CashAccount,
  type CashKind,
  type CashMovement,
  type CashSummary,
} from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import AdminLoading from "../AdminLoading";
import AdminNotice from "../AdminNotice";
import {
  ADMIN_EMPTY,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_TEXT_MUTED,
  adminBadge,
  adminButton,
} from "../adminStyles";
import PeriodSwitch from "../PeriodSwitch";
import { customRange, describeRange, presetRange, spansSeveralDays, toDayValue, type PeriodKind, type Range } from "../periods";
import StatCard, { Panel } from "../StatCard";
import CashChart from "./CashChart";
import { ACCOUNT_LABEL, MovementDialog, VoidMovementDialog, type DialogKind } from "./CashDialogs";

const PERIODS = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "custom", label: "Fechas" },
] as const satisfies readonly { value: PeriodKind; label: string }[];

const KIND_LABEL: Record<CashKind, string> = {
  aporte: "Aporte",
  retiro: "Retiro",
  gasto: "Gasto",
  transferencia: "Transferencia",
  venta: "Venta",
  compra: "Pedido",
  ajuste: "Ajuste",
};

const NEW_BUTTONS: { kind: DialogKind; label: string; icon: typeof Plus }[] = [
  { kind: "gasto", label: "Gasto", icon: Receipt },
  { kind: "aporte", label: "Aporte", icon: Banknote },
  { kind: "retiro", label: "Retiro", icon: HandCoins },
  { kind: "transferencia", label: "Pasar entre cuentas", icon: ArrowLeftRight },
  { kind: "conteo", label: "Contar caja", icon: Calculator },
];

type Loaded = { key: string; summary: CashSummary; movements: CashMovement[]; categories: string[] };

const dayTime = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const timeOnly = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" });

function sumKind(summary: CashSummary, kinds: CashKind[], direction: "ingreso" | "egreso") {
  return summary.by_kind
    .filter((row) => row.direction === direction && kinds.includes(row.kind))
    .reduce((total, row) => total + row.total, 0);
}

function errorMessage(err: unknown) {
  return err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.";
}

/** Caja: el libro de todas las entradas y salidas de plata, con el saldo de efectivo y banco. */
export default function CajaPage() {
  const [kind, setKind] = useState<PeriodKind>("month");
  const [range, setRange] = useState<Range>(() => presetRange("month", new Date()));
  const [customFrom, setCustomFrom] = useState(() => toDayValue(presetRange("month", new Date()).from));
  const [customTo, setCustomTo] = useState(() => toDayValue(new Date()));
  const [reload, setReload] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [dialogId, setDialogId] = useState(0);
  const [voiding, setVoiding] = useState<CashMovement | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [balanceNow, setBalanceNow] = useState<CashSummary["balance"] | null>(null);

  const key = `${range.from.toISOString()}|${range.to.toISOString()}|${reload}`;
  const loading = loaded?.key !== key && failed?.key !== key;

  useEffect(() => {
    let ignore = false;
    const requestKey = `${range.from.toISOString()}|${range.to.toISOString()}|${reload}`;
    getCash({ from: range.from.toISOString(), to: range.to.toISOString() })
      .then((res) => {
        if (ignore) return;
        setLoaded({ key: requestKey, ...res.data });
        setBalanceNow(res.data.summary.balance);
      })
      .catch((err) => {
        if (!ignore) setFailed({ key: requestKey, message: errorMessage(err) });
      });
    return () => {
      ignore = true;
    };
  }, [range, reload]);

  function selectPeriod(next: PeriodKind) {
    setKind(next);
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

  function openDialog(next: DialogKind) {
    setNotice(null);
    setActionError(null);
    setDialogId((n) => n + 1);
    setDialog(next);
  }

  async function changeAccount(movement: CashMovement, account: CashAccount) {
    setNotice(null);
    setActionError(null);
    try {
      await setCashMovementAccount(movement.id, account);
      setNotice(`Ahora figura en ${ACCOUNT_LABEL[account].toLowerCase()}.`);
      refresh();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  const customInvalid = kind === "custom" && customRange(customFrom, customTo) === null;
  const summary = loaded?.summary;
  const severalDays = spansSeveralDays(range);

  // Del período: lo que entró (ventas y aportes), lo que salió, y cómo le fue al negocio.
  const sales = summary ? sumKind(summary, ["venta"], "ingreso") : 0;
  const contributions = summary ? sumKind(summary, ["aporte"], "ingreso") : 0;
  const expenses = summary ? sumKind(summary, ["gasto", "compra"], "egreso") : 0;
  const withdrawals = summary ? sumKind(summary, ["retiro"], "egreso") : 0;
  const adjustments = summary ? sumKind(summary, ["ajuste"], "ingreso") - sumKind(summary, ["ajuste"], "egreso") : 0;
  const maxCategory = Math.max(0, ...(summary?.by_category.map((c) => c.total) ?? []));
  const balance = summary?.balance ?? balanceNow;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className={ADMIN_PAGE_TITLE}>Caja</h1>
          <p className={ADMIN_PAGE_SUBTITLE}>
            {describeRange(kind, range).replace(/^./, (c) => c.toUpperCase())}
          </p>
        </div>
        <PeriodSwitch options={PERIODS} value={kind} onChange={selectPeriod} />
      </div>

      {kind === "custom" && (
        <div className="grid max-w-md grid-cols-2 gap-2">
          <div>
            <label htmlFor="caja-desde" className={ADMIN_LABEL}>
              Desde
            </label>
            <input
              id="caja-desde"
              type="date"
              value={customFrom}
              onChange={(e) => updateCustom(e.target.value, customTo)}
              className={ADMIN_INPUT}
            />
          </div>
          <div>
            <label htmlFor="caja-hasta" className={ADMIN_LABEL}>
              Hasta
            </label>
            <input
              id="caja-hasta"
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

      <div className="flex flex-wrap gap-2">
        {NEW_BUTTONS.map(({ kind: buttonKind, label, icon: Icon }, index) => (
          <button
            key={buttonKind}
            type="button"
            disabled={!balance}
            onClick={() => openDialog(buttonKind)}
            className={adminButton(index === 0 ? "primary" : "secondary", "sm")}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {notice && (
        <AdminNotice kind="ok" onClose={() => setNotice(null)}>
          {notice}
        </AdminNotice>
      )}
      {actionError && (
        <AdminNotice kind="danger" onClose={() => setActionError(null)}>
          {actionError}
        </AdminNotice>
      )}

      {failed?.key === key ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <AdminNotice kind="danger">{failed.message}</AdminNotice>
          <button type="button" onClick={refresh} className={adminButton("primary")}>
            Reintentar
          </button>
        </div>
      ) : !loaded || !summary ? (
        <AdminLoading />
      ) : (
        <div
          aria-busy={loading}
          className={`flex flex-col gap-5 transition-opacity duration-200 ${loading ? "opacity-50" : ""}`}
        >
          <section aria-label="Resumen" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="En caja" value={formatPrice(summary.balance.efectivo + summary.balance.banco)}>
              <span>
                Efectivo {formatPrice(summary.balance.efectivo)} · Banco {formatPrice(summary.balance.banco)}
              </span>
              <span>Saldo de hoy, no depende del período.</span>
            </StatCard>
            <StatCard label="Entró" value={formatPrice(sales + contributions)}>
              <span>Ventas {formatPrice(sales)}</span>
              <span>Aportes {formatPrice(contributions)}</span>
            </StatCard>
            <StatCard label="Salió" value={formatPrice(expenses + withdrawals)}>
              <span>Gastos y pedidos {formatPrice(expenses)}</span>
              <span>Retiros {formatPrice(withdrawals)}</span>
            </StatCard>
            <StatCard label="Resultado del negocio" value={formatPrice(sales - expenses)}>
              <span>Ventas menos gastos y pedidos.</span>
              {adjustments !== 0 && <span>Ajustes de caja {formatPrice(adjustments)}</span>}
            </StatCard>
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Panel title="Entradas y salidas" className="lg:col-span-2">
              <CashChart series={summary.series} />
            </Panel>
            <Panel title="En qué se fue la plata">
              {summary.by_category.length === 0 ? (
                <p className="text-sm text-admin-muted">Sin salidas en este período.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {summary.by_category.map((c) => (
                    <li key={c.category}>
                      <div className="flex justify-between gap-3 text-[15px] text-admin-text">
                        <span className="min-w-0 truncate">{c.category}</span>
                        <span className="font-mono tabular-nums">{formatPrice(c.total)}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-admin-bg">
                        <div
                          className="h-full rounded-full bg-admin-ink"
                          style={{ width: `${maxCategory > 0 ? (c.total / maxCategory) * 100 : 0}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel title="Movimientos">
            {loaded.movements.length === 0 ? (
              <p className={ADMIN_EMPTY}>
                No hay movimientos en este período. Las ventas y los pedidos pagados aparecen solos; lo demás se carga
                con los botones de arriba.
              </p>
            ) : (
              <ol className="flex flex-col divide-y divide-admin-border">
                {loaded.movements.map((m) => {
                  const void_ = m.voided_at !== null;
                  const sign = m.direction === "ingreso" ? "+" : "−";
                  const date = new Date(m.occurred_at);
                  return (
                    <li
                      key={m.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 py-3.5 md:flex md:flex-wrap md:items-center md:gap-x-4 md:py-3"
                    >
                      <div className="min-w-0 md:order-2 md:flex-1 md:basis-56">
                        <p className={`break-words text-[15px] font-medium text-admin-text ${void_ ? "line-through opacity-60" : ""}`}>
                          {m.description || KIND_LABEL[m.kind]}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-admin-muted">
                          <span className={adminBadge(void_ ? "danger" : m.direction === "ingreso" ? "ok" : "neutral")}>
                            {void_ ? "Anulado" : KIND_LABEL[m.kind]}
                          </span>
                          {m.category && m.category !== KIND_LABEL[m.kind] && <span>{m.category}</span>}
                          {void_ && m.void_reason && <span>· {m.void_reason}</span>}
                        </p>
                      </div>
                      <span
                        className={`whitespace-nowrap text-right font-mono text-[17px] font-semibold tabular-nums md:order-4 md:w-[120px] md:shrink-0 md:text-[15px] ${
                          void_
                            ? "text-admin-muted line-through"
                            : m.direction === "ingreso"
                              ? "text-admin-ok"
                              : "text-admin-text"
                        }`}
                      >
                        {sign} {formatPrice(m.amount)}
                      </span>
                      {/* En el celular: fecha y cuenta en un renglón de abajo; en la compu, cada uno en su columna. */}
                      <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-admin-muted md:contents">
                        <span className="font-mono text-xs md:order-1 md:w-[92px] md:shrink-0">
                          {severalDays ? dayTime.format(date) : timeOnly.format(date)}
                        </span>
                        <span aria-hidden="true" className="md:hidden">
                          ·
                        </span>
                        <span className="md:order-3 md:shrink-0 md:text-sm">{ACCOUNT_LABEL[m.account]}</span>
                      </p>
                      <span className="flex items-center justify-end gap-2 md:order-5 md:w-[130px] md:shrink-0">
                        {!void_ && m.kind === "compra" && (
                          <button
                            type="button"
                            onClick={() => changeAccount(m, m.account === "efectivo" ? "banco" : "efectivo")}
                            className="min-h-9 text-sm font-semibold text-admin-text underline-offset-2 hover:underline"
                          >
                            Pasar a {m.account === "efectivo" ? "banco" : "efectivo"}
                          </button>
                        )}
                        {!void_ && m.kind !== "venta" && m.kind !== "compra" && (
                          <button
                            type="button"
                            onClick={() => setVoiding(m)}
                            className="min-h-9 text-sm font-semibold text-admin-danger underline-offset-2 hover:underline"
                          >
                            Anular
                          </button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
            {loaded.movements.length >= 500 && (
              <p className={`mt-3 ${ADMIN_TEXT_MUTED}`}>Se muestran los 500 más recientes del período.</p>
            )}
          </Panel>
        </div>
      )}

      {dialog && balance && loaded && (
        <MovementDialog
          key={dialogId}
          kind={dialog}
          balance={balance}
          categories={loaded.categories}
          onClose={() => setDialog(null)}
          onSaved={(message) => {
            setDialog(null);
            setNotice(message);
            refresh();
          }}
        />
      )}
      {voiding && (
        <VoidMovementDialog
          key={voiding.id}
          movement={voiding}
          onClose={() => setVoiding(null)}
          onVoided={() => {
            setVoiding(null);
            setNotice("Movimiento anulado.");
            refresh();
          }}
        />
      )}
    </div>
  );
}
