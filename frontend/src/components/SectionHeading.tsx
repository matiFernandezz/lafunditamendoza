/** Título de sección editorial: etiqueta opcional en mayúsculas + h2 en Space Grotesk. */
export default function SectionHeading({
  label,
  title,
  size = "section",
}: {
  label?: string;
  title: string;
  size?: "section" | "headline";
}) {
  return (
    <div>
      {label && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-label text-graphite">{label}</p>
      )}
      <h2
        className={`font-display font-semibold leading-heading tracking-tight text-ink ${
          size === "headline" ? "text-headline" : "text-section"
        }`}
      >
        {title}
      </h2>
    </div>
  );
}
