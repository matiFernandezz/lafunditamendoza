"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AdminApiError,
  createSupplier,
  getSuppliers,
  updateSupplier,
  type SupplierInput,
  type SupplierWithStats,
} from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import AdminNotice from "../../AdminNotice";
import {
  ADMIN_EMPTY,
  ADMIN_INPUT,
  ADMIN_INPUT_ADORNMENT,
  ADMIN_LABEL,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_TEXTAREA,
  adminButton,
  adminInput,
} from "../../adminStyles";
import { formatDay } from "../purchaseStatus";
import AdminLoading from "../../AdminLoading";

type Draft = { name: string; contact: string; payment: string; shipping: string; notes: string };

const EMPTY: Draft = { name: "", contact: "", payment: "", shipping: "", notes: "" };

function toDraft(s: SupplierWithStats): Draft {
  return {
    name: s.name,
    contact: s.contact_info ?? "",
    payment: s.payment_method ?? "",
    shipping: Number(s.shipping_cost) > 0 ? String(Number(s.shipping_cost)) : "",
    notes: s.notes ?? "",
  };
}

/** Alta o edición de un proveedor. */
function SupplierDialog({
  initial,
  editing,
  onClose,
  onSaved,
}: {
  initial: Draft;
  editing: SupplierWithStats | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (field: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((d) => ({ ...d, [field]: e.target.value }));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload: SupplierInput = {
      name: draft.name.trim(),
      contact_info: draft.contact.trim() || null,
      payment_method: draft.payment.trim() || null,
      shipping_cost: Number(draft.shipping) > 0 ? Math.round(Number(draft.shipping)) : 0,
      notes: draft.notes.trim() || null,
    };
    try {
      if (editing) await updateSupplier(editing.id, payload);
      else await createSupplier(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="proveedor-titulo"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[480px] flex-col gap-4 overflow-y-auto rounded-t-[14px] bg-admin-surface p-5 sm:rounded-lg"
      >
        <h2 id="proveedor-titulo" className="font-display text-xl font-semibold text-admin-text">
          {editing ? `Editar ${editing.name}` : "Agregar proveedor"}
        </h2>

        <div>
          <label htmlFor="prov-nombre" className={ADMIN_LABEL}>
            Nombre
          </label>
          <input
            id="prov-nombre"
            required
            maxLength={120}
            autoFocus
            value={draft.name}
            onChange={set("name")}
            className={ADMIN_INPUT}
          />
        </div>
        <div>
          <label htmlFor="prov-contacto" className={ADMIN_LABEL}>
            Contacto
          </label>
          <input
            id="prov-contacto"
            maxLength={500}
            value={draft.contact}
            onChange={set("contact")}
            placeholder="Instagram, WhatsApp, web…"
            className={ADMIN_INPUT}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="prov-pago" className={ADMIN_LABEL}>
              Se le paga en
            </label>
            <input
              id="prov-pago"
              maxLength={120}
              value={draft.payment}
              onChange={set("payment")}
              placeholder="Transferencia, USDT…"
              className={ADMIN_INPUT}
            />
          </div>
          <div>
            <label htmlFor="prov-envio" className={ADMIN_LABEL}>
              Envío estimado
            </label>
            <div className="relative">
              <span aria-hidden="true" className={`${ADMIN_INPUT_ADORNMENT} left-3`}>
                $
              </span>
              <input
                id="prov-envio"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={draft.shipping}
                onChange={set("shipping")}
                placeholder="0"
                className={adminInput({ prefix: "text", mono: true })}
              />
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="prov-notas" className={ADMIN_LABEL}>
            Notas
          </label>
          <textarea
            id="prov-notas"
            rows={3}
            maxLength={1000}
            value={draft.notes}
            onChange={set("notes")}
            placeholder="Mínimo de compra, desde dónde envía, demoras…"
            className={ADMIN_TEXTAREA}
          />
        </div>

        {error && <AdminNotice kind="danger">{error}</AdminNotice>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={adminButton("ghost")}>
            Cancelar
          </button>
          <button type="submit" disabled={saving || draft.name.trim() === ""} className={adminButton("primary")}>
            {saving ? "Guardando…" : editing ? "Guardar" : "Agregar"}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Proveedores: contacto, cómo se les paga, envío estimado y lo que se les compró. */
export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<SupplierWithStats[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [dialog, setDialog] = useState<{ editing: SupplierWithStats | null } | null>(null);

  useEffect(() => {
    let ignore = false;
    getSuppliers()
      .then((res) => {
        if (!ignore) {
          setSuppliers(res.data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : "No se pudieron cargar los proveedores.");
      });
    return () => {
      ignore = true;
    };
  }, [reload]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={ADMIN_PAGE_TITLE}>Proveedores</h1>
          <p className={ADMIN_PAGE_SUBTITLE}>
            El envío estimado se propone solo al cargar un pedido nuevo de ese proveedor.
          </p>
        </div>
        <button type="button" onClick={() => setDialog({ editing: null })} className={adminButton("primary")}>
          <Plus aria-hidden="true" className="size-5" />
          Agregar proveedor
        </button>
      </div>

      {error ? (
        <AdminNotice kind="danger">{error}</AdminNotice>
      ) : !suppliers ? (
        <AdminLoading />
      ) : suppliers.length === 0 ? (
        <p className={ADMIN_EMPTY}>Todavía no hay proveedores.</p>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-hidden rounded-md border border-admin-border md:block">
            <table className="w-full table-fixed border-collapse text-left text-[15px]">
              <thead className="bg-admin-bg text-[13px] text-admin-muted">
                <tr>
                  <th scope="col" className="w-[34%] px-4 py-3 font-semibold">
                    Proveedor
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Contacto
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Se le paga en
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Envío estimado
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Comprado
                  </th>
                  <th scope="col" className="w-20 px-4 py-3">
                    <span className="sr-only">Editar</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border bg-admin-surface">
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-admin-text">{s.name}</span>
                      {s.notes && <span className="block text-[13px] text-admin-muted">{s.notes}</span>}
                    </td>
                    <td className="truncate px-4 py-3 text-admin-text" title={s.contact_info ?? undefined}>
                      {s.contact_info ?? "—"}
                    </td>
                    <td className="truncate px-4 py-3 text-admin-text" title={s.payment_method ?? undefined}>
                      {s.payment_method ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-admin-text">
                      {formatPrice(Number(s.shipping_cost))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span className="block font-mono tabular-nums text-admin-text">{formatPrice(s.total_paid)}</span>
                      <span className="block text-[12px] text-admin-muted">
                        {s.purchases_count === 1 ? "1 pedido" : `${s.purchases_count} pedidos`}
                        {s.last_purchase_date && ` · último ${formatDay(s.last_purchase_date)}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDialog({ editing: s })}
                        className="text-sm font-semibold text-admin-text hover:underline"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <ul className="divide-y divide-admin-border overflow-hidden rounded-md border border-admin-border bg-admin-surface md:hidden">
            {suppliers.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setDialog({ editing: s })}
                  className="block w-full px-4 py-3 text-left"
                >
                  <span className="block font-semibold text-admin-text">{s.name}</span>
                  <span className="block text-[13px] text-admin-muted">
                    {[
                      s.contact_info,
                      s.payment_method,
                      Number(s.shipping_cost) > 0 && `envío ${formatPrice(Number(s.shipping_cost))}`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Sin datos de contacto"}
                  </span>
                  <span className="block text-[13px] text-admin-muted">
                    {s.purchases_count === 1 ? "1 pedido" : `${s.purchases_count} pedidos`} ·{" "}
                    {formatPrice(s.total_paid)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {dialog && (
        <SupplierDialog
          initial={dialog.editing ? toDraft(dialog.editing) : EMPTY}
          editing={dialog.editing}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
