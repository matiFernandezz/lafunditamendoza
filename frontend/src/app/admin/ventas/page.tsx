"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleCheck, Search, X } from "lucide-react";
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
import AdminNotice from "../AdminNotice";
import {
  ADMIN_CAP,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_TEXT_MUTED,
  adminButton,
  adminChip,
  adminIconButton,
  adminInput,
} from "../adminStyles";
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
  const categoryNamesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

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
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10">
        <AdminNotice kind="danger">{loadError}</AdminNotice>
        <button type="button" onClick={retryLoad} className={adminButton("primary")}>
          Reintentar
        </button>
      </div>
    );
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      className={`flex flex-col gap-4 md:flex-row md:items-start md:gap-6 ${cartCount > 0 ? "pb-[72px] md:pb-0" : ""}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-4 md:gap-5">
        <div>
          <h1 className={ADMIN_PAGE_TITLE}>Nueva venta</h1>
          <p className={`${ADMIN_PAGE_SUBTITLE} hidden md:block`}>Tocá un modelo para sumarlo a la venta.</p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <label htmlFor="search" className="sr-only">
              Buscar por producto o SKU
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-admin-muted"
            />
            <input
              id="search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por producto o SKU…"
              className={`${adminInput({ prefix: "icon", suffix: search.length > 0 })} [&::-webkit-search-cancel-button]:hidden`}
            />
            {search.length > 0 && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Borrar búsqueda"
                title="Borrar búsqueda"
                className={`${adminIconButton("plain", "sm")} absolute right-1.5 top-1/2 -translate-y-1/2`}
              >
                <X aria-hidden="true" className="size-[18px]" />
              </button>
            )}
          </div>

          {categories.length > 0 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                aria-pressed={selectedCategory === null}
                className={adminChip(selectedCategory === null)}
              >
                Todas
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  aria-pressed={selectedCategory === c.id}
                  className={adminChip(selectedCategory === c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <ProductGrid
          products={filteredProducts}
          modelNamesById={modelNamesById}
          categoryNamesById={categoryNamesById}
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
        onConfirm={handleConfirm}
        submitting={submitting}
        error={saleError}
      />

      {lastSale !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="venta-registrada"
            className="flex w-full max-w-[400px] flex-col items-center gap-1.5 rounded-lg bg-white p-6 text-center"
          >
            <CircleCheck aria-hidden="true" className="size-12 text-admin-ok" strokeWidth={1.5} />
            <h2 id="venta-registrada" className="mt-2 font-display text-[22px] font-semibold text-admin-text">
              Venta registrada
            </h2>
            <p className={`mt-2 ${ADMIN_CAP}`}>Total cobrado</p>
            <p className="font-mono text-4xl font-bold tabular-nums text-admin-text">
              {formatPrice(lastSale.total_amount)}
            </p>
            <p className="text-sm text-admin-muted">
              {lastSale.payment_method === "efectivo" ? "Efectivo" : "Transferencia"}
              {lastSale.discount_percent > 0 &&
                ` · ${lastSale.discount_percent}% de descuento (− ${formatPrice(lastSale.discount_amount)})`}
            </p>
            <button
              type="button"
              autoFocus
              onClick={() => setLastSale(null)}
              className={`${adminButton("primary", "lg")} mt-5 w-full`}
            >
              Nueva venta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
