// Piel visual de /admin/* según design/ui_kits/admin (tokens de
// design/tokens/admin.css, pasados a --admin-* en globals.css): controles de
// 48px (CTA de 56px), radio de 6px, texto de inputs de 16px (evita el zoom de
// iOS al enfocar), títulos en Space Grotesk y montos en Plex Mono.
//
// Los tamaños distintos salen de variantes (adminButton(kind, size), etc.) y no
// de sumar clases encima: dos alturas en el mismo elemento no tienen un
// ganador confiable en Tailwind.

export const ADMIN_PAGE_TITLE =
  "font-display text-2xl font-semibold leading-[1.15] tracking-[-0.02em] text-admin-text";
export const ADMIN_PAGE_SUBTITLE = "mt-1 text-sm text-admin-muted";
export const ADMIN_SECTION_TITLE = "font-display text-lg font-semibold tracking-[-0.01em] text-admin-text";
export const ADMIN_LABEL = "mb-1.5 block text-sm font-semibold text-admin-text";
export const ADMIN_TEXT_MUTED = "text-[13px] text-admin-muted";
// Etiqueta chica en mayúsculas ("TOTAL A COBRAR", "NOMBRE").
export const ADMIN_CAP = "text-xs font-semibold uppercase tracking-[0.06em] text-admin-muted";
export const ADMIN_BODY = "text-[15px] text-admin-text";
export const ADMIN_NAME = "text-base font-semibold text-admin-text";

// Inputs de 48px. prefix/suffix dejan lugar para un "$", "%", "u." o un ícono.
type InputOptions = {
  prefix?: "text" | "icon";
  suffix?: boolean;
  align?: "left" | "right" | "center";
  mono?: boolean;
};
export function adminInput({ prefix, suffix, align = "left", mono }: InputOptions = {}) {
  const padLeft = prefix === "icon" ? "pl-11" : prefix === "text" ? "pl-7" : "pl-3.5";
  const padRight = suffix ? "pr-10" : "pr-3.5";
  const textAlign = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return `h-12 w-full min-w-0 rounded-md border border-admin-border-strong bg-white ${padLeft} ${padRight} ${textAlign} ${
    mono ? "font-mono tabular-nums" : ""
  } text-base text-admin-text outline-none transition-colors duration-200 placeholder:text-admin-muted focus:border-admin-ink disabled:opacity-60`;
}
export const ADMIN_INPUT = adminInput();
export const ADMIN_TEXTAREA =
  "w-full rounded-md border border-admin-border-strong bg-white p-3 text-base leading-[1.45] text-admin-text outline-none transition-colors duration-200 placeholder:text-admin-muted focus:border-admin-ink disabled:opacity-60";
// Adorno dentro del input: "$" a la izquierda (left-3) o "%"/"u." a la derecha (right-3.5).
export const ADMIN_INPUT_ADORNMENT =
  "pointer-events-none absolute inset-y-0 flex items-center font-mono text-[15px] text-admin-muted";

type ButtonKind = "primary" | "secondary" | "danger" | "dangerOutline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";
const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "h-10 min-w-10 px-3.5 text-sm",
  md: "h-12 min-w-12 px-5 text-[15px]",
  lg: "h-14 min-w-14 px-5 text-[17px]",
};
// Deshabilitado con color propio (no opacity) en los botones sólidos: negro al
// 40% sobre blanco queda gris medio y se lee como activo.
const BUTTON_KIND: Record<ButtonKind, string> = {
  primary:
    "border-admin-ink bg-admin-ink text-white disabled:border-admin-disabled-bg disabled:bg-admin-disabled-bg disabled:text-admin-disabled-fg",
  secondary: "border-admin-border-strong bg-white text-admin-text hover:bg-admin-bg disabled:opacity-45",
  danger:
    "border-admin-danger bg-admin-danger text-white disabled:border-admin-disabled-bg disabled:bg-admin-disabled-bg disabled:text-admin-disabled-fg",
  dangerOutline:
    "border-admin-danger-border bg-white text-admin-danger hover:bg-admin-danger-bg disabled:opacity-45",
  ghost: "border-transparent bg-transparent text-admin-text hover:bg-admin-bg disabled:opacity-45",
};
export function adminButton(kind: ButtonKind = "primary", size: ButtonSize = "md") {
  return `inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border font-semibold transition-[transform,background-color] duration-200 active:scale-[0.98] disabled:active:scale-100 ${BUTTON_SIZE[size]} ${BUTTON_KIND[kind]}`;
}
export const ADMIN_BUTTON_PRIMARY = adminButton("primary");
export const ADMIN_BUTTON_SECONDARY = adminButton("secondary");
export const ADMIN_BUTTON_SECONDARY_SM = adminButton("secondary", "sm");
export const ADMIN_BUTTON_DANGER = adminButton("danger");
export const ADMIN_BUTTON_DANGER_OUTLINE = adminButton("dangerOutline");

// Botón de ícono: 44px táctil (md) o 36px (sm, dentro de una miniatura).
export function adminIconButton(kind: "plain" | "outline" | "danger" = "outline", size: "sm" | "md" = "md") {
  const box = size === "sm" ? "size-9" : "size-11";
  const surface = kind === "plain" ? "border-transparent bg-transparent" : "border-admin-border-strong bg-white";
  const color =
    kind === "danger" ? "text-admin-danger hover:bg-admin-danger-bg" : "text-admin-text hover:bg-admin-bg";
  return `inline-flex ${box} shrink-0 items-center justify-center rounded-md border ${surface} ${color} transition-colors duration-200 disabled:opacity-30`;
}
export const ADMIN_ICON_BUTTON = adminIconButton();
export const ADMIN_ICON_BUTTON_DANGER = adminIconButton("danger");

// Opción de un grupo segmentado (medio de pago, período, descuento…).
export function adminSegment(active: boolean, size: "md" | "lg" = "md") {
  return `flex ${size === "lg" ? "h-14" : "h-12"} min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border px-2 text-[15px] font-semibold transition-colors duration-200 ${
    active
      ? "border-admin-ink bg-admin-ink text-white"
      : "border-admin-border-strong bg-white text-admin-text hover:bg-admin-bg"
  }`;
}

// Píldora de 44px (filtros de Ventas).
export function adminChip(active: boolean) {
  return `h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-[15px] font-semibold transition-colors duration-200 ${
    active
      ? "border-admin-ink bg-admin-ink text-white"
      : "border-admin-border-strong bg-white text-admin-text hover:bg-admin-bg"
  }`;
}

export const ADMIN_CARD = "min-w-0 rounded-md border border-admin-border bg-white p-4";
export const ADMIN_ROW_LIST =
  "divide-y divide-admin-border overflow-hidden rounded-md border border-admin-border bg-white";
export const ADMIN_EMPTY =
  "rounded-md border border-dashed border-admin-border-strong p-6 text-center text-sm text-admin-muted";
// Recuadro gris claro dentro de una tarjeta (resumen de la venta, precio masivo).
export const ADMIN_INSET = "rounded-md border border-admin-border bg-admin-bg p-4";

// Etiquetas: −15%, ANULADA, SIN STOCK.
export function adminBadge(kind: "neutral" | "danger" | "ok" | "ink" | "warn" = "neutral") {
  const look = {
    neutral: "border-admin-border bg-[#f5f5f5] text-admin-text",
    danger: "border-admin-danger-border bg-admin-danger-bg text-admin-danger",
    ok: "border-[#a7f3d0] bg-admin-ok-bg text-admin-ok",
    ink: "border-admin-ink bg-admin-ink text-white",
    warn: "border-[#fde68a] bg-[#fffbeb] text-admin-warn",
  }[kind];
  return `inline-flex h-[22px] items-center whitespace-nowrap rounded-full border px-2 text-[11px] font-bold uppercase tracking-[0.04em] ${look}`;
}

// Avisos (los muestra AdminNotice con su ícono). Se mantienen también como
// clases para los avisos de una línea sin ícono.
export const ADMIN_ALERT_ERROR =
  "rounded-md border border-admin-danger-border bg-admin-danger-bg px-3.5 py-2.5 text-sm font-medium leading-snug text-admin-danger";
export const ADMIN_ALERT_OK = "rounded-md bg-admin-ink px-3.5 py-2.5 text-sm font-medium leading-snug text-white";
