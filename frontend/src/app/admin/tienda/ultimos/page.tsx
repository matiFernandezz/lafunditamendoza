"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AdminApiError,
  addLatestProduct,
  getAdminProducts,
  getLatestProducts,
  removeLatestProduct,
  reorderLatestProducts,
  type AdminProduct,
  type LatestProduct,
} from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import { LATEST_LIMIT } from "@/lib/latestProducts";
import AdminLoading from "../../AdminLoading";
import AdminNotice from "../../AdminNotice";
import SearchBox from "../../SearchBox";
import {
  ADMIN_EMPTY,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXT_MUTED,
  adminBadge,
  adminButton,
} from "../../adminStyles";
import { ReorderButtons, moveItem } from "../storeUi";

function errorMessage(err: unknown) {
  return err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.";
}

/** Lo que muestra la fila de un producto: foto, precio desde y unidades en stock. */
function summary(product: AdminProduct) {
  const variants = product.product_variants.filter((v) => v.active);
  const inStock = variants.filter((v) => v.stock_quantity > 0);
  const photo = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? product.image_url;
  return {
    photo,
    price: inStock.length > 0 ? Math.min(...inStock.map((v) => v.price)) : null,
    units: inStock.reduce((sum, v) => sum + v.stock_quantity, 0),
    // En la home solo aparece si está activo y tiene stock.
    visible: product.active && inStock.length > 0,
  };
}

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function ProductThumb({ url }: { url: string | null }) {
  return (
    <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded border border-admin-border bg-[#fafaf8]">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto del producto tal cual.
        <img src={url} alt="" className="size-full object-contain" />
      ) : null}
    </span>
  );
}

/** Tienda › Últimos ingresos: qué productos salen en la tira de la home y en qué orden. */
export default function UltimosIngresosAdminPage() {
  const [latest, setLatest] = useState<LatestProduct[] | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([getLatestProducts(), getAdminProducts()])
      .then(([l, p]) => {
        if (ignore) return;
        setLatest(l.data);
        setProducts(p.data);
      })
      .catch((err) => {
        if (!ignore) setError(errorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, []);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const inList = useMemo(() => new Set((latest ?? []).map((l) => l.product_id)), [latest]);
  const full = (latest?.length ?? 0) >= LATEST_LIMIT;

  // Para agregar: los productos activos que no están, los más nuevos primero, filtrados por nombre.
  const candidates = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    return products
      .filter((p) => p.active && !inList.has(p.id))
      .filter((p) => words.every((w) => normalize(p.name).includes(w)))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [products, inList, query]);
  const activeCount = useMemo(() => products.filter((p) => p.active && !inList.has(p.id)).length, [products, inList]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, delta: -1 | 1) {
    if (!latest) return;
    const next = moveItem(latest, index, delta);
    setLatest(next);
    void run(async () => {
      await reorderLatestProducts(next.map((l) => l.id));
      setNotice("Orden guardado.");
    });
  }

  const visibleCount = (latest ?? []).filter((l) => {
    const p = byId.get(l.product_id);
    return p && summary(p).visible;
  }).length;

  return (
    <div className="flex max-w-[900px] flex-col gap-5">
      <div>
        <h1 className={ADMIN_PAGE_TITLE}>Últimos ingresos</h1>
        <p className={ADMIN_PAGE_SUBTITLE}>
          La tira de productos de la home, en este orden (el primero va a la izquierda). Cuando cargás un producto nuevo
          entra primero solo y, si ya hay {LATEST_LIMIT}, sale el último. Acá lo ajustás a mano.
        </p>
      </div>

      {notice && (
        <AdminNotice kind="ok" onClose={() => setNotice(null)}>
          {notice}
        </AdminNotice>
      )}
      {error && (
        <AdminNotice kind="danger" onClose={() => setError(null)}>
          {error}
        </AdminNotice>
      )}

      {!latest ? (
        !error && <AdminLoading />
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className={ADMIN_SECTION_TITLE}>
                En la home{" "}
                <span className="font-mono text-sm font-normal text-admin-muted">
                  {latest.length}/{LATEST_LIMIT}
                </span>
              </h2>
              {latest.length > 0 && visibleCount < latest.length && (
                <p className={ADMIN_TEXT_MUTED}>
                  Se ven {visibleCount} de {latest.length}: los que no tienen stock o están ocultos no aparecen.
                </p>
              )}
            </div>
            {latest.length === 0 ? (
              <p className={ADMIN_EMPTY}>La lista está vacía: en la home no aparece. Agregá productos desde abajo.</p>
            ) : (
              <ol className="divide-y divide-admin-border overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
                {latest.map((item, index) => {
                  const product = byId.get(item.product_id);
                  const info = product ? summary(product) : null;
                  const name = product?.name ?? "Producto";
                  return (
                    <li key={item.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                      <span className="w-6 shrink-0 text-center font-mono text-sm font-semibold text-admin-muted">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <ProductThumb url={info?.photo ?? null} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          {product ? (
                            <Link
                              href={`/admin/stock/producto/${product.id}`}
                              className="truncate text-[15px] font-semibold text-admin-text hover:underline"
                            >
                              {product.name}
                            </Link>
                          ) : (
                            <span className="text-[15px] font-semibold text-admin-muted">Producto</span>
                          )}
                          {info && !info.visible && <span className={adminBadge("warn")}>No se ve</span>}
                        </span>
                        <span className={`block ${ADMIN_TEXT_MUTED}`}>
                          {info?.price != null
                            ? `${formatPrice(info.price)} · ${info.units} en stock`
                            : product && !product.active
                              ? "Oculto en la web"
                              : "Sin stock"}
                        </span>
                      </span>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <ReorderButtons
                          index={index}
                          total={latest.length}
                          disabled={busy}
                          onMove={(delta) => move(index, delta)}
                          label={name}
                        />
                        {confirmDelete === item.id ? (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void run(async () => {
                                  await removeLatestProduct(item.id);
                                  setLatest((prev) => (prev ?? []).filter((l) => l.id !== item.id));
                                  setConfirmDelete(null);
                                  setNotice(`${name} salió de Últimos ingresos (el producto no se toca).`);
                                })
                              }
                              className={adminButton("danger", "sm")}
                            >
                              Quitar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(null)}
                              className={adminButton("ghost", "sm")}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(item.id)}
                            disabled={busy}
                            aria-label={`Quitar ${name}`}
                            title="Quitar de Últimos ingresos"
                            className={adminButton("dangerOutline", "sm")}
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div>
              <h2 className={ADMIN_SECTION_TITLE}>Agregar un producto</h2>
              <p className={ADMIN_TEXT_MUTED}>
                {full
                  ? `La lista ya tiene ${LATEST_LIMIT}: sacá uno de arriba para poder agregar otro.`
                  : "Entra primero en la lista; después lo podés mover."}
              </p>
            </div>
            <SearchBox
              value={query}
              onChange={setQuery}
              shown={candidates.length}
              total={activeCount}
              label="Buscar un producto"
              placeholder="Buscar por nombre…"
            />
            {candidates.length === 0 ? (
              <p className={ADMIN_EMPTY}>
                {query.trim() ? "No hay productos con ese nombre fuera de la lista." : "Ya están todos en la lista."}
              </p>
            ) : (
              <ul className="max-h-[480px] divide-y divide-admin-border overflow-y-auto rounded-lg border border-admin-border bg-admin-surface">
                {candidates.map((product) => {
                  const info = summary(product);
                  return (
                    <li key={product.id} className="flex items-center gap-3 p-3">
                      <ProductThumb url={info.photo} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-admin-text">{product.name}</span>
                        <span className={`block ${ADMIN_TEXT_MUTED}`}>
                          {info.price !== null ? `${formatPrice(info.price)} · ${info.units} en stock` : "Sin stock"}
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={busy || full}
                        onClick={() =>
                          void run(async () => {
                            const res = await addLatestProduct(product.id);
                            setLatest((prev) => [
                              res.data,
                              ...(prev ?? []).map((l) => ({ ...l, sort_order: l.sort_order + 1 })),
                            ]);
                            setNotice(`${product.name} entró primero en Últimos ingresos.`);
                          })
                        }
                        className={adminButton("secondary", "sm")}
                      >
                        <Plus aria-hidden="true" className="size-4" />
                        Agregar
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
