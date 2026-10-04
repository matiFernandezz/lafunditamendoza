import { ADMIN_INPUT_ADORNMENT, adminInput } from "./adminStyles";
import { QUANTITY_INPUT, handleQuantityKeyDown } from "./compras/quantityNav";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Rótulo accesible; si además va `caption`, se muestra arriba del campo. */
  label: string;
  caption?: string;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
};

function Caption({ text }: { text?: string }) {
  if (!text) return null;
  return <span className="mb-1 block text-xs text-admin-muted">{text}</span>;
}

/** Monto en pesos: "$" adelante, teclado decimal en el celular. */
export function MoneyInput({ value, onChange, label, caption, invalid, disabled, id, className = "" }: Props) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <Caption text={caption} />
      <span className="relative block">
        <span aria-hidden="true" className={`${ADMIN_INPUT_ADORNMENT} left-3`}>
          $
        </span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={value}
          disabled={disabled}
          aria-label={label}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className={adminInput({ prefix: "text", align: "right", mono: true, state: invalid ? "error" : null })}
        />
      </span>
    </label>
  );
}

/**
 * Unidades: "u." atrás, teclado numérico. Con `purchaseNav`, Enter/Tab salta
 * a la cantidad de la fila siguiente (grilla de compra).
 */
export function UnitsInput({
  value,
  onChange,
  label,
  caption,
  invalid,
  disabled,
  id,
  className = "",
  purchaseNav,
}: Props & { purchaseNav?: boolean }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <Caption text={caption} />
      <span className="relative block">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={value}
          disabled={disabled}
          aria-label={label}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          {...(purchaseNav ? { ...QUANTITY_INPUT, onKeyDown: handleQuantityKeyDown } : {})}
          className={adminInput({ suffix: true, align: "right", mono: true, state: invalid ? "error" : null })}
        />
        <span aria-hidden="true" className={`${ADMIN_INPUT_ADORNMENT} right-3.5`}>
          u.
        </span>
      </span>
    </label>
  );
}
