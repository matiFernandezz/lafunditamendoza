"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AdminApiError,
  getAdminCategories,
  updateCategory,
  uploadStoreImage,
  type AdminCategory,
} from "@/lib/adminApi";
import AdminNotice from "../../AdminNotice";
import { ADMIN_PAGE_SUBTITLE, ADMIN_PAGE_TITLE, ADMIN_TEXT_MUTED, adminButton } from "../../adminStyles";
import { PHOTO_SIZES, PickPhotoButton, SizeHint } from "../storeUi";

function errorMessage(err: unknown) {
  return err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.";
}

const byOrder = (a: AdminCategory, b: AdminCategory) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es");

/**
 * Los mosaicos de "Elegí por categoría", igual que los arma la home: la
 * primera categoría con tipos (Fundas) se abre en sus tipos y las demás van
 * como un solo mosaico (Accesorios).
 */
function homeTiles(categories: AdminCategory[]): AdminCategory[] {
  const tops = categories.filter((c) => c.parent_id === null).sort(byOrder);
  return tops.flatMap((top, index) => {
    const children = categories.filter((c) => c.parent_id === top.id).sort(byOrder);
    return index === 0 && children.length > 0 ? children : [top];
  });
}

/** Tienda › Categorías: la foto de cada mosaico de la home. */
export default function TiendaCategoriasPage() {
  const [categories, setCategories] = useState<AdminCategory[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getAdminCategories()
      .then((res) => {
        if (!ignore) setCategories(res.data);
      })
      .catch((err) => {
        if (!ignore) setError(errorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function setPhoto(category: AdminCategory, file: File | null) {
    setBusyId(category.id);
    setError(null);
    setNotice(null);
    try {
      const url = file ? await uploadStoreImage(file, file.type) : null;
      const res = await updateCategory(category.id, { home_image_url: url });
      setCategories((prev) => (prev ?? []).map((c) => (c.id === category.id ? { ...c, ...res.data } : c)));
      setNotice(file ? `${category.name}: foto cambiada.` : `${category.name}: queda sin foto (grafito liso).`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const tiles = categories ? homeTiles(categories) : [];

  return (
    <div className="flex max-w-[1000px] flex-col gap-5">
      <div>
        <h1 className={ADMIN_PAGE_TITLE}>Fotos de categorías</h1>
        <p className={ADMIN_PAGE_SUBTITLE}>
          Los mosaicos de “Elegí por categoría”. Sin foto, el mosaico va en gris grafito. El orden es el de las categorías.
        </p>
        <div className="mt-1">
          <SizeHint size={PHOTO_SIZES.tile} />
        </div>
      </div>

      {notice && (
        <AdminNotice kind="ok" onClose={() => setNotice(null)}>
          {notice}
        </AdminNotice>
      )}
      {warning && (
        <AdminNotice kind="ink" onClose={() => setWarning(null)}>
          {warning}
        </AdminNotice>
      )}
      {error && (
        <AdminNotice kind="danger" onClose={() => setError(null)}>
          {error}
        </AdminNotice>
      )}

      {!categories ? (
        !error && <p className={`py-10 text-center ${ADMIN_TEXT_MUTED}`}>Cargando…</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {tiles.map((tile, index) => {
            const busy = busyId === tile.id;
            return (
              <li key={tile.id} className="flex flex-col gap-2">
                {/* Vista previa como en la home: foto al 80% sobre grafito y velo abajo. */}
                <div className="relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-md bg-admin-muted text-admin-on-ink">
                  {tile.home_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- vista previa de la foto tal cual.
                    <img src={tile.home_image_url} alt="" className="absolute inset-0 size-full object-cover opacity-80" />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(18_18_18/0.8),rgb(18_18_18/0.1)_50%,transparent)]" />
                  <span className="relative p-3 text-xs font-semibold uppercase tracking-[0.1em]">{tile.name}</span>
                  <span className="relative p-3 font-display text-3xl font-semibold leading-none">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {busy && (
                    <span className="absolute inset-0 flex items-center justify-center bg-admin-ink/50 text-sm font-semibold">
                      Guardando…
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <PickPhotoButton
                    disabled={busyId !== null}
                    onError={setError}
                    onWarn={setWarning}
                    recommended={PHOTO_SIZES.tile}
                    onPick={(file) => setPhoto(tile, file)}
                  >
                    {tile.home_image_url ? "Cambiar foto" : "Subir foto"}
                  </PickPhotoButton>
                  {tile.home_image_url && (
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => setPhoto(tile, null)}
                      aria-label={`Quitar la foto de ${tile.name}`}
                      title="Quitar la foto"
                      className={adminButton("dangerOutline", "sm")}
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
