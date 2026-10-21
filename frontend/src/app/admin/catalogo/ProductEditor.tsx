"use client";

import { Check, ImageOff } from "lucide-react";
import { useState } from "react";
import type { AdminProduct, AdminProductImage, AdminVariant } from "@/lib/adminApi";
import { colorsWithoutPhotos, motifsWithoutPhotos } from "@/lib/productColors";
import AdminNotice from "../AdminNotice";
import { ColorDot } from "../ColorField";
import { MoneyInput } from "../GridInputs";
import { ADMIN_CAP, ADMIN_TEXTAREA, ADMIN_TEXT_MUTED, adminButton, adminInput } from "../adminStyles";
import { useAttributeLibrary } from "../attributeLibrary";
import { foldName } from "../similarNames";
import ProductImageGallery from "./ProductImageGallery";
import VariantList from "./VariantList";
import { draftChanges, type CatalogDraft } from "./catalogDraft";

const MAX_DESCRIPTION = 1000;
// Con más colores que esto aparece el buscador de la fila de colores.
const SEARCH_FROM = 12;

/**
 * Un producto en Stock. Arriba, sus colores (o diseños) UNA sola vez: elegir
 * uno filtra sus variantes y muestra sus fotos; "Todos" muestra todas las
 * variantes y las fotos generales. Debajo, a la izquierda las fotos y los
 * datos; a la derecha las variantes con su stock y precio.
 * Nombre, descripción, stock y precios se guardan juntos con el botón de
 * abajo (aparece con algún cambio). Las fotos se guardan al subirlas.
 */
export default function ProductEditor({
  product,
  variants,
  draft,
  onDraftChange,
  modelNameById,
  onVariantsChanged,
  saving,
  error,
  justSaved,
  onSave,
  onDiscard,
  onImagesChange,
  onAddVariant,
  addLabel,
}: {
  product: AdminProduct;
  /** Las variantes del producto, ya ordenadas por modelo. */
  variants: AdminVariant[];
  draft: CatalogDraft;
  onDraftChange: (update: (draft: CatalogDraft) => CatalogDraft) => void;
  modelNameById: Map<string, string>;
  /** Se eliminó una variante: `message` dice qué pasó, para mostrar y refrescar. */
  onVariantsChanged: (message: string) => void;
  saving: boolean;
  error: string | null;
  justSaved: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onImagesChange: (images: AdminProductImage[]) => void;
  onAddVariant: () => void;
  addLabel?: string;
}) {
  const [bulkPrice, setBulkPrice] = useState("");
  const library = useAttributeLibrary();
  // Color o diseño elegido: filtra las variantes y muestra sus fotos. null = todos.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attrSearch, setAttrSearch] = useState("");
  const all = product.product_variants;
  const changes = draftChanges(product, draft);

  // Colores o diseños del producto (los de sus variantes), en orden. Un
  // producto usa unos u otros.
  const usesMotifs = all.some((v) => v.motif_id !== null);
  const idOf = (v: { color_id: string | null; motif_id: string | null }) => (usesMotifs ? v.motif_id : v.color_id);
  const usedIds = new Set(all.map(idOf));
  const attrs: { id: string; name: string; hex?: string }[] = (usesMotifs ? library.motifs : library.colors).filter((a) =>
    usedIds.has(a.id),
  );
  const missingPhotos = new Set(
    usesMotifs ? motifsWithoutPhotos(all, product.product_images) : colorsWithoutPhotos(all, product.product_images),
  );
  const variantCount = (id: string) => all.filter((v) => idOf(v) === id).length;
  const unitsOf = (id: string) => all.filter((v) => idOf(v) === id).reduce((sum, v) => sum + v.stock_quantity, 0);

  // Si el elegido dejó de ser del producto (se eliminó su última variante), vuelve a "Todos".
  const selected = attrs.find((a) => a.id === selectedId) ?? null;
  const term = foldName(attrSearch);
  const visibleAttrs = attrs.filter((a) => a.id === selected?.id || foldName(a.name).includes(term));
  const kindWord = usesMotifs ? "diseño" : "color";
  const kindWords = usesMotifs ? "Diseños" : "Colores";

  const name = draft.name ?? product.name;
  const description = draft.description ?? product.description ?? "";
  const generalPhotos = product.product_images.filter((img) => img.color_id === null && img.motif_id === null).length;

  // "Precio para todos" pisa el precio de todas las variantes del producto. Se guarda con el resto.
  function applyBulkPrice(value: string) {
    setBulkPrice(value);
    if (value.trim() === "") return;
    onDraftChange((d) => ({ ...d, price: { ...d.price, ...Object.fromEntries(all.map((v) => [v.id, value])) } }));
  }

  return (
    <div className="flex flex-col gap-5">
      {attrs.length > 0 && (
        <section aria-label={kindWords} className="rounded-lg border border-admin-border bg-admin-surface p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className={ADMIN_CAP}>
              {kindWords} ({attrs.length})
            </h2>
            {attrs.length > SEARCH_FROM && (
              <input
                type="search"
                value={attrSearch}
                onChange={(e) => setAttrSearch(e.target.value)}
                placeholder={`Buscar ${kindWord}`}
                aria-label={`Buscar ${kindWord}`}
                className={`${adminInput()} sm:w-56`}
              />
            )}
          </div>
          <div role="radiogroup" aria-label={`Elegí un ${kindWord}`} className="flex flex-wrap gap-1.5">
            <AttrChip
              active={selected === null}
              onClick={() => setSelectedId(null)}
              label="Todos"
              detail={`${all.length}`}
              noPhotos={false}
            />
            {visibleAttrs.map((a) => (
              <AttrChip
                key={a.id}
                active={selected?.id === a.id}
                onClick={() => setSelectedId(a.id)}
                label={a.name}
                hex={a.hex}
                detail={`${unitsOf(a.id)} u.`}
                title={`${a.name}: ${variantCount(a.id)} ${variantCount(a.id) === 1 ? "modelo" : "modelos"}, ${unitsOf(a.id)} unidades${
                  missingPhotos.has(a.id) ? ", sin fotos propias" : ""
                }`}
                noPhotos={missingPhotos.has(a.id)}
              />
            ))}
            {visibleAttrs.length === 0 && <span className={`self-center ${ADMIN_TEXT_MUTED}`}>Ninguno con ese nombre.</span>}
          </div>
          {missingPhotos.size > 0 && (
            <p className={`mt-2.5 flex items-center gap-1.5 ${ADMIN_TEXT_MUTED}`}>
              <ImageOff aria-hidden="true" className="size-3.5" />
              {missingPhotos.size === 1 ? `1 ${kindWord} sin fotos propias` : `${missingPhotos.size} ${kindWords.toLowerCase()} sin fotos propias`}
              : en la web muestra las generales.
            </p>
          )}
        </section>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className="flex min-w-0 flex-col gap-2.5 rounded-lg border border-admin-border bg-admin-surface p-4">
            <h2 className={ADMIN_CAP}>
              {selected ? `Fotos de ${selected.name}` : "Fotos generales"} (
              {selected
                ? product.product_images.filter((img) => idOf(img) === selected.id).length
                : generalPhotos}
              )
            </h2>
            <ProductImageGallery
              productId={product.id}
              images={product.product_images}
              group={{
                colorId: usesMotifs ? null : (selected?.id ?? null),
                motifId: usesMotifs ? (selected?.id ?? null) : null,
              }}
              onChange={onImagesChange}
            />
          </section>

          <section className="flex min-w-0 flex-col gap-4 rounded-lg border border-admin-border bg-admin-surface p-4">
            <label className="flex flex-col gap-1.5">
              <span className={ADMIN_CAP}>Nombre</span>
              <input
                type="text"
                value={name}
                disabled={saving}
                aria-invalid={changes.invalid.has("name") || undefined}
                onChange={(e) => onDraftChange((d) => ({ ...d, name: e.target.value }))}
                className={adminInput({
                  state: changes.invalid.has("name") ? "error" : changes.productPatch.name !== undefined ? "dirty" : null,
                })}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ADMIN_CAP}>Descripción en la web</span>
              <textarea
                value={description}
                disabled={saving}
                rows={4}
                maxLength={MAX_DESCRIPTION}
                placeholder="Ej.: funda de silicona suave, con protección de cámara. Se ve en la ficha del producto."
                onChange={(e) => onDraftChange((d) => ({ ...d, description: e.target.value }))}
                className={`${ADMIN_TEXTAREA} min-h-28 ${changes.productPatch.description !== undefined ? "border-admin-ink" : ""}`}
              />
              <span className={ADMIN_TEXT_MUTED}>
                {description.length}/{MAX_DESCRIPTION}
              </span>
            </label>
            {all.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <span className={ADMIN_CAP}>Precio para todos</span>
                <MoneyInput
                  className="sm:max-w-[240px]"
                  label={`Precio para todas las variantes de ${product.name}`}
                  value={bulkPrice}
                  disabled={saving}
                  onChange={applyBulkPrice}
                />
                <span className={ADMIN_TEXT_MUTED}>
                  Lo copia a las {all.length} variantes. Se guarda con el botón de abajo.
                </span>
              </div>
            )}
          </section>
        </div>

        <section className="min-w-0 rounded-lg border border-admin-border bg-admin-surface p-4">
          <VariantList
            product={product}
            variants={variants}
            draft={draft}
            onDraftChange={onDraftChange}
            modelNameById={modelNameById}
            saving={saving}
            attrFilter={selected}
            onClearAttrFilter={() => setSelectedId(null)}
            onAddVariant={onAddVariant}
            addLabel={addLabel}
            onChanged={onVariantsChanged}
          />
        </section>
      </div>

      {/* Un solo Guardar para todo el producto, pegado abajo mientras haya cambios. */}
      {(changes.dirty || error) && (
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-admin-border bg-admin-surface p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-6px_16px_rgb(0_0_0/0.06)] lg:mx-0 lg:rounded-lg lg:border lg:px-5">
          {error && <AdminNotice kind="danger">{error}</AdminNotice>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`text-sm font-medium ${changes.invalid.size > 0 ? "text-admin-danger" : "text-admin-text"}`}>
              {changes.invalid.size > 0
                ? "Revisá los campos en rojo: el nombre no puede quedar vacío, el stock es un entero y el precio mayor a 0."
                : changes.count === 1
                  ? "1 cambio sin guardar"
                  : `${changes.count} cambios sin guardar`}
            </p>
            <div className="grid flex-1 grid-cols-2 gap-2 sm:flex-none">
              <button type="button" onClick={onDiscard} disabled={saving} className={adminButton("secondary")}>
                Descartar
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving || changes.invalid.size > 0 || changes.count === 0}
                className={adminButton("primary")}
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
      {justSaved && !changes.dirty && (
        <p role="status" className="flex items-center gap-1.5 text-sm font-semibold text-admin-ok">
          <Check aria-hidden="true" className="size-4" />
          Cambios guardados
        </p>
      )}
    </div>
  );
}

/** Un color o diseño de la fila de arriba: punto, nombre, unidades y si le faltan fotos. */
function AttrChip({
  active,
  onClick,
  label,
  hex,
  detail,
  title,
  noPhotos,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hex?: string;
  detail: string;
  title?: string;
  noPhotos: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      title={title}
      className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-semibold transition-colors duration-150 ${
        active
          ? "border-admin-ink bg-admin-ink text-admin-on-ink"
          : "border-admin-border bg-admin-surface text-admin-text hover:border-admin-border-strong"
      }`}
    >
      {hex && <ColorDot hex={hex} size={14} />}
      {label}
      <span className={`font-mono text-xs ${active ? "text-admin-on-ink/70" : "text-admin-muted"}`}>{detail}</span>
      {noPhotos && (
        <ImageOff
          aria-label="sin fotos propias"
          className={`size-3.5 ${active ? "text-admin-on-ink/70" : "text-admin-warn"}`}
        />
      )}
    </button>
  );
}
