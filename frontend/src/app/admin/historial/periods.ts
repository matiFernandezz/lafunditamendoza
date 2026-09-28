// Los períodos se arman con la hora local del dispositivo (el celular en la
// feria) y viajan al backend como instantes exactos: "Hoy" es el día de acá,
// no el de UTC, que en Argentina corta a las 21 hs.

export type PresetKind = "today" | "week" | "month";
export type PeriodKind = PresetKind | "custom";

export type Range = { from: Date; to: Date };

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** [from, to): hoy, semana de lunes a domingo, o mes calendario. */
export function presetRange(kind: PresetKind, now: Date): Range {
  const today = startOfDay(now);
  if (kind === "today") return { from: today, to: addDays(today, 1) };
  if (kind === "week") {
    const monday = addDays(today, -((today.getDay() + 6) % 7));
    return { from: monday, to: addDays(monday, 7) };
  }
  return {
    from: new Date(today.getFullYear(), today.getMonth(), 1),
    to: new Date(today.getFullYear(), today.getMonth() + 1, 1),
  };
}

/** "2026-09-28" de un <input type="date"> a medianoche local; null si no es válido. */
export function parseDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDayValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Personalizado: los dos días inclusive. null si falta uno o están al revés. */
export function customRange(fromDay: string, toDay: string): Range | null {
  const from = parseDay(fromDay);
  const to = parseDay(toDay);
  if (!from || !to || from > to) return null;
  return { from, to: addDays(to, 1) };
}

const dayFormat = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" });
const shortDayFormat = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" });
const monthFormat = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });

/** "domingo, 28 de septiembre" · "22–28 de septiembre" · "septiembre de 2026". */
export function describeRange(kind: PeriodKind, range: Range): string {
  const lastDay = addDays(range.to, -1);
  if (kind === "month") return monthFormat.format(range.from);
  if (range.from.getTime() === startOfDay(lastDay).getTime()) return dayFormat.format(range.from);
  return shortDayFormat.formatRange(range.from, lastDay);
}

/** Si el rango abarca más de un día, la lista muestra el día además de la hora. */
export function spansSeveralDays(range: Range): boolean {
  return range.to.getTime() - range.from.getTime() > 25 * 60 * 60 * 1000;
}
