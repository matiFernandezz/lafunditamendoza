"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";

type Suggestion = {
  id: string;
  name: string;
  category: string | null;
  image: string | null;
  min_price: number;
  same_price: boolean;
};

// Espera entre teclas antes de buscar: no se pide nada por cada letra.
const DEBOUNCE_MS = 180;

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

/**
 * Buscador del header. Mientras se escribe, abajo aparece una lista con las
 * primeras coincidencias (foto, nombre, tipo y precio); se elige con el mouse
 * o con las flechas y Enter. Enter sin elegir lleva a /buscar?q=… con todos
 * los resultados. En la compu va dentro de la barra; en el celular, en una
 * fila propia que abre la lupa.
 */
export default function HeaderSearch({
  variant,
  autoFocus = false,
  onSearched,
}: {
  variant: "bar" | "row";
  autoFocus?: boolean;
  onSearched?: () => void;
}) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [state, setState] = useState<{ query: string; total: number; results: Suggestion[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const id = variant === "bar" ? "buscar-header" : "buscar-header-movil";
  const q = query.trim();

  // Busca con una pausa entre teclas; una respuesta vieja no pisa a una nueva.
  useEffect(() => {
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/tienda/buscar?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((json) => {
          setState({ query: q, total: json.data?.total ?? 0, results: json.data?.results ?? [] });
          setActive(-1);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  // Se cierra al tocar afuera.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const results = q.length >= 2 && state ? state.results : [];
  const showList = open && q.length >= 2 && (state !== null || loading);

  function done() {
    setOpen(false);
    setQuery("");
    setState(null);
    onSearched?.();
  }

  function goToAll() {
    if (!q) return;
    router.push(`/buscar?q=${encodeURIComponent(q)}`);
    done();
  }

  return (
    <form
      ref={rootRef}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (active >= 0 && results[active]) {
          router.push(`/producto/${results[active].id}`);
          done();
        } else {
          goToAll();
        }
      }}
      className={variant === "bar" ? "relative w-[clamp(180px,18vw,280px)]" : "relative w-full"}
    >
      <label htmlFor={id} className="sr-only">
        Buscar productos
      </label>
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-paper/60" />
      <input
        id={id}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        enterKeyHint="search"
        autoComplete="off"
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            return;
          }
          if (!showList || results.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % results.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
          }
        }}
        placeholder="Buscar fundas, modelos…"
        className="h-11 w-full rounded-full border border-paper/20 bg-paper/10 pl-10 pr-4 text-base text-paper outline-none transition-colors duration-200 placeholder:text-paper/50 focus:border-paper/60 focus:bg-paper/15 focus-visible:outline-none md:text-sm [&::-webkit-search-cancel-button]:hidden"
      />

      {showList && (
        <div
          className={`absolute top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-rule bg-paper text-ink ${
            variant === "bar" ? "right-0 w-[min(400px,calc(100vw-2rem))]" : "left-0 right-0"
          }`}
        >
          {results.length === 0 ? (
            <p className="px-4 py-3.5 text-sm text-graphite">
              {loading && !state ? "Buscando…" : `No encontramos nada con “${q}”.`}
            </p>
          ) : (
            <>
              <ul id={listId} role="listbox" aria-label="Productos encontrados" className="max-h-[min(60svh,420px)] overflow-y-auto py-1.5">
                {results.map((item, index) => (
                  <li key={item.id} id={`${listId}-${index}`} role="option" aria-selected={index === active}>
                    <Link
                      href={`/producto/${item.id}`}
                      onClick={done}
                      onMouseEnter={() => setActive(index)}
                      className={`flex items-center gap-3 px-3 py-2 transition-colors duration-150 ${
                        index === active ? "bg-rule/60" : ""
                      }`}
                    >
                      <span className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md bg-rule/50">
                        {item.image && <Image src={item.image} alt="" fill sizes="44px" className="object-cover" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-[15px] font-semibold tracking-tight">{item.name}</span>
                        {item.category && <span className="block truncate text-xs text-graphite">{item.category}</span>}
                      </span>
                      <span className="shrink-0 font-mono text-sm tabular-nums">
                        {item.same_price ? "" : "desde "}
                        {formatPrice(item.min_price)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={goToAll}
                className="flex w-full items-center justify-between border-t border-rule px-4 py-3 text-sm font-medium transition-colors duration-150 hover:bg-rule/40"
              >
                {state && state.total > results.length ? `Ver los ${state.total} resultados` : "Ver resultados"}
                <span aria-hidden="true">→</span>
              </button>
            </>
          )}
        </div>
      )}
    </form>
  );
}

export { SearchIcon };
