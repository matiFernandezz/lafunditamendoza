"use client";

import { useEffect, useRef, useState } from "react";
import {
  AdminApiError,
  createCashMovement,
  voidCashMovement,
  type CashAccount,
  type CashBalance,
  type CashMovement,
  type CashNewMovement,
} from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import AdminNotice from "../AdminNotice";
import {
  ADMIN_BUTTON_DANGER,
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_SECONDARY,
  ADMIN_INPUT,
  ADMIN_INPUT_ADORNMENT,
  ADMIN_LABEL,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXTAREA,
  ADMIN_TEXT_MUTED,
  adminInput,
  adminSegment,
} from "../adminStyles";
import { toDayValue } from "../periods";

/** Lo que se puede cargar desde la caja. "conteo" es el arqueo: se cuenta la plata y la diferencia queda como ajuste. */
export type DialogKind = "aporte" | "gasto" | "retiro" | "transferencia" | "conteo";

export const ACCOUNT_LABEL: Record<CashAccount, string> = { efectivo: "Efectivo", banco: "Banco" };

const ACCOUNTS: CashAccount[] = ["efectivo", "banco"];

const COPY: Record<DialogKind, { title: string; help: string; placeholder: string; submit: string }> = {
  aporte: {
    title: "Nuevo aporte",
    help: "Plata que ponen los socios en La Fundita. El saldo con el que arranca la caja es un aporte.",
    placeholder: "Ej.: Inicio de sistema, saldo actual en La Fundita",
    submit: "Guardar aporte",
  },
  gasto: {
    title: "Nuevo gasto",
    help: "Algo que se pagó con la plata de la caja: obra social, comida, packaging…",
    placeholder: "Ej.: Obra social de octubre",
    submit: "Guardar gasto",
  },
  retiro: {
    title: "Nuevo retiro",
    help: "Plata que sacan los socios de la caja.",
    placeholder: "Ej.: Retiro para gastos personales",
    submit: "Guardar retiro",
  },
  transferencia: {
    title: "Pasar plata entre cuentas",
    help: "Por ejemplo, depositar efectivo en el banco. El total de la caja no cambia.",
    placeholder: "Ej.: Depósito del efectivo de la feria",
    submit: "Guardar transferencia",
  },
  conteo: {
    title: "Contar la caja",
    help: "Contá la plata que hay de verdad. Si no coincide con la caja, la diferencia queda registrada como ajuste.",
    placeholder: "Ej.: Conteo de fin de mes",
    submit: "Registrar ajuste",
  },
};

const SUGGESTED_CATEGORIES = ["Obra social", "Comida", "Packaging", "Envíos", "Publicidad", "Insumos", "Impuestos", "Otros"];

/** "12.500" · "12500,50" · "12500.5" → 12500.5; null si no es un número. */
export function parseAmount(text: string): number | null {
  const clean = text.trim().replace(/\s/g, "");
  if (clean === "") return null;
  const normalized = /,/.test(clean) ? clean.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(clean) ? clean.replace(/\./g, "") : clean;
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

// Hoy → ahora; otro día → mediodía de ese día, para que no caiga en el borde de un período.
function occurredAt(day: string): string | undefined {
  if (day === toDayValue(new Date())) return undefined;
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toISOString();
}

function AccountPicker({
  value,
  onChange,
  label,
  balance,
}: {
  value: CashAccount;
  onChange: (account: CashAccount) => void;
  label: string;
  balance: CashBalance;
}) {
  return (
    <div role="radiogroup" aria-label={label}>
      <span className={ADMIN_LABEL}>{label}</span>
      <div className="grid grid-cols-2 gap-2">
        {ACCOUNTS.map((account) => (
          <button
            key={account}
            type="button"
            role="radio"
            aria-checked={value === account}
            onClick={() => onChange(account)}
            className={adminSegment(value === account)}
          >
            {ACCOUNT_LABEL[account]}
            <span className="font-mono text-xs font-medium opacity-70">{formatPrice(balance[account])}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Cargar un movimiento. Se monta con key por apertura (arranca limpio) y es un
 * <dialog> nativo abierto con showModal().
 */
export function MovementDialog({
  kind,
  balance,
  categories,
  onClose,
  onSaved,
}: {
  kind: DialogKind;
  balance: CashBalance;
  categories: string[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const copy = COPY[kind];
  const [account, setAccount] = useState<CashAccount>("efectivo");
  const [amountText, setAmountText] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [day, setDay] = useState(() => toDayValue(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const amount = parseAmount(amountText);
  const otherAccount: CashAccount = account === "efectivo" ? "banco" : "efectivo";
  // En el conteo, lo que se escribe es lo que hay de verdad; el movimiento es la diferencia.
  const difference = kind === "conteo" && amount !== null ? Math.round((amount - balance[account]) * 100) / 100 : null;
  const movementAmount = kind === "conteo" ? (difference === null ? null : Math.abs(difference)) : amount;
  const canSubmit =
    !saving && movementAmount !== null && movementAmount > 0 && description.trim() !== "" && (kind !== "conteo" || amount !== null && amount >= 0);

  async function submit() {
    if (!canSubmit || movementAmount === null) return;
    setSaving(true);
    setError(null);
    const payload: CashNewMovement = {
      kind: kind === "conteo" ? "ajuste" : kind,
      account,
      amount: movementAmount,
      description: description.trim(),
      occurred_at: occurredAt(day),
    };
    if (kind === "transferencia") payload.to_account = otherAccount;
    if (kind === "conteo") payload.direction = (difference ?? 0) > 0 ? "ingreso" : "egreso";
    if (kind === "gasto" && category.trim() !== "") payload.category = category.trim();
    try {
      await createCashMovement(payload);
      onSaved(kind === "conteo" ? "Ajuste registrado." : "Movimiento guardado.");
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo guardar el movimiento.");
      setSaving(false);
    }
  }

  const suggestions = [...new Set([...SUGGESTED_CATEGORIES, ...categories])];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="movimiento-titulo"
      onClose={onClose}
      className="fixed inset-0 m-auto h-fit max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-[480px] overflow-y-auto rounded-lg bg-admin-surface p-6 backdrop:bg-black/45"
    >
      <div className="flex flex-col gap-4">
        <div>
          <h2 id="movimiento-titulo" className={ADMIN_SECTION_TITLE}>
            {copy.title}
          </h2>
          <p className="mt-1 text-sm text-admin-muted">{copy.help}</p>
        </div>

        <AccountPicker
          value={account}
          onChange={setAccount}
          label={kind === "transferencia" ? "Sale de" : kind === "conteo" ? "Cuenta que contaste" : "Cuenta"}
          balance={balance}
        />
        {kind === "transferencia" && (
          <p className={ADMIN_TEXT_MUTED}>
            Va a {ACCOUNT_LABEL[otherAccount].toLowerCase()}.
          </p>
        )}

        <div>
          <label htmlFor="movimiento-monto" className={ADMIN_LABEL}>
            {kind === "conteo" ? "Plata que hay de verdad" : "Monto"}
          </label>
          <div className="relative">
            <span className={`${ADMIN_INPUT_ADORNMENT} left-3`}>$</span>
            <input
              id="movimiento-monto"
              inputMode="decimal"
              autoFocus
              value={amountText}
              onChange={(e) => {
                setAmountText(e.target.value);
                setError(null);
              }}
              placeholder="0"
              className={adminInput({ prefix: "text", mono: true, align: "right" })}
            />
          </div>
          {kind === "conteo" && difference !== null && (
            <p className={`mt-1.5 ${ADMIN_TEXT_MUTED}`}>
              {difference === 0
                ? "Coincide con la caja: no hay nada que ajustar."
                : `La caja dice ${formatPrice(balance[account])}: ${difference > 0 ? "sobran" : "faltan"} ${formatPrice(Math.abs(difference))}.`}
            </p>
          )}
        </div>

        {kind === "gasto" && (
          <div>
            <label htmlFor="movimiento-categoria" className={ADMIN_LABEL}>
              Categoría
            </label>
            <input
              id="movimiento-categoria"
              list="movimiento-categorias"
              maxLength={60}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Elegí una o escribí otra"
              className={ADMIN_INPUT}
            />
            <datalist id="movimiento-categorias">
              {suggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
        )}

        <div>
          <label htmlFor="movimiento-descripcion" className={ADMIN_LABEL}>
            Descripción
          </label>
          <textarea
            id="movimiento-descripcion"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setError(null);
            }}
            rows={2}
            maxLength={300}
            placeholder={copy.placeholder}
            className={ADMIN_TEXTAREA}
          />
        </div>

        <div>
          <label htmlFor="movimiento-fecha" className={ADMIN_LABEL}>
            Fecha
          </label>
          <input
            id="movimiento-fecha"
            type="date"
            max={toDayValue(new Date())}
            value={day}
            onChange={(e) => setDay(e.target.value || toDayValue(new Date()))}
            className={ADMIN_INPUT}
          />
        </div>

        {error && <AdminNotice kind="danger">{error}</AdminNotice>}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => dialogRef.current?.close()} disabled={saving} className={ADMIN_BUTTON_SECONDARY}>
            Cancelar
          </button>
          <button type="button" onClick={submit} disabled={!canSubmit} className={ADMIN_BUTTON_PRIMARY}>
            {saving ? "Guardando…" : copy.submit}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** Anular un movimiento manual: queda en el libro, tachado y con el motivo. */
export function VoidMovementDialog({
  movement,
  onClose,
  onVoided,
}: {
  movement: CashMovement;
  onClose: () => void;
  onVoided: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const canSubmit = reason.trim() !== "" && !saving;

  async function confirm() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await voidCashMovement(movement.id, reason.trim());
      onVoided();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo anular el movimiento.");
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="anular-mov-titulo"
      onClose={onClose}
      className="fixed inset-0 m-auto h-fit w-[calc(100%-2rem)] max-w-[440px] rounded-lg bg-admin-surface p-6 backdrop:bg-black/45"
    >
      <div className="flex flex-col gap-4">
        <div>
          <h2 id="anular-mov-titulo" className={ADMIN_SECTION_TITLE}>
            Anular movimiento
          </h2>
          <p className="mt-1 text-sm text-admin-muted">
            {movement.description} · {formatPrice(movement.amount)} · {ACCOUNT_LABEL[movement.account]}
          </p>
        </div>
        <div>
          <label htmlFor="anular-mov-motivo" className={ADMIN_LABEL}>
            Motivo
          </label>
          <textarea
            id="anular-mov-motivo"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            rows={3}
            maxLength={300}
            autoFocus
            placeholder="Ej.: se cargó dos veces, monto equivocado…"
            className={ADMIN_TEXTAREA}
          />
        </div>
        <p className="text-[15px] text-admin-text">
          Deja de sumar en la caja, pero queda registrado.
          {movement.kind === "transferencia" && " Se anulan los dos lados de la transferencia."} ¿Confirmás?
        </p>
        {error && <AdminNotice kind="danger">{error}</AdminNotice>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => dialogRef.current?.close()} disabled={saving} className={ADMIN_BUTTON_SECONDARY}>
            Cancelar
          </button>
          <button type="button" onClick={confirm} disabled={!canSubmit} className={ADMIN_BUTTON_DANGER}>
            {saving ? "Anulando…" : "Anular"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
