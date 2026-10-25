"use client";

import { ExternalLink } from "lucide-react";
import SubnavSidebar from "../SubnavSidebar";
import { TIENDA_SECTIONS } from "./sections";

/** Segundo sidebar de Tienda: las partes de la home (y Nosotros) que se editan, y un link para verla. */
export default function TiendaSidebar() {
  return (
    <SubnavSidebar
      title="Tienda"
      subtitle="Lo que se ve en la tienda"
      sections={TIENDA_SECTIONS}
      footer={
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-lg bg-admin-ink p-3.5 text-sm font-semibold text-admin-on-ink hover:opacity-90"
        >
          Ver la tienda
          <ExternalLink aria-hidden="true" className="size-4" />
        </a>
      }
    />
  );
}
