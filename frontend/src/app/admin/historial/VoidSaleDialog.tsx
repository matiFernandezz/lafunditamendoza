"use client";

import { useEffect, useRef, useState } from "react";
import { AdminApiError, voidSale, type Sale } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import {
  ADMIN_ALERT_ERROR,
  ADMIN_BUTTON_DANGER,
  ADMIN_BUTTON_SECONDARY,
  ADMIN_LABEL,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXTAREA,
} from "../adminStyles";
import { formatTime, paymentLabel, unitCount } from "./SaleRow";

/**
 * Se monta con key = id de la venta: cada apertura arranca con el motivo
 * vacío. Es un <dialog> nativo (foco atrapado y Escape gratis), abierto con
 * showModal() al montarse.
 */
export default function VoidSaleDialog({
  sale,
  onClose,
  onVoided,
}: {
  sale: Sale;
  onClose: () => void;
  onVoided: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const units = unitCount(sale);
  const canSubmit = reason.trim() !== "" && !saving;

  async function handleConfirm() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await voidSale(sale.id, reason.trim());
      onVoided();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo anular la venta.");
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="anular-titulo"
      onClose={onClose}
      className="fixed inset-0 m-auto h-fit w-[calc(100%-2rem)] max-w-md rounded-md border border-admin-border bg-white p-6 backdrop:bg-black/40"
    >
      <div className="space-y-4">
        <div>
          <h2 id="anular-titulo" className={ADMIN_SECTION_TITLE}>
            Anular venta
          </h2>
          <p className="mt-1 text-[13px] text-admin-muted">
            {formatTime(new Date(sale.sale_date))} · {formatPrice(sale.total_amount)} ·{" "}
            {paymentLabel(sale.payment_method)}
          </p>
        </div>

        <div>
          <label htmlFor="anular-motivo" className={ADMIN_LABEL}>
            Motivo
          </label>
          <textarea
            id="anular-motivo"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            rows={3}
            maxLength={300}
            autoFocus
            placeholder="Ej.: se cargó dos veces, el cliente devolvió la funda…"
            className={ADMIN_TEXTAREA}
          />
        </div>

        <p className="text-sm text-admin-text">
          Se van a devolver{" "}
          <strong className="font-semibold">{units === 1 ? "1 unidad" : `${units} unidades`}</strong> al stock.
          ¿Confirmás?
        </p>

        {error && <p role="alert" className={ADMIN_ALERT_ERROR}>{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            disabled={saving}
            className={ADMIN_BUTTON_SECONDARY}
          >
            Cancelar
          </button>
          <button type="button" onClick={handleConfirm} disabled={!canSubmit} className={ADMIN_BUTTON_DANGER}>
            {saving ? "Anulando…" : "Anular venta"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
