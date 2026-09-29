"use client";

import { Tag } from "lucide-react";
import { useState } from "react";
import { AdminApiError, updateProductPrice, type AdminVariant } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import AdminNotice from "../AdminNotice";
import {
  ADMIN_BODY,
  ADMIN_INPUT_ADORNMENT,
  ADMIN_INSET,
  ADMIN_LABEL,
  ADMIN_TEXT_MUTED,
  adminButton,
  adminInput,
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
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setStep("editing");
          }}
          className={`${adminButton("secondary")} w-full`}
        >
          <Tag aria-hidden="true" className="size-[18px]" />
          Cambiar precio a todos los modelos
        </button>
        {notice && (
          <p role="status" className="text-sm font-semibold text-admin-ok">
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
    <div className={`${ADMIN_INSET} flex flex-col gap-3`}>
      {step === "editing" ? (
        <div key="editing" className="flex flex-col gap-3">
          <div>
            <label htmlFor={`bulk-price-${productId}`} className={ADMIN_LABEL}>
              Nuevo precio para {target}
            </label>
            <div className="relative">
              <span aria-hidden="true" className={`${ADMIN_INPUT_ADORNMENT} left-3`}>
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
                placeholder="0"
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isValid) setStep("confirming");
                  if (e.key === "Escape") close();
                }}
                className={adminInput({ prefix: "text", mono: true })}
              />
            </div>
            {text.trim() !== "" && !isValid && <p className={`mt-1.5 ${ADMIN_TEXT_MUTED}`}>Tiene que ser mayor a 0</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={close} className={adminButton("secondary")}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => setStep("confirming")}
              disabled={!isValid}
              className={adminButton("primary")}
            >
              Continuar
            </button>
          </div>
        </div>
      ) : (
        <div key="confirming" className="flex flex-col gap-3">
          <p className={ADMIN_BODY}>
            Esto cambia el precio de {target} de <strong className="font-semibold">{productName}</strong> a{" "}
            <strong className="font-mono font-semibold">{formatPrice(price)}</strong>. ¿Confirmás?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {/* El foco cae en la opción segura: un Enter de más no aplica el cambio masivo. */}
            <button
              type="button"
              onClick={() => setStep("editing")}
              disabled={saving}
              autoFocus
              className={adminButton("secondary")}
            >
              Volver
            </button>
            <button type="button" onClick={handleApply} disabled={saving} className={adminButton("primary")}>
              {saving ? "Cambiando…" : "Sí, cambiar"}
            </button>
          </div>
        </div>
      )}
      {error && <AdminNotice kind="danger">{error}</AdminNotice>}
    </div>
  );
}
