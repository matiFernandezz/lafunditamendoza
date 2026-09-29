"use client";

import { useMemo, useState } from "react";
import ProductGallery from "@/components/ProductGallery";
import type { Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

const LOW_STOCK = 3;
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

export default function ProductDetail({
  product,
  initialModelId,
}: {
  product: Product;
  initialModelId?: string;
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

  const colorOptions = useMemo(
    () => [...new Set(availableVariants.map((v) => v.color).filter((c): c is string => !!c))],
    [availableVariants],
  );

  const [color, setColor] = useState<string>(colorOptions[0] ?? "");

  const selectedVariant =
    availableVariants.find((v) => (color ? v.color === color : true)) ?? availableVariants[0];

  const selectedModelName = modelOptions.find((m) => m.id === modelId)?.name;
  const waMessage = [
    `Hola! Te consulto por "${product.name}"`,
    selectedModelName,
    color,
  ]
    .filter(Boolean)
    .join(" - ");

  return (
    // La columna de la foto no pasa de 440px (el tope de alto lo pone la
    // galería): en 1440×800 entran sin scroll foto, nombre, modelo y precio.
    <div className="grid gap-8 md:grid-cols-[minmax(0,440px)_minmax(0,1fr)] md:gap-12">
      <ProductGallery images={product.product_images} alt={product.name} />

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
              onChange={(e) => {
                setModelId(e.target.value);
                setColor("");
              }}
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

        {colorOptions.length > 0 && (
          <div>
            <span className="mb-2 block font-medium">Color</span>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-pressed={color === c}
                  className={`h-11 rounded-full border px-4 text-sm font-medium capitalize transition-colors duration-200 ${
                    color === c
                      ? "border-ink bg-ink text-paper"
                      : "border-graphite hover:border-ink"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
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

        {WHATSAPP_NUMBER && (
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink text-base font-semibold text-paper transition-transform duration-200 active:scale-[0.98]"
          >
            Consultar por WhatsApp
          </a>
        )}

        {/* Después del precio y no debajo del nombre (como en el diseño): una
            descripción larga empujaría el precio fuera de la pantalla. */}
        {product.description && (
          <p className="font-light text-graphite text-pretty">{product.description}</p>
        )}
      </div>
    </div>
  );
}
