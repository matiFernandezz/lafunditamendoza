"use client";

import { useState } from "react";
import { AdminApiError, updateVariantStock } from "@/lib/adminApi";

/**
 * Input de stock editable inline. El guardado es explícito (botón "Guardar",
 * habilitado solo mientras el valor difiere del guardado) para que quede
 * claro cuándo se hizo el PATCH de verdad, en vez de un auto-save en el blur
 * que no daba feedback suficiente.
 */
export default function StockInput({
  variantId,
  initialStock,
}: {
  variantId: string;
  initialStock: number;
}) {
  const [value, setValue] = useState(String(initialStock));
  const [lastSaved, setLastSaved] = useState(initialStock);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = Number(value);
  const isValid = value.trim() !== "" && Number.isInteger(parsed) && parsed >= 0;
  const dirty = isValid && parsed !== lastSaved;

  async function handleSave() {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateVariantStock(variantId, parsed);
      setLastSaved(parsed);
      setFlash(true);
      setTimeout(() => setFlash(false), 900);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={value}
          disabled={saving}
          aria-label="Stock"
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          className={`h-11 w-20 rounded-xl border bg-transparent px-2 text-right font-mono text-base transition-colors disabled:opacity-60 ${
            flash ? "border-emerald-600" : dirty ? "border-ink" : "border-graphite"
          }`}
        />
        {dirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-11 shrink-0 rounded-xl bg-ink px-3 text-sm font-semibold text-paper disabled:opacity-40"
          >
            {saving ? "…" : "Guardar"}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      {!isValid && value.trim() !== "" && !error && (
        <p className="text-xs text-graphite">Tiene que ser un entero ≥ 0</p>
      )}
    </div>
  );
}
