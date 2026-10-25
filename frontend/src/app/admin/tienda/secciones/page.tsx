"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AdminApiError,
  getHomeSections,
  reorderHomeSections,
  updateHomeSection,
  type HomeSection,
  type HomeSectionKey,
} from "@/lib/adminApi";
import AdminNotice from "../../AdminNotice";
import {
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_TEXT_MUTED,
  adminBadge,
  adminButton,
  adminInput,
} from "../../adminStyles";
import { ReorderButtons, moveItem } from "../storeUi";
import AdminLoading from "../../AdminLoading";

const ABOUT: Record<HomeSectionKey, string> = {
  categorias: "Los mosaicos de categorías (Silicona, Diseño…). Las fotos se cambian en Tienda › Categorías.",
  mas_vendidas: "Las fundas que giran al scrollear. Se eligen en Tienda › Funditas más vendidas.",
  ultimos: "Los 10 productos cargados más recientemente, en una tira que se desliza sola. Se arma sola.",
  instagram:
    "Los últimos posts de Instagram en un carrusel, como en Nosotros. Se arma sola con la cuenta conectada en Tienda › Nosotros; sin conectar, no aparece.",
};

function errorMessage(err: unknown) {
  return err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.";
}

/** Tienda › Secciones: orden, título y visibilidad de lo que va debajo de "Elegí tu iPhone". */
export default function SeccionesPage() {
  const [sections, setSections] = useState<HomeSection[] | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getHomeSections()
      .then((res) => {
        if (ignore) return;
        setSections(res.data);
        setTitles(Object.fromEntries(res.data.map((s) => [s.key, s.title])));
      })
      .catch((err) => {
        if (!ignore) setError(errorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, []);

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

  function save(key: HomeSectionKey, patch: { title?: string; visible?: boolean }, message: string) {
    void run(async () => {
      const res = await updateHomeSection(key, patch);
      setSections((prev) => (prev ?? []).map((s) => (s.key === key ? res.data : s)));
      setTitles((prev) => ({ ...prev, [key]: res.data.title }));
      setNotice(message);
    });
  }

  function move(index: number, delta: -1 | 1) {
    if (!sections) return;
    const next = moveItem(sections, index, delta);
    setSections(next);
    void run(async () => {
      await reorderHomeSections(next.map((s) => s.key));
      setNotice("Orden guardado.");
    });
  }

  return (
    <div className="flex max-w-[860px] flex-col gap-5">
      <div>
        <h1 className={ADMIN_PAGE_TITLE}>Secciones de la home</h1>
        <p className={ADMIN_PAGE_SUBTITLE}>
          El orden en que aparecen debajo de “Elegí tu iPhone” y su título. El carrusel de fotos y “Elegí tu iPhone” van
          siempre arriba.
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

      {!sections ? (
        !error && <AdminLoading />
      ) : (
        <ol className="flex flex-col gap-3">
          {sections.map((section, index) => {
            const title = titles[section.key] ?? section.title;
            const dirty = title.trim() !== section.title;
            return (
              <li
                key={section.key}
                className={`flex flex-col gap-3 rounded-lg border border-admin-border bg-admin-surface p-4 sm:flex-row sm:items-start ${
                  section.visible ? "" : "opacity-70"
                }`}
              >
                <span className="w-6 shrink-0 pt-3 font-mono text-sm font-semibold text-admin-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <label htmlFor={`seccion-${section.key}`} className="sr-only">
                    Título de la sección
                  </label>
                  <div className="flex gap-2">
                    <input
                      id={`seccion-${section.key}`}
                      value={title}
                      maxLength={60}
                      disabled={busy}
                      onChange={(e) => setTitles((prev) => ({ ...prev, [section.key]: e.target.value }))}
                      className={adminInput({ state: dirty ? "dirty" : null })}
                    />
                    {dirty && (
                      <button
                        type="button"
                        disabled={busy || title.trim() === ""}
                        onClick={() => save(section.key, { title }, "Título guardado.")}
                        className={adminButton("primary", "sm")}
                      >
                        Guardar
                      </button>
                    )}
                  </div>
                  <p className={ADMIN_TEXT_MUTED}>
                    {!section.visible && <span className={`${adminBadge("neutral")} mr-2`}>Oculta</span>}
                    {ABOUT[section.key]}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:pt-1.5">
                  <ReorderButtons
                    index={index}
                    total={sections.length}
                    disabled={busy}
                    onMove={(delta) => move(index, delta)}
                    label={section.title}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      save(
                        section.key,
                        { visible: !section.visible },
                        section.visible
                          ? "La sección ya no se ve en la home."
                          : "La sección vuelve a verse en la home.",
                      )
                    }
                    className={adminButton("secondary", "sm")}
                  >
                    {section.visible ? (
                      <>
                        <EyeOff aria-hidden="true" className="size-4" />
                        Ocultar
                      </>
                    ) : (
                      <>
                        <Eye aria-hidden="true" className="size-4" />
                        Mostrar
                      </>
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
