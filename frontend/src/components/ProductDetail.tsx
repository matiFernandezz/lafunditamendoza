"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ProductGallery from "@/components/ProductGallery";
import { useCart } from "@/lib/cart";
import { coverImage, type Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { STORE_BUTTON, STORE_TEXT_LINK } from "@/lib/storeStyles";

const LOW_STOCK = 3;

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

  const cart = useCart();
  // "Agregado" se refiere a la variante que estaba elegida al tocar el botón.
  const [addedVariantId, setAddedVariantId] = useState<string | null>(null);
  const stock = selectedVariant?.stock_quantity ?? 0;
  const inCart = selectedVariant ? cart.quantityOf(selectedVariant.id) : 0;
  const atLimit = stock > 0 && inCart >= stock;

  function handleAdd() {
    if (!selectedVariant || stock <= 0 || atLimit) return;
    cart.add({
      variantId: selectedVariant.id,
      productId: product.id,
      name: product.name,
      detail: [selectedVariant.iphone_models?.name ?? selectedModelName, selectedVariant.color]
        .filter(Boolean)
        .join(" · "),
      price: selectedVariant.price,
      max: stock,
      image: coverImage(product),
    });
    setAddedVariantId(selectedVariant.id);
  }

  return (
    // Bloque centrado de 960px (lo pone la página): galería de hasta 520px (miniaturas + foto) y la
    // columna de compra al lado, así el selector y el botón no se estiran a
    // todo el ancho de la pantalla.
    <div className="grid gap-8 md:grid-cols-[minmax(0,520px)_minmax(0,1fr)] md:gap-10">
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
            <span className="mb-2 block font-medium">Elegí una opción</span>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-pressed={color === c}
                  className={`h-11 rounded-full border px-4 text-sm font-medium first-letter:uppercase transition-colors duration-200 ${
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
