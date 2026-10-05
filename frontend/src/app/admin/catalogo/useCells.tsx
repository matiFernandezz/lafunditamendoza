"use client";

import { useState } from "react";
import { AdminApiError, applyCells, type AttributeKind, type CellsResult } from "@/lib/adminApi";
import AdminNotice from "../AdminNotice";
import { ADMIN_BODY, ADMIN_INSET, adminButton } from "../adminStyles";

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

type Attr = { id: string; name: string };

// Algo que hay que confirmar antes de aplicarlo.
type Pending =
  /** Primer color/motivo: se asigna a las variantes que el producto ya tiene. */
  | { type: "assign"; attr: Attr; models: (string | null)[]; preview: CellsResult }
  /** Dar de baja variantes que tienen stock. */
  | { type: "stock"; attr: Attr; models: (string | null)[]; preview: CellsResult };

/**
 * Acciones sobre las celdas (modelo × color o motivo) de un producto, para la
 * matriz y para la lista simple de motivos. Tildar crea o reactiva la variante
 * sin preguntar (nace con stock 0). Hay dos casos que piden confirmación:
 * dar de baja algo con stock, y el primer color/motivo de un producto que no
 * tenía ninguno, que se asigna a sus variantes actuales.
 */
export function useCells({
  productId,
  kind,
  onChanged,
}: {
  productId: string;
  kind: AttributeKind;
  /** Se aplicó un cambio: hay que volver a pedir los productos. */
  onChanged: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const noun = kind === "color" ? "color" : "motivo";

  function describe(attr: Attr, result: CellsResult): string {
    if (result.assigned > 0) {
      return `${result.assigned === 1 ? "La variante pasó" : `Las ${result.assigned} variantes pasaron`} a ser ${attr.name}.`;
    }
    const parts = [
      result.created > 0 && plural(result.created, "variante nueva con stock 0", "variantes nuevas con stock 0"),
      result.reactivated > 0 && plural(result.reactivated, "reactivada", "reactivadas"),
      result.deactivated > 0 && plural(result.deactivated, "dada de baja", "dadas de baja"),
    ].filter(Boolean);
    return parts.length > 0 ? `${attr.name}: ${parts.join(", ")}.` : `${attr.name}: sin cambios.`;
  }

  async function call(attr: Attr, models: (string | null)[], active: boolean, force = false) {
    const { data } = await applyCells(productId, { kind, attrId: attr.id, models, active, force });
    if (data.blocked) {
      setPending({ type: "stock", attr, models, preview: data });
      return;
    }
    setPending(null);
    setStatus(describe(attr, data));
    await onChanged();
  }

  async function guard(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  }

  /** Tildar (active true) o destildar celdas. */
  const set = (attr: Attr, models: (string | null)[], active: boolean) => guard(() => call(attr, models, active));

  /**
   * Agregar un color/motivo a un producto que todavía no tiene ninguno: primero
   * se pregunta qué pasaría y se pide confirmar. Devuelve false si no era ese
   * caso (el producto ya tiene alguno) y no hizo nada.
   */
  async function assignFirst(attr: Attr, models: (string | null)[]): Promise<boolean> {
    let handled = false;
    await guard(async () => {
      const { data } = await applyCells(productId, { kind, attrId: attr.id, models, active: true, dryRun: true });
      if (data.assigned > 0) {
        setPending({ type: "assign", attr, models, preview: data });
        handled = true;
      }
    });
    return handled;
  }

  const confirm = () =>
    guard(async () => {
      if (!pending) return;
      await call(pending.attr, pending.models, pending.type === "assign", pending.type === "stock");
    });

  const panel = (
    <>
      {pending && (
        <div className={`${ADMIN_INSET} flex flex-col gap-3`}>
          {pending.type === "assign" ? (
            <p className={ADMIN_BODY}>
              {pending.preview.assigned === 1
                ? "La variante actual pasa"
                : `Las ${pending.preview.assigned} variantes actuales pasan`}{" "}
              a ser <strong className="font-semibold">{pending.attr.name}</strong>. Stock actual:{" "}
              {plural(pending.preview.units, "unidad", "unidades")}. Conservan su stock, precio y SKU; no se crea
              ninguna variante nueva. Después destildá los modelos que no vengan en ese {noun}.
            </p>
          ) : (
            <div className="flex flex-col gap-1 text-sm">
              <p className={ADMIN_BODY}>
                Dar de baja {pending.attr.name} en {plural(pending.models.length, "modelo", "modelos")}. No se borra
                nada: el historial queda igual.
              </p>
              <p className="font-medium text-admin-danger">
                Hay {plural(pending.preview.units, "unidad", "unidades")} en stock que{" "}
                {pending.preview.units === 1 ? "dejará" : "dejarán"} de venderse:
              </p>
              <ul className="text-admin-danger">
                {pending.preview.with_stock.map((v) => (
                  <li key={v.id}>
                    {v.model ?? "Sin modelo"} · <span className="font-mono text-xs">{v.sku}</span> · {v.stock} u.
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <button type="button" onClick={() => setPending(null)} disabled={busy} className={adminButton("secondary")}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={busy}
              className={adminButton(pending.type === "stock" ? "danger" : "primary")}
            >
              {busy ? "Aplicando…" : pending.type === "assign" ? `Asignar ${pending.attr.name}` : "Dar de baja igual"}
            </button>
          </div>
        </div>
      )}
      {error && <AdminNotice kind="danger">{error}</AdminNotice>}
      {status && !pending && !error && (
        <p role="status" className="text-[13px] font-semibold text-admin-ok">
          {status}
        </p>
      )}
    </>
  );

  return { busy, pending, set, assignFirst, panel };
}
