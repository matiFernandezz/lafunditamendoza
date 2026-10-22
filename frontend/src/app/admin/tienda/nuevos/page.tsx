"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AdminApiError,
  createNewArrival,
  deleteNewArrival,
  getAdminCategories,
  getAdminProducts,
  getNewArrivals,
  reorderNewArrivals,
  updateNewArrival,
  uploadStoreImage,
  type AdminCategory,
  type AdminProduct,
  type NewArrival,
} from "@/lib/adminApi";
import type { Cutout } from "@/lib/cutout";
import { formatPrice } from "@/lib/format";
import AdminNotice from "../../AdminNotice";
import { ADMIN_EMPTY, ADMIN_PAGE_SUBTITLE, ADMIN_PAGE_TITLE, ADMIN_TEXT_MUTED, adminBadge, adminButton } from "../../adminStyles";
import { categorySubtree } from "../../categoryPath";
import { ReorderButtons, moveItem } from "../storeUi";
import PhotoChooser from "./PhotoChooser";

function errorMessage(err: unknown) {
  return err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.";
}

/** Las fundas: los productos de la primera categoría de tope con tipos (Fundas), las más nuevas primero. */
function fundasOf(products: AdminProduct[], categories: AdminCategory[]) {
  const top = categories
    .filter((c) => c.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order)
    .find((c) => categories.some((child) => child.parent_id === c.id));
  const scope = top ? categorySubtree(categories, top.id) : null;
  return products
    .filter((p) => p.active && (!scope || scope.has(p.category_id)))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

type Chooser = { mode: "add" } | { mode: "change"; arrival: NewArrival };

/** Tienda › Las funditas más vendidas: qué fundas giran en la home, en qué orden y con qué foto. */
export default function NuevosIngresosAdminPage() {
  const [arrivals, setArrivals] = useState<NewArrival[] | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [chooser, setChooser] = useState<Chooser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([getNewArrivals(), getAdminProducts(), getAdminCategories()])
      .then(([a, p, c]) => {
        if (ignore) return;
        setArrivals(a.data);
        setProducts(p.data);
        setCategories(c.data);
      })
      .catch((err) => {
        if (!ignore) setError(errorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, []);

  const fundas = useMemo(() => fundasOf(products, categories), [products, categories]);

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
    if (!arrivals) return;
    const next = moveItem(arrivals, index, delta);
    setArrivals(next);
    void run(async () => {
      await reorderNewArrivals(next.map((a) => a.id));
      setNotice("Orden guardado.");
    });
  }

  async function saveCutout(productId: string, cutout: Cutout, edgeColor: string) {
    try {
      const url = await uploadStoreImage(cutout.blob, "image/png");
      if (chooser?.mode === "change") {
        const res = await updateNewArrival(chooser.arrival.id, { image_url: url, edge_color: edgeColor });
        setArrivals((prev) => (prev ?? []).map((a) => (a.id === res.data.id ? res.data : a)));
        setNotice(`${res.data.product?.name ?? "La funda"}: foto cambiada.`);
      } else {
        const res = await createNewArrival({ product_id: productId, image_url: url, edge_color: edgeColor });
        setArrivals((prev) => [...(prev ?? []), res.data]);
        setNotice(`${res.data.product?.name ?? "La funda"} agregada al final.`);
      }
    } catch (err) {
      throw new Error(errorMessage(err));
    }
  }

  const visible = (arrivals ?? []).filter((a) => a.product?.active && a.price !== null).length;

  return (
    <div className="flex max-w-[900px] flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={ADMIN_PAGE_TITLE}>Las funditas más vendidas</h1>
          <p className={ADMIN_PAGE_SUBTITLE}>
            Las fundas que giran en la home, en este orden. Elegís la funda y la foto (se le saca el fondo sola); el nombre, el
            precio y la descripción salen del producto y se actualizan solos.
          </p>
        </div>
        <button type="button" onClick={() => setChooser({ mode: "add" })} disabled={busy || !arrivals} className={adminButton("primary")}>
          <Plus aria-hidden="true" className="size-5" />
          Agregar funda
        </button>
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

      {!arrivals ? (
        !error && <p className={`py-10 text-center ${ADMIN_TEXT_MUTED}`}>Cargando…</p>
      ) : arrivals.length === 0 ? (
        <p className={ADMIN_EMPTY}>
          No hay fundas en esta sección: en la home no aparece. Agregá la primera.
        </p>
      ) : (
        <>
          <p className={ADMIN_TEXT_MUTED}>
            {visible === arrivals.length
              ? `Se ven las ${arrivals.length} en la home.`
              : `Se ven ${visible} de ${arrivals.length}: las que no tienen stock o están ocultas no aparecen.`}{" "}
            Recomendado: 3 o 4, cada una suma un tramo de scroll.
          </p>
          <ol className="divide-y divide-admin-border overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
            {arrivals.map((arrival, index) => {
              const hidden = !arrival.product?.active || arrival.price === null;
              return (
                <li key={arrival.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                  <span className="w-6 shrink-0 text-center font-mono text-sm font-semibold text-admin-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex h-20 w-14 shrink-0 items-center justify-center rounded border border-admin-border bg-[#fafaf8] p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element -- recorte guardado en Storage. */}
                    <img src={arrival.image_url} alt="" className="max-h-full max-w-full object-contain" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      {arrival.product ? (
                        <Link
                          href={`/admin/stock/producto/${arrival.product.id}`}
                          className="truncate text-[15px] font-semibold text-admin-text hover:underline"
                        >
                          {arrival.product.name}
                        </Link>
                      ) : (
                        <span className="text-[15px] font-semibold text-admin-muted">Producto eliminado</span>
                      )}
                      {hidden && <span className={adminBadge("warn")}>No se ve</span>}
                    </span>
                    <span className={`block ${ADMIN_TEXT_MUTED}`}>
                      {arrival.price !== null
                        ? `${formatPrice(arrival.price)} · ${arrival.units} en stock`
                        : !arrival.product?.active
                          ? "Oculta en la web"
                          : "Sin stock"}
                    </span>
                  </span>
                  {/* Canto: el borde que se ve de perfil mientras gira. Se calcula de la foto. */}
                  <label
                    className="flex shrink-0 flex-col items-center gap-0.5"
                    title="El borde del teléfono que se ve de costado mientras gira. Se calcula solo de la foto."
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-muted">Canto</span>
                    <input
                      type="color"
                      value={arrival.edge_color}
                      disabled={busy}
                      aria-label={`Canto de ${arrival.product?.name ?? "la funda"}`}
                      onChange={(e) => {
                        const color = e.target.value;
                        setArrivals((prev) => (prev ?? []).map((a) => (a.id === arrival.id ? { ...a, edge_color: color } : a)));
                      }}
                      onBlur={(e) =>
                        void run(async () => {
                          await updateNewArrival(arrival.id, { edge_color: e.target.value });
                          setNotice("Canto guardado.");
                        })
                      }
                      className="h-8 w-8 cursor-pointer rounded border border-admin-border-strong bg-admin-surface p-0.5"
                    />
                  </label>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <ReorderButtons
                      index={index}
                      total={arrivals.length}
                      disabled={busy}
                      onMove={(delta) => move(index, delta)}
                      label={arrival.product?.name ?? "la funda"}
                    />
                    <button
                      type="button"
                      onClick={() => setChooser({ mode: "change", arrival })}
                      disabled={busy || !arrival.product}
                      className={adminButton("secondary", "sm")}
                    >
                      Cambiar foto
                    </button>
                    {confirmDelete === arrival.id ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await deleteNewArrival(arrival.id);
                              setArrivals((prev) => (prev ?? []).filter((a) => a.id !== arrival.id));
                              setConfirmDelete(null);
                              setNotice("Funda quitada de la sección (el producto no se toca).");
                            })
                          }
                          className={adminButton("danger", "sm")}
                        >
                          Quitar
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(null)} className={adminButton("ghost", "sm")}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(arrival.id)}
                        disabled={busy}
                        aria-label={`Quitar ${arrival.product?.name ?? "la funda"}`}
                        title="Quitar de la sección"
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
        </>
      )}

      {chooser && (
        <PhotoChooser
          products={chooser.mode === "change" ? products : fundas}
          fixedProductId={chooser.mode === "change" ? chooser.arrival.product_id : undefined}
          title={chooser.mode === "change" ? "Cambiar foto" : "Agregar funda"}
          confirmLabel={chooser.mode === "change" ? "Usar esta foto" : "Agregar"}
          onClose={() => setChooser(null)}
          onConfirm={saveCutout}
        />
      )}
    </div>
  );
}
