/**
 * Barra de avisos arriba de la portada: los textos se desplazan hacia la
 * izquierda sin parar. La pista va dos veces seguida y la animación la corre
 * media vuelta (-50%), así el corte no se nota. Con "reducir movimiento" queda quieta.
 */
export default function AnnouncementBar({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  // Cada mitad repite los avisos para cubrir pantallas anchas.
  const half = [...items, ...items];

  return (
    <div className="group overflow-hidden border-t border-paper/10 bg-ink text-paper" aria-label="Avisos">
      <ul className="sr-only">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div
        aria-hidden="true"
        className="flex w-max animate-[lf-marquee_40s_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:animate-none"
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0">
            {half.map((item, index) => (
              <span
                key={index}
                className="flex items-center h-7 gap-10 pr-10 text-[0.6875rem] font-semibold uppercase tracking-label whitespace-nowrap md:text-xs"
              >
                {item}
                <span className="size-1 rounded-full bg-paper/50" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
