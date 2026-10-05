"use client";

import { ListPlus, Plus, Trash2, X } from "lucide-react";
import type { AdminIphoneModel } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import ColorField from "../ColorField";
import { MoneyInput, UnitsInput } from "../GridInputs";
import {
  ADMIN_CARD,
  ADMIN_INSET,
  ADMIN_NAME,
  ADMIN_TEXT_MUTED,
  adminBadge,
  adminButton,
  adminIconButton,
  adminInput,
} from "../adminStyles";
import { displayColor } from "../ventas/utils";
import { nextKey } from "../productos/productDraft";
import {
  UNIVERSAL,
  blockPricing,
  effectiveCost,
  parseMoney,
  parseQuantity,
  type ExistingBlock,
  type ExistingRow,
  type Range,
} from "./purchaseLogic";

// Mobile: el modelo arriba y cantidad + costo abajo. Desde md, una tabla.
const ROW_GRID = "grid grid-cols-2 gap-x-2 gap-y-1.5 md:grid-cols-[minmax(0,1fr)_72px_116px_148px] md:items-center";

function newRow(modelId = ""): ExistingRow {
  return {
    key: nextKey(),
    variantId: null,
    modelId,
    color: "",
    quantity: "",
    cost: "",
    costTouched: false,
    currentStock: null,
    currentPrice: null,
    prevCost: null,
  };
}

function money(range: Range | null) {
  if (!range) return "—";
  return range.min === range.max ? formatPrice(range.min) : `${formatPrice(range.min)} a ${formatPrice(range.max)}`;
}

function percent(range: Range | null) {
  if (!range) return "";
  const [min, max] = [Math.round(range.min), Math.round(range.max)];
  return min === max ? `${min}%` : `${min}% a ${max}%`;
}

/**
 * Bloque de un producto existente dentro de la compra: una fila por variante
 * (precargadas, con la cantidad vacía), costo para todos, y el precio de venta
 * con su margen. Las filas sin cantidad no entran en la compra.
 */
export default function PurchaseBlock({
  block,
  onChange,
  onRemove,
  models,
  skuByKey,
  invalid,
  disabled,
}: {
  block: ExistingBlock;
  onChange: (update: (block: ExistingBlock) => ExistingBlock) => void;
  onRemove: () => void;
  models: AdminIphoneModel[];
  skuByKey: Map<string, string>;
  invalid: Set<string>;
  disabled: boolean;
}) {
  const modelNameById = new Map(models.map((m) => [m.id, m.name]));
  const pricing = blockPricing(block);
  const units = block.rows.reduce((sum, row) => sum + (parseQuantity(row.quantity) ?? 0), 0);
  const id = `compra-${block.key}`;

  const updateRow = (key: string, patch: Partial<ExistingRow>) =>
    onChange((b) => ({ ...b, rows: b.rows.map((row) => (row.key === key ? { ...row, ...patch } : row)) }));

  // Universal: todas sus variantes son "sin modelo".
  const isUniversal = block.rows.length > 0 && block.rows.every((row) => row.modelId === UNIVERSAL);
  const usedModels = new Set(block.rows.map((row) => row.modelId));
  const missingModels = models.filter((m) => !usedModels.has(m.id));

  const hasNewRows = block.rows.some((row) => row.variantId === null);

  return (
    <section aria-labelledby={`${id}-nombre`} className={`${ADMIN_CARD} flex flex-col gap-4 lg:p-5`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-nombre`} className={`break-words ${ADMIN_NAME}`}>
            {block.name}
          </h2>
          <p className={`mt-0.5 ${ADMIN_TEXT_MUTED}`}>
            {units === 0 ? "Cargá las cantidades que compraste." : `${units} u. en esta compra`}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Quitar ${block.name} de la compra`}
          title="Quitar de la compra"
          className={adminIconButton("danger")}
        >
          <Trash2 aria-hidden="true" className="size-[18px]" />
        </button>
      </div>

      <MoneyInput
        id={`${id}-costo`}
        className="sm:max-w-[240px]"
        caption="Costo para todos los modelos"
        label={`Costo para todos los modelos de ${block.name}`}
        value={block.bulkCost}
        disabled={disabled}
        invalid={invalid.has(`${block.key}:bulkCost`)}
        onChange={(value) => onChange((b) => ({ ...b, bulkCost: value }))}
      />

      <div>
        <div className={`hidden pb-2 text-xs text-admin-muted md:grid ${ROW_GRID}`}>
          <span>Modelo · {block.attrKind === "motif" ? "motivo" : "color"}</span>
          <span className="text-right">Stock</span>
          <span className="text-right">Cantidad</span>
          <span className="text-right">Costo unitario</span>
        </div>

        <ul className="divide-y divide-admin-border border-y border-admin-border">
          {block.rows.map((row) => {
            const isNew = row.variantId === null;
            const label =
              [
                row.modelId === UNIVERSAL ? "Sin modelo" : modelNameById.get(row.modelId),
                displayColor(row.color),
              ]
                .filter(Boolean)
                .join(" · ") || "Modelo nuevo";

            return (
              <li key={row.key} className={`py-3 ${ROW_GRID}`}>
                {isNew ? (
                  <div className="col-span-2 flex items-center gap-2 md:col-span-2">
                    <select
                      value={row.modelId}
                      disabled={disabled}
                      aria-label="Modelo de la variante nueva"
                      aria-invalid={invalid.has(`${row.key}:model`) || undefined}
                      onChange={(e) => updateRow(row.key, { modelId: e.target.value })}
                      className={`flex-[1.3] ${adminInput({ state: invalid.has(`${row.key}:model`) ? "error" : null })}`}
                    >
                      <option value="">Elegí el modelo</option>
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                      <option value={UNIVERSAL}>Sin modelo (sirve para todos)</option>
                    </select>
                    <ColorField
                      kind={block.attrKind ?? "color"}
                      label={`${block.attrKind === "motif" ? "Motivo" : "Color"} de la variante nueva`}
                      value={row.color}
                      disabled={disabled}
                      onChange={(value) => updateRow(row.key, { color: value })}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => onChange((b) => ({ ...b, rows: b.rows.filter((r) => r.key !== row.key) }))}
                      disabled={disabled}
                      aria-label="Quitar la variante nueva"
                      title="Quitar"
                      className={adminIconButton("plain")}
                    >
                      <X aria-hidden="true" className="size-[18px]" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="flex min-w-0 flex-wrap items-center gap-2 break-words text-[15px] font-semibold text-admin-text">
                      {label}
                      {row.inactive && <span className={adminBadge("neutral")}>Inactiva</span>}
                    </p>
                    <p className={`text-right font-mono tabular-nums ${ADMIN_TEXT_MUTED}`}>
                      <span className="md:hidden">Stock </span>
                      {row.currentStock}
                    </p>
                  </>
                )}

                <UnitsInput
                  label={`Cantidad de ${label}`}
                  value={row.quantity}
                  disabled={disabled}
                  invalid={invalid.has(`${row.key}:quantity`)}
                  purchaseNav
                  onChange={(value) => updateRow(row.key, { quantity: value })}
                />
                <MoneyInput
                  label={`Costo unitario de ${label}`}
                  value={effectiveCost(row, block.bulkCost)}
                  disabled={disabled}
                  invalid={invalid.has(`${row.key}:cost`)}
                  onChange={(value) => updateRow(row.key, { cost: value, costTouched: true })}
                />

                {(isNew || row.costTouched) && (
                  <p className="col-span-full flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-admin-muted">
                    {isNew && <span className={adminBadge("neutral")}>Nuevo</span>}
                    {isNew && skuByKey.has(row.key) && <span className="font-mono">SKU {skuByKey.get(row.key)}</span>}
                    {row.costTouched && !disabled && (
                      <button
                        type="button"
                        onClick={() => updateRow(row.key, { cost: "", costTouched: false })}
                        className="font-semibold text-admin-text underline underline-offset-2"
                      >
                        Usar el costo para todos
                      </button>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {isUniversal ? (
        // Universal (sin modelo): no hay modelos que sumar, solo otra variante.
        <button
          type="button"
          onClick={() => onChange((b) => ({ ...b, rows: [...b.rows, newRow(UNIVERSAL)] }))}
          disabled={disabled}
          className={`${adminButton("secondary")} sm:w-fit`}
        >
          <Plus aria-hidden="true" className="size-[18px]" />
          Agregar variante
        </button>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onChange((b) => ({ ...b, rows: [...b.rows, newRow()] }))}
            disabled={disabled}
            className={adminButton("secondary")}
          >
            <Plus aria-hidden="true" className="size-[18px]" />
            Agregar modelo
          </button>
          <button
            type="button"
            onClick={() =>
              onChange((b) => {
                const used = new Set(b.rows.map((row) => row.modelId));
                const kept = b.rows.filter((row) => row.variantId !== null || row.modelId !== "");
                return { ...b, rows: [...kept, ...models.filter((m) => !used.has(m.id)).map((m) => newRow(m.id))] };
              })
            }
            disabled={disabled || missingModels.length === 0}
            className={adminButton("secondary")}
          >
            <ListPlus aria-hidden="true" className="size-[18px]" />
            Agregar todos los modelos
          </button>
        </div>
      )}

      <div className={`${ADMIN_INSET} flex flex-col gap-3`}>
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className={ADMIN_TEXT_MUTED}>Precio de venta actual</dt>
            <dd className="font-mono font-semibold tabular-nums text-admin-text">{money(pricing.price)}</dd>
          </div>
          <div>
            <dt className={ADMIN_TEXT_MUTED}>Costo anterior</dt>
            <dd className="font-mono font-semibold tabular-nums text-admin-text">
              {pricing.prevCost ? money(pricing.prevCost) : "Sin compras previas"}
            </dd>
          </div>
          <div>
            <dt className={ADMIN_TEXT_MUTED}>Ganancia por unidad</dt>
            <dd
              className={`font-mono font-semibold tabular-nums ${
                pricing.gain && pricing.gain.min < 0 ? "text-admin-danger" : "text-admin-text"
              }`}
            >
              {pricing.gain ? (
                <>
                  {money(pricing.gain)}{" "}
                  <span className="font-sans font-normal text-admin-muted">
                    ({percent(pricing.gainPercent)} sobre el costo)
                  </span>
                </>
              ) : (
                <span className="font-sans font-normal text-admin-muted">Cargá el costo para verla</span>
              )}
            </dd>
          </div>
        </dl>

        {pricing.suggestion !== null && (
          <button
            type="button"
            onClick={() => onChange((b) => ({ ...b, newSalePrice: String(pricing.suggestion) }))}
            disabled={disabled}
            className={`${adminButton("secondary")} h-auto min-h-12 w-full whitespace-normal py-2 text-left sm:w-fit`}
          >
            Mantener mi margen de antes → precio sugerido {formatPrice(pricing.suggestion)}
          </button>
        )}
        {pricing.suggestionVaries && (
          <p className={ADMIN_TEXT_MUTED}>
            El costo cambió, pero los modelos tienen costos o precios distintos entre sí: no hay un único precio
            sugerido. Si querés cambiarlo, escribilo abajo.
          </p>
        )}

        <MoneyInput
          id={`${id}-precio`}
          className="sm:max-w-[240px]"
          caption="Actualizar precio de venta (opcional)"
          label={`Actualizar precio de venta de ${block.name}`}
          value={block.newSalePrice}
          disabled={disabled}
          invalid={invalid.has(`${block.key}:salePrice`)}
          onChange={(value) => onChange((b) => ({ ...b, newSalePrice: value }))}
        />
        <p className={ADMIN_TEXT_MUTED}>
          {parseMoney(block.newSalePrice) !== null
            ? `Al registrar, pasan a ${formatPrice(parseMoney(block.newSalePrice) as number)} solo los modelos con cantidad en esta compra.`
            : hasNewRows
              ? "Vacío: no se cambia ningún precio. Los modelos nuevos salen al precio actual del producto."
              : "Vacío: no se cambia ningún precio."}
        </p>
      </div>
    </section>
  );
}
