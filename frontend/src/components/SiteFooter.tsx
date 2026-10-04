import Link from "next/link";
import { RESERVATION_HOURS, STORE_WHATSAPP } from "@/lib/storeConfig";
import Logo from "./Logo";

// Pie de la tienda: mismo negro y mismo padding lateral que el header, para
// que la página abra y cierre igual. Tres columnas en desktop (marca, tienda,
// contacto) y una debajo de la otra en mobile.

type FooterLink = { key: string; label: string; href: string };

const INSTAGRAM = { url: "https://www.instagram.com/lafunditamza/", handle: "@lafunditamza" };
const TIKTOK = { url: "https://www.tiktok.com/@lafunditamza", handle: "@lafunditamza" };
const WHATSAPP = { url: `https://wa.me/${STORE_WHATSAPP}`, handle: "261 673 2438" };

// lucide ya no trae logos de marcas: van como SVG propios, del mismo trazo fino.
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
      <path d="M14 3v11.5a4 4 0 1 1-4-4" />
      <path d="M14 3c.4 2.6 2.2 4.6 5 5" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
      <path d="M3.5 20.5l1.3-4.6A8.5 8.5 0 1 1 8.2 19.3z" />
      <path d="M9 8.8c0 3 2.4 5.6 5.4 6.1l1.3-1.5-1.9-1-0.9 0.8c-1-.4-1.8-1.2-2.2-2.2l0.8-0.9-1-1.9z" />
    </svg>
  );
}

const HEADING = "text-[13px] font-medium uppercase tracking-[0.08em] text-paper/55";
const LINK = "transition-colors duration-200 hover:text-paper";

function SocialLink({
  href,
  network,
  handle,
  children,
}: {
  href: string;
  network: string;
  handle: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${network}: ${handle}`}
        className={`group -my-1 inline-flex min-h-11 items-center gap-3 text-paper/85 ${LINK}`}
      >
        <span className="flex size-9 items-center justify-center rounded-full border border-paper/25 transition-colors duration-200 group-hover:border-paper">
          {children}
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[13px] text-paper/55">{network}</span>
          <span className="font-mono text-[15px]">{handle}</span>
        </span>
      </a>
    </li>
  );
}

export default function SiteFooter({ links }: { links: FooterLink[] }) {
  return (
    <footer className="bg-black text-paper">
      <div className="grid gap-10 px-8 pb-10 pt-12 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-12 md:px-[clamp(48px,9vw,180px)] md:pb-12 md:pt-16">
        <div className="flex flex-col items-start gap-4">
          <Link href="/" aria-label="La Fundita — inicio" className="focus-visible:outline-paper">
            <Logo size={72} />
          </Link>
          <p className="max-w-[30ch] font-light text-paper/75">
            Fundas y accesorios para tu iPhone, desde Mendoza.
          </p>
        </div>

        <nav aria-label="Tienda" className="flex flex-col gap-4">
          <h2 className={HEADING}>Tienda</h2>
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.key}>
                <Link
                  href={link.href}
                  className={`inline-flex min-h-9 items-center font-display text-lg font-semibold tracking-tight text-paper/85 ${LINK}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-4">
          <h2 className={HEADING}>Hablemos</h2>
          <ul className="flex flex-col gap-3">
            <SocialLink href={WHATSAPP.url} network="WhatsApp" handle={WHATSAPP.handle}>
              <WhatsAppIcon />
            </SocialLink>
            <SocialLink href={INSTAGRAM.url} network="Instagram" handle={INSTAGRAM.handle}>
              <InstagramIcon />
            </SocialLink>
            <SocialLink href={TIKTOK.url} network="TikTok" handle={TIKTOK.handle}>
              <TikTokIcon />
            </SocialLink>
          </ul>
        </div>
      </div>

      {/* pb extra en mobile: la barra "Ver carrito" flota sobre el borde de abajo. */}
      <div className="flex flex-col gap-1 border-t border-paper/15 px-8 pb-24 pt-5 text-[13px] text-paper/55 md:flex-row md:items-center md:gap-3 md:px-[clamp(48px,9vw,180px)] md:pb-6">
        <span>© {new Date().getFullYear()} La Fundita · Mendoza, Argentina</span>
        <span aria-hidden="true" className="hidden md:inline">
          ·
        </span>
        <span>Pagás por transferencia y te reservamos tu funda {RESERVATION_HOURS} horas.</span>
      </div>
    </footer>
  );
}
