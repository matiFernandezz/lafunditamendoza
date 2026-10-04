"use client";

import { X } from "lucide-react";
import { useRef, useState } from "react";
import {
  AdminApiError,
  addColorToProduct,
  removeColorFromProduct,
  type AddColorResult,
  type AdminColor,
  type AdminProduct,
  type RemoveColorResult,
} from "@/lib/adminApi";
import AdminNotice from "../AdminNotice";
import ColorField, { ColorDot } from "../ColorField";
import { ADMIN_BODY, ADMIN_INSET, ADMIN_TEXT_MUTED, adminButton } from "../adminStyles";
import { displayColor } from "../ventas/utils";

type Pending =
  | { kind: "add"; color: AdminColor; preview: AddColorResult }
  | { kind: "remove"; color: AdminColor; preview: RemoveColorResult };

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

function errorMessage(err: unknown) {
  return err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.";
}

/**
 * Colores de un producto: un chip por color (de sus variantes activas) con la
 * "x" para quitarlo, y "Agregar color". Agregar crea una variante por modelo
 * con stock 0; quitar da de baja las variantes de ese color, sin borrarlas.
 * Antes de cada cosa se pregunta al servidor qué pasaría y se pide confirmar.
 *
 * Un producto que todavía no tiene colores también puede recibir uno: el
 * primero se les pone a sus variantes actuales (sin crear nada). Salvo que
 * esas variantes tengan una descripción que no es un color ("tipo C a C"):
 * ahí solo se avisa.
 */
export default function ProductColors({
  product,
  colors,
  onColorCreated,
  onChanged,
}: {
  product: AdminProduct;
  colors: AdminColor[];
  onColorCreated: (color: AdminColor) => void;
  /** Se aplicó un cambio: `message` es el resultado, para mostrar y refrescar. */
  onChanged: (message: string) => void;
}) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Un color recién creado todavía no llegó por `colors` cuando se lo elige.
  const justCreated = useRef(new Map<string, AdminColor>());

  const active = product.product_variants.filter((v) => v.active && v.color_id !== null);
  const countByColor = new Map<string, number>();
  for (const v of active) countByColor.set(v.color_id as string, (countByColor.get(v.color_id as string) ?? 0) + 1);
  const productColors = colors.filter((c) => countByColor.has(c.id));
  const takenIds = new Set(productColors.map((c) => c.id));

  const hasVariants = product.product_variants.length > 0;
  const hasAnyColor = product.product_variants.some((v) => v.color_id !== null);
  // Descripciones que no son colores, en un producto sin ningún color.
  const descriptions = hasAnyColor
    ? []
    : [...new Set(product.product_variants.map((v) => displayColor(v.color)).filter((d): d is string => d !== null))];
  const canAdd = hasVariants && descriptions.length === 0;

  async function previewAdd(name: string) {
    const color =
      colors.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? justCreated.current.get(name.toLowerCase());
    if (!color) return;
    setBusy(true);
    setError(null);
    try {
      const res = await addColorToProduct(product.id, color.id, true);
      setPending({ kind: "add", color, preview: res.data });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function previewRemove(color: AdminColor) {
    setBusy(true);
    setError(null);
    try {
      const res = await removeColorFromProduct(product.id, color.id, { dryRun: true, force: true });
      setPending({ kind: "remove", color, preview: res.data });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (pending.kind === "add") {
        const { data } = await addColorToProduct(product.id, pending.color.id);
        const parts = [
          data.assigned > 0 &&
            (data.assigned === 1 ? "su variante pasó a ese color" : `sus ${data.assigned} variantes pasaron a ese color`),
          data.created > 0 && plural(data.created, "variante nueva", "variantes nuevas"),
          data.reactivated > 0 && plural(data.reactivated, "reactivada", "reactivadas"),
        ].filter(Boolean);
        onChanged(`Se agregó ${pending.color.name} a ${product.name}: ${parts.join(" y ")}.`);
      } else {
        // La confirmación ya mostró el stock: se da de baja igual.
        const { data } = await removeColorFromProduct(product.id, pending.color.id, { force: true });
        onChanged(
          `Se quitó ${pending.color.name} de ${product.name}: ${plural(data.deactivated, "variante dada de baja", "variantes dadas de baja")}.`,
        );
      }
      setPending(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const nothingToAdd =
    pending?.kind === "add" &&
    pending.preview.created + pending.preview.reactivated + pending.preview.assigned === 0;

  return (
    <div className="flex flex-col gap-2.5">
      <ul className="flex flex-wrap gap-2">
        {productColors.map((color) => (
          <li
            key={color.id}
            className="flex h-11 items-center gap-2 rounded-full border border-admin-border-strong bg-white pl-3 pr-1 text-[15px] font-semibold text-admin-text"
          >
            <ColorDot hex={color.hex} />
            {color.name}
            <span className="font-mono text-xs font-normal text-admin-muted">{countByColor.get(color.id)}</span>
            <button
              type="button"
              onClick={() => previewRemove(color)}
              disabled={busy}
              aria-label={`Quitar ${color.name} de ${product.name}`}
              title={`Quitar ${color.name}`}
              className="flex size-9 items-center justify-center rounded-full text-admin-muted transition-colors duration-200 hover:bg-admin-bg hover:text-admin-danger disabled:opacity-40"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </li>
        ))}
      </ul>

      {!pending && !hasVariants && (
        <p className={ADMIN_TEXT_MUTED}>Primero agregale variantes al producto; después se le pueden poner colores.</p>
      )}
      {!pending && descriptions.length > 0 && (
        <AdminNotice kind="ink">
          Las variantes de este producto se distinguen por una descripción que no es un color (
          {descriptions.slice(0, 4).join(", ")}
          {descriptions.length > 4 && "…"}). No se le pueden agregar colores.
        </AdminNotice>
      )}

      {!pending && canAdd && (
        <ColorField
          key={productColors.length}
          label={`Agregar color a ${product.name}`}
          placeholder="+ Agregar color"
          value=""
          colors={colors}
          takenIds={takenIds}
          allowEmpty={false}
          allowText={false}
          disabled={busy}
          onChange={previewAdd}
          onColorCreated={(color) => {
            justCreated.current.set(color.name.toLowerCase(), color);
            onColorCreated(color);
          }}
          className="sm:max-w-[280px]"
        />
      )}

      {pending && (
        <div className={`${ADMIN_INSET} flex flex-col gap-3`}>
          {pending.kind === "add" ? (
            <p className={ADMIN_BODY}>
              {nothingToAdd ? (
                <>
                  <strong className="font-semibold">{pending.color.name}</strong> ya está en todos los modelos de este
                  producto.
                </>
              ) : pending.preview.assigned > 0 ? (
                <>
                  {pending.preview.assigned === 1 ? "La variante actual pasa" : `Las ${pending.preview.assigned} variantes actuales pasan`}{" "}
                  a ser <strong className="font-semibold">{pending.color.name}</strong>. Stock actual:{" "}
                  {plural(pending.preview.units, "unidad", "unidades")}. Conservan su stock, precio y SKU; no se crea
                  ninguna variante nueva.
                </>
              ) : (
                <>
                  Se {pending.preview.created === 1 ? "va a crear" : "van a crear"}{" "}
                  <strong className="font-semibold">
                    {plural(pending.preview.created, "variante", "variantes")}
                  </strong>{" "}
                  de {pending.color.name} (una por modelo) con stock 0
                  {pending.preview.reactivated > 0 &&
                    `, y se ${pending.preview.reactivated === 1 ? "reactiva 1 que estaba dada" : `reactivan ${pending.preview.reactivated} que estaban dadas`} de baja`}
                  .
                </>
              )}
            </p>
          ) : (
            <>
              <p className={ADMIN_BODY}>
                Se {pending.preview.variants === 1 ? "va a dar" : "van a dar"} de baja{" "}
                <strong className="font-semibold">{plural(pending.preview.variants, "variante", "variantes")}</strong> de{" "}
                {pending.color.name}. No se borran: el historial de ventas y compras queda igual.
              </p>
              {pending.preview.units > 0 && (
                <div className="flex flex-col gap-1 text-sm font-medium text-admin-danger">
                  <p>
                    Hay {plural(pending.preview.units, "unidad", "unidades")} en stock que{" "}
                    {pending.preview.units === 1 ? "dejará" : "dejarán"} de venderse:
                  </p>
                  <ul className="font-normal">
                    {pending.preview.with_stock.map((v) => (
                      <li key={v.id}>
                        {v.model ?? "Sin modelo"} · <span className="font-mono text-xs">{v.sku}</span> · {v.stock} u.
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <button type="button" onClick={() => setPending(null)} disabled={busy} className={adminButton("secondary")}>
              {nothingToAdd ? "Cerrar" : "Cancelar"}
            </button>
            {!nothingToAdd && (
              <button
                type="button"
                onClick={confirm}
                disabled={busy}
                className={adminButton(pending.kind === "remove" ? "danger" : "primary")}
              >
                {busy
                  ? "Aplicando…"
                  : pending.kind === "add"
                    ? `Agregar ${pending.color.name}`
                    : pending.preview.units > 0
                      ? "Dar de baja igual"
                      : "Dar de baja"}
              </button>
            )}
          </div>
        </div>
      )}

      {error && <AdminNotice kind="danger">{error}</AdminNotice>}
      {!pending && canAdd && (
        <p className={ADMIN_TEXT_MUTED}>
          {hasAnyColor
            ? "Agregar un color crea una variante por modelo con stock 0. Quitarlo las da de baja, sin borrarlas."
            : "Este producto todavía no tiene colores. El primero que agregues se les pone a sus variantes actuales; los siguientes crean una variante por modelo con stock 0."}
        </p>
      )}
    </div>
  );
}
