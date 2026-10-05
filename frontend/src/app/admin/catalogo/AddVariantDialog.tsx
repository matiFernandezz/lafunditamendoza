"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  AdminApiError,
  addVariants,
  type AdminIphoneModel,
  type AdminProduct,
} from "@/lib/adminApi";
import { filterBySearch } from "@/lib/variantSearch";
import AdminNotice from "../AdminNotice";
import ColorField from "../ColorField";
import { MoneyInput, UnitsInput } from "../GridInputs";
import {
  ADMIN_LABEL,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXT_MUTED,
  adminButton,
  adminIconButton,
  adminInput,
  adminSegment,
} from "../adminStyles";
import { useAttributeLibrary } from "../attributeLibrary";
import ModelMultiSelect from "./ModelMultiSelect";
import { missingToAdd, suggestedPrice, variantRules, type Target } from "./addVariantRules";

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

/**
 * Ventana "Agregar variante". Lo que pregunta depende del producto:
 *  - "Para: Un iPhone / Universal" solo si el producto todavía no lo define
 *    (una funda siempre va por modelo; un protector o un cable, universal).
 *  - Modelos: uno o varios, escribiendo. Se crea una variante por modelo.
 *  - Color (fundas), Motivo (productos con motivos) o Descripción libre
 *    (accesorios sin motivos).
 *  - Stock y precio; el precio viene precargado. El SKU se arma solo.
 * Se monta cuando se abre: cada apertura arranca limpia.
 */
export default function AddVariantDialog({
  products,
  models,
  isAccessory,
  categoryPath,
  presetProductId,
  onClose,
  onAdded,
}: {
  products: AdminProduct[];
  /** Todos los modelos de iPhone, en orden. */
  models: AdminIphoneModel[];
  isAccessory: (categoryId: string) => boolean;
  categoryPath: (categoryId: string) => string;
  /** Producto desde el que se abrió ("" = se elige adentro). */
  presetProductId: string;
  onClose: () => void;
  /** Se agregó algo: `message` es el resultado, para mostrar y refrescar. */
  onAdded: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [productId, setProductId] = useState(presetProductId);
  const [productSearch, setProductSearch] = useState("");
  const [targetChoice, setTargetChoice] = useState<Target | null>(null);
  const [modelIds, setModelIds] = useState<string[]>([]);
  const [attribute, setAttribute] = useState(""); // nombre del color o motivo, o la descripción
  const [stock, setStock] = useState("");
  // null: el precio sigue al sugerido; un texto: lo escribió la persona.
  const [priceText, setPriceText] = useState<string | null>(null);
  const [sku, setSku] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const product = products.find((p) => p.id === productId);
  const variants = product?.product_variants ?? [];
  const rules = variantRules(variants, product ? isAccessory(product.category_id) : false);
  const target: Target | null = rules.fixedTarget ?? targetChoice;
  const targetModels: (string | null)[] = target === "universal" ? [null] : modelIds;

  const suggested = suggestedPrice(variants, targetModels);
  const price = priceText ?? (suggested !== null ? String(suggested) : "");

  // El color o motivo elegido, por nombre (así lo devuelve el selector).
  const library = useAttributeLibrary();
  const attr =
    rules.kind === "text"
      ? null
      : (rules.kind === "color" ? library.colors : library.motifs).find(
          (a) => a.name.toLowerCase() === attribute.trim().toLowerCase(),
        );
  // En un producto que ya usa colores o motivos, toda variante lleva el suyo.
  const usesAttribute = variants.some((v) => v.color_id !== null || v.motif_id !== null);
  const assignsFirst = rules.firstAttribute !== null && !!attr;

  const missing = missingToAdd({
    productChosen: !!product,
    target,
    modelCount: modelIds.length,
    kind: rules.kind,
    attributeChosen: !!attr,
    usesAttribute,
    stock,
    // Al asignar el primer color no se crea nada: el precio no hace falta.
    price: assignsFirst ? "1" : price,
  });

  const kindLabel = rules.kind === "color" ? "Color" : rules.kind === "motif" ? "Motivo" : "Descripción";

  function pickProduct(id: string) {
    setProductId(id);
    setProductSearch("");
    setTargetChoice(null);
    setModelIds([]);
    setAttribute("");
    setPriceText(null);
    setSku("");
    setError(null);
  }

  async function handleSubmit() {
    if (!product || missing || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { data } = await addVariants(product.id, {
        // Sin color elegido en una funda que todavía no usa colores: variante sin atributo.
        kind: rules.kind === "text" || !attr ? "text" : rules.kind,
        attrId: attr?.id ?? null,
        text: rules.kind === "text" ? attribute.trim() : "",
        models: targetModels,
        stock: stock.trim() === "" ? 0 : Number(stock),
        price: assignsFirst ? null : Number(price),
        sku: targetModels.length === 1 ? sku.trim() : "",
      });

      const what = attr?.name ?? (attribute.trim() || "");
      if (data.assigned > 0) {
        onAdded(
          `${product.name}: ${data.assigned === 1 ? "su variante pasó" : `sus ${data.assigned} variantes pasaron`} a ser ${what}.`,
        );
      } else if (data.created + data.reactivated === 0) {
        // Todo lo pedido ya existía: se avisa y la ventana queda abierta.
        setError(
          `Ya existe ${what ? `${what} ` : ""}en ${data.already.join(", ")}: no se duplicó. Cambiá el modelo o el ${kindLabel.toLowerCase()}.`,
        );
        return;
      } else {
        const parts = [
          data.created > 0 && plural(data.created, "variante nueva", "variantes nuevas"),
          data.reactivated > 0 &&
            (data.reactivated === 1 ? "1 que ya había existido vuelve" : `${data.reactivated} que ya habían existido vuelven`),
        ].filter(Boolean);
        onAdded(
          `${product.name}${what ? ` · ${what}` : ""}: ${parts.join(" y ")}${
            data.already.length > 0 ? `. Ya existía en ${data.already.join(", ")} (no se duplicó)` : ""
          }.`,
        );
      }
      dialogRef.current?.close();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  const productOptions = filterBySearch(
    [...products].sort((a, b) => a.name.localeCompare(b.name, "es")),
    productSearch,
    (p) => `${p.name} ${categoryPath(p.category_id)}`,
  ).slice(0, 8);

  // El foco arranca en el primer campo que haya que completar.
  const focusProduct = !product;
  const focusModels = !!product && target === "iphone";

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="agregar-variante"
      className="fixed inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[520px] overflow-y-auto rounded-lg bg-white p-0 backdrop:bg-black/45"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
        className="flex flex-col gap-4 p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="agregar-variante" className={`min-w-0 break-words ${ADMIN_SECTION_TITLE}`}>
            Agregar variante{product ? ` · ${product.name}` : ""}
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Cerrar"
            className={`-mr-2 -mt-2 ${adminIconButton("plain")}`}
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        {/* Abierta desde un producto: viene fijo. Si no, se busca y se elige. */}
        {!presetProductId &&
          (product ? (
            <button
              type="button"
              onClick={() => pickProduct("")}
              className="self-start text-[13px] font-semibold underline underline-offset-2"
            >
              Cambiar de producto
            </button>
          ) : (
            <div>
              <label htmlFor="variante-producto" className={ADMIN_LABEL}>
                Producto
              </label>
              <input
                id="variante-producto"
                type="text"
                autoComplete="off"
                autoFocus={focusProduct}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && productOptions.length > 0) {
                    e.preventDefault();
                    pickProduct(productOptions[0].id);
                  }
                }}
                placeholder="Escribí para buscar: MagCase, Silicona…"
                className={adminInput()}
              />
              <ul className="mt-1 divide-y divide-admin-border overflow-hidden rounded-md border border-admin-border">
                {productOptions.length === 0 ? (
                  <li className={`px-3.5 py-2.5 ${ADMIN_TEXT_MUTED}`}>Ningún producto con ese nombre.</li>
                ) : (
                  productOptions.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => pickProduct(p.id)}
                        className="block min-h-11 w-full px-3.5 py-2 text-left hover:bg-admin-bg"
                      >
                        <span className="block break-words text-[15px] font-semibold text-admin-text">{p.name}</span>
                        <span className={`block ${ADMIN_TEXT_MUTED}`}>{categoryPath(p.category_id)}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}

        {product && (
          <>
            {/* Solo se pregunta si el producto todavía no tiene variantes que lo definan. */}
            {rules.fixedTarget === null && (
              <div>
                <span className={ADMIN_LABEL}>Para</span>
                <div role="radiogroup" aria-label="Para" className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["iphone", "Un iPhone"],
                      ["universal", "Universal"],
                    ] as const
                  ).map(([value, text]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={targetChoice === value}
                      onClick={() => setTargetChoice(value)}
                      className={adminSegment(targetChoice === value)}
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {target === "iphone" && (
              <ModelMultiSelect
                models={models}
                value={modelIds}
                onChange={(ids) => {
                  setModelIds(ids);
                  setError(null);
                }}
                disabled={saving}
                autoFocus={focusModels}
              />
            )}

            <div>
              {rules.kind === "text" ? (
                <>
                  <label htmlFor="variante-descripcion" className={ADMIN_LABEL}>
                    Descripción <span className="font-normal text-admin-muted">(opcional)</span>
                  </label>
                  <input
                    id="variante-descripcion"
                    type="text"
                    value={attribute}
                    disabled={saving}
                    autoFocus={!focusModels}
                    onChange={(e) => {
                      setAttribute(e.target.value);
                      setError(null);
                    }}
                    placeholder="Ej.: tipo C a C, 20W"
                    className={adminInput()}
                  />
                </>
              ) : (
                <>
                  <span className={ADMIN_LABEL}>
                    {kindLabel}
                    {!usesAttribute && <span className="font-normal text-admin-muted"> (opcional)</span>}
                  </span>
                  <ColorField
                    kind={rules.kind}
                    label={`${kindLabel} de la variante`}
                    value={attribute}
                    allowText={false}
                    allowEmpty={!usesAttribute}
                    disabled={saving}
                    onChange={(value) => {
                      setAttribute(value);
                      setError(null);
                    }}
                  />
                </>
              )}
            </div>

            {assignsFirst && rules.firstAttribute ? (
              <AdminNotice kind="ink">
                Este producto todavía no tiene {rules.kind === "color" ? "colores" : "motivos"}:{" "}
                {rules.firstAttribute.variants === 1
                  ? "su variante actual pasa"
                  : `sus ${rules.firstAttribute.variants} variantes actuales pasan`}{" "}
                a ser {attr?.name} (stock actual: {plural(rules.firstAttribute.units, "unidad", "unidades")}). No se crea
                una variante nueva; después eliminás las que no correspondan.
              </AdminNotice>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <UnitsInput
                    caption="Stock"
                    label="Stock inicial"
                    value={stock}
                    disabled={saving}
                    onChange={setStock}
                  />
                  <MoneyInput
                    caption="Precio"
                    label="Precio de venta"
                    value={price}
                    disabled={saving}
                    onChange={setPriceText}
                  />
                </div>
                {targetModels.length > 1 && (
                  <p className={ADMIN_TEXT_MUTED}>
                    Se crea una variante por modelo ({targetModels.length}), todas con ese stock y ese precio.
                  </p>
                )}

                <details className="text-sm text-admin-text">
                  <summary className="cursor-pointer font-semibold">Opciones avanzadas</summary>
                  <div className="mt-2">
                    <label htmlFor="variante-sku" className={ADMIN_LABEL}>
                      SKU
                    </label>
                    <input
                      id="variante-sku"
                      type="text"
                      value={sku}
                      disabled={saving || targetModels.length > 1}
                      autoCapitalize="characters"
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="Se arma solo"
                      className={adminInput({ mono: true })}
                    />
                    <p className={`mt-1.5 ${ADMIN_TEXT_MUTED}`}>
                      {targetModels.length > 1
                        ? "Con varios modelos, cada variante lleva su SKU armado automáticamente."
                        : "Dejalo vacío para que se arme con el producto, el modelo y el color."}
                    </p>
                  </div>
                </details>
              </>
            )}
          </>
        )}

        {error && <AdminNotice kind="danger">{error}</AdminNotice>}

        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => dialogRef.current?.close()} className={adminButton("secondary")}>
              Cancelar
            </button>
            <button type="submit" disabled={saving || missing !== null} className={adminButton("primary")}>
              {saving
                ? "Agregando…"
                : assignsFirst
                  ? `Asignar ${attr?.name ?? ""}`
                  : targetModels.length > 1
                    ? `Agregar ${targetModels.length} variantes`
                    : "Agregar variante"}
            </button>
          </div>
          {missing && !saving && <p className={`text-right ${ADMIN_TEXT_MUTED}`}>{missing}</p>}
        </div>
      </form>
    </dialog>
  );
}
