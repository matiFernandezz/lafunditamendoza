import Link from "next/link";

/**
 * Píldora del diseño. "sm": sub-modelo de iPhone (link, invierte a tinta en
 * hover). "md": opción seleccionable de 44px (p. ej. color de una variante).
 */
export default function Chip({
  children,
  href,
  selected = false,
  size = "md",
  onClick,
}: {
  children: React.ReactNode;
  href?: string;
  selected?: boolean;
  size?: "sm" | "md";
  onClick?: () => void;
}) {
  const className = `inline-flex items-center justify-center whitespace-nowrap rounded-full border font-sans text-sm font-medium transition-colors duration-200 ${
    size === "md" ? "h-11 px-4 capitalize" : "px-4 py-2"
  } ${
    selected
      ? "border-ink bg-ink text-paper"
      : size === "sm"
        ? "border-graphite text-ink hover:border-ink hover:bg-ink hover:text-paper"
        : "border-graphite text-ink hover:border-ink"
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={className}>
      {children}
    </button>
  );
}
