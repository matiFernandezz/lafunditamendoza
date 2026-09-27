"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { AdminApiError, updateProductName } from "@/lib/adminApi";
import {
  ADMIN_ALERT_ERROR,
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_SECONDARY,
  ADMIN_NAME,
} from "../adminStyles";

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
        <h3 className={ADMIN_NAME}>{name}</h3>
        <button
          type="button"
          onClick={startEditing}
          title="Editar nombre del producto"
          aria-label="Editar nombre del producto"
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-admin-border bg-white px-2.5 text-xs font-semibold text-admin-text transition-colors hover:bg-admin-bg"
        >
          <Pencil aria-hidden="true" className="size-3.5" />
          Editar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
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
          aria-label="Nombre del producto"
          className="h-9 min-w-0 flex-1 rounded-md border-2 border-black bg-white px-3 text-sm text-admin-text outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || value.trim() === ""}
          className={`${ADMIN_BUTTON_PRIMARY} h-9 px-3 text-xs`}
        >
          {saving ? "…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          className={`${ADMIN_BUTTON_SECONDARY} h-9 px-3 text-xs`}
        >
          Cancelar
        </button>
      </div>
      {error && <p role="alert" className={ADMIN_ALERT_ERROR}>{error}</p>}
    </div>
  );
}
