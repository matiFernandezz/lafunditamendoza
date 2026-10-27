"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Copy,
  Crosshair,
  Heading,
  Image as ImageIcon,
  Link2,
  Monitor,
  MoveRight,
  Pilcrow,
  Smartphone,
  Tag,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { elementPlacement, SHADE_BACKGROUND, SlideElementView } from "@/components/SlideLayers";
import { updateHomeSlide, type HomeSlide } from "@/lib/adminApi";
import {
  brightnessOf,
  copyDeviceLayout,
  DEVICE_FRAME,
  ELEMENT_LIMITS,
  isSlideHref,
  legacyLayout,
  newElement,
  newElementId,
  pxToSize,
  pxToX,
  pxToY,
  sizeToPx,
  xToPx,
  yToPx,
  type DeviceLayout,
  type SlideDevice,
  type SlideElement,
  type SlideElementType,
  type SlideLayout,
  type SlideShade,
  type TextStyle,
} from "@/lib/slideLayout";
import {
  ADMIN_CAP,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXTAREA,
  ADMIN_TEXT_MUTED,
  adminButton,
  adminIconButton,
  adminInput,
  adminSegment,
} from "../adminStyles";

// Editor visual de una foto del carrusel (Tienda › Carrusel › Editar diseño).
// La foto de verdad, con los elementos dibujados por el mismo componente que
// la home (SlideElementView): se arrastran para moverlos, la esquina los
// agranda, y a la derecha van las medidas exactas en px de la pantalla de
// referencia. Computadora y celular se editan por separado.

const SNAP = 0.8; // % de la foto en que un elemento "se pega" a una guía.

/** Una guía: centro de la foto (azul), ecuador (amarilla) o alineación con otro elemento o un margen (rosa). */
type Guide = { pos: number; kind: "centro" | "ecuador" | "alinear" };
const GUIDE_COLOR: Record<Guide["kind"], string> = { centro: "#3b82f6", ecuador: "#facc15", alinear: "#ec4899" };

/** Bordes y centros de un elemento, en % de la foto. */
type Box = { left: number; center: number; right: number; top: number; middle: number; bottom: number };

/**
 * Busca la guía más cercana (a menos de SNAP) para alguno de los puntos del
 * elemento (borde, centro, borde). Devuelve cuánto correrlo y la guía.
 */
function snapTo(points: number[], targets: Guide[]): { shift: number; guide: Guide } | null {
  let best: { shift: number; guide: Guide } | null = null;
  for (const target of targets) {
    for (const point of points) {
      const shift = target.pos - point;
      if (Math.abs(shift) < SNAP && (!best || Math.abs(shift) < Math.abs(best.shift) - 0.01))
        best = { shift, guide: target };
    }
  }
  return best;
}
const MAX_PX: Record<SlideDevice, number> = { desktop: 520, mobile: 260 };

// Márgenes de la tienda (los del texto de siempre), para las guías.
const MARGIN_PX: Record<SlideDevice, number> = { desktop: 64, mobile: 20 };

const ADD_BUTTONS: { type: SlideElementType; style?: TextStyle; label: string; icon: typeof Heading }[] = [
  { type: "texto", style: "titulo", label: "Título", icon: Heading },
  { type: "texto", style: "etiqueta", label: "Texto chico", icon: Tag },
  { type: "texto", style: "bajada", label: "Párrafo", icon: Pilcrow },
  { type: "logo", label: "Logo", icon: ImageIcon },
  { type: "link", label: "Link", icon: Link2 },
  { type: "rango", label: "Rango de modelos", icon: MoveRight },
];

const STYLE_LABEL: Record<TextStyle, string> = { titulo: "Título", etiqueta: "Texto chico", bajada: "Párrafo" };

const SHADES: { value: SlideShade; label: string }[] = [
  { value: "ninguna", label: "Sin sombra" },
  { value: "abajo", label: "Abajo" },
  { value: "arriba", label: "Arriba" },
  { value: "izquierda", label: "Izquierda" },
  { value: "derecha", label: "Derecha" },
  { value: "pareja", label: "Pareja" },
];

function elementName(el: SlideElement) {
  switch (el.type) {
    case "texto":
      return { kind: STYLE_LABEL[el.style], text: el.text.split("\n").join(" ") || "(vacío)" };
    case "logo":
      return { kind: "Logo", text: "La Fundita" };
    case "link":
      return { kind: "Link", text: `${el.text || "Ver más"} → ${el.href}` };
    case "rango":
      return { kind: "Rango de modelos", text: `${el.from} → ${el.to}` };
  }
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

type Drag = {
  /** move: mover · size: la letra (esquina) · left/right: el ancho de la caja de texto (costados). */
  mode: "move" | "size" | "left" | "right";
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  el: SlideElement;
  rect: DOMRect;
  /** Ancho del elemento en pantalla al empezar (para agrandar en proporción). */
  width: number;
  /** Bordes izquierdo y derecho del elemento al empezar, en % de la foto. */
  left: number;
  right: number;
  /** Los otros elementos, para alinearse con ellos. */
  others: Box[];
  moved: boolean;
};

/** Un número con su unidad ("px", "%"), que se puede tipear o mover con las flechitas. */
function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  unit,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  unit: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={ADMIN_LABEL}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(n)) onChange(clamp(n, min, max));
          }}
          className={adminInput({ mono: true, suffix: true })}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center font-mono text-[15px] text-admin-muted">
          {unit}
        </span>
      </div>
    </div>
  );
}

/** Opciones de un grupo segmentado chico (alineación, color, estilo). */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: typeof Heading }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className={ADMIN_LABEL}>{label}</legend>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
            className={`${adminSegment(o.value === value)} !h-10 text-sm`}
            title={o.label}
          >
            {o.icon ? <o.icon aria-hidden="true" className="size-4" /> : null}
            <span className={o.icon ? "sr-only" : ""}>{o.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Barra deslizante con su valor a la derecha. */
function Slider({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format: (value: number) => string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-admin-text">
          {label}
        </label>
        <span className="font-mono text-[13px] tabular-nums text-admin-muted">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-6 w-full cursor-pointer accent-[var(--admin-ink,#111)]"
      />
    </div>
  );
}

/** Los costados de una caja de texto: cambian su ancho (más o menos renglones). */
function WidthHandles({ onStart }: { onStart: (e: React.PointerEvent, side: "left" | "right") => void }) {
  return (
    <>
      {(["left", "right"] as const).map((side) => (
        <span
          key={side}
          aria-hidden="true"
          title="Ancho de la caja"
          onPointerDown={(e) => onStart(e, side)}
          className={`absolute top-1/2 ${side === "left" ? "-left-[7px]" : "-right-[7px]"} h-7 w-2.5 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-white bg-[#38bdf8] shadow`}
        />
      ))}
    </>
  );
}

export default function SlideEditor({
  slide,
  index,
  onClose,
  onSaved,
}: {
  slide: HomeSlide;
  index: number;
  onClose: () => void;
  onSaved: (slide: HomeSlide) => void;
}) {
  // Lo último guardado (o el diseño de antes, si nunca se editó): contra eso se ve si hay cambios.
  const [saved, setSaved] = useState<SlideLayout>(() => slide.layout ?? legacyLayout(slide));
  const [layout, setLayout] = useState<SlideLayout>(saved);
  const [device, setDevice] = useState<SlideDevice>("desktop");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<SlideLayout[]>([]);
  const [guides, setGuides] = useState<{ v: Guide[]; h: Guide[] }>({ v: [], h: [] });
  // Centro y ecuador siempre a la vista (botón "Guías").
  const [showGuides, setShowGuides] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  // El diseño actual para "deshacer" (se guarda antes de cada cambio).
  const layoutRef = useRef(layout);
  useLayoutEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  const frame = DEVICE_FRAME[device];
  const current = layout[device];
  const selected = current.elements.find((el) => el.id === selectedId) ?? null;
  const dirty = JSON.stringify(layout) !== JSON.stringify(saved);
  const photo = device === "mobile" ? (slide.mobile_image_url ?? slide.image_url) : slide.image_url;
  const ids = (field: string) => `editor-${slide.id}-${field}`;

  // ---- cambios (con deshacer) ----
  const remember = useCallback(() => setHistory((h) => [...h.slice(-49), layoutRef.current]), []);

  const setDeviceLayout = useCallback(
    (change: (d: DeviceLayout) => DeviceLayout, record = true) => {
      if (record) remember();
      setLayout((l) => ({ ...l, [device]: change(l[device]) }));
    },
    [device, remember],
  );

  const patchElement = useCallback(
    (id: string, patch: Partial<SlideElement>, record = true) =>
      setDeviceLayout(
        (d) => ({
          ...d,
          elements: d.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as SlideElement) : el)),
        }),
        record,
      ),
    [setDeviceLayout],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      setLayout(h[h.length - 1]);
      return h.slice(0, -1);
    });
  }, []);

  function addElement(type: SlideElementType, style?: TextStyle) {
    if (current.elements.length >= ELEMENT_LIMITS.maxElements) {
      setError(`Cada foto puede tener hasta ${ELEMENT_LIMITS.maxElements} elementos por dispositivo.`);
      return;
    }
    const el = newElement(type, device, style);
    setDeviceLayout((d) => ({ ...d, elements: [...d.elements, el] }));
    setSelectedId(el.id);
  }

  function removeElement(id: string) {
    setDeviceLayout((d) => ({ ...d, elements: d.elements.filter((el) => el.id !== id) }));
    setSelectedId(null);
  }

  function duplicateElement(el: SlideElement) {
    const copy = { ...el, id: newElementId(), y: clamp(el.y + 4, -20, 120) };
    setDeviceLayout((d) => ({ ...d, elements: [...d.elements, copy] }));
    setSelectedId(copy.id);
  }

  // ---- alto de cada elemento (para anclarlo abajo en la home) ----
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const height = canvas.getBoundingClientRect().height;
    if (!height) return;
    const measured: Record<string, number> = {};
    canvas.querySelectorAll<HTMLElement>("[data-element]").forEach((node) => {
      measured[node.dataset.element!] = (node.getBoundingClientRect().height / height) * 100;
    });
    const stale = current.elements.some(
      (el) => measured[el.id] !== undefined && Math.abs(el.h - measured[el.id]) > 0.1,
    );
    if (stale) {
      setLayout((l) => ({
        ...l,
        [device]: {
          ...l[device],
          elements: l[device].elements.map((el) =>
            measured[el.id] === undefined ? el : { ...el, h: Math.round(measured[el.id] * 100) / 100 },
          ),
        },
      }));
    }
  }, [current.elements, device]);

  // ---- arrastrar y agrandar ----
  function startDrag(e: React.PointerEvent, el: SlideElement, mode: Drag["mode"]) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(e.pointerId);
    const node = canvas.querySelector<HTMLElement>(`[data-element="${el.id}"]`);
    setSelectedId(el.id);
    remember();
    const rect = canvas.getBoundingClientRect();
    const box = node?.getBoundingClientRect();
    drag.current = {
      mode,
      id: el.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      el,
      rect,
      width: box?.width ?? 1,
      left: box ? ((box.left - rect.left) / rect.width) * 100 : el.x,
      right: box ? ((box.right - rect.left) / rect.width) * 100 : el.x,
      others: [...canvas.querySelectorAll<HTMLElement>("[data-element]")]
        .filter((n) => n.dataset.element !== el.id)
        .map((n) => {
          const b = n.getBoundingClientRect();
          const x = (v: number) => ((v - rect.left) / rect.width) * 100;
          const y = (v: number) => ((v - rect.top) / rect.height) * 100;
          return {
            left: x(b.left),
            center: x(b.left + b.width / 2),
            right: x(b.right),
            top: y(b.top),
            middle: y(b.top + b.height / 2),
            bottom: y(b.bottom),
          };
        }),
      moved: false,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 2) return;
    d.moved = true;

    if (d.mode === "size") {
      // La manija va del lado contrario al ancla: crece hacia donde se tira.
      const delta = d.el.align === "right" ? -dx : d.el.align === "center" ? dx * 2 : dx;
      const factor = Math.max(0.05, (d.width + delta) / d.width);
      const size = clamp(
        Math.round(d.el.size * factor * 1000) / 1000,
        ELEMENT_LIMITS.size.min,
        pxToSize(device, MAX_PX[device]),
      );
      // Con caja de ancho fijo, la caja crece con la letra (quedan los mismos renglones).
      const w =
        d.el.type === "texto" && d.el.w !== undefined
          ? clamp(
              Math.round(d.el.w * (size / d.el.size) * 1000) / 1000,
              ELEMENT_LIMITS.width.min,
              ELEMENT_LIMITS.width.max,
            )
          : undefined;
      patchElement(d.id, w !== undefined ? { size, w } : { size }, false);
      return;
    }

    if (d.mode === "left" || d.mode === "right") {
      // Se mueve un costado; el otro queda quieto y el texto se reacomoda en renglones.
      const shift = (dx / d.rect.width) * 100;
      const min = ELEMENT_LIMITS.width.min;
      const left = d.mode === "left" ? Math.min(d.left + shift, d.right - min) : d.left;
      const right = d.mode === "right" ? Math.max(d.right + shift, d.left + min) : d.right;
      const w = clamp(right - left, min, ELEMENT_LIMITS.width.max);
      const x = d.el.align === "left" ? left : d.el.align === "center" ? (left + right) / 2 : right;
      patchElement(d.id, { w: Math.round(w * 1000) / 1000, x: Math.round(x * 1000) / 1000 }, false);
      return;
    }

    let x = d.el.x + (dx / d.rect.width) * 100;
    let y = d.el.y + (dy / d.rect.height) * 100;
    // Guías como en Canva: el centro del elemento con el centro de la foto
    // (azul) y con el ecuador (amarilla); bordes y centros con los otros
    // elementos y con los márgenes de la tienda (rosa).
    const width = d.right - d.left;
    const offset = d.el.align === "left" ? 0 : d.el.align === "center" ? width / 2 : width;
    const left = x - offset;
    const margin = pxToX(device, MARGIN_PX[device]);
    const xTargets: Guide[] = [
      { pos: 50, kind: "centro" },
      { pos: margin, kind: "alinear" },
      { pos: 100 - margin, kind: "alinear" },
      ...d.others.flatMap((o) => [o.left, o.center, o.right].map((pos) => ({ pos, kind: "alinear" as const }))),
    ];
    const yTargets: Guide[] = [
      { pos: 50, kind: "ecuador" },
      ...d.others.flatMap((o) => [o.top, o.middle, o.bottom].map((pos) => ({ pos, kind: "alinear" as const }))),
    ];
    const snapX = snapTo([left, left + width / 2, left + width], xTargets);
    const snapY = snapTo([y, y + d.el.h / 2, y + d.el.h], yTargets);
    if (snapX) x += snapX.shift;
    if (snapY) y += snapY.shift;
    const v: Guide[] = snapX ? [snapX.guide] : [];
    const h: Guide[] = snapY ? [snapY.guide] : [];
    const { min, max } = ELEMENT_LIMITS.position;
    patchElement(
      d.id,
      { x: Math.round(clamp(x, min, max) * 1000) / 1000, y: Math.round(clamp(y, min, max) * 1000) / 1000 },
      false,
    );
    setGuides({ v, h });
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    drag.current = null;
    setGuides({ v: [], h: [] });
    // Un clic sin mover no deja un paso de "deshacer".
    if (!d.moved) setHistory((h) => h.slice(0, -1));
  }

  // ---- teclado: flechas (1 px, con Shift 10 px), borrar, deshacer, Escape ----
  function onCanvasKey(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
      return;
    }
    if (!selected) return;
    if (e.key === "Escape") {
      setSelectedId(null);
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      removeElement(selected.id);
      return;
    }
    const step = e.shiftKey ? 10 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    patchElement(selected.id, {
      x: pxToX(device, xToPx(device, selected.x) + move[0]),
      y: pxToY(device, yToPx(device, selected.y) + move[1]),
    });
  }

  // Ctrl+Z también fuera de la foto (salvo escribiendo en un campo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest("input, textarea, select");
      if (!typing && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && e.target !== canvasRef.current) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  // Mientras el editor está abierto, la página de atrás no se desplaza.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  function close() {
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Salir igual y perderlos?")) return;
    onClose();
  }

  async function save() {
    const badLink = (["desktop", "mobile"] as const).some((dv) =>
      layout[dv].elements.some((el) => el.type === "link" && !isSlideHref(el.href.trim())),
    );
    if (badLink) {
      setError("Un link tiene que llevar a una página de la tienda (que empiece con /) o a una dirección https://.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await updateHomeSlide(slide.id, { layout });
      setSaved(layout);
      onSaved(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  function copyFromOther() {
    const other: SlideDevice = device === "desktop" ? "mobile" : "desktop";
    const label = DEVICE_FRAME[other].label.toLowerCase();
    if (
      current.elements.length > 0 &&
      !window.confirm(
        `Esto reemplaza el diseño de ${frame.label.toLowerCase()} por una copia del de ${label}. ¿Seguir?`,
      )
    ) {
      return;
    }
    setDeviceLayout(() => copyDeviceLayout(layout[other], other, device));
    setSelectedId(null);
  }

  const sizeLabel = selected?.type === "logo" ? "Ancho" : "Tamaño de letra";
  const otherLabel = DEVICE_FRAME[device === "desktop" ? "mobile" : "desktop"].label;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Diseño de la foto ${index + 1}`}
      className="fixed inset-0 z-50 flex flex-col bg-admin-bg"
    >
      {/* Barra de arriba: dispositivo, deshacer y guardar. */}
      <header className="flex flex-wrap items-center gap-3 border-b border-admin-border bg-admin-surface px-4 py-3">
        <div className="mr-auto min-w-0">
          <p className={ADMIN_CAP}>Carrusel · Foto {String(index + 1).padStart(2, "0")}</p>
          <h2 className={ADMIN_SECTION_TITLE}>Diseño</h2>
        </div>
        <div className="grid grid-cols-2 gap-1.5" role="tablist" aria-label="Dispositivo">
          {(["desktop", "mobile"] as const).map((dv) => {
            const Icon = dv === "desktop" ? Monitor : Smartphone;
            return (
              <button
                key={dv}
                type="button"
                role="tab"
                aria-selected={device === dv}
                onClick={() => {
                  setDevice(dv);
                  setSelectedId(null);
                }}
                className={`${adminSegment(device === dv)} !h-10 px-3 text-sm`}
              >
                <Icon aria-hidden="true" className="size-4" />
                {DEVICE_FRAME[dv].label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-pressed={showGuides}
          onClick={() => setShowGuides((v) => !v)}
          className={`${adminSegment(showGuides)} !h-10 px-3 text-sm`}
          title="Mostrar el centro (azul) y el ecuador (amarilla)"
        >
          <Crosshair aria-hidden="true" className="size-4" />
          Guías
        </button>
        <button
          type="button"
          onClick={undo}
          disabled={history.length === 0}
          className={adminButton("secondary", "sm")}
          title="Deshacer (Ctrl+Z)"
        >
          <Undo2 aria-hidden="true" className="size-4" />
          Deshacer
        </button>
        <button type="button" onClick={close} className={adminButton("ghost", "sm")}>
          {dirty ? "Cancelar" : "Cerrar"}
        </button>
        <button type="button" onClick={save} disabled={saving || !dirty} className={adminButton("primary", "sm")}>
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </header>

      {error && (
        <div className="flex items-start justify-between gap-3 border-b border-admin-danger-border bg-admin-danger-bg px-4 py-2.5 text-sm font-medium text-admin-danger">
          {error}
          <button type="button" onClick={() => setError(null)} aria-label="Cerrar el aviso">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* La foto, del tamaño que entre, con la proporción de la pantalla de referencia. */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-auto p-4 lg:p-6">
          <div
            ref={canvasRef}
            tabIndex={0}
            aria-label={`Foto en ${frame.label.toLowerCase()}: arrastrá los elementos para ubicarlos`}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.backdrop) setSelectedId(null);
            }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onCanvasKey}
            className="relative shrink-0 touch-none select-none bg-admin-ink shadow-[0_0_0_1px_rgb(0_0_0/0.15)] outline-none focus-visible:ring-2 focus-visible:ring-admin-ink focus-visible:ring-offset-4"
            style={{
              aspectRatio: `${frame.width} / ${frame.height}`,
              width: `min(100%, calc((100dvh - 190px) * ${frame.width / frame.height}))`,
              containerType: "size",
            }}
          >
            <div data-backdrop="1" className="absolute inset-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- la foto tal cual, con su encuadre. */}
              <img
                src={photo}
                alt=""
                data-backdrop="1"
                draggable={false}
                className="absolute inset-0 size-full object-cover"
                style={{
                  objectPosition: `${current.focusX}% ${current.focusY}%`,
                  filter: `brightness(${brightnessOf(current)})`,
                }}
              />
              {SHADE_BACKGROUND[current.shade] && (
                <div
                  data-backdrop="1"
                  className="absolute inset-0"
                  style={{ backgroundImage: SHADE_BACKGROUND[current.shade] }}
                />
              )}
            </div>

            {/* Centro (azul) y ecuador (amarilla) fijos, si se pidieron. */}
            {showGuides && (
              <>
                <div
                  className="pointer-events-none absolute inset-y-0 left-1/2 z-10 border-l border-dashed opacity-70"
                  style={{ borderColor: GUIDE_COLOR.centro }}
                />
                <div
                  className="pointer-events-none absolute inset-x-0 top-1/2 z-10 border-t border-dashed opacity-70"
                  style={{ borderColor: GUIDE_COLOR.ecuador }}
                />
              </>
            )}
            {/* Guías al arrastrar: aparecen cuando el elemento se engancha. */}
            {guides.v.map((g) => (
              <div
                key={`v${g.pos}`}
                className="pointer-events-none absolute inset-y-0 z-10 w-[1.5px] -translate-x-1/2"
                style={{ left: `${g.pos}%`, background: GUIDE_COLOR[g.kind] }}
              />
            ))}
            {guides.h.map((g) => (
              <div
                key={`h${g.pos}`}
                className="pointer-events-none absolute inset-x-0 z-10 h-[1.5px] -translate-y-1/2"
                style={{ top: `${g.pos}%`, background: GUIDE_COLOR[g.kind] }}
              />
            ))}

            {current.elements.map((el) => {
              const isSelected = el.id === selectedId;
              const handleSide = el.align === "right" ? "-left-2" : "-right-2";
              return (
                <div
                  key={el.id}
                  data-element={el.id}
                  role="button"
                  aria-label={`${elementName(el).kind}: ${elementName(el).text}`}
                  aria-pressed={isSelected}
                  onPointerDown={(e) => startDrag(e, el, "move")}
                  className={`absolute w-max cursor-move outline-offset-4 ${
                    isSelected
                      ? "outline outline-2 outline-[#38bdf8]"
                      : "hover:outline hover:outline-1 hover:outline-dashed hover:outline-white/80"
                  }`}
                  style={elementPlacement(el, false)}
                >
                  <SlideElementView el={el} linkable={false} />
                  {isSelected && (
                    <span
                      aria-hidden="true"
                      title="Tamaño"
                      onPointerDown={(e) => startDrag(e, el, "size")}
                      className={`absolute -bottom-2 ${handleSide} size-4 cursor-nwse-resize rounded-[3px] border-2 border-white bg-[#38bdf8] shadow`}
                    />
                  )}
                  {/* Textos: los costados cambian el ancho de la caja (más o menos renglones). */}
                  {isSelected && el.type === "texto" && <WidthHandles onStart={(e, side) => startDrag(e, el, side)} />}
                </div>
              );
            })}
          </div>
          <p className={`${ADMIN_TEXT_MUTED} text-center`}>
            Arrastrá para mover (se engancha al centro, al ecuador y a los otros elementos) · el cuadradito celeste
            agranda o achica · en los textos, los costados cambian el ancho · flechas: 1 px (con Shift, 10 px) · Supr
            borra · Ctrl+Z deshace. Medidas sobre una pantalla de {frame.width} × {frame.height} px.
          </p>
        </div>

        {/* Panel de la derecha: agregar, capas, el elemento elegido y la foto. */}
        <aside className="flex max-h-[45dvh] flex-col gap-6 overflow-y-auto border-t border-admin-border bg-admin-surface p-4 lg:max-h-none lg:w-[380px] lg:border-l lg:border-t-0">
          <section className="flex flex-col gap-2.5">
            <h3 className={ADMIN_CAP}>Agregar en {frame.label.toLowerCase()}</h3>
            <div className="grid grid-cols-2 gap-2">
              {ADD_BUTTONS.map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => addElement(b.type, b.style)}
                  className={`${adminButton("secondary", "sm")} justify-start`}
                >
                  <b.icon aria-hidden="true" className="size-4" />
                  {b.label}
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2.5">
            <h3 className={ADMIN_CAP}>Elementos</h3>
            {current.elements.length === 0 ? (
              <p className={ADMIN_TEXT_MUTED}>La foto va sola. Agregá un título, el logo o un link.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {current.elements.map((el) => {
                  const name = elementName(el);
                  const isSelected = el.id === selectedId;
                  return (
                    <li key={el.id} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedId(isSelected ? null : el.id)}
                        aria-pressed={isSelected}
                        className={`flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center rounded-md border px-3 py-1.5 text-left transition-colors duration-200 ${
                          isSelected
                            ? "border-admin-ink bg-admin-ink text-white"
                            : "border-admin-border bg-admin-surface text-admin-text hover:bg-admin-bg"
                        }`}
                      >
                        <span
                          className={`text-[11px] font-bold uppercase tracking-[0.06em] ${isSelected ? "text-white/70" : "text-admin-muted"}`}
                        >
                          {name.kind}
                        </span>
                        <span className="w-full truncate text-sm">{name.text}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeElement(el.id)}
                        aria-label={`Quitar ${name.kind.toLowerCase()}`}
                        title="Quitar"
                        className={adminIconButton("danger")}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {selected && (
            <section className="flex flex-col gap-3 rounded-md border border-admin-border bg-admin-bg p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className={ADMIN_CAP}>{elementName(selected).kind}</h3>
                <button type="button" onClick={() => duplicateElement(selected)} className={adminButton("ghost", "sm")}>
                  <Copy aria-hidden="true" className="size-4" />
                  Duplicar
                </button>
              </div>

              {selected.type === "texto" && (
                <>
                  <div>
                    <label htmlFor={ids("text")} className={ADMIN_LABEL}>
                      Texto <span className="font-normal text-admin-muted">(Enter para otro renglón)</span>
                    </label>
                    <textarea
                      id={ids("text")}
                      rows={3}
                      maxLength={ELEMENT_LIMITS.text}
                      value={selected.text}
                      onChange={(e) => patchElement(selected.id, { text: e.target.value })}
                      className={ADMIN_TEXTAREA}
                    />
                  </div>
                  <Segmented
                    label="Estilo"
                    value={selected.style}
                    options={(["titulo", "etiqueta", "bajada"] as const).map((s) => ({
                      value: s,
                      label: STYLE_LABEL[s],
                    }))}
                    onChange={(style) => patchElement(selected.id, { style })}
                  />
                </>
              )}

              {selected.type === "link" && (
                <>
                  <div>
                    <label htmlFor={ids("link-text")} className={ADMIN_LABEL}>
                      Texto del link
                    </label>
                    <input
                      id={ids("link-text")}
                      maxLength={ELEMENT_LIMITS.short}
                      value={selected.text}
                      onChange={(e) => patchElement(selected.id, { text: e.target.value })}
                      placeholder="Ver más"
                      className={ADMIN_INPUT}
                    />
                  </div>
                  <div>
                    <label htmlFor={ids("link-href")} className={ADMIN_LABEL}>
                      Lleva a
                    </label>
                    <input
                      id={ids("link-href")}
                      maxLength={ELEMENT_LIMITS.href}
                      value={selected.href}
                      onChange={(e) => patchElement(selected.id, { href: e.target.value })}
                      placeholder="/categoria/todo"
                      className={adminInput({ mono: true, state: isSlideHref(selected.href.trim()) ? null : "error" })}
                    />
                    <p className={`mt-1 ${ADMIN_TEXT_MUTED}`}>
                      /categoria/todo = todos los productos · /categoria/fundas · o una dirección https://
                    </p>
                  </div>
                </>
              )}

              {selected.type === "rango" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={ids("from")} className={ADMIN_LABEL}>
                      Desde
                    </label>
                    <input
                      id={ids("from")}
                      maxLength={ELEMENT_LIMITS.short}
                      value={selected.from}
                      onChange={(e) => patchElement(selected.id, { from: e.target.value })}
                      className={ADMIN_INPUT}
                    />
                  </div>
                  <div>
                    <label htmlFor={ids("to")} className={ADMIN_LABEL}>
                      Hasta
                    </label>
                    <input
                      id={ids("to")}
                      maxLength={ELEMENT_LIMITS.short}
                      value={selected.to}
                      onChange={(e) => patchElement(selected.id, { to: e.target.value })}
                      className={ADMIN_INPUT}
                    />
                  </div>
                </div>
              )}

              <NumberField
                id={ids("size")}
                label={sizeLabel}
                unit="px"
                min={4}
                max={MAX_PX[device]}
                value={sizeToPx(device, selected.size)}
                onChange={(px) => patchElement(selected.id, { size: pxToSize(device, px) })}
              />
              {selected.type === "texto" && (
                <div className="flex flex-col gap-2">
                  {selected.w !== undefined ? (
                    <NumberField
                      id={ids("width")}
                      label="Ancho de la caja"
                      unit="px"
                      min={xToPx(device, ELEMENT_LIMITS.width.min)}
                      max={xToPx(device, ELEMENT_LIMITS.width.max)}
                      value={xToPx(device, selected.w)}
                      onChange={(px) => patchElement(selected.id, { w: pxToX(device, px) })}
                    />
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={ADMIN_TEXT_MUTED}>
                      {selected.w !== undefined
                        ? "El texto se acomoda en renglones dentro de la caja."
                        : "Cada renglón ocupa lo que mide. Tirá de los costados celestes para darle un ancho."}
                    </p>
                    {selected.w !== undefined && (
                      <button
                        type="button"
                        onClick={() => patchElement(selected.id, { w: undefined })}
                        className={adminButton("ghost", "sm")}
                      >
                        Ajustar al texto
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  id={ids("x")}
                  label="Desde la izquierda"
                  unit="px"
                  min={xToPx(device, ELEMENT_LIMITS.position.min)}
                  max={xToPx(device, ELEMENT_LIMITS.position.max)}
                  value={xToPx(device, selected.x)}
                  onChange={(px) => patchElement(selected.id, { x: pxToX(device, px) })}
                />
                <NumberField
                  id={ids("y")}
                  label="Desde arriba"
                  unit="px"
                  min={yToPx(device, ELEMENT_LIMITS.position.min)}
                  max={yToPx(device, ELEMENT_LIMITS.position.max)}
                  value={yToPx(device, selected.y)}
                  onChange={(px) => patchElement(selected.id, { y: pxToY(device, px) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // El centro del elemento en el centro de la foto (según su ancho en pantalla).
                    const node = canvasRef.current?.querySelector<HTMLElement>(`[data-element="${selected.id}"]`);
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (!node || !rect) return;
                    const width = (node.getBoundingClientRect().width / rect.width) * 100;
                    const offset = selected.align === "left" ? 0 : selected.align === "center" ? width / 2 : width;
                    patchElement(selected.id, { x: Math.round((50 - width / 2 + offset) * 1000) / 1000 });
                  }}
                  className={adminButton("secondary", "sm")}
                >
                  <span
                    aria-hidden="true"
                    className="h-4 w-0.5 rounded-full"
                    style={{ background: GUIDE_COLOR.centro }}
                  />
                  Centrar
                </button>
                <button
                  type="button"
                  onClick={() => patchElement(selected.id, { y: Math.round((50 - selected.h / 2) * 1000) / 1000 })}
                  className={adminButton("secondary", "sm")}
                >
                  <span
                    aria-hidden="true"
                    className="h-0.5 w-4 rounded-full"
                    style={{ background: GUIDE_COLOR.ecuador }}
                  />
                  Al ecuador
                </button>
              </div>
              <Segmented
                label="Se apoya en (crece hacia el otro lado)"
                value={selected.align}
                options={[
                  { value: "left", label: "Izquierda", icon: AlignLeft },
                  { value: "center", label: "Centro", icon: AlignCenter },
                  { value: "right", label: "Derecha", icon: AlignRight },
                ]}
                onChange={(align) => {
                  // Cambia el ancla sin mover el elemento en la foto.
                  const node = canvasRef.current?.querySelector<HTMLElement>(`[data-element="${selected.id}"]`);
                  const rect = canvasRef.current?.getBoundingClientRect();
                  if (!node || !rect) return patchElement(selected.id, { align });
                  const box = node.getBoundingClientRect();
                  const edge = align === "left" ? box.left : align === "center" ? box.left + box.width / 2 : box.right;
                  patchElement(selected.id, {
                    align,
                    x: Math.round(((edge - rect.left) / rect.width) * 100000) / 1000,
                  });
                }}
              />
              <Segmented
                label="Color"
                value={selected.color}
                options={[
                  { value: "claro", label: "Blanco" },
                  { value: "oscuro", label: "Negro" },
                ]}
                onChange={(color) => patchElement(selected.id, { color })}
              />
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h3 className={ADMIN_CAP}>Foto en {frame.label.toLowerCase()}</h3>
            <Slider
              id={ids("focus-x")}
              label="Encuadre horizontal"
              min={0}
              max={100}
              value={current.focusX}
              format={(v) => (v === 50 ? "centro" : v < 50 ? `← ${50 - v}` : `${v - 50} →`)}
              onChange={(focusX) => setDeviceLayout((d) => ({ ...d, focusX }))}
            />
            <Slider
              id={ids("focus-y")}
              label="Encuadre vertical"
              min={0}
              max={100}
              value={current.focusY}
              format={(v) => (v === 50 ? "centro" : v < 50 ? `↑ ${50 - v}` : `${v - 50} ↓`)}
              onChange={(focusY) => setDeviceLayout((d) => ({ ...d, focusY }))}
            />
            <Slider
              id={ids("dim")}
              label="Oscurecer"
              min={0}
              max={0.8}
              step={0.05}
              value={current.dim}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(dim) => setDeviceLayout((d) => ({ ...d, dim }))}
            />
            <fieldset>
              <legend className={ADMIN_LABEL}>Sombra para que se lea el texto</legend>
              <div className="grid grid-cols-3 gap-1.5">
                {SHADES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={current.shade === s.value}
                    onClick={() => setDeviceLayout((d) => ({ ...d, shade: s.value }))}
                    className={`${adminSegment(current.shade === s.value)} !h-10 text-sm`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </fieldset>
            {device === "mobile" && !slide.mobile_image_url && (
              <p className={ADMIN_TEXT_MUTED}>
                Sin foto propia de celular: se recorta la de computadora. Podés subir una vertical desde la tarjeta.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-2 border-t border-admin-border pt-4">
            <button type="button" onClick={copyFromOther} className={adminButton("secondary", "sm")}>
              <Copy aria-hidden="true" className="size-4" />
              Copiar el diseño de {otherLabel.toLowerCase()}
            </button>
            <p className={ADMIN_TEXT_MUTED}>
              Computadora y celular son independientes: lo que cambies acá no toca {otherLabel.toLowerCase()}.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
