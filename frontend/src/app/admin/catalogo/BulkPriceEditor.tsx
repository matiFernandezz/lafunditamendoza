"use client";

import { Tag } from "lucide-react";
import { useState } from "react";
import { AdminApiError, updateProductPrice, type AdminVariant } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import {
  ADMIN_ALERT_ERROR,
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_SECONDARY,
  ADMIN_BUTTON_SECONDARY_SM,
} from "../adminStyles";

type Step = "idle" | "editing" | "confirming";

/**
 * "Cambiar precio a todos los modelos": nuevo precio -> confirmación con la
 * cantidad real de variantes afectadas -> un solo PATCH. La cantidad es la
 * del producto entero, no la de las filas visibles: si hay un filtro de
 * modelo activo la tarjeta muestra menos variantes, pero el cambio pega en todas.
 */
export default function BulkPriceEditor({
  productId,
  productName,
  variantCount,
  onApplied,
}: {
  productId: string;
  productName: string;
  variantCount: number;
  onApplied: (variants: AdminVariant[]) => void;
}) {
  const [step, setStep] = useState<Step>("idle");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const price = Number(text);
  const isValid = text.trim() !== "" && Number.isFinite(price) && price > 0;

  function close() {
    setStep("idle");
    setText("");
    setError(null);
  }

  async function handleApply() {
    setSaving(true);
    setError(null);
    try {
      const res = await updateProductPrice(productId, price);
      onApplied(res.data);
      close();
      setNotice(
        `Precio actualizado a ${formatPrice(price)} en ${
          res.data.length === 1 ? "1 variante" : `${res.data.length} variantes`
        }.`,
      );
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo cambiar el precio.");
    } finally {
      setSaving(false);
    }
  }

  if (step === "idle") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setStep("editing");
          }}
          className={ADMIN_BUTTON_SECONDARY_SM}
        >
          <Tag aria-hidden="true" className="size-3.5" />
          Cambiar precio a todos los modelos
        </button>
        {notice && (
          <p role="status" className="text-xs font-semibold text-emerald-700">
            {notice}
          </p>
        )}
      </div>
    );
  }

  const target = variantCount === 1 ? "la variante" : `las ${variantCount} variantes`;

  // Cada paso con su key: sin eso React reutiliza el <button> de "Continuar"
  // (negro) como "Volver" y se ve la transición de color a mitad de camino,
  // además de dejar el foco en el botón que no es.
  return (
    <div className="space-y-3 rounded-md border border-admin-border bg-admin-bg p-4">
      {step === "editing" ? (
        <div key="editing" className="space-y-3">
          <label htmlFor={`bulk-price-${productId}`} className="block text-sm font-semibold text-admin-text">
            Nuevo precio para {target}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-sm text-admin-muted"
              >
                $
              </span>
              <input
                id={`bulk-price-${productId}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={text}
                autoFocus
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isValid) setStep("confirming");
                  if (e.key === "Escape") close();
                }}
                className="h-10 w-36 rounded-md border border-admin-border bg-white pl-6 pr-3 text-right font-mono text-sm text-admin-text focus-visible:border-black focus-visible:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setStep("confirming")}
              disabled={!isValid}
              className={ADMIN_BUTTON_PRIMARY}
            >
              Continuar
            </button>
            <button type="button" onClick={close} className={ADMIN_BUTTON_SECONDARY}>
              Cancelar
            </button>
          </div>
          {text.trim() !== "" && !isValid && (
            <p className="text-[13px] text-admin-muted">Tiene que ser mayor a 0</p>
          )}
        </div>
      ) : (
        <div key="confirming" className="space-y-3">
          <p className="text-sm text-admin-text">
            Esto cambia el precio de {target} de <strong className="font-semibold">{productName}</strong> a{" "}
            <strong className="font-mono font-semibold">{formatPrice(price)}</strong>, ¿confirmás?
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleApply} disabled={saving} className={ADMIN_BUTTON_PRIMARY}>
              {saving ? "Cambiando…" : "Sí, cambiar precio"}
            </button>
            {/* El foco cae en la opción segura: un Enter de más no aplica el cambio masivo. */}
            <button
              type="button"
              onClick={() => setStep("editing")}
              disabled={saving}
              autoFocus
              className={ADMIN_BUTTON_SECONDARY}
            >
              Volver
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className={ADMIN_ALERT_ERROR}>{error}</p>}
    </div>
  );
}
