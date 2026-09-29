"use client";

import { useEffect, useMemo, useState } from "react";
import { getCategoryGroups, getIphoneModels, type IphoneModel } from "@/lib/catalog";
import {
  AdminApiError,
  createSale,
  getAdminProducts,
  type AdminProduct,
  type AdminVariant,
  type CreatedSale,
} from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import { ADMIN_BUTTON_PRIMARY, ADMIN_INPUT, ADMIN_TEXT_MUTED } from "../adminStyles";
import { resolveDiscount, variantLabel } from "./utils";
import ProductGrid from "./ProductGrid";
import CartPanel from "./CartPanel";
import type { CartItem, DiscountChoice, PaymentMethod } from "./types";

type CategoryChip = { id: string; name: string };

export default function VentasPage() {
  const [categories, setCategories] = useState<CategoryChip[]>([]);
  const [models, setModels] = useState<IphoneModel[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [submitting, setSubmitting] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [discount, setDiscount] = useState<DiscountChoice>({ kind: "none" });
  const [lastSale, setLastSale] = useState<CreatedSale | null>(null);

  const modelNamesById = useMemo(() => new Map(models.map((m) => [m.id, m.name])), [models]);

  // Pura: no toca estado, solo trae los datos. La usan tanto el efecto de
  // montaje como el refresco manual (reintentar / post-venta).
  async function loadCatalogData() {
    const [groups, modelsList, productsRes] = await Promise.all([
      getCategoryGroups(),
      getIphoneModels(),
      getAdminProducts(),
    ]);
    const flatCategories: CategoryChip[] = [
      ...groups.map((g) => ({ id: g.id, name: g.name })),
      ...groups.flatMap((g) => g.children.map((c) => ({ id: c.id, name: c.name }))),
    ];
    return { categories: flatCategories, models: modelsList, products: productsRes.data };
  }

  // Patrón "ignore flag" recomendado por React para fetchear en un efecto:
  // https://react.dev/learn/you-might-not-need-an-effect#fetching-data
  useEffect(() => {
    let ignore = false;

    loadCatalogData()
      .then((result) => {
        if (ignore) return;
        setCategories(result.categories);
        setModels(result.models);
        setProducts(result.products);
        setLoadError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (ignore) return;
        setLoadError(err instanceof Error ? err.message : "No se pudo cargar el catálogo.");
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  function retryLoad() {
    setLoading(true);
    setLoadError(null);
    loadCatalogData()
      .then((result) => {
        setCategories(result.categories);
        setModels(result.models);
        setProducts(result.products);
        setLoadError(null);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "No se pudo cargar el catálogo.");
      })
      .finally(() => setLoading(false));
  }

  function refreshCatalog() {
    loadCatalogData()
      .then((result) => {
        setCategories(result.categories);
        setModels(result.models);
        setProducts(result.products);
      })
      .catch(() => {
        // Refresco silencioso post-venta: si falla, el próximo "Reintentar" lo cubre.
      });
  }

  const cartQuantities = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart) map.set(item.variantId, item.quantity);
    return map;
  }, [cart]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => p.active)
      .filter((p) => !selectedCategory || p.category_id === selectedCategory)
      .filter((p) => {
        if (!q) return true;
        if (p.name.toLowerCase().includes(q)) return true;
        return p.product_variants.some((v) => v.sku.toLowerCase().includes(q));
      })
      .map((p) => ({ ...p, product_variants: p.product_variants.filter((v) => v.active) }))
      .filter((p) => p.product_variants.length > 0);
  }, [products, search, selectedCategory]);

  function handleAdd(product: AdminProduct, variant: AdminVariant) {
    setSaleError(null);
    setCart((prev) => {
      const existing = prev.find((i) => i.variantId === variant.id);
      if (existing) {
        if (existing.quantity >= variant.stock_quantity) return prev;
        return prev.map((i) =>
          i.variantId === variant.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      if (variant.stock_quantity < 1) return prev;
      const modelName = variant.iphone_model_id
        ? modelNamesById.get(variant.iphone_model_id)
        : undefined;
      return [
        ...prev,
        {
          variantId: variant.id,
          productName: product.name,
          variantLabel: variantLabel(variant, modelName),
          price: variant.price,
          quantity: 1,
          stockQuantity: variant.stock_quantity,
        },
      ];
    });
  }

  function handleUpdateQuantity(variantId: string, quantity: number) {
    setCart((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.variantId !== variantId);
      return prev.map((i) =>
        i.variantId === variantId ? { ...i, quantity: Math.min(quantity, i.stockQuantity) } : i,
      );
    });
  }

  function handleRemove(variantId: string) {
    setCart((prev) => prev.filter((i) => i.variantId !== variantId));
  }

  async function handleConfirm() {
    const discountPercent = resolveDiscount(discount);
    if (cart.length === 0 || discountPercent === null) return;
    setSubmitting(true);
    setSaleError(null);
    try {
      const res = await createSale({
        payment_method: paymentMethod,
        channel: "feria",
        discount_percent: discountPercent,
        items: cart.map((i) => ({
          variant_id: i.variantId,
          quantity: i.quantity,
          unit_price: i.price,
        })),
      });
      setLastSale(res.data);
      setCart([]);
      // El descuento es de esa venta: el próximo cliente arranca sin descuento.
      setDiscount({ kind: "none" });
      setCartOpen(false);
      // Refrescamos productos para que el stock mostrado quede al día.
      refreshCatalog();
    } catch (err) {
      setSaleError(
        err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.",
      );
      // 409: un precio cambió desde que se armó la venta (el backend cobra el
      // de la base). Se traen los precios nuevos al carrito para que el total
      // que se ve sea el que se va a cobrar al confirmar de nuevo.
      if (err instanceof AdminApiError && err.status === 409) {
        await syncCartPrices();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function syncCartPrices() {
    try {
      const result = await loadCatalogData();
      setCategories(result.categories);
      setModels(result.models);
      setProducts(result.products);
      const priceById = new Map(
        result.products.flatMap((p) => p.product_variants.map((v) => [v.id, v.price] as const)),
      );
      setCart((prev) =>
        prev.map((item) => ({ ...item, price: priceById.get(item.variantId) ?? item.price })),
      );
    } catch {
      // Si falla, queda el mensaje del 409 y el próximo intento lo vuelve a avisar.
    }
  }

  if (loading) {
    return <p className={`py-10 text-center ${ADMIN_TEXT_MUTED}`}>Cargando catálogo…</p>;
  }

  if (loadError) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-admin-muted">{loadError}</p>
        <button type="button" onClick={retryLoad} className={ADMIN_BUTTON_PRIMARY}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-24 md:flex-row md:items-start md:pb-4">
      <div className="min-w-0 flex-1 space-y-4">
        <div>
          <label htmlFor="search" className="sr-only">
            Buscar por producto o SKU
          </label>
          <input
            id="search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por producto o SKU…"
            className={ADMIN_INPUT}
          />
        </div>

        {categories.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors ${
                selectedCategory === null
                  ? "border-black bg-black text-white"
                  : "border-admin-border bg-white text-admin-text hover:bg-admin-bg"
              }`}
            >
              Todas
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors ${
                  selectedCategory === c.id
                    ? "border-black bg-black text-white"
                    : "border-admin-border bg-white text-admin-text hover:bg-admin-bg"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <ProductGrid
          products={filteredProducts}
          modelNamesById={modelNamesById}
          cartQuantities={cartQuantities}
          onAdd={handleAdd}
        />
      </div>

      <CartPanel
        items={cart}
        open={cartOpen}
        onOpenChange={setCartOpen}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        discount={discount}
        onDiscountChange={setDiscount}
        onUpdateQuantity={handleUpdateQuantity}
        onRemove={handleRemove}
        onConfirm={handleConfirm}
        submitting={submitting}
        error={saleError}
      />

      {lastSale !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-md border border-admin-border bg-white p-6 text-center">
            <p className="text-4xl">✅</p>
            <h2 className="mt-2 text-xl font-bold text-admin-text">¡Venta registrada!</h2>
            <p className="mt-1 text-admin-muted">Total cobrado</p>
            <p className="text-3xl font-bold text-admin-text">{formatPrice(lastSale.total_amount)}</p>
            {lastSale.discount_percent > 0 && (
              <p className="mt-1 text-sm font-semibold text-emerald-700">
                Con {lastSale.discount_percent}% de descuento (−{formatPrice(lastSale.discount_amount)})
              </p>
            )}
            <button
              type="button"
              onClick={() => setLastSale(null)}
              className={`${ADMIN_BUTTON_PRIMARY} mt-6 w-full`}
            >
              Nueva venta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
