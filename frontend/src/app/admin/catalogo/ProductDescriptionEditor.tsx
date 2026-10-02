"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { AdminApiError, updateProductDescription } from "@/lib/adminApi";
import AdminNotice from "../AdminNotice";
import { ADMIN_TEXTAREA, ADMIN_TEXT_MUTED, adminButton } from "../adminStyles";

const MAX_LENGTH = 1000;

/**
 * Descripción que se ve en la ficha del producto en la tienda. Guardado
 * explícito: "Guardar" aparece solo cuando el texto cambió. Vacía = sin descripción.
 */
export default function ProductDescriptionEditor({
  productId,
  description,
  onSaved,
}: {
  productId: string;
  description: string | null;
  onSaved: (description: string | null) => void;
}) {
  const saved = description ?? "";
  const [value, setValue] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si la descripción cambia desde afuera, el textarea la refleja (ajuste en el render).
  const [prevSaved, setPrevSaved] = useState(saved);
  if (prevSaved !== saved) {
    setPrevSaved(saved);
    setValue(saved);
  }

  const dirty = value.trim() !== saved.trim();

  async function handleSave() {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await updateProductDescription(productId, value);
      onSaved(res.data.description);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1200);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo guardar la descripción.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        disabled={saving}
        rows={4}
        maxLength={MAX_LENGTH}
        aria-label="Descripción del producto"
        placeholder="Ej.: funda de silicona suave, con protección de cámara. Se ve en la ficha del producto."
        className={`${ADMIN_TEXTAREA} min-h-28`}
      />
      <div className="flex items-center justify-between gap-3">
        <span className={ADMIN_TEXT_MUTED}>
          {value.length}/{MAX_LENGTH}
        </span>
        {dirty ? (
          <button type="button" onClick={handleSave} disabled={saving} className={adminButton("primary", "sm")}>
            {saving ? "Guardando…" : "Guardar descripción"}
          </button>
        ) : (
          justSaved && (
            <span role="status" className="flex items-center gap-1.5 text-sm font-semibold text-admin-ok">
              <Check aria-hidden="true" className="size-4" />
              Guardada
            </span>
          )
        )}
      </div>
      {error && <AdminNotice kind="danger">{error}</AdminNotice>}
    </div>
  );
}
