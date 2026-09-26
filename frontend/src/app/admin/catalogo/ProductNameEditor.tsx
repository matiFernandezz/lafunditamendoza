"use client";

import { useState } from "react";
import { AdminApiError, updateProductName } from "@/lib/adminApi";

/** Nombre del producto con edición inline: un botón para entrar en modo edición, guardado explícito. */
export default function ProductNameEditor({
  productId,
  name,
  onSaved,
}: {
  productId: string;
  name: string;
  onSaved: (newName: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setValue(name);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  async function handleSave() {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProductName(productId, trimmed);
      onSaved(trimmed);
      setEditing(false);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo guardar el nombre.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold">{name}</h3>
        <button
          type="button"
          onClick={startEditing}
          className="text-sm font-medium text-graphite underline underline-offset-2"
        >
          Editar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          disabled={saving}
          autoFocus
          className="h-10 min-w-0 flex-1 rounded-xl border border-graphite bg-transparent px-3 text-base disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || value.trim() === ""}
          className="h-10 shrink-0 rounded-xl bg-ink px-3 text-sm font-semibold text-paper disabled:opacity-40"
        >
          {saving ? "…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          className="h-10 shrink-0 rounded-xl border border-ink px-3 text-sm font-medium disabled:opacity-40"
        >
          Cancelar
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
