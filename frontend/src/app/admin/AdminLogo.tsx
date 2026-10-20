/**
 * Logo del panel en crema sobre el negro del sidebar y del login. Usa la
 * silueta recortada (logo-mark.png, blanco sobre transparente) como máscara:
 * el JPG de marca trae su fondo negro puro y se notaría como un recuadro
 * sobre el negro cálido del panel.
 */
export default function AdminLogo({ size }: { size: number }) {
  return (
    <span
      role="img"
      aria-label="La Fundita"
      className="block shrink-0 bg-admin-on-ink"
      style={{
        width: size * (836 / 949),
        height: size,
        maskImage: "url(/brand/logo-mark.png)",
        maskSize: "contain",
        maskRepeat: "no-repeat",
      }}
    />
  );
}
