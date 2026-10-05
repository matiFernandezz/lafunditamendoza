"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ProductGallery from "@/components/ProductGallery";
import { useCart } from "@/lib/cart";
import { coverImage, type MotifRef, type Product, type ProductImage } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import {
  MIN_COLORS_FOR_SELECTOR,
  availableColorIds,
  availableMotifIds,
  hasColorSelector,
  imagesForColor,
  imagesForMotif,
  initialColor,
  initialMotif,
  productColors,
  resolveColor,
  resolveMotif,
} from "@/lib/productColors";
import { STORE_BUTTON, STORE_TEXT_LINK } from "@/lib/storeStyles";

const LOW_STOCK = 3;

/** Deja `?color=<slug>` (o `?motivo=`) en la URL sin recargar: el link queda compartible. */
function writeToUrl(param: "color" | "motivo", slug: string | undefined) {
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set(param, slug);
  else url.searchParams.delete(param);
  window.history.replaceState(null, "", url);
}

export default function ProductDetail({
  product,
  motifs = [],
  initialModelId,
  initialColorSlug,
  initialMotifSlug,
}: {
  product: Product;
  /** Todos los motivos del producto con variante activa, también los agotados. */
  motifs?: MotifRef[];
  initialModelId?: string;
  initialColorSlug?: string;
  initialMotifSlug?: string;
}) {
  // Modelos puntuales que este producto realmente tiene (no los 22, solo los
  // que tienen variante propia). Si no hay ninguno, el producto es universal.
  const modelOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const v of product.product_variants) {
      if (v.iphone_model_id && v.iphone_models) byId.set(v.iphone_model_id, v.iphone_models.name);
    }
    return [...byId.entries()].map(([id, name]) => ({ id, name }));
  }, [product.product_variants]);

  const [modelId, setModelId] = useState<string>(
    initialModelId && modelOptions.some((m) => m.id === initialModelId)
      ? initialModelId
      : (modelOptions[0]?.id ?? ""),
  );

  // Variantes válidas para el modelo elegido (o todas, si el producto es universal).
  const availableVariants = useMemo(
    () =>
      product.product_variants.filter((v) =>
        modelId ? v.iphone_model_id === modelId || v.iphone_model_id === null : true,
      ),
    [product.product_variants, modelId],
  );

  // Con 2 colores o más: círculos de color. Con uno o ninguno queda como
  // siempre: un chip por opción (que puede ser una descripción, no un color).
  const colors = useMemo(() => productColors(product.product_variants), [product.product_variants]);
  const swatches = hasColorSelector(colors);
  // Las variantes que llegan a la tienda ya son solo las que tienen stock.
  const available = useMemo(
    () => availableColorIds(product.product_variants, modelId || null),
    [product.product_variants, modelId],
  );

  const [wantedColorId, setWantedColorId] = useState<string | null>(() =>
    initialColor(colors, availableColorIds(product.product_variants, modelId || null), initialColorSlug),
  );
  // Si el color elegido no hay para este modelo, salta al primero que sí.
  const colorId = swatches ? resolveColor(colors, available, wantedColorId) : null;
  const selectedColor = colors.find((c) => c.id === colorId);

  // Motivos (BATMAN, BOB…): una lista desplegable, con 2 o más. Un producto usa
  // colores o motivos, nunca los dos. Los agotados se ven deshabilitados.
  const motifList = useMemo(() => (swatches ? [] : motifs), [swatches, motifs]);
  const motifSelect = motifList.length >= MIN_COLORS_FOR_SELECTOR;
  const availableMotifs = useMemo(
    () => availableMotifIds(product.product_variants, modelId || null),
    [product.product_variants, modelId],
  );
  const [wantedMotifId, setWantedMotifId] = useState<string | null>(() =>
    initialMotif(motifList, availableMotifIds(product.product_variants, modelId || null), initialMotifSlug),
  );
  const motifId = motifSelect ? resolveMotif(motifList, availableMotifs, wantedMotifId) : null;

  const optionLabels = useMemo(
    () => [...new Set(availableVariants.map((v) => v.color).filter((c): c is string => !!c))],
    [availableVariants],
  );
  const [option, setOption] = useState<string>(optionLabels[0] ?? "");

  const selectedVariant = swatches
    ? (availableVariants.find((v) => v.color_ref?.id === colorId) ?? availableVariants[0])
    : motifSelect
      ? (availableVariants.find((v) => v.motif_ref?.id === motifId) ?? availableVariants[0])
      : (availableVariants.find((v) => (option ? v.color === option : true)) ?? availableVariants[0]);

  const selectedModelName = modelOptions.find((m) => m.id === modelId)?.name;

  // Fotos del color elegido; sin fotos propias, las generales. Un producto de
  // un solo color también usa las suyas si las tiene.
  const photoColorId = swatches ? colorId : (colors[0]?.id ?? null);
  // Con motivos: las fotos del motivo elegido (o del único que tiene).
  const usesMotifs = motifList.length > 0;
  const photoMotifId = motifSelect ? motifId : (motifList[0]?.id ?? null);
  const galleryImages = useMemo(
    () =>
      usesMotifs
        ? imagesForMotif(product.product_images, photoMotifId)
        : imagesForColor(product.product_images, photoColorId),
    [product.product_images, usesMotifs, photoMotifId, photoColorId],
  );
  // Con selector de color o de motivo, la galería muestra TODAS las fotos del
  // producto en las miniaturas: elegir un color o motivo salta a su foto, y
  // tocar la foto de otro lo elige.
  const multi = swatches || motifSelect;
  const activeGroupId = swatches ? colorId : motifId;

  const cart = useCart();
  // "Agregado" se refiere a la variante que estaba elegida al tocar el botón.
  const [addedVariantId, setAddedVariantId] = useState<string | null>(null);
  const stock = selectedVariant?.stock_quantity ?? 0;
  const inCart = selectedVariant ? cart.quantityOf(selectedVariant.id) : 0;
  const atLimit = stock > 0 && inCart >= stock;

  function handleModelChange(nextModelId: string) {
    setModelId(nextModelId);
    setOption("");
    if (swatches) {
      const next = resolveColor(colors, availableColorIds(product.product_variants, nextModelId || null), wantedColorId);
      writeToUrl("color", colors.find((c) => c.id === next)?.slug);
    }
    if (motifSelect) {
      const next = resolveMotif(
        motifList,
        availableMotifIds(product.product_variants, nextModelId || null),
        wantedMotifId,
      );
      writeToUrl("motivo", motifList.find((m) => m.id === next)?.slug);
    }
  }

  function handleColorChange(id: string) {
    setWantedColorId(id);
    writeToUrl("color", colors.find((c) => c.id === id)?.slug);
  }

  function handleMotifChange(id: string) {
    setWantedMotifId(id);
    writeToUrl("motivo", motifList.find((m) => m.id === id)?.slug);
  }

  // En la galería se pasó a la foto de otro color o motivo: se elige, si hay
  // stock para el modelo. Si no hay, la foto se ve igual y la elección no cambia.
  function handleImageShown(image: ProductImage) {
    if (swatches && image.color_id && image.color_id !== colorId && available.has(image.color_id)) {
      handleColorChange(image.color_id);
    }
    if (motifSelect && image.motif_id && image.motif_id !== motifId && availableMotifs.has(image.motif_id)) {
      handleMotifChange(image.motif_id);
    }
  }

  function handleAdd() {
    if (!selectedVariant || stock <= 0 || atLimit) return;
    cart.add({
      variantId: selectedVariant.id,
      productId: product.id,
      name: product.name,
      // Modelo y color o motivo (el texto de la variante es el nombre de
      // cualquiera de los dos): es lo que va en la reserva y en el mensaje de WhatsApp.
      detail: [selectedVariant.iphone_models?.name ?? selectedModelName, selectedVariant.color]
        .filter(Boolean)
        .join(" · "),
      price: selectedVariant.price,
      max: stock,
      image: galleryImages[0]?.url ?? coverImage(product),
    });
    setAddedVariantId(selectedVariant.id);
  }

  return (
    // Bloque centrado de 960px (lo pone la página): galería de hasta 520px
    // (miniaturas + foto) y la columna de compra al lado, así el selector y el
    // botón no se estiran a todo el ancho de la pantalla.
    <div className="grid gap-8 md:grid-cols-[minmax(0,520px)_minmax(0,1fr)] md:gap-10">
      <ProductGallery
        images={multi ? product.product_images : galleryImages}
        alt={product.name}
        activeGroupId={multi ? activeGroupId : undefined}
        onImageShown={multi ? handleImageShown : undefined}
      />

      <div className="space-y-6">
        <h1 className="font-display text-section font-semibold leading-heading tracking-tight text-pretty">
          {product.name}
        </h1>

        {modelOptions.length > 0 && (
          <div>
            <label htmlFor="modelo-detalle" className="mb-2 block font-medium">
              Elegí tu modelo
            </label>
            <select
              id="modelo-detalle"
              value={modelId}
              onChange={(e) => handleModelChange(e.target.value)}
              className="h-14 w-full rounded-2xl border border-graphite bg-transparent px-4 text-base font-medium"
            >
              {modelOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {swatches ? (
          <fieldset>
            <legend className="mb-1 block font-medium">
              Color{selectedColor && <span className="font-normal text-graphite"> — {selectedColor.name}</span>}
            </legend>
            {/* Radios nativos: Tab entra al grupo y las flechas cambian de
                color, salteando los que no hay. flex-wrap: varias líneas en
                el celular, sin scroll horizontal. */}
            <div role="radiogroup" aria-label="Color" className="-ml-1.5 flex flex-wrap">
              {colors.map((c) => {
                const enabled = available.has(c.id);
                const reason = `Sin stock${selectedModelName ? ` para ${selectedModelName}` : ""}`;
                return (
                  <label
                    key={c.id}
                    title={enabled ? c.name : reason}
                    className={`relative flex size-11 items-center justify-center ${
                      enabled ? "cursor-pointer" : "cursor-not-allowed"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`color-${product.id}`}
                      value={c.slug}
                      checked={c.id === colorId}
                      disabled={!enabled}
                      onChange={() => handleColorChange(c.id)}
                      aria-label={enabled ? c.name : `${c.name}. ${reason}`}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      style={{ backgroundColor: c.hex }}
                      className={`block size-8 rounded-full border border-ink/25 ring-ink ring-offset-2 ring-offset-paper transition-shadow duration-200 peer-checked:ring-2 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-4 ${
                        enabled ? "" : "opacity-35"
                      }`}
                    />
                    {!enabled && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-1/2 top-1/2 h-[1.5px] w-9 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-ink shadow-[0_0_0_1px_var(--color-paper)]"
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : motifSelect ? (
          <div>
            <label htmlFor="motivo-detalle" className="mb-2 block font-medium">
              Motivo
            </label>
            {/* Lista, no círculos: mismo estilo que "Elegí tu modelo". */}
            <select
              id="motivo-detalle"
              value={motifId ?? ""}
              onChange={(e) => handleMotifChange(e.target.value)}
              className="h-14 w-full rounded-2xl border border-graphite bg-transparent px-4 text-base font-medium"
            >
              {motifList.map((m) => {
                const inStock = availableMotifs.has(m.id);
                return (
                  <option key={m.id} value={m.id} disabled={!inStock}>
                    {m.name}
                    {!inStock && " (sin stock)"}
                  </option>
                );
              })}
            </select>
          </div>
        ) : (
          optionLabels.length > 0 && (
            <div>
              <span className="mb-2 block font-medium">
                {colors.length === 1 ? "Color" : motifList.length === 1 ? "Motivo" : "Elegí una opción"}
              </span>
              <div className="flex flex-wrap gap-2">
                {optionLabels.map((label) => {
                  const pressed = (option || optionLabels[0]) === label;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setOption(label)}
                      aria-pressed={pressed}
                      className={`h-11 rounded-full border px-4 text-sm font-medium first-letter:uppercase transition-colors duration-200 ${
                        pressed ? "border-ink bg-ink text-paper" : "border-graphite hover:border-ink"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )
        )}

        {selectedVariant && (
          <div className="space-y-1 border-t border-rule pt-6">
            <p className="font-mono text-3xl font-medium tabular-nums">
              {formatPrice(selectedVariant.price)}
            </p>
            <p className="text-sm text-graphite">
              {selectedVariant.stock_quantity <= LOW_STOCK
                ? selectedVariant.stock_quantity === 1
                  ? "Última unidad"
                  : `Quedan ${selectedVariant.stock_quantity}`
                : "En stock"}
              <span aria-hidden="true"> · </span>
              <span className="font-mono text-xs">{selectedVariant.sku}</span>
            </p>
          </div>
        )}

        {selectedVariant && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={stock <= 0 || atLimit}
              className={`${STORE_BUTTON} w-full`}
            >
              {stock <= 0 ? "Sin stock" : atLimit ? "Ya tenés todo el stock en el carrito" : "Agregar al carrito"}
            </button>
            {addedVariantId === selectedVariant.id && (
              <div role="status" className="flex items-center justify-between gap-3 text-[15px] text-ink">
                <span>Agregado al carrito.</span>
                <Link href="/carrito" className={`${STORE_TEXT_LINK} font-medium`}>
                  Ver carrito
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Después del precio y no debajo del nombre (como en el diseño): una
            descripción larga empujaría el precio fuera de la pantalla. */}
        {product.description && (
          <div className="space-y-2 border-t border-rule pt-6">
            <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-graphite">Descripción</h2>
            {/* pre-line: respeta los saltos de línea que se escriben en el panel. */}
            <p className="whitespace-pre-line text-pretty text-ink">{product.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
