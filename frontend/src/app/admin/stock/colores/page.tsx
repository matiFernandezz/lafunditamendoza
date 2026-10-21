"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { AdminApiError, createColor, createMotif, type AttributeKind } from "@/lib/adminApi";
import AdminNotice from "../../AdminNotice";
import AttributeManager from "../../AttributeManager";
import { ADMIN_PAGE_SUBTITLE, ADMIN_PAGE_TITLE, adminButton, adminInput } from "../../adminStyles";
import { KIND_TEXT, reloadLibrary, useAttributeLibrary } from "../../attributeLibrary";
import PeriodSwitch from "../../PeriodSwitch";

const TABS = [
  { value: "color", label: "Colores" },
  { value: "motif", label: "Diseños" },
] as const satisfies readonly { value: AttributeKind; label: string }[];

/**
 * La lista única de colores y de diseños que usan todos los productos:
 * crear, renombrar, cambiar el tono, unir repetidos y borrar los que no se usan.
 */
export default function ColoresPage() {
  const [kind, setKind] = useState<AttributeKind>("color");
  const library = useAttributeLibrary();
  const text = KIND_TEXT[kind];
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#9ca3af");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim() === "" || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (kind === "color") await createColor({ name: name.trim(), hex });
      else await createMotif(name.trim());
      await reloadLibrary();
      setNotice(`Se creó “${name.trim()}”. Ya se puede elegir al agregar variantes.`);
      setName("");
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  const count = kind === "color" ? library.colors.length : library.motifs.length;

  return (
    <div className="flex max-w-[760px] flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={ADMIN_PAGE_TITLE}>Colores y diseños</h1>
          <p className={ADMIN_PAGE_SUBTITLE}>
            Una sola lista para todos los productos: si un color se repite con otro nombre, unilos acá.
          </p>
        </div>
        <PeriodSwitch
          label="Qué editar"
          options={TABS}
          value={kind}
          onChange={(next) => {
            setKind(next);
            setError(null);
            setNotice(null);
          }}
        />
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-2 rounded-lg border border-admin-border bg-admin-surface p-4 sm:flex-row sm:items-center"
      >
        <span className="text-sm font-semibold text-admin-text sm:w-32">{text.new}</span>
        <div className="flex flex-1 items-center gap-2">
          {kind === "color" && (
            <input
              type="color"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              aria-label="Tono del color nuevo"
              className="h-12 w-12 shrink-0 cursor-pointer rounded-md border border-admin-border-strong bg-admin-surface p-1"
            />
          )}
          <input
            type="text"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === "color" ? "Ej.: Verde salvia" : "Ej.: Stitch, Flores, Cuadrillé"}
            aria-label={`Nombre del ${text.one} nuevo`}
            className={adminInput()}
          />
          <button type="submit" disabled={saving || name.trim() === ""} className={adminButton("primary")}>
            <Plus aria-hidden="true" className="size-5" />
            Crear
          </button>
        </div>
      </form>

      {notice && (
        <AdminNotice kind="ok" onClose={() => setNotice(null)}>
          {notice}
        </AdminNotice>
      )}
      {error && (
        <AdminNotice kind="danger" onClose={() => setError(null)}>
          {error}
        </AdminNotice>
      )}

      <p className="text-sm text-admin-muted">
        {count === 1 ? `1 ${text.one}` : `${count} ${text.many}`}. Cambiá el nombre o el tono y guardá; los productos y la
        web se actualizan solos.
      </p>

      <AttributeManager key={kind} kind={kind} inline />
    </div>
  );
}
