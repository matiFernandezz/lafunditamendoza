// Diseño de una foto del carrusel de la portada, armado en el editor del panel
// (Tienda › Carrusel › Editar diseño). Computadora y celular tienen cada uno el
// suyo: encuadre de la foto, oscurecido, sombra y los elementos encima (textos,
// logo, link, rango de modelos), cada uno donde se lo dejó.
//
// Todo se guarda relativo a la foto, así la vista previa del panel, la compu y
// el celular dibujan lo mismo a distinta escala:
//   x, y: dónde va el elemento, en % del ancho y del alto de la foto.
//   size: tamaño en % del ancho de la foto (la letra; en el logo, su ancho).
//   w:    solo textos: ancho de la caja en % del ancho (sin w, cada renglón
//         ocupa lo que mide; con w, el texto se acomoda en renglones).
//   h:    alto del elemento en % del alto (lo mide el editor). Con él, los que
//         quedan en la mitad de abajo se anclan al borde de abajo y no se salen
//         en pantallas más bajas.
// El panel los muestra en px sobre una pantalla de referencia (DEVICE_FRAME).
// Lógica pura: la usan la home, el editor y la API (validación).

export type SlideDevice = "desktop" | "mobile";

/** Pantalla de referencia de cada dispositivo (los px que ve el panel). */
export const DEVICE_FRAME: Record<SlideDevice, { width: number; height: number; label: string }> = {
  desktop: { width: 1440, height: 791, label: "Computadora" },
  mobile: { width: 390, height: 488, label: "Celular" },
};

export type ElementAlign = "left" | "center" | "right";
export type ElementColor = "claro" | "oscuro";
export type TextStyle = "titulo" | "etiqueta" | "bajada";

type ElementBase = {
  id: string;
  x: number;
  y: number;
  h: number;
  size: number;
  align: ElementAlign;
  color: ElementColor;
};

export type SlideElement =
  | (ElementBase & { type: "texto"; text: string; style: TextStyle; w?: number })
  | (ElementBase & { type: "logo" })
  | (ElementBase & { type: "link"; text: string; href: string })
  | (ElementBase & { type: "rango"; from: string; to: string });

export type SlideElementType = SlideElement["type"];

/** Degradé oscuro para que el texto se lea, del lado que se elija. */
export type SlideShade = "ninguna" | "arriba" | "abajo" | "izquierda" | "derecha" | "pareja";

export type DeviceLayout = {
  /** Encuadre de la foto (object-position), en %. */
  focusX: number;
  focusY: number;
  /** Cuánto se oscurece la foto: 0 = nada, 0.8 = casi negra. */
  dim: number;
  shade: SlideShade;
  elements: SlideElement[];
};

export type SlideLayout = Record<SlideDevice, DeviceLayout>;

export const ELEMENT_LIMITS = {
  maxElements: 12,
  width: { min: 2, max: 150 },
  text: 300,
  short: 80,
  href: 300,
  size: { min: 0.2, max: 60 },
  position: { min: -20, max: 120 },
};

// ---------------------------------------------------------------------------
// px de la pantalla de referencia <-> valores guardados
// ---------------------------------------------------------------------------

const round = (n: number, step = 0.01) => Math.round(n / step) * step;

export function sizeToPx(device: SlideDevice, size: number) {
  return Math.round((size * DEVICE_FRAME[device].width) / 100);
}
export function pxToSize(device: SlideDevice, px: number) {
  return round((px / DEVICE_FRAME[device].width) * 100, 0.001);
}
export function xToPx(device: SlideDevice, x: number) {
  return Math.round((x * DEVICE_FRAME[device].width) / 100);
}
export function pxToX(device: SlideDevice, px: number) {
  return round((px / DEVICE_FRAME[device].width) * 100, 0.001);
}
export function yToPx(device: SlideDevice, y: number) {
  return Math.round((y * DEVICE_FRAME[device].height) / 100);
}
export function pxToY(device: SlideDevice, px: number) {
  return round((px / DEVICE_FRAME[device].height) * 100, 0.001);
}

/** Cuánto oscurecer la foto: el filtro brightness que le corresponde. */
export const brightnessOf = (layout: DeviceLayout) => round(1 - layout.dim, 0.01);

// ---------------------------------------------------------------------------
// Elementos nuevos (el editor) y diseño vacío
// ---------------------------------------------------------------------------

export function newElementId() {
  return Math.random().toString(36).slice(2, 10);
}

/** Tamaño de partida de cada elemento, en px de la pantalla de referencia. */
const START_PX: Record<SlideDevice, Record<SlideElementType | TextStyle, number>> = {
  desktop: { texto: 72, titulo: 72, etiqueta: 13, bajada: 20, logo: 190, link: 13, rango: 120 },
  mobile: { texto: 40, titulo: 40, etiqueta: 12, bajada: 15, logo: 110, link: 12, rango: 56 },
};

export function newElement(type: SlideElementType, device: SlideDevice, style: TextStyle = "titulo"): SlideElement {
  const px = type === "texto" ? START_PX[device][style] : START_PX[device][type];
  const base = {
    id: newElementId(),
    x: pxToX(device, device === "desktop" ? 64 : 20),
    y: 30,
    h: 10,
    size: pxToSize(device, px),
    align: "left" as const,
    color: "claro" as const,
  };
  switch (type) {
    case "texto":
      return { ...base, type, style, text: style === "etiqueta" ? "ETIQUETA" : "Tu texto" };
    case "logo":
      return { ...base, type };
    case "link":
      return { ...base, type, text: "Ver más", href: "/categoria/todo" };
    case "rango":
      return { ...base, type, from: "iPhone 11", to: "18 Pro Max" };
  }
}

export function emptyDeviceLayout(): DeviceLayout {
  return { focusX: 50, focusY: 50, dim: 0, shade: "ninguna", elements: [] };
}

/**
 * Pasa los elementos de un dispositivo al otro: mismas posiciones (en %) y el
 * mismo tamaño en px de pantalla escalado (lo de la compu en el celular, más chico).
 */
export function copyDeviceLayout(from: DeviceLayout, fromDevice: SlideDevice, to: SlideDevice): DeviceLayout {
  const factor = to === fromDevice ? 1 : to === "mobile" ? 0.55 : 1 / 0.55;
  return {
    ...from,
    elements: from.elements.map((el) => {
      const size = clampSize(pxToSize(to, sizeToPx(fromDevice, el.size) * factor));
      // El ancho de la caja acompaña a la letra (mismos renglones en los dos).
      const w =
        el.type === "texto" && el.w !== undefined
          ? Math.min(ELEMENT_LIMITS.width.max, Math.max(ELEMENT_LIMITS.width.min, (el.w * size) / el.size))
          : undefined;
      return { ...el, id: newElementId(), size, ...(w !== undefined ? { w } : {}) } as SlideElement;
    }),
  };
}

const clampSize = (n: number) => Math.min(ELEMENT_LIMITS.size.max, Math.max(ELEMENT_LIMITS.size.min, n));

// ---------------------------------------------------------------------------
// Validación (API y lectura): devuelve una copia limpia o el error
// ---------------------------------------------------------------------------

const ALIGNS: ElementAlign[] = ["left", "center", "right"];
const COLORS: ElementColor[] = ["claro", "oscuro"];
const STYLES: TextStyle[] = ["titulo", "etiqueta", "bajada"];
const SHADES: SlideShade[] = ["ninguna", "arriba", "abajo", "izquierda", "derecha", "pareja"];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined;
const str = (v: unknown, max: number) => (typeof v === "string" && v.length <= max ? v : undefined);
const oneOf = <T extends string>(v: unknown, options: T[]) => (options.includes(v as T) ? (v as T) : undefined);

/** Link de un elemento: una página de la tienda (/…) o https://. */
export const isSlideHref = (href: string) => href.length <= ELEMENT_LIMITS.href && /^(\/|https:\/\/)/.test(href);

function parseElement(raw: unknown): SlideElement | string {
  if (!isObject(raw)) return "un elemento no tiene el formato esperado";
  const { min, max } = ELEMENT_LIMITS.position;
  const base = {
    id: str(raw.id, 40),
    x: num(raw.x, min, max),
    y: num(raw.y, min, max),
    h: num(raw.h, 0, 200) ?? 10,
    size: num(raw.size, ELEMENT_LIMITS.size.min, ELEMENT_LIMITS.size.max),
    align: oneOf(raw.align, ALIGNS),
    color: oneOf(raw.color, COLORS),
  };
  if (
    !base.id ||
    base.x === undefined ||
    base.y === undefined ||
    base.size === undefined ||
    !base.align ||
    !base.color
  ) {
    return "a un elemento le falta la posición, el tamaño, la alineación o el color";
  }
  const el = base as ElementBase;
  switch (raw.type) {
    case "texto": {
      const text = str(raw.text, ELEMENT_LIMITS.text);
      const style = oneOf(raw.style, STYLES);
      if (text === undefined || !style) return "un texto no es válido (hasta 300 letras)";
      const w =
        raw.w === undefined || raw.w === null
          ? undefined
          : num(raw.w, ELEMENT_LIMITS.width.min, ELEMENT_LIMITS.width.max);
      if (raw.w !== undefined && raw.w !== null && w === undefined) return "el ancho de un texto no es válido";
      return { ...el, type: "texto", text, style, ...(w !== undefined ? { w } : {}) };
    }
    case "logo":
      return { ...el, type: "logo" };
    case "link": {
      const text = str(raw.text, ELEMENT_LIMITS.short);
      const href = str(raw.href, ELEMENT_LIMITS.href)?.trim();
      if (text === undefined || !href || !isSlideHref(href)) {
        return "el link tiene que llevar a una página de la tienda (/…) o a una dirección https://";
      }
      return { ...el, type: "link", text, href };
    }
    case "rango": {
      const from = str(raw.from, ELEMENT_LIMITS.short);
      const to = str(raw.to, ELEMENT_LIMITS.short);
      if (from === undefined || to === undefined) return "el rango de modelos no es válido";
      return { ...el, type: "rango", from, to };
    }
    default:
      return "hay un elemento de un tipo desconocido";
  }
}

function parseDevice(raw: unknown, label: string): DeviceLayout | string {
  if (!isObject(raw)) return `falta el diseño de ${label}`;
  const focusX = num(raw.focusX, 0, 100);
  const focusY = num(raw.focusY, 0, 100);
  const dim = num(raw.dim, 0, 0.9);
  const shade = oneOf(raw.shade, SHADES);
  if (focusX === undefined || focusY === undefined || dim === undefined || !shade) {
    return `el encuadre, el oscurecido o la sombra de ${label} no son válidos`;
  }
  if (!Array.isArray(raw.elements) || raw.elements.length > ELEMENT_LIMITS.maxElements) {
    return `${label} puede tener hasta ${ELEMENT_LIMITS.maxElements} elementos`;
  }
  const elements: SlideElement[] = [];
  for (const item of raw.elements) {
    const el = parseElement(item);
    if (typeof el === "string") return `En ${label}, ${el}.`;
    elements.push(el);
  }
  return { focusX, focusY, dim, shade, elements };
}

export function parseSlideLayout(raw: unknown): { layout: SlideLayout } | { error: string } {
  if (!isObject(raw)) return { error: "El diseño no tiene el formato esperado." };
  const desktop = parseDevice(raw.desktop, "la computadora");
  if (typeof desktop === "string") return { error: desktop.endsWith(".") ? desktop : `${desktop}.` };
  const mobile = parseDevice(raw.mobile, "el celular");
  if (typeof mobile === "string") return { error: mobile.endsWith(".") ? mobile : `${mobile}.` };
  return { layout: { desktop, mobile } };
}

// ---------------------------------------------------------------------------
// Del carrusel de antes (tipo + ubicaciones automáticas) a un diseño editable
// ---------------------------------------------------------------------------

/** Los campos del carrusel de antes que hacen falta para pasarlo a diseño. */
export type LegacySlide = {
  kind: "rango" | "titulo" | "logo" | "foto";
  label: string | null;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  cta_href: string | null;
  position: string | null;
  position_mobile: string | null;
  dim: number | null;
  text_size: "chico" | "mediano" | "grande" | null;
  text_position: string | null;
  logo_position: string | null;
  logo_size: "chico" | "mediano" | "grande" | null;
};

const RANGE_LEAD = "Fundas y accesorios para tu iPhone. Elegí tu modelo y mirá lo que hay en stock.";

// Medidas del carrusel de antes, en px de la pantalla de referencia.
const LEGACY = {
  desktop: {
    padX: 64,
    padTop: 72,
    padBottom: 72,
    title: { chico: 72, mediano: 94, grande: 144, conEtiqueta: 79 },
    logo: { chico: 130, mediano: 180, grande: 260 },
    lead: 22,
    leadChars: 34,
  },
  mobile: {
    padX: 20,
    padTop: 32,
    padBottom: 48,
    title: { chico: 40, mediano: 48, grande: 59, conEtiqueta: 42 },
    logo: { chico: 86, mediano: 117, grande: 164 },
    lead: 15,
    leadChars: 30,
  },
} as const;

/** Corta un texto en renglones de hasta `chars` letras (como lo hacía el ancho máximo). */
function wrap(text: string, chars: number) {
  const lines: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && (last + " " + word).length <= chars) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines.join("\n");
}

/** "center 25%", "left center"… → % horizontal y vertical. */
function parseFocus(position: string | null): { focusX: number; focusY: number } {
  const words: Record<string, number> = { left: 0, top: 0, center: 50, right: 100, bottom: 100 };
  const parts = (position ?? "center").trim().split(/\s+/);
  const value = (p: string | undefined) => (p === undefined ? 50 : p.endsWith("%") ? Number(p.slice(0, -1)) : words[p]);
  let [x, y] = [value(parts[0]), value(parts[1])];
  // "top"/"bottom" solos son vertical.
  if (parts.length === 1 && (parts[0] === "top" || parts[0] === "bottom")) [x, y] = [50, value(parts[0])];
  const ok = (n: number | undefined) => (n !== undefined && Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50);
  return { focusX: ok(x), focusY: ok(y) };
}

// Omit que respeta la unión (cada tipo de elemento con sus campos).
type Unplaced<T> = T extends SlideElement ? Omit<T, "x" | "y" | "align"> : never;
type Piece = { el: Unplaced<SlideElement>; heightPx: number };

function legacyDevice(slide: LegacySlide, device: SlideDevice): DeviceLayout {
  const m = LEGACY[device];
  const frame = DEVICE_FRAME[device];
  const color = "claro" as const;
  const sized = (px: number) => pxToSize(device, px);
  const base = (px: number) => ({ id: newElementId(), h: 0, size: sized(px), color });

  const hasLink = Boolean(slide.cta_href);
  const link: Piece[] = hasLink
    ? [
        {
          el: { ...base(12), type: "link", text: slide.cta_label || "Ver más", href: slide.cta_href! },
          heightPx: 20,
        },
      ]
    : [];

  // El texto según el tipo (lo de arriba hacia abajo).
  let text: Piece[] = [];
  let gap = 20;
  if (slide.kind === "rango") {
    gap = 24;
    const titlePx = m.title[slide.text_size ?? "grande"];
    const lead = slide.subtitle ?? (device === "mobile" ? "Fundas y accesorios para tu iPhone." : RANGE_LEAD);
    const leadText = wrap(lead, m.leadChars);
    text = [
      {
        el: { ...base(titlePx), type: "rango", from: slide.label ?? "iPhone 11", to: slide.title ?? "18 Pro Max" },
        heightPx: titlePx * 0.92 * 2,
      },
      {
        el: { ...base(m.lead), type: "texto", style: "bajada", text: leadText },
        heightPx: m.lead * 1.5 * leadText.split("\n").length,
      },
      ...link,
    ];
  } else if (slide.title || slide.label || hasLink) {
    gap = slide.label ? 16 : 20;
    const titlePx =
      slide.text_size !== null
        ? m.title[slide.text_size]
        : slide.kind === "logo"
          ? m.title.chico
          : slide.label
            ? m.title.conEtiqueta
            : m.title.mediano;
    const title = slide.title ? wrap(slide.title, 12) : "";
    text = [
      ...(slide.label
        ? [{ el: { ...base(12), type: "texto" as const, style: "etiqueta" as const, text: slide.label }, heightPx: 16 }]
        : []),
      ...(title
        ? [
            {
              el: { ...base(titlePx), type: "texto" as const, style: "titulo" as const, text: title },
              heightPx: titlePx * 0.95 * title.split("\n").length,
            },
          ]
        : []),
      ...link,
    ];
  }

  const logoAt = slide.logo_position ?? (slide.kind === "logo" ? "abajo-izquierda" : null);
  const textAt =
    slide.text_position ??
    (slide.kind === "rango" ? "abajo-izquierda" : slide.kind === "logo" && logoAt ? logoAt : "arriba-izquierda");
  const logoPx = m.logo[slide.logo_size ?? "mediano"];
  const logo: Piece[] = logoAt ? [{ el: { ...base(logoPx), type: "logo" }, heightPx: (logoPx * 949) / 836 }] : [];

  // Apila los bloques en su lugar (arriba/centro/abajo × izquierda/centro/derecha).
  const elements: SlideElement[] = [];
  const place = (pieces: Piece[], at: string, gapPx: number) => {
    if (pieces.length === 0) return;
    const [v, hz] = at.split("-");
    const total = pieces.reduce((sum, p) => sum + p.heightPx, 0) + gapPx * (pieces.length - 1);
    let top =
      v === "arriba" ? m.padTop : v === "centro" ? (frame.height - total) / 2 : frame.height - m.padBottom - total;
    const align: ElementAlign = hz === "centro" ? "center" : hz === "derecha" ? "right" : "left";
    const xPx = align === "left" ? m.padX : align === "center" ? frame.width / 2 : frame.width - m.padX;
    for (const piece of pieces) {
      elements.push({
        ...piece.el,
        x: pxToX(device, xPx),
        y: pxToY(device, top),
        h: pxToY(device, piece.heightPx),
        align,
      } as SlideElement);
      top += piece.heightPx + gapPx;
    }
  };
  if (logoAt && text.length > 0 && logoAt === textAt) {
    place([...logo, ...text], textAt, 16);
  } else {
    place(logo, logoAt ?? "abajo-izquierda", 0);
    place(text, textAt, gap);
  }

  const brightness = slide.dim ?? (slide.kind === "logo" ? 0.55 : 1);
  const vertical = textAt.split("-")[0];
  const shade: SlideShade =
    text.length === 0 ? "ninguna" : vertical === "arriba" ? "arriba" : vertical === "abajo" ? "abajo" : "pareja";
  return {
    ...parseFocus(device === "mobile" ? (slide.position_mobile ?? slide.position) : slide.position),
    dim: round(Math.min(0.9, Math.max(0, 1 - brightness)), 0.01),
    shade,
    elements,
  };
}

/** El diseño equivalente (aproximado) de un slide del carrusel de antes: punto de partida del editor. */
export function legacyLayout(slide: LegacySlide): SlideLayout {
  return { desktop: legacyDevice(slide, "desktop"), mobile: legacyDevice(slide, "mobile") };
}
