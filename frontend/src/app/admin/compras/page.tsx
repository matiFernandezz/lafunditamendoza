"use client";

import { Minus, PackageCheck, Plus, Search, Trash2 } from "lucide-react";
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
import AdminNotice from "../AdminNotice";
import {
  ADMIN_CAP,
  ADMIN_CARD,
  ADMIN_EMPTY,
  ADMIN_INPUT,
  ADMIN_INPUT_ADORNMENT,
  ADMIN_LABEL,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_ROW_LIST,
  ADMIN_TEXT_MUTED,
  adminButton,
  adminIconButton,
  adminInput,
} from "../adminStyles";
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
      const supplierName = suppliers.find((s) => s.id === supplierId)?.name;
      const entered = lines.reduce((sum, l) => sum + (parseQuantity(l.quantity) ?? 0), 0);
      setSuccess(
        `Compra registrada${supplierName ? ` · ${supplierName}` : ""} · ${formatPrice(res.data.total_amount)} · se ${
          entered === 1 ? "sumó 1 unidad" : `sumaron ${entered} unidades`
        } al stock.`,
      );
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
    return <p className={`py-10 text-center ${ADMIN_TEXT_MUTED}`}>Cargando…</p>;
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

  const units = lines.reduce((sum, l) => sum + (parseQuantity(l.quantity) ?? 0), 0);

  const summary = (
    <div className={`${ADMIN_CARD} flex flex-col gap-2.5 lg:p-5`}>
      <SummaryRow label="Productos" value={String(lines.length)} />
      <SummaryRow label="Unidades que entran" value={String(units)} />
      <div className="my-0.5 border-t border-admin-border" />
      <div className="flex items-baseline justify-between gap-3">
        <span className={ADMIN_CAP}>Costo total</span>
        <span className="font-mono text-[28px] font-bold tabular-nums text-admin-text">{formatPrice(total)}</span>
      </div>
      {error && <AdminNotice kind="danger">{error}</AdminNotice>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`${adminButton("primary", "lg")} mt-1.5 w-full`}
      >
        <PackageCheck aria-hidden="true" className="size-[22px]" />
        {submitting ? "Registrando…" : "Registrar compra"}
      </button>
      {!canSubmit && !submitting && (
        <p className={`text-center ${ADMIN_TEXT_MUTED}`}>
          {supplierId === ""
            ? "Elegí un proveedor."
            : lines.length === 0
              ? "Agregá al menos un producto."
              : "Completá cantidad y costo de cada producto."}
        </p>
      )}
    </div>
  );

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-5">
      <div>
        <h1 className={ADMIN_PAGE_TITLE}>Cargar compra</h1>
        <p className={ADMIN_PAGE_SUBTITLE}>Mercadería que entra de un proveedor. Se suma al stock.</p>
      </div>

      {success && (
        <AdminNotice kind="ok" onClose={() => setSuccess(null)}>
          {success}
        </AdminNotice>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
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
              <label htmlFor="fecha" className={ADMIN_LABEL}>
                Fecha <span className="font-normal text-admin-muted">(opcional, por defecto hoy)</span>
              </label>
              <input
                id="fecha"
                type="date"
                value={date}
                onChange={(e) => {
                  touch();
                  setDate(e.target.value);
                }}
                className={ADMIN_INPUT}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="buscar" className="block text-sm font-semibold text-admin-text">
              Productos que entran
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-admin-muted"
              />
              <input
                id="buscar"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto, modelo o SKU para agregar"
                className={adminInput({ prefix: "icon" })}
              />
            </div>

            {search.trim() !== "" &&
              (results.length === 0 ? (
                <p className={`${ADMIN_CARD} ${ADMIN_TEXT_MUTED}`}>
                  Sin resultados. Si es un producto nuevo, crealo en “Nuevo producto”.
                </p>
              ) : (
                <ul className={ADMIN_ROW_LIST}>
                  {results.slice(0, MAX_RESULTS).map(({ product, variant, label }) => {
                    const inLine = lines.some((l) => l.variantId === variant.id);
                    return (
                      <li key={variant.id}>
                        <button
                          type="button"
                          onClick={() => addVariant(product, variant, label)}
                          className="flex min-h-14 w-full items-center gap-3 py-2 pl-4 pr-3 text-left transition-colors duration-200 hover:bg-admin-bg"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block break-words text-[15px] font-semibold text-admin-text">
                              {product.name}
                            </span>
                            <span className={`block break-words ${ADMIN_TEXT_MUTED}`}>
                              {label}
                              {!variant.active && " (inactiva)"} · stock {variant.stock_quantity}
                              {inLine && <span className="font-semibold text-admin-text"> · en la compra</span>}
                            </span>
                          </span>
                          <span
                            aria-hidden="true"
                            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-admin-ink text-white"
                          >
                            <Plus className="size-5" strokeWidth={2.2} />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ))}
            {results.length > MAX_RESULTS && (
              <p className={ADMIN_TEXT_MUTED}>
                Mostrando {MAX_RESULTS} de {results.length}. Afiná la búsqueda para ver el resto.
              </p>
            )}
          </div>

          {lines.length === 0 ? (
            <p className={ADMIN_EMPTY}>Buscá y agregá los productos de esta compra.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {lines.map((line, index) => {
                const q = parseQuantity(line.quantity);
                const c = parseCost(line.unitCost);
                const invalid = lineErrors[index];
                return (
                  <li
                    key={line.variantId}
                    className={`min-w-0 rounded-md border bg-white p-4 ${
                      invalid && line.unitCost !== "" ? "border-admin-danger-border" : "border-admin-border"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-[15px] font-semibold text-admin-text">{line.productName}</p>
                        <p className={`mt-0.5 ${ADMIN_TEXT_MUTED}`}>
                          {line.label} · <span className="font-mono">{line.sku}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.variantId)}
                        title="Quitar de la compra"
                        aria-label="Quitar de la compra"
                        className={adminIconButton("danger")}
                      >
                        <Trash2 aria-hidden="true" className="size-5" />
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-end gap-3 lg:grid-cols-[auto_minmax(0,180px)_1fr]">
                      <div>
                        <label htmlFor={`qty-${line.variantId}`} className={ADMIN_LABEL}>
                          Cantidad
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="Restar una unidad"
                            title="Restar una unidad"
                            onClick={() => stepQuantity(line, -1)}
                            disabled={(q ?? 0) <= 1}
                            className={adminIconButton()}
                          >
                            <Minus aria-hidden="true" className="size-5" />
                          </button>
                          <input
                            id={`qty-${line.variantId}`}
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={1}
                            value={line.quantity}
                            onChange={(e) => updateLine(line.variantId, { quantity: e.target.value })}
                            className={`${adminInput({ align: "center", mono: true })} max-w-16`}
                          />
                          <button
                            type="button"
                            aria-label="Sumar una unidad"
                            title="Sumar una unidad"
                            onClick={() => stepQuantity(line, 1)}
                            className={adminIconButton()}
                          >
                            <Plus aria-hidden="true" className="size-5" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label htmlFor={`cost-${line.variantId}`} className={ADMIN_LABEL}>
                          Costo unitario
                        </label>
                        <div className="relative">
                          <span aria-hidden="true" className={`${ADMIN_INPUT_ADORNMENT} left-3`}>
                            $
                          </span>
                          <input
                            id={`cost-${line.variantId}`}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="any"
                            value={line.unitCost}
                            onChange={(e) => updateLine(line.variantId, { unitCost: e.target.value })}
                            placeholder="0"
                            className={adminInput({
                              prefix: "text",
                              align: "right",
                              mono: true,
                              state: line.unitCost === "" ? null : "dirty",
                            })}
                          />
                        </div>
                      </div>
                      <p className="col-span-2 text-right font-mono text-[15px] font-semibold tabular-nums text-admin-text lg:col-span-1 lg:self-center">
                        {q !== null && c !== null ? (
                          `Subtotal ${formatPrice(q * c)}`
                        ) : (
                          <span className="font-sans text-[13px] font-normal text-admin-muted">
                            Completá cantidad y costo (mayores a 0)
                          </span>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="min-w-0 lg:sticky lg:top-[88px]">{summary}</aside>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[15px] text-admin-text">
      <span>{label}</span>
      <span className="font-mono font-medium tabular-nums">{value}</span>
    </div>
  );
}
