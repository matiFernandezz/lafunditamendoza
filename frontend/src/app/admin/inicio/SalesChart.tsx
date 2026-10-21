"use client";

import type { Dashboard } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";

type Series = Dashboard["series"];

const dayLabel = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });
const weekdayLabel = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric" });

// "2026-10-20T15:00" es hora local del panel: se arma la fecha sin zona.
function parseBucket(bucket: string): Date {
  const [day, time] = bucket.split("T");
  const [y, m, d] = day.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min);
}

function bucketName(date: Date, unit: Series["unit"]) {
  return unit === "hour" ? `${date.getHours()} hs` : dayLabel.format(date);
}

// Etiquetas del eje, salteadas para que no se pisen: horas cada 6, días del
// mes en 1, 5, 10…; los 7 días de una semana van todos, con el día de la semana.
function axisLabel(date: Date, index: number, total: number, unit: Series["unit"]): string | null {
  if (unit === "hour") return index % 6 === 0 ? `${date.getHours()} hs` : null;
  if (total <= 7) return weekdayLabel.format(date);
  const d = date.getDate();
  return d === 1 || d % 5 === 0 ? String(d) : null;
}

/**
 * Barras de ventas por día (o por hora, si el período es hoy). Una sola serie
 * en el negro del panel: no lleva leyenda, el título la nombra. Cada columna
 * entera es zona de hover/foco y muestra el monto del día; el máximo va
 * rotulado. Debajo, la misma información en una tabla para lectores de pantalla.
 */
export default function SalesChart({ series }: { series: Series }) {
  const points = series.points.map((p) => ({ ...p, date: parseBucket(p.bucket) }));
  const max = Math.max(0, ...points.map((p) => p.total_amount));
  const maxIndex = max > 0 ? points.findIndex((p) => p.total_amount === max) : -1;

  if (max === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed border-admin-border-strong text-sm text-admin-muted">
        Todavía no hay ventas en este período.
      </div>
    );
  }

  return (
    <div>
      <div aria-hidden="true" className="flex h-[220px] items-end gap-[2px] border-b border-admin-border-strong pt-7">
        {points.map((p, i) => {
          const height = (p.total_amount / max) * 100;
          // Las columnas de las puntas abren el tooltip hacia adentro.
          const edge = i < 2 ? "left-0" : i > points.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2";
          return (
            <div key={p.bucket} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
              {i === maxIndex && (
                <span
                  className={`absolute whitespace-nowrap font-mono text-xs font-semibold tabular-nums text-admin-text group-hover:invisible ${edge}`}
                  style={{ bottom: `calc(${height}% + 6px)` }}
                >
                  {formatPrice(p.total_amount)}
                </span>
              )}
              {p.total_amount > 0 && (
                <span
                  className="block w-full max-w-7 rounded-t-[4px] bg-admin-ink transition-opacity duration-150 group-hover:opacity-80"
                  style={{ height: `${Math.max(height, 1.5)}%` }}
                />
              )}
              <span
                className={`pointer-events-none absolute z-10 whitespace-nowrap rounded-md bg-admin-ink px-2.5 py-1.5 text-xs text-admin-on-ink opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${edge}`}
                style={{ bottom: `calc(${height}% + 8px)` }}
              >
                {bucketName(p.date, series.unit)}:{" "}
                <span className="font-mono font-semibold tabular-nums">{formatPrice(p.total_amount)}</span>
                {p.sales_count > 0 && ` · ${p.sales_count === 1 ? "1 venta" : `${p.sales_count} ventas`}`}
              </span>
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="mt-2 flex gap-[2px]">
        {points.map((p, i) => {
          const label = axisLabel(p.date, i, points.length, series.unit);
          return (
            <span key={p.bucket} className="relative h-4 min-w-0 flex-1">
              {label && (
                <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-admin-muted">
                  {label}
                </span>
              )}
            </span>
          );
        })}
      </div>

      <table className="sr-only">
        <caption>Ventas por {series.unit === "hour" ? "hora" : "día"}</caption>
        <thead>
          <tr>
            <th scope="col">{series.unit === "hour" ? "Hora" : "Día"}</th>
            <th scope="col">Vendido</th>
            <th scope="col">Ventas</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.bucket}>
              <th scope="row">{bucketName(p.date, series.unit)}</th>
              <td>{formatPrice(p.total_amount)}</td>
              <td>{p.sales_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
