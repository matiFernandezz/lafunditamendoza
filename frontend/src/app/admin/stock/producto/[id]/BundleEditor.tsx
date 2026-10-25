"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  AdminApiError,
  getBundle,
  setBundle,
  type AdminProduct,
  type BundleReportRow,
  type BundleSpec,
} from "@/lib/adminApi";
import AdminNotice from "../../../AdminNotice";
import {
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXT_MUTED,
  adminBadge,
  adminButton,
  adminIconButton,
} from "../../../adminStyles";
import { useAttributeLibrary } from "../../../attributeLibrary";

type Design = { key: string; label: string; color_id: string | null; motif_id: string | null };
type Part = { product_id: string; attr: string };

const ANY = "";
const armedIds = (report: BundleReportRow[]) => new Set(report.filter((r) => r.parts.length > 0).map((r) => r.id));
const attrKey = (color_id: string | null, motif_id: string | null) =>
  color_id ? `c:${color_id}` : motif_id ? `m:${motif_id}` : ANY;

/**
 * "Combo: cómo se arma" en la ficha de un combo. Por cada diseño (o color) del
 * combo se eligen sus partes: un producto y, si ese producto tiene varios, de
 * qué color o diseño. Si la parte va por modelo, se usa la del mismo modelo del
 * combo. El stock del combo pasa a ser el menor de sus partes.
 */
export default function BundleEditor({
  product,
  products,
  categoryPath,
  onSaved,
  onBundleIds,
}: {
  product: AdminProduct;
  products: AdminProduct[];
  /** "Fundas › Diseño": agrupa los productos del desplegable. */
  categoryPath: (categoryId: string) => string;
  onSaved: (message: string) => void;
  /** Variantes que quedaron armadas como combo (su stock no se edita a mano). */
  onBundleIds: (ids: Set<string>) => void;
}) {
  const library = useAttributeLibrary();
  const colorName = useMemo(() => new Map(library.colors.map((c) => [c.id, c.name])), [library.colors]);
  const motifName = useMemo(() => new Map(library.motifs.map((m) => [m.id, m.name])), [library.motifs]);

  // Diseños (o colores) del combo; sin ninguno, uno solo: "todas las variantes".
  const designs: Design[] = useMemo(() => {
    const map = new Map<string, Design>();
    for (const v of product.product_variants) {
      const key = attrKey(v.color_id, v.motif_id);
      if (key === ANY || map.has(key)) continue;
      map.set(key, {
        key,
        label: (v.motif_id ? motifName.get(v.motif_id) : colorName.get(v.color_id ?? "")) ?? v.color ?? "Diseño",
        color_id: v.color_id,
        motif_id: v.motif_id,
      });
    }
    return map.size > 0
      ? [...map.values()]
      : [{ key: ANY, label: "Todas las variantes", color_id: null, motif_id: null }];
  }, [product.product_variants, colorName, motifName]);

  const [parts, setParts] = useState<Record<string, Part[]> | null>(null);
  const [saved, setSaved] = useState<string>("");
  const [report, setReport] = useState<BundleReportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getBundle(product.id)
      .then((res) => {
        if (ignore) return;
        const byDesign: Record<string, Part[]> = {};
        for (const s of res.data.specs) {
          const key = attrKey(s.bundle_color_id, s.bundle_motif_id);
          (byDesign[key] ??= []).push({
            product_id: s.component_product_id,
            attr: attrKey(s.component_color_id, s.component_motif_id),
          });
        }
        setParts(byDesign);
        setSaved(JSON.stringify(byDesign));
        setReport(res.data.report);
        onBundleIds(armedIds(res.data.report));
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof AdminApiError ? err.message : "No se pudo cargar el combo.");
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se carga una vez por producto.
  }, [product.id]);

  // Productos que pueden ser parte (todos menos el combo), agrupados por categoría.
  const candidateGroups = useMemo(() => {
    const groups = new Map<string, AdminProduct[]>();
    for (const p of products) {
      if (p.id === product.id) continue;
      const path = categoryPath(p.category_id) || "Otros";
      groups.set(path, [...(groups.get(path) ?? []), p]);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "es"))
      .map(([path, list]) => [path, list.sort((a, b) => a.name.localeCompare(b.name, "es"))] as const);
  }, [products, product.id, categoryPath]);
  // Colores o diseños de un producto, para elegir cuál va en el combo.
  const attrsOf = (productId: string) => {
    const p = products.find((x) => x.id === productId);
    const map = new Map<string, string>();
    for (const v of p?.product_variants ?? []) {
      const key = attrKey(v.color_id, v.motif_id);
      if (key === ANY) continue;
      map.set(key, (v.motif_id ? motifName.get(v.motif_id) : colorName.get(v.color_id ?? "")) ?? v.color ?? "");
    }
    return [...map.entries()];
  };

  if (!parts) {
    return error ? <AdminNotice kind="danger">{error}</AdminNotice> : null;
  }

  const dirty = JSON.stringify(parts) !== saved;
  // Partes de un producto con varios colores o diseños a las que les falta elegir cuál.
  const unchosen = designs.flatMap((d) =>
    (parts[d.key] ?? [])
      .filter((part) => part.product_id && part.attr === ANY && attrsOf(part.product_id).length > 1)
      .map((part) => `${products.find((p) => p.id === part.product_id)?.name} (en ${d.label})`),
  );
  const update = (designKey: string, next: Part[]) => setParts((p) => ({ ...p, [designKey]: next }));

  async function save() {
    if (!parts) return;
    setBusy(true);
    setError(null);
    try {
      const specs: BundleSpec[] = designs.flatMap((d) =>
        (parts[d.key] ?? [])
          .filter((part) => part.product_id)
          .map((part) => ({
            bundle_color_id: d.color_id,
            bundle_motif_id: d.motif_id,
            component_product_id: part.product_id,
            component_color_id: part.attr.startsWith("c:") ? part.attr.slice(2) : null,
            component_motif_id: part.attr.startsWith("m:") ? part.attr.slice(2) : null,
            quantity: 1,
          })),
      );
      const res = await setBundle(product.id, specs);
      setReport(res.data);
      setSaved(JSON.stringify(parts));
      onBundleIds(armedIds(res.data));
      onSaved(
        specs.length === 0 ? "Listo: este producto ya no es un combo." : "Combo guardado: su stock sale de sus partes.",
      );
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo guardar el combo.");
    } finally {
      setBusy(false);
    }
  }

  const armed = report.filter((r) => r.parts.length > 0);

  return (
    <section className={`${ADMIN_CARD} flex flex-col gap-4`}>
      <div>
        <h2 className={ADMIN_SECTION_TITLE}>Combo: cómo se arma</h2>
        <p className={ADMIN_TEXT_MUTED}>
          El combo no tiene stock propio: es el menor de sus partes, y venderlo o reservarlo descuenta cada parte.
        </p>
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-[13px] text-admin-text">
          <li>
            En cada diseño del combo, tocá <strong>Agregar parte</strong> una vez por cada producto que trae.
          </li>
          <li>
            Elegí el producto: la funda (p. ej. Cherry Case) y el protector (p. ej. Funda cargador + comecables). La
            funda se toma sola del mismo modelo: si el combo todavía no tiene una variante por cada iPhone, se crean
            solas al guardar (y la universal de ese diseño se saca).
          </li>
          <li>Si ese producto tiene varios diseños, elegí cuál va (p. ej. Cereza).</li>
          <li>
            Tocá <strong>Guardar combo</strong>: abajo ves cuánto stock queda en cada modelo.
          </li>
        </ol>
      </div>

      {designs.map((d) => {
        const list = parts[d.key] ?? [];
        return (
          <div key={d.key} className="flex flex-col gap-2 rounded-md border border-admin-border bg-admin-bg p-3">
            <p className="text-sm font-semibold text-admin-text">{d.label}</p>
            {list.length === 0 ? (
              <p className={ADMIN_TEXT_MUTED}>Sin partes: este diseño tiene su propio stock.</p>
            ) : (
              <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_44px] gap-2 text-xs font-semibold text-admin-muted sm:grid">
                <span>Producto</span>
                <span>Color o diseño</span>
              </div>
            )}
            {list.map((part, index) => {
              const attrs = part.product_id ? attrsOf(part.product_id) : [];
              return (
                <div
                  key={index}
                  className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_44px]"
                >
                  <select
                    aria-label={`Parte ${index + 1} de ${d.label}`}
                    value={part.product_id}
                    onChange={(e) =>
                      update(
                        d.key,
                        // Si el producto tiene un diseño con el mismo nombre que el del combo, va ese.
                        list.map((p, i) =>
                          i === index
                            ? {
                                product_id: e.target.value,
                                attr:
                                  attrsOf(e.target.value).find(
                                    ([, label]) => label.toLowerCase() === d.label.toLowerCase(),
                                  )?.[0] ?? ANY,
                              }
                            : p,
                        ),
                      )
                    }
                    disabled={busy}
                    className={`${ADMIN_INPUT} col-start-1 row-start-1`}
                  >
                    <option value="">Elegí un producto…</option>
                    {candidateGroups.map(([path, list]) => (
                      <optgroup key={path} label={path}>
                        {list.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <select
                    aria-label={`Color o diseño de la parte ${index + 1}`}
                    value={part.attr}
                    onChange={(e) =>
                      update(
                        d.key,
                        list.map((p, i) => (i === index ? { ...p, attr: e.target.value } : p)),
                      )
                    }
                    disabled={busy || attrs.length === 0}
                    className={`${ADMIN_INPUT} col-start-1 row-start-2 sm:col-start-2 sm:row-start-1`}
                  >
                    {/* Con un solo color o diseño va ese; con varios hay que elegir cuál. */}
                    <option
                      value={attrs.length === 1 && part.attr === attrs[0][0] ? attrs[0][0] : ANY}
                      disabled={attrs.length > 1}
                    >
                      {attrs.length === 0 ? "Única" : attrs.length === 1 ? attrs[0][1] : "Elegí cuál…"}
                    </option>
                    {/* Con uno solo ya se muestra arriba: listarlo de nuevo lo repetía. */}
                    {attrs.length > 1 &&
                      attrs.map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      update(
                        d.key,
                        list.filter((_, i) => i !== index),
                      )
                    }
                    aria-label="Quitar esta parte"
                    title="Quitar"
                    className={`${adminIconButton("danger")} col-start-2 row-start-1 sm:col-start-3`}
                  >
                    <Trash2 aria-hidden="true" className="size-[18px]" />
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              disabled={busy}
              onClick={() => update(d.key, [...list, { product_id: "", attr: ANY }])}
              className={`${adminButton("ghost", "sm")} self-start`}
            >
              <Plus aria-hidden="true" className="size-4" />
              Agregar parte
            </button>
          </div>
        );
      })}

      {error && <AdminNotice kind="danger">{error}</AdminNotice>}
      {dirty && unchosen.length > 0 && (
        <AdminNotice kind="ink">Elegí el color o diseño de: {unchosen.join(", ")}.</AdminNotice>
      )}

      {dirty && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setParts(JSON.parse(saved))}
            className={adminButton("ghost", "sm")}
          >
            Descartar
          </button>
          <button
            type="button"
            disabled={busy || unchosen.length > 0}
            onClick={save}
            className={adminButton("primary", "sm")}
          >
            {busy ? "Guardando…" : "Guardar combo"}
          </button>
        </div>
      )}

      {armed.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-admin-text">Así queda cada variante</p>
          <ul className="flex flex-col divide-y divide-admin-border rounded-md border border-admin-border">
            {armed.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-admin-text">
                  <strong className="font-semibold">
                    {[r.model ?? "Universal", r.label].filter(Boolean).join(" · ")}
                  </strong>
                  <span className="text-admin-muted">
                    {" = "}
                    {r.parts
                      .map((p) =>
                        p.missing
                          ? "falta una parte"
                          : `${p.product}${p.model ? ` ${p.model.replace(/^iPhone\s*/i, "")}` : ""}${p.label ? ` · ${p.label}` : ""} (${p.stock})`,
                      )
                      .join(" + ")}
                  </span>
                </span>
                <span className={adminBadge(r.parts.some((p) => p.missing) ? "warn" : r.stock > 0 ? "ok" : "neutral")}>
                  {r.parts.some((p) => p.missing) ? "Falta una parte" : `${r.stock} u.`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
