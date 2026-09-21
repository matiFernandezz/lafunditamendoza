"use client";

import { useEffect, useMemo, useState } from "react";
import { getIphoneModels, type IphoneModel } from "@/lib/catalog";
import {
  AdminApiError,
  createPurchase,
  getAdminProducts,
  getSuppliers,
  type AdminProduct,
  type AdminVariant,
  type Supplier,
} from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import { variantLabel } from "../ventas/utils";
import SupplierField from "./SupplierField";

type PurchaseLine = {
  variantId: string;
  productName: string;
  label: string;
  sku: string;
  quantity: string;
  unitCost: string;
};

const MAX_RESULTS = 10;

const inputClass =
  "h-14 w-full rounded-2xl border border-graphite bg-transparent px-4 text-base";

function parseQuantity(value: string): number | null {
  const n = Number(value);
  return value.trim() !== "" && Number.isInteger(n) && n > 0 ? n : null;
}

function parseCost(value: string): number | null {
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n) && n > 0 ? n : null;
}

async function loadData() {
  const [suppliers, products, models] = await Promise.all([
    getSuppliers(),
    getAdminProducts(),
    getIphoneModels(),
  ]);
  return { suppliers: suppliers.data, products: products.data, models };
}

export default function ComprasPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [models, setModels] = useState<IphoneModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<PurchaseLine[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const modelNamesById = useMemo(() => new Map(models.map((m) => [m.id, m.name])), [models]);

  useEffect(() => {
    let ignore = false;

    loadData()
      .then((result) => {
        if (ignore) return;
        setSuppliers(result.suppliers);
        setProducts(result.products);
        setModels(result.models);
        setLoading(false);
      })
      .catch((err) => {
        if (ignore) return;
        setLoadError(err instanceof Error ? err.message : "No se pudieron cargar los datos.");
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  function retryLoad() {
    setLoading(true);
    setLoadError(null);
    loadData()
      .then((result) => {
        setSuppliers(result.suppliers);
        setProducts(result.products);
        setModels(result.models);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "No se pudieron cargar los datos.");
      })
      .finally(() => setLoading(false));
  }

  const results = useMemo(() => {
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const rows: { product: AdminProduct; variant: AdminVariant; label: string }[] = [];
    if (tokens.length === 0) return rows;

    for (const product of products) {
      for (const variant of product.product_variants) {
        const modelName = variant.iphone_model_id
          ? modelNamesById.get(variant.iphone_model_id)
          : undefined;
        const label = variantLabel(variant, modelName);
        const haystack = `${product.name} ${label} ${variant.sku}`.toLowerCase();
        if (tokens.every((t) => haystack.includes(t))) rows.push({ product, variant, label });
      }
    }
    return rows;
  }, [products, modelNamesById, search]);

  const lineErrors = lines.map((l) => parseQuantity(l.quantity) === null || parseCost(l.unitCost) === null);
  const hasInvalidLine = lineErrors.some(Boolean);

  const total = lines.reduce((sum, l) => {
    const q = parseQuantity(l.quantity);
    const c = parseCost(l.unitCost);
    return q !== null && c !== null ? sum + q * c : sum;
  }, 0);

  const canSubmit = !submitting && supplierId !== "" && lines.length > 0 && !hasInvalidLine;

  function touch() {
    setError(null);
    setSuccess(null);
  }

  function addVariant(product: AdminProduct, variant: AdminVariant, label: string) {
    touch();
    // Se limpia la búsqueda para que la línea recién agregada quede a la vista.
    setSearch("");
    setLines((prev) => {
      const existing = prev.find((l) => l.variantId === variant.id);
      if (existing) {
        return prev.map((l) =>
          l.variantId === variant.id
            ? { ...l, quantity: String((parseQuantity(l.quantity) ?? 0) + 1) }
            : l,
        );
      }
      return [
        ...prev,
        {
          variantId: variant.id,
          productName: product.name,
          label,
          sku: variant.sku,
          quantity: "1",
          unitCost: variant.cost_price > 0 ? String(variant.cost_price) : "",
        },
      ];
    });
  }

  function updateLine(variantId: string, patch: Partial<PurchaseLine>) {
    touch();
    setLines((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, ...patch } : l)));
  }

  function stepQuantity(line: PurchaseLine, delta: number) {
    const next = (parseQuantity(line.quantity) ?? 0) + delta;
    if (next < 1) return;
    updateLine(line.variantId, { quantity: String(next) });
  }

  function removeLine(variantId: string) {
    touch();
    setLines((prev) => prev.filter((l) => l.variantId !== variantId));
  }

  async function refreshAfterSubmit() {
    try {
      const result = await loadData();
      setSuppliers(result.suppliers);
      setProducts(result.products);
      setModels(result.models);
      return result.suppliers;
    } catch {
      return null;
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await createPurchase({
        supplier_id: supplierId,
        ...(date ? { purchase_date: date } : {}),
        items: lines.map((l) => ({
          variant_id: l.variantId,
          quantity: parseQuantity(l.quantity)!,
          unit_cost: parseCost(l.unitCost)!,
        })),
      });
      setSuccess(`Compra registrada. Total ${formatPrice(res.data.total_amount)}.`);
      setLines([]);
      setSupplierId("");
      setDate("");
      setSearch("");
      await refreshAfterSubmit();
    } catch (err) {
      setError(
        err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.",
      );
      // Si el proveedor ya no existe, lo sacamos de la selección; las líneas quedan.
      const fresh = await refreshAfterSubmit();
      if (fresh && !fresh.some((s) => s.id === supplierId)) setSupplierId("");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="py-10 text-center text-graphite">Cargando…</p>;
  }

  if (loadError) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p role="alert">{loadError}</p>
        <button
          type="button"
          onClick={retryLoad}
          className="h-14 rounded-2xl bg-ink px-6 text-base font-semibold text-paper"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Registrar compra</h1>

      <section className="space-y-4">
        <SupplierField
          suppliers={suppliers}
          value={supplierId}
          onChange={(id) => {
            touch();
            setSupplierId(id);
          }}
          onCreated={(supplier) => {
            touch();
            setSuppliers((prev) =>
              [...prev, supplier].sort((a, b) => a.name.localeCompare(b.name, "es")),
            );
            setSupplierId(supplier.id);
          }}
        />
        <div>
          <label htmlFor="fecha" className="mb-1 block text-base font-medium">
            Fecha (opcional, por defecto hoy)
          </label>
          <input
            id="fecha"
            type="date"
            value={date}
            onChange={(e) => {
              touch();
              setDate(e.target.value);
            }}
            className={inputClass}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">Productos</h2>
        <div>
          <label htmlFor="buscar" className="sr-only">
            Buscar por producto, modelo o SKU
          </label>
          <input
            id="buscar"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por producto, modelo o SKU…"
            className={inputClass}
          />
        </div>

        {search.trim() === "" ? (
          <p className="text-graphite">Escribí un producto, modelo o SKU para agregarlo.</p>
        ) : results.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-rule p-4 text-center text-graphite">
            No hay variantes que coincidan.
          </p>
        ) : (
          <ul className="divide-y divide-rule rounded-2xl border border-rule">
            {results.slice(0, MAX_RESULTS).map(({ product, variant, label }) => {
              const inLine = lines.find((l) => l.variantId === variant.id);
              return (
                <li key={variant.id}>
                  <button
                    type="button"
                    onClick={() => addVariant(product, variant, label)}
                    className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-rule"
                  >
                    <span className="min-w-0">
                      <span className="block break-words font-semibold">{product.name}</span>
                      <span className="block break-words text-graphite">
                        {label}
                        {!variant.active && " (inactiva)"}
                      </span>
                      <span className="block font-mono text-xs text-graphite">{variant.sku}</span>
                    </span>
                    <span className="shrink-0 text-right text-sm tabular-nums">
                      <span className="block">Stock {variant.stock_quantity}</span>
                      <span className="block font-mono text-graphite">
                        {variant.cost_price > 0 ? formatPrice(variant.cost_price) : "sin costo"}
                      </span>
                      {inLine && <span className="block font-medium">En la compra</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {results.length > MAX_RESULTS && (
          <p className="text-sm text-graphite">
            Mostrando {MAX_RESULTS} de {results.length}. Afiná la búsqueda para ver el resto.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Líneas de la compra
        </h2>
        {lines.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-rule p-4 text-center text-graphite">
            Tocá una variante de arriba para agregarla.
          </p>
        ) : (
          <ul className="space-y-3">
            {lines.map((line, index) => {
              const q = parseQuantity(line.quantity);
              const c = parseCost(line.unitCost);
              const invalid = lineErrors[index];
              return (
                <li
                  key={line.variantId}
                  className={`space-y-3 rounded-2xl border p-4 ${invalid ? "border-ink" : "border-rule"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{line.productName}</p>
                      <p className="text-graphite">{line.label}</p>
                      <p className="font-mono text-xs text-graphite">{line.sku}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.variantId)}
                      className="min-h-11 shrink-0 px-2 text-base font-medium underline underline-offset-2"
                    >
                      Quitar
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={`qty-${line.variantId}`} className="mb-1 block text-base font-medium">
                        Cantidad
                      </label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          aria-label="Restar"
                          onClick={() => stepQuantity(line, -1)}
                          className="h-14 w-12 shrink-0 rounded-2xl border border-graphite text-xl font-medium active:bg-rule"
                        >
                          −
                        </button>
                        <input
                          id={`qty-${line.variantId}`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                          value={line.quantity}
                          onChange={(e) => updateLine(line.variantId, { quantity: e.target.value })}
                          className="h-14 w-full min-w-0 rounded-2xl border border-graphite bg-transparent px-1 text-center text-base"
                        />
                        <button
                          type="button"
                          aria-label="Sumar"
                          onClick={() => stepQuantity(line, 1)}
                          className="h-14 w-12 shrink-0 rounded-2xl border border-graphite text-xl font-medium active:bg-rule"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor={`cost-${line.variantId}`} className="mb-1 block text-base font-medium">
                        Costo unitario
                      </label>
                      <input
                        id={`cost-${line.variantId}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={line.unitCost}
                        onChange={(e) => updateLine(line.variantId, { unitCost: e.target.value })}
                        placeholder="$"
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                  </div>

                  <p className="flex justify-between text-base">
                    <span className="text-graphite">
                      {invalid ? "Completá cantidad y costo (mayores a 0)" : "Subtotal"}
                    </span>
                    <span className="font-mono font-medium tabular-nums">
                      {q !== null && c !== null ? formatPrice(q * c) : "—"}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="sticky bottom-0 -mx-4 space-y-3 border-t border-rule bg-paper px-4 py-3 md:mx-0 md:rounded-t-2xl md:border">
        {error && (
          <p role="alert" className="rounded-2xl border border-ink p-3 text-base font-medium">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="rounded-2xl bg-ink p-3 text-base font-medium text-paper">
            {success}
          </p>
        )}
        <div className="flex items-baseline justify-between text-lg font-semibold">
          <span>Total</span>
          <span className="font-mono tabular-nums">{formatPrice(total)}</span>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="h-14 w-full rounded-2xl bg-ink text-base font-semibold text-paper disabled:opacity-40"
        >
          {submitting ? "Registrando…" : "Registrar compra"}
        </button>
        {!canSubmit && !submitting && (
          <p className="text-sm text-graphite">
            {supplierId === ""
              ? "Elegí un proveedor para registrar la compra."
              : lines.length === 0
                ? "Agregá al menos una línea."
                : "Revisá las líneas marcadas."}
          </p>
        )}
      </div>
    </div>
  );
}
