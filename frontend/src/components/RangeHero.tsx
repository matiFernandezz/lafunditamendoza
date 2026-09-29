/**
 * Hero tipográfico de la marca: "iPhone 11 →" / "17 Pro Max" en Space
 * Grotesk. El rango lo arma la home desde los modelos reales.
 * Los tamaños se pueden ajustar por slide (titleClassName / leadClassName).
 */
export default function RangeHero({
  from,
  to,
  lead,
  tone = "ink",
  titleClassName = "text-hero",
  leadClassName = "text-lead max-w-[34ch]",
}: {
  from: string;
  to: string;
  lead?: React.ReactNode;
  tone?: "ink" | "paper";
  titleClassName?: string;
  leadClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <h1
        aria-label={`${from} a ${to}`}
        className={`font-display font-semibold leading-hero tracking-hero ${titleClassName} ${
          tone === "paper" ? "text-paper" : "text-ink"
        }`}
      >
        <span className="flex items-center gap-[0.2em] whitespace-nowrap">
          {from}
          <svg
            viewBox="0 0 64 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="butt"
            strokeLinejoin="miter"
            aria-hidden="true"
            className="h-[0.56em] w-[0.9em]"
          >
            <path d="M4 20H58M42 4L58 20L42 36" />
          </svg>
        </span>
        <span className="block whitespace-nowrap">{to}</span>
      </h1>
      {lead && (
        <p
          className={`font-light leading-normal ${leadClassName} ${
            tone === "paper" ? "text-paper/85" : "text-graphite"
          }`}
        >
          {lead}
        </p>
      )}
    </div>
  );
}
