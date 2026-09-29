/** Aviso vacío con borde discontinuo en regla y el radio del cuerpo de un iPhone. */
export default function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-container border border-dashed border-rule p-8 text-center text-graphite">
      {children}
    </p>
  );
}
