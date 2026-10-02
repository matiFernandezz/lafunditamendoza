"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { getWebOrders, type WebOrder, type WebOrderStatus } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import AdminNotice from "../AdminNotice";
import { WEB_ORDERS_CHANGED } from "../AdminShell";
import {
  ADMIN_EMPTY,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_TEXT_MUTED,
  adminButton,
  adminSegment,
} from "../adminStyles";
import WebOrderCard, { isExpired, orderUnits } from "./WebOrderCard";
import { CANCEL_REASONS, CancelDialog, PaidDialog } from "./WebOrderDialogs";

const STATUSES: WebOrderStatus[] = ["pendiente", "pagada", "cancelada"];

const EMPTY_TEXT: Record<WebOrderStatus, string> = {
  pendiente: "No hay reservas esperando pago.",
  pagada: "Todavía no hay ventas web pagadas.",
  cancelada: "No hay reservas canceladas.",
};

type Lists = Record<WebOrderStatus, WebOrder[]>;

async function loadAll(): Promise<Lists> {
  const [pendiente, pagada, cancelada] = await Promise.all(STATUSES.map((s) => getWebOrders(s)));
  return { pendiente: pendiente.data, pagada: pagada.data, cancelada: cancelada.data };
}

export default function WebVentasPage() {
  const now = useNow();
  const [filter, setFilter] = useState<WebOrderStatus>("pendiente");
  const [lists, setLists] = useState<Lists | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [paying, setPaying] = useState<WebOrder | null>(null);
  const [cancelling, setCancelling] = useState<WebOrder | null>(null);

  useEffect(() => {
    let ignore = false;
    loadAll()
      .then((result) => {
        if (ignore) return;
        setLists(result);
        setLoadError(null);
      })
      .catch((err) => {
        if (!ignore) setLoadError(err instanceof Error ? err.message : "No se pudieron cargar las reservas.");
      })
      .finally(() => {
        if (!ignore) setRefreshing(false);
      });
    return () => {
      ignore = true;
    };
  }, [reload]);

  function refresh() {
    setRefreshing(true);
    setReload((n) => n + 1);
  }

  // Después de pagar o cancelar: se recarga y se avisa al shell (contador rojo).
  function afterChange(message: string) {
    setPaying(null);
    setCancelling(null);
    setNotice(message);
    refresh();
    window.dispatchEvent(new Event(WEB_ORDERS_CHANGED));
  }

  if (loadError && !lists) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10">
        <AdminNotice kind="danger">{loadError}</AdminNotice>
        <button type="button" onClick={refresh} className={adminButton("primary")}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!lists) {
    return <p className={`py-10 text-center ${ADMIN_TEXT_MUTED}`}>Cargando…</p>;
  }

  const pendingCount = lists.pendiente.length;
  const pendingTotal = lists.pendiente.reduce((sum, o) => sum + o.total_amount, 0);
  const shown = lists[filter];

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className={ADMIN_PAGE_TITLE}>Ventas web</h1>
          <p className={ADMIN_PAGE_SUBTITLE}>
            {pendingCount > 0
              ? `${pendingCount} por cobrar · ${formatPrice(pendingTotal)}`
              : "Reservas hechas desde la tienda. Se guardan 24 horas."}
          </p>
        </div>
        <button type="button" onClick={refresh} disabled={refreshing} className={adminButton("ghost", "sm")}>
          <RefreshCw aria-hidden="true" className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      <div role="radiogroup" aria-label="Estado" className="grid grid-cols-3 gap-2">
        {STATUSES.map((s) => {
          const label = s === "pendiente" ? "Pendientes" : s === "pagada" ? "Pagadas" : "Canceladas";
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={filter === s}
              onClick={() => setFilter(s)}
              className={adminSegment(filter === s)}
            >
              {s === "pendiente" ? (
                `${label} (${lists[s].length})`
              ) : (
                <>
                  {label}
                  <span className="hidden lg:inline"> ({lists[s].length})</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {notice && (
        <AdminNotice kind="ok" onClose={() => setNotice(null)}>
          {notice}
        </AdminNotice>
      )}
      {loadError && <AdminNotice kind="danger">{loadError}</AdminNotice>}

      {shown.length === 0 ? (
        <p className={ADMIN_EMPTY}>{EMPTY_TEXT[filter]}</p>
      ) : (
        <ul className="grid items-start gap-3 lg:grid-cols-2">
          {shown.map((order) => (
            <WebOrderCard
              key={order.id}
              order={order}
              now={now}
              onPaid={() => {
                setNotice(null);
                setPaying(order);
              }}
              onCancel={() => {
                setNotice(null);
                setCancelling(order);
              }}
            />
          ))}
        </ul>
      )}

      {paying && (
        <PaidDialog
          key={paying.id}
          order={paying}
          onClose={() => setPaying(null)}
          onDone={(o) => afterChange(`${o.code} marcada como pagada · ${formatPrice(o.total_amount)} sumado al historial.`)}
        />
      )}
      {cancelling && (
        <CancelDialog
          key={cancelling.id}
          order={cancelling}
          // Vencida: lo más probable es que no haya pagado.
          initialReason={isExpired(cancelling, now) ? CANCEL_REASONS[0] : ""}
          onClose={() => setCancelling(null)}
          onDone={(o) => {
            const units = orderUnits(o);
            afterChange(
              `${o.code} cancelada. ${units === 1 ? "Volvió 1 unidad" : `Volvieron ${units} unidades`} al stock.`,
            );
          }}
        />
      )}
    </div>
  );
}
