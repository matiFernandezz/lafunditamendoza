"use client";

const BUTTON =
  "flex size-11 items-center justify-center rounded-full border border-rule font-mono text-xl leading-none text-ink transition-colors duration-200 hover:border-ink disabled:opacity-30 disabled:hover:border-rule";

export default function QuantityControl({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Restar uno"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        className={BUTTON}
      >
        −
      </button>
      <span className="min-w-7 text-center font-mono tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="Sumar uno"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className={BUTTON}
      >
        +
      </button>
    </div>
  );
}
