import Link from "next/link";
import ArrowMark from "./ArrowMark";

/** Link de vuelta con la flecha de marca girada; grafito → tinta en hover. */
export default function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-my-1 inline-flex min-h-11 items-center gap-2 text-sm text-graphite transition-colors duration-200 hover:text-ink"
    >
      <ArrowMark className="h-2.5 w-4 rotate-180" strokeWidth={5} />
      {children}
    </Link>
  );
}
