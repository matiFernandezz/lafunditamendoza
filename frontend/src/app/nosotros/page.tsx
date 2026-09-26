import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nosotros | La Fundita",
};

export default function NosotrosPage() {
  return (
    <div className="space-y-10 md:space-y-14">
      <h1 className="font-display text-[clamp(2.5rem,10vw,4.5rem)] font-black leading-[0.98] tracking-[-0.03em]">
        Nosotros
      </h1>

      <div className="max-w-[52ch] space-y-5 text-lg leading-relaxed text-graphite">
        <p>
          La Fundita nace de las ganas de vestir tu iPhone con algo que
          realmente se sienta tuyo: fundas y accesorios elegidos y armados a
          mano, uno por uno.
        </p>
        <p>
          Vendemos en ferias y por WhatsApp, así que si tenés dudas de stock,
          combinaciones de color o querés encargar algo puntual, el mejor
          camino es escribirnos directo.
        </p>
      </div>

      <div className="rounded-[28px] border border-dashed border-rule p-6 text-graphite">
        Acá van los datos de contacto reales (WhatsApp / Instagram) — decímelos
        y los dejo cargados.
      </div>
    </div>
  );
}
