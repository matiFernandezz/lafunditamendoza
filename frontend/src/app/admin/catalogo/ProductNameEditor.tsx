"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { AdminApiError, updateProductName } from "@/lib/adminApi";
import AdminNotice from "../AdminNotice";
import { adminButton, adminInput } from "../adminStyles";

/**
 * Nombre del producto editable en el lugar. El guardado es explícito: el botón
 * "Guardar" aparece solo mientras el texto difiere del nombre guardado.
 */
export default function ProductNameEditor({
  productId,
  name,
  onSaved,
}: {
  productId: string;
  name: string;
  onSaved: (newName: string) => void;
}) {
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si el nombre cambia desde afuera, el input lo refleja. Se ajusta durante
  // el render, no en un efecto.
  const [prevName, setPrevName] = useState(name);
  if (prevName !== name) {
    setPrevName(name);
    setValue(name);
  }

  const trimmed = value.trim();
  const dirty = trimmed !== "" && trimmed !== name;

  async function handleSave() {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateProductName(productId, trimmed);
      onSaved(trimmed);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo guardar el nombre.");
    } finally {
      setSaving(false);
    }
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
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setValue(name);
          }}
          disabled={saving}
          aria-label="Nombre del producto"
          className={`${adminInput({ state: dirty ? "dirty" : saved ? "ok" : null })} flex-1`}
        />
        {dirty ? (
          <button type="button" onClick={handleSave} disabled={saving} className={adminButton("primary")}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        ) : (
          saved && (
            <span role="status" className="flex shrink-0 items-center gap-1.5 text-[15px] font-semibold text-admin-ok">
              <Check aria-hidden="true" className="size-[18px]" />
              Guardado
            </span>
          )
        )}
      </div>
      {error && <AdminNotice kind="danger">{error}</AdminNotice>}
    </div>
  );
}
