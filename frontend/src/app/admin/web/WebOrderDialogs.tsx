"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AdminApiError, cancelWebOrder, markWebOrderPaid, type WebOrder } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import AdminNotice from "../AdminNotice";
import { ADMIN_BODY, ADMIN_LABEL, ADMIN_SECTION_TITLE, adminButton, adminChip } from "../adminStyles";
import { orderUnits } from "./WebOrderCard";

export const CANCEL_REASONS = ["No mandó el comprobante", "Se arrepintió", "No hay stock real"];

const DIALOG =
  "fixed inset-0 m-auto h-fit w-[calc(100%-2rem)] max-w-[440px] rounded-lg bg-white p-6 backdrop:bg-black/45";

// <dialog> nativo abierto al montarse (foco atrapado y Escape gratis). Se
// monta con key = id de la reserva: cada apertura arranca limpia.
function useModal() {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return ref;
}

export function PaidDialog({
  order,
  onClose,
  onDone,
}: {
  order: WebOrder;
  onClose: () => void;
  onDone: (order: WebOrder) => void;
}) {
  const ref = useModal();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      const res = await markWebOrderPaid(order.id);
      onDone(res.data);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo marcar como pagada.");
      setSaving(false);
    }
  }

  return (
    <dialog ref={ref} aria-labelledby="pagada-titulo" onClose={onClose} className={DIALOG}>
      <div className="flex flex-col gap-4">
        <h2 id="pagada-titulo" className={ADMIN_SECTION_TITLE}>
          Marcar como pagada
        </h2>
        <p className={ADMIN_BODY}>
          ¿Recibiste la transferencia de <strong className="font-semibold">{order.customer_name}</strong> por{" "}
          <strong className="font-mono font-semibold">{formatPrice(order.total_amount)}</strong>?
        </p>
        <p className="text-sm text-admin-muted">
          La reserva {order.code} pasa al historial como venta por transferencia. El stock ya estaba descontado.
        </p>
        {error && <AdminNotice kind="danger">{error}</AdminNotice>}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            disabled={saving}
            autoFocus
            className={adminButton("secondary")}
          >
            Volver
          </button>
          <button type="button" onClick={confirm} disabled={saving} className={adminButton("primary")}>
            <Check aria-hidden="true" className="size-[18px]" />
            {saving ? "Guardando…" : "Sí, pagada"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function CancelDialog({
  order,
  initialReason,
  onClose,
  onDone,
}: {
  order: WebOrder;
  initialReason: string;
  onClose: () => void;
  onDone: (order: WebOrder) => void;
}) {
  const ref = useModal();
  const [reason, setReason] = useState(initialReason);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const units = orderUnits(order);

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      const res = await cancelWebOrder(order.id, reason || null);
      onDone(res.data);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo cancelar la reserva.");
      setSaving(false);
    }
  }

  return (
    <dialog ref={ref} aria-labelledby="cancelar-titulo" onClose={onClose} className={DIALOG}>
      <div className="flex flex-col gap-4">
        <div>
          <h2 id="cancelar-titulo" className={ADMIN_SECTION_TITLE}>
            Cancelar reserva
          </h2>
          <p className="mt-1 text-sm text-admin-muted">
            {order.code} · {order.customer_name} · {formatPrice(order.total_amount)}
          </p>
        </div>
        <div>
          <p className={ADMIN_LABEL}>
            Motivo <span className="font-normal text-admin-muted">(opcional)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {CANCEL_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reason === r}
                onClick={() => setReason(reason === r ? "" : r)}
                className={adminChip(reason === r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <p className={ADMIN_BODY}>
          {units === 1 ? "Vuelve 1 unidad" : `Vuelven ${units} unidades`} al stock. ¿Confirmás?
        </p>
        {error && <AdminNotice kind="danger">{error}</AdminNotice>}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            disabled={saving}
            autoFocus
            className={adminButton("secondary")}
          >
            Volver
          </button>
          <button type="button" onClick={confirm} disabled={saving} className={adminButton("danger")}>
            {saving ? "Cancelando…" : "Cancelar reserva"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
