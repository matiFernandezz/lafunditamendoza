"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { AdminApiError } from "@/lib/adminApi";
import { ADMIN_INPUT_ADORNMENT, ADMIN_TEXT_MUTED, adminButton, adminInput } from "../adminStyles";

type Kind = "stock" | "price";

const RULES: Record<Kind, { isValid: (n: number) => boolean; hint: string }> = {
  stock: { isValid: (n) => Number.isInteger(n) && n >= 0, hint: "Tiene que ser un entero ≥ 0" },
  price: { isValid: (n) => Number.isFinite(n) && n > 0, hint: "Tiene que ser mayor a 0" },
};

/**
 * Número editable inline (stock o precio de una variante). El guardado es
 * explícito: el botón "Guardar" aparece solo mientras el valor difiere del
 * guardado, para que quede claro cuándo se hizo el PATCH de verdad.
 * El precio lleva "$" adelante y el stock "u." atrás; el rótulo va en
 * aria-label (la fila de encabezados lo muestra en desktop).
 */
export default function VariantNumberInput({
  kind,
  label,
  value,
  save,
  onSaved,
}: {
  kind: Kind;
  label: string;
  value: number;
  save: (n: number) => Promise<unknown>;
  onSaved?: (n: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [lastSaved, setLastSaved] = useState(value);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si el valor cambia desde afuera (p. ej. "cambiar precio a todos los
  // modelos"), el input lo refleja. Se ajusta durante el render, no en un efecto.
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setLastSaved(value);
    setText(String(value));
  }

  const rule = RULES[kind];
  const parsed = Number(text);
  const isValid = text.trim() !== "" && rule.isValid(parsed);
  const dirty = isValid && parsed !== lastSaved;

  async function handleSave() {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      await save(parsed);
      setLastSaved(parsed);
      onSaved?.(parsed);
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="relative">
        {kind === "price" && (
          <span aria-hidden="true" className={`${ADMIN_INPUT_ADORNMENT} left-3`}>
            $
          </span>
        )}
        <input
          type="number"
          inputMode={kind === "price" ? "decimal" : "numeric"}
          min={0}
          step={kind === "price" ? "any" : 1}
          value={text}
          disabled={saving}
          aria-label={label}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          className={adminInput({
            prefix: kind === "price" ? "text" : undefined,
            suffix: kind === "stock",
            align: "right",
            mono: true,
            state: flash ? "ok" : dirty ? "dirty" : null,
          })}
        />
        {kind === "stock" && (
          <span aria-hidden="true" className={`${ADMIN_INPUT_ADORNMENT} right-3.5`}>
            u.
          </span>
        )}
      </div>
      {dirty && (
        <button type="button" onClick={handleSave} disabled={saving} className={`${adminButton("primary", "sm")} w-full`}>
          {saving ? "Guardando…" : "Guardar"}
        </button>
      )}
      {flash && !dirty && (
        <span role="status" className="flex items-center justify-end gap-1 text-[13px] font-semibold text-admin-ok">
          <Check aria-hidden="true" className="size-4" />
          Guardado
        </span>
      )}
      {error && (
        <p role="alert" className="text-[13px] font-medium text-admin-danger">
          {error}
        </p>
      )}
      {!isValid && text.trim() !== "" && !error && <p className={ADMIN_TEXT_MUTED}>{rule.hint}</p>}
    </div>
  );
}
