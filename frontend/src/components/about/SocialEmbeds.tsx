"use client";

import { useEffect } from "react";
import { parseSocialPost } from "@/lib/socialPosts";
import ScrollRow from "./ScrollRow";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

const SCRIPTS = {
  instagram: "https://www.instagram.com/embed.js",
  tiktok: "https://www.tiktok.com/embed.js",
};

/**
 * Carga el script oficial de la red, que convierte los <blockquote> en el post
 * embebido. Instagram se puede volver a procesar; el de TikTok solo procesa al
 * cargar, así que se vuelve a poner cada vez que se entra a la página.
 */
function useEmbedScript(network: "instagram" | "tiktok") {
  useEffect(() => {
    if (network === "instagram" && window.instgrm) {
      window.instgrm.Embeds.process();
      return;
    }
    const id = `embed-${network}`;
    document.getElementById(id)?.remove();
    const script = document.createElement("script");
    script.id = id;
    script.src = SCRIPTS[network];
    script.async = true;
    document.body.appendChild(script);
  }, [network]);
}

/** Publicaciones elegidas a mano (links del panel), embebidas con el widget oficial, en carrusel. */
export default function SocialEmbeds({ network, urls }: { network: "instagram" | "tiktok"; urls: string[] }) {
  useEmbedScript(network);
  const posts = urls.map(parseSocialPost).filter((post) => post !== null);

  return (
    <ScrollRow>
      {posts.map((post) => (
        <div key={post.url} className="overflow-hidden rounded-2xl">
          {network === "instagram" ? (
            <blockquote
              className="instagram-media"
              data-instgrm-permalink={post.url}
              data-instgrm-version="14"
              style={{ background: "#fff", border: 0, margin: 0, maxWidth: 540, minWidth: 0, width: "100%" }}
            >
              <a href={post.url} target="_blank" rel="noopener noreferrer">
                Ver en Instagram
              </a>
            </blockquote>
          ) : (
            <blockquote
              className="tiktok-embed"
              cite={post.url}
              data-video-id={post.id}
              style={{ margin: 0, maxWidth: 605, minWidth: 0, width: "100%" }}
            >
              <section>
                <a href={post.url} target="_blank" rel="noopener noreferrer">
                  Ver en TikTok
                </a>
              </section>
            </blockquote>
          )}
        </div>
      ))}
    </ScrollRow>
  );
}

/**
 * Perfil de TikTok con sus últimos videos (widget oficial de creador): se
 * actualiza solo, sin clave. Se usa cuando no hay videos elegidos a mano.
 */
export function TikTokProfile({ username }: { username: string }) {
  useEmbedScript("tiktok");
  return (
    // El widget no pasa de 780px: más ancho, TikTok deja la tarjeta en el medio de
    // un iframe con fondo blanco. Así que va a su ancho, centrado y sin fondo.
    <div className="flex justify-center">
      <blockquote
        className="tiktok-embed overflow-hidden rounded-2xl"
        cite={`https://www.tiktok.com/@${username}`}
        data-unique-id={username}
        data-embed-type="creator"
        style={{ margin: 0, maxWidth: 780, minWidth: 288, width: "100%" }}
      >
        <section>
          <a href={`https://www.tiktok.com/@${username}`} target="_blank" rel="noopener noreferrer">
            @{username} en TikTok
          </a>
        </section>
      </blockquote>
    </div>
  );
}
