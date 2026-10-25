"use client";

import { Link2, Plus, X } from "lucide-react";
import { useState } from "react";
import { AdminApiError } from "@/lib/adminApi";
import AdminNotice from "../AdminNotice";
import { ADMIN_TEXT_MUTED, adminButton, adminChip } from "../adminStyles";

type Model = { id: string; name: string };

/**
 * Armado de grupos de modelos que comparten stock (13 + 14; toda la línea 18).
 * Lo usan la ficha de un producto y "Stock compartido" (aplicar a todos). Al
 * guardar, primero pregunta qué cambiaría (preview) y pide confirmar.
 */
export default function StockGroupsEditor({
  models,
  initialGroups,
  preview,
  apply,
  saveLabel,
  onSaved,
}: {
  /** Modelos que se pueden agrupar, en orden. */
  models: Model[];
  initialGroups: string[][];
  /** Qué pasaría al guardar estos grupos (texto para confirmar). */
  preview: (groups: string[][]) => Promise<string>;
  apply: (groups: string[][]) => Promise<string>;
  saveLabel: string;
  onSaved: (message: string) => void;
}) {
  const [groups, setGroups] = useState<string[][]>(initialGroups);
  const [picking, setPicking] = useState<string[] | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameOf = new Map(models.map((m) => [m.id, m.name]));
  const used = new Set(groups.flat());
  const free = models.filter((m) => !used.has(m.id));
  const dirty = JSON.stringify(groups) !== JSON.stringify(initialGroups);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.length === 0 ? (
        <p className={ADMIN_TEXT_MUTED}>Ningún modelo comparte stock: cada uno tiene el suyo.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((group, index) => (
            <li
              key={group.join()}
              className="flex items-center justify-between gap-3 rounded-md border border-admin-border bg-admin-bg px-3 py-2"
            >
              <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-admin-text">
                <Link2 aria-hidden="true" className="size-4 text-admin-muted" />
                {group.map((id) => nameOf.get(id) ?? "Modelo").join(" + ")}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setGroups((g) => g.filter((_, i) => i !== index));
                  setConfirm(null);
                }}
                aria-label="Separar este grupo"
                title="Separar (cada modelo vuelve a tener su stock)"
                className={adminButton("ghost", "sm")}
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {picking ? (
        <div className="flex flex-col gap-2 rounded-md border border-admin-border p-3">
          <p className="text-sm font-semibold text-admin-text">Tocá los modelos que comparten las mismas fundas</p>
          <div className="flex flex-wrap gap-1.5">
            {free.map((m) => {
              const on = picking.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPicking((p) => (on ? p!.filter((id) => id !== m.id) : [...p!, m.id]))}
                  className={adminChip(on)}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPicking(null)} className={adminButton("ghost", "sm")}>
              Cancelar
            </button>
            <button
              type="button"
              disabled={picking.length < 2}
              onClick={() => {
                // En el orden de la lista de modelos.
                setGroups((g) => [...g, models.filter((m) => picking.includes(m.id)).map((m) => m.id)]);
                setPicking(null);
                setConfirm(null);
              }}
              className={adminButton("primary", "sm")}
            >
              Agregar grupo
            </button>
          </div>
        </div>
      ) : (
        free.length >= 2 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setPicking([])}
            className={`${adminButton("secondary", "sm")} self-start`}
          >
            <Plus aria-hidden="true" className="size-4" />
            Nuevo grupo
          </button>
        )
      )}

      {error && <AdminNotice kind="danger">{error}</AdminNotice>}

      {confirm ? (
        <div className="flex flex-col gap-2 rounded-md border border-admin-border-strong bg-admin-bg p-3">
          <p className="text-sm text-admin-text">{confirm}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirm(null)}
              className={adminButton("ghost", "sm")}
            >
              Volver
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const message = await apply(groups);
                  setConfirm(null);
                  onSaved(message);
                })
              }
              className={adminButton("primary", "sm")}
            >
              {busy ? "Guardando…" : "Confirmar"}
            </button>
          </div>
        </div>
      ) : (
        dirty && (
          <button
            type="button"
            disabled={busy || picking !== null}
            onClick={() =>
              run(async () => {
                setConfirm(await preview(groups));
              })
            }
            className={`${adminButton("primary", "sm")} self-end`}
          >
            {busy ? "Revisando…" : saveLabel}
          </button>
        )
      )}
    </div>
  );
}
