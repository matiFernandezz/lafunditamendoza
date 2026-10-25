import type { Metadata } from "next";
import Link from "next/link";
import AboutCarousel from "@/components/about/AboutCarousel";
import InstagramFeed from "@/components/about/InstagramFeed";
import SocialEmbeds, { TikTokProfile } from "@/components/about/SocialEmbeds";
import SocialHeader from "@/components/about/SocialHeader";
import ArrowMark from "@/components/ArrowMark";
import SectionHeading from "@/components/SectionHeading";
import { InstagramIcon, TikTokIcon, WhatsAppIcon } from "@/components/SocialIcons";
import { getAboutContent, getCategoryGroups } from "@/lib/catalog";
import { FULL_BLEED, PAGE_PADDING } from "@/lib/layout";
import { getInstagramPosts } from "@/lib/server/instagram";
import { INSTAGRAM, RESERVATION_HOURS, TIKTOK, WHATSAPP } from "@/lib/storeConfig";

export const metadata: Metadata = {
  title: "Nosotros | La Fundita",
  description: "Quiénes somos, cómo comprar y dónde encontrarnos: WhatsApp, Instagram y TikTok.",
};

// El texto, las fotos y las publicaciones se editan en el panel › Tienda › Nosotros.
export const dynamic = "force-dynamic";

const STEPS = [
  {
    title: "Elegí tu funda",
    text: "Buscá por modelo de iPhone, elegí el color y sumala al carrito.",
  },
  {
    title: "Reservá y transferí",
    text: `Al comprar te la guardamos ${RESERVATION_HOURS} horas y te mostramos el alias para transferir.`,
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

const SOCIAL = [
  { network: "instagram", name: "Instagram", icon: InstagramIcon, ...INSTAGRAM },
  { network: "tiktok", name: "TikTok", icon: TikTokIcon, ...TIKTOK },
] as const;

const PILL =
  "group inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold transition-colors duration-200";

export default async function NosotrosPage() {
  const [about, groups, instagramPosts] = await Promise.all([
    getAboutContent(),
    getCategoryGroups(),
    getInstagramPosts(),
  ]);
  const fundas = groups.find((g) => g.children.length > 0);
  const fundasHref = fundas ? `/categoria/${fundas.slug}` : "/";
  const networks = SOCIAL.map((s) => ({
    ...s,
    urls: about.posts.filter((p) => p.network === s.network).map((p) => p.url),
  }));

  return (
    <div className="space-y-20 md:space-y-28">
      {/* Quiénes somos: el texto a la izquierda y las fotos a la derecha (en mobile, debajo). */}
      <section
        aria-labelledby="nosotros"
        className={`grid items-center gap-10 ${about.photos.length > 0 ? "md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-14 lg:gap-20" : ""}`}
      >
        <div className="flex flex-col gap-6 md:gap-8">
          <p className="text-xs font-semibold uppercase tracking-label text-graphite">La Fundita · Mendoza</p>
          <h1
            id="nosotros"
            className="font-display text-[clamp(2.75rem,9vw,5.5rem)] font-semibold leading-[0.95] tracking-page text-ink"
          >
            {about.title}
          </h1>
          <span aria-hidden="true" className="block h-[3px] w-16 bg-ink" />
          <div className="max-w-[48ch] space-y-5 text-lg leading-relaxed text-graphite">
            {about.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={fundasHref} className={`${PILL} bg-ink text-paper hover:bg-ink/85`}>
              Ver fundas
              <ArrowMark
                className="h-2.5 w-4 transition-transform duration-200 group-hover:translate-x-1"
                strokeWidth={5}
              />
            </Link>
            <a
              href={WHATSAPP.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${PILL} border border-ink text-ink hover:bg-ink hover:text-paper`}
            >
              Escribinos
            </a>
          </div>
        </div>
        {about.photos.length > 0 && <AboutCarousel photos={about.photos} alt="Fundas de La Fundita" />}
      </section>

      {/* Cómo comprar: franja de tinta a sangre con los tres pasos en tarjetas. */}
      <section
        aria-labelledby="como-comprar"
        className={`bg-ink py-16 text-paper md:py-24 ${FULL_BLEED} ${PAGE_PADDING}`}
      >
        <div className="mx-auto flex max-w-[1160px] flex-col gap-10 md:gap-14">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-label text-paper/60">Paso a paso</p>
              <h2 id="como-comprar" className="font-display text-section font-semibold leading-heading tracking-tight">
                Cómo comprar
              </h2>
            </div>
            <Link
              href={fundasHref}
              className="group inline-flex min-h-11 items-center gap-2 self-start text-xs font-semibold uppercase tracking-label text-paper md:self-auto"
            >
              Empezá por tu funda
              <ArrowMark
                className="h-2.5 w-4 transition-transform duration-200 group-hover:translate-x-1"
                strokeWidth={5}
              />
            </Link>
          </div>
          <ol className="grid gap-4 md:grid-cols-3 md:gap-5">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex min-h-[220px] flex-col justify-between gap-10 rounded-3xl border border-paper/15 p-6 md:min-h-[280px] md:p-8"
              >
                <span className="font-display text-[clamp(3.5rem,6vw,5rem)] font-semibold leading-none tracking-page text-paper/90">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-col gap-2">
                  <h3 className="font-display text-title font-semibold tracking-tight">{step.title}</h3>
                  <p className="max-w-[34ch] text-paper/70">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Lo último en las redes, entre los pasos y Hablemos: un carrusel por red con los
          posts que se eligen en el panel. Sin ninguno, la red muestra un link a su perfil. */}
      <section aria-labelledby="redes" className="mx-auto max-w-[1160px] space-y-12 md:space-y-16">
        <div id="redes">
          <SectionHeading label="En las redes" title="Seguinos" />
        </div>
        {networks.map((n) => (
          <div key={n.network} className="space-y-6">
            <SocialHeader icon={n.icon} name={n.name} handle={n.handle} url={n.url} />
            {/* Instagram: los últimos posts solos (cuenta conectada) o, si no, los links del panel.
                TikTok: los videos elegidos o, sin ninguno, el perfil con los últimos (automático). */}
            {n.network === "instagram" && instagramPosts && instagramPosts.length > 0 ? (
              <InstagramFeed posts={instagramPosts} />
            ) : n.urls.length > 0 ? (
              <SocialEmbeds network={n.network} urls={n.urls} />
            ) : n.network === "tiktok" ? (
              <TikTokProfile username={TIKTOK.handle.replace(/^@/, "")} />
            ) : (
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-40 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-rule text-center transition-colors duration-200 hover:border-ink"
              >
                <span className="font-display text-title font-semibold tracking-tight text-ink">
                  Mirá lo último en {n.name}
                </span>
                <span className="font-mono text-sm text-graphite">{n.handle}</span>
              </a>
            )}
          </div>
        ))}
      </section>

      {/* Hablemos: al final. El título y la pregunta a la izquierda; las redes, centradas. */}
      <section aria-labelledby="hablemos" className="mx-auto max-w-[1160px] space-y-8 md:space-y-10">
        <div className="space-y-3">
          <div id="hablemos">
            <SectionHeading title="Hablemos" />
          </div>
          <p className="max-w-[52ch] text-graphite">
            ¿Dudas de stock, de colores o querés algo puntual? Escribinos: respondemos nosotros.
          </p>
        </div>
        <ul className="mx-auto w-full max-w-[640px] border-b border-rule">
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
