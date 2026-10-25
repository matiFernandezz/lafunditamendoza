"use client";

import { Check, ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AdminApiError,
  deletePurchase,
  getPurchase,
  updatePurchase,
  type Purchase,
  type PurchaseStatus,
} from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import AdminNotice from "../../../AdminNotice";
import {
  ADMIN_INPUT_ADORNMENT,
  ADMIN_PAGE_TITLE,
  ADMIN_TEXTAREA,
  adminBadge,
  adminButton,
  adminInput,
} from "../../../adminStyles";
import StatCard, { Panel } from "../../../StatCard";
import { displayColor } from "../../../ventas/utils";
import { startNavigationProgress } from "@/components/NavigationProgress";
import {
  PURCHASE_STEPS,
  PURCHASES_CHANGED,
  STATUS_BADGE,
  STATUS_LABEL,
  formatDay,
  formatInstant,
  purchaseTotal,
} from "../../purchaseStatus";
import AdminLoading from "../../../AdminLoading";

const STEP_INDEX: Record<PurchaseStatus, number> = { armando: 0, pagado: 1, en_camino: 2, recibida: 3 };

const NEXT_ACTION: Partial<Record<PurchaseStatus, { to: PurchaseStatus; label: string }>> = {
  armando: { to: "pagado", label: "Marcar como pagado" },
  pagado: { to: "en_camino", label: "Marcar en camino" },
  en_camino: { to: "recibida", label: "Marcar recibido" },
};

function stepDate(purchase: Purchase, status: PurchaseStatus): string | null {
  if (status === "armando") return formatInstant(purchase.created_at);
  const at =
    status === "pagado" ? purchase.paid_at : status === "en_camino" ? purchase.shipped_at : purchase.received_at;
  return at ? formatInstant(at) : null;
}

function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-2.5 text-[15px] ${strong ? "font-semibold" : ""}`}>
      <dt className="text-admin-text">{label}</dt>
      <dd className="font-mono tabular-nums text-admin-text">{value}</dd>
    </div>
  );
}

/** Un pedido: estado paso a paso, lo que se pidió y cuánto deja venderlo. */
export default function PedidoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReceive, setConfirmReceive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shipping, setShipping] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let ignore = false;
    getPurchase(id)
      .then((res) => {
        if (ignore) return;
        setPurchase(res.data);
        setShipping(String(Number(res.data.shipping_cost)));
        setNotes(res.data.notes ?? "");
      })
      .catch((err) => {
        if (!ignore) setLoadError(err instanceof Error ? err.message : "No se pudo cargar el pedido.");
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  async function save(patch: Parameters<typeof updatePurchase>[1], done?: string) {
    setSaving(true);
    setActionError(null);
    setNotice(null);
    try {
      const res = await updatePurchase(id, patch);
      setPurchase(res.data);
      setShipping(String(Number(res.data.shipping_cost)));
      setNotes(res.data.notes ?? "");
      window.dispatchEvent(new Event(PURCHASES_CHANGED));
      if (done) setNotice(done);
    } catch (err) {
      setActionError(err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
      setConfirmReceive(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setActionError(null);
    try {
      await deletePurchase(id);
      window.dispatchEvent(new Event(PURCHASES_CHANGED));
      startNavigationProgress();
      router.push("/admin/compras");
    } catch (err) {
      setActionError(err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.");
      setSaving(false);
      setConfirmDelete(false);
    }
  }

  const back = (
    <Link
      href="/admin/compras"
      className="inline-flex items-center gap-1 text-sm text-admin-muted hover:text-admin-text"
    >
      <ChevronLeft aria-hidden="true" className="size-4" />
      Pedidos
    </Link>
  );

  if (loadError) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <AdminNotice kind="danger">{loadError}</AdminNotice>
      </div>
    );
  }

  if (!purchase) {
    return <AdminLoading />;
  }

  const received = purchase.status === "recibida";
  const current = STEP_INDEX[purchase.status];
  const lines = purchase.purchase_items;
  const units = lines.reduce((sum, l) => sum + l.quantity, 0);
  const merchandise = Number(purchase.total_amount);
  const shippingCost = Number(purchase.shipping_cost);
  const total = purchaseTotal(purchase);
  const shippingPerUnit = units > 0 ? shippingCost / units : 0;
  const estimatedSale = lines.reduce((sum, l) => sum + l.quantity * Number(l.variant?.price ?? 0), 0);
  const estimatedProfit = estimatedSale - total;
  const next = NEXT_ACTION[purchase.status];
  const shippingDraft = Number(shipping);
  const shippingChanged = shipping.trim() !== "" && shippingDraft >= 0 && Math.round(shippingDraft) !== shippingCost;
  const notesChanged = notes.trim() !== (purchase.notes ?? "");

  function goTo(status: PurchaseStatus) {
    if (status === purchase!.status || saving) return;
    if (status === "recibida") {
      setConfirmReceive(true);
      return;
    }
    save({ status }, `Pedido marcado como ${STATUS_LABEL[status].toLowerCase()}.`);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        {back}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className={ADMIN_PAGE_TITLE}>Pedido {purchase.number}</h1>
              <span className={adminBadge(STATUS_BADGE[purchase.status])}>{STATUS_LABEL[purchase.status]}</span>
            </div>
            <p className="mt-1 text-sm text-admin-muted">
              {purchase.supplier?.name ?? "Sin proveedor"} · del {formatDay(purchase.purchase_date)}
              {purchase.supplier?.payment_method && ` · se paga en ${purchase.supplier.payment_method}`}
            </p>
          </div>
          {!received &&
            (confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-admin-text">¿Borrar el pedido?</span>
                <button type="button" onClick={handleDelete} disabled={saving} className={adminButton("danger", "sm")}>
                  Borrar
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className={adminButton("ghost", "sm")}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className={adminButton("dangerOutline", "sm")}
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Borrar pedido
              </button>
            ))}
        </div>
      </div>

      <section aria-label="Montos" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Mercadería" value={formatPrice(merchandise)}>
          <span>{units === 1 ? "1 unidad" : `${units} unidades`} · sin envío</span>
        </StatCard>
        <StatCard label="Envío" value={formatPrice(shippingCost)}>
          <span>{formatPrice(shippingPerUnit)} por unidad</span>
        </StatCard>
        <StatCard label={purchase.status === "armando" ? "Total a pagar" : "Total pagado"} value={formatPrice(total)}>
          <span>Mercadería + envío</span>
        </StatCard>
      </section>

      <section aria-label="Estado del pedido" className="rounded-lg border border-admin-border bg-admin-surface p-5">
        <ol className="grid grid-cols-4 gap-2">
          {PURCHASE_STEPS.map((step, index) => {
            const done = index <= current;
            const date = done ? stepDate(purchase, step.status) : null;
            const clickable = !received && step.status !== purchase.status;
            return (
              <li key={step.status} className="relative min-w-0">
                {index < PURCHASE_STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`absolute left-7 right-0 top-3.5 h-0.5 ${index < current ? "bg-admin-ink" : "bg-admin-border-strong"}`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => goTo(step.status)}
                  disabled={!clickable || saving}
                  aria-current={step.status === purchase.status ? "step" : undefined}
                  title={clickable ? `Pasar a ${step.label.toLowerCase()}` : undefined}
                  className="relative flex flex-col items-start gap-1.5 text-left disabled:cursor-default"
                >
                  <span
                    className={`flex size-7 items-center justify-center rounded-full border-2 ${
                      done
                        ? "border-admin-ink bg-admin-ink text-admin-on-ink"
                        : "border-admin-border-strong bg-admin-surface"
                    }`}
                  >
                    {done && <Check aria-hidden="true" className="size-4" strokeWidth={3} />}
                  </span>
                  <span className={`text-sm font-semibold ${done ? "text-admin-text" : "text-admin-muted"}`}>
                    {step.label}
                  </span>
                  <span className="hidden text-[12px] text-admin-muted sm:block">{date ?? step.hint}</span>
                </button>
              </li>
            );
          })}
        </ol>

        {!received && (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-admin-border pt-4">
            {confirmReceive ? (
              <>
                <p className="text-[15px] text-admin-text">
                  Se van a sumar {units === 1 ? "1 unidad" : `${units} unidades`} al stock. ¿Llegó todo?
                </p>
                <button
                  type="button"
                  onClick={() =>
                    save({ status: "recibida" }, `Pedido recibido: se sumaron ${units} unidades al stock.`)
                  }
                  disabled={saving}
                  className={adminButton("primary", "sm")}
                >
                  {saving ? "Guardando…" : "Sí, recibido"}
                </button>
                <button type="button" onClick={() => setConfirmReceive(false)} className={adminButton("ghost", "sm")}>
                  Cancelar
                </button>
              </>
            ) : (
              <>
                {next && (
                  <button
                    type="button"
                    onClick={() => goTo(next.to)}
                    disabled={saving}
                    className={adminButton("primary", "sm")}
                  >
                    {saving ? "Guardando…" : next.label}
                  </button>
                )}
                {next?.to !== "recibida" && (
                  <button
                    type="button"
                    onClick={() => goTo("recibida")}
                    disabled={saving}
                    className={adminButton("secondary", "sm")}
                  >
                    Ya llegó
                  </button>
                )}
                <p className="text-[13px] text-admin-muted">
                  El stock se suma al marcarlo recibido. Tocá un paso para corregir el estado.
                </p>
              </>
            )}
          </div>
        )}
      </section>

      {notice && (
        <AdminNotice kind="ok" onClose={() => setNotice(null)}>
          {notice}
        </AdminNotice>
      )}
      {actionError && (
        <AdminNotice kind="danger" onClose={() => setActionError(null)}>
          {actionError}
        </AdminNotice>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 overflow-x-auto rounded-md border border-admin-border">
          <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
            <thead className="bg-admin-bg text-[13px] text-admin-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Producto
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">
                  Cant.
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">
                  Costo c/u
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">
                  Con envío
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">
                  Venta c/u
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Ganancia
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border bg-admin-surface">
              {lines.map((line) => {
                const variant = line.variant;
                const detail = [variant?.iphone_model?.name, displayColor(variant?.color ?? null)]
                  .filter(Boolean)
                  .join(" · ");
                const realCost = Number(line.unit_cost) + shippingPerUnit;
                const price = Number(variant?.price ?? 0);
                return (
                  <tr key={line.id}>
                    <td className="px-4 py-2.5">
                      <span className="block font-semibold text-admin-text">
                        {variant?.product?.name ?? "Producto eliminado"}
                      </span>
                      {detail && <span className="block text-[13px] text-admin-muted">{detail}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-admin-text">{line.quantity}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-admin-text">
                      {formatPrice(Number(line.unit_cost))}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-admin-muted">
                      {formatPrice(realCost)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-admin-text">
                      {formatPrice(price)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-admin-text">
                      {formatPrice(line.quantity * (price - realCost))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-5">
          <Panel title="Resumen">
            <dl className="-my-2.5 divide-y divide-admin-border">
              <SummaryLine label="Unidades" value={String(units)} />
              <SummaryLine label="Mercadería" value={formatPrice(merchandise)} />
              <SummaryLine label="Envío" value={formatPrice(shippingCost)} />
              <SummaryLine label="Total" value={formatPrice(total)} strong />
              <SummaryLine label="Envío por unidad" value={formatPrice(shippingPerUnit)} />
              <SummaryLine label="Venta estimada" value={formatPrice(estimatedSale)} />
              <SummaryLine label="Ganancia estimada" value={formatPrice(estimatedProfit)} strong />
            </dl>
            <p className="mt-4 text-[13px] text-admin-muted">
              Vendiendo todo al precio de hoy
              {estimatedSale > 0 && `: margen del ${Math.round((estimatedProfit / estimatedSale) * 100)}%`}.
            </p>
          </Panel>

          <Panel title="Envío y notas">
            <div className="flex flex-col gap-3">
              <div>
                <label htmlFor="pedido-envio" className="mb-1.5 block text-sm font-semibold text-admin-text">
                  Envío
                </label>
                <div className="relative">
                  <span aria-hidden="true" className={`${ADMIN_INPUT_ADORNMENT} left-3`}>
                    $
                  </span>
                  <input
                    id="pedido-envio"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={shipping}
                    onChange={(e) => setShipping(e.target.value)}
                    className={adminInput({ prefix: "text", mono: true })}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="pedido-notas" className="mb-1.5 block text-sm font-semibold text-admin-text">
                  Notas
                </label>
                <textarea
                  id="pedido-notas"
                  rows={3}
                  maxLength={1000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Seguimiento, qué faltó, lo que haga falta recordar"
                  className={ADMIN_TEXTAREA}
                />
              </div>
              <button
                type="button"
                disabled={saving || (!shippingChanged && !notesChanged)}
                onClick={() =>
                  save(
                    {
                      ...(shippingChanged ? { shipping_cost: Math.round(shippingDraft) } : {}),
                      ...(notesChanged ? { notes: notes.trim() || null } : {}),
                    },
                    "Cambios guardados.",
                  )
                }
                className={adminButton("secondary", "sm")}
              >
                Guardar
              </button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
