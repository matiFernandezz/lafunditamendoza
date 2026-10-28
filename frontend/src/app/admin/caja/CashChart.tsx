"use client";

import type { CashSummary } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";

const dayLabel = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });

// "2026-10-28" es un día del calendario local, sin zona.
function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Lo que entró y lo que salió, día por día (solo los días con movimientos).
 * Dos barras por día: entradas en el negro del panel y salidas en gris. Cada
 * día es zona de hover/foco con los dos montos; debajo, la misma información
 * en una tabla para lectores de pantalla.
 */
export default function CashChart({ series }: { series: CashSummary["series"] }) {
  const points = series.map((p) => ({ ...p, date: parseDay(p.day) }));
  const max = Math.max(0, ...points.flatMap((p) => [p.ingresos, p.egresos]));

  if (max === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed border-admin-border-strong text-sm text-admin-muted">
        Todavía no hay movimientos en este período.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex gap-4 text-[13px] text-admin-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-admin-ink" />
          Entró
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-admin-border-strong" />
          Salió
        </span>
      </div>
      <div aria-hidden="true" className="flex h-[200px] items-end gap-1.5 border-b border-admin-border-strong">
        {points.map((p, i) => {
          const edge = i < 2 ? "left-0" : i > points.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2";
          return (
            <div key={p.day} className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-[2px]">
              <div className="w-full max-w-5 rounded-t-sm bg-admin-ink" style={{ height: `${(p.ingresos / max) * 100}%` }} />
              <div
                className="w-full max-w-5 rounded-t-sm bg-admin-border-strong"
                style={{ height: `${(p.egresos / max) * 100}%` }}
              />
              <div
                className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md bg-admin-ink px-2.5 py-1.5 text-xs text-white group-hover:block ${edge}`}
              >
                <p className="font-semibold">{dayLabel.format(p.date)}</p>
                <p className="font-mono">Entró {formatPrice(p.ingresos)}</p>
                <p className="font-mono">Salió {formatPrice(p.egresos)}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="mt-1.5 flex gap-1.5 text-[11px] text-admin-muted">
        {points.map((p, i) => (
          <span key={p.day} className="min-w-0 flex-1 truncate text-center">
            {points.length <= 12 || i % Math.ceil(points.length / 10) === 0 ? dayLabel.format(p.date) : ""}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Entradas y salidas por día</caption>
        <thead>
          <tr>
            <th>Día</th>
            <th>Entró</th>
            <th>Salió</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.day}>
              <td>{dayLabel.format(p.date)}</td>
              <td>{formatPrice(p.ingresos)}</td>
              <td>{formatPrice(p.egresos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
