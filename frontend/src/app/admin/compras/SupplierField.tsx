"use client";

import { useState } from "react";
import { AdminApiError, createSupplier, type Supplier } from "@/lib/adminApi";
import AdminNotice from "../AdminNotice";
import { ADMIN_INPUT, ADMIN_INSET, ADMIN_LABEL, adminButton, adminInput } from "../adminStyles";

const NEW_SUPPLIER = "__new__";

export default function SupplierField({
  suppliers,
  value,
  onChange,
  onCreated,
  invalid = false,
}: {
  suppliers: Supplier[];
  value: string;
  onChange: (supplierId: string) => void;
  onCreated: (supplier: Supplier) => void;
  /** Falta elegirlo: borde rojo. */
  invalid?: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSelect(next: string) {
    if (next === NEW_SUPPLIER) {
      setCreating(true);
      onChange("");
      return;
    }
    setCreating(false);
    setError(null);
    onChange(next);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await createSupplier({ name: name.trim(), contact_info: contact.trim() });
      onCreated(res.data);
      setCreating(false);
      setName("");
      setContact("");
    } catch (err) {
      setError(
        err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor="proveedor" className={ADMIN_LABEL}>
          Proveedor
        </label>
        <select
          id="proveedor"
          value={creating ? NEW_SUPPLIER : value}
          aria-invalid={invalid || undefined}
          onChange={(e) => handleSelect(e.target.value)}
          className={adminInput({ state: invalid && !creating ? "error" : null })}
        >
          <option value="">Elegí un proveedor</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          <option value={NEW_SUPPLIER}>+ Nuevo proveedor</option>
        </select>
      </div>

      {creating && (
        <div className={`${ADMIN_INSET} flex flex-col gap-3`}>
          <div>
            <label htmlFor="proveedor-nombre" className={ADMIN_LABEL}>
              Nombre
            </label>
            <input
              id="proveedor-nombre"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={ADMIN_INPUT}
            />
          </div>
          <div>
            <label htmlFor="proveedor-contacto" className={ADMIN_LABEL}>
              Datos de contacto (opcional)
            </label>
            <input
              id="proveedor-contacto"
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Teléfono, mail, dirección…"
              className={ADMIN_INPUT}
            />
          </div>
          {error && <AdminNotice kind="danger">{error}</AdminNotice>}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setError(null);
              }}
              className={adminButton("secondary")}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className={adminButton("primary")}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
