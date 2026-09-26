"use client";

import { useRef, useState } from "react";
import { AdminApiError, updateVariantStock } from "@/lib/adminApi";

/** Input de stock editable inline: guarda solo al perder foco, sin recargar la página. */
export default function StockInput({
  variantId,
  initialStock,
}: {
  variantId: string;
  initialStock: number;
}) {
  const [value, setValue] = useState(String(initialStock));
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSavedRef = useRef(initialStock);

  async function handleBlur() {
    const parsed = Number(value);

    if (value.trim() === "" || !Number.isInteger(parsed) || parsed < 0) {
      setError("Tiene que ser un entero ≥ 0");
      setValue(String(lastSavedRef.current));
      return;
    }

    if (parsed === lastSavedRef.current) return;

    setSaving(true);
    setError(null);
    try {
      await updateVariantStock(variantId, parsed);
      lastSavedRef.current = parsed;
      setFlash(true);
      setTimeout(() => setFlash(false), 900);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo guardar.");
      setValue(String(lastSavedRef.current));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
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
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className={`h-11 w-20 rounded-xl border bg-transparent px-2 text-right font-mono text-base transition-colors disabled:opacity-60 ${
          flash ? "border-emerald-600" : "border-graphite"
        }`}
      />
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
