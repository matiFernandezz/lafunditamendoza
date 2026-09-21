"use client";

import { useState } from "react";
import { AdminApiError, createSupplier, type Supplier } from "@/lib/adminApi";

const NEW_SUPPLIER = "__new__";

const inputClass =
  "h-14 w-full rounded-2xl border border-graphite bg-transparent px-4 text-base";

export default function SupplierField({
  suppliers,
  value,
  onChange,
  onCreated,
}: {
  suppliers: Supplier[];
  value: string;
  onChange: (supplierId: string) => void;
  onCreated: (supplier: Supplier) => void;
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
    <div className="space-y-3">
      <div>
        <label htmlFor="proveedor" className="mb-1 block text-base font-medium">
          Proveedor
        </label>
        <select
          id="proveedor"
          value={creating ? NEW_SUPPLIER : value}
          onChange={(e) => handleSelect(e.target.value)}
          className={inputClass}
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
        <div className="space-y-3 rounded-2xl border border-rule p-4">
          <div>
            <label htmlFor="proveedor-nombre" className="mb-1 block text-base font-medium">
              Nombre
            </label>
            <input
              id="proveedor-nombre"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="proveedor-contacto" className="mb-1 block text-base font-medium">
              Datos de contacto (opcional)
            </label>
            <input
              id="proveedor-contacto"
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Teléfono, mail, dirección…"
              className={inputClass}
            />
          </div>
          {error && (
            <p role="alert" className="rounded-2xl border border-ink p-3 text-base font-medium">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setError(null);
              }}
              className="h-14 rounded-2xl border border-ink text-base font-medium active:bg-rule"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="h-14 rounded-2xl bg-ink text-base font-semibold text-paper disabled:opacity-40"
            >
              {saving ? "Guardando…" : "Guardar proveedor"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
