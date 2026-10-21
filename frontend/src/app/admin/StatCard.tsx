/** Tarjeta de un número del panel: etiqueta, monto grande y una o dos líneas de detalle. */
export default function StatCard({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-admin-border bg-admin-surface px-5 py-4">
      <p className="text-sm text-admin-muted">{label}</p>
      <p className="mt-1 break-words font-mono text-[26px] font-bold leading-tight tabular-nums text-admin-text">
        {value}
      </p>
      {children && <div className="mt-1.5 flex flex-col gap-0.5 text-[13px] leading-snug text-admin-muted">{children}</div>}
    </div>
  );
}

/** Contenedor de una sección del Inicio: título, acción a la derecha y contenido. */
export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-lg border border-admin-border bg-admin-surface p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-[-0.01em] text-admin-text">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
