/**
 * Logo de La Fundita que "respira" mientras algo carga. Usa la silueta del logo
 * (logo-mark.png, blanco sobre transparente) como máscara, así se pinta del
 * color del texto (`text-ink`, `text-admin-text`…). Aparece recién a los 300 ms:
 * si la carga es instantánea no titila nada. Con "reducir movimiento", queda
 * quieto con un parpadeo suave.
 */
export default function LoadingLogo({
  size = 64,
  label = "Cargando",
  className = "text-ink",
}: {
  /** Alto del logo, en px. */
  size?: number;
  /** Lo que se anuncia a los lectores de pantalla. */
  label?: string;
  className?: string;
}) {
  return (
    <span
      role="status"
      className={`inline-flex opacity-0 animate-[lf-fade-in_300ms_ease-out_300ms_forwards] ${className}`}
    >
      <span
        aria-hidden="true"
        className="block animate-[lf-breathe_1.6s_ease-in-out_infinite] bg-current motion-reduce:animate-[lf-blink_1.6s_ease-in-out_infinite]"
        style={{
          width: size * (418 / 475),
          height: size,
          maskImage: "url(/brand/logo-mark.png)",
          maskSize: "contain",
          maskRepeat: "no-repeat",
          maskPosition: "center",
        }}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
