import type { Metadata } from "next";
import Link from "next/link";
import ArrowMark from "@/components/ArrowMark";
import SectionHeading from "@/components/SectionHeading";
import { InstagramIcon, TikTokIcon, WhatsAppIcon } from "@/components/SocialIcons";
import { INSTAGRAM, RESERVATION_HOURS, TIKTOK, WHATSAPP } from "@/lib/storeConfig";

export const metadata: Metadata = {
  title: "Nosotros | La Fundita",
  description: "Quiénes somos, cómo comprar y dónde encontrarnos: WhatsApp, Instagram y TikTok.",
};

const STEPS = [
  {
    title: "Elegí tu funda",
    text: "Buscá por modelo de iPhone, elegí el color y sumala al carrito.",
  },
  {
    title: "Reservá y transferí",
    text: `Al comprar te la guardamos ${RESERVATION_HOURS} horas. En ese momento te mostramos el alias para transferir.`,
  },
  {
    title: "Mandanos el comprobante",
    text: "Nos lo enviás por WhatsApp, confirmamos el pago y coordinamos la entrega.",
  },
];

const CONTACTS = [
  { network: "WhatsApp", note: "Consultas y comprobantes", icon: WhatsAppIcon, ...WHATSAPP },
  { network: "Instagram", note: "Novedades y modelos nuevos", icon: InstagramIcon, ...INSTAGRAM },
  { network: "TikTok", note: "Las fundas en video", icon: TikTokIcon, ...TIKTOK },
];

export default function NosotrosPage() {
  return (
    <div className="space-y-14 md:space-y-20">
      <div className="space-y-8 md:space-y-10">
        <h1 className="font-display text-[clamp(2.5rem,10vw,4.5rem)] font-black leading-[0.98] tracking-[-0.03em]">
          Nosotros
        </h1>

        <div className="max-w-[52ch] space-y-5 text-lg leading-relaxed text-graphite">
          <p>
            La Fundita nace de las ganas de vestir tu iPhone con algo que realmente se sienta tuyo:
            fundas y accesorios elegidos y armados a mano, uno por uno.
          </p>
          <p>
            Somos de Mendoza. Nos encontrás en ferias y acá en la web, donde ves lo que hay en stock
            para tu modelo y lo reservás en el momento.
          </p>
        </div>
      </div>

      <section aria-labelledby="como-comprar" className="space-y-8 border-t border-rule pt-10 md:pt-14">
        <div id="como-comprar">
          <SectionHeading label="Paso a paso" title="Cómo comprar" />
        </div>
        <ol className="grid gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-2">
              <span className="font-mono text-sm tabular-nums text-graphite">0{index + 1}</span>
              <h3 className="font-display text-title font-semibold tracking-tight text-ink">{step.title}</h3>
              <p className="max-w-[36ch] text-graphite">{step.text}</p>
            </li>
          ))}
        </ol>
        <Link
          href="/"
          className="group inline-flex min-h-11 items-center gap-2 text-xs font-semibold uppercase tracking-label text-ink"
        >
          Ver fundas
          <ArrowMark className="h-2.5 w-4 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={5} />
        </Link>
      </section>

      <section aria-labelledby="hablemos" className="space-y-6 border-t border-rule pt-10 md:pt-14">
        <div id="hablemos">
          <SectionHeading label="Contacto" title="Hablemos" />
        </div>
        <p className="max-w-[52ch] text-graphite">
          ¿Dudas de stock, de colores o querés algo puntual? Escribinos: respondemos nosotros.
        </p>
        <ul className="max-w-[640px] border-b border-rule">
          {CONTACTS.map((c) => (
            <li key={c.network} className="border-t border-rule">
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-[72px] items-center gap-4 py-3"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-rule text-ink transition-colors duration-200 group-hover:border-ink group-hover:bg-ink group-hover:text-paper">
                  <c.icon />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-display text-title font-semibold tracking-tight text-ink">{c.network}</span>
                  <span className="text-sm text-graphite">{c.note}</span>
                </span>
                <span className="shrink-0 font-mono text-[15px] text-ink">{c.handle}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
