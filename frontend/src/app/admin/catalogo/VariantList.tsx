"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { AdminApiError, deleteVariant, type AdminProduct, type AdminVariant } from "@/lib/adminApi";
import { UNIVERSAL_LABEL, filterBySearch, variantHaystack } from "@/lib/variantSearch";
import AdminNotice from "../AdminNotice";
import { MoneyInput, UnitsInput } from "../GridInputs";
import SearchBox from "../SearchBox";
import {
  ADMIN_CAP,
  ADMIN_EMPTY,
  ADMIN_TEXT_MUTED,
  adminBadge,
  adminButton,
  adminIconButton,
} from "../adminStyles";
import { displayColor } from "../ventas/utils";
import { draftChanges, type CatalogDraft } from "./catalogDraft";

const ROW = "grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_44px] items-start gap-2 lg:grid-cols-[minmax(0,1fr)_104px_132px_44px]";

/**
 * Lista de variantes de un producto: buscador (modelo, color / motivo /
 * descripción y SKU), stock y precio editables y "Eliminar" en cada fila.
 * Eliminar borra la variante; si ya tenía ventas, compras o reservas, la deja
 * solo en el historial. En los dos casos desaparece de todo el panel.
 */
export default function VariantList({
  product,
  variants,
  draft,
  onDraftChange,
  modelNameById,
  saving,
  attrFilter,
  onClearAttrFilter,
  onAddVariant,
  onChanged,
}: {
  product: AdminProduct;
  /** Las variantes que pasan los filtros de la pantalla (modelo, stock). */
  variants: AdminVariant[];
  draft: CatalogDraft;
  onDraftChange: (update: (draft: CatalogDraft) => CatalogDraft) => void;
  modelNameById: Map<string, string>;
  saving: boolean;
  /** Color o motivo elegido en el resumen de la izquierda: filtra la lista. */
  attrFilter: { id: string; name: string } | null;
  onClearAttrFilter: () => void;
  onAddVariant: () => void;
  /** Se eliminó una variante: `message` dice qué pasó, para mostrar y refrescar. */
  onChanged: (message: string) => void;
}) {
  const [search, setSearch] = useState("");
  // Variante con stock esperando confirmación para eliminarla.
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const all = product.product_variants;
  const changes = draftChanges(product, draft);
  const modelOf = (v: AdminVariant) => (v.iphone_model_id ? modelNameById.get(v.iphone_model_id) ?? "" : UNIVERSAL_LABEL);
  const labelOf = (v: AdminVariant) => [modelOf(v), displayColor(v.color)].filter(Boolean).join(" · ");

  const byAttr = attrFilter
    ? variants.filter((v) => v.color_id === attrFilter.id || v.motif_id === attrFilter.id)
    : variants;
  const visible = filterBySearch(byAttr, search, (v) => variantHaystack(modelOf(v), v.color, v.sku));

  async function remove(variant: AdminVariant, force: boolean) {
    setBusyId(variant.id);
    setError(null);
    try {
      const { data } = await deleteVariant(variant.id, force);
      if (data.blocked) {
        // Cambió el stock desde que se cargó la lista: se pide confirmar.
        setConfirmId(variant.id);
        return;
      }
      setConfirmId(null);
      onChanged(
        data.archived
          ? `Se eliminó ${labelOf(variant)}. Ya tenía ventas, así que se conserva solo en el historial.`
          : `Se eliminó ${labelOf(variant)}.`,
      );
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="flex min-w-0 flex-col gap-2.5">
      <h3 className={ADMIN_CAP}>
        Variantes ({variants.length}
        {variants.length !== all.length ? ` de ${all.length}` : ""})
      </h3>

      {all.length > 0 && (
        <SearchBox
          value={search}
          onChange={setSearch}
          shown={visible.length}
          total={byAttr.length}
          label={`Buscar variante de ${product.name}`}
          placeholder="Buscar: 16 pro azul, SKU…"
        />
      )}

      {attrFilter && (
        <p className="flex flex-wrap items-center gap-2 text-[13px] text-admin-text">
          Solo <strong className="font-semibold">{attrFilter.name}</strong> ({byAttr.length})
          <button
            type="button"
            onClick={onClearAttrFilter}
            className="font-semibold underline underline-offset-2"
          >
            Ver todas
          </button>
        </p>
      )}

      {error && <AdminNotice kind="danger">{error}</AdminNotice>}

      {all.length === 0 ? (
        <p className={ADMIN_EMPTY}>Todavía no tiene variantes. Agregale la primera.</p>
      ) : (
        <div className={`hidden text-xs text-admin-muted lg:grid ${ROW}`}>
          <span>Modelo · color · SKU</span>
          <span className="text-right">Stock</span>
          <span className="text-right">Precio</span>
          <span />
        </div>
      )}

      {all.length > 0 && visible.length === 0 && (
        <p className={ADMIN_TEXT_MUTED}>Ninguna variante coincide con la búsqueda.</p>
      )}

      <ul className="divide-y divide-admin-border">
        {visible.map((v) => {
          const detail = labelOf(v);
          const patch = changes.variants.find((p) => p.id === v.id);
          const confirming = confirmId === v.id;
          const busy = busyId === v.id;
          return (
            <li key={v.id} className={`py-3 first:pt-0 ${ROW}`}>
              <div className="col-span-2 min-w-0 lg:col-span-1 lg:self-center">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold text-admin-text">{detail}</span>
                  {v.stock_quantity === 0 && <span className={adminBadge("danger")}>Sin stock</span>}
                </span>
                <span className="mt-0.5 block font-mono text-xs text-admin-muted">{v.sku}</span>
              </div>
              <button
                type="button"
                // Sin stock se elimina directo; con stock primero se confirma.
                onClick={() => (v.stock_quantity > 0 ? setConfirmId(v.id) : remove(v, false))}
                disabled={saving || busy}
                aria-label={`Eliminar ${detail}`}
                title="Eliminar"
                className={`row-start-1 lg:col-start-4 ${adminIconButton("danger")} col-start-3`}
              >
                <Trash2 aria-hidden="true" className="size-[18px]" />
              </button>
              <UnitsInput
                label={`Stock ${detail}`}
                value={draft.stock[v.id] ?? String(v.stock_quantity)}
                disabled={saving}
                invalid={changes.invalid.has(`${v.id}:stock`)}
                dirty={patch?.stock_quantity !== undefined}
                onChange={(value) => onDraftChange((d) => ({ ...d, stock: { ...d.stock, [v.id]: value } }))}
              />
              <MoneyInput
                className="col-span-2 lg:col-span-1"
                label={`Precio ${detail}`}
                value={draft.price[v.id] ?? String(v.price)}
                disabled={saving}
                invalid={changes.invalid.has(`${v.id}:price`)}
                dirty={patch?.price !== undefined}
                onChange={(value) => onDraftChange((d) => ({ ...d, price: { ...d.price, [v.id]: value } }))}
              />

              {confirming && (
                <div className="col-span-full flex flex-col gap-2 rounded-md border border-admin-danger-border bg-admin-danger-bg p-3">
                  <p className="text-sm font-medium text-admin-danger">
                    Tiene {v.stock_quantity === 1 ? "1 unidad" : `${v.stock_quantity} unidades`} en stock que se{" "}
                    {v.stock_quantity === 1 ? "pierde" : "pierden"} al eliminarla.
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      disabled={busy}
                      className={adminButton("secondary", "sm")}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(v, true)}
                      disabled={busy}
                      className={adminButton("danger", "sm")}
                    >
                      {busy ? "Eliminando…" : "Eliminar igual"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <button type="button" onClick={onAddVariant} className={`${adminButton("secondary")} w-full`}>
        <Plus aria-hidden="true" className="size-[18px]" />
        Agregar variante
      </button>
    </section>
  );
}
