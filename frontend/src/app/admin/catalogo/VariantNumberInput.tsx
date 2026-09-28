"use client";

import { useState } from "react";
import { AdminApiError } from "@/lib/adminApi";
import { ADMIN_BUTTON_PRIMARY, ADMIN_TEXT_MUTED } from "../adminStyles";

type Kind = "stock" | "price";

const RULES: Record<Kind, { isValid: (n: number) => boolean; hint: string }> = {
  stock: { isValid: (n) => Number.isInteger(n) && n >= 0, hint: "Tiene que ser un entero ≥ 0" },
  price: { isValid: (n) => Number.isFinite(n) && n > 0, hint: "Tiene que ser mayor a 0" },
};

/**
 * Número editable inline (stock o precio de una variante). El guardado es
 * explícito: el botón "Guardar" aparece solo mientras el valor difiere del
 * guardado, para que quede claro cuándo se hizo el PATCH de verdad.
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
      setTimeout(() => setFlash(false), 900);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-admin-muted">{label}</span>
      <div className="flex items-center gap-2">
        <div className="relative">
          {kind === "price" && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-2 flex items-center font-mono text-sm text-admin-muted"
            >
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
            className={`h-9 rounded-md border bg-white px-2 text-right font-mono text-sm text-admin-text transition-colors disabled:opacity-60 ${
              kind === "price" ? "w-28 pl-5" : "w-20"
            } ${flash ? "border-emerald-600" : dirty ? "border-black" : "border-admin-border"}`}
          />
        </div>
        {dirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`${ADMIN_BUTTON_PRIMARY} h-9 px-3 text-xs`}
          >
            {saving ? "…" : "Guardar"}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-admin-danger">
          {error}
        </p>
      )}
      {!isValid && text.trim() !== "" && !error && <p className={ADMIN_TEXT_MUTED}>{rule.hint}</p>}
    </div>
  );
}
